export type CurrencyMode = 'TOMAN' | 'RIAL';

export type TabId =
  | 'dashboard'
  | 'pantry'
  | 'recipes'
  | 'planning'
  | 'orders'
  | 'offline-analyst'
  | 'reports';

export type IngredientCategory =
  | 'آرد و غلات'
  | 'لبنیات و روغن'
  | 'قند و شکلات'
  | 'مغزیجات'
  | 'افزودنی و اسانس'
  | 'بسته‌بندی';

export type PurchaseUnit = 'kg' | 'g' | 'liter' | 'unit';
export type RecipeUnit = 'kg' | 'g' | 'liter' | 'ml' | 'unit';

export type ProductCategory =
  | 'شیرینی خشک'
  | 'شیرینی تر'
  | 'کیک و رولت'
  | 'سنتی و باقلوا';

export type SalesUnit = 'kg' | 'unit';

export type OverheadAllocationMethod = 'volume' | 'laborHours';

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  purchaseUnit: PurchaseUnit;
  pricePerUnit: number; // Stored in Toman
}

export interface RecipeIngredientItem {
  ingredientId: string;
  quantity: number;
  unit: RecipeUnit;
}

export interface PackagingItem {
  ingredientId: string;
  quantityPerSalesUnit: number;
  unit: RecipeUnit;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  salesUnit: SalesUnit;
  sellingPrice: number; // Toman per salesUnit
  monthlyVolume: number; // Planned monthly sales volume in salesUnit
  batchYield: number; // Net sellable output per batch in salesUnit
  wastagePercent: number; // Moisture loss & prep wastage % (e.g. 8 means 8%)
  ingredients: RecipeIngredientItem[];
  packaging: PackagingItem[];
  masterMinutesPerBatch: number;
  assistantMinutesPerBatch: number;
  targetMarginPercent: number; // Desired net margin % for Smart Price Calculator
}

export interface FixedOverheadItem {
  id: string;
  title: string;
  category: string;
  monthlyAmount: number; // Toman per month
}

export interface WorkshopSettings {
  workshopName: string;
  masterHourlyRate: number; // Toman/hour
  assistantHourlyRate: number; // Toman/hour
  overheadAllocationMethod: OverheadAllocationMethod;
  monthlyTargetRevenue?: number; // Toman/month target revenue goal
  monthlyInflationRatePercent?: number; // Iranian monthly raw material inflation assumption (default 3.8%)
  upcomingSayadiChecks30d?: number; // Upcoming 30-day Sayadi checks in Toman
  snappFoodCommissionPercent?: number; // Delivery platform commission % (default 22%)
  yearlyBonusReserveMonthly?: number; // Monthly reserve for Esfand Eydi & Sanavat in Toman
  staffCount?: number; // Total active staff for Eydi/Sanavat readiness check
  monthlyOvenHoursCapacity?: number; // Monthly workshop oven hours capacity
}

export interface MonthlyPerformanceRecord {
  id: string;
  monthLabel: string;
  totalRevenue: number; // Toman
  totalCost: number; // Toman
  netProfit: number; // Toman
  isCurrentMonth?: boolean;
  isManualOverride?: boolean;
}

export interface WorkshopState {
  version: number;
  settings: WorkshopSettings;
  ingredients: Ingredient[];
  products: Product[];
  overheads: FixedOverheadItem[];
  monthlyHistory: MonthlyPerformanceRecord[];
}

export type MenuQuadrant = 'star' | 'plowhorse' | 'puzzle' | 'dog';

export interface ProductCostBreakdown {
  productId: string;
  productName: string;
  category: ProductCategory;
  salesUnit: SalesUnit;
  monthlyVolume: number;
  sellingPrice: number;
  batchRawMaterialCost: number;
  batchAdjustedMaterialCost: number;
  rawMaterialCostPerUnit: number;
  wastageCostPerUnit: number;
  adjustedMaterialCostPerUnit: number;
  packagingCostPerUnit: number;
  directLaborCostPerUnit: number;
  laborHoursPerUnit: number;
  overheadCostPerUnit: number;
  variableCostPerUnit: number;
  totalUnitCost: number;
  unitProfit: number;
  contributionMarginPerUnit: number;
  profitMarginPercent: number;
  suggestedPrice: number;
  monthlyRevenue: number;
  monthlyTotalCost: number;
  monthlyMaterialCost: number;
  monthlyWastageCost: number;
  monthlyPackagingCost: number;
  monthlyLaborCost: number;
  monthlyOverheadCost: number;
  monthlyProfit: number;
  quadrant: MenuQuadrant;
}

