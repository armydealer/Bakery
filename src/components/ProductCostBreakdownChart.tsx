import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CurrencyMode,
  ProductCostBreakdown,
  SALES_UNIT_LABELS,
} from '../types/workshop';
import { calculateProductCostProductivity } from '../utils/accounting';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../utils/format';
import { HelpTooltip } from './HelpTooltip';

interface ProductCostBreakdownChartProps {
  breakdowns: ProductCostBreakdown[];
  currency: CurrencyMode;
  defaultLayoutMode?: 'stacked' | 'grouped';
  showProductivityStrip?: boolean;
  className?: string;
}

const COST_PILLARS = [
  { key: 'materials', label: 'مواد اولیه (با افت پخت)', color: '#C86D2D' },
  { key: 'packaging', label: 'بسته‌بندی', color: '#8C5A3C' },
  { key: 'labor', label: 'دستمزد مستقیم', color: '#1F7A5A' },
  { key: 'overhead', label: 'سربار تولید', color: '#5A6B7C' },
] as const;

export const ProductCostBreakdownChart: React.FC<
  ProductCostBreakdownChartProps
> = ({
  breakdowns,
  currency,
  defaultLayoutMode = 'stacked',
  showProductivityStrip = false,
  className = '',
}) => {
  const [basis, setBasis] = useState<'unit' | 'percent' | 'monthly'>('unit');
  const [layoutMode, setLayoutMode] = useState<'stacked' | 'grouped'>(
    defaultLayoutMode
  );

  const productivityItems = useMemo(
    () => calculateProductCostProductivity(breakdowns),
    [breakdowns]
  );

  const productivityMap = useMemo(() => {
    const map = new Map<string, (typeof productivityItems)[number]>();
    productivityItems.forEach((item) => map.set(item.productId, item));
    return map;
  }, [productivityItems]);

  const effectiveLayoutMode = basis === 'percent' ? 'stacked' : layoutMode;

  const chartData = useMemo(
    () =>
      breakdowns.map((p) => {
        const words = p.productName.split(' ');
        const shortName =
          words.length > 2 ? `${words[0]} ${words[1]}` : p.productName;
        const isMonthly = basis === 'monthly';
        const rawMaterial = Math.round(
          isMonthly ? p.monthlyMaterialCost : p.rawMaterialCostPerUnit
        );
        const wastage = Math.round(
          isMonthly ? p.monthlyWastageCost : p.wastageCostPerUnit
        );
        const materialsAmt = rawMaterial + wastage;
        const packagingAmt = Math.round(
          isMonthly ? p.monthlyPackagingCost : p.packagingCostPerUnit
        );
        const laborAmt = Math.round(
          isMonthly ? p.monthlyLaborCost : p.directLaborCostPerUnit
        );
        const overheadAmt = Math.round(
          isMonthly ? p.monthlyOverheadCost : p.overheadCostPerUnit
        );
        const totalAmt = materialsAmt + packagingAmt + laborAmt + overheadAmt;

        const isPercent = basis === 'percent';
        const prodMeta = productivityMap.get(p.productId);

        return {
          id: p.productId,
          name: p.productName,
          shortName,
          unitLabel: SALES_UNIT_LABELS[p.salesUnit],
          rawMaterial,
          wastage,
          materials: isPercent
            ? Number((prodMeta?.materialsSharePercent ?? 0).toFixed(1))
            : materialsAmt,
          packaging: isPercent
            ? Number((prodMeta?.packagingSharePercent ?? 0).toFixed(1))
            : packagingAmt,
          labor: isPercent
            ? Number((prodMeta?.laborSharePercent ?? 0).toFixed(1))
            : laborAmt,
          overhead: isPercent
            ? Number((prodMeta?.overheadSharePercent ?? 0).toFixed(1))
            : overheadAmt,
          materialsAmt,
          packagingAmt,
          laborAmt,
          overheadAmt,
          totalAmt,
          sellingPrice: p.sellingPrice,
          profitMarginPercent: p.profitMarginPercent,
          revenuePerCostRatio: prodMeta?.revenuePerCostRatio ?? 0,
          productivityLabel: prodMeta?.productivityLabel ?? 'بهره‌وری متوسط',
          productivityTone: prodMeta?.productivityTone ?? 'warning',
        };
      }),
    [breakdowns, basis, productivityMap]
  );

  return (
    <section
      aria-label="نمودار ستونی انباشته تفکیک بهای تمام‌شده و بهره‌وری محصولات"
      className={`bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-4 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-[#2A1F1D]">
              {effectiveLayoutMode === 'stacked'
                ? 'نمودار ستونی انباشته تفکیک بهای تمام‌شده و بهره‌وری محصولات'
                : 'نمودار ستونی مقایسه‌ای تفکیک بهای تمام‌شده تمام محصولات'}
            </h2>
            <HelpTooltip
              title="نمودار ستونی انباشته و بهره‌وری محصول"
              description="هر ستون نشان می‌دهد کل بهای تمام‌شده هر شیرینی از چه بخش‌هایی ساخته شده (مواد اولیه، بسته‌بندی، دستمزد و سربار). در حالت «سهم درصدی ۱۰۰٪» می‌توانید دقیق ببینید کدام محصول بیشتر درگیر مواد اولیه است و کدام یک دستمزد یا سربار سنگینی دارد تا بهره‌وری هر محصول مشخص شود."
            />
          </div>
          <p className="text-xs text-[#6B5B56] mt-0.5">
            {basis === 'unit'
              ? 'تفکیک بهای تمام‌شده هر کیلو گرم یا عدد از تمام محصولات به تفکیک مواد اولیه، بسته‌بندی، دستمزد و سربار'
              : basis === 'percent'
              ? 'مقایسه ۱۰۰ درصدی ساختار هزینه هر محصول برای تشخیص گلوگاه هزینه و بهره‌وری تولید'
              : 'مقایسه بودجه کل ماهانه هر جزء هزینه در تمام محصولات کارگاه'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {basis !== 'percent' && (
            <div
              role="group"
              aria-label="حالت نمایش ستون‌ها"
              className="inline-flex items-center p-1 rounded-xl bg-[#F4EFE8] border border-[#EAE4DC]"
            >
              <button
                type="button"
                onClick={() => setLayoutMode('stacked')}
                aria-pressed={layoutMode === 'stacked'}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  layoutMode === 'stacked'
                    ? 'bg-white text-[#C86D2D] shadow-xs'
                    : 'text-[#6B5B56] hover:text-[#2A1F1D]'
                }`}
              >
                ستونی انباشته
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('grouped')}
                aria-pressed={layoutMode === 'grouped'}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  layoutMode === 'grouped'
                    ? 'bg-white text-[#C86D2D] shadow-xs'
                    : 'text-[#6B5B56] hover:text-[#2A1F1D]'
                }`}
              >
                مقایسه‌ای کنارهم
              </button>
            </div>
          )}

          <div
            role="group"
            aria-label="مبنای نمایش نمودار هزینه محصولات"
            className="inline-flex items-center p-1 rounded-xl bg-[#F4EFE8] border border-[#EAE4DC]"
          >
            <button
              type="button"
              onClick={() => setBasis('unit')}
              aria-pressed={basis === 'unit'}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                basis === 'unit'
                  ? 'bg-white text-[#C86D2D] shadow-xs'
                  : 'text-[#6B5B56] hover:text-[#2A1F1D]'
              }`}
            >
              به ازای هر واحد
            </button>
            <button
              type="button"
              onClick={() => setBasis('percent')}
              aria-pressed={basis === 'percent'}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                basis === 'percent'
                  ? 'bg-white text-[#C86D2D] shadow-xs'
                  : 'text-[#6B5B56] hover:text-[#2A1F1D]'
              }`}
            >
              سهم درصدی (۱۰۰٪)
            </button>
            <button
              type="button"
              onClick={() => setBasis('monthly')}
              aria-pressed={basis === 'monthly'}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                basis === 'monthly'
                  ? 'bg-white text-[#C86D2D] shadow-xs'
                  : 'text-[#6B5B56] hover:text-[#2A1F1D]'
              }`}
            >
              کل هزینه ماهانه
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#4F403C]">
        {COST_PILLARS.map((seg) => (
          <span key={seg.key} className="inline-flex items-center gap-1.5 font-medium">
            <span
              className="h-2.5 w-2.5 rounded-xs shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span>{seg.label}</span>
          </span>
        ))}
      </div>

      {/* Stacked / Grouped Bar Chart */}
      <div className="h-[330px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 16, left: 10, bottom: 26 }}
            barGap={effectiveLayoutMode === 'grouped' ? 3 : 0}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#EFE9E1"
              vertical={false}
            />
            <XAxis
              dataKey="shortName"
              tick={{ fill: '#4F403C', fontSize: 11 }}
              axisLine={{ stroke: '#EAE4DC' }}
              tickLine={false}
              interval={0}
              dy={8}
            />
            <YAxis
              tick={{ fill: '#6B5B56', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={basis === 'percent' ? 54 : 86}
              domain={basis === 'percent' ? [0, 100] : [0, 'auto']}
              ticks={basis === 'percent' ? [0, 25, 50, 75, 100] : undefined}
              tickFormatter={(val: number) =>
                basis === 'percent'
                  ? `${formatNumber(val)}٪`
                  : formatCompactCurrency(val, currency)
              }
            />
            <Tooltip
              cursor={{ fill: '#FAF5EE' }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = payload[0].payload as (typeof chartData)[number];
                const pillarAmounts = {
                  materials: row.materialsAmt,
                  packaging: row.packagingAmt,
                  labor: row.laborAmt,
                  overhead: row.overheadAmt,
                };
                return (
                  <div
                    dir="rtl"
                    className="bg-white border border-[#EAE4DC] rounded-xl p-3.5 shadow-md text-xs space-y-1.5 min-w-[255px] tabular-nums"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-[#F0EAE2] pb-1.5">
                      <span className="font-bold text-[#2A1F1D]">
                        {row.name}{' '}
                        <span className="font-normal text-[#87756E]">
                          ({basis === 'monthly' ? 'کل ماهانه' : `هر ${row.unitLabel}`})
                        </span>
                      </span>
                    </div>
                    {COST_PILLARS.map((seg) => {
                      const val = pillarAmounts[seg.key];
                      const pct = row.totalAmt > 0 ? (val / row.totalAmt) * 100 : 0;
                      return (
                        <div
                          key={seg.key}
                          className="flex items-center justify-between gap-4"
                        >
                          <span className="inline-flex items-center gap-1.5 text-[#6B5B56]">
                            <span
                              className="h-2 w-2 rounded-xs"
                              style={{ backgroundColor: seg.color }}
                            />
                            {seg.label}:
                          </span>
                          <span className="font-semibold text-[#2A1F1D]">
                            {formatCurrency(val, currency, false)}{' '}
                            <span className="text-[#87756E] font-normal">
                              ({formatPercent(pct, 0)})
                            </span>
                          </span>
                        </div>
                      );
                    })}
                    <div className="text-[11px] text-[#87756E] pr-3.5">
                      شامل {formatCurrency(row.rawMaterial, currency, false)} مواد خام +{' '}
                      {formatCurrency(row.wastage, currency, false)} افت پخت
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-[#F0EAE2] font-extrabold text-[#2A1F1D]">
                      <span>جمع کل بهای تمام‌شده:</span>
                      <span>{formatCurrency(row.totalAmt, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-1 border-t border-[#F0EAE2] text-[11px]">
                      <span className="text-[#6B5B56]">شاخص بهره‌وری هزینه:</span>
                      <span
                        className={`font-extrabold ${
                          row.productivityTone === 'positive'
                            ? 'text-[#1F7A5A]'
                            : row.productivityTone === 'warning'
                            ? 'text-[#C86D2D]'
                            : 'text-[#C93B3B]'
                        }`}
                      >
                        {formatNumber(row.revenuePerCostRatio, 2)}× ({row.productivityLabel})
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            {COST_PILLARS.map((seg, idx) => (
              <Bar
                key={seg.key}
                dataKey={seg.key}
                name={seg.label}
                stackId={effectiveLayoutMode === 'stacked' ? 'cost' : undefined}
                fill={seg.color}
                maxBarSize={effectiveLayoutMode === 'stacked' ? 46 : 18}
                radius={
                  effectiveLayoutMode === 'grouped' ||
                  idx === COST_PILLARS.length - 1
                    ? [4, 4, 0, 0]
                    : [0, 0, 0, 0]
                }
                animationDuration={200}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-Product Cost Productivity Summary Strip */}
      {showProductivityStrip && productivityItems.length > 0 && (
        <div className="pt-4 border-t border-[#F0EAE2] space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#2A1F1D]">
            <span>شاخص بهره‌وری هزینه و محرک اصلی بهای تمام‌شده هر محصول</span>
            <HelpTooltip
              size="xs"
              title="شاخص بهره‌وری هزینه چیست؟"
              description="نشان می‌دهد به ازای هر ۱ تومان هزینه‌ای که برای پخت این شیرینی می‌کنید، چند تومان فروش و درآمد به دست می‌آورید. مثلاً ۱٫۵۰× یعنی هر ۱۰۰ تومان هزینه، ۱۵۰ تومان فروش می‌آورد. هرچه عدد بالاتر باشد بهره‌وری بهتر است."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 tabular-nums">
            {productivityItems.map((item) => {
              const toneClass =
                item.productivityTone === 'positive'
                  ? 'text-[#1F7A5A]'
                  : item.productivityTone === 'warning'
                  ? 'text-[#C86D2D]'
                  : 'text-[#C93B3B]';
              return (
                <div
                  key={item.productId}
                  className="rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] px-3 py-2.5 space-y-1"
                >
                  <div className="text-xs font-bold text-[#2A1F1D] truncate">
                    {item.productName}
                  </div>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className={`text-sm font-extrabold ${toneClass}`}>
                      {formatNumber(item.revenuePerCostRatio, 2)}×
                    </span>
                    <span className={`text-[11px] font-semibold ${toneClass}`}>
                      {item.productivityLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#6B5B56]">
                    سهم غالب: {item.dominantCostLabel} (
                    {formatPercent(item.dominantCostPercent, 0)})
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
