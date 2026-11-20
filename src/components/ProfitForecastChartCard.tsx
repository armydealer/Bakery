import React, { useMemo, useState } from 'react';
import { CalendarRange, RotateCcw, Sparkles, TrendingUp } from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
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
  MonthlyPerformanceRecord,
  WorkshopSummary,
} from '../types/workshop';
import { projectFutureFinancials } from '../utils/accounting';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../utils/format';
import { HelpTooltip } from './HelpTooltip';

interface ProfitForecastChartCardProps {
  summary: WorkshopSummary;
  history: MonthlyPerformanceRecord[];
  currency: CurrencyMode;
}

export const ProfitForecastChartCard: React.FC<
  ProfitForecastChartCardProps
> = ({ summary, history, currency }) => {
  const [monthlyGrowthRate, setMonthlyGrowthRate] = useState<number>(4);
  const [monthlyCostInflation, setMonthlyCostInflation] = useState<number>(0);
  const [applySeasonality, setApplySeasonality] = useState<boolean>(false);
  const [horizonView, setHorizonView] = useState<'quarterly' | 'monthly'>(
    'quarterly'
  );

  const projection = useMemo(
    () =>
      projectFutureFinancials(summary, history, {
        monthlyGrowthRatePercent: monthlyGrowthRate,
        monthlyCostInflationPercent: monthlyCostInflation,
        applySeasonality,
      }),
    [summary, history, monthlyGrowthRate, monthlyCostInflation, applySeasonality]
  );

  const quarterlyChartData = useMemo(
    () =>
      projection.quarterlySeries.map((q) => ({
        name: q.quarterLabel,
        subLabel: q.monthsRangeLabel,
        revenue: Math.round(q.projectedRevenue),
        cost: Math.round(q.projectedCost),
        profit: Math.round(q.projectedProfit),
        cumulativeProfit: Math.round(q.cumulativeProfit),
        margin: q.profitMarginPercent,
      })),
    [projection.quarterlySeries]
  );

  const monthlyChartData = useMemo(
    () =>
      projection.monthlySeries.map((m) => ({
        name: m.shortLabel,
        fullLabel: m.monthLabel,
        revenue: Math.round(m.projectedRevenue),
        cost: Math.round(m.projectedCost),
        profit: Math.round(m.projectedProfit),
        cumulativeProfit: Math.round(m.cumulativeProfit),
        margin: m.profitMarginPercent,
      })),
    [projection.monthlySeries]
  );

  const isDefaultState =
    monthlyGrowthRate === 4 &&
    monthlyCostInflation === 0 &&
    !applySeasonality;

  const presets = [
    { label: 'ثابت (۰٪)', growth: 0, inflation: 0 },
    {
      label: `روند ۶ ماهه (${projection.historicalTrendRatePercent >= 0 ? '+' : ''}${formatNumber(projection.historicalTrendRatePercent, 1)}٪)`,
      growth: projection.historicalTrendRatePercent,
      inflation: 0,
    },
    { label: 'رشد متعادل (+۵٪)', growth: 5, inflation: 0 },
    { label: 'رشد پرشتاب (+۱۰٪)', growth: 10, inflation: 0 },
  ];

  return (
    <section
      aria-label="کارت پیش‌بینی سود فصلی و سالانه"
      className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-5"
    >
      {/* Header & Chart Horizon Toggle */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[#1F7A5A] text-xs font-semibold">
            <CalendarRange className="h-4 w-4 shrink-0" />
            <span>پیش‌بینی هوشمند بر اساس داده‌های ماهانه فعلی و نرخ رشد فرضی</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <h2 className="text-base font-bold text-[#2A1F1D]">
              پیش‌بینی سود فصلی و سالانه
            </h2>
            <HelpTooltip
              title="پیش‌بینی سود فصلی و سالانه چیست؟"
              description="این کارت از فروش و هزینه‌های واقعی همین ماه کارگاه شما شروع می‌کند و با نرخ رشد ماهانه‌ای که خودتان مشخص می‌کنید، درآمد، بهای تمام‌شده و سود خالص ۳ ماه آینده (فصلی) و ۱۲ ماه آینده (سالانه) را به صورت نمودار پیش‌بینی می‌کند."
            />
          </div>
          <p className="text-xs text-[#6B5B56] mt-0.5">
            تغییر نرخ رشد فروش یا تورم فرضی هزینه‌ها، پیش‌بینی فصلی و سالانه و نمودار آینده کارگاه را به‌صورت لحظه‌ای به‌روزرسانی می‌کند
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <div
            role="group"
            aria-label="نمای نمودار پیش‌بینی مالی"
            className="inline-flex items-center p-1 rounded-xl bg-[#F4EFE8] border border-[#EAE4DC]"
          >
            <button
              type="button"
              onClick={() => setHorizonView('quarterly')}
              aria-pressed={horizonView === 'quarterly'}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                horizonView === 'quarterly'
                  ? 'bg-white text-[#C86D2D] shadow-xs'
                  : 'text-[#6B5B56] hover:text-[#2A1F1D]'
              }`}
            >
              نمای فصلی (۴ فصل)
            </button>
            <button
              type="button"
              onClick={() => setHorizonView('monthly')}
              aria-pressed={horizonView === 'monthly'}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                horizonView === 'monthly'
                  ? 'bg-white text-[#C86D2D] shadow-xs'
                  : 'text-[#6B5B56] hover:text-[#2A1F1D]'
              }`}
            >
              نمای ماهانه (۱۲ ماه)
            </button>
          </div>

          {!isDefaultState && (
            <button
              type="button"
              onClick={() => {
                setMonthlyGrowthRate(4);
                setMonthlyCostInflation(0);
                setApplySeasonality(false);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] text-xs font-medium text-[#6B5B56] hover:text-[#2A1F1D] transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>بازنشانی</span>
            </button>
          )}
        </div>
      </div>

      {/* Growth Rate & Assumption Controls */}
      <div className="rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Primary Slider: Assumed Monthly Growth Rate */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#2A1F1D]">
                <TrendingUp className="h-4 w-4 text-[#1F7A5A]" />
                <label htmlFor="forecast-growth-slider">
                  نرخ رشد فرضی فروش ماهانه (%)
                </label>
                <HelpTooltip
                  size="xs"
                  title="نرخ رشد فرضی ماهانه"
                  description="فرض می‌کنید هر ماه چند درصد به فروش کارگاه اضافه (یا کم) شود؟ مثلاً ۵٪ یعنی فروش هر ماه نسبت به ماه قبل ۵ درصد رشد می‌کند و به دلیل ثابت ماندن اجاره و سربار، سود شما با سرعت بیشتری بالا می‌رود."
                />
              </div>
              <div className="flex items-center gap-1.5 tabular-nums">
                <input
                  id="forecast-growth-input"
                  type="number"
                  min={-15}
                  max={25}
                  step={0.5}
                  value={monthlyGrowthRate}
                  onChange={(e) => {
                    const parsed = Number(e.target.value);
                    if (!Number.isNaN(parsed)) {
                      setMonthlyGrowthRate(Math.min(25, Math.max(-15, parsed)));
                    }
                  }}
                  aria-label="عدد نرخ رشد فرضی ماهانه"
                  className="w-20 h-8 px-2 rounded-lg border border-[#DDD4C8] bg-white text-center text-xs font-extrabold text-[#1F7A5A] focus:outline-none focus:border-[#C86D2D]"
                />
                <span className="text-xs font-semibold text-[#6B5B56]">
                  درصد / ماه
                </span>
              </div>
            </div>

            <input
              id="forecast-growth-slider"
              type="range"
              min={-10}
              max={20}
              step={0.5}
              value={Math.min(20, Math.max(-10, monthlyGrowthRate))}
              onChange={(e) => setMonthlyGrowthRate(Number(e.target.value))}
              aria-label="اسلایدر نرخ رشد فرضی ماهانه"
              className="w-full h-2 rounded-lg appearance-none bg-[#E6DDD2] accent-[#1F7A5A] cursor-pointer"
            />

            <div className="flex items-center justify-between text-[11px] text-[#87756E] tabular-nums">
              <span>رکود (-۱۰٪)</span>
              <span>ثابت (۰٪)</span>
              <span>رشد (+۱۰٪)</span>
              <span>جهش (+۲۰٪)</span>
            </div>
          </div>

          {/* Secondary Controls: Cost Inflation & Seasonality */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 lg:pt-0 lg:pr-4 lg:border-r lg:border-[#EAE4DC]">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-xs font-semibold text-[#4F403C]">
                <label htmlFor="forecast-cost-inflation">
                  تورم فرضی هزینه (ماهانه)
                </label>
                <HelpTooltip
                  size="xs"
                  title="تورم فرضی هزینه‌ها"
                  description="اگر پیش‌بینی می‌کنید قیمت مواد اولیه و مخارج کارگاه هر ماه چند درصد گران‌تر شود، اینجا وارد کنید تا اثر واقعی آن روی سود آینده دیده شود."
                />
              </div>
              <div className="flex items-center gap-1.5 tabular-nums">
                <input
                  id="forecast-cost-inflation"
                  type="number"
                  min={0}
                  max={15}
                  step={0.5}
                  value={monthlyCostInflation}
                  onChange={(e) => {
                    const parsed = Number(e.target.value);
                    if (!Number.isNaN(parsed)) {
                      setMonthlyCostInflation(Math.min(15, Math.max(0, parsed)));
                    }
                  }}
                  className="w-full h-9 px-2.5 rounded-xl border border-[#DDD4C8] bg-white text-xs font-bold text-[#C86D2D] focus:outline-none focus:border-[#C86D2D]"
                />
                <span className="text-xs text-[#6B5B56] shrink-0">٪</span>
              </div>
            </div>

            <div className="space-y-1.5 flex flex-col justify-between">
              <div className="flex items-center gap-1 text-xs font-semibold text-[#4F403C]">
                <span>الگوی فصلی بازار قنادی</span>
                <HelpTooltip
                  size="xs"
                  title="نوسان فصلی بازار قنادی"
                  description="با فعال کردن این گزینه، اوج فروش شب عید نوروز و شب یلدا و رکود ملایم تابستان به‌صورت خودکار روی نمودار پیش‌بینی اعمال می‌شود."
                />
              </div>
              <button
                type="button"
                onClick={() => setApplySeasonality((v) => !v)}
                aria-pressed={applySeasonality}
                className={`h-9 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  applySeasonality
                    ? 'bg-[#EFF8F4] border-[#1F7A5A] text-[#175D44]'
                    : 'bg-white border-[#DDD4C8] text-[#6B5B56] hover:text-[#2A1F1D]'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>{applySeasonality ? 'نوسان فصلی فعال' : 'رشد یکنواخت'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scenario Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#EAE4DC]">
          <span className="text-[11px] font-semibold text-[#6B5B56] ml-1">
            سناریوهای آماده:
          </span>
          {presets.map((preset) => {
            const isActive =
              Math.abs(monthlyGrowthRate - preset.growth) < 0.05 &&
              monthlyCostInflation === preset.inflation;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setMonthlyGrowthRate(preset.growth);
                  setMonthlyCostInflation(preset.inflation);
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all tabular-nums ${
                  isActive
                    ? 'bg-[#FAF3EC] border-[#C86D2D] text-[#B25D22]'
                    : 'bg-white border-[#EAE4DC] text-[#4F403C] hover:border-[#D5C8BA]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 Primary Forecast KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 tabular-nums">
        {/* Quarterly Profit */}
        <div className="rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] p-4 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#6B5B56]">
            <span>پیش‌بینی سود فصلی (۳ ماه آینده)</span>
            <span
              className={`text-[11px] font-bold ${
                projection.quarterlyProfitDeltaPercent >= 0
                  ? 'text-[#1F7A5A]'
                  : 'text-[#C93B3B]'
              }`}
            >
              {projection.quarterlyProfitDeltaPercent >= 0 ? '+' : ''}
              {formatPercent(projection.quarterlyProfitDeltaPercent, 1)} نسبت به ثابت
            </span>
          </div>
          <div
            className={`text-xl font-extrabold ${
              projection.quarterlyProfit >= 0
                ? 'text-[#1F7A5A]'
                : 'text-[#C93B3B]'
            }`}
          >
            {formatCurrency(projection.quarterlyProfit, currency)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#6B5B56]">
            <span>
              درآمد فصلی:{' '}
              <strong className="text-[#2A1F1D]">
                {formatCompactCurrency(projection.quarterlyRevenue, currency)}
              </strong>
            </span>
            <span>حاشیه سود: {formatPercent(projection.quarterlyMarginPercent)}</span>
          </div>
        </div>

        {/* Annual Profit */}
        <div className="rounded-xl border border-[#C6E6D9] bg-[#EFF8F4] p-4 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#175D44]">
            <span>پیش‌بینی سود سالانه (۱۲ ماه آینده)</span>
            <span
              className={`text-[11px] font-bold ${
                projection.annualProfitDeltaPercent >= 0
                  ? 'text-[#1F7A5A]'
                  : 'text-[#C93B3B]'
              }`}
            >
              {projection.annualProfitDeltaPercent >= 0 ? '+' : ''}
              {formatPercent(projection.annualProfitDeltaPercent, 1)} نسبت به ثابت
            </span>
          </div>
          <div
            className={`text-xl font-extrabold ${
              projection.annualProfit >= 0 ? 'text-[#1F7A5A]' : 'text-[#C93B3B]'
            }`}
          >
            {formatCurrency(projection.annualProfit, currency)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#175D44]/90">
            <span>
              درآمد سالانه:{' '}
              <strong>
                {formatCompactCurrency(projection.annualRevenue, currency)}
              </strong>
            </span>
            <span>حاشیه سود: {formatPercent(projection.annualMarginPercent)}</span>
          </div>
        </div>

        {/* End of Year (Month 12 Run-Rate) */}
        <div className="rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] p-4 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#6B5B56]">
            <span>چشم‌انداز پایان سال (ماه دوازدهم)</span>
            <span className="text-[11px] font-semibold text-[#C86D2D]">
              نرخ ماهانه هدف
            </span>
          </div>
          <div
            className={`text-xl font-extrabold ${
              projection.month12Profit >= 0
                ? 'text-[#2A1F1D]'
                : 'text-[#C93B3B]'
            }`}
          >
            {formatCurrency(projection.month12Profit, currency)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#6B5B56]">
            <span>
              فروش ماه ۱۲:{' '}
              <strong className="text-[#2A1F1D]">
                {formatCompactCurrency(projection.month12Revenue, currency)}
              </strong>
            </span>
            <span>
              میانگین سود ماهانه:{' '}
              {formatCompactCurrency(projection.averageMonthlyProfit, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#4F403C]">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-xs bg-[#C86D2D]" />
            درآمد پیش‌بینی‌شده
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-xs bg-[#8C5A3C]" />
            بهای تمام‌شده پیش‌بینی‌شده
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-xs bg-[#1F7A5A]" />
            سود خالص پیش‌بینی‌شده
          </span>
        </div>
        <span className="text-[11px] text-[#87756E] tabular-nums">
          مبنای شروع: درآمد ماهانه فعلی ({formatCompactCurrency(summary.totalMonthlyRevenue, currency)})
        </span>
      </div>

      {/* Forecast Chart */}
      <div className="h-[320px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          {horizonView === 'quarterly' ? (
            <ComposedChart
              data={quarterlyChartData}
              margin={{ top: 12, right: 16, left: 10, bottom: 16 }}
              barGap={6}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#EFE9E1"
                vertical={false}
              />
              <ReferenceLine y={0} stroke="#D5C8BA" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#4F403C', fontSize: 12, fontWeight: 600 }}
                axisLine={{ stroke: '#EAE4DC' }}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tick={{ fill: '#6B5B56', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={88}
                tickFormatter={(val: number) =>
                  formatCompactCurrency(val, currency)
                }
              />
              <Tooltip
                cursor={{ fill: '#FAF5EE' }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const row = payload[0]
                    .payload as (typeof quarterlyChartData)[number];
                  return (
                    <div
                      dir="rtl"
                      className="bg-white border border-[#EAE4DC] rounded-xl p-3.5 shadow-md text-xs space-y-1.5 min-w-[235px] tabular-nums"
                    >
                      <div className="font-bold text-[#2A1F1D] border-b border-[#F0EAE2] pb-1.5">
                        {row.name}{' '}
                        <span className="font-normal text-[#87756E]">
                          ({row.subLabel})
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#6B5B56]">درآمد پیش‌بینی‌شده:</span>
                        <span className="font-semibold text-[#C86D2D]">
                          {formatCurrency(row.revenue, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#6B5B56]">بهای تمام‌شده:</span>
                        <span className="font-semibold text-[#8C5A3C]">
                          {formatCurrency(row.cost, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 pt-1 border-t border-[#F0EAE2]">
                        <span className="text-[#6B5B56]">سود خالص فصل:</span>
                        <span
                          className={`font-extrabold ${
                            row.profit >= 0
                              ? 'text-[#1F7A5A]'
                              : 'text-[#C93B3B]'
                          }`}
                        >
                          {formatCurrency(row.profit, currency)} (
                          {formatPercent(row.margin)})
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 text-[11px] text-[#6B5B56]">
                        <span>سود انباشته تا پایان این فصل:</span>
                        <span className="font-bold text-[#2A1F1D]">
                          {formatCompactCurrency(row.cumulativeProfit, currency)}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="revenue"
                name="درآمد پیش‌بینی‌شده"
                fill="#C86D2D"
                radius={[4, 4, 0, 0]}
                maxBarSize={34}
                animationDuration={200}
              />
              <Bar
                dataKey="cost"
                name="بهای تمام‌شده"
                fill="#8C5A3C"
                radius={[4, 4, 0, 0]}
                maxBarSize={34}
                animationDuration={200}
              />
              <Bar
                dataKey="profit"
                name="سود خالص پیش‌بینی‌شده"
                fill="#1F7A5A"
                radius={[4, 4, 0, 0]}
                maxBarSize={34}
                animationDuration={200}
              >
                {quarterlyChartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.profit >= 0 ? '#1F7A5A' : '#C93B3B'}
                  />
                ))}
              </Bar>
            </ComposedChart>
          ) : (
            <ComposedChart
              data={monthlyChartData}
              margin={{ top: 12, right: 16, left: 10, bottom: 16 }}
            >
              <defs>
                <linearGradient
                  id="forecastProfitFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#1F7A5A" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#1F7A5A" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#EFE9E1"
                vertical={false}
              />
              <ReferenceLine y={0} stroke="#D5C8BA" />
              <XAxis
                dataKey="name"
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
                width={88}
                tickFormatter={(val: number) =>
                  formatCompactCurrency(val, currency)
                }
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const row = payload[0]
                    .payload as (typeof monthlyChartData)[number];
                  return (
                    <div
                      dir="rtl"
                      className="bg-white border border-[#EAE4DC] rounded-xl p-3.5 shadow-md text-xs space-y-1.5 min-w-[235px] tabular-nums"
                    >
                      <div className="font-bold text-[#2A1F1D] border-b border-[#F0EAE2] pb-1.5">
                        {row.fullLabel}
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#6B5B56]">درآمد پیش‌بینی‌شده:</span>
                        <span className="font-semibold text-[#C86D2D]">
                          {formatCurrency(row.revenue, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#6B5B56]">بهای تمام‌شده:</span>
                        <span className="font-semibold text-[#8C5A3C]">
                          {formatCurrency(row.cost, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 pt-1 border-t border-[#F0EAE2]">
                        <span className="text-[#6B5B56]">سود خالص ماه:</span>
                        <span
                          className={`font-extrabold ${
                            row.profit >= 0
                              ? 'text-[#1F7A5A]'
                              : 'text-[#C93B3B]'
                          }`}
                        >
                          {formatCurrency(row.profit, currency)} (
                          {formatPercent(row.margin)})
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 text-[11px] text-[#6B5B56]">
                        <span>سود انباشته تا این ماه:</span>
                        <span className="font-bold text-[#2A1F1D]">
                          {formatCompactCurrency(row.cumulativeProfit, currency)}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="profit"
                name="سود خالص ماهانه"
                stroke="#1F7A5A"
                strokeWidth={2.5}
                fill="url(#forecastProfitFill)"
                dot={{ r: 3.5, fill: '#1F7A5A', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                activeDot={{ r: 5.5 }}
                animationDuration={200}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="درآمد پیش‌بینی‌شده"
                stroke="#C86D2D"
                strokeWidth={2.2}
                dot={{ r: 3, fill: '#C86D2D', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                animationDuration={200}
              />
              <Line
                type="monotone"
                dataKey="cost"
                name="بهای تمام‌شده"
                stroke="#8C5A3C"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                animationDuration={200}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* 4-Quarter Summary Strip */}
      <div className="pt-4 border-t border-[#F0EAE2] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 tabular-nums">
        {projection.quarterlySeries.map((q) => (
          <div
            key={q.quarterIndex}
            className="rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] px-3.5 py-3 space-y-1"
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-[#2A1F1D]">{q.quarterLabel}</span>
              <span className="text-[11px] text-[#87756E]">
                {q.monthsRangeLabel}
              </span>
            </div>
            <div
              className={`text-sm font-extrabold ${
                q.projectedProfit >= 0 ? 'text-[#1F7A5A]' : 'text-[#C93B3B]'
              }`}
            >
              سود: {formatCompactCurrency(q.projectedProfit, currency)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#6B5B56]">
              <span>درآمد: {formatCompactCurrency(q.projectedRevenue, currency)}</span>
              <span>حاشیه: {formatPercent(q.profitMarginPercent)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
