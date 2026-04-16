import { Client } from "langsmith";
import OpenAI from "openai";
import type { EvaluationResult } from "./types";

const LANGSMITH_JUDGE_PROMPT = `You are an independent answer quality evaluator. Given a user question and an AI-generated answer, assess how well the answer serves the user.

Consider:
- Does the answer directly and helpfully respond to the question?
- Is the information accurate and trustworthy?
- Is the answer clear, well-organized, and appropriately detailed?

Respond with ONLY a JSON object in this exact format:
{"score": <number between 0 and 1>, "reasoning": "<one sentence explanation>"}

A score of 1.0 means the answer is excellent. A score of 0.0 means it is completely unhelpful or wrong.`;

let langsmithClient: Client | null = null;
let evaluatorClient: OpenAI | null = null;

function getClient(): Client | null {
  if (!process.env.LANGSMITH_API_KEY) {
    return null;
  }
  if (!langsmithClient) {
    langsmithClient = new Client({
      apiKey: process.env.LANGSMITH_API_KEY,
    });
  }
  return langsmithClient;
}

function getEvaluatorClient(): OpenAI {
  if (!evaluatorClient) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is required for LangSmith evaluator");
    }
    evaluatorClient = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });
  }
  return evaluatorClient;
}

export async function evaluateWithLangsmith(
  question: string,
  answer: string
): Promise<number | null> {
  try {
    const openai = getEvaluatorClient();
    const model = process.env.JUDGE_MODEL || "openai/gpt-4o-mini";

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: LANGSMITH_JUDGE_PROMPT },
        {
          role: "user",
          content: `Question: ${question}\n\nAnswer: ${answer}`,
        },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
      max_tokens: 256,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as { score: number; reasoning: string };
    if (typeof parsed.score !== "number") return null;

    return Math.max(0, Math.min(1, parsed.score));
  } catch (error) {
    console.error("LangSmith LLM-as-judge evaluation failed:", error);
    return null;
  }
}

export async function logTrace(params: {
  traceId: string;
  question: string;
  answer: string;
  evaluation: EvaluationResult;
  model: string;
  latencyMs: number;
}): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn("LangSmith API key not configured — skipping trace logging");
    return;
  }

  const projectName = process.env.LANGSMITH_PROJECT || "qa-support-app";

  try {
    await client.createRun({
      name: "qa-interaction",
      run_type: "chain",
      id: params.traceId,
      inputs: { question: params.question },
      outputs: { answer: params.answer },
      project_name: projectName,
      extra: {
        metadata: {
          model: params.model,
          latency_ms: params.latencyMs,
          confidence: params.evaluation.confidence,
        },
      },
      start_time: new Date(Date.now() - params.latencyMs).toISOString(),
      end_time: new Date().toISOString(),
    });

    await client.createFeedback(params.traceId, "relevance", {
      score: params.evaluation.scores.relevance / 10,
      comment: params.evaluation.reasoning,
    });
    await client.createFeedback(params.traceId, "accuracy", {
      score: params.evaluation.scores.accuracy / 10,
    });
    await client.createFeedback(params.traceId, "completeness", {
      score: params.evaluation.scores.completeness / 10,
    });
    await client.createFeedback(params.traceId, "consistency", {
      score: params.evaluation.scores.consistency / 10,
    });
    await client.createFeedback(params.traceId, "overall", {
      score: params.evaluation.scores.overall / 10,
    });
    await client.createFeedback(params.traceId, "langsmith_llm_judge", {
      score: params.evaluation.platformScores.langsmithLlmJudge ?? undefined,
    });
    await client.createFeedback(params.traceId, "confidence", {
      score: params.evaluation.confidence,
    });
  } catch (error) {
    console.error("Failed to log trace to LangSmith:", error);
  }
}
