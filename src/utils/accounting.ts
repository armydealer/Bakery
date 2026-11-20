import {
  AffectedProductShock,
  CustomOrderItemQuote,
  CustomOrderQuoteResult,
  CustomOrderSpec,
  DedicatedProductBreakEvenAnalysis,
  ExecutiveReportAnalysis,
  FinalPriceSimulationParams,
  FinalPriceSimulationResult,
  FinancialForecastParams,
  FinancialForecastProjection,
  HealthInsight,
  Ingredient,
  IngredientCategory,
  IngredientShockImpact,
  KitchenBatchSheet,
  MaterialRequirementRow,
  MenuQuadrant,
  MonthlyForecastPoint,
  MonthlyPerformanceRecord,
  Product,
  ProductBreakEvenChartPoint,
  ProductBreakEvenHorizon,
  ProductBreakEvenPeriodMetrics,
  ProductBreakEvenReport,
  ProductCostBreakdown,
  ProductCostProductivityItem,
  ProfitForecastSummary,
  PurchaseUnit,
  QuarterlyForecastPoint,
  RecipeUnit,
  ScaledIngredientRow,
  ScaledPackagingRow,
  SeasonalForecastItem,
  SimulationParams,
  SimulationResult,
  TargetRevenueGapAnalysis,
  VolumeSimulationResult,
  WorkshopSettings,
  WorkshopState,
  WorkshopSummary,
} from '../types/workshop';

/**
 * Converts quantity from a recipe unit into the ingredient's purchase unit.
 * Example: 500 g of an ingredient priced per kg => 0.5 kg.
 */
export function convertRecipeQtyToPurchaseQty(
  quantity: number,
  recipeUnit: RecipeUnit,
  purchaseUnit: PurchaseUnit
): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  if (recipeUnit === purchaseUnit) return quantity;

  // Weight conversions
  if (purchaseUnit === 'kg' && (recipeUnit === 'g' || recipeUnit === 'ml')) {
    return quantity / 1000;
  }
  if (purchaseUnit === 'g' && (recipeUnit === 'kg' || recipeUnit === 'liter')) {
    return quantity * 1000;
  }
  if (purchaseUnit === 'kg' && recipeUnit === 'liter') {
    return quantity;
  }

  // Volume conversions
  if (purchaseUnit === 'liter' && (recipeUnit === 'ml' || recipeUnit === 'g')) {
    return quantity / 1000;
  }
  if (purchaseUnit === 'liter' && recipeUnit === 'kg') {
    return quantity;
  }

  // Unit fallback
  return quantity;
}

/**
 * Exact target-margin pricing formula:
 * Suggested Price = Total Unit Cost / (1 - Target Margin %)
 */
export function calculateSuggestedPrice(
  totalUnitCost: number,
  targetMarginPercent: number
): number {
  if (totalUnitCost <= 0) return 0;
  const clampedMargin = Math.min(Math.max(targetMarginPercent, 0), 95);
  const ratio = clampedMargin / 100;
  return totalUnitCost / (1 - ratio);
}

/**
 * Exact adjusted material cost formula accounting for baking shrinkage & wastage:
 * Adjusted Material Cost = Raw Material Cost / (1 - Wastage Rate)
 */
export function calculateAdjustedMaterialCost(
  rawMaterialCost: number,
  wastagePercent: number
): number {
  if (rawMaterialCost <= 0) return 0;
  const clampedRate = Math.min(Math.max(wastagePercent, 0), 90) / 100;
  return rawMaterialCost / (1 - clampedRate);
}

/**
 * Calculates full industrial cost accounting breakdown for all products
 * and aggregates workshop-wide KPIs and break-even metrics.
 */
export function calculateWorkshopSummary(
  state: WorkshopState,
  multipliers?: {
    materialMultiplier?: number;
    laborOverheadMultiplier?: number;
    sellingPriceMultiplier?: number;
    volumeMultiplier?: number;
  }
): WorkshopSummary {
  const matMult = multipliers?.materialMultiplier ?? 1;
  const labOvhMult = multipliers?.laborOverheadMultiplier ?? 1;
  const priceMult = multipliers?.sellingPriceMultiplier ?? 1;
  const volMult = multipliers?.volumeMultiplier ?? 1;

  const ingredientMap = new Map<string, Ingredient>();
  for (const ing of state.ingredients) {
    ingredientMap.set(ing.id, ing);
  }

  const totalMonthlyFixedOverhead = state.overheads.reduce(
    (acc, item) => acc + Math.max(0, item.monthlyAmount) * labOvhMult,
    0
  );

  // Pre-compute unit-level direct metrics before overhead allocation
  interface PreCalc {
    product: Product;
    batchRawMaterialCost: number;
    batchAdjustedMaterialCost: number;
    rawMaterialCostPerUnit: number;
    wastageCostPerUnit: number;
    adjustedMaterialCostPerUnit: number;
    packagingCostPerUnit: number;
    directLaborCostPerUnit: number;
    laborHoursPerUnit: number;
    sellingPrice: number;
  }

  const preCalcs: PreCalc[] = state.products.map((product) => {
    const safeYield = product.batchYield > 0 ? product.batchYield : 1;

    const batchRawMaterialCost = product.ingredients.reduce((sum, item) => {
      const ing = ingredientMap.get(item.ingredientId);
      if (!ing) return sum;
      const purchaseQty = convertRecipeQtyToPurchaseQty(
        item.quantity,
        item.unit,
        ing.purchaseUnit
      );
      return sum + purchaseQty * ing.pricePerUnit * matMult;
    }, 0);

    const batchAdjustedMaterialCost = calculateAdjustedMaterialCost(
      batchRawMaterialCost,
      product.wastagePercent
    );

    const rawMaterialCostPerUnit = batchRawMaterialCost / safeYield;
    const adjustedMaterialCostPerUnit = batchAdjustedMaterialCost / safeYield;
    const wastageCostPerUnit =
      adjustedMaterialCostPerUnit - rawMaterialCostPerUnit;

    const packagingCostPerUnit = product.packaging.reduce((sum, pkg) => {
      const ing = ingredientMap.get(pkg.ingredientId);
      if (!ing) return sum;
      const purchaseQty = convertRecipeQtyToPurchaseQty(
        pkg.quantityPerSalesUnit,
        pkg.unit,
        ing.purchaseUnit
      );
      return sum + purchaseQty * ing.pricePerUnit * matMult;
    }, 0);

    const masterHours = Math.max(0, product.masterMinutesPerBatch) / 60;
    const assistantHours = Math.max(0, product.assistantMinutesPerBatch) / 60;
    const batchLaborCost =
      (masterHours * state.settings.masterHourlyRate +
        assistantHours * state.settings.assistantHourlyRate) *
      labOvhMult;

    const directLaborCostPerUnit = batchLaborCost / safeYield;
    const laborHoursPerUnit = (masterHours + assistantHours) / safeYield;

    const sellingPrice = Math.max(0, product.sellingPrice) * priceMult;

    return {
      product,
      batchRawMaterialCost,
      batchAdjustedMaterialCost,
      rawMaterialCostPerUnit,
      wastageCostPerUnit,
      adjustedMaterialCostPerUnit,
      packagingCostPerUnit,
      directLaborCostPerUnit,
      laborHoursPerUnit,
      sellingPrice,
    };
  });

  const totalMonthlyVolume = preCalcs.reduce(
    (sum, p) => sum + Math.max(0, p.product.monthlyVolume) * volMult,
    0
  );

  const totalMonthlyLaborHours = preCalcs.reduce(
    (sum, p) =>
      sum + p.laborHoursPerUnit * Math.max(0, p.product.monthlyVolume) * volMult,
    0
  );

  const overheadPerUnitRate =
    totalMonthlyVolume > 0 ? totalMonthlyFixedOverhead / totalMonthlyVolume : 0;
  const overheadPerLaborHourRate =
    totalMonthlyLaborHours > 0
      ? totalMonthlyFixedOverhead / totalMonthlyLaborHours
      : 0;

  const rawBreakdowns: Omit<ProductCostBreakdown, 'quadrant'>[] = preCalcs.map(
    (p) => {
      const overheadCostPerUnit =
        state.settings.overheadAllocationMethod === 'laborHours' &&
        totalMonthlyLaborHours > 0
          ? p.laborHoursPerUnit * overheadPerLaborHourRate
          : overheadPerUnitRate;

      const variableCostPerUnit =
        p.adjustedMaterialCostPerUnit +
        p.packagingCostPerUnit +
        p.directLaborCostPerUnit;

      const totalUnitCost = variableCostPerUnit + overheadCostPerUnit;
      const unitProfit = p.sellingPrice - totalUnitCost;
      const contributionMarginPerUnit = p.sellingPrice - variableCostPerUnit;
      const profitMarginPercent =
        p.sellingPrice > 0 ? (unitProfit / p.sellingPrice) * 100 : 0;
      const suggestedPrice = calculateSuggestedPrice(
        totalUnitCost,
        p.product.targetMarginPercent
      );

      const vol = Math.max(0, p.product.monthlyVolume) * volMult;
      const monthlyRevenue = p.sellingPrice * vol;
      const monthlyTotalCost = totalUnitCost * vol;
      const monthlyMaterialCost = p.rawMaterialCostPerUnit * vol;
      const monthlyWastageCost = p.wastageCostPerUnit * vol;
      const monthlyPackagingCost = p.packagingCostPerUnit * vol;
      const monthlyLaborCost = p.directLaborCostPerUnit * vol;
      const monthlyOverheadCost = overheadCostPerUnit * vol;
      const monthlyProfit = unitProfit * vol;

      return {
        productId: p.product.id,
        productName: p.product.name,
        category: p.product.category,
        salesUnit: p.product.salesUnit,
        monthlyVolume: vol,
        sellingPrice: p.sellingPrice,
        batchRawMaterialCost: p.batchRawMaterialCost,
        batchAdjustedMaterialCost: p.batchAdjustedMaterialCost,
        rawMaterialCostPerUnit: p.rawMaterialCostPerUnit,
        wastageCostPerUnit: p.wastageCostPerUnit,
        adjustedMaterialCostPerUnit: p.adjustedMaterialCostPerUnit,
        packagingCostPerUnit: p.packagingCostPerUnit,
        directLaborCostPerUnit: p.directLaborCostPerUnit,
        laborHoursPerUnit: p.laborHoursPerUnit,
        overheadCostPerUnit,
        variableCostPerUnit,
        totalUnitCost,
        unitProfit,
        contributionMarginPerUnit,
        profitMarginPercent,
        suggestedPrice,
        monthlyRevenue,
        monthlyTotalCost,
        monthlyMaterialCost,
        monthlyWastageCost,
        monthlyPackagingCost,
        monthlyLaborCost,
        monthlyOverheadCost,
        monthlyProfit,
      };
    }
  );

  // Menu Engineering quadrant averages
  const count = rawBreakdowns.length;
  const avgVolume =
    count > 0
      ? rawBreakdowns.reduce((s, b) => s + b.monthlyVolume, 0) / count
      : 0;
  const avgMargin =
    count > 0
      ? rawBreakdowns.reduce((s, b) => s + b.profitMarginPercent, 0) / count
      : 0;

  const productBreakdowns: ProductCostBreakdown[] = rawBreakdowns.map((b) => {
    const highVol = b.monthlyVolume >= avgVolume;
    const highMargin = b.profitMarginPercent >= avgMargin;
    let quadrant: MenuQuadrant;
    if (highVol && highMargin) quadrant = 'star';
    else if (highVol && !highMargin) quadrant = 'plowhorse';
    else if (!highVol && highMargin) quadrant = 'puzzle';
    else quadrant = 'dog';

    return {
      ...b,
      quadrant,
    };
  });

  const totalMonthlyRevenue = productBreakdowns.reduce(
    (s, b) => s + b.monthlyRevenue,
    0
  );
  const totalMonthlyMaterialCost = productBreakdowns.reduce(
    (s, b) => s + b.monthlyMaterialCost,
    0
  );
  const totalMonthlyWastageCost = productBreakdowns.reduce(
    (s, b) => s + b.monthlyWastageCost,
    0
  );
  const totalMonthlyPackagingCost = productBreakdowns.reduce(
    (s, b) => s + b.monthlyPackagingCost,
    0
  );
  const totalMonthlyLaborCost = productBreakdowns.reduce(
    (s, b) => s + b.monthlyLaborCost,
    0
  );

  const totalMonthlyVariableCost =
    totalMonthlyMaterialCost +
    totalMonthlyWastageCost +
    totalMonthlyPackagingCost +
    totalMonthlyLaborCost;

  const totalMonthlyCost = totalMonthlyVariableCost + totalMonthlyFixedOverhead;
  const netMonthlyProfit = totalMonthlyRevenue - totalMonthlyCost;
  const netProfitMarginPercent =
    totalMonthlyRevenue > 0
      ? (netMonthlyProfit / totalMonthlyRevenue) * 100
      : 0;

  const totalContributionMargin = totalMonthlyRevenue - totalMonthlyVariableCost;
  const contributionMarginRatio =
    totalMonthlyRevenue > 0 ? totalContributionMargin / totalMonthlyRevenue : 0;

  const breakEvenRevenue =
    contributionMarginRatio > 0
      ? totalMonthlyFixedOverhead / contributionMarginRatio
      : Infinity;

  const avgContributionPerUnit =
    totalMonthlyVolume > 0 ? totalContributionMargin / totalMonthlyVolume : 0;

  const breakEvenVolume =
    avgContributionPerUnit > 0
      ? totalMonthlyFixedOverhead / avgContributionPerUnit
      : Infinity;

  const breakEvenProgressPercent =
    Number.isFinite(breakEvenRevenue) && breakEvenRevenue > 0
      ? (totalMonthlyRevenue / breakEvenRevenue) * 100
      : 0;

  const marginOfSafetyPercent =
    Number.isFinite(breakEvenRevenue) && totalMonthlyRevenue > 0
      ? ((totalMonthlyRevenue - breakEvenRevenue) / totalMonthlyRevenue) * 100
      : -100;

  const isAboveBreakEven =
    Number.isFinite(breakEvenRevenue) && totalMonthlyRevenue >= breakEvenRevenue;

  return {
    totalMonthlyRevenue,
    totalMonthlyCost,
    totalMonthlyVariableCost,
    totalMonthlyFixedOverhead,
    totalMonthlyMaterialCost,
    totalMonthlyWastageCost,
    totalMonthlyPackagingCost,
    totalMonthlyLaborCost,
    netMonthlyProfit,
    netProfitMarginPercent,
    totalMonthlyVolume,
    contributionMarginRatio,
    breakEvenRevenue,
    breakEvenVolume,
    breakEvenProgressPercent,
    marginOfSafetyPercent,
    isAboveBreakEven,
    productBreakdowns,
    avgVolume,
    avgMargin,
  };
}

