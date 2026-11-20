import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendMonthlySnapshot,
  applyCategoryInflation,
  buildEffectiveSixMonthTrend,
  buildExecutiveReportAnalysis,
  calculateAdjustedMaterialCost,
  calculateAllProductsBreakEven,
  calculateCustomOrderQuote,
  calculateDedicatedProductBreakEven,
  calculateIngredientSensitivityRanking,
  calculateMaterialRequirements,
  calculateProductCostProductivity,
  calculateSeasonalAndAnnualForecast,
  calculateSuggestedPrice,
  calculateTargetRevenueGap,
  calculateWorkshopSummary,
  convertRecipeQtyToPurchaseQty,
  generateProductBreakEvenSeries,
  projectFutureFinancials,
  runInflationSimulation,
  scaleRecipeForProductionBatch,
  scaleWorkshopProductionVolume,
  simulateMonthlyProfitabilityByVolume,
  simulateProductFinalPrice,
} from './accounting';
import { SAMPLE_WORKSHOP_STATE } from '../data/sampleWorkshop';

test('convertRecipeQtyToPurchaseQty converts grams and ml accurately', () => {
  assert.equal(convertRecipeQtyToPurchaseQty(500, 'g', 'kg'), 0.5);
  assert.equal(convertRecipeQtyToPurchaseQty(250, 'ml', 'liter'), 0.25);
  assert.equal(convertRecipeQtyToPurchaseQty(2, 'kg', 'g'), 2000);
  assert.equal(convertRecipeQtyToPurchaseQty(12, 'unit', 'unit'), 12);
});

test('calculateAdjustedMaterialCost applies exact baking shrinkage formula', () => {
  // 100,000 / (1 - 0.10) = 111,111.111...
  const adjusted = calculateAdjustedMaterialCost(100_000, 10);
  assert.ok(Math.abs(adjusted - 100_000 / 0.9) < 1e-6);
  assert.equal(calculateAdjustedMaterialCost(100_000, 0), 100_000);
});

test('calculateSuggestedPrice applies exact target margin formula', () => {
  // 650,000 / (1 - 0.35) = 1,000,000
  const suggested = calculateSuggestedPrice(650_000, 35);
  assert.ok(Math.abs(suggested - 1_000_000) < 1e-6);
});

test('applyCategoryInflation updates only target category without mutating source', () => {
  const original = SAMPLE_WORKSHOP_STATE.ingredients;
  const pistachioBefore = original.find((i) => i.id === 'ing-pistachio')!.pricePerUnit;
  const flourBefore = original.find((i) => i.id === 'ing-flour')!.pricePerUnit;

  const updated = applyCategoryInflation(original, 'مغزیجات', 25);
  const pistachioAfter = updated.find((i) => i.id === 'ing-pistachio')!.pricePerUnit;
  const flourAfter = updated.find((i) => i.id === 'ing-flour')!.pricePerUnit;

  assert.equal(pistachioAfter, Math.round(pistachioBefore * 1.25));
  assert.equal(flourAfter, flourBefore);
  assert.equal(original.find((i) => i.id === 'ing-pistachio')!.pricePerUnit, pistachioBefore);
});

