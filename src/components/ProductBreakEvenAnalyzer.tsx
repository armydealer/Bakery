import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
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
  ProductBreakEvenHorizon,
  ProductCostBreakdown,
  SALES_UNIT_LABELS,
} from '../types/workshop';
import {
  calculateAllProductsBreakEven,
  generateProductBreakEvenSeries,
} from '../utils/accounting';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  getCurrencyLabel,
  getCurrencyMultiplier,
} from '../utils/format';
import { HelpTooltip } from './HelpTooltip';

interface ProductBreakEvenAnalyzerProps {
  breakdowns: ProductCostBreakdown[];
  currency: CurrencyMode;
  onUpdateProductQuick?: (
    productId: string,
    patch: { sellingPrice?: number; monthlyVolume?: number }
  ) => void;
  className?: string;
}

const HORIZON_OPTIONS: Array<{
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

export const ProductBreakEvenAnalyzer: React.FC<
  ProductBreakEvenAnalyzerProps
> = ({ breakdowns, currency, onUpdateProductQuick, className = '' }) => {
  const reports = useMemo(
    () => calculateAllProductsBreakEven(breakdowns),
    [breakdowns]
  );

  const [selectedProductId, setSelectedProductId] = useState<string>(
    reports[0]?.productId ?? ''
  );
  const [activeHorizon, setActiveHorizon] =
    useState<ProductBreakEvenHorizon>('monthly');

  const multiplier = getCurrencyMultiplier(currency);
  const currencyLabel = getCurrencyLabel(currency);

  const selectedReport = useMemo(() => {
    return (
      reports.find((r) => r.productId === selectedProductId) ?? reports[0] ?? null
    );
  }, [reports, selectedProductId]);

  const cvpSeries = useMemo(() => {
    if (!selectedReport) return [];
    return generateProductBreakEvenSeries(selectedReport, activeHorizon);
  }, [selectedReport, activeHorizon]);

  if (!selectedReport) {
    return null;
  }

  const unitText = SALES_UNIT_LABELS[selectedReport.salesUnit];
  const activePeriod = selectedReport[activeHorizon];
  const activeHorizonMeta =
    HORIZON_OPTIONS.find((h) => h.key === activeHorizon) ?? HORIZON_OPTIONS[0];

  const periodCards = [
    {
      key: 'monthly' as const,
      title: 'نقطه سربه‌سر ماهانه',
      subtitle: 'بازه ۱ ماه (۳۰ روز)',
      icon: Calendar,
      data: selectedReport.monthly,
    },
    {
      key: 'quarterly' as const,
      title: 'نقطه سربه‌سر فصلی',
      subtitle: 'بازه ۳ ماه (۹۰ روز)',
      icon: CalendarDays,
      data: selectedReport.quarterly,
    },
    {
      key: 'annual' as const,
      title: 'نقطه سربه‌سر سالانه',
      subtitle: 'بازه ۱۲ ماه (۳۶۰ روز)',
      icon: CalendarRange,
      data: selectedReport.annual,
    },
  ];

  const formatDaysBadge = (days: number, totalDays: number) => {
    if (!Number.isFinite(days)) return 'دست‌نیافتنی با قیمت فعلی';
    const rounded = Math.ceil(days);
    if (rounded <= totalDays) {
      return `رسیدن به سربه‌سر در روز ${formatNumber(rounded)} از ${formatNumber(totalDays)}`;
    }
    return `نیاز به ${formatNumber(rounded)} روز فروش با روند فعلی`;
  };

  return (
    <section
      aria-label="تحلیل نقطه سربه‌سر ماهانه، فصلی و سالانه محصولات"
      className={`bg-white rounded-2xl border border-[#EAE4DC] p-5 sm:p-6 shadow-xs space-y-5 ${className}`}
    >
      {/* Header & Horizon Switcher */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[#C86D2D] text-xs font-semibold">
            <Scale className="h-4 w-4 shrink-0" />
            <span>تحلیل اختصاصی نقطه سربه‌سر به تفکیک هر محصول</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <h2 className="text-base font-bold text-[#2A1F1D]">
              تحلیل نقطه سربه‌سر ماهانه، فصلی و سالانه هر محصول
            </h2>
            <HelpTooltip
              title="نقطه سربه‌سر هر محصول چیست؟"
              description="مشخص می‌کند از هر شیرینی دقیقاً چند کیلو گرم یا عدد باید در یک ماه، یک فصل (۳ ماه) یا یک سال (۱۲ ماه) بفروشید تا تمام هزینه‌های مواد، بسته‌بندی، دستمزد و سهم سربار آن پوشش داده شود و از آن به بعد وارد سود خالص شوید."
            />
          </div>
          <p className="text-xs text-[#6B5B56] mt-0.5">
            هر محصول را انتخاب کنید تا نقطه سربه‌سر مقداری و ریالی آن در بازه‌های ماهانه، فصلی و سالانه همراه با نمودار درآمد در برابر هزینه نمایش داده شود
          </p>
        </div>

        <div
          role="group"
          aria-label="بازه زمانی نمودار نقطه سربه‌سر محصول"
          className="inline-flex items-center p-1 rounded-xl bg-[#F4EFE8] border border-[#EAE4DC] no-print"
        >
          {HORIZON_OPTIONS.map((opt) => (
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

      {/* Product Selector Bar */}
      <div className="space-y-2 no-print">
        <div className="text-xs font-semibold text-[#6B5B56]">
          انتخاب محصول برای تحلیل دقیق:
        </div>
        <div
          role="tablist"
          aria-label="انتخاب محصول برای تحلیل نقطه سربه‌سر"
          className="flex flex-wrap items-center gap-2"
        >
          {reports.map((rep) => {
            const isSelected = rep.productId === selectedReport.productId;
            const isHealthy = rep.monthly.isAboveBreakEven;
            return (
              <button
                key={rep.productId}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedProductId(rep.productId)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#FAF3EC] border-[#C86D2D] text-[#2A1F1D] shadow-xs'
                    : 'bg-[#FAF8F5] border-[#EAE4DC] text-[#4F403C] hover:border-[#D5C8BA]'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    !rep.hasPositiveContribution
                      ? 'bg-[#C93B3B]'
                      : isHealthy
                      ? 'bg-[#1F7A5A]'
                      : 'bg-[#C86D2D]'
                  }`}
                />
                <span>{rep.productName}</span>
                <span className="text-[11px] font-bold text-[#87756E] tabular-nums">
                  ({formatPercent(rep.monthly.coveragePercent, 0)})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Product Quick Economics + Inline Editable Price & Volume */}
      <div className="rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] p-4 flex flex-wrap items-center justify-between gap-4 tabular-nums">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-extrabold text-[#2A1F1D]">
              {selectedReport.productName}
            </span>
            <span className="text-xs text-[#87756E]">·</span>
            <span className="text-xs text-[#6B5B56]">
              حاشیه مشارکت هر {unitText}:{' '}
              <strong
                className={
                  selectedReport.hasPositiveContribution
                    ? 'text-[#1F7A5A]'
                    : 'text-[#C93B3B]'
                }
              >
                {formatCurrency(selectedReport.contributionMarginPerUnit, currency)} (
                {formatPercent(selectedReport.contributionMarginRatioPercent)})
              </strong>
            </span>
            <HelpTooltip
              size="xs"
              title="حاشیه مشارکت هر واحد چیست؟"
              description="تفاوت قیمت فروش و هزینه مستقیم (مواد اولیه، افت پخت، بسته‌بندی و دستمزد) هر واحد محصول است. هر کیلو گرم یا عددی که می‌فروشید، به اندازه این مبلغ کمک می‌کند تا سربار ثابت کارگاه پرداخت شود و بعد از آن سود خالص می‌سازد."
            />
          </div>
          <div className="text-[11px] text-[#6B5B56]">
            هزینه متغیر هر {unitText}:{' '}
            <strong className="text-[#4F403C]">
              {formatCurrency(selectedReport.variableCostPerUnit, currency)}
            </strong>{' '}
            · سهم سربار ماهانه اختصاص‌یافته:{' '}
            <strong className="text-[#4F403C]">
              {formatCurrency(selectedReport.monthly.allocatedFixedOverhead, currency)}
            </strong>
          </div>
        </div>

        {onUpdateProductQuick && (
          <div className="flex flex-wrap items-center gap-3 no-print">
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="be-product-price"
                className="text-[11px] font-semibold text-[#6B5B56] whitespace-nowrap"
              >
                قیمت فروش ({currencyLabel}):
              </label>
              <input
                id="be-product-price"
                type="number"
                min="0"
                step={currency === 'RIAL' ? '10000' : '1000'}
                value={Math.round(selectedReport.sellingPrice * multiplier)}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0);
                  onUpdateProductQuick(selectedReport.productId, {
                    sellingPrice: Math.round(val / multiplier),
                  });
                }}
                className="w-28 h-8 px-2.5 rounded-lg border border-[#DDD4C8] bg-white text-xs font-bold text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label
                htmlFor="be-product-volume"
                className="text-[11px] font-semibold text-[#6B5B56] whitespace-nowrap"
              >
                تیراژ ماهانه ({unitText}):
              </label>
              <input
                id="be-product-volume"
                type="number"
                min="0"
                step="5"
                value={selectedReport.monthlyVolume}
                onChange={(e) => {
                  onUpdateProductQuick(selectedReport.productId, {
                    monthlyVolume: Math.max(0, Number(e.target.value) || 0),
                  });
                }}
                className="w-20 h-8 px-2.5 rounded-lg border border-[#DDD4C8] bg-white text-xs font-bold text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Warning Banner if Contribution Margin <= 0 */}
      {!selectedReport.hasPositiveContribution && (
        <div className="rounded-xl border border-[#F2C6C6] bg-[#FDF2F2] p-3.5 flex items-start gap-2.5 text-xs text-[#A32929]">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-[#C93B3B]" />
          <span>
            قیمت فروش فعلی «{selectedReport.productName}» از هزینه متغیر مستقیم آن کمتر یا مساوی است؛ بنابراین با این قیمت، این محصول در هیچ تیراژی به نقطه سربه‌سر نمی‌رسد. قیمت فروش را بالاتر از{' '}
            <strong className="tabular-nums">
              {formatCurrency(selectedReport.variableCostPerUnit, currency)}
            </strong>{' '}
            تنظیم کنید.
          </span>
        </div>
      )}

      {/* 3 Horizon Cards: Monthly / Quarterly / Annual Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 tabular-nums">
        {periodCards.map((card) => {
          const Icon = card.icon;
          const isActive = activeHorizon === card.key;
          const pData = card.data;
          const totalDays = card.data.monthsCount * 30;
          const clampedBar = Math.min(100, Math.max(0, pData.coveragePercent));

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveHorizon(card.key)}
              className={`text-right rounded-xl border p-4 transition-all space-y-2.5 ${
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

              <div className="space-y-0.5">
                <div className="text-lg font-extrabold text-[#2A1F1D]">
                  {Number.isFinite(pData.breakEvenVolume)
                    ? `${formatNumber(pData.breakEvenVolume, 1)} ${unitText}`
                    : 'ناممکن (زیان مستقیم)'}
                </div>
                <div className="text-xs font-semibold text-[#C86D2D]">
                  فروش سربه‌سر:{' '}
                  {Number.isFinite(pData.breakEvenRevenue)
                    ? formatCompactCurrency(pData.breakEvenRevenue, currency)
                    : '—'}
                </div>
              </div>

              {/* Coverage Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span
                    className={`font-semibold inline-flex items-center gap-1 ${
                      pData.isAboveBreakEven
                        ? 'text-[#1F7A5A]'
                        : 'text-[#C93B3B]'
                    }`}
                  >
                    {pData.isAboveBreakEven ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    )}
                    {pData.isAboveBreakEven
                      ? `پوشش ${formatPercent(pData.coveragePercent, 0)}`
                      : `کسری ${formatNumber(Math.abs(pData.unitsDeltaFromBreakEven), 1)} ${unitText}`}
                  </span>
                  <span className="text-[#6B5B56]">
                    برنامه: {formatNumber(pData.plannedVolume, 0)} {unitText}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#EAE4DC] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      pData.isAboveBreakEven ? 'bg-[#1F7A5A]' : 'bg-[#C86D2D]'
                    }`}
                    style={{ width: `${clampedBar}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#EAE4DC]/80 flex items-center justify-between text-[11px] text-[#6B5B56]">
                <span>{formatDaysBadge(pData.daysToBreakEven, totalDays)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive CVP Break-Even Chart for Selected Product & Horizon */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold text-[#2A1F1D]">
            نمودار نقطه سربه‌سر «{selectedReport.productName}» —{' '}
            <span className="text-[#C86D2D]">{activeHorizonMeta.fullLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#4F403C]">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1F7A5A]" />
              درآمد فروش محصول
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

        <div className="h-[290px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={cvpSeries}
              margin={{ top: 18, right: 20, left: 12, bottom: 20 }}
            >
              <defs>
                <linearGradient
                  id="prodBreakEvenRevFill"
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
                  value: `حجم فروش دوره (${unitText})`,
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
                tickFormatter={(v: number) => formatCompactCurrency(v, currency)}
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
                        فروش {formatNumber(pt.volume, 1)} {unitText} ({activeHorizonMeta.shortLabel})
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
                        <span>{formatCurrency(pt.fixedOverhead, currency)}</span>
                      </div>
                      <div className="flex justify-between gap-4 pt-1 border-t border-[#F0EAE2] font-extrabold">
                        <span className="text-[#6B5B56]">سود / زیان خالص:</span>
                        <span
                          className={
                            pt.profit >= 0 ? 'text-[#1F7A5A]' : 'text-[#C93B3B]'
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
                    value: `برنامه فعلی: ${formatNumber(activePeriod.plannedVolume, 0)}`,
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
                name="درآمد فروش محصول"
                stroke="#1F7A5A"
                strokeWidth={2.5}
                fill="url(#prodBreakEvenRevFill)"
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

      {/* All-Products Monthly / Quarterly / Annual Break-Even Comparative Table */}
      <div className="pt-4 border-t border-[#F0EAE2] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-[#2A1F1D]">
              جدول جامع نقطه سربه‌سر ماهانه، فصلی و سالانه تمامی محصولات
            </h3>
            <HelpTooltip
              size="xs"
              title="جدول مقایسه سربه‌سر تمام محصولات"
              description="با کلیک روی ردیف هر شیرینی می‌توانید نمودار نقطه سربه‌سر اختصاصی آن را در بالا مشاهده کنید. برای هر محصول، حداقل میزان فروش لازم در ماه، فصل و سال هم به مقدار (کیلو گرم/عدد) و هم به تومان/ریال آورده شده است."
            />
          </div>
          <span className="text-[11px] text-[#87756E] no-print">
            برای نمایش نمودار، روی ردیف هر محصول کلیک کنید
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse tabular-nums">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EAE4DC] text-[#6B5B56] font-semibold">
                <th className="py-3 px-3 whitespace-nowrap">محصول</th>
                <th className="py-3 px-2.5 whitespace-nowrap">
                  حاشیه مشارکت واحد
                </th>
                <th className="py-3 px-2.5 whitespace-nowrap">
                  سربه‌سر ماهانه (۱ ماه)
                </th>
                <th className="py-3 px-2.5 whitespace-nowrap">
                  سربه‌سر فصلی (۳ ماه)
                </th>
                <th className="py-3 px-2.5 whitespace-nowrap">
                  سربه‌سر سالانه (۱۲ ماه)
                </th>
                <th className="py-3 px-2.5 whitespace-nowrap">حاشیه ایمنی</th>
                <th className="py-3 px-3 whitespace-nowrap text-left">
                  وضعیت پوشش
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE2]">
              {reports.map((rep) => {
                const isSelected = rep.productId === selectedReport.productId;
                const u = SALES_UNIT_LABELS[rep.salesUnit];
                return (
                  <tr
                    key={rep.productId}
                    onClick={() => setSelectedProductId(rep.productId)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#FFF7EF]'
                        : 'hover:bg-[#FCF9F5]'
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-[#2A1F1D] whitespace-nowrap">
                      <div>{rep.productName}</div>
                      <div className="text-[11px] font-normal text-[#87756E]">
                        برنامه: {formatNumber(rep.monthlyVolume)} {u}/ماه
                      </div>
                    </td>
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <div
                        className={`font-bold ${
                          rep.hasPositiveContribution
                            ? 'text-[#1F7A5A]'
                            : 'text-[#C93B3B]'
                        }`}
                      >
                        {formatCompactCurrency(
                          rep.contributionMarginPerUnit,
                          currency
                        )}
                      </div>
                      <div className="text-[11px] text-[#87756E]">
                        {formatPercent(rep.contributionMarginRatioPercent)} فروش
                      </div>
                    </td>
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <div className="font-bold text-[#2A1F1D]">
                        {Number.isFinite(rep.monthly.breakEvenVolume)
                          ? `${formatNumber(rep.monthly.breakEvenVolume, 1)} ${u}`
                          : '—'}
                      </div>
                      <div className="text-[11px] text-[#6B5B56]">
                        {Number.isFinite(rep.monthly.breakEvenRevenue)
                          ? formatCompactCurrency(
                              rep.monthly.breakEvenRevenue,
                              currency
                            )
                          : 'ناممکن'}
                      </div>
                    </td>
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <div className="font-bold text-[#2A1F1D]">
                        {Number.isFinite(rep.quarterly.breakEvenVolume)
                          ? `${formatNumber(rep.quarterly.breakEvenVolume, 1)} ${u}`
                          : '—'}
                      </div>
                      <div className="text-[11px] text-[#6B5B56]">
                        {Number.isFinite(rep.quarterly.breakEvenRevenue)
                          ? formatCompactCurrency(
                              rep.quarterly.breakEvenRevenue,
                              currency
                            )
                          : 'ناممکن'}
                      </div>
                    </td>
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <div className="font-bold text-[#C86D2D]">
                        {Number.isFinite(rep.annual.breakEvenVolume)
                          ? `${formatNumber(rep.annual.breakEvenVolume, 1)} ${u}`
                          : '—'}
                      </div>
                      <div className="text-[11px] text-[#6B5B56]">
                        {Number.isFinite(rep.annual.breakEvenRevenue)
                          ? formatCompactCurrency(
                              rep.annual.breakEvenRevenue,
                              currency
                            )
                          : 'ناممکن'}
                      </div>
                    </td>
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <span
                        className={`font-bold ${
                          rep.monthly.marginOfSafetyPercent >= 30
                            ? 'text-[#1F7A5A]'
                            : rep.monthly.marginOfSafetyPercent >= 0
                            ? 'text-[#C86D2D]'
                            : 'text-[#C93B3B]'
                        }`}
                      >
                        {rep.hasPositiveContribution
                          ? formatPercent(rep.monthly.marginOfSafetyPercent)
                          : 'منفی'}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-left">
                      <span
                        className={`font-extrabold ${
                          rep.monthly.isAboveBreakEven
                            ? 'text-[#1F7A5A]'
                            : 'text-[#C93B3B]'
                        }`}
                      >
                        {rep.monthly.isAboveBreakEven
                          ? `عبور (${formatPercent(rep.monthly.coveragePercent, 0)})`
                          : 'زیر سربه‌سر'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