export interface WorkshopSummary {
  totalMonthlyRevenue: number;
  totalMonthlyCost: number;
  totalMonthlyVariableCost: number;
  totalMonthlyFixedOverhead: number;
  totalMonthlyMaterialCost: number;
  totalMonthlyWastageCost: number;
  totalMonthlyPackagingCost: number;
  totalMonthlyLaborCost: number;
  netMonthlyProfit: number;
  netProfitMarginPercent: number;
  totalMonthlyVolume: number;
  contributionMarginRatio: number;
  breakEvenRevenue: number;
  breakEvenVolume: number;
  breakEvenProgressPercent: number;
  marginOfSafetyPercent: number;
  isAboveBreakEven: boolean;
  productBreakdowns: ProductCostBreakdown[];
  avgVolume: number;
  avgMargin: number;
}

export interface MaterialRequirementRow {
  ingredientId: string;
  name: string;
  category: IngredientCategory;
  purchaseUnit: PurchaseUnit;
  unitPrice: number;
  totalQuantityRequired: number; // In purchaseUnit
  totalBudget: number; // Toman
}

export interface SimulationParams {
  materialDeltaPercent: number; // -10 to +100
  laborOverheadDeltaPercent: number; // 0 to +80
  sellingPriceDeltaPercent: number; // 0 to +100
}

export interface SimulationResult {
  before: WorkshopSummary;
  after: WorkshopSummary;
  profitDelta: number;
  marginDelta: number;
  revenueDelta: number;
  costDelta: number;
}

export interface TargetRevenueProductQuota {
  productId: string;
  productName: string;
  salesUnit: SalesUnit;
  extraVolumeNeeded: number;
  extraRevenueShare: number;
}

export interface TargetRevenueGapAnalysis {
  targetRevenue: number;
  currentRevenue: number;
  revenueGap: number;
  surplusRevenue: number;
  progressPercent: number;
  isGoalReached: boolean;
  currentAverageMarginPercent: number;
  projectedNetProfitAtTarget: number;
  additionalProfitFromGap: number;
  additionalUnitsNeeded: number;
  additionalDailyRevenueNeeded: number;
  productQuotas: TargetRevenueProductQuota[];
}

export interface VolumeSimulationResult {
  simulatedVolume: number;
  currentVolume: number;
  volumeDelta: number;
  volumeChangePercent: number;
  simulatedRevenue: number;
  simulatedVariableCost: number;
  fixedOverhead: number;
  simulatedTotalCost: number;
  simulatedNetProfit: number;
  profitDeltaFromCurrent: number;
  simulatedNetMarginPercent: number;
  overheadPerUnitSimulated: number;
  breakEvenVolume: number;
  breakEvenRevenue: number;
  breakEvenCoveragePercent: number;
  unitsFromBreakEven: number; // Positive = above break-even, negative = shortfall
  marginOfSafetyPercent: number;
  isAboveBreakEven: boolean;
}

export interface SeasonalForecastItem {
  seasonKey: 'spring' | 'summer' | 'autumn' | 'winter';
  seasonName: string;
  seasonNote: string;
  demandMultiplier: number;
  projectedRevenue: number;
  projectedCost: number;
  projectedProfit: number;
}

export interface ProfitForecastSummary {
  mode: 'baseline' | 'trend';
  monthlyTrendRatePercent: number;
  quarterlyRevenue: number;
  quarterlyCost: number;
  quarterlyProfit: number;
  quarterlyMarginPercent: number;
  annualRevenue: number;
  annualCost: number;
  annualProfit: number;
  annualMarginPercent: number;
  seasons: SeasonalForecastItem[];
}

export interface FinancialForecastParams {
  monthlyGrowthRatePercent: number; // Assumed monthly sales/revenue growth rate (-15 to +25)
  monthlyCostInflationPercent: number; // Assumed monthly cost inflation rate (0 to +15)
  applySeasonality: boolean; // Whether to overlay Iranian confectionery seasonal demand cycle
}

export interface MonthlyForecastPoint {
  monthIndex: number; // 1..12
  monthLabel: string;
  shortLabel: string;
  quarterIndex: 1 | 2 | 3 | 4;
  projectedRevenue: number;
  projectedCost: number;
  projectedProfit: number;
  cumulativeProfit: number;
  profitMarginPercent: number;
}

