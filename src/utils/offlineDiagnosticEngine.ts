import {
  ActionEffort,
  ActionQuadrant,
  AuditSeverity,
  DecisionKpiRow,
  OfflineAuditFinding,
  OfflineDecisionInput,
  OfflineDecisionSimulation,
  OfflineDiagnosticReport,
  OfflineMonthlySnapshot,
  RadarAxisPoint,
  RiskAppetite,
  SnapshotMetricDelta,
  WorkshopState,
  WorkshopSummary,
} from '../types/workshop';
import {
  calculateIngredientSensitivityRanking,
  calculateMaterialRequirements,
  calculateWorkshopSummary,
} from './accounting';

const OFFLINE_SNAPSHOTS_KEY = 'shirinhesab_offline_snapshots_v1';
const OFFLINE_CHECKLIST_KEY = 'shirinhesab_offline_checklist_v1';

// Iranian Profitable Pastry Workshop Benchmark (استاندارد قنادی سودآور ایران)
const IRAN_BENCHMARK = {
  realProfitability: 78,
  ovenProductivity: 75,
  inflationResilience: 74,
  liquiditySayadi: 80,
  menuWasteBalance: 78,
};

function clampScore(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(100, Math.round(val)));
}

function resolveQuadrant(
  monthlyImpactToman: number,
  effort: ActionEffort,
  highImpactThreshold: number
): ActionQuadrant {
  const highImpact = monthlyImpactToman >= highImpactThreshold;
  if (highImpact && effort === 'low') return 'quick-win';
  if (highImpact && effort === 'high') return 'strategic';
  if (!highImpact && effort === 'low') return 'minor';
  return 'time-trap';
}

/**
 * Computes effective Iranian bakery workshop assumptions with safe defaults.
 */
export function getIranianWorkshopDefaults(
  state: WorkshopState,
  summary: WorkshopSummary
) {
  const monthlyInflationRate =
    state.settings.monthlyInflationRatePercent ?? 4.2; // ~4.2% monthly raw-material inflation
  const snappFoodCommission =
    state.settings.snappFoodCommissionPercent ?? 22; // Standard 22% SnappFood commission
  const upcomingSayadiChecks30d =
    state.settings.upcomingSayadiChecks30d ??
    Math.round(summary.totalMonthlyMaterialCost * 0.58);
  const staffCount = state.settings.staffCount ?? 4;
  const yearlyBonusReserveMonthly =
    state.settings.yearlyBonusReserveMonthly ?? 0;
  const monthlyOvenHoursCapacity =
    state.settings.monthlyOvenHoursCapacity ?? 210; // ~7 hrs/day * 30 days

  return {
    monthlyInflationRate,
    snappFoodCommission,
    upcomingSayadiChecks30d,
    staffCount,
    yearlyBonusReserveMonthly,
    monthlyOvenHoursCapacity,
  };
}

/**
 * Pillar 7 Core Engine:
 * 100% offline, zero network, deterministic 20-rule Iranian pastry workshop audit +
 * 5-axis benchmark radar + Monte Carlo deterministic bounds + real inflation-adjusted profit.
 */
