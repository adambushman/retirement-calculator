interface Stages {
  name: string;
  growth: number;
  years: number;
  monthlyValue: number;
  annualIncrease: number;
}

interface GrowthFactors {
  currentBalance: number;
  annualInflation: number;
  stages: Stages[];
}

interface GenericGrowthInput {
  stage: string;
  currentBalance: number;
  growthRate: number;        // e.g. 7 for 7%
  years: number;
  monthlyValue: number;      // +contribution, -withdrawal
  increase: number;          // raises OR inflation-adjustment of withdrawals
}

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

function getEndBalance(projections: AnnualProjection[]): number {
  return projections.length > 0
    ? projections[projections.length - 1]?.endBalance ?? 0
    : 0;
}

function generateGenericGrowthProjection({
  stage,
  currentBalance,
  growthRate,
  years,
  monthlyValue,
  increase,
}: GenericGrowthInput): AnnualProjection[] {

  const results: AnnualProjection[] = [];

  let balance = currentBalance;

  const annualRate = growthRate / 100;
  const increaseDecimal = increase / 100;

  // Monthly flows → annual flows
  let annualFlow = monthlyValue * 12;

  for (let year = 1; year <= years; year++) {

    const startBalance = balance;

    // Flow adjustment: raise contributions OR inflation-adjust withdrawals
    annualFlow *= (1 + increaseDecimal);

    // Apply annual contributions or withdrawals (can be positive OR negative)
    balance += annualFlow;

    // Apply growth
    balance *= (1 + annualRate);

    const endBalance = balance;

    results.push({
      year,
      stage,
      startBalance: startBalance,
      endBalance: endBalance,
      annualFlow,
      totalGrowth: endBalance - startBalance - annualFlow,
    });
  }

  return results;
}

export function prepareGrowthProjection({
  currentBalance,
  annualInflation,
  stages,
}: GrowthFactors): FullProjection {
  let completeProjection: FullProjection = {
    'raw': null, 'inflation-adjusted': null
  };

  // Calculate raw projection
  let balance = currentBalance;
  let rawProjection: AnnualProjection[] = [];
  stages.forEach((s) => {
    const proj = generateGenericGrowthProjection({
      stage: s.name,
      currentBalance: balance,
      growthRate: s.growth,
      years: s.years,
      monthlyValue: s.monthlyValue,
      increase: s.annualIncrease
    });

    rawProjection = [...rawProjection, ...proj]
    balance = getEndBalance(proj);
  });

  completeProjection['raw'] = rawProjection;

  const inflAdjProjection = rawProjection.map((p, i) => {
    const inflationFactor = 1 + (i * (annualInflation / 100));

    return {
      ...p,
      startBalance: p.startBalance / inflationFactor,
      endBalance: p.endBalance / inflationFactor,
      annualFlow: p.annualFlow / inflationFactor,
      totalGrowth: p.totalGrowth / inflationFactor,
    };
  });

  completeProjection['inflation-adjusted'] = inflAdjProjection;

  return completeProjection;
}