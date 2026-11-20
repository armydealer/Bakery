import React from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { CurrencyMode, OfflineDiagnosticReport } from '../../types/workshop';
import {
  formatCompactCurrency,
  formatNumber,
  formatPercent,
} from '../../utils/format';
import { HelpTooltip } from '../HelpTooltip';

interface HealthRadarCardProps {
  report: OfflineDiagnosticReport;
  boostedHealthScore: number;
  completedFixesCount: number;
  currency: CurrencyMode;
}

export const HealthRadarCard: React.FC<HealthRadarCardProps> = ({
  report,
  boostedHealthScore,
  completedFixesCount,
  currency,
}) => {
  const scoreBoostDelta = boostedHealthScore - report.baseHealthScore;

  const healthTone =
    boostedHealthScore >= 78
      ? { label: 'عالی — هم‌تراز قنادی‌های پیشرو', color: 'text-[#1F7A5A]', bg: 'bg-[#EFF8F4] border-[#C6E6D9]' }
      : boostedHealthScore >= 58
      ? { label: 'مطلوب — دارای ظرفیت جهش سود', color: 'text-[#C86D2D]', bg: 'bg-[#FAF3EC] border-[#EED7B8]' }
      : { label: 'شکننده — نیازمند اقدام فوری', color: 'text-[#C93B3B]', bg: 'bg-[#FDF2F2] border-[#F0C8C8]' };

  return (
    <section
      aria-label="رادار سلامت ۵ بُعدی در برابر بنچمارک بازار ایران"
      className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EAE2]">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-[#2A1F1D]">
              رادار سلامت ۵ بُعدی در برابر بنچمارک بازار ایران
            </h2>
            <HelpTooltip
              title="رادار سلامت کارگاه قنادی"
              description="این نمودار وضعیت واقعی کارگاه شما را در ۵ محور کلیدی (سود واقعی تورم‌زدایی‌شده، بهره‌وری فر، مقاومت در برابر تورم، امنیت چک صیادی و تعادل منو/ضایعات) با استاندارد یک قنادی سودآور ایران مقایسه می‌کند."
            />
          </div>
          <p className="text-xs text-[#6B5B56] mt-0.5">
            مقایسه نمره ۰ تا ۱۰۰ کارگاه شما با «استاندارد قنادی سودآور ایران» (محاسبه آنی در {formatNumber(report.executionTimeMs, 1)} میلی‌ثانیه)
          </p>
        </div>

        <div
          className={`px-3.5 py-2 rounded-xl border flex items-center gap-3 shrink-0 ${healthTone.bg}`}
        >
          <ShieldCheck className={`h-5 w-5 shrink-0 ${healthTone.color}`} />
          <div className="tabular-nums">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-extrabold ${healthTone.color}`}>
                {formatNumber(boostedHealthScore)}
              </span>
              <span className="text-xs text-[#6B5B56]">از ۱۰۰</span>
              {scoreBoostDelta > 0 && (
                <span className="text-[11px] font-bold text-[#1F7A5A]">
                  (+{formatNumber(scoreBoostDelta)} از {formatNumber(completedFixesCount)} اصلاح)
                </span>
              )}
            </div>
            <div className={`text-[11px] font-semibold ${healthTone.color}`}>
              {healthTone.label}
            </div>
          </div>
        </div>
      </div>

      {/* Radar + 5-Axis Detailed Metrics */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
        {/* Recharts RadarChart */}
        <div className="xl:col-span-6 flex flex-col items-center">
          <div className="flex items-center justify-center gap-5 text-xs mb-2">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#2A1F1D]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#C86D2D]" />
              کارگاه شما
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-[#6B5B56]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#1F7A5A]/45 border border-[#1F7A5A]" />
              استاندارد قنادی سودآور ایران
            </span>
          </div>

          <div className="w-full h-[300px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                cx="50%"
                cy="50%"
                outerRadius="70%"
                data={report.radarAxes}
              >
                <PolarGrid stroke="#EAE4DC" />
                <PolarAngleAxis
                  dataKey="shortLabel"
                  tick={{ fill: '#2A1F1D', fontSize: 11, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={54}
                  domain={[0, 100]}
                  tickCount={5}
                  tick={{ fill: '#87756E', fontSize: 10 }}
                  axisLine={false}
                />
                <Radar
                  name="استاندارد قنادی سودآور ایران"
                  dataKey="benchmarkScore"
                  stroke="#1F7A5A"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="#1F7A5A"
                  fillOpacity={0.14}
                />
                <Radar
                  name="کارگاه شما"
                  dataKey="workshopScore"
                  stroke="#C86D2D"
                  strokeWidth={2.5}
                  fill="#C86D2D"
                  fillOpacity={0.32}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload[0]) return null;
                    const item = payload[0].payload as OfflineDiagnosticReport['radarAxes'][number];
                    return (
                      <div
                        dir="rtl"
                        className="bg-white border border-[#EAE4DC] rounded-xl p-3 shadow-md text-xs space-y-1 tabular-nums max-w-[240px]"
                      >
                        <div className="font-bold text-[#2A1F1D]">
                          {item.axisLabel}
                        </div>
                        <div className="text-[#C86D2D] font-bold">
                          امتیاز کارگاه شما: {formatNumber(item.workshopScore)} از ۱۰۰
                        </div>
                        <div className="text-[#1F7A5A] font-semibold">
                          بنچمارک ایران: {formatNumber(item.benchmarkScore)} از ۱۰۰
                        </div>
                      </div>
                    );
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5-Axis Score Cards + Real Profit Summary */}
        <div className="xl:col-span-6 space-y-3">
          {report.radarAxes.map((axis) => {
            const gap = axis.workshopScore - axis.benchmarkScore;
            const isAbove = gap >= 0;
            return (
              <div
                key={axis.axisKey}
                className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4DC] space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 font-bold text-[#2A1F1D]">
                    <span>{axis.axisLabel}</span>
                    <HelpTooltip
                      size="xs"
                      title={axis.axisLabel}
                      description={axis.explanation}
                    />
                  </span>
                  <span className="tabular-nums font-bold">
                    <span
                      className={
                        isAbove ? 'text-[#1F7A5A]' : 'text-[#C86D2D]'
                      }
                    >
                      {formatNumber(axis.workshopScore)}
                    </span>
                    <span className="text-[#87756E] font-normal">
                      {' '}
                      / بنچمارک {formatNumber(axis.benchmarkScore)}
                    </span>
                  </span>
                </div>
                <div className="relative h-2 w-full rounded-md bg-[#EAE4DC] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isAbove ? 'bg-[#1F7A5A]' : 'bg-[#C86D2D]'
                    }`}
                    style={{ width: `${Math.max(4, axis.workshopScore)}%` }}
                  />
                  <div
                    title={`بنچمارک: ${axis.benchmarkScore}`}
                    className="absolute top-0 bottom-0 w-0.5 bg-[#2A1F1D]"
                    style={{ right: `${axis.benchmarkScore}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* Key Real-Profit & Oven-Hour Strip */}
          <div className="grid grid-cols-3 gap-2.5 pt-1 tabular-nums">
            <div className="p-2.5 rounded-xl bg-[#EFF8F4] border border-[#C6E6D9]">
              <div className="text-[10px] text-[#175D44]">
                سود واقعی تورم‌زدایی‌شده
              </div>
              <div className="text-xs font-extrabold text-[#1F7A5A] mt-0.5 privacy-sensitive">
                {formatCompactCurrency(
                  report.realInflationAdjustedProfit,
                  currency
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FAF3EC] border border-[#EED7B8]">
              <div className="text-[10px] text-[#9A4E16]">
                سود هر ساعت فر
              </div>
              <div className="text-xs font-extrabold text-[#C86D2D] mt-0.5 privacy-sensitive">
                {formatCompactCurrency(report.profitPerOvenHour, currency)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FDF2F2] border border-[#F0C8C8]">
              <div className="text-[10px] text-[#9E2A2A]">
                فشار چک صیادی ۳۰ روزه
              </div>
              <div className="text-xs font-extrabold text-[#C93B3B] mt-0.5">
                {formatPercent(report.sayadiCheckStressPercent, 0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