/**
 * Applies a percentage price inflation/deflation to all ingredients in a category.
 * Returns a new Ingredient[] array without mutating the original.
 */
export function applyCategoryInflation(
  ingredients: Ingredient[],
  category: IngredientCategory | 'ALL',
  percentChange: number
): Ingredient[] {
  const factor = 1 + percentChange / 100;
  return ingredients.map((ing) => {
    if (category !== 'ALL' && ing.category !== category) {
      return ing;
    }
    const updatedPrice = Math.max(0, Math.round(ing.pricePerUnit * factor));
    return {
      ...ing,
      pricePerUnit: updatedPrice,
    };
  });
}

/**
 * Material Requirements Planning (MRP):
 * Aggregates gross monthly material & packaging quantities required across all products.
 * Scales recipe ingredients by 1 / (1 - wastageRate) so gross purchase quantities reconcile with adjusted material cost.
 */
export function calculateMaterialRequirements(
  state: WorkshopState
): MaterialRequirementRow[] {
  const ingredientMap = new Map<string, Ingredient>();
  for (const ing of state.ingredients) {
    ingredientMap.set(ing.id, ing);
  }

  const aggregated = new Map<string, number>();

  for (const product of state.products) {
    const vol = Math.max(0, product.monthlyVolume);
    if (vol === 0) continue;
    const safeYield = product.batchYield > 0 ? product.batchYield : 1;
    const batches = vol / safeYield;
    const clampedWasteRate =
      Math.min(Math.max(product.wastagePercent, 0), 90) / 100;
    const grossFactor = 1 / (1 - clampedWasteRate);

    for (const item of product.ingredients) {
      const ing = ingredientMap.get(item.ingredientId);
      if (!ing) continue;
      const purchaseQtyPerBatch = convertRecipeQtyToPurchaseQty(
        item.quantity,
        item.unit,
        ing.purchaseUnit
      );
      const grossQty = purchaseQtyPerBatch * batches * grossFactor;
      aggregated.set(ing.id, (aggregated.get(ing.id) ?? 0) + grossQty);
    }

    for (const pkg of product.packaging) {
      const ing = ingredientMap.get(pkg.ingredientId);
      if (!ing) continue;
      const purchaseQtyPerUnit = convertRecipeQtyToPurchaseQty(
        pkg.quantityPerSalesUnit,
        pkg.unit,
        ing.purchaseUnit
      );
      const totalPkgQty = purchaseQtyPerUnit * vol;
      aggregated.set(ing.id, (aggregated.get(ing.id) ?? 0) + totalPkgQty);
    }
  }

  const rows: MaterialRequirementRow[] = [];
  for (const [ingredientId, totalQuantityRequired] of aggregated.entries()) {
    const ing = ingredientMap.get(ingredientId);
    if (!ing || totalQuantityRequired <= 0) continue;
    rows.push({
      ingredientId: ing.id,
      name: ing.name,
      category: ing.category,
      purchaseUnit: ing.purchaseUnit,
      unitPrice: ing.pricePerUnit,
      totalQuantityRequired,
      totalBudget: totalQuantityRequired * ing.pricePerUnit,
    });
  }

  return rows.sort((a, b) => b.totalBudget - a.totalBudget);
}

/**
 * Runs a What-If inflation simulation comparing current workshop economics
 * against simulated material, labor/overhead, and selling price shocks.
 */
export function runInflationSimulation(
  state: WorkshopState,
  params: SimulationParams
): SimulationResult {
  const before = calculateWorkshopSummary(state);
  const after = calculateWorkshopSummary(state, {
    materialMultiplier: 1 + params.materialDeltaPercent / 100,
    laborOverheadMultiplier: 1 + params.laborOverheadDeltaPercent / 100,
    sellingPriceMultiplier: 1 + params.sellingPriceDeltaPercent / 100,
  });

  return {
    before,
    after,
    profitDelta: after.netMonthlyProfit - before.netMonthlyProfit,
    marginDelta: after.netProfitMarginPercent - before.netProfitMarginPercent,
    revenueDelta: after.totalMonthlyRevenue - before.totalMonthlyRevenue,
    costDelta: after.totalMonthlyCost - before.totalMonthlyCost,
  };
}

