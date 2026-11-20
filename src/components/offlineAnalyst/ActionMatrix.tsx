import React from 'react';
import { CheckSquare, Grid2X2, RotateCcw } from 'lucide-react';
import {
  ActionQuadrant,
  CurrencyMode,
  OfflineAuditFinding,
} from '../../types/workshop';
import { formatCompactCurrency, formatNumber } from '../../utils/format';
import { HelpTooltip } from '../HelpTooltip';

interface ActionMatrixProps {
  findings: OfflineAuditFinding[];
  completedIds: string[];
  currency: CurrencyMode;
  onToggleComplete: (id: string) => void;
  onResetChecklist: () => void;
}

const QUADRANTS: Array<{
  key: ActionQuadrant;
  title: string;
  subtitle: string;
  headerClass: string;
  boxClass: string;
}> = [
  {
    key: 'quick-win',
    title: 'برد سریع همین هفته (اثر بالا / زحمت کم)',
    subtitle: 'بالاترین اولویت اجرا — فوری‌ترین بازگشت پول به کارگاه',
    headerClass: 'text-[#175D44]',
    boxClass: 'bg-[#EFF8F4]/70 border-[#C6E6D9]',
  },
  {
    key: 'strategic',
    title: 'پروژه‌های استراتژیک (اثر بالا / زحمت بالا)',
    subtitle: 'نیازمند برنامه‌ریزی ۲ تا ۴ هفته‌ای برای جهش پایدار',
    headerClass: 'text-[#9A4E16]',
    boxClass: 'bg-[#FAF3EC]/70 border-[#EED7B8]',
  },
  {
    key: 'minor',
    title: 'اصلاحات جزئی (اثر متوسط / زحمت کم)',
    subtitle: 'کارهای سریع حاشیه‌ای برای تمیزکاری هزینه‌ها',
    headerClass: 'text-[#4F403C]',
    boxClass: 'bg-[#FAF8F5] border-[#EAE4DC]',
  },
  {
    key: 'time-trap',
    title: 'تله‌های زمان‌بر (اثر کمتر / زحمت بالا)',
    subtitle: 'فعلاً اولویت آخر — پس از بردهای سریع سراغشان بروید',
    headerClass: 'text-[#9E2A2A]',
    boxClass: 'bg-[#FDF2F2]/60 border-[#F0C8C8]',
  },
];

export const ActionMatrix: React.FC<ActionMatrixProps> = ({
  findings,
  completedIds,
  currency,
  onToggleComplete,
  onResetChecklist,
}) => {
  const completedCount = findings.filter((f) =>
    completedIds.includes(f.id)
  ).length;

  return (
    <section
      aria-label="ماتریس اولویت اقدام و چک‌لیست اجرایی"
      className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EAE2]">
        <div>
          <div className="flex items-center gap-2 text-[#1F7A5A] text-xs font-semibold">
            <Grid2X2 className="h-4 w-4" />
            <span>ماتریس اثر در برابر زحمت (۲×۲)</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <h2 className="text-base font-bold text-[#2A1F1D]">
              ماتریس اولویت اقدام و چک‌لیست اجرایی کارگاه
            </h2>
            <HelpTooltip
              title="ماتریس اولویت‌بندی اقدامات"
              description="تمام عارضه‌ها و فرصت‌های کارگاه به‌صورت خودکار در ۴ خانه دسته‌بندی شده‌اند. از خانه «برد سریع همین هفته» شروع کنید و هر موردی را انجام دادید تیک بزنید تا امتیاز سلامت کارگاه شما زنده بالا برود."
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EFF8F4] border border-[#C6E6D9] text-xs font-bold text-[#175D44] tabular-nums">
            <CheckSquare className="h-3.5 w-3.5" />
            <span>
              {formatNumber(completedCount)} از {formatNumber(findings.length)}{' '}
              اقدام تکمیل شد
            </span>
          </div>

          {completedCount > 0 && (
            <button
              type="button"
              onClick={onResetChecklist}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EAE4DC] bg-[#FAF8F5] text-xs font-medium text-[#6B5B56] hover:text-[#2A1F1D]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>بازنشانی</span>
            </button>
          )}
        </div>
      </div>

      {/* 2x2 Quadrant Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {QUADRANTS.map((q) => {
          const items = findings.filter((f) => f.quadrant === q.key);
          return (
            <div
              key={q.key}
              className={`rounded-xl border p-4 space-y-3 ${q.boxClass}`}
            >
              <div>
                <h3 className={`text-sm font-extrabold ${q.headerClass}`}>
                  {q.title}
                </h3>
                <p className="text-[11px] text-[#6B5B56] mt-0.5">
                  {q.subtitle}
                </p>
              </div>

              {items.length === 0 ? (
                <div className="p-3 rounded-lg bg-white/70 border border-dashed border-[#DDD4C8] text-xs text-[#87756E] text-center">
                  موردی در این ربع قرار ندارد.
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => {
                    const checked = completedIds.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-start justify-between gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-[#EFF8F4] border-[#C6E6D9]'
                            : 'bg-white border-[#EAE4DC] hover:border-[#C86D2D]'
                        }`}
                      >
                        <span className="flex items-start gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggleComplete(item.id)}
                            className="mt-0.5 h-4 w-4 accent-[#1F7A5A] rounded shrink-0 cursor-pointer"
                          />
                          <span
                            className={`text-xs font-semibold leading-snug ${
                              checked
                                ? 'line-through text-[#87756E]'
                                : 'text-[#2A1F1D]'
                            }`}
                          >
                            {item.title}
                          </span>
                        </span>
                        <span className="text-[11px] font-bold text-[#4F403C] tabular-nums whitespace-nowrap shrink-0 privacy-sensitive">
                          {formatCompactCurrency(
                            item.monthlyImpactToman,
                            currency
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
