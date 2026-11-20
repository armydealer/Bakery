import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Coins,
  Scale,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CurrencyMode,
  MonthlyPerformanceRecord,
  SALES_UNIT_LABELS,
  WorkshopSummary,
} from '../types/workshop';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  getCurrencyLabel,
  getCurrencyMultiplier,
} from '../utils/format';
import { HelpTooltip } from './HelpTooltip';
import { PerformanceTrendAndForecast } from './PerformanceTrendAndForecast';
import { ProductCostBreakdownChart } from './ProductCostBreakdownChart';
import { ProfitabilitySimulatorWidget } from './ProfitabilitySimulatorWidget';
import { ProfitForecastChartCard } from './ProfitForecastChartCard';

interface DashboardTabProps {
  summary: WorkshopSummary;
  monthlyHistory: MonthlyPerformanceRecord[];
  currency: CurrencyMode;
  onInspectProduct: (productId: string) => void;
  onQuickUpdateProductPrice: (productId: string, newSellingPriceToman: number) => void;
  onNavigateTab: (tab: 'pantry' | 'recipes' | 'planning' | 'reports') => void;
  onUpdateHistoryRecord: (record: MonthlyPerformanceRecord) => void;
  onRecordNewMonthSnapshot: () => void;
}

const COST_SLICE_COLORS = [
  '#C86D2D', // مواد اولیه خالص - Saffron Amber
  '#D99B52', // افت پخت و پرت - Warm Honey
  '#8C5A3C', // بسته‌بندی - Roasted Cocoa
  '#1F7A5A', // دستمزد مستقیم - Pistachio Emerald
  '#5A6B7C', // سربار تولید - Slate Stone
];