/**
 * Calculates how much more revenue, volume, and profit are needed to reach
 * a global monthly target revenue based on the workshop's current average profit margin.
 */
export function calculateTargetRevenueGap(
  summary: WorkshopSummary,
  targetMonthlyRevenue: number
): TargetRevenueGapAnalysis {
  const safeTarget = Math.max(0, targetMonthlyRevenue);
  const currentRevenue = Math.max(0, summary.totalMonthlyRevenue);
  const revenueGap = Math.max(0, safeTarget - currentRevenue);
  const surplusRevenue = Math.max(0, currentRevenue - safeTarget);
  const isGoalReached = safeTarget > 0 && currentRevenue >= safeTarget;
  const progressPercent =
    safeTarget > 0 ? (currentRevenue / safeTarget) * 100 : 0;

  const currentAverageMarginPercent = summary.netProfitMarginPercent;
  const marginRatio = currentAverageMarginPercent / 100;

  const projectedNetProfitAtTarget = safeTarget * marginRatio;
  const additionalProfitFromGap = revenueGap * marginRatio;

  const avgSellingPrice =
    summary.totalMonthlyVolume > 0
      ? currentRevenue / summary.totalMonthlyVolume
      : 0;
  const additionalUnitsNeeded =
    avgSellingPrice > 0 ? revenueGap / avgSellingPrice : 0;
  const additionalDailyRevenueNeeded = revenueGap / 30;

  const growthRatio =
    currentRevenue > 0 && revenueGap > 0 ? revenueGap / currentRevenue : 0;

  const productQuotas = summary.productBreakdowns.map((p) => ({
    productId: p.productId,
    productName: p.productName,
    salesUnit: p.salesUnit,
    extraVolumeNeeded: p.monthlyVolume * growthRatio,
    extraRevenueShare: p.monthlyRevenue * growthRatio,
  }));

  return {
    targetRevenue: safeTarget,
    currentRevenue,
    revenueGap,
    surplusRevenue,
    progressPercent,
    isGoalReached,
    currentAverageMarginPercent,
    projectedNetProfitAtTarget,
    additionalProfitFromGap,
    additionalUnitsNeeded,
    additionalDailyRevenueNeeded,
    productQuotas,
  };
}

/**
 * Cost-Volume-Profit (CVP) real-time simulator:
 * Evaluates how changing Total Production Volume impacts overhead absorption,
 * break-even coverage, margin of safety, and final monthly net profit.
 */
export function simulateMonthlyProfitabilityByVolume(
  summary: WorkshopSummary,
  simulatedTotalVolume: number
): VolumeSimulationResult {
  const safeSimVol = Math.max(0, simulatedTotalVolume);
  const currentVolume = Math.max(0, summary.totalMonthlyVolume);
  const volumeDelta = safeSimVol - currentVolume;
  const volumeChangePercent =
    currentVolume > 0 ? (volumeDelta / currentVolume) * 100 : 0;

  const avgPricePerUnit =
    currentVolume > 0 ? summary.totalMonthlyRevenue / currentVolume : 0;
  const avgVarCostPerUnit =
    currentVolume > 0 ? summary.totalMonthlyVariableCost / currentVolume : 0;

  const fixedOverhead = summary.totalMonthlyFixedOverhead;
  const simulatedRevenue = safeSimVol * avgPricePerUnit;
  const simulatedVariableCost = safeSimVol * avgVarCostPerUnit;
  const simulatedTotalCost = fixedOverhead + simulatedVariableCost;
  const simulatedNetProfit = simulatedRevenue - simulatedTotalCost;
  const profitDeltaFromCurrent = simulatedNetProfit - summary.netMonthlyProfit;
  const simulatedNetMarginPercent =
    simulatedRevenue > 0 ? (simulatedNetProfit / simulatedRevenue) * 100 : 0;
  const overheadPerUnitSimulated =
    safeSimVol > 0 ? fixedOverhead / safeSimVol : 0;

  const breakEvenVolume = summary.breakEvenVolume;
  const breakEvenRevenue = summary.breakEvenRevenue;

  const breakEvenCoveragePercent =
    Number.isFinite(breakEvenVolume) && breakEvenVolume > 0
      ? (safeSimVol / breakEvenVolume) * 100
      : 0;

  const unitsFromBreakEven = Number.isFinite(breakEvenVolume)
    ? safeSimVol - breakEvenVolume
    : -safeSimVol;

  const marginOfSafetyPercent =
    Number.isFinite(breakEvenRevenue) && simulatedRevenue > 0
      ? ((simulatedRevenue - breakEvenRevenue) / simulatedRevenue) * 100
      : -100;

  const isAboveBreakEven =
    Number.isFinite(breakEvenVolume) && safeSimVol >= breakEvenVolume;

  return {
    simulatedVolume: safeSimVol,
    currentVolume,
    volumeDelta,
    volumeChangePercent,
    simulatedRevenue,
    simulatedVariableCost,
    fixedOverhead,
    simulatedTotalCost,
    simulatedNetProfit,
    profitDeltaFromCurrent,
    simulatedNetMarginPercent,
    overheadPerUnitSimulated,
    breakEvenVolume,
    breakEvenRevenue,
    breakEvenCoveragePercent,
    unitsFromBreakEven,
    marginOfSafetyPercent,
    isAboveBreakEven,
  };
}

/**
 * Returns a new WorkshopState with every product's monthlyVolume scaled by volumeScalePercent (e.g. 50%..150%).
 */
export function scaleWorkshopProductionVolume(
  state: WorkshopState,
  volumeScalePercent: number
): WorkshopState {
  const factor = Math.max(0, volumeScalePercent) / 100;
  return {
    ...state,
    products: state.products.map((p) => ({
      ...p,
      monthlyVolume: Math.round(p.monthlyVolume * factor * 10) / 10,
    })),
  };
}

/**
 * Generates Break-Even chart curve data points from 0 to fixedMaxVolume (or 160% of capacity).
 */
export function generateBreakEvenSeries(
  summary: WorkshopSummary,
  fixedMaxVolume?: number
): Array<{
  volume: number;
  revenue: number;
  totalCost: number;
  fixedCost: number;
}> {
  const maxVol =
    fixedMaxVolume && fixedMaxVolume > 0
      ? fixedMaxVolume
      : Math.max(
          summary.totalMonthlyVolume * 1.4,
          Number.isFinite(summary.breakEvenVolume)
            ? summary.breakEvenVolume * 1.5
            : 100,
          100
        );
  const avgPricePerUnit =
    summary.totalMonthlyVolume > 0
      ? summary.totalMonthlyRevenue / summary.totalMonthlyVolume
      : 0;
  const avgVarCostPerUnit =
    summary.totalMonthlyVolume > 0
      ? summary.totalMonthlyVariableCost / summary.totalMonthlyVolume
      : 0;

  const steps = 10;
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const volume = Math.round((maxVol / steps) * i);
    points.push({
      volume,
      revenue: Math.round(volume * avgPricePerUnit),
      totalCost: Math.round(
        summary.totalMonthlyFixedOverhead + volume * avgVarCostPerUnit
      ),
      fixedCost: Math.round(summary.totalMonthlyFixedOverhead),
    });
  }
  return points;
}

/**
 * Builds Executive Summary health score (0-100) and deterministic Persian CMA insights.
 */
