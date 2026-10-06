// Cost estimation helper based on token counts and model names

export function estimateCost(modelName: string | null | undefined, tokenCount: number): number {
  if (!tokenCount || tokenCount <= 0) return 0;
  const name = (modelName || '').toLowerCase();

  // Pricing per 1k tokens (blended approx average of input/output)
  let ratePer1k = 0.002; // default fallback

  if (name.includes('gpt-4o-mini')) {
    ratePer1k = 0.0003;
  } else if (name.includes('gpt-4o')) {
    ratePer1k = 0.005;
  } else if (name.includes('gpt-4-turbo') || name.includes('gpt-4')) {
    ratePer1k = 0.02;
  } else if (name.includes('gpt-3.5')) {
    ratePer1k = 0.001;
  } else if (name.includes('claude-3-5-sonnet') || name.includes('claude-3-opus')) {
    ratePer1k = 0.01;
  } else if (name.includes('claude-3-haiku')) {
    ratePer1k = 0.0005;
  } else if (name.includes('gemini-1.5-pro')) {
    ratePer1k = 0.0035;
  } else if (name.includes('gemini-1.5-flash')) {
    ratePer1k = 0.00015;
  }

  return (tokenCount / 1000) * ratePer1k;
}

export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.001) return `<$0.001`;
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
}