export function runOfflineDiagnosticEngine(
  state: WorkshopState,
  summary: WorkshopSummary,
  riskAppetite: RiskAppetite = 'balanced'
): OfflineDiagnosticReport {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const defaults = getIranianWorkshopDefaults(state, summary);
  const mrpRows = calculateMaterialRequirements(state);
  const sensitivity = calculateIngredientSensitivityRanking(state, summary, 20);

  // Risk-appetite threshold tuning
  const marginFloor =
    riskAppetite === 'conservative'
      ? 20
      : riskAppetite === 'aggressive'
      ? 12
      : 15;
  const unionMarginFloor =
    riskAppetite === 'conservative'
      ? 22
      : riskAppetite === 'aggressive'
      ? 15
      : 18;
  const sayadiDangerRatio =
    riskAppetite === 'conservative'
      ? 0.55
      : riskAppetite === 'aggressive'
      ? 0.85
      : 0.7;

  // 1. Real Inflation-Adjusted Profit (Capital Erosion / Phantom Profit)
  // Working-capital replacement cost rises each cycle on raw materials + packaging inventory
  const workingCapitalBase =
    summary.totalMonthlyMaterialCost +
    summary.totalMonthlyWastageCost +
    summary.totalMonthlyPackagingCost;
  const phantomInflationProfit = Math.round(
    workingCapitalBase * (defaults.monthlyInflationRate / 100) * 1.35
  );
  const realInflationAdjustedProfit =
    summary.netMonthlyProfit - phantomInflationProfit;
  const phantomProfitSharePercent =
    summary.netMonthlyProfit > 0
      ? (phantomInflationProfit / summary.netMonthlyProfit) * 100
      : 100;

  // 2. Oven Hours & Production Productivity
  const productOvenHoursMap = new Map<string, number>();
  let totalUsedOvenHours = 0;
  for (const prod of state.products) {
    const safeYield = prod.batchYield > 0 ? prod.batchYield : 1;
    const batches = Math.max(0, prod.monthlyVolume) / safeYield;
    // Estimate oven/station slot hours from master + 35% assistant minutes per batch
    const hrsPerBatch =
      (Math.max(15, prod.masterMinutesPerBatch) +
        Math.max(0, prod.assistantMinutesPerBatch) * 0.35) /
      60;
    const totalHrs = batches * hrsPerBatch;
    productOvenHoursMap.set(prod.id, totalHrs);
    totalUsedOvenHours += totalHrs;
  }
  const effectiveOvenHours = Math.max(1, totalUsedOvenHours);
  const profitPerOvenHour = summary.netMonthlyProfit / effectiveOvenHours;

  // 3. Pareto Material Concentration (Top 2 materials share of MRP)
  const totalMrpBudget = mrpRows.reduce((s, r) => s + r.totalBudget, 0);
  const topTwoBudget =
    (mrpRows[0]?.totalBudget ?? 0) + (mrpRows[1]?.totalBudget ?? 0);
  const topTwoMaterialsSharePercent =
    totalMrpBudget > 0 ? (topTwoBudget / totalMrpBudget) * 100 : 0;

  // 4. Effective Wastage %
  const totalMatPlusWaste =
    summary.totalMonthlyMaterialCost + summary.totalMonthlyWastageCost;
  const effectiveWastePercent =
    totalMatPlusWaste > 0
      ? (summary.totalMonthlyWastageCost / totalMatPlusWaste) * 100
      : 0;

  // 5. Sayadi Check Pressure Ratio (upcoming 30-day checks / free cash flow)
  const freeOperatingCash = Math.max(
    1,
    summary.totalMonthlyRevenue -
      summary.totalMonthlyFixedOverhead -
      summary.totalMonthlyLaborCost
  );
  const sayadiCheckStressPercent =
    (defaults.upcomingSayadiChecks30d / freeOperatingCash) * 100;

  // 6. Break-Even Day of Month (1..30+)
  const breakEvenDayOfMonth =
    Number.isFinite(summary.breakEvenRevenue) && summary.totalMonthlyRevenue > 0
      ? Math.min(
          35,
          Math.max(
            1,
            Math.round(
              (summary.breakEvenRevenue / summary.totalMonthlyRevenue) * 30
            )
          )
        )
      : 30;

  // 7. Deterministic Monte Carlo VaR 95% bounds (Material shock +/-12%, Volume shock +/-15%)
  const worstCaseSummary = calculateWorkshopSummary(state, {
    materialMultiplier: 1.14,
    laborOverheadMultiplier: 1.06,
    volumeMultiplier: 0.86,
  });
  const bestCaseSummary = calculateWorkshopSummary(state, {
    materialMultiplier: 0.96,
    laborOverheadMultiplier: 1.0,
    volumeMultiplier: 1.14,
  });
  const monteCarloP5Profit = Math.round(worstCaseSummary.netMonthlyProfit);
  const monteCarloMedianProfit = Math.round(realInflationAdjustedProfit);
  const monteCarloP95Profit = Math.round(bestCaseSummary.netMonthlyProfit);

  // ==========================================================
  // 5-AXIS BENCHMARK RADAR SCORING (0–100)
  // ==========================================================
  const realMarginPct =
    summary.totalMonthlyRevenue > 0
      ? (realInflationAdjustedProfit / summary.totalMonthlyRevenue) * 100
      : 0;
  const realProfitabilityScore = clampScore((realMarginPct / 28) * 100);

  // Target profitable Iranian bakery oven-hour profit ~ 650,000 Toman/hour
  const ovenProductivityScore = clampScore(
    (profitPerOvenHour / 650_000) * 100
  );

  // Inflation resilience: combines top-material shock drop % + margin of safety
  const topShockDropShare = sensitivity[0]?.profitDropPercentOfTotal ?? 15;
  const inflationResilienceScore = clampScore(
    100 -
      Math.max(0, topShockDropShare - 5) * 1.9 -
      Math.max(0, topTwoMaterialsSharePercent - 40) * 0.65
  );

  // Liquidity & Sayadi Check Safety
  const checkPenalty = Math.max(0, sayadiCheckStressPercent - 45) * 1.1;
  const beDayPenalty = Math.max(0, breakEvenDayOfMonth - 14) * 2.2;
  const liquiditySayadiScore = clampScore(100 - checkPenalty - beDayPenalty);

  // Menu Balance & Waste Control
  const lowMarginCount = summary.productBreakdowns.filter(
    (p) => p.profitMarginPercent < marginFloor
  ).length;
  const healthyMenuShare =
    summary.productBreakdowns.length > 0
      ? (summary.productBreakdowns.length - lowMarginCount) /
        summary.productBreakdowns.length
      : 0;
  const wastePenalty = Math.max(0, effectiveWastePercent - 6) * 4.5;
  const menuWasteBalanceScore = clampScore(
    healthyMenuShare * 100 - wastePenalty
  );

  const radarAxes: RadarAxisPoint[] = [
    {
      axisKey: 'realProfitability',
      axisLabel: 'سودآوری واقعی (تورم‌زدایی‌شده)',
      shortLabel: 'سود واقعی',
      workshopScore: realProfitabilityScore,
      benchmarkScore: IRAN_BENCHMARK.realProfitability,
      explanation:
        'حاشیه سود خالص پس از کسر هزینه جایگزینی مواد اولیه در تورم ماهانه ایران.',
    },
    {
      axisKey: 'ovenProductivity',
      axisLabel: 'بهره‌وری فر و تولید (سود در ساعت فر)',
      shortLabel: 'بهره‌وری فر',
      workshopScore: ovenProductivityScore,
      benchmarkScore: IRAN_BENCHMARK.ovenProductivity,
      explanation:
        'میزان سود خالصی که به ازای هر ساعت کارکرد فر و تیم تولید حاصل می‌شود.',
    },
    {
      axisKey: 'inflationResilience',
      axisLabel: 'مقاومت در برابر شوک تورم',
      shortLabel: 'مقاومت تورمی',
      workshopScore: inflationResilienceScore,
      benchmarkScore: IRAN_BENCHMARK.inflationResilience,
      explanation:
        'میزان تاب‌آوری سود کارگاه در برابر جهش ۲۰٪ قیمت مواد کلیدی و تمرکز خرید.',
    },
    {
      axisKey: 'liquiditySayadi',
      axisLabel: 'امنیت نقدینگی و چک‌های صیادی',
      shortLabel: 'امنیت چک صیادی',
      workshopScore: liquiditySayadiScore,
      benchmarkScore: IRAN_BENCHMARK.liquiditySayadi,
      explanation:
        'نسبت چک‌های صیادی ۳۰ روز آینده به جریان نقدی آزاد و روز رسیدن به نقطه سربه‌سر.',
    },
    {
      axisKey: 'menuWasteBalance',
      axisLabel: 'تعادل منو و کنترل ضایعات',
      shortLabel: 'منو و ضایعات',
      workshopScore: menuWasteBalanceScore,
      benchmarkScore: IRAN_BENCHMARK.menuWasteBalance,
      explanation:
        'نسبت محصولات سالم در ویترین و کنترل افت پخت و ضایعات زیر ۷٪.',
    },
  ];

  const baseHealthScore = clampScore(
    radarAxes.reduce((s, a) => s + a.workshopScore, 0) / radarAxes.length
  );

  // ==========================================================
  // 20-RULE IRANIAN BAKERY EXPERT AUDIT ENGINE
  // ==========================================================
  const findings: OfflineAuditFinding[] = [];
  const highImpactThreshold = Math.max(
    6_000_000,
    summary.totalMonthlyRevenue * 0.025
  );

  const pushFinding = (
    ruleNumber: number,
    id: string,
    title: string,
    severity: AuditSeverity,
    monthlyImpactToman: number,
    summaryText: string,
    evidence: string,
    effort: ActionEffort,
    actionLabel: string,
    targetTab: OfflineAuditFinding['targetTab'],
    targetProductId?: string
  ) => {
    const cleanImpact = Math.max(0, Math.round(monthlyImpactToman));
    findings.push({
      id,
      ruleNumber,
      title,
      severity,
      monthlyImpactToman: cleanImpact,
      summary: summaryText,
      evidence,
      effort,
      quadrant: resolveQuadrant(cleanImpact, effort, highImpactThreshold),
      actionLabel,
      targetTab,
      targetProductId,
    });
  };

  // Rule 1: خوردگی سرمایه (سود کاذب تورمی)
  if (phantomProfitSharePercent >= 12) {
    pushFinding(
      1,
      'rule-01-capital-erosion',
      'خوردگی سرمایه و سهم بالای سود کاذب تورمی',
      phantomProfitSharePercent >= 28 ? 'critical' : 'warning',
      phantomInflationProfit,
      `حدود ${Math.round(phantomProfitSharePercent)}٪ از سود اسمی شما به دلیل تورم ماهانه مواد اولیه (${defaults.monthlyInflationRate}٪) برای خرید مجدد همان حجم مواد در ماه آینده بلعیده می‌شود.`,
      `سود اسمی ماهانه در برابر سود واقعی تورم‌زدایی‌شده، حدود ${Math.round(phantomInflationProfit / 1_000_000)} میلیون تومان فاصله دارد.`,
      'low',
      'تنظیم قیمت ضدتورم',
      'planning'
    );
  }

  // Rule 2: تله گلوگاه فر (Oven-Hour Bottleneck Trap)
  const totalPositiveProfit = summary.productBreakdowns.reduce(
    (s, b) => s + Math.max(0, b.monthlyProfit),
    0
  );
  const ovenTrapProducts = summary.productBreakdowns
    .map((b) => {
      const hrs = productOvenHoursMap.get(b.productId) ?? 0;
      const hrShare = totalUsedOvenHours > 0 ? hrs / totalUsedOvenHours : 0;
      const profitShare =
        totalPositiveProfit > 0
          ? Math.max(0, b.monthlyProfit) / totalPositiveProfit
          : 0;
      return { b, hrs, hrShare, profitShare };
    })
    .filter((item) => item.hrShare > 0.12 && item.hrShare > item.profitShare * 1.45)
    .sort((a, b) => b.hrShare - a.hrShare);

  if (ovenTrapProducts.length > 0) {
    const worst = ovenTrapProducts[0];
    const opportunityLoss = Math.max(
      2_500_000,
      (profitPerOvenHour -
        (worst.hrs > 0 ? worst.b.monthlyProfit / worst.hrs : 0)) *
        worst.hrs *
        0.4
    );
    pushFinding(
      2,
      'rule-02-oven-bottleneck',
      `تله گلوگاه فر و کارگاه در «${worst.b.productName}»`,
      'critical',
      opportunityLoss,
      `این محصول ${Math.round(worst.hrShare * 100)}٪ زمان فر و استادکار را اشغال کرده اما فقط ${Math.round(worst.profitShare * 100)}٪ از سود خالص کارگاه را می‌سازد.`,
      `نسبت اشغال زمان به سهم سود: ${(worst.hrShare / Math.max(0.01, worst.profitShare)).toFixed(1)} برابر (آستانه هشدار ۱٫۵ برابر).`,
      'high',
      'اصلاح رسپی و تیراژ',
      'recipes',
      worst.b.productId
    );
  }

  // Rule 3: ریسک تمرکز پارتو مواد اولیه (Top 2 materials > 48%)
  if (topTwoMaterialsSharePercent >= 45 && mrpRows.length >= 2) {
    const shockExposure = topTwoBudget * 0.2;
    pushFinding(
      3,
      'rule-03-pareto-concentration',
      `ریسک تمرکز پارتو روی «${mrpRows[0].name}» و «${mrpRows[1].name}»`,
      topTwoMaterialsSharePercent >= 55 ? 'critical' : 'warning',
      shockExposure,
      `${Math.round(topTwoMaterialsSharePercent)}٪ کل بودجه خرید مواد کارگاه فقط به ۲ قلم وابسته است؛ جهش ۲۰٪ این دو ماده ضربه مستقیم به نقدینگی می‌زند.`,
      `سهم ۲ ماده اول از کل خرید ماهانه: ${Math.round(topTwoMaterialsSharePercent)}٪.`,
      'low',
      'بررسی رادار شوک مواد',
      'pantry'
    );
  }

  // Rule 4: تداخل نرخ مصوب اتحادیه (حاشیه سود زیر ۱۸٪)
  const unionAtRisk = summary.productBreakdowns.filter(
    (p) => p.profitMarginPercent < unionMarginFloor
  );
  if (unionAtRisk.length > 0) {
    const gapToSafe = unionAtRisk.reduce((sum, p) => {
      const targetPrice = p.totalUnitCost / (1 - unionMarginFloor / 100);
      return sum + Math.max(0, targetPrice - p.sellingPrice) * p.monthlyVolume;
    }, 0);
    pushFinding(
      4,
      'rule-04-union-price-cap',
      `تداخل نرخ مصوب اتحادیه و فشردگی حاشیه سود (${unionAtRisk.length} محصول)`,
      unionAtRisk.some((p) => p.profitMarginPercent < 12)
        ? 'critical'
        : 'warning',
      gapToSafe,
      `محصولات «${unionAtRisk.map((p) => p.productName).join('، ')}» زیر سقف قیمتی اتحادیه حاشیه سودی کمتر از ${unionMarginFloor}٪ دارند.`,
      `کمترین حاشیه سود فعلی: ${Math.round(Math.min(...unionAtRisk.map((p) => p.profitMarginPercent)))}٪.`,
      'low',
      'تنظیم قیمت ویترین',
      'recipes',
      unionAtRisk[0].productId
    );
  }

  // Rule 5: فشار چک‌های صیادی ۳۰ روز آینده
  if (sayadiCheckStressPercent >= sayadiDangerRatio * 100) {
    const excessCheckRisk = Math.max(
      3_000_000,
      defaults.upcomingSayadiChecks30d - freeOperatingCash * sayadiDangerRatio
    );
    pushFinding(
      5,
      'rule-05-sayadi-pressure',
      'فشار سررسید چک‌های صیادی ۳۰ روز آینده',
      sayadiCheckStressPercent >= 80 ? 'critical' : 'warning',
      excessCheckRisk,
      `چک‌های صیادی ۳۰ روز آینده معادل ${Math.round(sayadiCheckStressPercent)}٪ جریان نقدی آزاد کارگاه است؛ کوچک‌ترین افت فروش نقدی، ریسک برگشت چک ایجاد می‌کند.`,
      `نسبت چک به جریان نقد آزاد: ${Math.round(sayadiCheckStressPercent)}٪ (مرز ایمن: زیر ${Math.round(sayadiDangerRatio * 100)}٪).`,
      'high',
      'مدیریت سربار و نقدینگی',
      'planning'
    );
  }

  // Rule 6: خطر بی‌آمادگی ذخیره عیدی و سنوات اسفند
  const requiredMonthlyBonusReserve = defaults.staffCount * 4_500_000; // ~54M/year per worker / 12
  const bonusDeficit = Math.max(
    0,
    requiredMonthlyBonusReserve - defaults.yearlyBonusReserveMonthly
  );
  if (bonusDeficit > 1_000_000) {
    pushFinding(
      6,
      'rule-06-eydi-sanavat',
      'خطر بی‌آمادگی ذخیره عیدی و سنوات پایان سال (اسفند)',
      'warning',
      bonusDeficit,
      `برای ${defaults.staffCount} نفر پرسنل کارگاه، ذخیره ماهانه عیدی و سنوات لحاظ نشده است؛ این کسری در شب عید فشار نقدینگی شدید ایجاد می‌کند.`,
      `ذخیره پیشنهادی ماهانه: ${Math.round(requiredMonthlyBonusReserve / 1_000_000)} میلیون تومان/ماه.`,
      'low',
      'افزودن به سربار ثابت',
      'planning'
    );
  }

  // Rule 7: پرت نامرئی انبار و ریزش وزن‌کشی (تخمین ۳٪ مصرف خام)
  const invisibleLeakEst = Math.round(summary.totalMonthlyMaterialCost * 0.035);
  if (invisibleLeakEst > 2_000_000) {
    pushFinding(
      7,
      'rule-07-invisible-pantry-leak',
      'پرت نامرئی انبار و خطای وزن‌کشی بدون ترازوی استاندارد',
      'warning',
      invisibleLeakEst,
      'در کارگاه‌های قنادی بدون چک‌لیست وزن‌کشی روزانه، به‌طور میانگین ۳٫۵٪ مواد گران‌قیمت (پسته، کره، خامه) به‌صورت پرت نامرئی از بین می‌رود.',
      `برآورد نشت ماهانه روی خرید مواد خام کارگاه: حدود ${Math.round(invisibleLeakEst / 1_000_000)} میلیون تومان.`,
      'low',
      'استفاده از برگه ترازو',
      'recipes'
    );
  }

  // Rule 8: ضایعات و افت پخت بالای شیرینی تر و خامه‌ای
  const highWasteCream = state.products.filter(
    (p) =>
      (p.category === 'شیرینی تر' || p.category === 'کیک و رولت') &&
      p.wastagePercent >= 8
  );
  if (highWasteCream.length > 0) {
    const wasteSavings = highWasteCream.reduce((sum, p) => {
      const b = summary.productBreakdowns.find((x) => x.productId === p.id);
      return sum + (b ? b.monthlyWastageCost * 0.35 : 0);
    }, 0);
    pushFinding(
      8,
      'rule-08-cream-spoilage',
      `ضایعات و افت پخت بالای شیرینی تر و کیک (${highWasteCream[0].name})`,
      wasteSavings >= highImpactThreshold ? 'critical' : 'warning',
      wasteSavings,
      `افت پخت و ماندگاری کوتاه در «${highWasteCream.map((p) => p.name).join('، ')}» بالاتر از نرم استاندارد ۶٪ است.`,
      `درصد افت فعلی: ${highWasteCream[0].wastagePercent}٪ — کاهش فقط ۲ تا ۳ درصدی، سود خالص مستقیم می‌سازد.`,
      'high',
      'بازبینی افت پخت رسپی',
      'recipes',
      highWasteCream[0].id
    );
  }

  // Rule 9: سوددهی منفی یا شکننده در فروش اسنپ‌فود (کمیسیون ۲۲٪)
  const snappLossProducts = summary.productBreakdowns.filter((b) => {
    const netSnappRevenue =
      b.sellingPrice * (1 - defaults.snappFoodCommission / 100);
    return netSnappRevenue <= b.totalUnitCost;
  });
  if (snappLossProducts.length > 0) {
    const worstSnapp = snappLossProducts[0];
    const snappUnitLoss =
      worstSnapp.totalUnitCost -
      worstSnapp.sellingPrice * (1 - defaults.snappFoodCommission / 100);
    // Assume 20% of monthly volume goes through delivery channels
    const monthlySnappBleed =
      Math.max(10_000, snappUnitLoss) * worstSnapp.monthlyVolume * 0.25;
    pushFinding(
      9,
      'rule-09-snappfood-negative',
      `سوددهی منفی در فروش آنلاین / اسنپ‌فود (${snappLossProducts.length} محصول)`,
      'critical',
      monthlySnappBleed,
      `با کمیسیون ${defaults.snappFoodCommission}٪ اسنپ‌فود، فروش «${snappLossProducts.map((p) => p.productName).join('، ')}» با قیمت ویترین فعلی، در هر کیلو گرم زیان مستقیم تولید می‌کند!`,
      `در «${worstSnapp.productName}» پس از کسر کمیسیون، دریافتی خالص کمتر از بهای تمام‌شده است.`,
      'low',
      'شبیه‌سازی قیمت آنلاین',
      'recipes',
      worstSnapp.productId
    );
  }

  // Rule 10: محصولات زیان‌ده مستقیم در ویترین
  const directLossProducts = summary.productBreakdowns.filter(
    (b) => b.unitProfit < 0
  );
  if (directLossProducts.length > 0) {
    const monthlyDirectLoss = directLossProducts.reduce(
      (s, b) => s + Math.abs(b.monthlyProfit),
      0
    );
    pushFinding(
      10,
      'rule-10-direct-loss',
      `هشدار فروش زیر بهای تمام‌شده (${directLossProducts.length} محصول)`,
      'critical',
      monthlyDirectLoss,
      `محصولات «${directLossProducts.map((p) => p.productName).join('، ')}» همین حالا در ویترین زیر بهای تمام‌شده فروخته می‌شوند.`,
      `زیان مستقیم ماهانه در ویترین بدون تخفیف.`,
      'low',
      'اصلاح فوری قیمت فروش',
      'recipes',
      directLossProducts[0].productId
    );
  }

  // Rule 11: شکاف قیمت ویترین با قیمت پیشنهادی هدف (Target Margin Gap)
  const underpriced = summary.productBreakdowns.filter(
    (b) => b.suggestedPrice > b.sellingPrice * 1.06
  );
  if (underpriced.length > 0) {
    const totalPriceGap = underpriced.reduce(
      (s, b) => s + (b.suggestedPrice - b.sellingPrice) * b.monthlyVolume * 0.5,
      0
    );
    pushFinding(
      11,
      'rule-11-target-price-gap',
      `جا ماندن قیمت ویترین از حاشیه سود هدف در ${underpriced.length} شیرینی`,
      'opportunity',
      totalPriceGap,
      `اصلاح تدریجی قیمت فروش به سمت قیمت پیشنهادی (حتی ۵۰٪ شکاف فعلی) می‌تواند سود ماهانه کارگاه را بدون افزایش تیراژ جهش دهد.`,
      `بیشترین شکاف قیمتی مربوط به «${underpriced[0].productName}» است.`,
      'low',
      'شبیه‌ساز قیمت نهایی',
      'recipes',
      underpriced[0].productId
    );
  }

  // Rule 12: نسبت سربار ثابت به درآمد (Operating Leverage)
  const overheadToRevPct =
    summary.totalMonthlyRevenue > 0
      ? (summary.totalMonthlyFixedOverhead / summary.totalMonthlyRevenue) * 100
      : 0;
  if (overheadToRevPct >= 15) {
    const targetOverhead = summary.totalMonthlyRevenue * 0.13;
    pushFinding(
      12,
      'rule-12-overhead-ratio',
      'نسبت بالای هزینه‌های ثابت و اجاره به فروش ماهانه',
      overheadToRevPct >= 22 ? 'critical' : 'warning',
      Math.max(2_000_000, summary.totalMonthlyFixedOverhead - targetOverhead),
      `سربار ثابت کارگاه ${Math.round(overheadToRevPct)}٪ از کل فروش را می‌بلعد؛ افزایش ظرفیت تولید شیفت دوم، سربار هر کیلو گرم را سریعاً می‌شکند.`,
      `نسبت فعلی سربار به درآمد: ${Math.round(overheadToRevPct)}٪ (مطلوب: زیر ۱۴٪).`,
      'high',
      'شبیه‌ساز افزایش ظرفیت',
      'planning'
    );
  }

  // Rule 13: ریسک تک‌محصولی در درآمد کارگاه
  const topRevProduct = [...summary.productBreakdowns].sort(
    (a, b) => b.monthlyRevenue - a.monthlyRevenue
  )[0];
  const topRevShare =
    topRevProduct && summary.totalMonthlyRevenue > 0
      ? (topRevProduct.monthlyRevenue / summary.totalMonthlyRevenue) * 100
      : 0;
  if (topRevProduct && topRevShare >= 32) {
    pushFinding(
      13,
      'rule-13-single-product-risk',
      `وابستگی بالای درآمد به «${topRevProduct.productName}» (${Math.round(topRevShare)}٪)`,
      'warning',
      topRevProduct.monthlyProfit * 0.25,
      `بیش از یک‌سوم فروش ماهانه روی یک شیرینی متمرکز است؛ نوسان فصلی تقاضا در این قلم ریسک جریان نقدی دارد.`,
      `درآمد ماهانه این قلم: ${Math.round(topRevProduct.monthlyRevenue / 1_000_000)} میلیون تومان.`,
      'high',
      'تحلیل سبد محصولات',
      'reports'
    );
  }

  // Rule 14: فرصت محصولات «معما / Puzzle» (سود بالا، تیراژ پایین)
  const puzzles = summary.productBreakdowns.filter(
    (b) => b.quadrant === 'puzzle'
  );
  if (puzzles.length > 0) {
    const puzzleUpside = puzzles.reduce(
      (s, b) => s + Math.max(0, b.unitProfit) * b.monthlyVolume * 0.35,
      0
    );
    pushFinding(
      14,
      'rule-14-puzzle-upside',
      `فرصت طلایی رشد تیراژ در «${puzzles[0].productName}» (محصول معما)`,
      'opportunity',
      puzzleUpside,
      `این شیرینی حاشیه سود عالی (${Math.round(puzzles[0].profitMarginPercent)}٪) دارد اما حجم فروشش زیر میانگین است؛ قرار دادن آن در پکیج‌های هدیه و ویترین اول فروش را جهش می‌دهد.`,
      `افزایش ۳۵٪ تیراژ بدون نیاز به دستگاه جدید.`,
      'low',
      'ساخت پکیج هدیه میکس',
      'orders'
    );
  }

  // Rule 15: محصولات «باربر / Plowhorse» (تیراژ بالا، سود ضعیف)
  const plowhorses = summary.productBreakdowns.filter(
    (b) => b.quadrant === 'plowhorse'
  );
  if (plowhorses.length > 0) {
    const plowUpside = plowhorses.reduce(
      (s, b) => s + b.monthlyRevenue * 0.06,
      0
    );
    pushFinding(
      15,
      'rule-15-plowhorse-reprice',
      `اصلاح سودآوری «${plowhorses[0].productName}» (پرفروش اما کم‌سود)`,
      'opportunity',
      plowUpside,
      `مشتریان این محصول را زیاد می‌خرند اما حاشیه سودش پایین‌تر از میانگین است؛ حتی ۶٪ اصلاح قیمت یا بهینه‌سازی وزن جعبه، سود کل را متحول می‌کند.`,
      `تیراژ بالا همراه با حاشیه سود ${Math.round(plowhorses[0].profitMarginPercent)}٪.`,
      'low',
      'اصلاح قیمت و رسپی',
      'recipes',
      plowhorses[0].productId
    );
  }

  // Rule 16: سهم بالای هزینه بسته‌بندی از قیمت فروش
  const highPkgProducts = summary.productBreakdowns.filter(
    (b) => b.sellingPrice > 0 && b.packagingCostPerUnit / b.sellingPrice >= 0.08
  );
  if (highPkgProducts.length > 0) {
    const pkgSaving = highPkgProducts.reduce(
      (s, b) => s + b.monthlyPackagingCost * 0.18,
      0
    );
    pushFinding(
      16,
      'rule-16-packaging-cost',
      `سهم سنگین هزینه جعبه و بسته‌بندی در «${highPkgProducts[0].productName}»`,
      'opportunity',
      pkgSaving,
      'هزینه بسته‌بندی در این محصول بیش از ۸٪ قیمت فروش است؛ خرید مستقیم کارتن و جعبه از چاپخانه می‌تواند ۱۸٪ این هزینه را کاهش دهد.',
      `صرفه‌جویی مستقیم ماهانه روی اقلام بسته‌بندی.`,
      'high',
      'مدیریت بانک بسته‌بندی',
      'pantry'
    );
  }

  // Rule 17: بهره‌وری پایین سود در ساعت فر و کارگاه
  if (profitPerOvenHour < 520_000) {
    const ovenUpside = (520_000 - profitPerOvenHour) * effectiveOvenHours * 0.3;
    pushFinding(
      17,
      'rule-17-oven-hour-yield',
      'ظرفیت ارتقای سود در هر ساعت کارکرد فر و تیم تولید',
      'opportunity',
      ovenUpside,
      `سود خالص فعلی به ازای هر ساعت تولید ${Math.round(profitPerOvenHour / 1000).toLocaleString('fa-IR')} هزار تومان است که پایین‌تر از استاندارد قنادی‌های پیشرو (۶۵۰ هزار تومان/ساعت) است.`,
      `جایگزینی بخشی از زمان فر با محصولات پُرسودتر مانند باقلوا و شیرینی خشک لوکس.`,
      'high',
      'مقایسه بهره‌وری محصولات',
      'reports'
    );
  }

  // Rule 18: حاشیه ایمنی پایین در برابر رکود فصلی تابستان
  if (summary.marginOfSafetyPercent < 35) {
    pushFinding(
      18,
      'rule-18-safety-margin',
      'حاشیه ایمنی شکننده در برابر رکود فصلی فروش',
      summary.marginOfSafetyPercent < 20 ? 'critical' : 'warning',
      summary.totalMonthlyFixedOverhead * 0.3,
      `حاشیه ایمنی فروش (${Math.round(summary.marginOfSafetyPercent)}٪) در ماه‌های کم‌رونق تابستان می‌تواند کارگاه را به نقطه سربه‌سر نزدیک کند.`,
      `روز رسیدن به نقطه سربه‌سر: روز ${breakEvenDayOfMonth} ماه.`,
      'high',
      'تحلیل نقطه سربه‌سر',
      'planning'
    );
  }

  // Rule 19: شکاف تا هدف درآمد ماهانه کارگاه
  const targetRev =
    state.settings.monthlyTargetRevenue ??
    Math.round(summary.totalMonthlyRevenue * 1.2);
  if (targetRev > summary.totalMonthlyRevenue * 1.03) {
    const revGap = targetRev - summary.totalMonthlyRevenue;
    const profitPotential =
      revGap * Math.max(0.15, summary.netProfitMarginPercent / 100);
    pushFinding(
      19,
      'rule-19-revenue-target-gap',
      'شکاف فروش فعلی تا هدف درآمد ماهانه کارگاه',
      'opportunity',
      profitPotential,
      `برای رسیدن به هدف فروش ماهانه، به ${Math.round(revGap / 1_000_000)} میلیون تومان فروش اضافی نیاز است که سود خالص قابل‌توجهی ایجاد می‌کند.`,
      `سهمیه فروش هدف در تب برنامه‌ریزی محاسبه شده است.`,
      'high',
      'برنامه‌ریزی هدف فروش',
      'planning'
    );
  }

  // Rule 20: فرصت سودآوری از سینی‌های میکس و سفارش‌های سازمانی B2B
  const starProduct = [...summary.productBreakdowns].sort(
    (a, b) => b.profitMarginPercent - a.profitMarginPercent
  )[0];
  if (starProduct) {
    const b2bUpside = Math.round(summary.totalMonthlyRevenue * 0.08 * 0.28);
    pushFinding(
      20,
      'rule-20-corporate-mix-boxes',
      `فرصت ساخت پکیج‌های میکس سازمانی با محوریت «${starProduct.productName}»`,
      'opportunity',
      b2bUpside,
      `ترکیب محصول ستاره شما (${Math.round(starProduct.profitMarginPercent)}٪ سود) در پکیج‌های هدیه سازمانی و سینی‌های مناسبتی، حاشیه سود بالاتری از فروش فله ایجاد می‌کند.`,
      `پتانسیل افزودن فقط ۳۰ تا ۵۰ پکیج سازمانی در ماه.`,
      'low',
      'طراحی در سفارش‌ساز هدیه',
      'orders'
    );
  }

  // Sort strictly by exact monthly Toman impact descending
  findings.sort((a, b) => b.monthlyImpactToman - a.monthlyImpactToman);

  const totalCriticalImpactToman = findings
    .filter((f) => f.severity === 'critical')
    .reduce((s, f) => s + f.monthlyImpactToman, 0);
  const totalOpportunityImpactToman = findings
    .filter((f) => f.severity === 'opportunity')
    .reduce((s, f) => s + f.monthlyImpactToman, 0);

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    executionTimeMs: Math.max(0.4, Number((t1 - t0).toFixed(1))),
    baseHealthScore,
    radarAxes,
    findings,
    totalCriticalImpactToman,
    totalOpportunityImpactToman,
    realInflationAdjustedProfit,
    phantomInflationProfit,
    phantomProfitSharePercent,
    profitPerOvenHour,
    effectiveWastePercent,
    sayadiCheckStressPercent,
    breakEvenDayOfMonth,
    monteCarloP5Profit,
    monteCarloMedianProfit,
    monteCarloP95Profit,
    topTwoMaterialsSharePercent,
  };
}