test('sample workshop reconciles product totals, overhead, and MRP budget accurately', () => {
  const summary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);
  assert.equal(summary.productBreakdowns.length, 5);
  assert.ok(summary.totalMonthlyRevenue > 0);
  assert.ok(summary.netMonthlyProfit > 0);
  assert.ok(summary.isAboveBreakEven, 'Sample workshop should operate profitably above break-even');

  // Verify sum of allocated product overheads equals total fixed overhead
  const allocatedOverheadSum = summary.productBreakdowns.reduce(
    (s, p) => s + p.monthlyOverheadCost,
    0
  );
  assert.ok(Math.abs(allocatedOverheadSum - summary.totalMonthlyFixedOverhead) < 1);

  // Verify MRP total purchasing budget equals total adjusted materials + packaging
  const mrpRows = calculateMaterialRequirements(SAMPLE_WORKSHOP_STATE);
  const mrpBudgetTotal = mrpRows.reduce((s, r) => s + r.totalBudget, 0);
  const expectedDirectPurchaseCost =
    summary.totalMonthlyMaterialCost +
    summary.totalMonthlyWastageCost +
    summary.totalMonthlyPackagingCost;
  assert.ok(
    Math.abs(mrpBudgetTotal - expectedDirectPurchaseCost) < 1,
    `MRP budget (${mrpBudgetTotal}) should reconcile with direct purchase cost (${expectedDirectPurchaseCost})`
  );

  // Verify labor-hour overhead allocation also reconciles exactly
  const laborAllocSummary = calculateWorkshopSummary({
    ...SAMPLE_WORKSHOP_STATE,
    settings: {
      ...SAMPLE_WORKSHOP_STATE.settings,
      overheadAllocationMethod: 'laborHours',
    },
  });
  const laborOvhSum = laborAllocSummary.productBreakdowns.reduce(
    (s, p) => s + p.monthlyOverheadCost,
    0
  );
  assert.ok(Math.abs(laborOvhSum - laborAllocSummary.totalMonthlyFixedOverhead) < 1);
});

test('sample dataset includes at least one alert product (<15% margin) and strong star product', () => {
  const summary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);
  const analysis = buildExecutiveReportAnalysis(summary);
  assert.ok(analysis.healthScore >= 40 && analysis.healthScore <= 100);
  assert.ok(analysis.atRiskProducts.length >= 1, 'Expected at least 1 product below 15% margin for alert demonstration');
  assert.ok(analysis.starProduct !== null && analysis.starProduct.profitMarginPercent > 25);
});

test('runInflationSimulation reduces profit on raw material shock and recovers on price hike', () => {
  const shockOnly = runInflationSimulation(SAMPLE_WORKSHOP_STATE, {
    materialDeltaPercent: 30,
    laborOverheadDeltaPercent: 20,
    sellingPriceDeltaPercent: 0,
  });
  assert.ok(shockOnly.profitDelta < 0);
  assert.ok(shockOnly.costDelta > 0);

  const shockWithPricePassThrough = runInflationSimulation(SAMPLE_WORKSHOP_STATE, {
    materialDeltaPercent: 30,
    laborOverheadDeltaPercent: 20,
    sellingPriceDeltaPercent: 35,
  });
  assert.ok(shockWithPricePassThrough.after.netMonthlyProfit > shockOnly.after.netMonthlyProfit);
});

test('calculateTargetRevenueGap computes exact revenue gap, extra units, and profit at current average margin', () => {
  const summary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);
  const target = summary.totalMonthlyRevenue + 100_000_000;
  const gapResult = calculateTargetRevenueGap(summary, target);

  assert.equal(gapResult.isGoalReached, false);
  assert.ok(Math.abs(gapResult.revenueGap - 100_000_000) < 1);
  assert.equal(gapResult.surplusRevenue, 0);
  assert.ok(gapResult.additionalUnitsNeeded > 0);
  assert.ok(
    Math.abs(
      gapResult.projectedNetProfitAtTarget -
        target * (summary.netProfitMarginPercent / 100)
    ) < 1
  );

  // Sum of product quota extra revenues equals total revenueGap
  const sumQuotaRev = gapResult.productQuotas.reduce(
    (s, q) => s + q.extraRevenueShare,
    0
  );
  assert.ok(Math.abs(sumQuotaRev - gapResult.revenueGap) < 1);

  // When goal is already met
  const metResult = calculateTargetRevenueGap(
    summary,
    summary.totalMonthlyRevenue - 50_000_000
  );
  assert.equal(metResult.isGoalReached, true);
  assert.equal(metResult.revenueGap, 0);
  assert.ok(Math.abs(metResult.surplusRevenue - 50_000_000) < 1);
});

