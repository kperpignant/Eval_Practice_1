import OpenAI from "openai";
import type { JudgeResult } from "./types";

const JUDGE_SYSTEM_PROMPT = `You are an expert answer evaluator. Your job is to assess the quality of an AI assistant's answer to a user question.

Evaluate on these criteria, scoring each from 0 to 10:

1. **relevance**: Does the answer directly address the question asked? (0 = completely off-topic, 10 = perfectly targeted)
2. **accuracy**: Is the information factually correct? (0 = entirely wrong, 10 = fully accurate)
3. **completeness**: Does the answer cover all important aspects of the question? (0 = missing everything, 10 = comprehensive)
4. **consistency**: Is the answer internally consistent and would it likely be reproduced if asked again? (0 = contradictory/random, 10 = highly consistent)
5. **overall**: Your holistic assessment considering all factors above. (0 = terrible, 10 = excellent)

You MUST respond with valid JSON in exactly this format:
{
  "scores": {
    "relevance": <number 0-10>,
    "accuracy": <number 0-10>,
    "completeness": <number 0-10>,
    "consistency": <number 0-10>,
    "overall": <number 0-10>
  },
  "reasoning": "<brief explanation of your evaluation>"
}`;

let judgeClient: OpenAI | null = null;

function getJudgeClient(): OpenAI {
  if (!judgeClient) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is not set");
    }
    judgeClient = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });
  }
  return judgeClient;
}

export async function evaluateAnswer(
  question: string,
  answer: string
): Promise<JudgeResult> {
  const openai = getJudgeClient();
  const model = process.env.JUDGE_MODEL || "openai/gpt-4o-mini";

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: JUDGE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Question: ${question}\n\nAnswer: ${answer}`,
      },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
    max_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No evaluation response received from judge model");
  }

  const parsed = JSON.parse(content) as JudgeResult;

  if (!parsed.scores || typeof parsed.scores.overall !== "number") {
    throw new Error("Invalid evaluation format received from judge model");
  }

  return parsed;
}
