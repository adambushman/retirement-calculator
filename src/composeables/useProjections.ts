interface Stages {
  name: string;
  growth: number;
  years: number;
  monthlyValue: number;
}

interface GrowthFactors {
  currentBalance: number;
  annualRaises: number;
  annualInflation: number;
  stages: Stages[];
}

export interface GrowthResults {
  startBalance: number;
  endBalance: number;
}

interface GenericGrowthInput {
  stage: string;
  currentBalance: number;
  growthRate: number;        // e.g. 7 for 7%
  years: number;
  monthlyValue: number;      // +contribution, -withdrawal
  increase: number;          // raises OR inflation-adjustment of withdrawals
  annualInflation: number;   // used only for inflation-adjusted dollars
}

export interface AnnualProjection {
  year: number;
  stage: string;
  startBalance: number;
  endBalance: number;
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
  annualInflation,
}: GenericGrowthInput): AnnualProjection[] {

  const results: AnnualProjection[] = [];

  let balance = currentBalance;

  const annualRate = growthRate / 100;
  const increaseDecimal = increase / 100;
  const annualInflationDecimal = annualInflation / 100;

  // Monthly flows → annual flows
  let annualFlow = monthlyValue * 12;

  // Tracks total inflation accumulation
  let cumulativeInflationFactor = 1;

  for (let year = 1; year <= years; year++) {

    const startBalance = balance;

    // Flow adjustment: raise contributions OR inflation-adjust withdrawals
    annualFlow *= (1 + increaseDecimal);

    // Apply annual contributions or withdrawals (can be positive OR negative)
    balance += annualFlow;

    // Apply growth
    balance *= (1 + annualRate);

    const endBalance = balance;

    // Update cumulative inflation
    cumulativeInflationFactor += annualInflationDecimal;

    // Convert to today's dollars
    const startBalanceInflAdj = startBalance / cumulativeInflationFactor;
    const endBalanceInflAdj   = endBalance / cumulativeInflationFactor;

    results.push({
      year,
      stage,
      startBalance: startBalanceInflAdj,
      endBalance: endBalanceInflAdj,
    });
  }

  return results;
}

export function prepareGrowthProjection({
  currentBalance,
  annualRaises,
  annualInflation,
  stages,
}: GrowthFactors): FullProjection {
  let completeProjection: FullProjection = {
    'raw': null, 'inflation-adjusted': null
  };

  const expanded: any[] = [];

  for (const stage of stages) {
    for (let i = 1; i <= stage.years; i++) {
      expanded.push({
        stage: stage.name,
        yearInStage: i,
        growth: stage.growth,
        monthlyValue: stage.monthlyValue,
      });
    }
  }

  (['raw', 'inflation-adjusted'] as (keyof FullProjection)[]).forEach((c) => {
    let balance = currentBalance;
    let projection: AnnualProjection[] = [];
    stages.forEach((s) => {
      const proj = generateGenericGrowthProjection({
        stage: s.name,
        currentBalance: balance,
        growthRate: s.growth,
        years: s.years,
        monthlyValue: s.monthlyValue,
        increase: annualRaises,
        annualInflation: c === 'raw' ? 0 : annualInflation,
      });

      projection = [...projection, ...proj]
      balance = getEndBalance(proj);
    });

    completeProjection[c] = projection;
  });

  return completeProjection;
}