export function buildExecutiveReportAnalysis(
  summary: WorkshopSummary
): ExecutiveReportAnalysis {
  const products = summary.productBreakdowns;

  // 1. Margin Score (0-35)
  const marginScore = Math.max(
    0,
    Math.min(35, Math.round((summary.netProfitMarginPercent / 30) * 35))
  );

  // 2. Break-Even Safety Margin Score (0-25)
  const safetyScore = summary.isAboveBreakEven
    ? Math.max(
        5,
        Math.min(25, Math.round((summary.marginOfSafetyPercent / 40) * 25))
      )
    : Math.max(0, Math.round((summary.breakEvenProgressPercent / 100) * 10));

  // 3. Portfolio Balance Score (0-25)
  const atRiskProducts = products.filter((p) => p.profitMarginPercent < 15);
  const lossProducts = products.filter((p) => p.unitProfit < 0);
  const healthyRatio =
    products.length > 0
      ? (products.length - atRiskProducts.length) / products.length
      : 0;
  const portfolioScore = Math.max(
    0,
    Math.round(healthyRatio * 25) - lossProducts.length * 8
  );

  // 4. Wastage Efficiency Score (0-15)
  const totalRawPlusWaste =
    summary.totalMonthlyMaterialCost + summary.totalMonthlyWastageCost;
  const effectiveWasteRatio =
    totalRawPlusWaste > 0
      ? (summary.totalMonthlyWastageCost / totalRawPlusWaste) * 100
      : 0;
  const wasteScore = Math.max(
    0,
    Math.min(15, Math.round(15 - Math.max(0, effectiveWasteRatio - 6) * 1.2))
  );

  const healthScore = Math.max(
    0,
    Math.min(100, marginScore + safetyScore + portfolioScore + wasteScore)
  );

  let healthLabel = 'نیازمند اصلاح فوری';
  if (healthScore >= 80) healthLabel = 'عالی و پایدار';
  else if (healthScore >= 65) healthLabel = 'مطلوب و سودآور';
  else if (healthScore >= 45) healthLabel = 'متوسط — نیازمند بهینه‌سازی';

  const starProduct =
    [...products].sort(
      (a, b) => b.profitMarginPercent - a.profitMarginPercent
    )[0] ?? null;

  const topRevenueProduct =
    [...products].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)[0] ?? null;

  const insights: HealthInsight[] = [];

  if (starProduct) {
    insights.push({
      id: 'star',
      tone: 'positive',
      title: `محصول ستاره سودآوری: ${starProduct.productName}`,
      description: `این محصول با حاشیه سود خالص ${Math.round(starProduct.profitMarginPercent)}٪ بالاترین بازدهی را در سبد تولید کارگاه دارد و ظرفیت بالایی برای تمرکز فروش و سفارش‌های سازمانی ایجاد می‌کند.`,
    });
  }

  if (topRevenueProduct) {
    const revShare =
      summary.totalMonthlyRevenue > 0
        ? Math.round(
            (topRevenueProduct.monthlyRevenue / summary.totalMonthlyRevenue) *
              100
          )
        : 0;
    insights.push({
      id: 'revenue-driver',
      tone: 'info',
      title: `موتور اصلی درآمد کارگاه: ${topRevenueProduct.productName}`,
      description: `حدود ${revShare}٪ از کل فروش ماهانه کارگاه از طریق این محصول تأمین می‌شود؛ بنابراین هرگونه تغییر در قیمت مواد اولیه یا قیمت فروش آن بیشترین اثر را بر جریان نقدی ماهانه دارد.`,
    });
  }

  if (atRiskProducts.length > 0) {
    const names = atRiskProducts.map((p) => p.productName).join('، ');
    insights.push({
      id: 'at-risk',
      tone: lossProducts.length > 0 ? 'danger' : 'warning',
      title: `${atRiskProducts.length} محصول در ناحیه هشدار حاشیه سود (زیر ۱۵٪)`,
      description: `محصولات «${names}» به دلیل نسبت بالای بهای مواد اولیه یا افت پخت، حاشیه سود شکننده‌ای دارند و در برابر موج بعدی تورم آسیب‌پذیر هستند.`,
    });
  } else {
    insights.push({
      id: 'all-healthy',
      tone: 'positive',
      title: 'تمام محصولات بالای مرز ایمنی سودآوری هستند',
      description:
        'حاشیه سود تمام اقلام سبد تولید بالاتر از ۱۵٪ است و ساختار قیمت‌گذاری کارگاه در وضعیت سالمی قرار دارد.',
    });
  }

  const materialShare =
    summary.totalMonthlyCost > 0
      ? Math.round(
          ((summary.totalMonthlyMaterialCost + summary.totalMonthlyWastageCost) /
            summary.totalMonthlyCost) *
            100
        )
      : 0;

  insights.push({
    id: 'cost-structure',
    tone: 'info',
    title: `سهم مواد اولیه و پرت تولید: ${materialShare}٪ از بهای تمام‌شده`,
    description:
      summary.isAboveBreakEven
        ? `کارگاه هم‌اکنون با حاشیه ایمنی ${Math.round(summary.marginOfSafetyPercent)}٪ بالاتر از نقطه سربه‌سر ماهانه فعالیت می‌کند.`
        : 'فروش فعلی هنوز به نقطه سربه‌سر ماهانه نرسیده است؛ افزایش تیراژ تولید یا بازنگری قیمت فروش ضروری است.',
  });

  const actionSteps: string[] = [];
  for (const risk of atRiskProducts.slice(0, 2)) {
    const diffPercent =
      risk.sellingPrice > 0
        ? Math.ceil(
            ((risk.suggestedPrice - risk.sellingPrice) / risk.sellingPrice) * 100
          )
        : 15;
    if (diffPercent > 0) {
      actionSteps.push(
        `اصلاح قیمت فروش «${risk.productName}» حدود ${diffPercent}٪ یا کاهش افت پخت برای رسیدن به حاشیه سود هدف.`
      );
    }
  }
  const puzzles = products.filter((p) => p.quadrant === 'puzzle');
  if (puzzles.length > 0) {
    actionSteps.push(
      `افزایش تبلیغات و بسته‌بندی هدیه برای «${puzzles[0].productName}» (سود بالا اما تیراژ فروش پایین‌تر از میانگین).`
    );
  }
  actionSteps.push(
    'خرید عمده اقلام پرمصرف لیست خرید ماهانه (مانند کره، آرد نول و مغز پسته) در ابتدای ماه برای قفل کردن نرخ مواد اولیه.'
  );
  if (effectiveWasteRatio > 8) {
    actionSteps.push(
      'بازبینی دمای فر و استانداردسازی وزن‌کشی بچ‌ها برای کاهش پرت و افت پخت زیر ۸٪.'
    );
  }

  return {
    healthScore,
    healthLabel,
    starProduct,
    topRevenueProduct,
    atRiskProducts,
    insights,
    actionSteps,
  };
}

const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

function getNextPersianMonth(lastLabel: string): { id: string; label: string } {
  const parts = lastLabel.trim().split(/\s+/);
  const monthName = parts[0] ?? 'آبان';
  const yearNum = Number(
    (parts[1] ?? '1404').replace(/[۰-۹]/g, (d) =>
      String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    )
  );
  const safeYear = Number.isFinite(yearNum) && yearNum > 1300 ? yearNum : 1404;
  const idx = PERSIAN_MONTHS.indexOf(monthName);
  const nextIdx = idx === -1 ? 0 : (idx + 1) % 12;
  const nextYear = idx === 11 ? safeYear + 1 : safeYear;
  const persianYear = String(nextYear).replace(
    /\d/g,
    (d) => ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'][Number(d)]
  );
  const monthCode = String(nextIdx + 1).padStart(2, '0');
  return {
    id: `${nextYear}-${monthCode}`,
    label: `${PERSIAN_MONTHS[nextIdx]} ${persianYear}`,
  };
}

/**
 * Builds the rolling 6-month trend from stored localStorage records,
 * syncing the latest month live with the current workshop summary.
 */
export function buildEffectiveSixMonthTrend(
  history: MonthlyPerformanceRecord[],
  currentSummary: WorkshopSummary
): MonthlyPerformanceRecord[] {
  const sliced = history.slice(-6).map((item) => ({
    ...item,
    netProfit: item.totalRevenue - item.totalCost,
  }));

  if (sliced.length === 0) {
    return [
      {
        id: '1404-08',
        monthLabel: 'ماه جاری',
        totalRevenue: Math.round(currentSummary.totalMonthlyRevenue),
        totalCost: Math.round(currentSummary.totalMonthlyCost),
        netProfit: Math.round(currentSummary.netMonthlyProfit),
        isCurrentMonth: true,
      },
    ];
  }

  const lastIndex = sliced.length - 1;
  const lastRecord = sliced[lastIndex];
  if (lastRecord.isManualOverride) {
    sliced[lastIndex] = {
      ...lastRecord,
      netProfit: lastRecord.totalRevenue - lastRecord.totalCost,
      isCurrentMonth: true,
    };
  } else {
    sliced[lastIndex] = {
      ...lastRecord,
      totalRevenue: Math.round(currentSummary.totalMonthlyRevenue),
      totalCost: Math.round(currentSummary.totalMonthlyCost),
      netProfit: Math.round(currentSummary.netMonthlyProfit),
      isCurrentMonth: true,
    };
  }

  return sliced;
}

/**
 * Archives the current month performance snapshot and opens a new current month
 * in the rolling 6-month history stored in localStorage.
 */
export function appendMonthlySnapshot(
  history: MonthlyPerformanceRecord[],
  currentSummary: WorkshopSummary
): MonthlyPerformanceRecord[] {
  const synced = buildEffectiveSixMonthTrend(history, currentSummary);
  const archived = synced.map((rec) => ({ ...rec, isCurrentMonth: false }));
  const last = archived[archived.length - 1];
  const next = getNextPersianMonth(last?.monthLabel ?? 'آبان ۱۴۰۴');

  const nextList: MonthlyPerformanceRecord[] = [
    ...archived,
    {
      id: `${next.id}-${Date.now().toString().slice(-3)}`,
      monthLabel: next.label,
      totalRevenue: Math.round(currentSummary.totalMonthlyRevenue),
      totalCost: Math.round(currentSummary.totalMonthlyCost),
      netProfit: Math.round(currentSummary.netMonthlyProfit),
      isCurrentMonth: true,
    },
  ];

  return nextList.slice(-6);
}

const SEASONAL_WEIGHTS: Array<{
  seasonKey: SeasonalForecastItem['seasonKey'];
  seasonName: string;
  seasonNote: string;
  demandMultiplier: number;
}> = [
  {
    seasonKey: 'spring',
    seasonName: 'بهار',
    seasonNote: 'اوج تقاضای نوروز و اعیاد',
    demandMultiplier: 1.1,
  },
  {
    seasonKey: 'summer',
    seasonName: 'تابستان',
    seasonNote: 'کاهش ملایم تقاضای شیرینی خشک',
    demandMultiplier: 0.88,
  },
  {
    seasonKey: 'autumn',
    seasonName: 'پاییز',
    seasonNote: 'تقاضای متعادل و سفارش‌های سازمانی',
    demandMultiplier: 0.95,
  },
  {
    seasonKey: 'winter',
    seasonName: 'زمستان',
    seasonNote: 'اوج شب یلدا و خریدهای پایان سال',
    demandMultiplier: 1.07,
  },
];

