import { Ratelimit } from "@upstash/ratelimit";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { RATE_LIMITS } from "@/lib/constants";

type LimitName = keyof typeof RATE_LIMITS;

interface LimitResult {
  success: boolean;
  remaining: number;
  resetMs: number;
}

/** Sliding-window in-memory limiter for when Upstash isn't configured */
class MemoryLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    private requests: number,
    private windowMs: number,
  ) {}

  limit(key: string): LimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter(
      (t) => t > windowStart,
    );
    if (timestamps.length >= this.requests) {
      this.hits.set(key, timestamps);
      return {
        success: false,
        remaining: 0,
        resetMs: timestamps[0] + this.windowMs - now,
      };
    }
    timestamps.push(now);
    this.hits.set(key, timestamps);
    return {
      success: true,
      remaining: this.requests - timestamps.length,
      resetMs: this.windowMs,
    };
  }
}

function parseWindow(window: string): number {
  const [amount, unit] = window.split(" ");
  const n = Number(amount);
  if (unit.startsWith("s")) return n * 1000;
  if (unit.startsWith("m")) return n * 60_000;
  if (unit.startsWith("h")) return n * 3_600_000;
  return n;
}

const upstashLimiters = new Map<LimitName, Ratelimit>();
const memoryLimiters = new Map<LimitName, MemoryLimiter>();

function getUpstashLimiter(name: LimitName): Ratelimit | null {
  if (!redis) return null;
  let limiter = upstashLimiters.get(name);
  if (!limiter) {
    const config = RATE_LIMITS[name];
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        config.requests,
        config.window as `${number} s`,
      ),
      prefix: `setups-works:rl:${name}`,
    });
    upstashLimiters.set(name, limiter);
  }
  return limiter;
}

function getMemoryLimiter(name: LimitName): MemoryLimiter {
  let limiter = memoryLimiters.get(name);
  if (!limiter) {
    const config = RATE_LIMITS[name];
    limiter = new MemoryLimiter(config.requests, parseWindow(config.window));
    memoryLimiters.set(name, limiter);
  }
  return limiter;
}

export async function rateLimit(
  name: LimitName,
  identifier: string,
): Promise<LimitResult> {
  const upstash = getUpstashLimiter(name);
  if (upstash) {
    try {
      const result = await upstash.limit(identifier);
      return {
        success: result.success,
        remaining: result.remaining,
        resetMs: result.reset - Date.now(),
      };
    } catch {
      // fall through to memory limiter on Upstash outage
    }
  }
  return getMemoryLimiter(name).limit(identifier);
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous"
  );
}

/**
 * Guard an API route. Returns a 429 response when limited, null otherwise.
 */
export async function enforceRateLimit(
  name: LimitName,
  req: NextRequest,
  userId?: string,
): Promise<NextResponse | null> {
  const identifier = userId ?? getClientIp(req);
  const result = await rateLimit(name, identifier);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Too many requests. Please slow down and try again shortly.",
        retryAfterMs: result.resetMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(result.resetMs / 1000)),
        },
      },
    );
  }
  return null;
}
