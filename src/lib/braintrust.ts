import { initLogger } from "braintrust";
import { ClosedQA } from "autoevals";
import type { EvaluationResult } from "./types";

let logger: ReturnType<typeof initLogger> | null = null;

function getLogger() {
  if (!process.env.BRAINTRUST_API_KEY) {
    return null;
  }
  if (!logger) {
    logger = initLogger({
      projectName: process.env.BRAINTRUST_PROJECT || "qa-support-app",
      apiKey: process.env.BRAINTRUST_API_KEY,
    });
  }
  return logger;
}

export async function evaluateWithBraintrust(
  question: string,
  answer: string
): Promise<number | null> {
  const savedKey = process.env.BRAINTRUST_API_KEY;
  try {
    delete process.env.BRAINTRUST_API_KEY;
    const result = await ClosedQA({
      input: question,
      output: answer,
      criteria: "Does the answer correctly, completely, and helpfully respond to the question?",
      openAiApiKey: process.env.OPENROUTER_API_KEY,
      openAiBaseUrl: "https://openrouter.ai/api/v1",
      model: process.env.JUDGE_MODEL || "openai/gpt-4o-mini",
    });
    return result.score ?? null;
  } catch (error) {
    console.error("Braintrust ClosedQA evaluation failed:", error);
    return null;
  } finally {
    if (savedKey) {
      process.env.BRAINTRUST_API_KEY = savedKey;
    }
  }
}

export async function logEvaluation(params: {
  traceId: string;
  question: string;
  answer: string;
  evaluation: EvaluationResult;
  model: string;
  latencyMs: number;
}): Promise<void> {
  const btLogger = getLogger();
  if (!btLogger) {
    console.warn("Braintrust API key not configured — skipping eval logging");
    return;
  }

  try {
    btLogger.log({
      input: params.question,
      output: params.answer,
      metadata: {
        traceId: params.traceId,
        model: params.model,
        latencyMs: params.latencyMs,
      },
      scores: {
        relevance: params.evaluation.scores.relevance / 10,
        accuracy: params.evaluation.scores.accuracy / 10,
        completeness: params.evaluation.scores.completeness / 10,
        consistency: params.evaluation.scores.consistency / 10,
        overall: params.evaluation.scores.overall / 10,
        confidence: params.evaluation.confidence,
        ...(params.evaluation.platformScores.braintrustClosedQa !== null && {
          closedQa: params.evaluation.platformScores.braintrustClosedQa,
        }),
      },
    });
  } catch (error) {
    console.error("Failed to log evaluation to Braintrust:", error);
  }
}