/**
 * Computes Quarterly (3-month) and Annual (12-month) profit forecasts
 * plus normalized 4-season Iranian confectionery breakdown.
 * - mode='baseline': projects current monthly economics steadily (3x / 12x)
 * - mode='trend': applies conservative monthly profit growth rate derived from 6-month history
 */
export function calculateSeasonalAndAnnualForecast(
  summary: WorkshopSummary,
  history: MonthlyPerformanceRecord[],
  mode: 'baseline' | 'trend' = 'baseline'
): ProfitForecastSummary {
  const trendRecords = buildEffectiveSixMonthTrend(history, summary);

  // Compute average monthly revenue growth rate over the stored window, prudently clamped to [-4%, +4%]
  let rawMonthlyGrowth = 0;
  if (trendRecords.length >= 2) {
    const first = trendRecords[0];
    const last = trendRecords[trendRecords.length - 1];
    const periods = trendRecords.length - 1;
    if (first.totalRevenue > 0 && last.totalRevenue > 0) {
      rawMonthlyGrowth =
        (Math.pow(last.totalRevenue / first.totalRevenue, 1 / periods) - 1) *
        100;
    }
  }
  const monthlyTrendRatePercent = Math.max(
    -4,
    Math.min(4, Number(rawMonthlyGrowth.toFixed(2)))
  );

  const growthFactor =
    mode === 'trend' ? 1 + monthlyTrendRatePercent / 100 : 1;

  // Project month-by-month for 12 months (fixed overhead stays constant, revenue & variable cost scale)
  const baseRev = summary.totalMonthlyRevenue;
  const baseVar = summary.totalMonthlyVariableCost;
  const fixedOvh = summary.totalMonthlyFixedOverhead;

  let quarterlyRevenue = 0;
  let quarterlyCost = 0;
  let annualRevenue = 0;
  let annualCost = 0;

  for (let m = 1; m <= 12; m++) {
    const scale = mode === 'trend' ? Math.pow(growthFactor, m) : 1;
    const mRev = baseRev * scale;
    const mCost = fixedOvh + baseVar * scale;
    annualRevenue += mRev;
    annualCost += mCost;
    if (m <= 3) {
      quarterlyRevenue += mRev;
      quarterlyCost += mCost;
    }
  }

  const quarterlyProfit = quarterlyRevenue - quarterlyCost;
  const annualProfit = annualRevenue - annualCost;

  const quarterlyMarginPercent =
    quarterlyRevenue > 0 ? (quarterlyProfit / quarterlyRevenue) * 100 : 0;
  const annualMarginPercent =
    annualRevenue > 0 ? (annualProfit / annualRevenue) * 100 : 0;

  // Seasonal 4-quarter breakdown (weights sum to 4.0 so seasons sum exactly to annual forecast)
  const avgSeasonRev = annualRevenue / 4;
  const avgSeasonVar = (annualCost - fixedOvh * 12) / 4;
  const seasonFixed = fixedOvh * 3;

  const seasons: SeasonalForecastItem[] = SEASONAL_WEIGHTS.map((w) => {
    const projectedRevenue = avgSeasonRev * w.demandMultiplier;
    const projectedCost = seasonFixed + avgSeasonVar * w.demandMultiplier;
    const projectedProfit = projectedRevenue - projectedCost;
    return {
      ...w,
      projectedRevenue,
      projectedCost,
      projectedProfit,
    };
  });

  return {
    mode,
    monthlyTrendRatePercent,
    quarterlyRevenue,
    quarterlyCost,
    quarterlyProfit,
    quarterlyMarginPercent,
    annualRevenue,
    annualCost,
    annualProfit,
    annualMarginPercent,
    seasons,
  };
}

/**
 * Formulation Lab Final Price Simulator:
 * Lets the workshop owner test manual overhead % (relative to direct unit cost)
 * and target profit margin % before committing a new showcase selling price.
 */
export function simulateProductFinalPrice(
  breakdown: ProductCostBreakdown,
  params: FinalPriceSimulationParams
): FinalPriceSimulationResult {
  const directUnitCost = Math.max(0, breakdown.variableCostPerUnit);
  const baseOverheadPercent =
    directUnitCost > 0
      ? (breakdown.overheadCostPerUnit / directUnitCost) * 100
      : 0;

  const clampedOverheadPct = Math.min(
    150,
    Math.max(0, params.overheadPercentOfDirectCost)
  );
  const clampedTargetMargin = Math.min(
    80,
    Math.max(1, params.targetMarginPercent)
  );

  const simulatedOverheadPerUnit =
    directUnitCost * (clampedOverheadPct / 100);
  const simulatedTotalUnitCost = directUnitCost + simulatedOverheadPerUnit;
  const rawSuggestedPrice = calculateSuggestedPrice(
    simulatedTotalUnitCost,
    clampedTargetMargin
  );
  const roundedShowcasePrice =
    rawSuggestedPrice > 0 ? Math.ceil(rawSuggestedPrice / 1000) * 1000 : 0;

  const simulatedUnitProfit = roundedShowcasePrice - simulatedTotalUnitCost;
  const effectiveMarginPercent =
    roundedShowcasePrice > 0
      ? (simulatedUnitProfit / roundedShowcasePrice) * 100
      : 0;

  const priceDeltaFromCurrent = roundedShowcasePrice - breakdown.sellingPrice;
  const priceDeltaPercent =
    breakdown.sellingPrice > 0
      ? (priceDeltaFromCurrent / breakdown.sellingPrice) * 100
      : 0;

  const monthlyProfitDelta =
    simulatedUnitProfit * breakdown.monthlyVolume - breakdown.monthlyProfit;

  return {
    directUnitCost,
    baseOverheadPercent,
    simulatedOverheadPerUnit,
    simulatedTotalUnitCost,
    rawSuggestedPrice,
    roundedShowcasePrice,
    simulatedUnitProfit,
    effectiveMarginPercent,
    priceDeltaFromCurrent,
    priceDeltaPercent,
    monthlyProfitDelta,
  };
}

/**
 * Computes per-product cost share percentages (materials incl. shrinkage, packaging, labor, overhead)
 * and cost productivity index (revenue earned per 1 Toman of total cost) for Stacked Bar Chart analysis.
 */
export function calculateProductCostProductivity(
  breakdowns: ProductCostBreakdown[]
): ProductCostProductivityItem[] {
  return breakdowns.map((p) => {
    const materials = p.rawMaterialCostPerUnit + p.wastageCostPerUnit;
    const packaging = p.packagingCostPerUnit;
    const labor = p.directLaborCostPerUnit;
    const overhead = p.overheadCostPerUnit;
    const total = materials + packaging + labor + overhead;

    const materialsSharePercent = total > 0 ? (materials / total) * 100 : 0;
    const packagingSharePercent = total > 0 ? (packaging / total) * 100 : 0;
    const laborSharePercent = total > 0 ? (labor / total) * 100 : 0;
    const overheadSharePercent = total > 0 ? (overhead / total) * 100 : 0;

    const costToRevenuePercent =
      p.sellingPrice > 0 ? (total / p.sellingPrice) * 100 : 100;
    const revenuePerCostRatio = total > 0 ? p.sellingPrice / total : 0;

    const drivers = [
      { label: 'مواد اولیه', pct: materialsSharePercent },
      { label: 'بسته‌بندی', pct: packagingSharePercent },
      { label: 'دستمزد', pct: laborSharePercent },
      { label: 'سربار', pct: overheadSharePercent },
    ].sort((a, b) => b.pct - a.pct);

    const dominant = drivers[0];

    let productivityLabel: ProductCostProductivityItem['productivityLabel'] =
      'بهره‌وری پایین';
    let productivityTone: ProductCostProductivityItem['productivityTone'] =
      'danger';

    if (revenuePerCostRatio >= 1.45) {
      productivityLabel = 'بهره‌وری عالی';
      productivityTone = 'positive';
    } else if (revenuePerCostRatio >= 1.25) {
      productivityLabel = 'بهره‌وری مطلوب';
      productivityTone = 'positive';
    } else if (revenuePerCostRatio >= 1.15) {
      productivityLabel = 'بهره‌وری متوسط';
      productivityTone = 'warning';
    }

    return {
      productId: p.productId,
      productName: p.productName,
      materialsSharePercent,
      packagingSharePercent,
      laborSharePercent,
      overheadSharePercent,
      costToRevenuePercent,
      revenuePerCostRatio,
      dominantCostLabel: dominant.label,
      dominantCostPercent: dominant.pct,
      productivityLabel,
      productivityTone,
    };
  });
}

// Monthly seasonality multipliers by Persian month index (0 = Farvardin .. 11 = Esfand), averaging exactly 1.0
const PERSIAN_MONTH_SEASONALITY = [
  1.14, // فروردین (نوروز)
  1.08, // اردیبهشت
  1.02, // خرداد
  0.88, // تیر
  0.86, // مرداد
  0.92, // شهریور
  0.94, // مهر
  0.96, // آبان
  1.06, // آذر (یلدا)
  1.02, // دی
  1.0, // بهمن
  1.12, // اسفند (پیش‌خرید عید)
];

const QUARTER_PERSIAN_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: 'فصل اول',
  2: 'فصل دوم',
  3: 'فصل سوم',
  4: 'فصل چهارم',
};