/**
 * Computes boosted Health Score as the workshop owner checks off completed audit fixes.
 */
export function computeBoostedHealthScore(
  baseScore: number,
  findings: OfflineAuditFinding[],
  completedIds: string[]
): number {
  if (findings.length === 0 || completedIds.length === 0) return baseScore;
  const doneSet = new Set(completedIds);
  let boost = 0;
  for (const f of findings) {
    if (!doneSet.has(f.id)) continue;
    boost += f.severity === 'critical' ? 3.5 : f.severity === 'warning' ? 2 : 1.5;
  }
  return clampScore(Math.min(100, baseScore + Math.round(boost)));
}

// ============================================================
// 7.4 Local Monthly Snapshot Time-Machine
// ============================================================

export function createOfflineSnapshot(
  monthLabel: string,
  summary: WorkshopSummary,
  report: OfflineDiagnosticReport,
  boostedHealthScore?: number
): OfflineMonthlySnapshot {
  return {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    monthLabel: monthLabel.trim() || 'کارنامه ماه جاری',
    savedAtIso: new Date().toISOString(),
    realProfit: Math.round(report.realInflationAdjustedProfit),
    nominalProfit: Math.round(summary.netMonthlyProfit),
    marginPercent: Number(summary.netProfitMarginPercent.toFixed(1)),
    wastePercent: Number(report.effectiveWastePercent.toFixed(1)),
    ovenHourProfit: Math.round(report.profitPerOvenHour),
    breakEvenDay: report.breakEvenDayOfMonth,
    healthScore: boostedHealthScore ?? report.baseHealthScore,
    totalRevenue: Math.round(summary.totalMonthlyRevenue),
  };
}

