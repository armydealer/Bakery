import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  Gauge,
  Plus,
  RotateCcw,
  ShoppingBasket,
  SlidersHorizontal,
  Target,
  Trash2,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CurrencyMode,
  FixedOverheadItem,
  MaterialRequirementRow,
  OverheadAllocationMethod,
  PURCHASE_UNIT_LABELS,
  SALES_UNIT_LABELS,
  SimulationParams,
  WorkshopSettings,
  WorkshopState,
  WorkshopSummary,
} from '../types/workshop';
import {
  calculateMaterialRequirements,
  calculateTargetRevenueGap,
  calculateWorkshopSummary,
  generateBreakEvenSeries,
  runInflationSimulation,
  scaleWorkshopProductionVolume,
} from '../utils/accounting';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  getCurrencyLabel,
  getCurrencyMultiplier,
  parseNumericInput,
} from '../utils/format';
import { HelpTooltip } from './HelpTooltip';

interface PlanningTabProps {
  state: WorkshopState;
  summary: WorkshopSummary;
  mrpRows: MaterialRequirementRow[];
  currency: CurrencyMode;
  onUpdateSettings: (patch: Partial<WorkshopSettings>) => void;
  onAddOverhead: (item: Omit<FixedOverheadItem, 'id'>) => void;
  onUpdateOverhead: (item: FixedOverheadItem) => void;
  onDeleteOverhead: (id: string) => void;
  onUpdateIngredientPrice: (
    ingredientId: string,
    newPricePerUnitToman: number
  ) => void;
  onApplySimulatedPriceIncrease: (percent: number) => void;
  onApplyVolumeScale: (scalePercent: number) => void;
}

