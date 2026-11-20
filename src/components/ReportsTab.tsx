import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Printer,
  Target,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import {
  CurrencyMode,
  MaterialRequirementRow,
  MenuQuadrant,
  SALES_UNIT_LABELS,
  WorkshopSummary,
} from '../types/workshop';
import { buildExecutiveReportAnalysis } from '../utils/accounting';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  getCurrencyLabel,
  getCurrencyMultiplier,
} from '../utils/format';
import { HelpTooltip } from './HelpTooltip';
import { ProductBreakEvenAnalyzer } from './ProductBreakEvenAnalyzer';
import { ProductCostBreakdownChart } from './ProductCostBreakdownChart';

interface ReportsTabProps {
  summary: WorkshopSummary;
  mrpRows: MaterialRequirementRow[];
  currency: CurrencyMode;
  workshopName: string;
  onUpdateProductQuick: (
    productId: string,
    patch: { sellingPrice?: number; monthlyVolume?: number }
  ) => void;
  onExportExcel: () => void;
}

const QUADRANT_META: Record<
  MenuQuadrant,
  { title: string; subtitle: string; color: string }
> = {
  star: {
    title: 'ستاره‌ها',
    subtitle: 'سود بالا، فروش بالا — محور رشد کارگاه',
    color: '#1F7A5A',
  },
  plowhorse: {
    title: 'پرفروش‌های کم‌سود',
    subtitle: 'فروش بالا، سود پایین — نیازمند اصلاح قیمت',
    color: '#C86D2D',
  },
  puzzle: {
    title: 'پرسودهای کم‌فروش',
    subtitle: 'سود بالا، فروش پایین — نیازمند بازاریابی',
    color: '#3B6E8C',
  },
  dog: {
    title: 'نیازمند بازنگری',
    subtitle: 'سود پایین، فروش پایین — اصلاح رسپی یا حذف',
    color: '#C93B3B',
  },
};

