import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Flame,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CurrencyMode,
  PURCHASE_UNIT_LABELS,
  WorkshopState,
  WorkshopSummary,
} from '../types/workshop';
import { calculateIngredientSensitivityRanking } from '../utils/accounting';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  getCurrencyLabel,
  getCurrencyMultiplier,
} from '../utils/format';
import { HelpTooltip } from './HelpTooltip';

interface IngredientShockRadarProps {
  state: WorkshopState;
  summary: WorkshopSummary;
  currency: CurrencyMode;
  onInspectProduct?: (productId: string) => void;
}

const SHOCK_PRESETS = [10, 20, 30, 50];

export const IngredientShockRadar: React.FC<IngredientShockRadarProps> = ({
  state,
  summary,
  currency,
  onInspectProduct,
}) => {
  const multiplier = getCurrencyMultiplier(currency);
  const currencyLabel = getCurrencyLabel(currency);

  const [shockPercent, setShockPercent] = useState<number>(20);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>('');

  const ranking = useMemo(
    () => calculateIngredientSensitivityRanking(state, summary, shockPercent),
    [state, summary, shockPercent]
  );

  const topSix = useMemo(() => ranking.slice(0, 6), [ranking]);

  useEffect(() => {
    if (
      topSix.length > 0 &&
      !ranking.some((item) => item.ingredientId === selectedIngredientId)
    ) {
      setSelectedIngredientId(topSix[0].ingredientId);
    }
  }, [ranking, topSix, selectedIngredientId]);

  const selectedImpact = useMemo(
    () =>
      ranking.find((item) => item.ingredientId === selectedIngredientId) ??
      topSix[0] ??
      null,
    [ranking, topSix, selectedIngredientId]
  );

  const chartData = useMemo(
    () =>
      topSix.map((item) => ({
        ingredientId: item.ingredientId,
        name:
          item.ingredientName.length > 21
            ? `${item.ingredientName.slice(0, 20).trim()}…`
            : item.ingredientName,
        fullName: item.ingredientName,
        profitDropDisplay: Math.round(item.monthlyProfitDrop * multiplier),
        profitDropToman: item.monthlyProfitDrop,
        productsAtRisk: item.productsDroppingBelowSafety,
      })),
    [topSix, multiplier]
  );

  if (topSix.length === 0 || !selectedImpact) {
    return null;
  }

  return (
    <section
      aria-label="رادار شوک قیمت مواد اولیه و تست استرس تورم"
      className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-5"
    >
      {/* Header + Shock Intensity Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#F0EAE2]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#C93B3B] text-xs font-semibold">
            <Flame className="h-4 w-4" />
            <span>رادار حساسیت و تست استرس تورم</span>
          </div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-[#2A1F1D]">
              کدام ماده اولیه بیشترین ضربه را به سود ماهانه کارگاه می‌زند؟
            </h2>
            <HelpTooltip
              title="رادار شوک قیمت مواد اولیه"
              description="این نمودار به‌طور خودکار آزمایش می‌کند که اگر قیمت هر ماده اولیه به‌تنهایی مثلاً ۲۰٪ گران شود، سود ماهانه کل کارگاه دقیقاً چقدر کم می‌شود و کدام شیرینی‌ها زیر مرز سود ۱۵٪ سقوط می‌کنند. این‌طوری می‌فهمید اولویت خرید عمده و انبارکردن با کدام مواد است!"
            />
          </div>
          <p className="text-xs text-[#6B5B56] leading-relaxed">
            روی هر میله یا ماده اولیه کلیک کنید تا شیرینی‌های آسیب‌پذیر و حداقل اصلاح قیمت لازم برای خنثی‌سازی شوک را ببینید.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-[#6B5B56]">
            شدت شوک فرضی:
          </span>
          <div
            role="group"
            aria-label="انتخاب درصد شوک قیمتی"
            className="inline-flex items-center p-1 rounded-xl bg-[#FAF8F5] border border-[#EAE4DC]"
          >
            {SHOCK_PRESETS.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setShockPercent(pct)}
                aria-pressed={shockPercent === pct}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold tabular-nums transition-colors ${
                  shockPercent === pct
                    ? 'bg-[#C93B3B] text-white shadow-xs'
                    : 'text-[#6B5B56] hover:text-[#2A1F1D]'
                }`}
              >
                +{formatNumber(pct)}٪
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2-Column Body: Tornado Sensitivity Chart (7 cols) + Active Ingredient Defense Card (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Horizontal Tornado Bar Chart */}
        <div className="xl:col-span-7 flex flex-col justify-between rounded-xl bg-[#FCFAF7] border border-[#EAE4DC] p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#2A1F1D]">
              ۶ ماده اولیه‌ای که بیشترین افت سود ماهانه را ایجاد می‌کنند (در شوک +{formatNumber(shockPercent)}٪)
            </span>
            <span className="text-[#87756E]">{currencyLabel} / ماه</span>
          </div>

          <div className="h-[250px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#EAE4DC"
                />
                <XAxis
                  type="number"
                  tick={{ fill: '#6B5B56', fontSize: 11 }}
                  axisLine={{ stroke: '#EAE4DC' }}
                  tickLine={false}
                  tickFormatter={(val: number) =>
                    formatCompactCurrency(val / multiplier, currency)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={158}
                  axisLine={false}
                  tickLine={false}
                  tick={({ x, y, payload }) => (
                    <text
                      x={Number(x) - 8}
                      y={Number(y)}
                      dy={4}
                      textAnchor="start"
                      direction="rtl"
                      unicodeBidi="plaintext"
                      fill="#2A1F1D"
                      fontSize={11}
                      fontWeight={600}
                    >
                      {payload?.value}
                    </text>
                  )}
                />
                <Tooltip
                  cursor={{ fill: '#F5EFE6' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload[0]) return null;
                    const row = payload[0].payload as (typeof chartData)[number];
                    return (
                      <div
                        dir="rtl"
                        className="bg-white border border-[#EAE4DC] rounded-xl p-3 shadow-md text-xs space-y-1 tabular-nums"
                      >
                        <div className="font-bold text-[#2A1F1D]">
                          {row.fullName}
                        </div>
                        <div className="text-[#C93B3B] font-bold">
                          افت سود ماهانه:{' '}
                          {formatCurrency(row.profitDropToman, currency)}
                        </div>
                        <div className="text-[#6B5B56]">
                          محصولات سقوط‌کرده زیر ۱۵٪:{' '}
                          {formatNumber(row.productsAtRisk)} قلم
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="profitDropDisplay"
                  radius={[0, 6, 6, 0]}
                  barSize={24}
                  onClick={(data) => {
                    const id = (data as unknown as { ingredientId?: string })
                      ?.ingredientId;
                    if (id) setSelectedIngredientId(id);
                  }}
                  className="cursor-pointer"
                >
                  {chartData.map((entry, idx) => {
                    const isSelected =
                      entry.ingredientId === selectedImpact.ingredientId;
                    const fill = isSelected
                      ? '#C93B3B'
                      : idx === 0
                      ? '#C86D2D'
                      : '#8C5A3C';
                    return (
                      <Cell
                        key={entry.ingredientId}
                        fill={fill}
                        fillOpacity={isSelected ? 1 : 0.78}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Clickable Selector Strip for Keyboard/Accessibility */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {topSix.map((item, idx) => {
              const isSelected =
                item.ingredientId === selectedImpact.ingredientId;
              return (
                <button
                  key={item.ingredientId}
                  type="button"
                  onClick={() => setSelectedIngredientId(item.ingredientId)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors tabular-nums ${
                    isSelected
                      ? 'bg-[#2A1F1D] text-white font-semibold'
                      : 'bg-white border border-[#EAE4DC] text-[#4F403C] hover:border-[#C86D2D]'
                  }`}
                >
                  {formatNumber(idx + 1)}. {item.ingredientName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Ingredient Defense & Counter-Strategy Card */}
        <div className="xl:col-span-5 rounded-xl bg-[#FAF8F5] border border-[#EAE4DC] p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#EAE4DC]">
              <div>
                <div className="text-[11px] font-semibold text-[#C93B3B]">
                  تحلیل سپر تورمی برای ماده انتخاب‌شده
                </div>
                <h3 className="text-base font-extrabold text-[#2A1F1D] mt-0.5">
                  {selectedImpact.ingredientName}
                </h3>
                <div className="text-xs text-[#6B5B56] mt-0.5 tabular-nums">
                  {formatCurrency(selectedImpact.currentUnitPrice, currency)}{' '}
                  ←{' '}
                  <strong className="text-[#C93B3B]">
                    {formatCurrency(selectedImpact.shockedUnitPrice, currency)}
                  </strong>{' '}
                  / {PURCHASE_UNIT_LABELS[selectedImpact.purchaseUnit]}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[#FDF2F2] border border-[#F0C8C8] text-xs font-extrabold text-[#C93B3B] tabular-nums shrink-0">
                +{formatNumber(shockPercent)}٪ شوک
              </span>
            </div>

            {/* 2 Compact Metrics */}
            <div className="grid grid-cols-2 gap-2.5 tabular-nums">
              <div className="p-3 rounded-xl bg-white border border-[#EAE4DC]">
                <div className="text-[11px] text-[#6B5B56]">
                  افت سود ماهانه کارگاه
                </div>
                <div className="text-sm font-extrabold text-[#C93B3B] mt-1">
                  - {formatCompactCurrency(selectedImpact.monthlyProfitDrop, currency)}
                </div>
                <div className="text-[11px] text-[#87756E] mt-0.5">
                  معادل {formatPercent(selectedImpact.profitDropPercentOfTotal, 1)}{' '}
                  از سود کل
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#EAE4DC]">
                <div className="text-[11px] text-[#6B5B56]">
                  پیشنهاد خرید عمده ماهانه
                </div>
                <div className="text-sm font-extrabold text-[#1F7A5A] mt-1">
                  {formatNumber(selectedImpact.monthlyGrossQuantity, 1)}{' '}
                  {PURCHASE_UNIT_LABELS[selectedImpact.purchaseUnit]}
                </div>
                <div className="text-[11px] text-[#87756E] mt-0.5">
                  برای قفل کردن نرخ فعلی
                </div>
              </div>
            </div>

            {/* Affected Products List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#2A1F1D]">
                <span>
                  شیرینی‌های در معرض آسیب ({formatNumber(selectedImpact.affectedProductsCount)} قلم)
                </span>
                {selectedImpact.productsDroppingBelowSafety > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[#C93B3B] text-[11px]">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {formatNumber(selectedImpact.productsDroppingBelowSafety)} قلم زیر ۱۵٪
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[#1F7A5A] text-[11px]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    بالای مرز ایمنی
                  </span>
                )}
              </div>

              <div className="space-y-1.5 max-h-[168px] overflow-y-auto pl-1">
                {selectedImpact.affectedProducts.map((prod) => (
                  <div
                    key={prod.productId}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 tabular-nums ${
                      prod.dropsBelowSafety
                        ? 'bg-[#FFF8F8] border-[#F0C8C8]'
                        : 'bg-white border-[#EAE4DC]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {prod.dropsBelowSafety && (
                          <AlertTriangle className="h-3.5 w-3.5 text-[#C93B3B] shrink-0" />
                        )}
                        <span className="font-bold text-[#2A1F1D] truncate">
                          {prod.productName}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6B5B56] mt-0.5">
                        حاشیه سود: {formatPercent(prod.currentMarginPercent, 1)} ←{' '}
                        <strong
                          className={
                            prod.dropsBelowSafety
                              ? 'text-[#C93B3B]'
                              : 'text-[#C86D2D]'
                          }
                        >
                          {formatPercent(prod.shockedMarginPercent, 1)}
                        </strong>
                      </div>
                    </div>

                    <div className="text-left shrink-0 flex items-center gap-2">
                      <div>
                        <div className="text-[10px] text-[#87756E]">
                          اصلاح قیمت جبرانی
                        </div>
                        <div className="font-bold text-[#1F7A5A]">
                          +{formatPercent(prod.minPriceIncreasePercent, 1)}
                        </div>
                      </div>
                      {onInspectProduct && (
                        <button
                          type="button"
                          onClick={() => onInspectProduct(prod.productId)}
                          aria-label={`بررسی فرمول ${prod.productName}`}
                          className="p-1.5 rounded-lg border border-[#EAE4DC] bg-[#FAF8F5] text-[#4F403C] hover:border-[#C86D2D] hover:text-[#C86D2D]"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