export const PlanningTab: React.FC<PlanningTabProps> = ({
  state,
  summary,
  mrpRows,
  currency,
  onUpdateSettings,
  onAddOverhead,
  onUpdateOverhead,
  onDeleteOverhead,
  onUpdateIngredientPrice,
  onApplySimulatedPriceIncrease,
  onApplyVolumeScale,
}) => {
  const multiplier = getCurrencyMultiplier(currency);
  const currencyLabel = getCurrencyLabel(currency);

  // Total Monthly Production Volume slider (50% to 150% of nominal capacity)
  const [volumeScalePercent, setVolumeScalePercent] = useState<number>(100);

  // Add overhead state
  const [newOvhTitle, setNewOvhTitle] = useState('');
  const [newOvhCategory, setNewOvhCategory] = useState('عمومی کارگاه');
  const [newOvhAmount, setNewOvhAmount] = useState('');

  // What-If Inflation Simulator state
  const [simParams, setSimParams] = useState<SimulationParams>({
    materialDeltaPercent: 25,
    laborOverheadDeltaPercent: 15,
    sellingPriceDeltaPercent: 15,
  });

  const isVolumeScaled = volumeScalePercent !== 100;

  // Derived real-time workshop state, summary & MRP based on capacity slider
  const effectiveState = useMemo(
    () =>
      isVolumeScaled
        ? scaleWorkshopProductionVolume(state, volumeScalePercent)
        : state,
    [state, volumeScalePercent, isVolumeScaled]
  );

  const effectiveSummary = useMemo(
    () =>
      isVolumeScaled
        ? calculateWorkshopSummary(effectiveState)
        : summary,
    [effectiveState, summary, isVolumeScaled]
  );

  const effectiveMrpRows = useMemo(
    () =>
      isVolumeScaled
        ? calculateMaterialRequirements(effectiveState)
        : mrpRows,
    [effectiveState, mrpRows, isVolumeScaled]
  );

  // Keep Break-Even chart X-axis stable across 50%-150% slider motion
  const chartFixedMaxVol = useMemo(
    () =>
      Math.max(
        Math.ceil(summary.totalMonthlyVolume * 1.65),
        Number.isFinite(summary.breakEvenVolume)
          ? Math.ceil(summary.breakEvenVolume * 1.6)
          : 200,
        150
      ),
    [summary.totalMonthlyVolume, summary.breakEvenVolume]
  );

  const breakEvenSeries = useMemo(
    () => generateBreakEvenSeries(effectiveSummary, chartFixedMaxVol),
    [effectiveSummary, chartFixedMaxVol]
  );

  const simulation = useMemo(
    () => runInflationSimulation(effectiveState, simParams),
    [effectiveState, simParams]
  );

  const totalMrpBudget = useMemo(
    () => effectiveMrpRows.reduce((sum, r) => sum + r.totalBudget, 0),
    [effectiveMrpRows]
  );

  // Break-Even capacity ratio & calendar day of month
  const breakEvenShareOfCapacity =
    effectiveSummary.totalMonthlyVolume > 0 &&
    Number.isFinite(effectiveSummary.breakEvenVolume)
      ? (effectiveSummary.breakEvenVolume /
          effectiveSummary.totalMonthlyVolume) *
        100
      : Infinity;

  const breakEvenDayOfMonth =
    Number.isFinite(breakEvenShareOfCapacity) && breakEvenShareOfCapacity <= 100
      ? Math.max(1, Math.ceil((breakEvenShareOfCapacity / 100) * 30))
      : null;

  const avgOverheadPerUnit =
    effectiveSummary.totalMonthlyVolume > 0
      ? effectiveSummary.totalMonthlyFixedOverhead /
        effectiveSummary.totalMonthlyVolume
      : 0;

  // Global Monthly Target Revenue Slider bounds (in Toman)
  const sliderMinToman = useMemo(() => {
    const base = Math.max(
      100_000_000,
      Math.floor((summary.totalMonthlyRevenue * 0.5) / 10_000_000) * 10_000_000
    );
    return base;
  }, [summary.totalMonthlyRevenue]);

  const sliderMaxToman = useMemo(() => {
    return Math.max(
      1_500_000_000,
      Math.ceil((summary.totalMonthlyRevenue * 2.5) / 50_000_000) * 50_000_000
    );
  }, [summary.totalMonthlyRevenue]);

  const targetMonthlyRevenueToman =
    state.settings.monthlyTargetRevenue ??
    Math.ceil((summary.totalMonthlyRevenue * 1.35) / 10_000_000) * 10_000_000;

  const targetGap = useMemo(
    () => calculateTargetRevenueGap(effectiveSummary, targetMonthlyRevenueToman),
    [effectiveSummary, targetMonthlyRevenueToman]
  );

  const clampedGoalProgress = Math.min(
    100,
    Math.max(0, targetGap.progressPercent)
  );

  const handleAddOverheadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newOvhTitle.trim();
    const amountDisplay = parseNumericInput(newOvhAmount);
    if (!title || amountDisplay <= 0) return;

    onAddOverhead({
      title,
      category: newOvhCategory.trim() || 'عمومی',
      monthlyAmount: Math.round(amountDisplay / multiplier),
    });

    setNewOvhTitle('');
    setNewOvhAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Row 0: Global Monthly Target Revenue Slider & Sales Gap Planner */}
      <section
        aria-label="هدف‌گذاری درآمد ماهانه کارگاه"
        className="bg-white rounded-2xl border border-[#EAE4DC] p-5 sm:p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#F0EAE2]">
          <div>
            <div className="flex items-center gap-2 text-[#1F7A5A] text-xs font-semibold">
              <Target className="h-4 w-4" />
              <span>برنامه‌ریزی هدف فروش ماهانه</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <h2 className="text-base font-bold text-[#2A1F1D]">
                هدف درآمد ماهانه کارگاه و شکاف فروش تا هدف
              </h2>
              <HelpTooltip
                title="هدف فروش ماهانه و شکاف تا هدف"
                description="مشخص کنید این ماه چقدر می‌خواهید فروش داشته باشید. برنامه با توجه به سود فعلی شما حساب می‌کند دقیقاً چقدر دیگر باید بفروشید (در ماه و در روز) و سهم هر شیرینی چقدر است."
              />
            </div>
            <p className="text-xs text-[#6B5B56] mt-0.5 tabular-nums">
              بر اساس میانگین حاشیه سود خالص فعلی کارگاه ({formatPercent(targetGap.currentAverageMarginPercent)}) محاسبه می‌شود
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <label
              htmlFor="target-revenue-input"
              className="text-xs font-medium text-[#4F403C] whitespace-nowrap"
            >
              هدف ماهانه ({currencyLabel}):
            </label>
            <input
              id="target-revenue-input"
              type="number"
              min="0"
              step={currency === 'RIAL' ? '50000000' : '5000000'}
              value={Math.round(targetMonthlyRevenueToman * multiplier)}
              onChange={(e) => {
                const rawVal = Math.max(0, Number(e.target.value) || 0);
                onUpdateSettings({
                  monthlyTargetRevenue: Math.round(rawVal / multiplier),
                });
              }}
              className="w-44 h-10 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-sm font-extrabold text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
            />
          </div>
        </div>

        {/* Interactive Target Revenue Slider */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
            <span className="font-semibold text-[#4F403C]">
              تنظیم سریع هدف درآمد ماهانه:
            </span>
            <span className="text-sm font-extrabold text-[#C86D2D]">
              {formatCurrency(targetMonthlyRevenueToman, currency)}
            </span>
          </div>
          <input
            id="target-revenue-slider"
            type="range"
            min={sliderMinToman}
            max={Math.max(sliderMaxToman, targetMonthlyRevenueToman)}
            step={5_000_000}
            value={targetMonthlyRevenueToman}
            onChange={(e) =>
              onUpdateSettings({
                monthlyTargetRevenue: Number(e.target.value),
              })
            }
            aria-label="اسلایدر هدف درآمد ماهانه کارگاه"
            className="w-full saffron-slider cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-[#87756E] tabular-nums">
            <span>{formatCompactCurrency(sliderMinToman, currency)}</span>
            <span>
              فروش فعلی:{' '}
              {formatCompactCurrency(targetGap.currentRevenue, currency)}
            </span>
            <span>
              {formatCompactCurrency(
                Math.max(sliderMaxToman, targetMonthlyRevenueToman),
                currency
              )}
            </span>
          </div>
        </div>

        {/* Goal Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs tabular-nums">
            <span className="text-[#6B5B56]">
              میزان تحقق هدف با برنامه فروش فعلی
            </span>
            <span
              className={`font-bold ${
                targetGap.isGoalReached ? 'text-[#1F7A5A]' : 'text-[#C86D2D]'
              }`}
            >
              {formatPercent(targetGap.progressPercent, 1)}
            </span>
          </div>
          <div
            className="h-2.5 w-full rounded-full bg-[#EFE9E1] overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(clampedGoalProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="درصد تحقق هدف درآمد ماهانه"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                targetGap.isGoalReached ? 'bg-[#1F7A5A]' : 'bg-[#C86D2D]'
              }`}
              style={{ width: `${clampedGoalProgress}%` }}
            />
          </div>
        </div>

        {/* 4 Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 tabular-nums">
          <div
            className={`rounded-xl border p-4 space-y-1 ${
              targetGap.isGoalReached
                ? 'border-[#C6E6D9] bg-[#EFF8F4]'
                : 'border-[#EBD6C5] bg-[#FAF3EC]'
            }`}
          >
            <div className="text-xs text-[#6B5B56]">
              {targetGap.isGoalReached
                ? 'مازاد بر هدف ماهانه'
                : 'فروش اضافی مورد نیاز تا هدف'}
            </div>
            <div
              className={`text-lg font-extrabold ${
                targetGap.isGoalReached ? 'text-[#1F7A5A]' : 'text-[#C86D2D]'
              }`}
            >
              {targetGap.isGoalReached
                ? formatCurrency(targetGap.surplusRevenue, currency)
                : formatCurrency(targetGap.revenueGap, currency)}
            </div>
            <div className="text-[11px] text-[#6B5B56]">
              {targetGap.isGoalReached ? (
                <span className="inline-flex items-center gap-1 text-[#1F7A5A] font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  هدف درآمدی شما محقق شده است
                </span>
              ) : (
                `معادل ${formatCompactCurrency(targetGap.additionalDailyRevenueNeeded, currency)} فروش بیشتر در روز`
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] p-4 space-y-1">
            <div className="text-xs text-[#6B5B56]">
              حجم فروش اضافی لازم (سبد فعلی)
            </div>
            <div className="text-lg font-extrabold text-[#2A1F1D]">
              {targetGap.isGoalReached
                ? '۰ واحد / کیلو گرم'
                : `${formatNumber(Math.ceil(targetGap.additionalUnitsNeeded))} واحد / کیلو گرم`}
            </div>
            <div className="text-[11px] text-[#87756E]">
              بر اساس میانگین قیمت فروش فعلی کارگاه
            </div>
          </div>

          <div className="rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] p-4 space-y-1">
            <div className="text-xs text-[#6B5B56]">
              سود خالص تخمینی در سطح هدف
            </div>
            <div
              className={`text-lg font-extrabold ${
                targetGap.projectedNetProfitAtTarget >= 0
                  ? 'text-[#1F7A5A]'
                  : 'text-[#C93B3B]'
              }`}
            >
              {formatCurrency(targetGap.projectedNetProfitAtTarget, currency)}
            </div>
            <div className="text-[11px] text-[#87756E]">
              با میانگین حاشیه سود{' '}
              {formatPercent(targetGap.currentAverageMarginPercent)}
            </div>
          </div>

          <div className="rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] p-4 space-y-1">
            <div className="text-xs text-[#6B5B56]">
              سود خالص اضافی از تحقق هدف
            </div>
            <div className="text-lg font-extrabold text-[#1F7A5A]">
              {targetGap.isGoalReached
                ? 'محقق شده'
                : `+${formatCompactCurrency(targetGap.additionalProfitFromGap, currency)}`}
            </div>
            <div className="text-[11px] text-[#87756E]">
              افزایش مستقیم سود خالص ماهانه
            </div>
          </div>
        </div>

        {/* Per-Product Extra Sales Quota (only when gap > 0) */}
        {!targetGap.isGoalReached && targetGap.productQuotas.length > 0 && (
          <div className="pt-3 border-t border-[#F0EAE2] space-y-2.5">
            <div className="text-xs font-semibold text-[#4F403C]">
              سهم پیشنهادی هر محصول برای پوشش شکاف فروش (با حفظ ترکیب فروش فعلی):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 tabular-nums">
              {targetGap.productQuotas.map((q) => (
                <div
                  key={q.productId}
                  className="rounded-xl border border-[#EAE4DC] bg-[#FCFAF7] px-3 py-2.5 flex flex-col justify-between gap-1"
                >
                  <span className="text-xs font-bold text-[#2A1F1D] truncate">
                    {q.productName}
                  </span>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-extrabold text-[#C86D2D]">
                      +{formatNumber(q.extraVolumeNeeded, 1)}{' '}
                      {SALES_UNIT_LABELS[q.salesUnit]}
                    </span>
                    <span className="text-[11px] text-[#87756E]">
                      {formatCompactCurrency(q.extraRevenueShare, currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Row 1: Monthly Fixed Overhead Manager + Break-Even Analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Monthly Fixed Overheads & Labor Rates */}
        <section
          aria-label="مدیریت هزینه‌های ثابت ماهانه و نرخ دستمزد"
          className="xl:col-span-5 bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-5"
        >
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#F0EAE2]">
            <div>
              <div className="flex items-center gap-2 text-[#C86D2D] text-xs font-semibold">
                <Building2 className="h-4 w-4" />
                <span>سربار و دستمزد کارگاه</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <h2 className="text-base font-bold text-[#2A1F1D]">
                  هزینه‌های ثابت ماهانه کارگاه
                </h2>
                <HelpTooltip
                  title="هزینه‌های ثابت ماهانه (سربار)"
                  description="خرج‌هایی که چه شیرینی بفروشید چه نفروشید هر ماه باید بپردازید؛ مثل اجاره کارگاه، قبض گاز و برق فرها، بیمه و استهلاک دستگاه‌ها. نام، گروه و مبلغ همه ردیف‌ها مستقیماً قابل ویرایش است."
                />
              </div>
            </div>
            <div className="text-left tabular-nums">
              <div className="text-[11px] text-[#87756E]">جمع سربار ماهانه</div>
              <div className="text-sm font-extrabold text-[#2A1F1D]">
                {formatCurrency(summary.totalMonthlyFixedOverhead, currency)}
              </div>
            </div>
          </div>

          {/* Overhead Allocation Basis & Direct Labor Hourly Rates */}
          <div className="rounded-xl bg-[#FAF8F5] border border-[#EAE4DC] p-3.5 space-y-3">
            <div>
              <label
                htmlFor="ovh-method"
                className="flex items-center gap-1 text-xs font-medium text-[#4F403C] mb-1"
              >
                <span>مبنای جذب سربار روی محصولات</span>
                <HelpTooltip
                  size="xs"
                  title="نحوه تقسیم سربار روی شیرینی‌ها"
                  description="انتخاب کنید هزینه اجاره و قبوض کارگاه بر اساس وزن و تعداد تولید (کیلو گرم / عدد) بین شیرینی‌ها تقسیم شود یا بر اساس زمانی که پای پخت هر شیرینی صرف می‌شود."
                />
              </label>
              <select
                id="ovh-method"
                value={state.settings.overheadAllocationMethod}
                onChange={(e) =>
                  onUpdateSettings({
                    overheadAllocationMethod: e.target
                      .value as OverheadAllocationMethod,
                  })
                }
                className="w-full h-9 px-3 rounded-lg border border-[#DDD4C8] bg-white text-xs text-[#2A1F1D]"
              >
                <option value="volume">
                  بر اساس ظرفیت تولید ماهانه (واحد / کیلو گرم)
                </option>
                <option value="laborHours">
                  بر اساس ساعات کار مستقیم تولید (دستمزد)
                </option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="master-rate"
                  className="block text-[11px] font-medium text-[#6B5B56] mb-1"
                >
                  نرخ ساعتی استادکار ({currencyLabel})
                </label>
                <input
                  id="master-rate"
                  type="number"
                  min="0"
                  step={currency === 'RIAL' ? '50000' : '5000'}
                  value={Math.round(state.settings.masterHourlyRate * multiplier)}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    onUpdateSettings({
                      masterHourlyRate: Math.round(val / multiplier),
                    });
                  }}
                  className="w-full h-9 px-2.5 rounded-lg border border-[#DDD4C8] bg-white text-xs font-semibold tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="assistant-rate"
                  className="block text-[11px] font-medium text-[#6B5B56] mb-1"
                >
                  نرخ ساعتی وردست ({currencyLabel})
                </label>
                <input
                  id="assistant-rate"
                  type="number"
                  min="0"
                  step={currency === 'RIAL' ? '50000' : '5000'}
                  value={Math.round(
                    state.settings.assistantHourlyRate * multiplier
                  )}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    onUpdateSettings({
                      assistantHourlyRate: Math.round(val / multiplier),
                    });
                  }}
                  className="w-full h-9 px-2.5 rounded-lg border border-[#DDD4C8] bg-white text-xs font-semibold tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Overhead Items List (Fully Editable Title, Category & Amount) */}
          <div className="divide-y divide-[#F0EAE2]">
            {state.overheads.map((ovh) => (
              <div
                key={ovh.id}
                className="py-2.5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <input
                    type="text"
                    value={ovh.title}
                    onChange={(e) =>
                      onUpdateOverhead({
                        ...ovh,
                        title: e.target.value,
                      })
                    }
                    aria-label={`عنوان هزینه ${ovh.title}`}
                    className="w-full h-7 px-2 rounded-md border border-transparent hover:border-[#DDD4C8] focus:border-[#C86D2D] bg-transparent focus:bg-white text-xs font-semibold text-[#2A1F1D] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={ovh.category}
                    onChange={(e) =>
                      onUpdateOverhead({
                        ...ovh,
                        category: e.target.value,
                      })
                    }
                    aria-label={`دسته هزینه ${ovh.title}`}
                    className="w-full h-6 px-2 rounded-md border border-transparent hover:border-[#DDD4C8] focus:border-[#C86D2D] bg-transparent focus:bg-white text-[11px] text-[#87756E] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min="0"
                    step={currency === 'RIAL' ? '1000000' : '100000'}
                    value={Math.round(ovh.monthlyAmount * multiplier)}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      onUpdateOverhead({
                        ...ovh,
                        monthlyAmount: Math.round(val / multiplier),
                      });
                    }}
                    aria-label={`مبلغ ماهانه ${ovh.title}`}
                    className="w-28 h-8 px-2 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs font-semibold text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
                  />
                  <button
                    type="button"
                    onClick={() => onDeleteOverhead(ovh.id)}
                    aria-label={`حذف هزینه ${ovh.title}`}
                    className="p-1.5 rounded-lg text-[#87756E] hover:text-[#C93B3B] hover:bg-[#FDF2F2]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Overhead Form */}
          <form
            onSubmit={handleAddOverheadSubmit}
            className="pt-3 border-t border-[#F0EAE2] grid grid-cols-12 gap-2"
          >
            <input
              type="text"
              value={newOvhTitle}
              onChange={(e) => setNewOvhTitle(e.target.value)}
              placeholder="عنوان هزینه جدید"
              aria-label="عنوان هزینه ثابت جدید"
              className="col-span-4 h-9 px-2 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs focus:outline-none focus:border-[#C86D2D]"
            />
            <input
              type="text"
              value={newOvhCategory}
              onChange={(e) => setNewOvhCategory(e.target.value)}
              placeholder="دسته (مثلاً: انرژی)"
              aria-label="دسته‌بندی هزینه ثابت جدید"
              className="col-span-3 h-9 px-2 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs focus:outline-none focus:border-[#C86D2D]"
            />
            <input
              type="number"
              min="1"
              value={newOvhAmount}
              onChange={(e) => setNewOvhAmount(e.target.value)}
              placeholder={`مبلغ (${currencyLabel})`}
              aria-label="مبلغ هزینه ثابت جدید"
              className="col-span-3 h-9 px-2 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs tabular-nums focus:outline-none focus:border-[#C86D2D]"
            />
            <button
              type="submit"
              aria-label="افزودن هزینه ثابت"
              className="col-span-2 h-9 inline-flex items-center justify-center rounded-lg bg-[#2A1F1D] text-white hover:bg-[#3F302D]"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
        </section>

        {/* Break-Even Analysis & Chart */}
        <section
          aria-label="تحلیل نقطه سربه‌سر کارگاه"
          className="xl:col-span-7 bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-[#2A1F1D]">
                  تحلیل نقطه سربه‌سر ماهانه (Break-Even)
                </h2>
                <HelpTooltip
                  title="نمودار نقطه سربه‌سر"
                  description="نقطه‌ای که خط سبز (درآمد فروش) از خط نارنجی (کل هزینه‌ها) رد می‌شود یعنی از آن به بعد کارگاه شما وارد سود می‌شود. هرچه اسلایدر تولید را بیشتر کنید، زودتر در ماه به سود می‌رسید."
                />
              </div>
              <p className="text-xs text-[#6B5B56] mt-0.5">
                حداقل فروش لازم برای پوشش کامل هزینه‌های ثابت و متغیر کارگاه در ظرفیت انتخابی
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B5B56]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#1F7A5A]" />
                درآمد فروش
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#C86D2D]" />
                هزینه کل
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#8C5A3C]" />
                هزینه ثابت
              </span>
            </div>
          </div>

          {/* Interactive Capacity / Total Monthly Production Volume Slider (50% - 150%) */}
          <div className="rounded-xl bg-[#FAF8F5] border border-[#EAE4DC] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-[#C86D2D] shrink-0" />
                <label
                  htmlFor="planning-capacity-slider"
                  className="text-xs sm:text-sm font-bold text-[#2A1F1D]"
                >
                  حجم کل تولید ماهانه کارگاه (۵۰٪ تا ۱۵۰٪ ظرفیت اسمی)
                </label>
                <HelpTooltip
                  size="xs"
                  title="اسلایدر ظرفیت تولید ماهانه"
                  description="می‌توانید ببینید اگر کارگاه با نصف ظرفیت (۵۰٪) یا یک و نیم برابر ظرفیت (۱۵۰٪) کار کند، نقطه سربه‌سر، سود ماهانه و لیست خرید مواد اولیه چطور تغییر می‌کند."
                />
              </div>
              <div className="flex items-center gap-1.5 tabular-nums">
                <input
                  type="number"
                  min="50"
                  max="150"
                  step="5"
                  value={volumeScalePercent}
                  onChange={(e) =>
                    setVolumeScalePercent(
                      Math.min(150, Math.max(50, Number(e.target.value) || 50))
                    )
                  }
                  aria-label="درصد ظرفیت تولید ماهانه"
                  className="w-16 h-8 px-2 rounded-lg border border-[#DDD4C8] bg-white text-center text-xs font-extrabold text-[#C86D2D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
                />
                <span className="text-xs font-bold text-[#C86D2D]">٪ ظرفیت</span>
                <span className="text-xs text-[#6B5B56]">
                  ({formatNumber(Math.round(effectiveSummary.totalMonthlyVolume))}{' '}
                  واحد / کیلو گرم)
                </span>
              </div>
            </div>

            <input
              id="planning-capacity-slider"
              type="range"
              min="50"
              max="150"
              step="5"
              value={volumeScalePercent}
              onChange={(e) => setVolumeScalePercent(Number(e.target.value))}
              aria-label="اسلایدر حجم کل تولید ماهانه بر حسب درصد ظرفیت اسمی"
              className="w-full saffron-slider cursor-pointer"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#87756E] tabular-nums">
              <span>۵۰٪ ({formatNumber(Math.round(summary.totalMonthlyVolume * 0.5))})</span>
              <span>۱۰۰٪ ظرفیت اسمی ({formatNumber(Math.round(summary.totalMonthlyVolume))})</span>
              <span>۱۵۰٪ ({formatNumber(Math.round(summary.totalMonthlyVolume * 1.5))})</span>
            </div>

            {isVolumeScaled && (
              <div className="pt-2 border-t border-[#EAE4DC] flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-[#4F403C] tabular-nums">
                  سود خالص در این ظرفیت:{' '}
                  <strong
                    className={
                      effectiveSummary.netMonthlyProfit >= 0
                        ? 'text-[#1F7A5A]'
                        : 'text-[#C93B3B]'
                    }
                  >
                    {formatCurrency(effectiveSummary.netMonthlyProfit, currency)}
                  </strong>{' '}
                  · سربار هر واحد:{' '}
                  <strong className="text-[#C86D2D]">
                    {formatCurrency(avgOverheadPerUnit, currency)}
                  </strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVolumeScalePercent(100)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DDD4C8] bg-white text-[11px] font-medium text-[#4F403C] hover:bg-[#F3ECE3]"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>بازگشت به ۱۰۰٪</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onApplyVolumeScale(volumeScalePercent);
                      setVolumeScalePercent(100);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1F7A5A] text-white text-[11px] font-semibold hover:bg-[#176147]"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    <span>ثبت روی تیراژ محصولات</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Break-Even Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-4 border-b border-[#F0EAE2] tabular-nums">
            <div>
              <div className="text-[11px] text-[#87756E]">نقطه سربه‌سر فروش</div>
              <div className="text-sm font-extrabold text-[#2A1F1D] mt-0.5">
                {Number.isFinite(effectiveSummary.breakEvenRevenue)
                  ? formatCompactCurrency(
                      effectiveSummary.breakEvenRevenue,
                      currency
                    )
                  : '—'}
              </div>
              <div className="text-[11px] text-[#87756E]">
                {Number.isFinite(effectiveSummary.breakEvenVolume)
                  ? `${formatNumber(Math.ceil(effectiveSummary.breakEvenVolume))} واحد / کیلو گرم`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#87756E]">سهم سربه‌سر از تولید</div>
              <div
                className={`text-sm font-extrabold mt-0.5 ${
                  breakEvenShareOfCapacity <= 100
                    ? 'text-[#C86D2D]'
                    : 'text-[#C93B3B]'
                }`}
              >
                {Number.isFinite(breakEvenShareOfCapacity)
                  ? formatPercent(breakEvenShareOfCapacity, 1)
                  : '—'}
              </div>
              <div className="text-[11px] text-[#87756E]">
                {breakEvenDayOfMonth !== null
                  ? `روز ${formatNumber(breakEvenDayOfMonth)} ماه`
                  : 'بالاتر از ظرفیت ماه'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#87756E]">حاشیه ایمنی فروش</div>
              <div
                className={`text-sm font-extrabold mt-0.5 ${
                  effectiveSummary.marginOfSafetyPercent >= 0
                    ? 'text-[#1F7A5A]'
                    : 'text-[#C93B3B]'
                }`}
              >
                {formatPercent(effectiveSummary.marginOfSafetyPercent)}
              </div>
              <div className="text-[11px] text-[#87756E]">
                پوشش: {formatPercent(effectiveSummary.breakEvenProgressPercent, 0)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#87756E]">سود خالص ماهانه</div>
              <div
                className={`text-sm font-extrabold mt-0.5 ${
                  effectiveSummary.netMonthlyProfit >= 0
                    ? 'text-[#1F7A5A]'
                    : 'text-[#C93B3B]'
                }`}
              >
                {formatCompactCurrency(
                  effectiveSummary.netMonthlyProfit,
                  currency
                )}
              </div>
              <div className="text-[11px] text-[#87756E]">
                حاشیه سود: {formatPercent(effectiveSummary.netProfitMarginPercent)}
              </div>
            </div>
          </div>

          {/* Break-Even Area/Line Chart */}
          <div className="h-[300px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={breakEvenSeries}
                margin={{ top: 16, right: 20, left: 10, bottom: 12 }}
              >
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1F7A5A" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#1F7A5A" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE9E1" />
                <XAxis
                  dataKey="volume"
                  type="number"
                  domain={[0, chartFixedMaxVol]}
                  tick={{ fill: '#6B5B56', fontSize: 11 }}
                  tickFormatter={(v: number) => `${formatNumber(v)}`}
                  label={{
                    value: 'تیراژ فروش ماهانه (واحد / کیلو گرم)',
                    position: 'insideBottom',
                    offset: -6,
                    fill: '#87756E',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  tick={{ fill: '#6B5B56', fontSize: 11 }}
                  width={84}
                  tickFormatter={(v: number) => formatCompactCurrency(v, currency)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const pt = payload[0].payload as (typeof breakEvenSeries)[number];
                    const profit = pt.revenue - pt.totalCost;
                    return (
                      <div
                        dir="rtl"
                        className="bg-white border border-[#EAE4DC] rounded-xl p-3 shadow-md text-xs space-y-1 tabular-nums"
                      >
                        <div className="font-bold text-[#2A1F1D] border-b border-[#F0EAE2] pb-1">
                          تیراژ: {formatNumber(pt.volume)} واحد / کیلو گرم
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-[#6B5B56]">درآمد:</span>
                          <span className="font-semibold text-[#1F7A5A]">
                            {formatCurrency(pt.revenue, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-[#6B5B56]">هزینه کل:</span>
                          <span className="font-semibold text-[#C86D2D]">
                            {formatCurrency(pt.totalCost, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 pt-1 border-t border-[#F0EAE2]">
                          <span className="text-[#6B5B56]">سود / زیان:</span>
                          <span
                            className={`font-bold ${
                              profit >= 0 ? 'text-[#1F7A5A]' : 'text-[#C93B3B]'
                            }`}
                          >
                            {formatCurrency(profit, currency)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1F7A5A"
                  strokeWidth={2.5}
                  fill="url(#revGradient)"
                  name="درآمد فروش"
                  animationDuration={200}
                />
                <Line
                  type="monotone"
                  dataKey="totalCost"
                  stroke="#C86D2D"
                  strokeWidth={2.5}
                  dot={false}
                  name="هزینه کل"
                  animationDuration={200}
                />
                <Line
                  type="monotone"
                  dataKey="fixedCost"
                  stroke="#8C5A3C"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  name="هزینه ثابت"
                  animationDuration={200}
                />
                {Number.isFinite(effectiveSummary.breakEvenVolume) &&
                  Number.isFinite(effectiveSummary.breakEvenRevenue) && (
                    <>
                      <ReferenceLine
                        x={Math.round(effectiveSummary.breakEvenVolume)}
                        stroke="#C93B3B"
                        strokeDasharray="3 3"
                      />
                      <ReferenceDot
                        x={Math.round(effectiveSummary.breakEvenVolume)}
                        y={Math.round(effectiveSummary.breakEvenRevenue)}
                        r={6}
                        fill="#C93B3B"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                      />
                    </>
                  )}
                {effectiveSummary.totalMonthlyVolume > 0 && (
                  <>
                    <ReferenceLine
                      x={Math.round(effectiveSummary.totalMonthlyVolume)}
                      stroke={
                        effectiveSummary.isAboveBreakEven
                          ? '#1F7A5A'
                          : '#C86D2D'
                      }
                      strokeDasharray="4 2"
                      strokeWidth={2}
                    />
                    <ReferenceDot
                      x={Math.round(effectiveSummary.totalMonthlyVolume)}
                      y={Math.round(effectiveSummary.totalMonthlyRevenue)}
                      r={6}
                      fill={
                        effectiveSummary.isAboveBreakEven
                          ? '#1F7A5A'
                          : '#C86D2D'
                      }
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6B5B56] tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#C93B3B]" />
              نقطه قرمز: مرز سربه‌سر ({formatNumber(Math.ceil(effectiveSummary.breakEvenVolume))} واحد / کیلو گرم)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1F7A5A]" />
              نقطه سبز: ظرفیت انتخابی شما ({formatNumber(Math.round(effectiveSummary.totalMonthlyVolume))} واحد / کیلو گرم)
            </span>
          </div>
        </section>
      </div>

      {/* Row 2: Iran Market Inflation & What-If Simulator */}
      <section
        aria-label="شبیه‌ساز نوسان قیمت و تورم بازار ایران"
        className="bg-white rounded-2xl border border-[#EAE4DC] p-5 sm:p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F0EAE2]">
          <div>
            <div className="flex items-center gap-2 text-[#C86D2D] text-xs font-semibold">
              <SlidersHorizontal className="h-4 w-4" />
              <span>تحلیل حساسیت و سناریوسازی</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <h2 className="text-base font-bold text-[#2A1F1D]">
                شبیه‌ساز نوسان قیمت و تورم بازار ایران
              </h2>
              <HelpTooltip
                title="شبیه‌ساز تورم (اگر قیمت‌ها بالا برود چه می‌شود؟)"
                description="قبل از اینکه لیست قیمت مغازه را عوض کنید، اینجا تست کنید اگر مواد اولیه، دستمزد یا اجاره گران شود، قیمت فروش شیرینی‌ها را چند درصد باید بالا ببرید تا سودتان حفظ شود."
              />
            </div>
            <p className="text-xs text-[#6B5B56] mt-0.5">
              پیش از اعلام لیست قیمت جدید، اثر جهش نرخ مواد اولیه و دستمزد را روی سود خالص کارگاه بسنجید
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSimParams({
                  materialDeltaPercent: 0,
                  laborOverheadDeltaPercent: 0,
                  sellingPriceDeltaPercent: 0,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] text-xs font-medium text-[#4F403C] hover:bg-[#F3ECE3]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>صفر کردن اسلایدرها</span>
            </button>
            {simParams.sellingPriceDeltaPercent > 0 && (
              <button
                type="button"
                onClick={() =>
                  onApplySimulatedPriceIncrease(
                    simParams.sellingPriceDeltaPercent
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C86D2D] text-white text-xs font-semibold hover:bg-[#B25D22] transition-colors whitespace-nowrap"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>
                  اعمال +{formatNumber(simParams.sellingPriceDeltaPercent)}٪ روی قیمت محصولات
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sliders + Direct Editable Number Inputs */}
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs gap-2">
                <label
                  htmlFor="sim-material"
                  className="font-semibold text-[#2A1F1D]"
                >
                  تغییر قیمت مواد اولیه و بسته‌بندی
                </label>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min="-10"
                    max="100"
                    step="1"
                    value={simParams.materialDeltaPercent}
                    onChange={(e) =>
                      setSimParams((p) => ({
                        ...p,
                        materialDeltaPercent: Math.min(
                          100,
                          Math.max(-10, Number(e.target.value) || 0)
                        ),
                      }))
                    }
                    aria-label="درصد تغییر قیمت مواد اولیه"
                    className="w-16 h-7 px-1.5 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-center text-xs font-bold text-[#C86D2D] tabular-nums"
                  />
                  <span className="font-bold text-[#C86D2D]">٪</span>
                </div>
              </div>
              <input
                id="sim-material"
                type="range"
                min="-10"
                max="100"
                step="1"
                value={simParams.materialDeltaPercent}
                onChange={(e) =>
                  setSimParams((p) => ({
                    ...p,
                    materialDeltaPercent: Number(e.target.value),
                  }))
                }
                className="w-full saffron-slider cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#87756E] tabular-nums">
                <span>−۱۰٪</span>
                <span>۰٪</span>
                <span>+۵۰٪</span>
                <span>+۱۰۰٪</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs gap-2">
                <label
                  htmlFor="sim-labor"
                  className="font-semibold text-[#2A1F1D]"
                >
                  تغییر هزینه دستمزد و سربار کارگاه
                </label>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="80"
                    step="1"
                    value={simParams.laborOverheadDeltaPercent}
                    onChange={(e) =>
                      setSimParams((p) => ({
                        ...p,
                        laborOverheadDeltaPercent: Math.min(
                          80,
                          Math.max(0, Number(e.target.value) || 0)
                        ),
                      }))
                    }
                    aria-label="درصد تغییر هزینه دستمزد و سربار"
                    className="w-16 h-7 px-1.5 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-center text-xs font-bold text-[#8C5A3C] tabular-nums"
                  />
                  <span className="font-bold text-[#8C5A3C]">٪</span>
                </div>
              </div>
              <input
                id="sim-labor"
                type="range"
                min="0"
                max="80"
                step="1"
                value={simParams.laborOverheadDeltaPercent}
                onChange={(e) =>
                  setSimParams((p) => ({
                    ...p,
                    laborOverheadDeltaPercent: Number(e.target.value),
                  }))
                }
                className="w-full saffron-slider cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#87756E] tabular-nums">
                <span>۰٪</span>
                <span>+۴۰٪</span>
                <span>+۸۰٪</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs gap-2">
                <label
                  htmlFor="sim-price"
                  className="font-semibold text-[#2A1F1D]"
                >
                  تغییر قیمت فروش محصولات
                </label>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={simParams.sellingPriceDeltaPercent}
                    onChange={(e) =>
                      setSimParams((p) => ({
                        ...p,
                        sellingPriceDeltaPercent: Math.min(
                          100,
                          Math.max(0, Number(e.target.value) || 0)
                        ),
                      }))
                    }
                    aria-label="درصد تغییر قیمت فروش محصولات"
                    className="w-16 h-7 px-1.5 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-center text-xs font-bold text-[#1F7A5A] tabular-nums"
                  />
                  <span className="font-bold text-[#1F7A5A]">٪</span>
                </div>
              </div>
              <input
                id="sim-price"
                type="range"
                min="0"
                max="100"
                step="1"
                value={simParams.sellingPriceDeltaPercent}
                onChange={(e) =>
                  setSimParams((p) => ({
                    ...p,
                    sellingPriceDeltaPercent: Number(e.target.value),
                  }))
                }
                className="w-full saffron-slider cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#87756E] tabular-nums">
                <span>۰٪</span>
                <span>+۵۰٪</span>
                <span>+۱۰۰٪</span>
              </div>
            </div>
          </div>

          {/* Before vs After Results */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 tabular-nums">
              <div className="rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] p-4 space-y-2">
                <div className="text-xs font-semibold text-[#6B5B56]">
                  وضعیت فعلی کارگاه (پیش از شبیه‌سازی)
                </div>
                <div className="text-xl font-extrabold text-[#2A1F1D]">
                  {formatCurrency(simulation.before.netMonthlyProfit, currency)}
                </div>
                <div className="text-xs text-[#6B5B56] space-y-1">
                  <div>
                    حاشیه سود خالص:{' '}
                    <strong className="text-[#2A1F1D]">
                      {formatPercent(simulation.before.netProfitMarginPercent)}
                    </strong>
                  </div>
                  <div>
                    درآمد ماهانه:{' '}
                    {formatCompactCurrency(
                      simulation.before.totalMonthlyRevenue,
                      currency
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`rounded-xl border p-4 space-y-2 ${
                  simulation.after.netMonthlyProfit >= 0
                    ? 'border-[#C6E6D9] bg-[#EFF8F4]'
                    : 'border-[#F0C8C8] bg-[#FDF2F2]'
                }`}
              >
                <div className="text-xs font-semibold text-[#4F403C]">
                  وضعیت شبیه‌سازی‌شده (پس از نوسان)
                </div>
                <div
                  className={`text-xl font-extrabold ${
                    simulation.after.netMonthlyProfit >= 0
                      ? 'text-[#1F7A5A]'
                      : 'text-[#C93B3B]'
                  }`}
                >
                  {formatCurrency(simulation.after.netMonthlyProfit, currency)}
                </div>
                <div className="text-xs text-[#4F403C] space-y-1">
                  <div>
                    حاشیه سود جدید:{' '}
                    <strong
                      className={
                        simulation.after.netProfitMarginPercent >= 15
                          ? 'text-[#1F7A5A]'
                          : 'text-[#C93B3B]'
                      }
                    >
                      {formatPercent(simulation.after.netProfitMarginPercent)}
                    </strong>{' '}
                    ({simulation.marginDelta >= 0 ? '+' : ''}
                    {formatPercent(simulation.marginDelta)})
                  </div>
                  <div>
                    تغییر سود ماهانه:{' '}
                    <strong
                      className={
                        simulation.profitDelta >= 0
                          ? 'text-[#1F7A5A]'
                          : 'text-[#C93B3B]'
                      }
                    >
                      {simulation.profitDelta >= 0 ? '+' : ''}
                      {formatCompactCurrency(simulation.profitDelta, currency)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Product Margin Impact Table */}
            <div className="overflow-x-auto border border-[#EAE4DC] rounded-xl">
              <table className="w-full text-right text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#EAE4DC] text-[#6B5B56]">
                    <th className="py-2.5 px-3">محصول</th>
                    <th className="py-2.5 px-3">حاشیه سود فعلی</th>
                    <th className="py-2.5 px-3">حاشیه سود شبیه‌سازی</th>
                    <th className="py-2.5 px-3">بهای تمام‌شده جدید</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE2]">
                  {simulation.after.productBreakdowns.map((afterP) => {
                    const beforeP = simulation.before.productBreakdowns.find(
                      (b) => b.productId === afterP.productId
                    );
                    return (
                      <tr key={afterP.productId}>
                        <td className="py-2 px-3 font-medium text-[#2A1F1D]">
                          {afterP.productName}
                        </td>
                        <td className="py-2 px-3 text-[#6B5B56]">
                          {formatPercent(beforeP?.profitMarginPercent ?? 0)}
                        </td>
                        <td
                          className={`py-2 px-3 font-bold ${
                            afterP.profitMarginPercent < 15
                              ? 'text-[#C93B3B]'
                              : 'text-[#1F7A5A]'
                          }`}
                        >
                          {formatPercent(afterP.profitMarginPercent)}
                        </td>
                        <td className="py-2 px-3 text-[#2A1F1D]">
                          {formatCurrency(afterP.totalUnitCost, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Row 3: Monthly Material Requirements Plan (Shopping List) */}
      <section
        aria-label="لیست خرید مواد اولیه ماهانه"
        className="bg-white rounded-2xl border border-[#EAE4DC] shadow-xs overflow-hidden"
      >
        <div className="p-5 border-b border-[#F0EAE2] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[#1F7A5A] text-xs font-semibold">
              <ShoppingBasket className="h-4 w-4" />
              <span>برنامه‌ریزی تدارکات (MRP)</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <h2 className="text-base font-bold text-[#2A1F1D]">
                لیست خرید مواد اولیه و بسته‌بندی ماهانه
              </h2>
              <HelpTooltip
                title="لیست خرید ماهانه کارگاه (MRP)"
                description="بر اساس برنامه پخت همه شیرینی‌ها، دقیقاً محاسبه می‌کند این ماه چند کیلو گرم آرد، کره، پسته و چند عدد جعبه باید بخرید. قیمت واحد هر قلم را همینجا می‌توانید مستقیم ویرایش کنید."
              />
            </div>
            <p className="text-xs text-[#6B5B56] mt-0.5">
              تجمیع خودکار مقادیر مورد نیاز برای کل برنامه تولید ماهانه با احتساب ضریب افت پخت و ضایعات
            </p>
          </div>
          <div className="text-left tabular-nums">
            <div className="text-xs text-[#87756E]">بودجه کل خرید ماهانه</div>
            <div className="text-lg font-extrabold text-[#C86D2D]">
              {formatCurrency(totalMrpBudget, currency)}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse tabular-nums">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EAE4DC] text-xs font-semibold text-[#6B5B56]">
                <th className="py-3 px-5">نام ماده / بسته‌بندی</th>
                <th className="py-3 px-4">دسته‌بندی</th>
                <th className="py-3 px-4">مقدار کل مورد نیاز</th>
                <th className="py-3 px-4">قیمت واحد ({currencyLabel})</th>
                <th className="py-3 px-5 text-left">بودجه خرید ماهانه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE2] text-sm">
              {effectiveMrpRows.map((row) => (
                <tr
                  key={row.ingredientId}
                  className="hover:bg-[#FCF9F5] transition-colors"
                >
                  <td className="py-3 px-5 font-medium text-[#2A1F1D]">
                    {row.name}
                  </td>
                  <td className="py-3 px-4 text-xs text-[#6B5B56]">
                    {row.category}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#2A1F1D]">
                    {formatNumber(row.totalQuantityRequired, 2)}{' '}
                    <span className="text-xs font-normal text-[#87756E]">
                      {PURCHASE_UNIT_LABELS[row.purchaseUnit]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-[#6B5B56]">
                    <input
                      type="number"
                      min="0"
                      step={currency === 'RIAL' ? '10000' : '1000'}
                      value={Math.round(row.unitPrice * multiplier)}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        onUpdateIngredientPrice(
                          row.ingredientId,
                          Math.round(val / multiplier)
                        );
                      }}
                      aria-label={`قیمت واحد ${row.name}`}
                      className="w-28 h-8 px-2 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs font-semibold text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
                    />
                  </td>
                  <td className="py-3 px-5 text-left font-bold text-[#2A1F1D]">
                    {formatCurrency(row.totalBudget, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#FAF8F5] border-t border-[#EAE4DC] font-extrabold text-sm">
                <td colSpan={4} className="py-3.5 px-5 text-[#2A1F1D]">
                  جمع کل بودجه تأمین مواد اولیه و بسته‌بندی ماهانه
                </td>
                <td className="py-3.5 px-5 text-left text-[#C86D2D]">
                  {formatCurrency(totalMrpBudget, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
};