export const ReportsTab: React.FC<ReportsTabProps> = ({
  summary,
  currency,
  workshopName,
  onUpdateProductQuick,
  onExportExcel,
}) => {
  const [reportMode, setReportMode] = useState<'executive' | 'comprehensive'>(
    'executive'
  );
  const multiplier = getCurrencyMultiplier(currency);
  const currencyLabel = getCurrencyLabel(currency);

  const analysis = useMemo(
    () => buildExecutiveReportAnalysis(summary),
    [summary]
  );

  const scatterData = useMemo(
    () =>
      summary.productBreakdowns.map((p) => ({
        name: p.productName,
        volume: p.monthlyVolume,
        margin: Number(p.profitMarginPercent.toFixed(1)),
        monthlyProfit: Math.round(p.monthlyProfit),
        quadrant: p.quadrant,
        sellingPrice: p.sellingPrice,
        totalUnitCost: p.totalUnitCost,
      })),
    [summary]
  );

  const scoreCircumference = 2 * Math.PI * 52;
  const scoreOffset =
    scoreCircumference - (analysis.healthScore / 100) * scoreCircumference;
  const scoreColor =
    analysis.healthScore >= 70
      ? '#1F7A5A'
      : analysis.healthScore >= 50
      ? '#C86D2D'
      : '#C93B3B';

  return (
    <div className="space-y-6">
      {/* Sub-Switcher & Print / Excel Export Toolbar */}
      <div className="bg-white rounded-2xl border border-[#EAE4DC] p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print">
        <div
          role="tablist"
          aria-label="نوع گزارش تحلیلی"
          className="inline-flex items-center p-1 rounded-xl bg-[#F4EFE8] border border-[#EAE4DC]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={reportMode === 'executive'}
            onClick={() => setReportMode('executive')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              reportMode === 'executive'
                ? 'bg-white text-[#C86D2D] shadow-xs'
                : 'text-[#6B5B56] hover:text-[#2A1F1D]'
            }`}
          >
            گزارش خلاصه مدیریتی
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={reportMode === 'comprehensive'}
            onClick={() => setReportMode('comprehensive')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              reportMode === 'comprehensive'
                ? 'bg-white text-[#C86D2D] shadow-xs'
                : 'text-[#6B5B56] hover:text-[#2A1F1D]'
            }`}
          >
            گزارش تحلیلی جامع
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F7A5A] text-white text-xs font-semibold hover:bg-[#176147] transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>خروجی اکسل (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#DDD4C8] bg-white text-xs font-semibold text-[#2A1F1D] hover:bg-[#FAF8F5] transition-colors whitespace-nowrap"
          >
            <Printer className="h-4 w-4 text-[#C86D2D]" />
            <span>چاپ / ذخیره PDF گزارش</span>
          </button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block pb-4 border-b border-[#D8CFC4] mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-[#2A1F1D]">
              {workshopName} —{' '}
              {reportMode === 'executive'
                ? 'گزارش خلاصه مدیریتی'
                : 'گزارش تحلیلی جامع بهایابی'}
            </h1>
            <p className="text-xs text-[#6B5B56] mt-1">
              تهیه‌شده در سامانه بهایابی صنعتی شیرین‌حساب
            </p>
          </div>
          <div className="text-xs text-[#6B5B56]">
            تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}
          </div>
        </div>
      </div>

      {reportMode === 'executive' ? (
        /* MODE 1: EXECUTIVE SUMMARY REPORT */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Financial Health Score Card */}
            <section className="lg:col-span-4 bg-white rounded-2xl border border-[#EAE4DC] p-6 shadow-xs print-card print-avoid-break flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-[#6B5B56]">
                  امتیاز سلامت مالی کارگاه
                </h2>
                <HelpTooltip
                  size="xs"
                  title="امتیاز سلامت مالی (از ۱۰۰)"
                  description="این عدد مثل کارنامه کارگاه شماست! از ۱۰۰ امتیاز داده می‌شود و بر اساس میزان سود، فاصله امن از نقطه سربه‌سر، نداشتن شیرینی ضررده و کم بودن ضایعات پخت حساب می‌شود."
                />
              </div>

              <div className="relative my-5 h-36 w-36 flex items-center justify-center">
                <svg
                  className="h-full w-full -rotate-90"
                  viewBox="0 0 120 120"
                  aria-hidden="true"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="#EFE9E1"
                    strokeWidth="10"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={scoreCircumference}
                    strokeDashoffset={scoreOffset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center tabular-nums">
                  <span
                    className="text-3xl font-extrabold"
                    style={{ color: scoreColor }}
                  >
                    {formatNumber(analysis.healthScore)}
                  </span>
                  <span className="text-xs text-[#87756E]">از ۱۰۰</span>
                </div>
              </div>

              <div
                className="text-base font-extrabold"
                style={{ color: scoreColor }}
              >
                {analysis.healthLabel}
              </div>
              <p className="text-xs text-[#6B5B56] mt-2 leading-relaxed max-w-xs">
                محاسبه‌شده بر اساس حاشیه سود خالص، حاشیه ایمنی نسبت به نقطه سربه‌سر، سلامت سبد محصولات و کنترل افت پخت.
              </p>
            </section>

            {/* Narrative Insights & Action Steps */}
            <section className="lg:col-span-8 bg-white rounded-2xl border border-[#EAE4DC] p-6 shadow-xs print-card print-avoid-break space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE2]">
                <Award className="h-5 w-5 text-[#C86D2D]" />
                <h2 className="text-base font-bold text-[#2A1F1D]">
                  تحلیل متنی هوشمند وضعیت کارگاه
                </h2>
                <HelpTooltip
                  size="xs"
                  title="تحلیل هوشمند مدیریتی"
                  description="خلاصه‌ای ساده و کاربردی از نقاط قوت و ضعف فعلی کارگاه شما؛ می‌گوید کدام شیرینی پرسودترین است، کدام یک خطرناک است و دقیقاً چه کاری سودتان را بیشتر می‌کند."
                />
              </div>

              <div className="space-y-3.5">
                {analysis.insights.map((ins) => {
                  const Icon =
                    ins.tone === 'positive'
                      ? CheckCircle2
                      : ins.tone === 'danger' || ins.tone === 'warning'
                      ? AlertTriangle
                      : Info;
                  const iconColor =
                    ins.tone === 'positive'
                      ? 'text-[#1F7A5A]'
                      : ins.tone === 'danger'
                      ? 'text-[#C93B3B]'
                      : ins.tone === 'warning'
                      ? 'text-[#C86D2D]'
                      : 'text-[#3B6E8C]';
                  return (
                    <div
                      key={ins.id}
                      className="flex items-start gap-3 pb-3 border-b border-[#F5F0EA] last:border-b-0 last:pb-0"
                    >
                      <Icon className={`h-4 w-4 mt-1 shrink-0 ${iconColor}`} />
                      <div>
                        <div className="text-sm font-bold text-[#2A1F1D]">
                          {ins.title}
                        </div>
                        <p className="text-xs text-[#6B5B56] mt-1 leading-relaxed">
                          {ins.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Steps */}
              <div className="rounded-xl bg-[#FAF8F5] border border-[#EAE4DC] p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2A1F1D]">
                  <Target className="h-4 w-4 text-[#C86D2D]" />
                  <span>اقدامات عملی پیشنهادی برای افزایش سود خالص</span>
                </div>
                <ol className="space-y-1.5 text-xs text-[#4F403C] list-decimal list-inside leading-relaxed">
                  {analysis.actionSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            </section>
          </div>

          {/* Executive Summary KPI Table */}
          <section className="bg-white rounded-2xl border border-[#EAE4DC] shadow-xs print-card print-avoid-break overflow-hidden">
            <div className="p-5 border-b border-[#F0EAE2] flex items-center gap-1.5">
              <h2 className="text-base font-bold text-[#2A1F1D]">
                جدول خلاصه عملکرد مالی ماهانه کارگاه
              </h2>
              <HelpTooltip
                size="xs"
                title="خلاصه دخل و خرج ماهانه"
                description="یک نگاه کلی به درآمد ماهانه، جمع هزینه‌های مواد، بسته‌بندی، دستمزد و سربار و در نهایت سود خالصی که برای شما می‌ماند."
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm border-collapse tabular-nums">
                <tbody className="divide-y divide-[#F0EAE2]">
                  <tr>
                    <td className="py-3.5 px-5 text-[#6B5B56]">
                      درآمد کل ماهانه پیش‌بینی‌شده
                    </td>
                    <td className="py-3.5 px-5 font-bold text-[#2A1F1D] text-left">
                      {formatCurrency(summary.totalMonthlyRevenue, currency)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 text-[#6B5B56]">
                      مجموع هزینه مواد اولیه خالص و افت پخت
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-[#2A1F1D] text-left">
                      {formatCurrency(
                        summary.totalMonthlyMaterialCost +
                          summary.totalMonthlyWastageCost,
                        currency
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 text-[#6B5B56]">
                      مجموع هزینه بسته‌بندی و دستمزد مستقیم
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-[#2A1F1D] text-left">
                      {formatCurrency(
                        summary.totalMonthlyPackagingCost +
                          summary.totalMonthlyLaborCost,
                        currency
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 text-[#6B5B56]">
                      سربار ثابت ماهانه کارگاه
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-[#2A1F1D] text-left">
                      {formatCurrency(
                        summary.totalMonthlyFixedOverhead,
                        currency
                      )}
                    </td>
                  </tr>
                  <tr className="bg-[#FAF8F5] font-extrabold">
                    <td className="py-4 px-5 text-[#2A1F1D]">
                      سود خالص ماهانه (حاشیه سود{' '}
                      {formatPercent(summary.netProfitMarginPercent)})
                    </td>
                    <td
                      className={`py-4 px-5 text-left text-base ${
                        summary.netMonthlyProfit >= 0
                          ? 'text-[#1F7A5A]'
                          : 'text-[#C93B3B]'
                      }`}
                    >
                      {formatCurrency(summary.netMonthlyProfit, currency)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 text-[#6B5B56]">
                      نقطه سربه‌سر فروش ماهانه
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-[#C86D2D] text-left">
                      {Number.isFinite(summary.breakEvenRevenue)
                        ? formatCurrency(summary.breakEvenRevenue, currency)
                        : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          {/* Stacked Bar Chart of Cost Breakdown & Productivity in Executive mode */}
          <ProductCostBreakdownChart
            breakdowns={summary.productBreakdowns}
            currency={currency}
            defaultLayoutMode="stacked"
            showProductivityStrip
            className="print-card print-avoid-break"
          />

          {/* Per-Product Monthly, Quarterly & Annual Break-Even Analysis */}
          <ProductBreakEvenAnalyzer
            breakdowns={summary.productBreakdowns}
            currency={currency}
            onUpdateProductQuick={onUpdateProductQuick}
            className="print-card"
          />
        </div>
      ) : (
        /* MODE 2: COMPREHENSIVE ANALYTICAL REPORT */
        <div className="space-y-6">
          {/* Menu Engineering Matrix Scatter Chart */}
          <section className="bg-white rounded-2xl border border-[#EAE4DC] p-5 sm:p-6 shadow-xs print-card print-avoid-break space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-[#2A1F1D]">
                    ماتریس مهندسی منو و سودآوری محصولات
                  </h2>
                  <HelpTooltip
                    size="xs"
                    title="ماتریس مهندسی منو چیست؟"
                    description="شیرینی‌های شما را در ۴ گروه دسته‌بندی می‌کند تا بدانید روی کدام‌ها بیشتر تبلیغ کنید (ستاره‌ها و پرسودها) و قیمت یا دستور پخت کدام‌ها را باید سریع اصلاح کنید."
                  />
                </div>
                <p className="text-xs text-[#6B5B56] mt-0.5 tabular-nums">
                  محور افقی: تیراژ فروش ماهانه (میانگین {formatNumber(summary.avgVolume, 0)}) · محور عمودی: حاشیه سود خالص (میانگین {formatPercent(summary.avgMargin)})
                </p>
              </div>
            </div>

            <div className="h-[360px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 36, right: 40, bottom: 26, left: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFE9E1" />
                  <XAxis
                    type="number"
                    dataKey="volume"
                    name="تیراژ ماهانه"
                    tick={{ fill: '#6B5B56', fontSize: 11 }}
                    tickFormatter={(v: number) => formatNumber(v)}
                    label={{
                      value: 'تیراژ فروش ماهانه (واحد / کیلو گرم)',
                      position: 'insideBottom',
                      offset: -14,
                      fill: '#6B5B56',
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="margin"
                    name="حاشیه سود"
                    width={52}
                    domain={[
                      (dataMin: number) => Math.min(0, Math.floor(dataMin - 5)),
                      (dataMax: number) => Math.ceil(dataMax + 12),
                    ]}
                    tick={{ fill: '#6B5B56', fontSize: 11 }}
                    tickFormatter={(v: number) => `${formatNumber(v)}٪`}
                  />
                  <ZAxis
                    type="number"
                    dataKey="monthlyProfit"
                    range={[140, 520]}
                    name="سود ماهانه"
                  />
                  <ReferenceLine
                    x={summary.avgVolume}
                    stroke="#B8A593"
                    strokeDasharray="4 4"
                  />
                  <ReferenceLine
                    y={summary.avgMargin}
                    stroke="#B8A593"
                    strokeDasharray="4 4"
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0)
                        return null;
                      const pt = payload[0].payload as (typeof scatterData)[number];
                      const meta = QUADRANT_META[pt.quadrant];
                      return (
                        <div
                          dir="rtl"
                          className="bg-white border border-[#EAE4DC] rounded-xl p-3.5 shadow-md text-xs space-y-1.5 tabular-nums min-w-[200px]"
                        >
                          <div className="font-bold text-[#2A1F1D]">
                            {pt.name}
                          </div>
                          <div
                            className="font-semibold"
                            style={{ color: meta.color }}
                          >
                            {meta.title}
                          </div>
                          <div className="flex justify-between gap-4 pt-1 border-t border-[#F0EAE2]">
                            <span className="text-[#6B5B56]">تیراژ ماهانه:</span>
                            <span className="font-semibold">
                              {formatNumber(pt.volume)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-[#6B5B56]">حاشیه سود:</span>
                            <span className="font-semibold">
                              {formatPercent(pt.margin)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-[#6B5B56]">سود ماهانه:</span>
                            <span className="font-bold text-[#1F7A5A]">
                              {formatCompactCurrency(
                                pt.monthlyProfit,
                                currency
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter name="محصولات" data={scatterData}>
                    {scatterData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={QUADRANT_META[entry.quadrant].color}
                        fillOpacity={0.85}
                      />
                    ))}
                    <LabelList
                      dataKey="name"
                      position="top"
                      offset={10}
                      style={{
                        fill: '#2A1F1D',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* 4-Quadrant Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-[#F0EAE2]">
              {(['star', 'plowhorse', 'puzzle', 'dog'] as MenuQuadrant[]).map(
                (q) => {
                  const meta = QUADRANT_META[q];
                  const items = summary.productBreakdowns.filter(
                    (p) => p.quadrant === q
                  );
                  return (
                    <div
                      key={q}
                      className="rounded-xl bg-[#FAF8F5] border border-[#EAE4DC] p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-xs font-extrabold"
                          style={{ color: meta.color }}
                        >
                          {meta.title}
                        </span>
                        <span className="text-xs font-bold text-[#6B5B56] tabular-nums">
                          {formatNumber(items.length)} محصول
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B5B56]">
                        {meta.subtitle}
                      </p>
                      <div className="text-xs font-medium text-[#2A1F1D] pt-1">
                        {items.length > 0
                          ? items.map((i) => i.productName).join(' · ')
                          : 'بدون محصول در این ناحیه'}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </section>

          {/* Stacked Bar Chart of Cost Breakdown & Productivity in Comprehensive mode */}
          <ProductCostBreakdownChart
            breakdowns={summary.productBreakdowns}
            currency={currency}
            defaultLayoutMode="stacked"
            showProductivityStrip
            className="print-card print-avoid-break"
          />

          {/* Per-Product Monthly, Quarterly & Annual Break-Even Analysis */}
          <ProductBreakEvenAnalyzer
            breakdowns={summary.productBreakdowns}
            currency={currency}
            onUpdateProductQuick={onUpdateProductQuick}
            className="print-card"
          />

          {/* Full Comparative Costing Table */}
          <section className="bg-white rounded-2xl border border-[#EAE4DC] shadow-xs print-card overflow-hidden">
            <div className="p-5 border-b border-[#F0EAE2]">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-[#2A1F1D]">
                  جدول مقایسه‌ای کامل بهایابی و سودآوری محصولات
                </h2>
                <HelpTooltip
                  size="xs"
                  title="جدول کامل مقایسه محصولات"
                  description="ریز هزینه‌های تمام شیرینی‌ها را یکجا کنار هم ببینید. می‌توانید تیراژ فروش ماهانه و قیمت فروش هر محصول را همینجا داخل جدول ویرایش کنید تا سودش بلافاصله به‌روز شود."
                />
              </div>
              <p className="text-xs text-[#6B5B56] mt-0.5">
                جزئیات بهای تمام‌شده هر واحد (کیلو گرم یا عدد) و سهم هر محصول در سود خالص ماهانه کارگاه
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#EAE4DC] text-[#6B5B56] font-semibold">
                    <th className="py-3 px-3.5 whitespace-nowrap">محصول و تیراژ ماهانه</th>
                    <th className="py-3 px-2.5 whitespace-nowrap">مواد خام</th>
                    <th className="py-3 px-2.5 whitespace-nowrap">افت پخت</th>
                    <th className="py-3 px-2.5 whitespace-nowrap">بسته‌بندی</th>
                    <th className="py-3 px-2.5 whitespace-nowrap">دستمزد</th>
                    <th className="py-3 px-2.5 whitespace-nowrap">سربار</th>
                    <th className="py-3 px-2.5 whitespace-nowrap text-[#2A1F1D]">
                      بهای کل واحد
                    </th>
                    <th className="py-3 px-2.5 whitespace-nowrap">
                      قیمت فروش ({currencyLabel})
                    </th>
                    <th className="py-3 px-2.5 whitespace-nowrap">سود واحد</th>
                    <th className="py-3 px-2.5 whitespace-nowrap">حاشیه سود</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-left">
                      سود خالص ماهانه
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE2]">
                  {summary.productBreakdowns.map((p) => (
                    <tr
                      key={p.productId}
                      className="hover:bg-[#FCF9F5] transition-colors"
                    >
                      <td className="py-3 px-3.5 font-bold text-[#2A1F1D] whitespace-nowrap">
                        <div>{p.productName}</div>
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-normal text-[#87756E]">
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={p.monthlyVolume}
                            onChange={(e) =>
                              onUpdateProductQuick(p.productId, {
                                monthlyVolume: Math.max(
                                  0,
                                  Number(e.target.value) || 0
                                ),
                              })
                            }
                            aria-label={`تیراژ ماهانه ${p.productName}`}
                            className="w-16 h-6 px-1.5 rounded border border-[#DDD4C8] bg-[#FAF8F5] text-[11px] font-semibold text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D] no-print"
                          />
                          <span className="hidden print:inline">
                            {formatNumber(p.monthlyVolume)}
                          </span>
                          <span>{SALES_UNIT_LABELS[p.salesUnit]}/ماه</span>
                        </div>
                      </td>
                      <td className="py-3 px-2.5 text-[#4F403C]">
                        {formatCurrency(p.rawMaterialCostPerUnit, currency, false)}
                      </td>
                      <td className="py-3 px-2.5 text-[#C86D2D]">
                        {formatCurrency(p.wastageCostPerUnit, currency, false)}
                      </td>
                      <td className="py-3 px-2.5 text-[#4F403C]">
                        {formatCurrency(p.packagingCostPerUnit, currency, false)}
                      </td>
                      <td className="py-3 px-2.5 text-[#4F403C]">
                        {formatCurrency(p.directLaborCostPerUnit, currency, false)}
                      </td>
                      <td className="py-3 px-2.5 text-[#4F403C]">
                        {formatCurrency(p.overheadCostPerUnit, currency, false)}
                      </td>
                      <td className="py-3 px-2.5 font-bold text-[#2A1F1D]">
                        {formatCurrency(p.totalUnitCost, currency, false)}
                      </td>
                      <td className="py-3 px-2.5 font-semibold text-[#2A1F1D]">
                        <input
                          type="number"
                          min="0"
                          step={currency === 'RIAL' ? '10000' : '1000'}
                          value={Math.round(p.sellingPrice * multiplier)}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            onUpdateProductQuick(p.productId, {
                              sellingPrice: Math.round(val / multiplier),
                            });
                          }}
                          aria-label={`قیمت فروش ${p.productName}`}
                          className="w-24 h-7 px-2 rounded border border-[#DDD4C8] bg-[#FAF8F5] text-xs font-semibold text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D] no-print"
                        />
                        <span className="hidden print:inline">
                          {formatCurrency(p.sellingPrice, currency, false)}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-2.5 font-bold ${
                          p.unitProfit >= 0 ? 'text-[#1F7A5A]' : 'text-[#C93B3B]'
                        }`}
                      >
                        {formatCurrency(p.unitProfit, currency, false)}
                      </td>
                      <td
                        className={`py-3 px-2.5 font-bold ${
                          p.profitMarginPercent < 15
                            ? 'text-[#C93B3B]'
                            : 'text-[#1F7A5A]'
                        }`}
                      >
                        {formatPercent(p.profitMarginPercent)}
                      </td>
                      <td
                        className={`py-3 px-3.5 text-left font-extrabold whitespace-nowrap ${
                          p.monthlyProfit >= 0
                            ? 'text-[#1F7A5A]'
                            : 'text-[#C93B3B]'
                        }`}
                      >
                        {formatCurrency(p.monthlyProfit, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#FAF8F5] border-t border-[#EAE4DC] font-extrabold text-xs">
                    <td colSpan={9} className="py-3.5 px-3.5 text-[#2A1F1D]">
                      جمع کل عملکرد ماهانه کارگاه
                    </td>
                    <td className="py-3.5 px-2.5 text-[#1F7A5A]">
                      {formatPercent(summary.netProfitMarginPercent)}
                    </td>
                    <td
                      className={`py-3.5 px-3.5 text-left whitespace-nowrap ${
                        summary.netMonthlyProfit >= 0
                          ? 'text-[#1F7A5A]'
                          : 'text-[#C93B3B]'
                      }`}
                    >
                      {formatCurrency(summary.netMonthlyProfit, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
