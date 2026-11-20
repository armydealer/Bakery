import React, { useMemo, useState } from 'react';
import { Calculator, Coffee, Flame, Users } from 'lucide-react';
import {
  CurrencyMode,
  OfflineDecisionInput,
  OfflineDecisionType,
  OfflineDiagnosticReport,
  WorkshopState,
  WorkshopSummary,
} from '../../types/workshop';
import { simulateOfflineDecision } from '../../utils/offlineDiagnosticEngine';
import {
  formatCompactCurrency,
  formatNumber,
  formatPercent,
  getCurrencyLabel,
  getCurrencyMultiplier,
} from '../../utils/format';
import { HelpTooltip } from '../HelpTooltip';

interface OfflineWhatIfCardsProps {
  state: WorkshopState;
  summary: WorkshopSummary;
  report: OfflineDiagnosticReport;
  currency: CurrencyMode;
}

const SCENARIOS: Array<{
  type: OfflineDecisionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { type: 'waste-reduction', label: 'کاهش افت پخت و ضایعات', icon: Flame },
  { type: 'cafe-contract', label: 'پذیرش قرارداد کافه B2B', icon: Coffee },
  { type: 'hire-staff', label: 'استخدام نیروی جدید / دستگاه', icon: Users },
];

export const OfflineWhatIfCards: React.FC<OfflineWhatIfCardsProps> = ({
  state,
  summary,
  report,
  currency,
}) => {
  const multiplier = getCurrencyMultiplier(currency);
  const currencyLabel = getCurrencyLabel(currency);

  const [activeType, setActiveType] =
    useState<OfflineDecisionType>('waste-reduction');

  // Editable parameters per scenario
  const [wasteCut, setWasteCut] = useState<number>(2);
  const [cafeKg, setCafeKg] = useState<number>(80);
  const [cafeDiscount, setCafeDiscount] = useState<number>(15);
  const [cafeCheckDays, setCafeCheckDays] = useState<number>(30);
  const [hireCostToman, setHireCostToman] = useState<number>(24_000_000);
  const [capacityGrowth, setCapacityGrowth] = useState<number>(18);

  const decisionInput: OfflineDecisionInput = useMemo(() => {
    if (activeType === 'cafe-contract') {
      return {
        type: 'cafe-contract',
        cafeMonthlyKg: cafeKg,
        cafeDiscountPercent: cafeDiscount,
        cafeCheckDays,
      };
    }
    if (activeType === 'hire-staff') {
      return {
        type: 'hire-staff',
        addedMonthlyFixedCost: hireCostToman,
        capacityGrowthPercent: capacityGrowth,
      };
    }
    return {
      type: 'waste-reduction',
      wasteReductionPercentPoints: wasteCut,
    };
  }, [
    activeType,
    wasteCut,
    cafeKg,
    cafeDiscount,
    cafeCheckDays,
    hireCostToman,
    capacityGrowth,
  ]);

  const simulation = useMemo(
    () => simulateOfflineDecision(state, summary, report, decisionInput),
    [state, summary, report, decisionInput]
  );

  const formatCell = (val: number, unit: 'currency' | 'percent' | 'day') => {
    if (unit === 'currency') return formatCompactCurrency(val, currency);
    if (unit === 'percent') return formatPercent(val, 1);
    return `روز ${formatNumber(val)}`;
  };

  return (
    <section
      aria-label="شبیه‌ساز سریع تصمیم ریاضی آفلاین"
      className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#F0EAE2]">
        <div>
          <div className="flex items-center gap-2 text-[#C86D2D] text-xs font-semibold">
            <Calculator className="h-4 w-4" />
            <span>محاسبه‌گر سریع ریاضی (بدون نیاز به اینترنت یا AI)</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <h2 className="text-base font-bold text-[#2A1F1D]">
              شبیه‌ساز سریع تصمیم ریاضی («قبل» در برابر «بعد»)
            </h2>
            <HelpTooltip
              title="آزمون فوری تصمیم‌های کارگاهی"
              description="پیش از امضای قرارداد کافه، استخدام کمک‌قناد یا اجرای برنامه کاهش ضایعات، اثر دقیق ریاضی آن را روی سود واقعی، حاشیه سود و روز سر‌به‌سر به‌صورت آنی ببینید."
            />
          </div>
        </div>

        <div
          role="group"
          aria-label="انتخاب سناریوی تصمیم آفلاین"
          className="flex flex-wrap items-center gap-1.5"
        >
          {SCENARIOS.map((sc) => {
            const Icon = sc.icon;
            const active = activeType === sc.type;
            return (
              <button
                key={sc.type}
                type="button"
                onClick={() => setActiveType(sc.type)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#C86D2D] text-white'
                    : 'bg-[#FAF8F5] border border-[#EAE4DC] text-[#4F403C] hover:border-[#C86D2D]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{sc.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scenario Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#FAF8F5] border border-[#EAE4DC] rounded-xl p-4">
        {activeType === 'waste-reduction' && (
          <div className="sm:col-span-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="sim-waste-cut"
                className="font-bold text-[#2A1F1D]"
              >
                مقدار کاهش افت پخت و ضایعات در تمام محصولات (درصد):
              </label>
              <span className="font-extrabold text-[#1F7A5A] tabular-nums">
                -{formatNumber(wasteCut, 1)}٪ کاهش ضایعات
              </span>
            </div>
            <input
              id="sim-waste-cut"
              type="range"
              min={0.5}
              max={6}
              step={0.5}
              value={wasteCut}
              onChange={(e) => setWasteCut(Number(e.target.value))}
              className="w-full saffron-slider cursor-pointer"
            />
          </div>
        )}

        {activeType === 'cafe-contract' && (
          <>
            <div>
              <label
                htmlFor="sim-cafe-kg"
                className="block text-xs font-medium text-[#4F403C] mb-1"
              >
                حجم ماهانه قرارداد (کیلو گرم)
              </label>
              <input
                id="sim-cafe-kg"
                type="number"
                min={10}
                step={10}
                value={cafeKg}
                onChange={(e) =>
                  setCafeKg(Math.max(10, Number(e.target.value) || 10))
                }
                className="w-full h-9 px-3 rounded-lg border border-[#DDD4C8] bg-white text-sm font-bold tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="sim-cafe-disc"
                className="block text-xs font-medium text-[#4F403C] mb-1"
              >
                تخفیف همکاری کافه (٪)
              </label>
              <input
                id="sim-cafe-disc"
                type="number"
                min={0}
                max={45}
                value={cafeDiscount}
                onChange={(e) =>
                  setCafeDiscount(
                    Math.min(45, Math.max(0, Number(e.target.value) || 0))
                  )
                }
                className="w-full h-9 px-3 rounded-lg border border-[#DDD4C8] bg-white text-sm font-bold tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="sim-cafe-days"
                className="block text-xs font-medium text-[#4F403C] mb-1"
              >
                سررسید چک صیادی مشتری (روز)
              </label>
              <input
                id="sim-cafe-days"
                type="number"
                min={0}
                max={120}
                step={15}
                value={cafeCheckDays}
                onChange={(e) =>
                  setCafeCheckDays(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full h-9 px-3 rounded-lg border border-[#DDD4C8] bg-white text-sm font-bold tabular-nums"
              />
            </div>
          </>
        )}

        {activeType === 'hire-staff' && (
          <>
            <div className="sm:col-span-2">
              <label
                htmlFor="sim-hire-cost"
                className="block text-xs font-medium text-[#4F403C] mb-1"
              >
                هزینه ثابت جدید ماهانه — حقوق یا قسط دستگاه ({currencyLabel})
              </label>
              <input
                id="sim-hire-cost"
                type="number"
                min={1000000}
                step={currency === 'RIAL' ? 10000000 : 1000000}
                value={Math.round(hireCostToman * multiplier)}
                onChange={(e) =>
                  setHireCostToman(
                    Math.max(
                      1_000_000,
                      Math.round((Number(e.target.value) || 0) / multiplier)
                    )
                  )
                }
                className="w-full h-9 px-3 rounded-lg border border-[#DDD4C8] bg-white text-sm font-bold tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="sim-hire-growth"
                className="block text-xs font-medium text-[#4F403C] mb-1"
              >
                رشد ظرفیت فروش (٪)
              </label>
              <input
                id="sim-hire-growth"
                type="number"
                min={0}
                max={80}
                value={capacityGrowth}
                onChange={(e) =>
                  setCapacityGrowth(
                    Math.min(80, Math.max(0, Number(e.target.value) || 0))
                  )
                }
                className="w-full h-9 px-3 rounded-lg border border-[#DDD4C8] bg-white text-sm font-bold tabular-nums"
              />
            </div>
          </>
        )}
      </div>

      {/* Verdict Summary Banner */}
      <div
        className={`rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums ${
          simulation.isFavorable
            ? 'bg-[#EFF8F4] border-[#C6E6D9] text-[#175D44]'
            : 'bg-[#FDF2F2] border-[#F0C8C8] text-[#9E2A2A]'
        }`}
      >
        <span className="font-bold">{simulation.title}</span>
        <span className="font-extrabold text-sm privacy-sensitive">
          تغییر سود واقعی ماهانه:{' '}
          {simulation.netMonthlyProfitDelta >= 0 ? '+' : ''}
          {formatCompactCurrency(simulation.netMonthlyProfitDelta, currency)}
        </span>
      </div>

      {/* Before vs After KPI Table */}
      <div className="overflow-x-auto rounded-xl border border-[#EAE4DC]">
        <table className="w-full text-right border-collapse text-xs tabular-nums">
          <thead>
            <tr className="bg-[#FAF8F5] border-b border-[#EAE4DC] text-[#6B5B56]">
              <th className="py-2.5 px-4 font-semibold">شاخص کلیدی</th>
              <th className="py-2.5 px-3 font-semibold">وضعیت قبل</th>
              <th className="py-2.5 px-3 font-semibold">وضعیت بعد</th>
              <th className="py-2.5 px-4 text-left font-semibold">اختلاف دقیق</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EAE2]">
            {simulation.rows.map((row) => {
              const improved = row.higherIsBetter
                ? row.delta >= 0
                : row.delta <= 0;
              return (
                <tr key={row.key} className="hover:bg-[#FCF9F5]">
                  <td className="py-2.5 px-4 font-bold text-[#2A1F1D]">
                    {row.label}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-[#6B5B56] ${
                      row.unit === 'currency' ? 'privacy-sensitive' : ''
                    }`}
                  >
                    {formatCell(row.before, row.unit)}
                  </td>
                  <td
                    className={`py-2.5 px-3 font-bold text-[#2A1F1D] ${
                      row.unit === 'currency' ? 'privacy-sensitive' : ''
                    }`}
                  >
                    {formatCell(row.after, row.unit)}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-left font-extrabold ${
                      row.delta === 0
                        ? 'text-[#87756E]'
                        : improved
                        ? 'text-[#1F7A5A]'
                        : 'text-[#C93B3B]'
                    } ${row.unit === 'currency' ? 'privacy-sensitive' : ''}`}
                  >
                    {row.delta > 0 ? '+' : ''}
                    {row.unit === 'currency'
                      ? formatCompactCurrency(row.delta, currency)
                      : row.unit === 'percent'
                      ? formatPercent(row.delta, 1)
                      : `${formatNumber(row.delta)} روز`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
