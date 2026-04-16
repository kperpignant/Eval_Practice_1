export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  evaluation?: EvaluationResult;
  timestamp: number;
}

export interface JudgeScores {
  relevance: number;
  accuracy: number;
  completeness: number;
  consistency: number;
  overall: number;
}

export interface JudgeResult {
  scores: JudgeScores;
  reasoning: string;
}

export interface PlatformScores {
  braintrustClosedQa: number | null;
  langsmithLlmJudge: number | null;
}

export interface EvaluationResult {
  scores: JudgeScores;
  reasoning: string;
  platformScores: PlatformScores;
  confidence: number;
}

export interface AskRequest {
  question: string;
  conversationHistory?: Pick<Message, "role" | "content">[];
}

export interface AskResponse {
  answer: string;
  evaluation: EvaluationResult;
  confidence: number;
  traceId: string;
  model: string;
  latencyMs: number;
}