export interface QuarterlyForecastPoint {
  quarterIndex: 1 | 2 | 3 | 4;
  quarterLabel: string;
  monthsRangeLabel: string;
  projectedRevenue: number;
  projectedCost: number;
  projectedProfit: number;
  cumulativeProfit: number;
  profitMarginPercent: number;
}

export interface FinancialForecastProjection {
  assumedMonthlyGrowthPercent: number;
  assumedCostInflationPercent: number;
  applySeasonality: boolean;
  historicalTrendRatePercent: number;
  quarterlyRevenue: number;
  quarterlyCost: number;
  quarterlyProfit: number;
  quarterlyMarginPercent: number;
  quarterlyProfitDeltaPercent: number;
  annualRevenue: number;
  annualCost: number;
  annualProfit: number;
  annualMarginPercent: number;
  annualProfitDeltaPercent: number;
  averageMonthlyProfit: number;
  month12Revenue: number;
  month12Profit: number;
  monthlySeries: MonthlyForecastPoint[];
  quarterlySeries: QuarterlyForecastPoint[];
}

export interface FinalPriceSimulationParams {
  overheadPercentOfDirectCost: number; // Manual overhead % relative to direct cost (0..150)
  targetMarginPercent: number; // Manual target net profit margin % (1..80)
}

export interface FinalPriceSimulationResult {
  directUnitCost: number;
  baseOverheadPercent: number;
  simulatedOverheadPerUnit: number;
  simulatedTotalUnitCost: number;
  rawSuggestedPrice: number;
  roundedShowcasePrice: number;
  simulatedUnitProfit: number;
  effectiveMarginPercent: number;
  priceDeltaFromCurrent: number;
  priceDeltaPercent: number;
  monthlyProfitDelta: number;
}

export interface ProductCostProductivityItem {
  productId: string;
  productName: string;
  materialsSharePercent: number;
  packagingSharePercent: number;
  laborSharePercent: number;
  overheadSharePercent: number;
  costToRevenuePercent: number;
  revenuePerCostRatio: number; // e.g., 1.55 means 1.55 Toman revenue per 1 Toman cost
  dominantCostLabel: string;
  dominantCostPercent: number;
  productivityLabel: 'بهره‌وری عالی' | 'بهره‌وری مطلوب' | 'بهره‌وری متوسط' | 'بهره‌وری پایین';
  productivityTone: 'positive' | 'warning' | 'danger';
}

export type ProductBreakEvenHorizon = 'monthly' | 'quarterly' | 'annual';

export interface ProductBreakEvenPeriodMetrics {
  horizon: ProductBreakEvenHorizon;
  label: string;
  monthsCount: 1 | 3 | 12;
  allocatedFixedOverhead: number;
  plannedVolume: number;
  plannedRevenue: number;
  projectedProfit: number;
  breakEvenVolume: number;
  breakEvenRevenue: number;
  coveragePercent: number;
  marginOfSafetyPercent: number;
  unitsDeltaFromBreakEven: number;
  daysToBreakEven: number;
  isAboveBreakEven: boolean;
}

export interface ProductBreakEvenReport {
  productId: string;
  productName: string;
  category: ProductCategory;
  salesUnit: SalesUnit;
  sellingPrice: number;
  variableCostPerUnit: number;
  overheadCostPerUnit: number;
  contributionMarginPerUnit: number;
  contributionMarginRatioPercent: number;
  monthlyVolume: number;
  hasPositiveContribution: boolean;
  monthly: ProductBreakEvenPeriodMetrics;
  quarterly: ProductBreakEvenPeriodMetrics;
  annual: ProductBreakEvenPeriodMetrics;
}

export interface ProductBreakEvenChartPoint {
  volume: number;
  revenue: number;
  totalCost: number;
  fixedOverhead: number;
  profit: number;
}

export interface DedicatedProductBreakEvenAnalysis {
  report: ProductBreakEvenReport;
  batchYield: number;
  hasProductionVolume: boolean;
  dailyPlannedVolume: number;
  dailyBreakEvenVolume: number;
  batchesPerMonth: number;
  batchesPerQuarter: number;
  batchesPerYear: number;
  breakEvenBatchesMonthly: number;
  breakEvenBatchesQuarterly: number;
  breakEvenBatchesAnnual: number;
}

export interface HealthInsight {
  id: string;
  tone: 'positive' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
}