test('simulateMonthlyProfitabilityByVolume reflects exact break-even crossing and operating leverage', () => {
  const summary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);

  // At current volume, simulated profit equals actual net profit
  const atCurrent = simulateMonthlyProfitabilityByVolume(
    summary,
    summary.totalMonthlyVolume
  );
  assert.ok(Math.abs(atCurrent.simulatedNetProfit - summary.netMonthlyProfit) < 1);
  assert.ok(Math.abs(atCurrent.profitDeltaFromCurrent) < 1);

  // At exact break-even volume, net profit is 0
  const atBreakEven = simulateMonthlyProfitabilityByVolume(
    summary,
    summary.breakEvenVolume
  );
  assert.ok(Math.abs(atBreakEven.simulatedNetProfit) < 1);
  assert.equal(atBreakEven.isAboveBreakEven, true);

  // Below break-even volume yields loss
  const belowBE = simulateMonthlyProfitabilityByVolume(
    summary,
    Math.floor(summary.breakEvenVolume * 0.5)
  );
  assert.ok(belowBE.simulatedNetProfit < 0);
  assert.equal(belowBE.isAboveBreakEven, false);

  // Doubling volume reduces overhead per unit by half and increases net margin
  const doubled = simulateMonthlyProfitabilityByVolume(
    summary,
    summary.totalMonthlyVolume * 2
  );
  assert.ok(doubled.simulatedNetMarginPercent > atCurrent.simulatedNetMarginPercent);
  assert.ok(
    Math.abs(doubled.overheadPerUnitSimulated * 2 - atCurrent.overheadPerUnitSimulated) < 1
  );
});

test('scaleWorkshopProductionVolume updates break-even coverage, margin of safety, and MRP from 50% to 150%', () => {
  const baseSummary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);
  const state50 = scaleWorkshopProductionVolume(SAMPLE_WORKSHOP_STATE, 50);
  const state150 = scaleWorkshopProductionVolume(SAMPLE_WORKSHOP_STATE, 150);

  const summary50 = calculateWorkshopSummary(state50);
  const summary150 = calculateWorkshopSummary(state150);

  assert.ok(Math.abs(summary50.totalMonthlyVolume - baseSummary.totalMonthlyVolume * 0.5) < 1);
  assert.ok(Math.abs(summary150.totalMonthlyVolume - baseSummary.totalMonthlyVolume * 1.5) < 1);

  // Higher capacity improves margin of safety and break-even progress
  assert.ok(summary150.marginOfSafetyPercent > baseSummary.marginOfSafetyPercent);
  assert.ok(summary50.marginOfSafetyPercent < baseSummary.marginOfSafetyPercent);
  assert.ok(summary150.breakEvenProgressPercent > summary50.breakEvenProgressPercent);

  // MRP budget scales linearly with volume
  const mrp50 = calculateMaterialRequirements(state50).reduce((s, r) => s + r.totalBudget, 0);
  const mrp150 = calculateMaterialRequirements(state150).reduce((s, r) => s + r.totalBudget, 0);
  assert.ok(Math.abs(mrp150 / mrp50 - 3) < 0.02);
});

test('6-month trend syncs latest month live and appendMonthlySnapshot preserves rolling 6-month window', () => {
  const summary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);
  const trend = buildEffectiveSixMonthTrend(
    SAMPLE_WORKSHOP_STATE.monthlyHistory,
    summary
  );
  assert.equal(trend.length, 6);
  assert.equal(trend[5].totalRevenue, Math.round(summary.totalMonthlyRevenue));
  assert.equal(trend[5].totalCost, Math.round(summary.totalMonthlyCost));

  const nextHistory = appendMonthlySnapshot(
    SAMPLE_WORKSHOP_STATE.monthlyHistory,
    summary
  );
  assert.equal(nextHistory.length, 6);
  assert.equal(nextHistory[5].monthLabel, 'آذر ۱۴۰۴');
  assert.equal(nextHistory[5].isCurrentMonth, true);
});

