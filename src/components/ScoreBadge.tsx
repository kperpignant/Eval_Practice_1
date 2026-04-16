"use client";

import { useState } from "react";
import type { EvaluationResult } from "@/lib/types";

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (confidence >= 0.5) return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
}

function formatPct(value: number | null): string {
  if (value === null) return "N/A";
  return `${Math.round(value * 100)}%`;
}

export default function ScoreBadge({ evaluation }: { evaluation: EvaluationResult }) {
  const [expanded, setExpanded] = useState(false);
  const { scores, reasoning, platformScores, confidence } = evaluation;
  const confidencePct = Math.round(confidence * 100);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${confidenceColor(confidence)} hover:opacity-80`}
      >
        <span>Confidence: {confidencePct}%</span>
        <svg
          className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-800/50">
          <div className="mb-2 pb-2 border-b border-zinc-200 dark:border-zinc-700">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">Evaluator Breakdown</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Judge LLM (overall)</span>
              <span className="font-semibold">{scores.overall}/10</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Braintrust ClosedQA</span>
              <span className="font-semibold">{formatPct(platformScores?.braintrustClosedQa)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">LangSmith LLM Judge</span>
              <span className="font-semibold">{formatPct(platformScores?.langsmithLlmJudge)}</span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">Judge LLM Detail</span>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["relevance", "accuracy", "completeness", "consistency"] as const).map((key) => (
                <div key={key} className="flex flex-col">
                  <span className="capitalize text-zinc-500 dark:text-zinc-400">{key}</span>
                  <span className="font-semibold">{scores[key]}/10</span>
                </div>
              ))}
            </div>
          </div>

          {reasoning && (
            <p className="mt-2 text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700 pt-2">
              {reasoning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
