import React, { useEffect, useMemo, useState } from 'react';
import { Cpu, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import {
  CurrencyMode,
  OfflineMonthlySnapshot,
  RiskAppetite,
  TabId,
  WorkshopSettings,
  WorkshopState,
  WorkshopSummary,
} from '../../types/workshop';
import {
  computeBoostedHealthScore,
  createOfflineSnapshot,
  getIranianWorkshopDefaults,
  loadCompletedChecklistIds,
  loadOfflineSnapshots,
  runOfflineDiagnosticEngine,
  saveCompletedChecklistIds,
  saveOfflineSnapshots,
} from '../../utils/offlineDiagnosticEngine';
import {
  getCurrencyLabel,
  getCurrencyMultiplier,
} from '../../utils/format';
import { HelpTooltip } from '../HelpTooltip';
import { ActionMatrix } from './ActionMatrix';
import { HealthRadarCard } from './HealthRadarCard';
import { MonthlySnapshotDiff } from './MonthlySnapshotDiff';
import { OfflineAuditFeed } from './OfflineAuditFeed';
import { OfflineWhatIfCards } from './OfflineWhatIfCards';

interface OfflineAnalystTabProps {
  state: WorkshopState;
  summary: WorkshopSummary;
  currency: CurrencyMode;
  riskAppetite: RiskAppetite;
  onChangeRiskAppetite: (risk: RiskAppetite) => void;
  onUpdateSettings: (patch: Partial<WorkshopSettings>) => void;
  onNavigateFix: (tab: TabId, productId?: string) => void;
}

export const OfflineAnalystTab: React.FC<OfflineAnalystTabProps> = ({
  state,
  summary,
  currency,
  riskAppetite,
  onChangeRiskAppetite,
  onUpdateSettings,
  onNavigateFix,
}) => {
  const multiplier = getCurrencyMultiplier(currency);
  const currencyLabel = getCurrencyLabel(currency);

  const report = useMemo(
    () => runOfflineDiagnosticEngine(state, summary, riskAppetite),
    [state, summary, riskAppetite]
  );

  const defaults = useMemo(
    () => getIranianWorkshopDefaults(state, summary),
    [state, summary]
  );

  const [completedIds, setCompletedIds] = useState<string[]>(() =>
    loadCompletedChecklistIds()
  );
  const [snapshots, setSnapshots] = useState<OfflineMonthlySnapshot[]>(() =>
    loadOfflineSnapshots(summary, report)
  );

  useEffect(() => {
    saveCompletedChecklistIds(completedIds);
  }, [completedIds]);

  useEffect(() => {
    saveOfflineSnapshots(snapshots);
  }, [snapshots]);

  const boostedHealthScore = useMemo(
    () =>
      computeBoostedHealthScore(
        report.baseHealthScore,
        report.findings,
        completedIds
      ),
    [report.baseHealthScore, report.findings, completedIds]
  );

  const handleToggleComplete = (id: string) => {
    setCompletedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveSnapshot = (monthLabel: string) => {
    const snap = createOfflineSnapshot(
      monthLabel,
      summary,
      report,
      boostedHealthScore
    );
    setSnapshots((prev) => [...prev, snap]);
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Header & Risk Appetite / Iranian Financial Assumptions Bar */}
      <section className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFF8F4] border border-[#C6E6D9] text-[#175D44] text-xs font-bold">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>۱۰۰٪ آفلاین و آنی</span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B5B56]">
                <Cpu className="h-3.5 w-3.5 text-[#C86D2D]" />
                <span>بدون نیاز به کلید API یا اتصال اینترنت</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-extrabold text-[#2A1F1D]">
                تحلیلگر و عارضه‌یاب تخصصی کارگاه قنادی ایران
              </h2>
              <HelpTooltip
                title="موتور تحلیلی ۱۰۰٪ آفلاین"
                description="تمام محاسبات این بخش مستقیماً روی دستگاه خودتان و در کمتر از ۱۰ میلی‌ثانیه اجرا می‌شود؛ حتی اگر اینترنت قطع باشد، رادار سلامت، ۲۰ قانون عارضه‌یابی، ماتریس اقدام و شبیه‌ساز تصمیم با دقت کامل کار می‌کنند."
              />
            </div>
          </div>

          {/* Risk Appetite Selector */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#4F403C]">
              <span>ریسک‌پذیری مدیر:</span>
              <HelpTooltip
                size="xs"
                title="تنظیم ریسک‌پذیری مدیر"
                description="در حالت «محافظه‌کار» آستانه هشدار حاشیه سود و فشار چک صیادی سخت‌گیرانه‌تر می‌شود؛ در حالت «تهاجمی» تمرکز روی رشد فروش است."
              />
            </span>
            <div
              role="group"
              aria-label="انتخاب سطح ریسک‌پذیری مدیر"
              className="inline-flex items-center p-1 rounded-xl bg-[#FAF8F5] border border-[#EAE4DC]"
            >
              {(
                [
                  { id: 'conservative', label: 'محافظه‌کار' },
                  { id: 'balanced', label: 'متعادل' },
                  { id: 'aggressive', label: 'تهاجمی' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeRiskAppetite(opt.id)}
                  aria-pressed={riskAppetite === opt.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    riskAppetite === opt.id
                      ? 'bg-[#C86D2D] text-white'
                      : 'text-[#6B5B56] hover:text-[#2A1F1D]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Editable Iranian Workshop Financial Parameters Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[#F0EAE2]">
          <div>
            <label
              htmlFor="iran-inflation-rate"
              className="flex items-center gap-1 text-[11px] font-semibold text-[#4F403C] mb-1"
            >
              <SlidersHorizontal className="h-3 w-3 text-[#C86D2D]" />
              <span>تورم ماهانه مواد اولیه (٪)</span>
              <HelpTooltip
                size="xs"
                title="نرخ تورم ماهانه بازار مواد"
                description="برای محاسبه «سود واقعی تورم‌زدایی‌شده» و جلوگیری از خوردگی سرمایه در خرید بعدی استفاده می‌شود."
              />
            </label>
            <input
              id="iran-inflation-rate"
              type="number"
              min={0}
              max={25}
              step={0.5}
              value={defaults.monthlyInflationRate}
              onChange={(e) =>
                onUpdateSettings({
                  monthlyInflationRatePercent: Math.max(
                    0,
                    Number(e.target.value) || 0
                  ),
                })
              }
              className="w-full h-9 px-3 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs font-bold tabular-nums focus:outline-none focus:border-[#C86D2D]"
            />
          </div>

          <div>
            <label
              htmlFor="iran-sayadi-checks"
              className="flex items-center gap-1 text-[11px] font-semibold text-[#4F403C] mb-1"
            >
              <span>چک‌های صیادی ۳۰ روز آینده ({currencyLabel})</span>
              <HelpTooltip
                size="xs"
                title="چک‌های صیادی در سررسید ماه پیش‌رو"
                description="مجموع چک‌هایی که ظرف ۳۰ روز آینده باید پاس شوند تا ریسک نقدینگی کارگاه دقیقاً سنجیده شود."
              />
            </label>
            <input
              id="iran-sayadi-checks"
              type="number"
              min={0}
              step={currency === 'RIAL' ? 50000000 : 5000000}
              value={Math.round(defaults.upcomingSayadiChecks30d * multiplier)}
              onChange={(e) =>
                onUpdateSettings({
                  upcomingSayadiChecks30d: Math.max(
                    0,
                    Math.round((Number(e.target.value) || 0) / multiplier)
                  ),
                })
              }
              className="w-full h-9 px-3 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs font-bold tabular-nums focus:outline-none focus:border-[#C86D2D]"
            />
          </div>

          <div>
            <label
              htmlFor="iran-snapp-comm"
              className="flex items-center gap-1 text-[11px] font-semibold text-[#4F403C] mb-1"
            >
              <span>کمیسیون اسنپ‌فود / آنلاین (٪)</span>
              <HelpTooltip
                size="xs"
                title="کمیسیون فروش آنلاین"
                description="درصد کمیسیون پلتفرم‌های سفارش آنلاین برای تشخیص شیرینی‌هایی که در فروش آنلاین زیان‌ده می‌شوند."
              />
            </label>
            <input
              id="iran-snapp-comm"
              type="number"
              min={0}
              max={40}
              step={1}
              value={defaults.snappFoodCommission}
              onChange={(e) =>
                onUpdateSettings({
                  snappFoodCommissionPercent: Math.max(
                    0,
                    Math.min(40, Number(e.target.value) || 0)
                  ),
                })
              }
              className="w-full h-9 px-3 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs font-bold tabular-nums focus:outline-none focus:border-[#C86D2D]"
            />
          </div>

          <div>
            <label
              htmlFor="iran-staff-count"
              className="flex items-center gap-1 text-[11px] font-semibold text-[#4F403C] mb-1"
            >
              <span>تعداد کل پرسنل (برای ذخیره عیدی)</span>
              <HelpTooltip
                size="xs"
                title="ذخیره عیدی و سنوات اسفند"
                description="برنامه بر اساس تعداد پرسنل کارگاه، مبلغ ذخیره ماهانه لازم برای عیدی و سنوات پایان سال را محاسبه و پایش می‌کند."
              />
            </label>
            <input
              id="iran-staff-count"
              type="number"
              min={1}
              max={50}
              step={1}
              value={defaults.staffCount}
              onChange={(e) =>
                onUpdateSettings({
                  staffCount: Math.max(1, Math.round(Number(e.target.value) || 1)),
                })
              }
              className="w-full h-9 px-3 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs font-bold tabular-nums focus:outline-none focus:border-[#C86D2D]"
            />
          </div>
        </div>
      </section>

      {/* 7.1 5-Axis Benchmark Radar */}
      <HealthRadarCard
        report={report}
        boostedHealthScore={boostedHealthScore}
        completedFixesCount={completedIds.length}
        currency={currency}
      />

      {/* 7.2 20-Rule Expert Audit Feed */}
      <OfflineAuditFeed
        findings={report.findings}
        completedIds={completedIds}
        currency={currency}
        onNavigateFix={onNavigateFix}
        onToggleComplete={handleToggleComplete}
      />

      {/* 7.3 Impact vs Effort 2x2 Matrix & Interactive Checklist */}
      <ActionMatrix
        findings={report.findings}
        completedIds={completedIds}
        currency={currency}
        onToggleComplete={handleToggleComplete}
        onResetChecklist={() => setCompletedIds([])}
      />

      {/* 7.4 Local Snapshot Time-Machine */}
      <MonthlySnapshotDiff
        snapshots={snapshots}
        currency={currency}
        onSaveCurrentSnapshot={handleSaveSnapshot}
      />

      {/* 7.5 Pure Math What-If Decision Simulators */}
      <OfflineWhatIfCards
        state={state}
        summary={summary}
        report={report}
        currency={currency}
      />
    </div>
  );
};
