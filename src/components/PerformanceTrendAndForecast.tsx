import React, { useMemo, useState } from 'react';
import {
  Edit3,
  PlusCircle,
  RotateCcw,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
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
import { buildEffectiveSixMonthTrend } from '../utils/accounting';
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  getCurrencyLabel,
  getCurrencyMultiplier,
} from '../utils/format';
import { HelpTooltip } from './HelpTooltip';

interface PerformanceTrendAndForecastProps {
  history: MonthlyPerformanceRecord[];
  summary: WorkshopSummary;
  currency: CurrencyMode;
  onUpdateHistoryRecord: (record: MonthlyPerformanceRecord) => void;
  onRecordNewMonthSnapshot: () => void;
}

export const PerformanceTrendAndForecast: React.FC<
  PerformanceTrendAndForecastProps
> = ({
  history,
  summary,
  currency,
  onUpdateHistoryRecord,
  onRecordNewMonthSnapshot,
}) => {
  const [showHistoryEditor, setShowHistoryEditor] = useState(false);

  const multiplier = getCurrencyMultiplier(currency);
  const currencyLabel = getCurrencyLabel(currency);

  const effectiveTrend = useMemo(
    () => buildEffectiveSixMonthTrend(history, summary),
    [history, summary]
  );

  const sixMonthDeltas = useMemo(() => {
    if (effectiveTrend.length < 2) {
      return { revPct: 0, costPct: 0 };
    }
    const first = effectiveTrend[0];
    const last = effectiveTrend[effectiveTrend.length - 1];
    const revPct =
      first.totalRevenue > 0
        ? ((last.totalRevenue - first.totalRevenue) / first.totalRevenue) * 100
        : 0;
    const costPct =
      first.totalCost > 0
        ? ((last.totalCost - first.totalCost) / first.totalCost) * 100
        : 0;
    return { revPct, costPct };
  }, [effectiveTrend]);

  return (
    <section
      aria-label="روند ۶ ماهه عملکرد کارگاه"
      className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs flex flex-col justify-between space-y-4"
    >
        <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[#C86D2D] text-xs font-semibold">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span>سوابق ذخیره‌شده در حافظه مرورگر (localStorage)</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <h2 className="text-base font-bold text-[#2A1F1D]">
                روند ۶ ماهه «درآمد کل» در برابر «بهای تمام‌شده کل»
              </h2>
              <HelpTooltip
                title="نمودار روند ۶ ماهه کارگاه"
                description="این نمودار خطی نشان می‌دهد فروش کل (خط سبز) و هزینه کل تولید (خط نارنجی) در ۶ ماه گذشته چطور بالا و پایین رفته است. هرچه فاصله دو خط بیشتر باشد یعنی سود شما بهتر شده است. با دکمه «ویرایش سوابق» می‌توانید تمام ماه‌ها را دستی تغییر دهید."
              />
            </div>
            <p className="text-xs text-[#6B5B56] mt-0.5">
              پایش نوسانات ماهانه فروش و هزینه تولید؛ تمام ارقام در حافظه مرورگر ذخیره و قابل ویرایش هستند
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 no-print">
            <button
              type="button"
              onClick={() => setShowHistoryEditor((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] text-xs font-medium text-[#4F403C] hover:bg-[#F3ECE3] transition-colors whitespace-nowrap"
            >
              {showHistoryEditor ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  <span>بستن ویرایشگر</span>
                </>
              ) : (
                <>
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>ویرایش سوابق</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onRecordNewMonthSnapshot}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF3EC] border border-[#E6D5C8] text-xs font-semibold text-[#B25D22] hover:bg-[#F3E4D5] transition-colors whitespace-nowrap"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>ثبت ماه جدید</span>
            </button>
          </div>
        </div>

        {/* Legend & 6-Month Change Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs tabular-nums">
          <div className="flex items-center gap-4 text-[#4F403C]">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1F7A5A]" />
              درآمد کل ماهانه
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-[#C86D2D]" />
              بهای تمام‌شده کل
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#6B5B56]">
            <span>
              تغییر ۶ ماهه درآمد:{' '}
              <strong
                className={
                  sixMonthDeltas.revPct >= 0
                    ? 'text-[#1F7A5A]'
                    : 'text-[#C93B3B]'
                }
              >
                {sixMonthDeltas.revPct >= 0 ? '+' : ''}
                {formatPercent(sixMonthDeltas.revPct, 1)}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              تغییر ۶ ماهه هزینه:{' '}
              <strong className="text-[#C86D2D]">
                {sixMonthDeltas.costPct >= 0 ? '+' : ''}
                {formatPercent(sixMonthDeltas.costPct, 1)}
              </strong>
            </span>
          </div>
        </div>

        {/* Line Chart */}
        <div className="h-[290px] w-full flex-1" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={effectiveTrend}
              margin={{ top: 12, right: 18, left: 10, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#EFE9E1"
                vertical={false}
              />
              <XAxis
                dataKey="monthLabel"
                tick={{ fill: '#4F403C', fontSize: 11 }}
                axisLine={{ stroke: '#EAE4DC' }}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fill: '#6B5B56', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={86}
                tickFormatter={(val: number) =>
                  formatCompactCurrency(val, currency)
                }
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const rec = payload[0].payload as MonthlyPerformanceRecord;
                  const margin =
                    rec.totalRevenue > 0
                      ? (rec.netProfit / rec.totalRevenue) * 100
                      : 0;
                  return (
                    <div
                      dir="rtl"
                      className="bg-white border border-[#EAE4DC] rounded-xl p-3.5 shadow-md text-xs space-y-1.5 min-w-[220px] tabular-nums"
                    >
                      <div className="font-bold text-[#2A1F1D] border-b border-[#F0EAE2] pb-1.5">
                        {rec.monthLabel}
                        {rec.isCurrentMonth ? ' (ماه جاری - زنده)' : ''}
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#6B5B56]">درآمد کل:</span>
                        <span className="font-semibold text-[#1F7A5A]">
                          {formatCurrency(rec.totalRevenue, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#6B5B56]">بهای تمام‌شده کل:</span>
                        <span className="font-semibold text-[#C86D2D]">
                          {formatCurrency(rec.totalCost, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 pt-1 border-t border-[#F0EAE2]">
                        <span className="text-[#6B5B56]">سود خالص:</span>
                        <span
                          className={`font-bold ${
                            rec.netProfit >= 0
                              ? 'text-[#1F7A5A]'
                              : 'text-[#C93B3B]'
                          }`}
                        >
                          {formatCurrency(rec.netProfit, currency)} (
                          {formatPercent(margin)})
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="totalRevenue"
                name="درآمد کل"
                stroke="#1F7A5A"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#1F7A5A', stroke: '#FFFFFF', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                animationDuration={200}
              />
              <Line
                type="monotone"
                dataKey="totalCost"
                name="بهای تمام‌شده کل"
                stroke="#C86D2D"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#C86D2D', stroke: '#FFFFFF', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                animationDuration={200}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Editable Table for All 6 Months Stored in localStorage */}
        {showHistoryEditor && (
          <div className="pt-4 border-t border-[#EAE4DC] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#4F403C]">
                <span>
                  ویرایش مستقیم تمام سوابق ۶ ماهه ({currencyLabel}) — ذخیره خودکار در مرورگر
                </span>
                <HelpTooltip
                  size="xs"
                  title="ویرایش نام ماه، درآمد و هزینه"
                  description="می‌توانید نام هر ماه، عدد درآمد و عدد بهای تمام‌شده را مستقیماً تایپ کنید تا نمودار همان لحظه به‌روز شود."
                />
              </div>
              {effectiveTrend[effectiveTrend.length - 1]?.isManualOverride && (
                <button
                  type="button"
                  onClick={() => {
                    const last = effectiveTrend[effectiveTrend.length - 1];
                    if (!last) return;
                    onUpdateHistoryRecord({
                      ...last,
                      totalRevenue: Math.round(summary.totalMonthlyRevenue),
                      totalCost: Math.round(summary.totalMonthlyCost),
                      netProfit: Math.round(summary.netMonthlyProfit),
                      isManualOverride: false,
                    });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#EAE4DC] bg-[#FAF8F5] text-[11px] font-medium text-[#1F7A5A] hover:bg-[#EFF8F4]"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>همگام‌سازی مجدد ماه آخر با کارگاه</span>
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#EAE4DC] text-[#6B5B56]">
                    <th className="py-2 px-2.5">نام ماه</th>
                    <th className="py-2 px-2.5">درآمد کل ({currencyLabel})</th>
                    <th className="py-2 px-2.5">
                      بهای تمام‌شده ({currencyLabel})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE2]">
                  {effectiveTrend.map((rec, idx) => {
                    const isLatest = idx === effectiveTrend.length - 1;
                    return (
                      <tr key={rec.id}>
                        <td className="py-2 px-2.5">
                          <input
                            type="text"
                            value={rec.monthLabel}
                            onChange={(e) =>
                              onUpdateHistoryRecord({
                                ...rec,
                                monthLabel: e.target.value,
                              })
                            }
                            aria-label={`نام ماه ردیف ${idx + 1}`}
                            className="w-32 h-8 px-2 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs font-medium text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
                          />
                        </td>
                        <td className="py-2 px-2.5">
                          <input
                            type="number"
                            min="0"
                            value={Math.round(rec.totalRevenue * multiplier)}
                            onChange={(e) => {
                              const nextRev = Math.round(
                                Math.max(0, Number(e.target.value) || 0) /
                                  multiplier
                              );
                              onUpdateHistoryRecord({
                                ...rec,
                                totalRevenue: nextRev,
                                netProfit: nextRev - rec.totalCost,
                                isManualOverride: isLatest
                                  ? true
                                  : rec.isManualOverride,
                              });
                            }}
                            aria-label={`درآمد ${rec.monthLabel}`}
                            className="w-36 h-8 px-2 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs focus:outline-none focus:border-[#C86D2D]"
                          />
                        </td>
                        <td className="py-2 px-2.5">
                          <input
                            type="number"
                            min="0"
                            value={Math.round(rec.totalCost * multiplier)}
                            onChange={(e) => {
                              const nextCost = Math.round(
                                Math.max(0, Number(e.target.value) || 0) /
                                  multiplier
                              );
                              onUpdateHistoryRecord({
                                ...rec,
                                totalCost: nextCost,
                                netProfit: rec.totalRevenue - nextCost,
                                isManualOverride: isLatest
                                  ? true
                                  : rec.isManualOverride,
                              });
                            }}
                            aria-label={`بهای تمام‌شده ${rec.monthLabel}`}
                            className="w-36 h-8 px-2 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs focus:outline-none focus:border-[#C86D2D]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </section>
  );
};
