const BASE_WEIGHTS = {
  judge: 0.4,
  braintrust: 0.3,
  langsmith: 0.3,
} as const;

/**
 * Computes a weighted-average confidence score from up to three evaluator signals.
 * If a platform score is null (unavailable), its weight is redistributed
 * proportionally among the remaining evaluators.
 */
export function computeConfidence(
  judgeOverallNormalized: number,
  braintrustScore: number | null,
  langsmithScore: number | null
): number {
  const signals: { value: number; baseWeight: number }[] = [
    { value: judgeOverallNormalized, baseWeight: BASE_WEIGHTS.judge },
  ];

  if (braintrustScore !== null) {
    signals.push({ value: braintrustScore, baseWeight: BASE_WEIGHTS.braintrust });
  }
  if (langsmithScore !== null) {
    signals.push({ value: langsmithScore, baseWeight: BASE_WEIGHTS.langsmith });
  }

  const totalWeight = signals.reduce((sum, s) => sum + s.baseWeight, 0);

  const confidence = signals.reduce(
    (sum, s) => sum + s.value * (s.baseWeight / totalWeight),
    0
  );

  return Math.round(confidence * 1000) / 1000;
}
