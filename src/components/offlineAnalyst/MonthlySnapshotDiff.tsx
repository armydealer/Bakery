import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookmarkPlus,
  Check,
  History,
} from 'lucide-react';
import {
  CurrencyMode,
  OfflineMonthlySnapshot,
} from '../../types/workshop';
import { compareMonthlySnapshots } from '../../utils/offlineDiagnosticEngine';
import {
  formatCompactCurrency,
  formatNumber,
  formatPercent,
} from '../../utils/format';
import { HelpTooltip } from '../HelpTooltip';

interface MonthlySnapshotDiffProps {
  snapshots: OfflineMonthlySnapshot[];
  currency: CurrencyMode;
  onSaveCurrentSnapshot: (monthLabel: string) => void;
}

export const MonthlySnapshotDiff: React.FC<MonthlySnapshotDiffProps> = ({
  snapshots,
  currency,
  onSaveCurrentSnapshot,
}) => {
  const [fromId, setFromId] = useState<string>(snapshots[0]?.id ?? '');
  const [toId, setToId] = useState<string>(
    snapshots[snapshots.length - 1]?.id ?? ''
  );
  const [newMonthLabel, setNewMonthLabel] = useState<string>('شهریور ۱۴۰۵');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (snapshots.length >= 2) {
      if (!snapshots.some((s) => s.id === fromId)) {
        setFromId(snapshots[0].id);
      }
      if (!snapshots.some((s) => s.id === toId)) {
        setToId(snapshots[snapshots.length - 1].id);
      }
    }
  }, [snapshots, fromId, toId]);

  const fromSnap =
    snapshots.find((s) => s.id === fromId) ?? snapshots[0] ?? null;
  const toSnap =
    snapshots.find((s) => s.id === toId) ??
    snapshots[snapshots.length - 1] ??
    null;

  const deltas = useMemo(() => {
    if (!fromSnap || !toSnap) return [];
    return compareMonthlySnapshots(fromSnap, toSnap);
  }, [fromSnap, toSnap]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCurrentSnapshot(newMonthLabel.trim() || 'کارنامه جدید');
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 3000);
  };

  const formatMetricValue = (
    val: number,
    unit: 'currency' | 'percent' | 'day' | 'score'
  ) => {
    if (unit === 'currency') return formatCompactCurrency(val, currency);
    if (unit === 'percent') return formatPercent(val, 1);
    if (unit === 'day') return `روز ${formatNumber(val)}`;
    return `${formatNumber(val)} از ۱۰۰`;
  };

  const formatMetricDelta = (
    delta: number,
    unit: 'currency' | 'percent' | 'day' | 'score'
  ) => {
    const sign = delta > 0 ? '+' : '';
    if (unit === 'currency') {
      return `${sign}${formatCompactCurrency(delta, currency)}`;
    }
    if (unit === 'percent') return `${sign}${formatPercent(delta, 1)}`;
    if (unit === 'day') return `${sign}${formatNumber(delta)} روز`;
    return `${sign}${formatNumber(delta)} امتیاز`;
  };

  return (
    <section
      aria-label="مقایسه‌گر ماه‌به‌ماه آفلاین و ماشین زمان کارنامه"
      className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-5"
    >
      {/* Header + 1-Click Save Current Month Snapshot */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#F0EAE2]">
        <div>
          <div className="flex items-center gap-2 text-[#C86D2D] text-xs font-semibold">
            <History className="h-4 w-4" />
            <span>ماشین زمان آفلاین کارنامه ماهانه</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <h2 className="text-base font-bold text-[#2A1F1D]">
              مقایسه‌گر ماه‌به‌ماه آفلاین (ذخیره در حافظه محلی)
            </h2>
            <HelpTooltip
              title="ثبت و مقایسه کارنامه ماه‌های مختلف"
              description="با زدن دکمه «ثبت کارنامه این ماه»، خلاصه سود واقعی، ضایعات، سود ساعت فر و روز سر‌به‌سر همین لحظه در حافظه مرورگر ذخیره می‌شود تا هر دو ماه دلخواه را کنار هم مقایسه کنید."
            />
          </div>
        </div>

        <form onSubmit={handleSave} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newMonthLabel}
            onChange={(e) => setNewMonthLabel(e.target.value)}
            aria-label="عنوان ماه برای ثبت کارنامه"
            placeholder="مثلاً: شهریور ۱۴۰۵"
            className="w-36 h-9 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-xs font-semibold text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
          />
          <button
            type="submit"
            className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              justSaved
                ? 'bg-[#1F7A5A] text-white'
                : 'bg-[#2A1F1D] text-white hover:bg-[#3F302D]'
            }`}
          >
            {justSaved ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>کارنامه ثبت شد!</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="h-3.5 w-3.5" />
                <span>ثبت کارنامه این ماه</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Month Selectors */}
      <div className="flex flex-wrap items-center gap-3 bg-[#FAF8F5] border border-[#EAE4DC] rounded-xl p-3.5 text-xs">
        <div className="flex items-center gap-2">
          <label htmlFor="snap-from" className="font-semibold text-[#6B5B56]">
            ماه مبنا:
          </label>
          <select
            id="snap-from"
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="h-9 px-3 rounded-lg border border-[#DDD4C8] bg-white font-bold text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
          >
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.monthLabel}
              </option>
            ))}
          </select>
        </div>

        <span className="font-bold text-[#C86D2D]">در برابر</span>

        <div className="flex items-center gap-2">
          <label htmlFor="snap-to" className="font-semibold text-[#6B5B56]">
            ماه مقایسه:
          </label>
          <select
            id="snap-to"
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="h-9 px-3 rounded-lg border border-[#DDD4C8] bg-white font-bold text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
          >
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.monthLabel}
              </option>
            ))}
          </select>
        </div>

        <span className="mr-auto text-[11px] text-[#87756E] tabular-nums">
          مجموع کارنامه‌های ذخیره‌شده: {formatNumber(snapshots.length)} ماه
        </span>
      </div>

      {/* Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 tabular-nums">
        {deltas.map((row) => (
          <div
            key={row.key}
            className="p-3.5 rounded-xl bg-[#FCFAF7] border border-[#EAE4DC] space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#4F403C]">
                {row.label}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
                  row.isImproved
                    ? 'bg-[#EFF8F4] text-[#1F7A5A]'
                    : 'bg-[#FDF2F2] text-[#C93B3B]'
                }`}
              >
                {row.delta >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                <span className={row.unit === 'currency' ? 'privacy-sensitive' : ''}>
                  {formatMetricDelta(row.delta, row.unit)}
                </span>
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs pt-1 border-t border-[#F0EAE2]">
              <div className="text-[#87756E]">
                {fromSnap?.monthLabel}:{' '}
                <strong
                  className={`text-[#4F403C] ${
                    row.unit === 'currency' ? 'privacy-sensitive' : ''
                  }`}
                >
                  {formatMetricValue(row.fromValue, row.unit)}
                </strong>
              </div>
              <div className="text-[#87756E]">
                {toSnap?.monthLabel}:{' '}
                <strong
                  className={`text-[#2A1F1D] ${
                    row.unit === 'currency' ? 'privacy-sensitive' : ''
                  }`}
                >
                  {formatMetricValue(row.toValue, row.unit)}
                </strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
