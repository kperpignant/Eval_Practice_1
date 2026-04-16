import OpenAI from "openai";

const SYSTEM_PROMPT = `You are a helpful, accurate, and consistent support assistant. Follow these rules strictly:

1. Provide clear, well-structured answers.
2. If you are unsure about something, say so explicitly rather than guessing.
3. Use a consistent format: start with a direct answer, then provide supporting details.
4. For technical questions, include relevant examples when helpful.
5. Keep answers concise but complete — do not omit important details.
6. Always maintain a professional and friendly tone.`;

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is not set");
    }
    client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });
  }
  return client;
}

export async function generateAnswer(
  question: string,
  conversationHistory?: { role: "user" | "assistant"; content: string }[]
): Promise<{ answer: string; model: string }> {
  const openai = getClient();
  const model = process.env.ANSWER_MODEL || "openai/gpt-4o";

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (conversationHistory?.length) {
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: "user", content: question });

  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0,
    max_tokens: 2048,
  });

  const answer = response.choices[0]?.message?.content;
  if (!answer) {
    throw new Error("No response received from the model");
  }

  return { answer, model };
}