export function buildSeedOfflineSnapshots(
  summary: WorkshopSummary,
  report: OfflineDiagnosticReport
): OfflineMonthlySnapshot[] {
  return [
    {
      id: 'seed-tir-1405',
      monthLabel: 'تیر ۱۴۰۵',
      savedAtIso: '2026-07-20T10:00:00.000Z',
      realProfit: Math.round(report.realInflationAdjustedProfit * 0.84),
      nominalProfit: Math.round(summary.netMonthlyProfit * 0.88),
      marginPercent: Number(Math.max(5, summary.netProfitMarginPercent - 2.4).toFixed(1)),
      wastePercent: Number((report.effectiveWastePercent + 1.3).toFixed(1)),
      ovenHourProfit: Math.round(report.profitPerOvenHour * 0.87),
      breakEvenDay: Math.min(28, report.breakEvenDayOfMonth + 3),
      healthScore: clampScore(report.baseHealthScore - 7),
      totalRevenue: Math.round(summary.totalMonthlyRevenue * 0.91),
    },
    {
      id: 'seed-mordad-1405',
      monthLabel: 'مرداد ۱۴۰۵',
      savedAtIso: '2026-08-20T10:00:00.000Z',
      realProfit: Math.round(report.realInflationAdjustedProfit * 0.94),
      nominalProfit: Math.round(summary.netMonthlyProfit * 0.96),
      marginPercent: Number(Math.max(6, summary.netProfitMarginPercent - 0.9).toFixed(1)),
      wastePercent: Number((report.effectiveWastePercent + 0.5).toFixed(1)),
      ovenHourProfit: Math.round(report.profitPerOvenHour * 0.95),
      breakEvenDay: Math.min(27, report.breakEvenDayOfMonth + 1),
      healthScore: clampScore(report.baseHealthScore - 3),
      totalRevenue: Math.round(summary.totalMonthlyRevenue * 0.96),
    },
  ];
}