/**
 * Projects future 12-month and 4-quarter financial outputs (Revenue, Cost, Net Profit, Cumulative Profit)
 * from current monthly workshop economics using user-controlled assumed monthly growth rate,
 * optional cost inflation rate, and optional Iranian confectionery seasonality.
 */
export function projectFutureFinancials(
  summary: WorkshopSummary,
  history: MonthlyPerformanceRecord[],
  params: FinancialForecastParams
): FinancialForecastProjection {
  const assumedMonthlyGrowthPercent = Math.min(
    25,
    Math.max(-15, params.monthlyGrowthRatePercent)
  );
  const assumedCostInflationPercent = Math.min(
    15,
    Math.max(0, params.monthlyCostInflationPercent)
  );

  // Compute historical monthly growth reference from stored 6-month trend
  const trendRecords = buildEffectiveSixMonthTrend(history, summary);
  let rawHistoricalGrowth = 0;
  if (trendRecords.length >= 2) {
    const first = trendRecords[0];
    const last = trendRecords[trendRecords.length - 1];
    const periods = trendRecords.length - 1;
    if (first.totalRevenue > 0 && last.totalRevenue > 0) {
      rawHistoricalGrowth =
        (Math.pow(last.totalRevenue / first.totalRevenue, 1 / periods) - 1) *
        100;
    }
  }
  const historicalTrendRatePercent = Math.max(
    -10,
    Math.min(15, Number(rawHistoricalGrowth.toFixed(1)))
  );

  const baseRev = Math.max(0, summary.totalMonthlyRevenue);
  const baseVar = Math.max(0, summary.totalMonthlyVariableCost);
  const baseFixed = Math.max(0, summary.totalMonthlyFixedOverhead);

  const growthFactor = 1 + assumedMonthlyGrowthPercent / 100;
  const costInflationFactor = 1 + assumedCostInflationPercent / 100;

  let cursorLabel =
    trendRecords[trendRecords.length - 1]?.monthLabel ?? 'آبان ۱۴۰۴';

  const monthlySeries: MonthlyForecastPoint[] = [];
  let runningCumulativeProfit = 0;

  for (let m = 1; m <= 12; m++) {
    const nextMonth = getNextPersianMonth(cursorLabel);
    cursorLabel = nextMonth.label;

    const monthNameOnly = nextMonth.label.split(/\s+/)[0] ?? '';
    const persianMonthIdx = PERSIAN_MONTHS.indexOf(monthNameOnly);
    const seasonMult =
      params.applySeasonality && persianMonthIdx >= 0
        ? PERSIAN_MONTH_SEASONALITY[persianMonthIdx]
        : 1;

    const volumeAndSalesScale = Math.pow(growthFactor, m) * seasonMult;
    const costScale = Math.pow(costInflationFactor, m);

    const projectedRevenue = baseRev * volumeAndSalesScale;
    const projectedVariableCost = baseVar * volumeAndSalesScale * costScale;
    const projectedFixedCost = baseFixed * costScale;
    const projectedCost = projectedVariableCost + projectedFixedCost;
    const projectedProfit = projectedRevenue - projectedCost;

    runningCumulativeProfit += projectedProfit;

    const profitMarginPercent =
      projectedRevenue > 0 ? (projectedProfit / projectedRevenue) * 100 : 0;

    const quarterIndex = Math.ceil(m / 3) as 1 | 2 | 3 | 4;

    monthlySeries.push({
      monthIndex: m,
      monthLabel: nextMonth.label,
      shortLabel: monthNameOnly || nextMonth.label,
      quarterIndex,
      projectedRevenue,
      projectedCost,
      projectedProfit,
      cumulativeProfit: runningCumulativeProfit,
      profitMarginPercent,
    });
  }

  const quarterlySeries: QuarterlyForecastPoint[] = ([1, 2, 3, 4] as const).map(
    (q) => {
      const slice = monthlySeries.filter((item) => item.quarterIndex === q);
      const projectedRevenue = slice.reduce(
        (sum, item) => sum + item.projectedRevenue,
        0
      );
      const projectedCost = slice.reduce(
        (sum, item) => sum + item.projectedCost,
        0
      );
      const projectedProfit = projectedRevenue - projectedCost;
      const cumulativeProfit =
        slice[slice.length - 1]?.cumulativeProfit ?? projectedProfit;
      const profitMarginPercent =
        projectedRevenue > 0 ? (projectedProfit / projectedRevenue) * 100 : 0;
      const firstShort = slice[0]?.shortLabel ?? '';
      const lastShort = slice[slice.length - 1]?.shortLabel ?? '';

      return {
        quarterIndex: q,
        quarterLabel: QUARTER_PERSIAN_NAMES[q],
        monthsRangeLabel:
          firstShort && lastShort ? `${firstShort} تا ${lastShort}` : '',
        projectedRevenue,
        projectedCost,
        projectedProfit,
        cumulativeProfit,
        profitMarginPercent,
      };
    }
  );

  const q1 = quarterlySeries[0];
  const quarterlyRevenue = q1.projectedRevenue;
  const quarterlyCost = q1.projectedCost;
  const quarterlyProfit = q1.projectedProfit;
  const quarterlyMarginPercent = q1.profitMarginPercent;

  const annualRevenue = monthlySeries.reduce(
    (sum, item) => sum + item.projectedRevenue,
    0
  );
  const annualCost = monthlySeries.reduce(
    (sum, item) => sum + item.projectedCost,
    0
  );
  const annualProfit = annualRevenue - annualCost;
  const annualMarginPercent =
    annualRevenue > 0 ? (annualProfit / annualRevenue) * 100 : 0;

  const baselineQuarterlyProfit = summary.netMonthlyProfit * 3;
  const baselineAnnualProfit = summary.netMonthlyProfit * 12;

  const quarterlyProfitDeltaPercent =
    Math.abs(baselineQuarterlyProfit) > 0
      ? ((quarterlyProfit - baselineQuarterlyProfit) /
          Math.abs(baselineQuarterlyProfit)) *
        100
      : 0;

  const annualProfitDeltaPercent =
    Math.abs(baselineAnnualProfit) > 0
      ? ((annualProfit - baselineAnnualProfit) /
          Math.abs(baselineAnnualProfit)) *
        100
      : 0;

  const lastMonth = monthlySeries[monthlySeries.length - 1];

  return {
    assumedMonthlyGrowthPercent,
    assumedCostInflationPercent,
    applySeasonality: params.applySeasonality,
    historicalTrendRatePercent,
    quarterlyRevenue,
    quarterlyCost,
    quarterlyProfit,
    quarterlyMarginPercent,
    quarterlyProfitDeltaPercent,
    annualRevenue,
    annualCost,
    annualProfit,
    annualMarginPercent,
    annualProfitDeltaPercent,
    averageMonthlyProfit: annualProfit / 12,
    month12Revenue: lastMonth?.projectedRevenue ?? 0,
    month12Profit: lastMonth?.projectedProfit ?? 0,
    monthlySeries,
    quarterlySeries,
  };
}

function buildProductBreakEvenPeriod(
  p: ProductCostBreakdown,
  horizon: ProductBreakEvenHorizon,
  label: string,
  monthsCount: 1 | 3 | 12
): ProductBreakEvenPeriodMetrics {
  const allocatedFixedOverhead = Math.max(0, p.monthlyOverheadCost) * monthsCount;
  const plannedVolume = Math.max(0, p.monthlyVolume) * monthsCount;
  const plannedRevenue = Math.max(0, p.monthlyRevenue) * monthsCount;
  const projectedProfit = p.monthlyProfit * monthsCount;
  const cm = p.contributionMarginPerUnit;

  const breakEvenVolume =
    cm > 0
      ? allocatedFixedOverhead / cm
      : allocatedFixedOverhead === 0
      ? 0
      : Infinity;

  const breakEvenRevenue = Number.isFinite(breakEvenVolume)
    ? breakEvenVolume * p.sellingPrice
    : Infinity;

  const coveragePercent =
    Number.isFinite(breakEvenVolume) && breakEvenVolume > 0
      ? (plannedVolume / breakEvenVolume) * 100
      : allocatedFixedOverhead === 0 && cm > 0
      ? 100
      : 0;

  const marginOfSafetyPercent =
    Number.isFinite(breakEvenRevenue) && plannedRevenue > 0
      ? ((plannedRevenue - breakEvenRevenue) / plannedRevenue) * 100
      : -100;

  const unitsDeltaFromBreakEven = Number.isFinite(breakEvenVolume)
    ? plannedVolume - breakEvenVolume
    : -plannedVolume;

  const daysToBreakEven =
    Number.isFinite(breakEvenVolume) && plannedVolume > 0
      ? (breakEvenVolume / plannedVolume) * (30 * monthsCount)
      : Infinity;

  const isAboveBreakEven =
    cm > 0 && Number.isFinite(breakEvenVolume) && plannedVolume >= breakEvenVolume;

  return {
    horizon,
    label,
    monthsCount,
    allocatedFixedOverhead,
    plannedVolume,
    plannedRevenue,
    projectedProfit,
    breakEvenVolume,
    breakEvenRevenue,
    coveragePercent,
    marginOfSafetyPercent,
    unitsDeltaFromBreakEven,
    daysToBreakEven,
    isAboveBreakEven,
  };
}

/**
 * Calculates Monthly (1m), Quarterly (3m), and Annual (12m) Break-Even metrics
 * for an individual product based on its unit contribution margin and allocated fixed overhead.
 */
