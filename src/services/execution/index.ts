import { EXECUTION_LIMITS, type LanguageConfig } from "@/lib/constants";
import type { QuestionTestCase } from "@/types/db";
import { pistonProvider } from "./piston";
import { judge0Provider } from "./judge0";
import { paizaProvider } from "./paiza";
import { outputsMatch, normalizeOutput } from "./normalize";
import type { ExecutionProvider, ExecutionResult } from "./types";

export type { ExecutionResult } from "./types";
export { outputsMatch, normalizeOutput } from "./normalize";

/**
 * Default is paiza.io (free, no key, all 12 languages). The public Piston
 * API went whitelist-only in Feb 2026, so "piston" should only be used with
 * a self-hosted PISTON_URL. "judge0" needs JUDGE0_API_KEY (RapidAPI).
 */
export function getExecutionProvider(): ExecutionProvider {
  switch (process.env.EXECUTION_PROVIDER) {
    case "judge0":
      return judge0Provider;
    case "piston":
      return pistonProvider;
    default:
      return paizaProvider;
  }
}

export interface TestRunResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  hidden: boolean;
  stderr: string;
  timeMs: number | null;
  status: ExecutionResult["status"];
}

export interface TestSuiteResult {
  results: TestRunResult[];
  passedCount: number;
  totalCount: number;
  /** First non-success execution status, if any */
  failureStatus: ExecutionResult["status"] | null;
  totalTimeMs: number;
  maxMemoryKb: number | null;
}

const INTER_RUN_DELAY_MS = 250; // public Piston allows ~5 req/s per IP

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run the user's program against each test case sequentially.
 * Stops early on compile errors (every case would fail identically).
 */
export async function runTestSuite(
  language: LanguageConfig,
  code: string,
  testCases: Pick<QuestionTestCase, "input" | "expected" | "hidden">[],
): Promise<TestSuiteResult> {
  const provider = getExecutionProvider();
  const cases = testCases.slice(0, EXECUTION_LIMITS.maxTestCasesPerRun);

  const results: TestRunResult[] = [];
  let failureStatus: ExecutionResult["status"] | null = null;
  let totalTimeMs = 0;
  let maxMemoryKb: number | null = null;

  for (let i = 0; i < cases.length; i++) {
    const testCase = cases[i];
    if (i > 0) await sleep(INTER_RUN_DELAY_MS);

    const result = await provider.execute({
      language,
      code,
      stdin: testCase.input,
    });

    const passed =
      result.status === "success" &&
      outputsMatch(result.stdout, testCase.expected);

    if (result.status !== "success" && !failureStatus) {
      failureStatus = result.status;
    }
    totalTimeMs += result.timeMs ?? 0;
    if (result.memoryKb !== null) {
      maxMemoryKb = Math.max(maxMemoryKb ?? 0, result.memoryKb);
    }

    results.push({
      input: testCase.input,
      expected: testCase.expected,
      actual: normalizeOutput(result.stdout),
      passed,
      hidden: testCase.hidden,
      stderr: result.stderr.slice(0, 4000),
      timeMs: result.timeMs,
      status: result.status,
    });

    // No point running the rest after a compile error
    if (result.status === "compile_error") {
      for (const remaining of cases.slice(i + 1)) {
        results.push({
          input: remaining.input,
          expected: remaining.expected,
          actual: "",
          passed: false,
          hidden: remaining.hidden,
          stderr: "Skipped due to compilation error",
          timeMs: null,
          status: "compile_error",
        });
      }
      break;
    }
  }

  return {
    results,
    passedCount: results.filter((r) => r.passed).length,
    totalCount: results.length,
    failureStatus,
    totalTimeMs,
    maxMemoryKb,
  };
}

export function suiteToSubmissionStatus(
  suite: TestSuiteResult,
):
  | "Accepted"
  | "Wrong Answer"
  | "Time Limit Exceeded"
  | "Runtime Error"
  | "Compilation Error"
  | "Internal Error" {
  if (suite.failureStatus === "compile_error") return "Compilation Error";
  if (suite.failureStatus === "timeout") return "Time Limit Exceeded";
  if (suite.failureStatus === "runtime_error") return "Runtime Error";
  if (suite.failureStatus === "internal_error") return "Internal Error";
  return suite.passedCount === suite.totalCount ? "Accepted" : "Wrong Answer";
}
