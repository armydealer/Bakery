import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Flame,
  Scale,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CurrencyMode,
  Product,
  ProductBreakEvenHorizon,
  ProductCostBreakdown,
  SALES_UNIT_LABELS,
} from '../types/workshop';
import {
  calculateDedicatedProductBreakEven,
  generateProductBreakEvenSeries,
} from '../utils/accounting';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../utils/format';
import { HelpTooltip } from './HelpTooltip';

interface DedicatedProductAnalysisProps {
  product: Product;
  breakdown: ProductCostBreakdown;
  currency: CurrencyMode;
  onUpdateMonthlyVolume: (newMonthlyVolume: number) => void;
}

const HORIZON_META: Array<{
  key: ProductBreakEvenHorizon;
  shortLabel: string;
  fullLabel: string;
  daysTotal: number;
}> = [
  {
    key: 'monthly',
    shortLabel: 'ماهانه (۱ ماه)',
    fullLabel: 'نقطه سربه‌سر ماهانه (۱ ماهه)',
    daysTotal: 30,
  },
  {
    key: 'quarterly',
    shortLabel: 'فصلی (۳ ماه)',
    fullLabel: 'نقطه سربه‌سر فصلی (۳ ماهه)',
    daysTotal: 90,
  },
  {
    key: 'annual',
    shortLabel: 'سالانه (۱۲ ماه)',
    fullLabel: 'نقطه سربه‌سر سالانه (۱۲ ماهه)',
    daysTotal: 360,
  },
];

export const DedicatedProductAnalysis: React.FC<
  DedicatedProductAnalysisProps