export function calculateProductBreakEvenReport(
  p: ProductCostBreakdown
): ProductBreakEvenReport {
  const cmRatio =
    p.sellingPrice > 0
      ? (p.contributionMarginPerUnit / p.sellingPrice) * 100
      : 0;

  return {
    productId: p.productId,
    productName: p.productName,
    category: p.category,
    salesUnit: p.salesUnit,
    sellingPrice: p.sellingPrice,
    variableCostPerUnit: p.variableCostPerUnit,
    overheadCostPerUnit: p.overheadCostPerUnit,
    contributionMarginPerUnit: p.contributionMarginPerUnit,
    contributionMarginRatioPercent: cmRatio,
    monthlyVolume: p.monthlyVolume,
    hasPositiveContribution: p.contributionMarginPerUnit > 0,
    monthly: buildProductBreakEvenPeriod(p, 'monthly', 'ماهانه (۱ ماهه)', 1),
    quarterly: buildProductBreakEvenPeriod(p, 'quarterly', 'فصلی (۳ ماهه)', 3),
    annual: buildProductBreakEvenPeriod(p, 'annual', 'سالانه (۱۲ ماهه)', 12),
  };
}

/**
 * Computes Monthly, Quarterly, and Annual Break-Even reports for all products in the workshop.
 */
export function calculateAllProductsBreakEven(
  breakdowns: ProductCostBreakdown[]
): ProductBreakEvenReport[] {
  return breakdowns.map(calculateProductBreakEvenReport);
}

/**
 * Generates CVP curve points (Volume vs Revenue, Total Cost, Fixed Overhead, Profit)
 * for a single product over the chosen horizon (monthly / quarterly / annual).
 */
export function generateProductBreakEvenSeries(
  report: ProductBreakEvenReport,
  horizon: ProductBreakEvenHorizon
): ProductBreakEvenChartPoint[] {
  const period = report[horizon];
  const beVol = Number.isFinite(period.breakEvenVolume)
    ? period.breakEvenVolume
    : 0;
  const maxVol = Math.max(
    period.plannedVolume * 1.35,
    beVol * 1.45,
    10 * period.monthsCount
  );

  const steps = 10;
  const points: ProductBreakEvenChartPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const volume = Math.round(((maxVol / steps) * i) * 10) / 10;
    const revenue = Math.round(volume * report.sellingPrice);
    const totalCost = Math.round(
      period.allocatedFixedOverhead + volume * report.variableCostPerUnit
    );
    points.push({
      volume,
      revenue,
      totalCost,
      fixedOverhead: Math.round(period.allocatedFixedOverhead),
      profit: revenue - totalCost,
    });
  }
  return points;
}

/**
 * Builds the Dedicated Product Analysis payload for Formulation Lab:
 * combines Monthly / Quarterly / Annual break-even metrics with batch-level
 * production counts and daily pace derived from the product's own volume & batch yield.
 */
export function calculateDedicatedProductBreakEven(
  breakdown: ProductCostBreakdown,
  batchYield: number
): DedicatedProductBreakEvenAnalysis {
  const report = calculateProductBreakEvenReport(breakdown);
  const safeYield = batchYield > 0 ? batchYield : 1;
  const hasProductionVolume = breakdown.monthlyVolume > 0;

  const dailyPlannedVolume = breakdown.monthlyVolume / 30;
  const dailyBreakEvenVolume = Number.isFinite(report.monthly.breakEvenVolume)
    ? report.monthly.breakEvenVolume / 30
    : Infinity;

  const batchesPerMonth = report.monthly.plannedVolume / safeYield;
  const batchesPerQuarter = report.quarterly.plannedVolume / safeYield;
  const batchesPerYear = report.annual.plannedVolume / safeYield;

  const breakEvenBatchesMonthly = Number.isFinite(report.monthly.breakEvenVolume)
    ? report.monthly.breakEvenVolume / safeYield
    : Infinity;
  const breakEvenBatchesQuarterly = Number.isFinite(
    report.quarterly.breakEvenVolume
  )
    ? report.quarterly.breakEvenVolume / safeYield
    : Infinity;
  const breakEvenBatchesAnnual = Number.isFinite(report.annual.breakEvenVolume)
    ? report.annual.breakEvenVolume / safeYield
    : Infinity;

  return {
    report,
    batchYield: safeYield,
    hasProductionVolume,
    dailyPlannedVolume,
    dailyBreakEvenVolume,
    batchesPerMonth,
    batchesPerQuarter,
    batchesPerYear,
    breakEvenBatchesMonthly,
    breakEvenBatchesQuarterly,
    breakEvenBatchesAnnual,
  };
}

/**
 * Custom Event / Corporate Gift Box & Assorted Order Costing Studio:
 * Calculates exact box & total order cost, target-margin quote, bulk discount safe cap
 * (bargaining red-line where net profit hits zero), and order-specific gross MRP shopping list.
 */
export function calculateCustomOrderQuote(
  state: WorkshopState,
  summary: WorkshopSummary,
  spec: CustomOrderSpec
): CustomOrderQuoteResult {
  const safeBoxCount = Math.max(1, Math.round(spec.boxCount || 1));
  const extraPkg = Math.max(0, spec.extraPackagingCostPerBox || 0);
  const extraLabor = Math.max(0, spec.extraDecorLaborPerBox || 0);
  const clampedTargetMargin = Math.min(75, Math.max(5, spec.targetMarginPercent));
  const clampedDiscount = Math.min(60, Math.max(0, spec.discountPercent));

  const breakdownMap = new Map<string, ProductCostBreakdown>();
  for (const b of summary.productBreakdowns) {
    breakdownMap.set(b.productId, b);
  }

  const productMap = new Map<string, Product>();
  for (const p of state.products) {
    productMap.set(p.id, p);
  }

  const ingredientMap = new Map<string, Ingredient>();
  for (const ing of state.ingredients) {
    ingredientMap.set(ing.id, ing);
  }

  const items: CustomOrderItemQuote[] = [];
  let productsCostPerBox = 0;
  let showcaseValuePerBox = 0;

  // Aggregate order-specific MRP quantities per ingredient
  const aggregatedOrderMrp = new Map<string, number>();

  for (const item of spec.items) {
    const qtyPerBox = Math.max(0, item.quantityPerBox);
    const prod = productMap.get(item.productId);
    const breakdown = breakdownMap.get(item.productId);
    if (!prod || !breakdown) continue;

    const totalQtyForOrder = qtyPerBox * safeBoxCount;
    const costPerBox = breakdown.totalUnitCost * qtyPerBox;
    const itemShowcasePerBox = breakdown.sellingPrice * qtyPerBox;

    productsCostPerBox += costPerBox;
    showcaseValuePerBox += itemShowcasePerBox;

    items.push({
      id: item.id,
      productId: prod.id,
      productName: prod.name,
      salesUnit: prod.salesUnit,
      quantityPerBox: qtyPerBox,
      totalQuantityForOrder: totalQtyForOrder,
      unitCost: breakdown.totalUnitCost,
      unitShowcasePrice: breakdown.sellingPrice,
      costPerBox,
      showcaseValuePerBox: itemShowcasePerBox,
    });

    if (totalQtyForOrder > 0) {
      const safeYield = prod.batchYield > 0 ? prod.batchYield : 1;
      const batches = totalQtyForOrder / safeYield;
      const clampedWasteRate =
        Math.min(Math.max(prod.wastagePercent, 0), 90) / 100;
      const grossFactor = 1 / (1 - clampedWasteRate);

      for (const recIng of prod.ingredients) {
        const ing = ingredientMap.get(recIng.ingredientId);
        if (!ing) continue;
        const purchaseQtyPerBatch = convertRecipeQtyToPurchaseQty(
          recIng.quantity,
          recIng.unit,
          ing.purchaseUnit
        );
        const grossQty = purchaseQtyPerBatch * batches * grossFactor;
        aggregatedOrderMrp.set(
          ing.id,
          (aggregatedOrderMrp.get(ing.id) ?? 0) + grossQty
        );
      }
    }
  }

  const totalCostPerBox = productsCostPerBox + extraPkg + extraLabor;
  const rawBasePrice = calculateSuggestedPrice(
    totalCostPerBox,
    clampedTargetMargin
  );
  const basePricePerBoxBeforeDiscount =
    rawBasePrice > 0 ? Math.ceil(rawBasePrice / 1000) * 1000 : 0;

  const finalPricePerBox =
    basePricePerBoxBeforeDiscount * (1 - clampedDiscount / 100);
  const unitProfitPerBox = finalPricePerBox - totalCostPerBox;

  const totalOrderCost = totalCostPerBox * safeBoxCount;
  const totalOrderBeforeDiscount = basePricePerBoxBeforeDiscount * safeBoxCount;
  const totalOrderFinalRevenue = finalPricePerBox * safeBoxCount;
  const totalDiscountAmount = totalOrderBeforeDiscount - totalOrderFinalRevenue;
  const totalOrderNetProfit = totalOrderFinalRevenue - totalOrderCost;

  const effectiveMarginPercent =
    totalOrderFinalRevenue > 0
      ? (totalOrderNetProfit / totalOrderFinalRevenue) * 100
      : 0;

  const maxSafeDiscountPercent =
    basePricePerBoxBeforeDiscount > 0
      ? Math.max(
          0,
          ((basePricePerBoxBeforeDiscount - totalCostPerBox) /
            basePricePerBoxBeforeDiscount) *
            100
        )
      : 0;

  const isProfitable = unitProfitPerBox >= -0.01 && totalCostPerBox > 0;
  const isDiscountNearCap =
    maxSafeDiscountPercent > 0 &&
    clampedDiscount >= maxSafeDiscountPercent * 0.75;

  const orderMrpRows: MaterialRequirementRow[] = [];
  for (const [ingredientId, totalQuantityRequired] of aggregatedOrderMrp.entries()) {
    const ing = ingredientMap.get(ingredientId);
    if (!ing || totalQuantityRequired <= 0) continue;
    orderMrpRows.push({
      ingredientId: ing.id,
      name: ing.name,
      category: ing.category,
      purchaseUnit: ing.purchaseUnit,
      unitPrice: ing.pricePerUnit,
      totalQuantityRequired,
      totalBudget: totalQuantityRequired * ing.pricePerUnit,
    });
  }
  orderMrpRows.sort((a, b) => b.totalBudget - a.totalBudget);

  return {
    boxCount: safeBoxCount,
    items,
    productsCostPerBox,
    extraPackagingCostPerBox: extraPkg,
    extraDecorLaborPerBox: extraLabor,
    totalCostPerBox,
    showcaseValuePerBox,
    basePricePerBoxBeforeDiscount,
    finalPricePerBox,
    unitProfitPerBox,
    totalOrderCost,
    totalOrderBeforeDiscount,
    totalDiscountAmount,
    totalOrderFinalRevenue,
    totalOrderNetProfit,
    effectiveMarginPercent,
    maxSafeDiscountPercent,
    isProfitable,
    isDiscountNearCap,
    orderMrpRows,
  };
}

