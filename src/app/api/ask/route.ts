import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { generateAnswer } from "@/lib/openrouter";
import { evaluateAnswer } from "@/lib/judge";
import { evaluateWithBraintrust, logEvaluation } from "@/lib/braintrust";
import { evaluateWithLangsmith, logTrace } from "@/lib/langsmith";
import { computeConfidence } from "@/lib/confidence";
import type { AskRequest, AskResponse, EvaluationResult } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AskRequest;

    if (!body.question?.trim()) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const traceId = uuidv4();
    const startTime = Date.now();

    const { answer, model } = await generateAnswer(
      body.question,
      body.conversationHistory
    );

    const latencyMs = Date.now() - startTime;

    const [judgeResult, btScore, lsScore] = await Promise.all([
      evaluateAnswer(body.question, answer),
      evaluateWithBraintrust(body.question, answer),
      evaluateWithLangsmith(body.question, answer),
    ]);

    const judgeOverallNormalized = judgeResult.scores.overall / 10;
    const confidence = computeConfidence(judgeOverallNormalized, btScore, lsScore);

    const evaluation: EvaluationResult = {
      scores: judgeResult.scores,
      reasoning: judgeResult.reasoning,
      platformScores: {
        braintrustClosedQa: btScore,
        langsmithLlmJudge: lsScore,
      },
      confidence,
    };

    const traceParams = {
      traceId,
      question: body.question,
      answer,
      evaluation,
      model,
      latencyMs,
    };

    Promise.allSettled([
      logTrace(traceParams),
      logEvaluation(traceParams),
    ]).catch((err) => console.error("Eval platform logging failed:", err));

    const response: AskResponse = {
      answer,
      evaluation,
      confidence,
      traceId,
      model,
      latencyMs,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in /api/ask:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