> = ({ product, breakdown, currency, onUpdateMonthlyVolume }) => {
  const [activeHorizon, setActiveHorizon] =
    useState<ProductBreakEvenHorizon>('monthly');

  const analysis = useMemo(
    () => calculateDedicatedProductBreakEven(breakdown, product.batchYield),
    [breakdown, product.batchYield]
  );

  const { report } = analysis;
  const unitText = SALES_UNIT_LABELS[product.salesUnit];

  const cvpSeries = useMemo(
    () => generateProductBreakEvenSeries(report, activeHorizon),
    [report, activeHorizon]
  );

  const activePeriod = report[activeHorizon];
  const activeHorizonInfo =
    HORIZON_META.find((h) => h.key === activeHorizon) ?? HORIZON_META[0];

  const sliderMax = Math.max(
    300,
    Math.ceil((product.monthlyVolume * 2.2) / 10) * 10
  );

  const horizonCards = [
    {
      key: 'monthly' as const,
      title: 'نقطه سربه‌سر ماهانه',
      subtitle: 'بازه ۱ ماه (۳۰ روز)',
      icon: Calendar,
      data: report.monthly,
      plannedBatches: analysis.batchesPerMonth,
      breakEvenBatches: analysis.breakEvenBatchesMonthly,
    },
    {
      key: 'quarterly' as const,
      title: 'نقطه سربه‌سر فصلی',
      subtitle: 'بازه ۳ ماه (۹۰ روز)',
      icon: CalendarDays,
      data: report.quarterly,
      plannedBatches: analysis.batchesPerQuarter,
      breakEvenBatches: analysis.breakEvenBatchesQuarterly,
    },
    {
      key: 'annual' as const,
      title: 'نقطه سربه‌سر سالانه',
      subtitle: 'بازه ۱۲ ماه (۳۶۰ روز)',
      icon: CalendarRange,
      data: report.annual,
      plannedBatches: analysis.batchesPerYear,
      breakEvenBatches: analysis.breakEvenBatchesAnnual,
    },
  ];

  const formatDaysNote = (days: number, totalDays: number) => {
    if (!analysis.hasProductionVolume) return 'حجم تولید ماهانه ثبت نشده';
    if (!Number.isFinite(days)) return 'با قیمت فعلی به سربه‌سر نمی‌رسد';
    const d = Math.ceil(days);
    if (d <= totalDays) {
      return `رسیدن به سربه‌سر در روز ${formatNumber(d)} از ${formatNumber(totalDays)}`;
    }
    return `نیازمند ${formatNumber(d)} روز فروش با تیراژ فعلی`;
  };

  return (
    <section
      aria-label="تحلیل اختصاصی محصول"
      className="bg-white rounded-2xl border border-[#EAE4DC] p-5 sm:p-6 shadow-xs space-y-5"
    >
      {/* Header & Chart Horizon Switcher */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[#C86D2D] text-xs font-semibold">
            <Scale className="h-4 w-4 shrink-0" />
            <span>تحلیل اختصاصی محصول بر اساس حجم تولید و دستور پخت همین قلم</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <h2 className="text-base font-bold text-[#2A1F1D]">
              تحلیل اختصاصی محصول: {product.name}
            </h2>
            <HelpTooltip
              title="بخش تحلیل اختصاصی محصول چیست؟"
              description="این بخش فقط روی همین شیرینی انتخاب‌شده تمرکز می‌کند و با توجه به حجم تولید ماهانه، خروجی هر بچ، قیمت فروش و سهم سربار این محصول، محاسبه می‌کند در هر ماه، هر فصل (۳ ماه) و هر سال (۱۲ ماه) دقیقاً چند کیلو گرم یا چند عدد و چند بچ پخت برای رسیدن به نقطه سربه‌سر لازم است."
            />
          </div>
          <p className="text-xs text-[#6B5B56] mt-0.5">
            محاسبه زنده نقطه سربه‌سر ماهانه، فصلی و سالانه «{product.name}» متناسب با حجم تولید و ساختار هزینه فعلی آن
          </p>
        </div>

        <div
          role="group"
          aria-label="بازه نمودار تحلیل اختصاصی محصول"
          className="inline-flex items-center p-1 rounded-xl bg-[#F4EFE8] border border-[#EAE4DC]"
        >
          {HORIZON_META.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setActiveHorizon(opt.key)}
              aria-pressed={activeHorizon === opt.key}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeHorizon === opt.key
                  ? 'bg-white text-[#C86D2D] shadow-xs'
                  : 'text-[#6B5B56] hover:text-[#2A1F1D]'
              }`}
            >
              {opt.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Product Production Volume Control & Key Unit Economics */}
      <div className="rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Volume Slider + Direct Input */}
          <div className="lg:col-span-6 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#2A1F1D]">
                <Flame className="h-4 w-4 text-[#C86D2D]" />
                <label htmlFor="dedicated-product-volume-slider">
                  حجم تولید ماهانه این محصول ({unitText})
                </label>
                <HelpTooltip
                  size="xs"
                  title="اثر حجم تولید همین محصول بر نقطه سربه‌سر"
                  description="با کم یا زیاد کردن حجم تولید ماهانه این شیرینی، تعداد بچ‌های پخت، سهم سربار جذب‌شده، درصد پوشش نقطه سربه‌سر و حاشیه ایمنی در بازه‌های ماهانه، فصلی و سالانه بلافاصله به‌روز می‌شود."
                />
              </div>
              <div className="flex items-center gap-1.5 tabular-nums">
                <input
                  id="dedicated-product-volume-input"
                  type="number"
                  min={0}
                  step={5}
                  value={product.monthlyVolume}
                  onChange={(e) =>
                    onUpdateMonthlyVolume(Math.max(0, Number(e.target.value) || 0))
                  }
                  aria-label={`حجم تولید ماهانه ${product.name}`}
                  className="w-24 h-8 px-2.5 rounded-lg border border-[#DDD4C8] bg-white text-center text-xs font-extrabold text-[#C86D2D] focus:outline-none focus:border-[#C86D2D]"
                />
                <span className="text-xs font-semibold text-[#6B5B56]">
                  {unitText}/ماه
                </span>
              </div>
            </div>

            <input
              id="dedicated-product-volume-slider"
              type="range"
              min={0}
              max={sliderMax}
              step={5}
              value={Math.min(sliderMax, product.monthlyVolume)}
              onChange={(e) => onUpdateMonthlyVolume(Number(e.target.value))}
              aria-label={`اسلایدر حجم تولید ماهانه ${product.name}`}
              className="w-full saffron-slider cursor-pointer"
            />

            <div className="flex items-center justify-between text-[11px] text-[#87756E] tabular-nums">
              <span>۰ {unitText}</span>
              <span>
                میانگین روزانه: {formatNumber(analysis.dailyPlannedVolume, 1)}{' '}
                {unitText}/روز
              </span>
              <span>
                {formatNumber(sliderMax, 0)} {unitText}
              </span>
            </div>
          </div>

          {/* 3 Compact Unit Economics Stats */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 lg:pt-0 lg:pr-4 lg:border-r lg:border-[#EAE4DC] tabular-nums">
            <div className="rounded-xl bg-white border border-[#EAE4DC] px-3 py-2.5 space-y-0.5">
              <div className="text-[11px] text-[#6B5B56]">تعداد بچ تولید ماهانه</div>
              <div className="text-sm font-extrabold text-[#2A1F1D]">
                {formatNumber(analysis.batchesPerMonth, 1)} بچ
              </div>
              <div className="text-[11px] text-[#87756E]">
                خروجی هر بچ: {formatNumber(analysis.batchYield, 1)} {unitText}
              </div>
            </div>

            <div className="rounded-xl bg-white border border-[#EAE4DC] px-3 py-2.5 space-y-0.5">
              <div className="text-[11px] text-[#6B5B56]">حاشیه مشارکت واحد</div>
              <div
                className={`text-sm font-extrabold ${
                  report.hasPositiveContribution
                    ? 'text-[#1F7A5A]'
                    : 'text-[#C93B3B]'
                }`}
              >
                {formatCompactCurrency(report.contributionMarginPerUnit, currency)}
              </div>
              <div className="text-[11px] text-[#87756E]">
                {formatPercent(report.contributionMarginRatioPercent)} قیمت فروش
              </div>
            </div>

            <div className="rounded-xl bg-white border border-[#EAE4DC] px-3 py-2.5 space-y-0.5">
              <div className="text-[11px] text-[#6B5B56]">سهم سربار ماهانه</div>
              <div className="text-sm font-extrabold text-[#2A1F1D]">
                {formatCompactCurrency(
                  report.monthly.allocatedFixedOverhead,
                  currency
                )}
              </div>
              <div className="text-[11px] text-[#87756E]">
                سربار هر {unitText}:{' '}
                {formatCompactCurrency(report.overheadCostPerUnit, currency)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edge-Case Alerts */}
      {!analysis.hasProductionVolume && (
        <div className="rounded-xl border border-[#E6D5C8] bg-[#FAF3EC] p-3.5 flex items-start gap-2.5 text-xs text-[#8C4A1C]">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-[#C86D2D]" />
          <span>
            حجم تولید ماهانه «{product.name}» در حال حاضر صفر است. برای محاسبه دقیق سهم سربار و نقطه سربه‌سر ماهانه، فصلی و سالانه، تیراژ تولید ماهانه این محصول را بزرگ‌تر از صفر تنظیم کنید.
          </span>
        </div>
      )}

      {analysis.hasProductionVolume && !report.hasPositiveContribution && (
        <div className="rounded-xl border border-[#F2C6C6] bg-[#FDF2F2] p-3.5 flex items-start gap-2.5 text-xs text-[#A32929]">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-[#C93B3B]" />
          <span>
            قیمت فروش فعلی «{product.name}» کمتر یا مساوی هزینه مستقیم هر {unitText} (
            <strong className="tabular-nums">
              {formatCurrency(report.variableCostPerUnit, currency)}
            </strong>
            ) است؛ بنابراین با این قیمت، محصول در هیچ حجمی به نقطه سربه‌سر نمی‌رسد.
          </span>
        </div>
      )}

      {/* 3 Horizon Cards: Monthly / Quarterly / Annual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 tabular-nums">
        {horizonCards.map((card) => {
          const Icon = card.icon;
          const isActive = activeHorizon === card.key;
          const pData = card.data;
          const totalDays = pData.monthsCount * 30;
          const barPct = Math.min(100, Math.max(0, pData.coveragePercent));

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveHorizon(card.key)}
              className={`text-right rounded-xl border p-4 transition-all space-y-3 ${
                isActive
                  ? 'border-[#C86D2D] bg-[#FFFBF7] shadow-xs ring-1 ring-[#C86D2D]/20'
                  : 'border-[#EAE4DC] bg-[#FAF8F5] hover:border-[#D5C8BA]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-[#C86D2D]' : 'text-[#6B5B56]'
                    }`}
                  />
                  <span className="text-xs font-bold text-[#2A1F1D]">
                    {card.title}
                  </span>
                </div>
                <span className="text-[11px] text-[#87756E]">{card.subtitle}</span>
              </div>

              <div className="space-y-1">
                <div className="text-xl font-extrabold text-[#2A1F1D]">
                  {!analysis.hasProductionVolume
                    ? `۰ ${unitText}`
                    : Number.isFinite(pData.breakEvenVolume)
                    ? `${formatNumber(pData.breakEvenVolume, 1)} ${unitText}`
                    : 'ناممکن (زیان مستقیم)'}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#C86D2D]">
                    فروش سربه‌سر:{' '}
                    {!analysis.hasProductionVolume
                      ? '—'
                      : Number.isFinite(pData.breakEvenRevenue)
                      ? formatCompactCurrency(pData.breakEvenRevenue, currency)
                      : '—'}
                  </span>
                  <span className="text-[11px] text-[#6B5B56]">
                    {analysis.hasProductionVolume &&
                    Number.isFinite(card.breakEvenBatches)
                      ? `معادل ${formatNumber(card.breakEvenBatches, 1)} بچ`
                      : ''}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span
                    className={`font-bold inline-flex items-center gap-1 ${
                      analysis.hasProductionVolume && pData.isAboveBreakEven
                        ? 'text-[#1F7A5A]'
                        : 'text-[#C93B3B]'
                    }`}
                  >
                    {analysis.hasProductionVolume && pData.isAboveBreakEven ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    )}
                    {!analysis.hasProductionVolume
                      ? 'بدون تولید'
                      : pData.isAboveBreakEven
                      ? `پوشش ${formatPercent(pData.coveragePercent, 0)}`
                      : `کسری ${formatNumber(Math.abs(pData.unitsDeltaFromBreakEven), 1)} ${unitText}`}
                  </span>
                  <span className="text-[#6B5B56]">
                    تولید دوره: {formatNumber(pData.plannedVolume, 0)} {unitText}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#EAE4DC] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      analysis.hasProductionVolume && pData.isAboveBreakEven
                        ? 'bg-[#1F7A5A]'
                        : 'bg-[#C86D2D]'
                    }`}
                    style={{
                      width: `${analysis.hasProductionVolume ? barPct : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#EAE4DC]/80 space-y-1 text-[11px] text-[#6B5B56]">
                <div className="flex items-center justify-between">
                  <span>سود خالص پیش‌بینی دوره:</span>
                  <strong
                    className={
                      pData.projectedProfit >= 0
                        ? 'text-[#1F7A5A]'
                        : 'text-[#C93B3B]'
                    }
                  >
                    {formatCompactCurrency(pData.projectedProfit, currency)}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>{formatDaysNote(pData.daysToBreakEven, totalDays)}</span>
                  <span className="font-semibold text-[#4F403C]">
                    حاشیه ایمنی:{' '}
                    {analysis.hasProductionVolume &&
                    report.hasPositiveContribution
                      ? formatPercent(pData.marginOfSafetyPercent)
                      : '—'}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Product CVP Break-Even Chart */}
      {analysis.hasProductionVolume && (
        <div className="space-y-3 pt-2 border-t border-[#F0EAE2]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-bold text-[#2A1F1D]">
              نمودار تلاقی درآمد و هزینه «{product.name}» —{' '}
              <span className="text-[#C86D2D]">
                {activeHorizonInfo.fullLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#4F403C]">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1F7A5A]" />
                درآمد فروش
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-[#C86D2D]" />
                بهای تمام‌شده کل
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-0.5 w-4 border-t-2 border-dashed border-[#8C5A3C]" />
                سهم سربار ثابت دوره
              </span>
            </div>
          </div>

          <div className="h-[275px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={cvpSeries}
                margin={{ top: 18, right: 20, left: 12, bottom: 20 }}
              >
                <defs>
                  <linearGradient
                    id="dedicatedProductRevFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#1F7A5A" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="#1F7A5A" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#EFE9E1"
                  vertical={false}
                />
                <XAxis
                  dataKey="volume"
                  type="number"
                  domain={[0, 'dataMax']}
                  tick={{ fill: '#4F403C', fontSize: 11 }}
                  axisLine={{ stroke: '#EAE4DC' }}
                  tickLine={false}
                  tickFormatter={(v: number) => formatNumber(v, 0)}
                  label={{
                    value: `حجم تولید و فروش دوره (${unitText})`,
                    position: 'insideBottom',
                    offset: -12,
                    fill: '#6B5B56',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  tick={{ fill: '#6B5B56', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={88}
                  tickFormatter={(v: number) =>
                    formatCompactCurrency(v, currency)
                  }
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const pt = payload[0].payload as (typeof cvpSeries)[number];
                    return (
                      <div
                        dir="rtl"
                        className="bg-white border border-[#EAE4DC] rounded-xl p-3.5 shadow-md text-xs space-y-1.5 min-w-[230px] tabular-nums"
                      >
                        <div className="font-bold text-[#2A1F1D] border-b border-[#F0EAE2] pb-1.5">
                          تولید {formatNumber(pt.volume, 1)} {unitText} (
                          {activeHorizonInfo.shortLabel})
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-[#6B5B56]">درآمد فروش:</span>
                          <span className="font-semibold text-[#1F7A5A]">
                            {formatCurrency(pt.revenue, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-[#6B5B56]">بهای تمام‌شده کل:</span>
                          <span className="font-semibold text-[#C86D2D]">
                            {formatCurrency(pt.totalCost, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-[11px] text-[#87756E]">
                          <span>سهم سربار ثابت دوره:</span>
                          <span>
                            {formatCurrency(pt.fixedOverhead, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 pt-1 border-t border-[#F0EAE2] font-extrabold">
                          <span className="text-[#6B5B56]">سود / زیان خالص:</span>
                          <span
                            className={
                              pt.profit >= 0
                                ? 'text-[#1F7A5A]'
                                : 'text-[#C93B3B]'
                            }
                          >
                            {formatCurrency(pt.profit, currency)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                {Number.isFinite(activePeriod.breakEvenVolume) &&
                  activePeriod.breakEvenVolume > 0 && (
                    <ReferenceLine
                      x={Math.round(activePeriod.breakEvenVolume * 10) / 10}
                      stroke="#C86D2D"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `سربه‌سر: ${formatNumber(activePeriod.breakEvenVolume, 1)}`,
                        position: 'top',
                        fill: '#C86D2D',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    />
                  )}
                {activePeriod.plannedVolume > 0 && (
                  <ReferenceLine
                    x={activePeriod.plannedVolume}
                    stroke="#1F7A5A"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    label={{
                      value: `تولید فعلی: ${formatNumber(activePeriod.plannedVolume, 0)}`,
                      position: 'insideTopRight',
                      fill: '#1F7A5A',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="درآمد فروش"
                  stroke="#1F7A5A"
                  strokeWidth={2.5}
                  fill="url(#dedicatedProductRevFill)"
                  animationDuration={200}
                />
                <Line
                  type="monotone"
                  dataKey="totalCost"
                  name="بهای تمام‌شده کل"
                  stroke="#C86D2D"
                  strokeWidth={2.5}
                  dot={false}
                  animationDuration={200}
                />
                <Line
                  type="monotone"
                  dataKey="fixedOverhead"
                  name="سهم سربار ثابت"
                  stroke="#8C5A3C"
                  strokeWidth={1.8}
                  strokeDasharray="5 4"
                  dot={false}
                  animationDuration={200}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
};
