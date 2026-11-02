import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { resourceFromAttributes } from "@opentelemetry/resources";

/**
 * Server-side OpenTelemetry log pipeline that ships logs to PostHog.
 *
 * This module must only be imported in the Node.js runtime (the OTLP HTTP
 * exporter isn't edge-safe). `instrumentation.ts` imports it dynamically inside
 * its `nodejs` branch.
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export const loggerProvider = POSTHOG_KEY
  ? new LoggerProvider({
      resource: resourceFromAttributes({ "service.name": "setups-works-lab" }),
      processors: [
        new BatchLogRecordProcessor(
          new OTLPLogExporter({
            url: `${POSTHOG_HOST}/i/v1/logs`,
            headers: {
              Authorization: `Bearer ${POSTHOG_KEY}`,
              "Content-Type": "application/json",
            },
          }),
        ),
      ],
    })
  : null;

type LogAttributes = Record<string, string | number | boolean>;

/** Emit a structured log to PostHog. No-op when PostHog isn't configured. */
export function serverLog(
  body: string,
  attributes: LogAttributes = {},
  severityNumber: SeverityNumber = SeverityNumber.INFO,
): void {
  if (!loggerProvider) return;
  loggerProvider.getLogger("setups-works-lab").emit({
    body,
    severityNumber,
    attributes,
  });
}

/**
 * Flush batched logs before a serverless function freezes. Call inside
 * `after(() => flushLogs())` in a route handler that emits logs.
 */
export async function flushLogs(): Promise<void> {
  if (loggerProvider) await loggerProvider.forceFlush();
}

export { SeverityNumber };