test('calculateSeasonalAndAnnualForecast computes exact baseline quarterly/annual profits and reconciles 4 seasons', () => {
  const summary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);
  const baseline = calculateSeasonalAndAnnualForecast(
    summary,
    SAMPLE_WORKSHOP_STATE.monthlyHistory,
    'baseline'
  );

  assert.ok(Math.abs(baseline.quarterlyProfit - summary.netMonthlyProfit * 3) < 1);
  assert.ok(Math.abs(baseline.annualProfit - summary.netMonthlyProfit * 12) < 1);

  // Sum of 4 seasonal profits reconciles exactly with annual profit
  const seasonalSum = baseline.seasons.reduce((s, item) => s + item.projectedProfit, 0);
  assert.ok(Math.abs(seasonalSum - baseline.annualProfit) < 1);

  // Trend mode with growing sample history yields higher annual profit than baseline
  const trendForecast = calculateSeasonalAndAnnualForecast(
    summary,
    SAMPLE_WORKSHOP_STATE.monthlyHistory,
    'trend'
  );
  assert.ok(trendForecast.monthlyTrendRatePercent > 0);
  assert.ok(trendForecast.annualProfit > baseline.annualProfit);
});

test('simulateProductFinalPrice reacts to manual overhead % and target margin % before saving', () => {
  const summary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);
  const prod = summary.productBreakdowns[0];

  const baseOvhPct =
    (prod.overheadCostPerUnit / prod.variableCostPerUnit) * 100;

  const atActual = simulateProductFinalPrice(prod, {
    overheadPercentOfDirectCost: baseOvhPct,
    targetMarginPercent: 35,
  });
  assert.ok(
    Math.abs(atActual.simulatedTotalUnitCost - prod.totalUnitCost) < 1
  );
  assert.equal(
    atActual.roundedShowcasePrice,
    Math.ceil(calculateSuggestedPrice(prod.totalUnitCost, 35) / 1000) * 1000
  );

  const higherOvhAndMargin = simulateProductFinalPrice(prod, {
    overheadPercentOfDirectCost: baseOvhPct + 20,
    targetMarginPercent: 45,
  });
  assert.ok(
    higherOvhAndMargin.simulatedOverheadPerUnit > atActual.simulatedOverheadPerUnit
  );
  assert.ok(
    higherOvhAndMargin.roundedShowcasePrice > atActual.roundedShowcasePrice
  );

  // Also verify manual override on latest month in buildEffectiveSixMonthTrend
  const overriddenHistory = SAMPLE_WORKSHOP_STATE.monthlyHistory.map((m, i, arr) =>
    i === arr.length - 1
      ? { ...m, totalRevenue: 500_000_000, totalCost: 300_000_000, isManualOverride: true }
      : m
  );
  const effective = buildEffectiveSixMonthTrend(overriddenHistory, summary);
  assert.equal(effective[5].totalRevenue, 500_000_000);
  assert.equal(effective[5].netProfit, 200_000_000);
});

test('calculateProductCostProductivity reconciles 100% cost shares and computes revenue-per-cost ratio', () => {
  const summary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);
  const items = calculateProductCostProductivity(summary.productBreakdowns);

  assert.equal(items.length, summary.productBreakdowns.length);
  for (const item of items) {
    const shareSum =
      item.materialsSharePercent +
      item.packagingSharePercent +
      item.laborSharePercent +
      item.overheadSharePercent;
    assert.ok(Math.abs(shareSum - 100) < 0.01);
    assert.ok(item.revenuePerCostRatio > 0);
  }

  // Higher-margin product should have a higher revenuePerCostRatio than the alert product
  const sorted = [...items].sort(
    (a, b) => b.revenuePerCostRatio - a.revenuePerCostRatio
  );
  assert.ok(sorted[0].revenuePerCostRatio > sorted[sorted.length - 1].revenuePerCostRatio);
  assert.equal(sorted[0].productivityTone, 'positive');
});

