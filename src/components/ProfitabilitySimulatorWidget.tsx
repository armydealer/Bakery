import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { CurrencyMode, WorkshopSummary } from '../types/workshop';
import { simulateMonthlyProfitabilityByVolume } from '../utils/accounting';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../utils/format';
import { HelpTooltip } from './HelpTooltip';

interface ProfitabilitySimulatorWidgetProps {
  summary: WorkshopSummary;
  currency: CurrencyMode;
}

export const ProfitabilitySimulatorWidget: React.FC<
  ProfitabilitySimulatorWidgetProps
> = ({ summary, currency }) => {
  const baseVolume = Math.max(10, Math.round(summary.totalMonthlyVolume));
  const [simulatedVolume, setSimulatedVolume] = useState<number>(baseVolume);

  // Sync slider if the user edits product monthly volumes elsewhere
  useEffect(() => {
    setSimulatedVolume(Math.max(10, Math.round(summary.totalMonthlyVolume)));
  }, [summary.totalMonthlyVolume]);

  const minVolume = Math.max(
    10,
    Math.floor((baseVolume * 0.2) / 5) * 5
  );
  const maxVolume = Math.max(
    200,
    Math.ceil((baseVolume * 2.0) / 10) * 10
  );

  const sim = useMemo(
    () => simulateMonthlyProfitabilityByVolume(summary, simulatedVolume),
    [summary, simulatedVolume]
  );

  const isModified = Math.round(simulatedVolume) !== baseVolume;

  // Position markers along the volume track (0..100%)
  const trackSpan = Math.max(1, maxVolume - minVolume);
  const breakEvenMarkerPct = Number.isFinite(sim.breakEvenVolume)
    ? Math.min(
        100,
        Math.max(0, ((sim.breakEvenVolume - minVolume) / trackSpan) * 100)
      )
    : null;
  const currentVolumePct = Math.min(
    100,
    Math.max(0, ((simulatedVolume - minVolume) / trackSpan) * 100)
  );

  return (
    <section
      aria-label="شبیه‌ساز سودآوری ماهانه"
      className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#F0EAE2]">
        <div>
          <div className="flex items-center gap-2 text-[#C86D2D] text-xs font-semibold">
            <Activity className="h-4 w-4" />
            <span>تحلیل بلادرنگ حجم تولید، نقطه سربه‌سر و سود</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <h2 className="text-base font-bold text-[#2A1F1D]">
              شبیه‌ساز سودآوری ماهانه
            </h2>
            <HelpTooltip
              title="شبیه‌ساز سودآوری ماهانه چیست؟"
              description="این بخش مثل یک ماشین‌حساب آزمایشی است: بدون اینکه اطلاعات واقعی شما عوض شود، میزان تولید ماهانه را کم یا زیاد کنید تا همان لحظه ببینید سود شما چقدر تغییر می‌کند و چقدر از نقطه سربه‌سر فاصله دارید."
            />
          </div>
          <p className="text-xs text-[#6B5B56] mt-0.5">
            با تغییر اسلایدر یا عدد حجم تولید کل، اثر آن را روی پوشش نقطه سربه‌سر و سود خالص نهایی به‌صورت لحظه‌ای ببینید
          </p>
        </div>

        {isModified && (
          <button
            type="button"
            onClick={() => setSimulatedVolume(baseVolume)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] text-xs font-medium text-[#4F403C] hover:bg-[#F3ECE3] transition-colors whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>بازگشت به حجم فعلی ({formatNumber(baseVolume)})</span>
          </button>
        )}
      </div>

      {/* Main Volume Slider + Break-Even Threshold Indicator */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 tabular-nums">
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="dashboard-volume-slider"
              className="text-xs sm:text-sm font-bold text-[#2A1F1D]"
            >
              حجم تولید کل ماهانه (واحد / کیلو گرم)
            </label>
            <HelpTooltip
              size="xs"
              title="حجم تولید کل ماهانه"
              description="مجموع کل شیرینی‌هایی که در ماه می‌پزید و می‌فروشید (بر حسب کیلو گرم یا عدد). هرچه بیشتر تولید کنید، هزینه اجاره و قبوض بین تعداد بیشتری تقسیم می‌شود و سودتان بیشتر می‌شود."
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max={maxVolume * 2}
              step="5"
              value={simulatedVolume}
              onChange={(e) =>
                setSimulatedVolume(Math.max(1, Number(e.target.value) || 1))
              }
              aria-label="عدد حجم تولید کل ماهانه"
              className="w-24 h-8 px-2.5 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-center text-sm font-extrabold text-[#C86D2D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
            />
            <span className="text-xs font-semibold text-[#4F403C]">
              واحد / کیلو گرم
            </span>
            {isModified && (
              <span
                className={`text-xs font-bold ${
                  sim.volumeDelta >= 0 ? 'text-[#1F7A5A]' : 'text-[#C93B3B]'
                }`}
              >
                ({sim.volumeDelta > 0 ? '+' : ''}
                {formatPercent(sim.volumeChangePercent, 0)})
              </span>
            )}
          </div>
        </div>

        <input
          id="dashboard-volume-slider"
          type="range"
          min={minVolume}
          max={maxVolume}
          step={5}
          value={simulatedVolume}
          onChange={(e) => setSimulatedVolume(Number(e.target.value))}
          aria-label="اسلایدر حجم تولید کل"
          className="w-full saffron-slider cursor-pointer"
        />

        {/* Visual Break-Even Crossing Track (RTL-aligned with range slider) */}
        <div className="space-y-1.5">
          <div className="relative h-2.5 w-full rounded-full bg-[#EFE9E1] overflow-visible">
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                sim.isAboveBreakEven ? 'bg-[#1F7A5A]' : 'bg-[#C93B3B]'
              }`}
              style={{ width: `${currentVolumePct}%` }}
            />
            {breakEvenMarkerPct !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-[#2A1F1D]"
                style={{ right: `calc(${breakEvenMarkerPct}% - 2px)` }}
                title={`نقطه سربه‌سر: ${formatNumber(Math.ceil(sim.breakEvenVolume))} واحد / کیلو گرم`}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#87756E] tabular-nums">
            <span>حداقل: {formatNumber(minVolume)}</span>
            {Number.isFinite(sim.breakEvenVolume) && (
              <span className="font-semibold text-[#2A1F1D]">
                مرز نقطه سربه‌سر: {formatNumber(Math.ceil(sim.breakEvenVolume))}{' '}
                واحد / کیلو گرم
              </span>
            )}
            <span>حداکثر: {formatNumber(maxVolume)}</span>
          </div>
        </div>
      </div>

      {/* Real-Time Impact Output Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 tabular-nums">
        {/* Card 1: Final Simulated Net Profit */}
        <div
          className={`rounded-xl border p-4 space-y-1 ${
            sim.simulatedNetProfit >= 0
              ? 'border-[#C6E6D9] bg-[#EFF8F4]'
              : 'border-[#F0C8C8] bg-[#FDF2F2]'
          }`}
        >
          <div className="flex items-center justify-between gap-2 text-xs text-[#4F403C]">
            <span>سود خالص نهایی شبیه‌سازی‌شده</span>
            {sim.simulatedNetProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-[#1F7A5A] shrink-0" />
            ) : (
              <TrendingDown className="h-4 w-4 text-[#C93B3B] shrink-0" />
            )}
          </div>
          <div
            className={`text-lg font-extrabold ${
              sim.simulatedNetProfit >= 0
                ? 'text-[#1F7A5A]'
                : 'text-[#C93B3B]'
            }`}
          >
            {formatCurrency(sim.simulatedNetProfit, currency)}
          </div>
          <div className="text-[11px] text-[#4F403C]">
            {isModified ? (
              <>
                تغییر نسبت به الان:{' '}
                <strong
                  className={
                    sim.profitDeltaFromCurrent >= 0
                      ? 'text-[#1F7A5A]'
                      : 'text-[#C93B3B]'
                  }
                >
                  {sim.profitDeltaFromCurrent >= 0 ? '+' : ''}
                  {formatCompactCurrency(sim.profitDeltaFromCurrent, currency)}
                </strong>
              </>
            ) : (
              `حاشیه سود خالص: ${formatPercent(sim.simulatedNetMarginPercent)}`
            )}
          </div>
        </div>

        {/* Card 2: Break-Even Status & Coverage */}
        <div className="rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] p-4 space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs text-[#6B5B56]">
            <span>وضعیت نسبت به نقطه سربه‌سر</span>
            {sim.isAboveBreakEven ? (
              <CheckCircle2 className="h-4 w-4 text-[#1F7A5A] shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-[#C93B3B] shrink-0" />
            )}
          </div>
          <div
            className={`text-base font-extrabold ${
              sim.isAboveBreakEven ? 'text-[#1F7A5A]' : 'text-[#C93B3B]'
            }`}
          >
            {sim.isAboveBreakEven
              ? `${formatPercent(sim.breakEvenCoveragePercent, 0)} پوشش سربه‌سر`
              : `زیان‌ده (${formatPercent(sim.breakEvenCoveragePercent, 0)} پوشش)`}
          </div>
          <div className="text-[11px] text-[#6B5B56]">
            {Number.isFinite(sim.breakEvenVolume)
              ? sim.unitsFromBreakEven >= 0
                ? `${formatNumber(Math.floor(sim.unitsFromBreakEven))} واحد بالاتر از مرز سربه‌سر`
                : `${formatNumber(Math.ceil(Math.abs(sim.unitsFromBreakEven)))} واحد کمبود تا سربه‌سر`
              : 'نقطه سربه‌سر قابل محاسبه نیست'}
          </div>
        </div>

        {/* Card 3: Margin of Safety & Net Margin */}
        <div className="rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] p-4 space-y-1">
          <div className="text-xs text-[#6B5B56]">حاشیه سود و حاشیه ایمنی</div>
          <div
            className={`text-lg font-extrabold ${
              sim.simulatedNetMarginPercent >= 15
                ? 'text-[#1F7A5A]'
                : sim.simulatedNetMarginPercent >= 0
                ? 'text-[#C86D2D]'
                : 'text-[#C93B3B]'
            }`}
          >
            {formatPercent(sim.simulatedNetMarginPercent)}
          </div>
          <div className="text-[11px] text-[#6B5B56]">
            حاشیه ایمنی فروش:{' '}
            <strong className="text-[#2A1F1D]">
              {formatPercent(sim.marginOfSafetyPercent)}
            </strong>
          </div>
        </div>

        {/* Card 4: Overhead Absorption & Projected Revenue */}
        <div className="rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] p-4 space-y-1">
          <div className="text-xs text-[#6B5B56]">درآمد و سربار هر واحد</div>
          <div className="text-lg font-extrabold text-[#2A1F1D]">
            {formatCompactCurrency(sim.simulatedRevenue, currency)}
          </div>
          <div className="text-[11px] text-[#6B5B56]">
            سربار جذب‌شده هر واحد:{' '}
            <strong className="text-[#C86D2D]">
              {formatCurrency(sim.overheadPerUnitSimulated, currency)}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
};
