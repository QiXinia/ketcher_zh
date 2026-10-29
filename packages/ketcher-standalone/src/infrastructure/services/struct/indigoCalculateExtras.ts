/** Preserve Indigo's normal calculation result when its LogP estimate fails. */
export function addCrippenLogP(
  calculated: string,
  calculateLogP: () => unknown,
): string {
  try {
    const properties: unknown = JSON.parse(calculated);
    if (
      !properties ||
      typeof properties !== 'object' ||
      Array.isArray(properties)
    )
      return calculated;
    const raw = calculateLogP();
    if (
      typeof raw !== 'string' ||
      !/^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?\s*$/i.test(raw)
    )
      return calculated;
    const logp = Number(raw);
    return Number.isFinite(logp)
      ? JSON.stringify({ ...properties, 'crippen-logp': logp })
      : calculated;
  } catch {
    return calculated;
  }
}