export const DashboardTab: React.FC<DashboardTabProps> = ({
  summary,
  monthlyHistory,
  currency,
  onInspectProduct,
  onQuickUpdateProductPrice,
  onNavigateTab,
  onUpdateHistoryRecord,
  onRecordNewMonthSnapshot,
}) => {
  const multiplier = getCurrencyMultiplier(currency);
  const currencyLabel = getCurrencyLabel(currency);
  const alertProducts = summary.productBreakdowns.filter(
    (p) => p.profitMarginPercent < 15 || p.unitProfit < 0
  );

  const costStructureData = [
    {
      name: 'مواد اولیه خالص',
      value: Math.round(summary.totalMonthlyMaterialCost),
    },
    {
      name: 'افت پخت و پرت مواد',
      value: Math.round(summary.totalMonthlyWastageCost),
    },
    {
      name: 'بسته‌بندی',
      value: Math.round(summary.totalMonthlyPackagingCost),
    },
    {
      name: 'دستمزد مستقیم',
      value: Math.round(summary.totalMonthlyLaborCost),
    },
    {
      name: 'سربار تولید کارگاه',
      value: Math.round(summary.totalMonthlyFixedOverhead),
    },
  ].filter((slice) => slice.value > 0);

  const productComparisonData = summary.productBreakdowns.map((p) => {
    const words = p.productName.split(' ');
    const shortName =
      words.length > 2 ? `${words[0]} ${words[1]}` : p.productName;
    return {
      id: p.productId,
      name: p.productName,
      shortName,
      totalCost: Math.round(p.totalUnitCost),
      sellingPrice: Math.round(p.sellingPrice),
      unitProfit: Math.round(p.unitProfit),
      unitLabel: SALES_UNIT_LABELS[p.salesUnit],
      margin: p.profitMarginPercent,
    };
  });

  const clampedBreakEvenPct = Math.min(
    100,
    Math.max(0, summary.breakEvenProgressPercent)
  );

  return (
    <div className="space-y-6">
      {/* Top 4 KPI Cards */}
      <section aria-label="شاخص‌های کلیدی مالی کارگاه">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* KPI 1: Monthly Revenue */}
          <div className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#6B5B56]">
              <span className="inline-flex items-center gap-1.5">
                <span>درآمد کل ماهانه پیش‌بینی‌شده</span>
                <HelpTooltip
                  size="xs"
                  title="درآمد کل ماهانه"
                  description="کل پولی که در یک ماه از فروش همه شیرینی‌ها به دست می‌آورید (قبل از کم کردن هزینه‌ها). از ضرب قیمت فروش هر شیرینی در میزان فروش ماهانه‌اش به دست می‌آید."
                />
              </span>
              <Wallet className="h-4 w-4 text-[#C86D2D] shrink-0" />
            </div>
            <div className="mt-3 text-2xl font-extrabold text-[#2A1F1D] tabular-nums">
              {formatCurrency(summary.totalMonthlyRevenue, currency)}
            </div>
            <div className="mt-2 text-xs text-[#87756E] tabular-nums">
              مجموع تیراژ: {formatNumber(summary.totalMonthlyVolume)} واحد / کیلو گرم
            </div>
          </div>

          {/* KPI 2: Monthly Total Cost */}
          <div className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#6B5B56]">
              <span className="inline-flex items-center gap-1.5">
                <span>بهای تمام‌شده کل ماهانه</span>
                <HelpTooltip
                  size="xs"
                  title="بهای تمام‌شده کل"
                  description="جمع تمام مخارج کارگاه در یک ماه: شامل مواد اولیه، افت پخت، جعبه و بسته‌بندی، دستمزد قناد و وردست و هزینه‌های ثابت مثل اجاره و برق و گاز."
                />
              </span>
              <Coins className="h-4 w-4 text-[#8C5A3C] shrink-0" />
            </div>
            <div className="mt-3 text-2xl font-extrabold text-[#2A1F1D] tabular-nums">
              {formatCurrency(summary.totalMonthlyCost, currency)}
            </div>
            <div className="mt-2 text-xs text-[#87756E] tabular-nums">
              سربار ثابت: {formatCompactCurrency(summary.totalMonthlyFixedOverhead, currency)}
            </div>
          </div>

          {/* KPI 3: Net Profit & Margin */}
          <div className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#6B5B56]">
              <span className="inline-flex items-center gap-1.5">
                <span>سود خالص ماهانه و حاشیه سود</span>
                <HelpTooltip
                  size="xs"
                  title="سود خالص و حاشیه سود"
                  description="پولی که بعد از پرداخت تمام هزینه‌ها واقعاً در جیب شما می‌ماند. حاشیه سود نشان می‌دهد از هر ۱۰۰ تومان فروش، چند تومانش سود خالص است."
                />
              </span>
              <TrendingUp
                className={`h-4 w-4 shrink-0 ${
                  summary.netMonthlyProfit >= 0
                    ? 'text-[#1F7A5A]'
                    : 'text-[#C93B3B]'
                }`}
              />
            </div>
            <div
              className={`mt-3 text-2xl font-extrabold tabular-nums ${
                summary.netMonthlyProfit >= 0
                  ? 'text-[#1F7A5A]'
                  : 'text-[#C93B3B]'
              }`}
            >
              {formatCurrency(summary.netMonthlyProfit, currency)}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs tabular-nums">
              <span
                className={`font-semibold ${
                  summary.netProfitMarginPercent >= 15
                    ? 'text-[#1F7A5A]'
                    : 'text-[#C93B3B]'
                }`}
              >
                حاشیه سود خالص: {formatPercent(summary.netProfitMarginPercent)}
              </span>
            </div>
          </div>

          {/* KPI 4: Break-Even Status */}
          <div className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#6B5B56]">
              <span className="inline-flex items-center gap-1.5">
                <span>وضعیت نقطه سربه‌سر کارگاه</span>
                <HelpTooltip
                  size="xs"
                  title="نقطه سربه‌سر یعنی چه؟"
                  description="حداقل فروشی که در ماه باید داشته باشید تا کارگاه نه سود کند و نه ضرر (خرج و دخل سر‌به‌سر شود). هر فروشی بالاتر از این عدد، سود خالص شماست."
                />
              </span>
              <Scale className="h-4 w-4 text-[#1F7A5A] shrink-0" />
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <span
                className={`text-lg font-extrabold ${
                  summary.isAboveBreakEven ? 'text-[#1F7A5A]' : 'text-[#C93B3B]'
                }`}
              >
                {summary.isAboveBreakEven ? 'عبور از سربه‌سر' : 'زیر نقطه سربه‌سر'}
              </span>
              <span className="text-sm font-bold text-[#2A1F1D] tabular-nums">
                {formatPercent(summary.breakEvenProgressPercent, 0)}
              </span>
            </div>
            <div className="mt-2.5 space-y-1.5">
              <div
                className="h-2 w-full rounded-full bg-[#EFE9E1] overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(clampedBreakEvenPct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="درصد پوشش نقطه سربه‌سر"
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    summary.isAboveBreakEven ? 'bg-[#1F7A5A]' : 'bg-[#C86D2D]'
                  }`}
                  style={{ width: `${clampedBreakEvenPct}%` }}
                />
              </div>
              <div className="text-xs text-[#87756E] tabular-nums">
                سربه‌سر:{' '}
                {Number.isFinite(summary.breakEvenRevenue)
                  ? formatCompactCurrency(summary.breakEvenRevenue, currency)
                  : 'نامشخص'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Workshop Health Alerts */}
      <section
        aria-label="هشدارهای هوشمند کارگاه"
        className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F0EAE2]">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-[#2A1F1D]">
                هشدارهای هوشمند کارگاه
              </h2>
              <HelpTooltip
                title="هشدارهای هوشمند کارگاه"
                description="اگر شیرینی‌ای حاشیه سودش کمتر از ۱۵٪ شود یا زیر قیمت تمام‌شده فروخته شود، اینجا به شما هشدار می‌دهد. می‌توانید قیمت فروشش را همینجا سریع عوض کنید یا وارد آزمایشگاه فرمولاسیون شوید."
              />
            </div>
            <p className="text-xs text-[#6B5B56] mt-0.5">
              پایش خودکار محصولاتی که حاشیه سود آن‌ها کمتر از ۱۵٪ شده یا زیر بهای تمام‌شده فروخته می‌شوند
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('planning')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C86D2D] hover:text-[#A4551E] transition-colors whitespace-nowrap"
          >
            <span>شبیه‌ساز تورم و قیمت‌گذاری</span>
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        {alertProducts.length === 0 ? (
          <div className="pt-4 flex items-center gap-3 text-sm text-[#1F7A5A]">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>
              وضعیت سودآوری سالم است؛ تمام محصولات کارگاه دارای حاشیه سود بالاتر از ۱۵٪ هستند.
            </span>
          </div>
        ) : (
          <div className="divide-y divide-[#F0EAE2]">
            {alertProducts.map((p) => {
              const isLoss = p.unitProfit < 0;
              return (
                <div
                  key={p.productId}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`h-5 w-5 mt-0.5 shrink-0 ${
                        isLoss ? 'text-[#C93B3B]' : 'text-[#C86D2D]'
                      }`}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-sm font-bold text-[#2A1F1D]">
                          {p.productName}
                        </span>
                        <span className="text-xs text-[#87756E]" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-xs font-semibold text-[#C93B3B] tabular-nums">
                          {isLoss
                            ? 'زیان‌ده (فروش زیر بهای تمام‌شده)'
                            : `حاشیه سود پایین: ${formatPercent(p.profitMarginPercent)}`}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B5B56] mt-1 tabular-nums">
                        بهای تمام‌شده: {formatCurrency(p.totalUnitCost, currency)} · قیمت فعلی:{' '}
                        {formatCurrency(p.sellingPrice, currency)} · قیمت پیشنهادی:{' '}
                        <strong className="text-[#1F7A5A]">
                          {formatCurrency(p.suggestedPrice, currency)}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <label
                        htmlFor={`alert-price-${p.productId}`}
                        className="text-[11px] text-[#6B5B56] whitespace-nowrap"
                      >
                        قیمت ({currencyLabel}):
                      </label>
                      <input
                        id={`alert-price-${p.productId}`}
                        type="number"
                        min="0"
                        step={currency === 'RIAL' ? '10000' : '1000'}
                        value={Math.round(p.sellingPrice * multiplier)}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          onQuickUpdateProductPrice(
                            p.productId,
                            Math.round(val / multiplier)
                          );
                        }}
                        className="w-28 h-9 px-2.5 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-xs font-bold text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onInspectProduct(p.productId)}
                      className="px-3.5 py-2 rounded-xl border border-[#E6D5C8] bg-[#FAF3EC] text-xs font-semibold text-[#B25D22] hover:bg-[#F3E4D5] transition-colors whitespace-nowrap shrink-0"
                    >
                      بررسی در فرمولاسیون
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Monthly Profitability Simulator Widget */}
      <ProfitabilitySimulatorWidget summary={summary} currency={currency} />

      {/* 6-Month Historical Performance Trend */}
      <PerformanceTrendAndForecast
        history={monthlyHistory}
        summary={summary}
        currency={currency}
        onUpdateHistoryRecord={onUpdateHistoryRecord}
        onRecordNewMonthSnapshot={onRecordNewMonthSnapshot}
      />

      {/* Dedicated Quarterly & Annual Profit Forecast Chart Card */}
      <ProfitForecastChartCard
        summary={summary}
        history={monthlyHistory}
        currency={currency}
      />

      {/* Interactive Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Chart: Workshop Cost Structure */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs flex flex-col">
          <div className="mb-4">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-[#2A1F1D]">
                ساختار بهای تمام‌شده کل کارگاه
              </h2>
              <HelpTooltip
                title="ساختار بهای تمام‌شده کارگاه"
                description="این نمودار دایره‌ای نشان می‌دهد از کل خرج ماهانه کارگاه، چند درصدش برای مواد اولیه، چند درصدش برای افت پخت، بسته‌بندی، دستمزد و سربار (اجاره و قبوض) می‌رود."
              />
            </div>
            <p className="text-xs text-[#6B5B56] mt-0.5">
              سهم مواد اولیه، افت پخت، بسته‌بندی، دستمزد و سربار ماهانه
            </p>
          </div>

          <div className="h-[250px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costStructureData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={95}
                  paddingAngle={2}
                  animationDuration={200}
                >
                  {costStructureData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={COST_SLICE_COLORS[idx % COST_SLICE_COLORS.length]}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const entry = payload[0];
                    const val = Number(entry.value ?? 0);
                    const pct =
                      summary.totalMonthlyCost > 0
                        ? (val / summary.totalMonthlyCost) * 100
                        : 0;
                    return (
                      <div
                        dir="rtl"
                        className="bg-white border border-[#EAE4DC] rounded-xl px-3.5 py-2.5 shadow-md text-xs space-y-1"
                      >
                        <div className="font-bold text-[#2A1F1D]">
                          {entry.name}
                        </div>
                        <div className="text-[#4F403C] tabular-nums">
                          {formatCurrency(val, currency)} ({formatPercent(pct)})
                        </div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Crisp Tabular Legend */}
          <div className="mt-3 pt-3 border-t border-[#F0EAE2] space-y-2">
            {costStructureData.map((slice, idx) => {
              const pct =
                summary.totalMonthlyCost > 0
                  ? (slice.value / summary.totalMonthlyCost) * 100
                  : 0;
              return (
                <div
                  key={slice.name}
                  className="flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-xs shrink-0"
                      style={{
                        backgroundColor:
                          COST_SLICE_COLORS[idx % COST_SLICE_COLORS.length],
                      }}
                    />
                    <span className="text-[#4F403C] truncate">{slice.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 tabular-nums">
                    <span className="text-[#2A1F1D] font-semibold">
                      {formatCompactCurrency(slice.value, currency)}
                    </span>
                    <span className="text-[#87756E] w-11 text-left">
                      {formatPercent(pct)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grouped Bar Chart: Cost vs Selling Price vs Net Profit per Unit */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs flex flex-col">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-[#2A1F1D]">
                  مقایسه بهای تمام‌شده، قیمت فروش و سود خالص واحد
                </h2>
                <HelpTooltip
                  title="مقایسه قیمت فروش و سود هر شیرینی"
                  description="برای هر محصول کنار هم ببینید چقدر پای خودتان درمی‌آید (قهوه‌ای)، چند می‌فروشید (نارنجی) و از هر کیلو گرم یا عدد چقدر سود خالص می‌برید (سبز یا قرمز در صورت ضرر)."
                />
              </div>
              <p className="text-xs text-[#6B5B56] mt-0.5">
                به ازای هر کیلو گرم یا عدد از محصولات فعال کارگاه
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#6B5B56]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#8C5A3C]" />
                بهای تمام‌شده
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#C86D2D]" />
                قیمت فروش
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#1F7A5A]" />
                سود خالص
              </span>
            </div>
          </div>

          <div className="h-[340px] w-full flex-1" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={productComparisonData}
                margin={{ top: 10, right: 16, left: 10, bottom: 28 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE9E1" vertical={false} />
                <ReferenceLine y={0} stroke="#D5C8BA" />
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
                  width={84}
                  tickFormatter={(val: number) =>
                    formatCompactCurrency(val, currency)
                  }
                />
                <Tooltip
                  cursor={{ fill: '#FAF5EE' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const row = payload[0].payload as (typeof productComparisonData)[number];
                    return (
                      <div
                        dir="rtl"
                        className="bg-white border border-[#EAE4DC] rounded-xl p-3.5 shadow-md text-xs space-y-1.5 min-w-[210px]"
                      >
                        <div className="font-bold text-[#2A1F1D] border-b border-[#F0EAE2] pb-1.5">
                          {row.name} (هر {row.unitLabel})
                        </div>
                        <div className="flex justify-between gap-4 tabular-nums">
                          <span className="text-[#6B5B56]">بهای تمام‌شده:</span>
                          <span className="font-semibold text-[#8C5A3C]">
                            {formatCurrency(row.totalCost, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 tabular-nums">
                          <span className="text-[#6B5B56]">قیمت فروش:</span>
                          <span className="font-semibold text-[#C86D2D]">
                            {formatCurrency(row.sellingPrice, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 tabular-nums pt-1 border-t border-[#F0EAE2]">
                          <span className="text-[#6B5B56]">سود خالص واحد:</span>
                          <span
                            className={`font-bold ${
                              row.unitProfit >= 0 ? 'text-[#1F7A5A]' : 'text-[#C93B3B]'
                            }`}
                          >
                            {formatCurrency(row.unitProfit, currency)} (
                            {formatPercent(row.margin)})
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="totalCost"
                  name="بهای تمام‌شده"
                  fill="#8C5A3C"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  dataKey="sellingPrice"
                  name="قیمت فروش"
                  fill="#C86D2D"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  dataKey="unitProfit"
                  name="سود خالص"
                  fill="#1F7A5A"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                >
                  {productComparisonData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.unitProfit >= 0 ? '#1F7A5A' : '#C93B3B'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Per-Product Cost Breakdown Stacked Bar Chart */}
      <ProductCostBreakdownChart
        breakdowns={summary.productBreakdowns}
        currency={currency}
      />
    </div>
  );
};