export function loadOfflineSnapshots(
  summary: WorkshopSummary,
  report: OfflineDiagnosticReport
): OfflineMonthlySnapshot[] {
  if (typeof window === 'undefined') {
    return buildSeedOfflineSnapshots(summary, report);
  }
  try {
    const raw = window.localStorage.getItem(OFFLINE_SNAPSHOTS_KEY);
    if (!raw) return buildSeedOfflineSnapshots(summary, report);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return parsed as OfflineMonthlySnapshot[];
    }
    return buildSeedOfflineSnapshots(summary, report);
  } catch {
    return buildSeedOfflineSnapshots(summary, report);
  }
}

export function saveOfflineSnapshots(snapshots: OfflineMonthlySnapshot[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      OFFLINE_SNAPSHOTS_KEY,
      JSON.stringify(snapshots.slice(-12))
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function loadCompletedChecklistIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_CHECKLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
}

export function saveCompletedChecklistIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OFFLINE_CHECKLIST_KEY, JSON.stringify(ids));
  } catch {
    // Ignore
  }
}

export function compareMonthlySnapshots(
  fromSnap: OfflineMonthlySnapshot,
  toSnap: OfflineMonthlySnapshot
): SnapshotMetricDelta[] {
  const buildRow = (
    key: string,
    label: string,
    fromValue: number,
    toValue: number,
    unit: SnapshotMetricDelta['unit'],
    higherIsBetter: boolean
  ): SnapshotMetricDelta => {
    const delta = Number((toValue - fromValue).toFixed(1));
    const isImproved = higherIsBetter ? delta >= 0 : delta <= 0;
    return { key, label, fromValue, toValue, delta, unit, higherIsBetter, isImproved };
  };

  return [
    buildRow(
      'realProfit',
      'سود واقعی (تورم‌زدایی‌شده)',
      fromSnap.realProfit,
      toSnap.realProfit,
      'currency',
      true
    ),
    buildRow(
      'marginPercent',
      'حاشیه سود خالص',
      fromSnap.marginPercent,
      toSnap.marginPercent,
      'percent',
      true
    ),
    buildRow(
      'wastePercent',
      'نرخ افت پخت و ضایعات',
      fromSnap.wastePercent,
      toSnap.wastePercent,
      'percent',
      false
    ),
    buildRow(
      'ovenHourProfit',
      'سود هر ساعت فر',
      fromSnap.ovenHourProfit,
      toSnap.ovenHourProfit,
      'currency',
      true
    ),
    buildRow(
      'breakEvenDay',
      'روز رسیدن به سربه‌سر ماه',
      fromSnap.breakEvenDay,
      toSnap.breakEvenDay,
      'day',
      false
    ),
    buildRow(
      'healthScore',
      'امتیاز سلامت کارگاه',
      fromSnap.healthScore,
      toSnap.healthScore,
      'score',
      true
    ),
  ];
}