export interface ExecutiveReportAnalysis {
  healthScore: number;
  healthLabel: string;
  starProduct: ProductCostBreakdown | null;
  topRevenueProduct: ProductCostBreakdown | null;
  atRiskProducts: ProductCostBreakdown[];
  insights: HealthInsight[];
  actionSteps: string[];
}

export interface CustomOrderItem {
  id: string;
  productId: string;
  quantityPerBox: number; // In product's salesUnit (kg or unit)
}

export interface CustomOrderSpec {
  orderTitle: string;
  customerName: string;
  deliveryDate: string;
  boxCount: number;
  items: CustomOrderItem[];
  extraPackagingCostPerBox: number; // Toman (luxury gift box, ribbon, card)
  extraDecorLaborPerBox: number; // Toman (gift wrapping & special arrangement)
  targetMarginPercent: number; // Desired net margin before discount (5..75)
  discountPercent: number; // Bulk/corporate discount given to customer (0..60)
}

export interface CustomOrderItemQuote {
  id: string;
  productId: string;
  productName: string;
  salesUnit: SalesUnit;
  quantityPerBox: number;
  totalQuantityForOrder: number;
  unitCost: number;
  unitShowcasePrice: number;
  costPerBox: number;
  showcaseValuePerBox: number;
}

export interface CustomOrderQuoteResult {
  boxCount: number;
  items: CustomOrderItemQuote[];
  productsCostPerBox: number;
  extraPackagingCostPerBox: number;
  extraDecorLaborPerBox: number;
  totalCostPerBox: number;
  showcaseValuePerBox: number;
  basePricePerBoxBeforeDiscount: number;
  finalPricePerBox: number;
  unitProfitPerBox: number;
  totalOrderCost: number;
  totalOrderBeforeDiscount: number;
  totalDiscountAmount: number;
  totalOrderFinalRevenue: number;
  totalOrderNetProfit: number;
  effectiveMarginPercent: number;
  maxSafeDiscountPercent: number; // Maximum discount % before order turns into loss (profit = 0)
  isProfitable: boolean;
  isDiscountNearCap: boolean;
  orderMrpRows: MaterialRequirementRow[];
}

export interface AffectedProductShock {
  productId: string;
  productName: string;
  currentMarginPercent: number;
  shockedMarginPercent: number;
  unitCostIncrease: number;
  monthlyProfitDrop: number;
  dropsBelowSafety: boolean; // drops under 15% margin
  minPriceIncreasePercent: number; // % price adjustment needed to preserve profit
}

export interface IngredientShockImpact {
  ingredientId: string;
  ingredientName: string;
  category: IngredientCategory;
  purchaseUnit: PurchaseUnit;
  currentUnitPrice: number;
  shockedUnitPrice: number;
  shockPercent: number;
  monthlyGrossQuantity: number;
  monthlyProfitDrop: number;
  profitDropPercentOfTotal: number;
  affectedProductsCount: number;
  productsDroppingBelowSafety: number;
  affectedProducts: AffectedProductShock[];
}

export interface ScaledIngredientRow {
  ingredientId: string;
  name: string;
  category: IngredientCategory;
  unit: RecipeUnit;
  baseBatchQuantity: number;
  scaledNetQuantity: number;
  scaledGrossQuantityWithWastage: number;
  estimatedCost: number;
}

export interface ScaledPackagingRow {
  ingredientId: string;
  name: string;
  unit: RecipeUnit;
  scaledQuantity: number;
  estimatedCost: number;
}

export interface KitchenBatchSheet {
  productId: string;
  productName: string;
  salesUnit: SalesUnit;
  targetOutputQty: number;
  batchYield: number;
  batchesRequired: number;
  wastagePercent: number;
  masterMinutesTotal: number;
  assistantMinutesTotal: number;
  totalPrepMinutes: number;
  estimatedRawMaterialCost: number;
  estimatedAdjustedMaterialCost: number;
  estimatedPackagingCost: number;
  estimatedLaborCost: number;
  estimatedTotalDirectCost: number;
  ingredients: ScaledIngredientRow[];
  packaging: ScaledPackagingRow[];
}

// ============================================================
// PILLAR 7: Offline Diagnostic Intelligence Types
// ============================================================

export type RiskAppetite = 'conservative' | 'balanced' | 'aggressive';