test('projectFutureFinancials forecasts quarterly and annual outputs from current monthly data and assumed growth rate', () => {
  const summary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);

  // 0% growth, 0% cost inflation, no seasonality -> exact 3x quarterly & 12x annual baseline
  const flat = projectFutureFinancials(
    summary,
    SAMPLE_WORKSHOP_STATE.monthlyHistory,
    {
      monthlyGrowthRatePercent: 0,
      monthlyCostInflationPercent: 0,
      applySeasonality: false,
    }
  );
  assert.equal(flat.monthlySeries.length, 12);
  assert.equal(flat.quarterlySeries.length, 4);
  assert.ok(Math.abs(flat.quarterlyRevenue - summary.totalMonthlyRevenue * 3) < 1);
  assert.ok(Math.abs(flat.annualProfit - summary.netMonthlyProfit * 12) < 1);
  assert.equal(flat.monthlySeries[0].monthLabel, 'آذر ۱۴۰۴');

  // +5% assumed monthly growth -> monotonic quarterly growth & operating leverage lifts annual margin
  const growing = projectFutureFinancials(
    summary,
    SAMPLE_WORKSHOP_STATE.monthlyHistory,
    {
      monthlyGrowthRatePercent: 5,
      monthlyCostInflationPercent: 0,
      applySeasonality: false,
    }
  );
  assert.ok(growing.quarterlyProfit > flat.quarterlyProfit);
  assert.ok(growing.annualProfit > flat.annualProfit);
  assert.ok(growing.annualMarginPercent > flat.annualMarginPercent);
  assert.ok(
    growing.quarterlySeries[3].projectedProfit >
      growing.quarterlySeries[0].projectedProfit
  );

  // Sum of 4 quarters reconciles exactly with annual forecast
  const qSum = growing.quarterlySeries.reduce(
    (s, q) => s + q.projectedProfit,
    0
  );
  assert.ok(Math.abs(qSum - growing.annualProfit) < 1);

  // Cost inflation compresses annual profit compared to zero inflation at same sales growth
  const inflated = projectFutureFinancials(
    summary,
    SAMPLE_WORKSHOP_STATE.monthlyHistory,
    {
      monthlyGrowthRatePercent: 5,
      monthlyCostInflationPercent: 3,
      applySeasonality: false,
    }
  );
  assert.ok(inflated.annualProfit < growing.annualProfit);
});

test('calculateAllProductsBreakEven computes exact monthly, quarterly (3x), and annual (12x) break-even metrics and handles negative CM', () => {
  const summary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);
  const reports = calculateAllProductsBreakEven(summary.productBreakdowns);

  assert.equal(reports.length, summary.productBreakdowns.length);

  for (const rep of reports) {
    assert.equal(rep.hasPositiveContribution, true);
    // Exact 3x quarterly and 12x annual scaling
    assert.ok(
      Math.abs(rep.quarterly.breakEvenVolume - rep.monthly.breakEvenVolume * 3) <
        0.001
    );
    assert.ok(
      Math.abs(rep.annual.breakEvenVolume - rep.monthly.breakEvenVolume * 12) <
        0.001
    );
    assert.ok(
      Math.abs(rep.quarterly.breakEvenRevenue - rep.monthly.breakEvenRevenue * 3) <
        1
    );
    assert.ok(
      Math.abs(rep.annual.breakEvenRevenue - rep.monthly.breakEvenRevenue * 12) <
        1
    );

    // Zero-profit identity at exact break-even volume
    const revAtBE = rep.monthly.breakEvenVolume * rep.sellingPrice;
    const costAtBE =
      rep.monthly.allocatedFixedOverhead +
      rep.monthly.breakEvenVolume * rep.variableCostPerUnit;
    assert.ok(Math.abs(revAtBE - costAtBE) < 1);

    // CVP series generation produces 11 points spanning 0..maxVol
    const annualSeries = generateProductBreakEvenSeries(rep, 'annual');
    assert.equal(annualSeries.length, 11);
    assert.equal(annualSeries[0].volume, 0);
    assert.equal(
      annualSeries[0].totalCost,
      Math.round(rep.annual.allocatedFixedOverhead)
    );
  }

  // Edge case: selling price below variable cost => negative CM, break-even volume is Infinity
  const lossBreakdown = {
    ...summary.productBreakdowns[0],
    sellingPrice: summary.productBreakdowns[0].variableCostPerUnit - 10_000,
    contributionMarginPerUnit: -10_000,
  };
  const lossReport = calculateAllProductsBreakEven([lossBreakdown])[0];
  assert.equal(lossReport.hasPositiveContribution, false);
  assert.equal(lossReport.monthly.isAboveBreakEven, false);
  assert.equal(lossReport.monthly.breakEvenVolume, Infinity);
  assert.equal(lossReport.annual.breakEvenRevenue, Infinity);
});