/**
 * Ingredient Price Shock & Tornado Sensitivity Radar:
 * Stress-tests every single ingredient individually under a +shockPercent price hike,
 * ranking raw materials by their exact monthly profit impact and identifying pastries
 * that fall below the 15% safety margin threshold.
 */
export function calculateIngredientSensitivityRanking(
  state: WorkshopState,
  summary: WorkshopSummary,
  shockPercent: number = 20
): IngredientShockImpact[] {
  const safeShock = Math.max(1, Math.min(200, shockPercent));
  const factor = 1 + safeShock / 100;

  const mrpRows = calculateMaterialRequirements(state);
  const mrpQtyMap = new Map<string, number>();
  for (const row of mrpRows) {
    mrpQtyMap.set(row.ingredientId, row.totalQuantityRequired);
  }

  const baseBreakdownMap = new Map<string, ProductCostBreakdown>();
  for (const b of summary.productBreakdowns) {
    baseBreakdownMap.set(b.productId, b);
  }

  const results: IngredientShockImpact[] = [];

  for (const ing of state.ingredients) {
    const monthlyGrossQuantity = mrpQtyMap.get(ing.id) ?? 0;
    if (monthlyGrossQuantity <= 0 || ing.pricePerUnit <= 0) continue;

    const shockedUnitPrice = ing.pricePerUnit * factor;
    const shockedState: WorkshopState = {
      ...state,
      ingredients: state.ingredients.map((item) =>
        item.id === ing.id ? { ...item, pricePerUnit: shockedUnitPrice } : item
      ),
    };
    const shockedSummary = calculateWorkshopSummary(shockedState);
    const monthlyProfitDrop = Math.max(
      0,
      summary.netMonthlyProfit - shockedSummary.netMonthlyProfit
    );

    if (monthlyProfitDrop <= 0.5) continue;

    const affectedProducts: AffectedProductShock[] = [];
    for (const shockedProd of shockedSummary.productBreakdowns) {
      const baseProd = baseBreakdownMap.get(shockedProd.productId);
      if (!baseProd) continue;
      const unitCostIncrease =
        shockedProd.totalUnitCost - baseProd.totalUnitCost;
      if (unitCostIncrease <= 0.5) continue;

      const prodMonthlyDrop = Math.max(
        0,
        baseProd.monthlyProfit - shockedProd.monthlyProfit
      );
      const minPriceIncreasePercent =
        baseProd.sellingPrice > 0
          ? (unitCostIncrease / baseProd.sellingPrice) * 100
          : 0;

      affectedProducts.push({
        productId: shockedProd.productId,
        productName: shockedProd.productName,
        currentMarginPercent: baseProd.profitMarginPercent,
        shockedMarginPercent: shockedProd.profitMarginPercent,
        unitCostIncrease,
        monthlyProfitDrop: prodMonthlyDrop,
        dropsBelowSafety: shockedProd.profitMarginPercent < 15,
        minPriceIncreasePercent,
      });
    }

    affectedProducts.sort((a, b) => b.monthlyProfitDrop - a.monthlyProfitDrop);

    const profitDropPercentOfTotal =
      Math.abs(summary.netMonthlyProfit) > 0
        ? (monthlyProfitDrop / Math.abs(summary.netMonthlyProfit)) * 100
        : 0;

    results.push({
      ingredientId: ing.id,
      ingredientName: ing.name,
      category: ing.category,
      purchaseUnit: ing.purchaseUnit,
      currentUnitPrice: ing.pricePerUnit,
      shockedUnitPrice,
      shockPercent: safeShock,
      monthlyGrossQuantity,
      monthlyProfitDrop,
      profitDropPercentOfTotal,
      affectedProductsCount: affectedProducts.length,
      productsDroppingBelowSafety: affectedProducts.filter(
        (p) => p.dropsBelowSafety
      ).length,
      affectedProducts,
    });
  }

  return results.sort((a, b) => b.monthlyProfitDrop - a.monthlyProfitDrop);
}

/**
 * Kitchen Batch Scaler & Daily Prep Sheet:
 * Scales a product's base recipe to any target daily output (in kg or units),
 * outputting exact net scale weights, gross prep weights (accounting for baking wastage),
 * packaging quantities, labor duration, and direct shift cost.
 */
export function scaleRecipeForProductionBatch(
  product: Product,
  ingredients: Ingredient[],
  settings: WorkshopSettings,
  targetOutputQty: number
): KitchenBatchSheet {
  const safeTarget = Math.max(0.5, targetOutputQty);
  const safeYield = product.batchYield > 0 ? product.batchYield : 1;
  const batchesRequired = safeTarget / safeYield;
  const clampedWasteRate =
    Math.min(Math.max(product.wastagePercent, 0), 90) / 100;
  const grossFactor = 1 / (1 - clampedWasteRate);

  const ingredientMap = new Map<string, Ingredient>();
  for (const ing of ingredients) {
    ingredientMap.set(ing.id, ing);
  }

  let estimatedRawMaterialCost = 0;
  const scaledIngredients: ScaledIngredientRow[] = [];

  for (const item of product.ingredients) {
    const ing = ingredientMap.get(item.ingredientId);
    if (!ing) continue;
    const scaledNetQuantity = item.quantity * batchesRequired;
    const scaledGrossQuantityWithWastage = scaledNetQuantity * grossFactor;
    const purchaseQtyNet = convertRecipeQtyToPurchaseQty(
      scaledNetQuantity,
      item.unit,
      ing.purchaseUnit
    );
    const estimatedCost = purchaseQtyNet * ing.pricePerUnit;
    estimatedRawMaterialCost += estimatedCost;

    scaledIngredients.push({
      ingredientId: ing.id,
      name: ing.name,
      category: ing.category,
      unit: item.unit,
      baseBatchQuantity: item.quantity,
      scaledNetQuantity,
      scaledGrossQuantityWithWastage,
      estimatedCost,
    });
  }

  const estimatedAdjustedMaterialCost = estimatedRawMaterialCost * grossFactor;

  let estimatedPackagingCost = 0;
  const scaledPackaging: ScaledPackagingRow[] = [];
  for (const pkg of product.packaging) {
    const ing = ingredientMap.get(pkg.ingredientId);
    if (!ing) continue;
    const scaledQuantity = pkg.quantityPerSalesUnit * safeTarget;
    const purchaseQty = convertRecipeQtyToPurchaseQty(
      scaledQuantity,
      pkg.unit,
      ing.purchaseUnit
    );
    const estimatedCost = purchaseQty * ing.pricePerUnit;
    estimatedPackagingCost += estimatedCost;

    scaledPackaging.push({
      ingredientId: ing.id,
      name: ing.name,
      unit: pkg.unit,
      scaledQuantity,
      estimatedCost,
    });
  }

  const masterMinutesTotal =
    Math.max(0, product.masterMinutesPerBatch) * batchesRequired;
  const assistantMinutesTotal =
    Math.max(0, product.assistantMinutesPerBatch) * batchesRequired;
  const totalPrepMinutes = masterMinutesTotal + assistantMinutesTotal;

  const estimatedLaborCost =
    (masterMinutesTotal / 60) * settings.masterHourlyRate +
    (assistantMinutesTotal / 60) * settings.assistantHourlyRate;

  const estimatedTotalDirectCost =
    estimatedAdjustedMaterialCost + estimatedPackagingCost + estimatedLaborCost;

  return {
    productId: product.id,
    productName: product.name,
    salesUnit: product.salesUnit,
    targetOutputQty: safeTarget,
    batchYield: safeYield,
    batchesRequired,
    wastagePercent: product.wastagePercent,
    masterMinutesTotal,
    assistantMinutesTotal,
    totalPrepMinutes,
    estimatedRawMaterialCost,
    estimatedAdjustedMaterialCost,
    estimatedPackagingCost,
    estimatedLaborCost,
    estimatedTotalDirectCost,
    ingredients: scaledIngredients,
    packaging: scaledPackaging,
  };
}