export type AuditSeverity = 'critical' | 'warning' | 'opportunity';
export type ActionEffort = 'low' | 'high';
export type ActionQuadrant = 'quick-win' | 'strategic' | 'minor' | 'time-trap';

export interface RadarAxisPoint {
  axisKey:
    | 'realProfitability'
    | 'ovenProductivity'
    | 'inflationResilience'
    | 'liquiditySayadi'
    | 'menuWasteBalance';
  axisLabel: string;
  shortLabel: string;
  workshopScore: number; // 0..100
  benchmarkScore: number; // Iranian profitable bakery standard 0..100
  explanation: string;
}

export interface OfflineAuditFinding {
  id: string;
  ruleNumber: number; // 1..20
  title: string;
  severity: AuditSeverity;
  monthlyImpactToman: number;
  summary: string;
  evidence: string;
  effort: ActionEffort;
  quadrant: ActionQuadrant;
  actionLabel: string;
  targetTab: TabId;
  targetProductId?: string;
}

export interface OfflineDiagnosticReport {
  executionTimeMs: number;
  baseHealthScore: number; // 0..100 before completed checklist boosts
  radarAxes: RadarAxisPoint[];
  findings: OfflineAuditFinding[];
  totalCriticalImpactToman: number;
  totalOpportunityImpactToman: number;
  realInflationAdjustedProfit: number;
  phantomInflationProfit: number;
  phantomProfitSharePercent: number;
  profitPerOvenHour: number;
  effectiveWastePercent: number;
  sayadiCheckStressPercent: number;
  breakEvenDayOfMonth: number;
  monteCarloP5Profit: number; // Conservative VaR 95% deterministic bound
  monteCarloMedianProfit: number;
  monteCarloP95Profit: number;
  topTwoMaterialsSharePercent: number;
}

export interface OfflineMonthlySnapshot {
  id: string;
  monthLabel: string;
  savedAtIso: string;
  realProfit: number;
  nominalProfit: number;
  marginPercent: number;
  wastePercent: number;
  ovenHourProfit: number;
  breakEvenDay: number;
  healthScore: number;
  totalRevenue: number;
}

export interface SnapshotMetricDelta {
  key: string;
  label: string;
  fromValue: number;
  toValue: number;
  delta: number;
  unit: 'currency' | 'percent' | 'day' | 'score';
  higherIsBetter: boolean;
  isImproved: boolean;
}

export type OfflineDecisionType =
  | 'cafe-contract'
  | 'hire-staff'
  | 'waste-reduction'
  | 'seasonal-campaign';

export interface OfflineDecisionInput {
  type: OfflineDecisionType;
  // Cafe contract
  cafeMonthlyKg?: number;
  cafeDiscountPercent?: number;
  cafeCheckDays?: number;
  // Hire worker / equipment
  addedMonthlyFixedCost?: number;
  capacityGrowthPercent?: number;
  // Waste reduction
  wasteReductionPercentPoints?: number;
  // Seasonal campaign
  campaignPriceDeltaPercent?: number;
  campaignVolumeDeltaPercent?: number;
  campaignMarketingBudget?: number;
}

export interface DecisionKpiRow {
  key: string;
  label: string;
  before: number;
  after: number;
  delta: number;
  unit: 'currency' | 'percent' | 'day';
  higherIsBetter: boolean;
}

export interface OfflineDecisionSimulation {
  type: OfflineDecisionType;
  title: string;
  summaryText: string;
  netMonthlyProfitDelta: number;
  isFavorable: boolean;
  rows: DecisionKpiRow[];
}

export const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  'آرد و غلات',
  'لبنیات و روغن',
  'قند و شکلات',
  'مغزیجات',
  'افزودنی و اسانس',
  'بسته‌بندی',
];

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'سنتی و باقلوا',
  'شیرینی خشک',
  'شیرینی تر',
  'کیک و رولت',
];

export const PURCHASE_UNIT_LABELS: Record<PurchaseUnit, string> = {
  kg: 'کیلو گرم',
  g: 'گرم',
  liter: 'لیتر',
  unit: 'عدد',
};

export const RECIPE_UNIT_LABELS: Record<RecipeUnit, string> = {
  kg: 'کیلو گرم',
  g: 'گرم',
  liter: 'لیتر',
  ml: 'میلی‌لیتر',
  unit: 'عدد',
};

export const SALES_UNIT_LABELS: Record<SalesUnit, string> = {
  kg: 'کیلو گرم',
  unit: 'عدد',
};
