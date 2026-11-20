import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  AuditSeverity,
  CurrencyMode,
  OfflineAuditFinding,
  TabId,
} from '../../types/workshop';
import { formatCompactCurrency, formatNumber } from '../../utils/format';
import { HelpTooltip } from '../HelpTooltip';

interface OfflineAuditFeedProps {
  findings: OfflineAuditFinding[];
  completedIds: string[];
  currency: CurrencyMode;
  onNavigateFix: (tab: TabId, productId?: string) => void;
  onToggleComplete: (id: string) => void;
}

export const OfflineAuditFeed: React.FC<OfflineAuditFeedProps> = ({
  findings,
  completedIds,
  currency,
  onNavigateFix,
  onToggleComplete,
}) => {
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | 'all'>(
    'all'
  );

  const counts = useMemo(
    () => ({
      all: findings.length,
      critical: findings.filter((f) => f.severity === 'critical').length,
      warning: findings.filter((f) => f.severity === 'warning').length,
      opportunity: findings.filter((f) => f.severity === 'opportunity').length,
    }),
    [findings]
  );

  const visibleFindings = useMemo(
    () =>
      severityFilter === 'all'
        ? findings
        : findings.filter((f) => f.severity === severityFilter),
    [findings, severityFilter]
  );

  const severityMeta: Record<
    AuditSeverity,
    {
      label: string;
      borderClass: string;
      badgeClass: string;
      icon: React.ComponentType<{ className?: string }>;
    }
  > = {
    critical: {
      label: 'بحرانی / نشت پول',
      borderClass: 'border-[#F0C8C8] bg-[#FFFBFB]',
      badgeClass: 'bg-[#FDF2F2] text-[#C93B3B] border-[#F0C8C8]',
      icon: AlertOctagon,
    },
    warning: {
      label: 'هشدار پیشگیرانه',
      borderClass: 'border-[#EED7B8] bg-[#FFFDF9]',
      badgeClass: 'bg-[#FAF3EC] text-[#C86D2D] border-[#EED7B8]',
      icon: AlertTriangle,
    },
    opportunity: {
      label: 'فرصت سودآوری',
      borderClass: 'border-[#C6E6D9] bg-[#FAFEFC]',
      badgeClass: 'bg-[#EFF8F4] text-[#1F7A5A] border-[#C6E6D9]',
      icon: Sparkles,
    },
  };

  return (
    <section
      aria-label="موتور عارضه‌یابی ۲۰ قانونی قنادی ایران"
      className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-4"
    >
      {/* Header + Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#F0EAE2]">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-[#2A1F1D]">
              موتور عارضه‌یابی ۲۰ قانونی قنادی ایران (اولویت‌بندی بر اساس اثر مالی ماهانه)
            </h2>
            <HelpTooltip
              title="عارضه‌یاب ۲۰ قانونی اختصاصی قنادی"
              description="این موتور به‌صورت کاملاً آفلاین ۲۰ قانون تخصصی بازار قنادی ایران (مثل خوردگی سرمایه تورمی، گلوگاه فر، تداخل نرخ اتحادیه، زیان اسنپ‌فود و فشار چک صیادی) را روی کارگاه شما بررسی می‌کند و به ترتیب بیشترین اثر مالی به شما نشان می‌دهد."
            />
          </div>
          <p className="text-xs text-[#6B5B56] mt-0.5">
            {formatNumber(findings.length)} یافته فعال شناسایی شد — با دکمه اقدام مستقیم هر کارت فوراً به صفحه اصلاح آن بروید.
          </p>
        </div>

        <div
          role="group"
          aria-label="فیلتر سطح اهمیت عارضه‌ها"
          className="flex flex-wrap items-center gap-1.5"
        >
          {(
            [
              { id: 'all', label: `همه (${formatNumber(counts.all)})` },
              {
                id: 'critical',
                label: `بحرانی / نشت پول (${formatNumber(counts.critical)})`,
              },
              {
                id: 'warning',
                label: `هشدار پیشگیرانه (${formatNumber(counts.warning)})`,
              },
              {
                id: 'opportunity',
                label: `فرصت سودآوری (${formatNumber(counts.opportunity)})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSeverityFilter(tab.id)}
              aria-pressed={severityFilter === tab.id}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                severityFilter === tab.id
                  ? 'bg-[#2A1F1D] text-white'
                  : 'bg-[#FAF8F5] border border-[#EAE4DC] text-[#4F403C] hover:border-[#C86D2D]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prioritized Audit Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {visibleFindings.length === 0 ? (
          <div className="lg:col-span-2 p-8 text-center rounded-xl bg-[#FAF8F5] border border-[#EAE4DC] text-xs text-[#6B5B56]">
            در این سطح اهمیت، عارضه‌ای شناسایی نشد.
          </div>
        ) : (
          visibleFindings.map((item) => {
            const meta = severityMeta[item.severity];
            const Icon = meta.icon;
            const isDone = completedIds.includes(item.id);
            return (
              <article
                key={item.id}
                className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                  isDone
                    ? 'border-[#C6E6D9] bg-[#F5FBF8] opacity-80'
                    : meta.borderClass
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${meta.badgeClass}`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{meta.label}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-[#87756E] tabular-nums">
                        قانون #{formatNumber(item.ruleNumber)}
                      </span>
                    </div>

                    <div className="text-left shrink-0 tabular-nums">
                      <div className="text-[10px] text-[#87756E]">
                        اثر مالی ماهانه
                      </div>
                      <div className="text-xs font-extrabold text-[#2A1F1D] privacy-sensitive">
                        {formatCompactCurrency(item.monthlyImpactToman, currency)}
                      </div>
                    </div>
                  </div>

                  <h3
                    className={`text-sm font-bold leading-snug ${
                      isDone
                        ? 'line-through text-[#6B5B56]'
                        : 'text-[#2A1F1D]'
                    }`}
                  >
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#4F403C] leading-relaxed">
                    {item.summary}
                  </p>
                  <div className="text-[11px] text-[#6B5B56] bg-white/80 rounded-lg px-2.5 py-1.5 border border-[#EAE4DC]/80">
                    شاهد عددی: {item.evidence}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EAE4DC]/70">
                  <button
                    type="button"
                    onClick={() => onToggleComplete(item.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isDone
                        ? 'bg-[#1F7A5A] text-white'
                        : 'border border-[#DDD4C8] bg-white text-[#4F403C] hover:border-[#1F7A5A] hover:text-[#1F7A5A]'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{isDone ? 'اصلاح انجام شد' : 'ثبت به عنوان انجام‌شده'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onNavigateFix(item.targetTab, item.targetProductId)
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#C86D2D] text-white text-xs font-semibold hover:bg-[#B25D22] transition-colors whitespace-nowrap"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowUpLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};
