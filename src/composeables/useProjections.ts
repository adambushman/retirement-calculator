export interface AnnualProjection {
  year: number;
  stage: string;
  startBalance: number;
  endBalance: number;
  annualFlow: number;
  totalGrowth: number;
}

export interface FullProjection {
  'raw': AnnualProjection[] | null;
  'inflation-adjusted': AnnualProjection[] | null;
}

/**
 * Restates a raw year-by-year projection in today's dollars, dividing every
 * figure by cumulative inflation to that point. Row 0 is "today" (no
 * adjustment), matching the basis the chart uses for its age labels.
 */
export function applyInflationAdjustment(
  rows: AnnualProjection[],
  annualInflation: number
): AnnualProjection[] {
  return rows.map((p, i) => {
    const inflationFactor = Math.pow(1 + annualInflation / 100, i);

    return {
      ...p,
      startBalance: p.startBalance / inflationFactor,
      endBalance: p.endBalance / inflationFactor,
      annualFlow: p.annualFlow / inflationFactor,
      totalGrowth: p.totalGrowth / inflationFactor,
    };
  });
}
