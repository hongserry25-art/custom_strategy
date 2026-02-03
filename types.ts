
export enum GrowthStage {
  INTRODUCTION = 'Introduction',
  GROWTH = 'Growth',
  MATURITY = 'Maturity'
}

export interface MarketSize {
  tam: number; // In Billions
  sam: number; // In Billions
  som: number; // In Billions
  description: string;
  tamReasoning?: string;
  samReasoning?: string;
  somReasoning?: string;
}

export interface UnitEconomics {
  ltv: number;
  cac: number;
  ratio: number; // LTV/CAC
  contributionMargin: number; // Percentage
  paybackPeriod: number; // Months
  isHealthy: boolean;
  ltvReasoning?: string;
  cacReasoning?: string;
  contributionMarginReasoning?: string;
}

export interface InvestmentSummaryItem {
  classification: string; // 구분
  content: string; // 내용 (2026년 전망치 포함)
  investmentPoint: string; // 투자 포인트
}

export interface BuyStrategy {
  currentPriceContext: string;
  shortTerm: string; // 단기 전략
  mediumTerm: string; // 중기 전략
  longTerm: string; // 장기 전략
}

export interface AnalysisResult {
  ticker: string;
  companyName: string;
  verdict: string;
  potentialRating: number; // 1 to 10
  growthStage: GrowthStage;
  penetrationRate: number; // Percentage
  marketSize: MarketSize;
  unitEconomics: UnitEconomics;
  investmentSummary: InvestmentSummaryItem[];
  buyStrategy: BuyStrategy;
  businessModelReasoning?: string;
  pricingPower: {
    status: 'Strong' | 'Average' | 'Weak';
    evidence: string;
  };
  economiesOfScale: {
    fixedCostRatio: number; // Percentage
    analysis: string;
  };
  bepAnalysis: string;
  recentIssues: {
    title: string;
    description: string;
    impact: 'Positive' | 'Neutral' | 'Negative';
  }[];
  sources: { title: string; uri: string }[];
}