test('calculateDedicatedProductBreakEven computes batch-level monthly/quarterly/annual break-even and responds to product volume', () => {
  const summary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);
  const baklavaProd = SAMPLE_WORKSHOP_STATE.products[0];
  const baklavaBreakdown = summary.productBreakdowns[0];

  const base = calculateDedicatedProductBreakEven(
    baklavaBreakdown,
    baklavaProd.batchYield
  );
  assert.equal(base.hasProductionVolume, true);
  assert.ok(
    Math.abs(
      base.batchesPerMonth - baklavaProd.monthlyVolume / baklavaProd.batchYield
    ) < 0.001
  );
  assert.ok(
    Math.abs(
      base.breakEvenBatchesQuarterly - base.breakEvenBatchesMonthly * 3
    ) < 0.001
  );
  assert.ok(
    Math.abs(base.breakEvenBatchesAnnual - base.breakEvenBatchesMonthly * 12) <
      0.001
  );

  // Increasing this product's production volume improves its break-even coverage & days-to-break-even via operating leverage
  const higherVolState = {
    ...SAMPLE_WORKSHOP_STATE,
    products: SAMPLE_WORKSHOP_STATE.products.map((p, idx) =>
      idx === 0 ? { ...p, monthlyVolume: p.monthlyVolume * 2 } : p
    ),
  };
  const higherSummary = calculateWorkshopSummary(higherVolState);
  const higherAnalysis = calculateDedicatedProductBreakEven(
    higherSummary.productBreakdowns[0],
    baklavaProd.batchYield
  );
  assert.ok(
    higherAnalysis.report.monthly.coveragePercent >
      base.report.monthly.coveragePercent
  );
  assert.ok(
    higherAnalysis.report.monthly.daysToBreakEven <
      base.report.monthly.daysToBreakEven
  );

  // Zero-volume edge case
  const zeroVolAnalysis = calculateDedicatedProductBreakEven(
    { ...baklavaBreakdown, monthlyVolume: 0, monthlyOverheadCost: 0 },
    baklavaProd.batchYield
  );
  assert.equal(zeroVolAnalysis.hasProductionVolume, false);
  assert.equal(zeroVolAnalysis.batchesPerMonth, 0);
});