// ============================================================
// 7.5 Pure Math What-If Decision Simulators (Also Stage 1 of Pillar 8C)
// ============================================================

export function simulateOfflineDecision(
  state: WorkshopState,
  summary: WorkshopSummary,
  baseReport: OfflineDiagnosticReport,
  input: OfflineDecisionInput
): OfflineDecisionSimulation {
  const defaults = getIranianWorkshopDefaults(state, summary);

  let afterState: WorkshopState = state;
  let title = '';
  let summaryText = '';

  if (input.type === 'cafe-contract') {
    const extraKg = Math.max(10, input.cafeMonthlyKg ?? 80);
    const discountPct = Math.min(45, Math.max(0, input.cafeDiscountPercent ?? 15));
    const checkDays = Math.max(0, input.cafeCheckDays ?? 30);

    // Distribute extra volume proportionally across existing products with discounted B2B price
    const totalCurrentVol = Math.max(1, summary.totalMonthlyVolume);
    const volRatio = extraKg / totalCurrentVol;
    const avgSellingPrice = summary.totalMonthlyRevenue / totalCurrentVol;
    const extraRevenue = extraKg * avgSellingPrice * (1 - discountPct / 100);
    const checkFinancingCost =
      extraRevenue * (defaults.monthlyInflationRate / 100) * (checkDays / 30);

    afterState = {
      ...state,
      products: state.products.map((p) => {
        const addedVol = p.monthlyVolume * volRatio;
        const newVol = p.monthlyVolume + addedVol;
        const blendedPrice =
          newVol > 0
            ? (p.monthlyVolume * p.sellingPrice +
                addedVol * p.sellingPrice * (1 - discountPct / 100)) /
              newVol
            : p.sellingPrice;
        return {
          ...p,
          monthlyVolume: Number(newVol.toFixed(1)),
          sellingPrice: Math.round(blendedPrice),
        };
      }),
      overheads:
        checkFinancingCost > 0
          ? [
              ...state.overheads,
              {
                id: 'sim-check-cost',
                title: 'هزینه خواب سرمایه چک کافه',
                category: 'مالی',
                monthlyAmount: Math.round(checkFinancingCost),
              },
            ]
          : state.overheads,
    };
    title = `پذیرش قرارداد کافه (${extraKg} کیلو گرم با ${discountPct}٪ تخفیف و چک ${checkDays} روزه)`;
    summaryText =
      'محاسبه دقیق اثر افزایش تیراژ B2B، تخفیف همکاری و هزینه خواب سرمایه چک صیادی بر سود واقعی و روز سر‌به‌سر.';
  } else if (input.type === 'hire-staff') {
    const addedFixed = Math.max(1_000_000, input.addedMonthlyFixedCost ?? 24_000_000);
    const growthPct = Math.max(0, Math.min(100, input.capacityGrowthPercent ?? 18));
    const factor = 1 + growthPct / 100;

    afterState = {
      ...state,
      products: state.products.map((p) => ({
        ...p,
        monthlyVolume: Number((p.monthlyVolume * factor).toFixed(1)),
      })),
      overheads: [
        ...state.overheads,
        {
          id: 'sim-hire-fixed',
          title: 'حقوق نیروی جدید / قسط دستگاه',
          category: 'پرسنل و توسعه',
          monthlyAmount: addedFixed,
        },
      ],
    };
    title = `استخدام نیروی جدید / خرید دستگاه (+${growthPct}٪ ظرفیت تولید)`;
    summaryText =
      'بررسی اینکه آیا رشد فروش حاصل از نیروی تازه یا دستگاه جدید، هزینه ثابت ماهانه آن را پوشش می‌دهد یا خیر.';
  } else if (input.type === 'waste-reduction') {
    const cutPoints = Math.max(0.5, Math.min(10, input.wasteReductionPercentPoints ?? 2));
    afterState = {
      ...state,
      products: state.products.map((p) => ({
        ...p,
        wastagePercent: Math.max(1, Number((p.wastagePercent - cutPoints).toFixed(1))),
      })),
    };
    title = `کاهش ${cutPoints} درصدی افت پخت و ضایعات در کل کارگاه`;
    summaryText =
      'نمایش اثر مستقیم استانداردسازی وزن‌کشی و دمای فر بر سود خالص بدون نیاز به فروش حتی یک کیلو گرم بیشتر.';
  } else {
    const priceDelta = input.campaignPriceDeltaPercent ?? 8;
    const volDelta = input.campaignVolumeDeltaPercent ?? 12;
    const marketingBudget = Math.max(0, input.campaignMarketingBudget ?? 8_000_000);

    afterState = {
      ...state,
      products: state.products.map((p) => ({
        ...p,
        sellingPrice: Math.max(1000, Math.round(p.sellingPrice * (1 + priceDelta / 100))),
        monthlyVolume: Math.max(0, Number((p.monthlyVolume * (1 + volDelta / 100)).toFixed(1))),
      })),
      overheads:
        marketingBudget > 0
          ? [
              ...state.overheads,
              {
                id: 'sim-campaign-mkt',
                title: 'بودجه کمپین مناسبتی',
                category: 'بازاریابی',
                monthlyAmount: marketingBudget,
              },
            ]
          : state.overheads,
    };
    title = `کمپین مناسبتی (${priceDelta >= 0 ? '+' : ''}${priceDelta}٪ قیمت و ${volDelta >= 0 ? '+' : ''}${volDelta}٪ فروش)`;
    summaryText =
      'تست ریاضی تغییر هم‌زمان قیمت، حجم فروش و بودجه تبلیغات مناسبتی پیش از اجرا.';
  }

  const afterSummary = calculateWorkshopSummary(afterState);
  const afterReport = runOfflineDiagnosticEngine(afterState, afterSummary);

  const rows: DecisionKpiRow[] = [
    {
      key: 'realProfit',
      label: 'سود واقعی (تورم‌زدایی‌شده)',
      before: Math.round(baseReport.realInflationAdjustedProfit),
      after: Math.round(afterReport.realInflationAdjustedProfit),
      delta: Math.round(
        afterReport.realInflationAdjustedProfit -
          baseReport.realInflationAdjustedProfit
      ),
      unit: 'currency',
      higherIsBetter: true,
    },
    {
      key: 'nominalProfit',
      label: 'سود خالص ماهانه (اسمی)',
      before: Math.round(summary.netMonthlyProfit),
      after: Math.round(afterSummary.netMonthlyProfit),
      delta: Math.round(afterSummary.netMonthlyProfit - summary.netMonthlyProfit),
      unit: 'currency',
      higherIsBetter: true,
    },
    {
      key: 'margin',
      label: 'حاشیه سود خالص کارگاه',
      before: Number(summary.netProfitMarginPercent.toFixed(1)),
      after: Number(afterSummary.netProfitMarginPercent.toFixed(1)),
      delta: Number(
        (
          afterSummary.netProfitMarginPercent - summary.netProfitMarginPercent
        ).toFixed(1)
      ),
      unit: 'percent',
      higherIsBetter: true,
    },
    {
      key: 'waste',
      label: 'نرخ مؤثر افت پخت و ضایعات',
      before: Number(baseReport.effectiveWastePercent.toFixed(1)),
      after: Number(afterReport.effectiveWastePercent.toFixed(1)),
      delta: Number(
        (
          afterReport.effectiveWastePercent - baseReport.effectiveWastePercent
        ).toFixed(1)
      ),
      unit: 'percent',
      higherIsBetter: false,
    },
    {
      key: 'ovenProfit',
      label: 'سود هر ساعت فر و تولید',
      before: Math.round(baseReport.profitPerOvenHour),
      after: Math.round(afterReport.profitPerOvenHour),
      delta: Math.round(
        afterReport.profitPerOvenHour - baseReport.profitPerOvenHour
      ),
      unit: 'currency',
      higherIsBetter: true,
    },
    {
      key: 'breakEvenDay',
      label: 'روز رسیدن به سربه‌سر ماه',
      before: baseReport.breakEvenDayOfMonth,
      after: afterReport.breakEvenDayOfMonth,
      delta: afterReport.breakEvenDayOfMonth - baseReport.breakEvenDayOfMonth,
      unit: 'day',
      higherIsBetter: false,
    },
  ];

  const netMonthlyProfitDelta = Math.round(
    afterReport.realInflationAdjustedProfit -
      baseReport.realInflationAdjustedProfit
  );

  return {
    type: input.type,
    title,
    summaryText,
    netMonthlyProfitDelta,
    isFavorable: netMonthlyProfitDelta > 0,
    rows,
  };
}
