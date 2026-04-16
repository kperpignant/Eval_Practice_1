# Q&A Support App

LLM-powered question and answer support application with built-in answer evaluation. Uses OpenRouter for LLM API calls and integrates with LangSmith and Braintrust for evaluation tracking.

## How It Works

1. User asks a question through the chat UI
2. The app sends the question to an LLM via OpenRouter to generate an answer
3. A separate judge LLM evaluates the answer on relevance, accuracy, completeness, and consistency
4. Evaluation scores are logged to LangSmith and Braintrust for tracking over time
5. The user sees the answer along with a quality score

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

Required keys:

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | Your [OpenRouter](https://openrouter.ai/) API key |
| `ANSWER_MODEL` | Model for answering questions (default: `openai/gpt-4o`) |
| `JUDGE_MODEL` | Model for evaluating answers (default: `openai/gpt-4o-mini`) |
| `LANGSMITH_API_KEY` | Your [LangSmith](https://smith.langchain.com/) API key (optional) |
| `LANGSMITH_PROJECT` | LangSmith project name (default: `qa-support-app`) |
| `BRAINTRUST_API_KEY` | Your [Braintrust](https://www.braintrust.dev/) API key (optional) |
| `BRAINTRUST_PROJECT` | Braintrust project name (default: `qa-support-app`) |

Only `OPENROUTER_API_KEY` is required. LangSmith and Braintrust integrations are optional and will be skipped if their keys are not set.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Evaluation Rubric

Each answer is scored on a 0-10 scale across four dimensions:

- **Relevance** — Does the answer address the question?
- **Accuracy** — Is the information factually correct?
- **Completeness** — Does it cover all important aspects?
- **Consistency** — Would this answer be reproduced if asked again?

## Consistency Strategy

- Temperature is set to 0 for deterministic outputs
- A structured system prompt enforces consistent answer formatting
- The judge LLM provides a feedback loop on each answer
- LangSmith and Braintrust log every interaction so you can track answer drift over time and run experiments comparing different models or prompts