test('calculateCustomOrderQuote computes assorted gift box cost, bargaining discount red-line, and order MRP', () => {
  const summary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);
  const p0 = SAMPLE_WORKSHOP_STATE.products[0];
  const p1 = SAMPLE_WORKSHOP_STATE.products[1];

  const quote = calculateCustomOrderQuote(SAMPLE_WORKSHOP_STATE, summary, {
    orderTitle: 'پکیج نوروزی VIP',
    customerName: 'شرکت نمونه',
    deliveryDate: '۱۴۰۴/۱۲/۲۵',
    boxCount: 40,
    items: [
      { id: 'i1', productId: p0.id, quantityPerBox: 0.5 },
      { id: 'i2', productId: p1.id, quantityPerBox: 0.5 },
    ],
    extraPackagingCostPerBox: 45_000,
    extraDecorLaborPerBox: 15_000,
    targetMarginPercent: 30,
    discountPercent: 10,
  });

  const expectedProductsCost =
    summary.productBreakdowns[0].totalUnitCost * 0.5 +
    summary.productBreakdowns[1].totalUnitCost * 0.5;
  assert.ok(
    Math.abs(quote.totalCostPerBox - (expectedProductsCost + 60_000)) < 0.01
  );
  assert.equal(quote.isProfitable, true);
  assert.ok(quote.totalOrderNetProfit > 0);
  assert.ok(quote.orderMrpRows.length > 0);

  // Mathematical identity: applying exact maxSafeDiscountPercent yields ~0 net profit (break-even bargaining cap)
  const breakEvenQuote = calculateCustomOrderQuote(
    SAMPLE_WORKSHOP_STATE,
    summary,
    {
      orderTitle: 'تست سقف چانه‌زنی',
      customerName: 'مشتری',
      deliveryDate: '۱۴۰۴/۱۲/۲۵',
      boxCount: 40,
      items: [
        { id: 'i1', productId: p0.id, quantityPerBox: 0.5 },
        { id: 'i2', productId: p1.id, quantityPerBox: 0.5 },
      ],
      extraPackagingCostPerBox: 45_000,
      extraDecorLaborPerBox: 15_000,
      targetMarginPercent: 30,
      discountPercent: quote.maxSafeDiscountPercent,
    }
  );
  assert.ok(Math.abs(breakEvenQuote.unitProfitPerBox) < 1);
});

test('calculateIngredientSensitivityRanking ranks raw materials by exact monthly profit impact under price shock', () => {
  const summary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);
  const ranking = calculateIngredientSensitivityRanking(
    SAMPLE_WORKSHOP_STATE,
    summary,
    20
  );

  assert.ok(ranking.length >= 5);
  // Descending order check
  for (let i = 1; i < ranking.length; i++) {
    assert.ok(ranking[i - 1].monthlyProfitDrop >= ranking[i].monthlyProfitDrop);
  }

  // Top ingredient shock reconciles with MRP gross budget * shock%
  const top = ranking[0];
  const expectedDrop = top.monthlyGrossQuantity * top.currentUnitPrice * 0.2;
  assert.ok(Math.abs(top.monthlyProfitDrop - expectedDrop) < 5);
  assert.ok(top.affectedProducts.length >= 1);
});

test('scaleRecipeForProductionBatch scales net/gross weights, labor duration, and direct shift cost accurately', () => {
  const product = SAMPLE_WORKSHOP_STATE.products[0];
  const targetQty = product.batchYield * 2.5;
  const sheet = scaleRecipeForProductionBatch(
    product,
    SAMPLE_WORKSHOP_STATE.ingredients,
    SAMPLE_WORKSHOP_STATE.settings,
    targetQty
  );

  assert.ok(Math.abs(sheet.batchesRequired - 2.5) < 0.0001);
  assert.equal(sheet.ingredients.length, product.ingredients.length);
  assert.ok(
    Math.abs(
      sheet.ingredients[0].scaledNetQuantity -
        product.ingredients[0].quantity * 2.5
    ) < 0.001
  );
  const expectedGrossFactor = 1 / (1 - product.wastagePercent / 100);
  assert.ok(
    Math.abs(
      sheet.ingredients[0].scaledGrossQuantityWithWastage -
        sheet.ingredients[0].scaledNetQuantity * expectedGrossFactor
    ) < 0.001
  );
  assert.equal(
    sheet.masterMinutesTotal,
    product.masterMinutesPerBatch * 2.5
  );
});




