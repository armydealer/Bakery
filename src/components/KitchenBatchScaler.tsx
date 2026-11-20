import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChefHat,
  Clock,
  Copy,
  RotateCcw,
  Scale,
} from 'lucide-react';
import {
  CurrencyMode,
  Ingredient,
  Product,
  RECIPE_UNIT_LABELS,
  SALES_UNIT_LABELS,
  WorkshopSettings,
} from '../types/workshop';
import { scaleRecipeForProductionBatch } from '../utils/accounting';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../utils/format';
import { HelpTooltip } from './HelpTooltip';

interface KitchenBatchScalerProps {
  product: Product;
  ingredients: Ingredient[];
  settings: WorkshopSettings;
  currency: CurrencyMode;
}

export const KitchenBatchScaler: React.FC<KitchenBatchScalerProps> = ({
  product,
  ingredients,
  settings,
  currency,
}) => {
  const [targetQty, setTargetQty] = useState<number>(product.batchYield);
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [copiedSheet, setCopiedSheet] = useState(false);

  // Reset target output & checklist when switching selected product
  useEffect(() => {
    setTargetQty(product.batchYield);
    setCheckedIds({});
    setCopiedSheet(false);
  }, [product.id, product.batchYield]);

  const sheet = useMemo(
    () =>
      scaleRecipeForProductionBatch(product, ingredients, settings, targetQty),
    [product, ingredients, settings, targetQty]
  );

  const salesUnitText = SALES_UNIT_LABELS[product.salesUnit];
  const dailyAvgQty = Math.max(
    0.5,
    Math.round((product.monthlyVolume / 30) * 2) / 2
  );
  const maxSliderQty = Math.max(product.batchYield * 6, dailyAvgQty * 3, 20);

  const toggleChecked = (ingredientId: string) => {
    setCheckedIds((prev) => ({
      ...prev,
      [ingredientId]: !prev[ingredientId],
    }));
  };

  const checkedCount = sheet.ingredients.filter(
    (row) => checkedIds[row.ingredientId]
  ).length;

  const formatDurationFa = (minutes: number): string => {
    const rounded = Math.round(minutes);
    const hrs = Math.floor(rounded / 60);
    const mins = rounded % 60;
    if (hrs === 0) return `${formatNumber(mins)} دقیقه`;
    if (mins === 0) return `${formatNumber(hrs)} ساعت`;
    return `${formatNumber(hrs)} ساعت و ${formatNumber(mins)} دقیقه`;
  };

  const handleCopyKitchenSheet = async () => {
    const lines = [
      `برگه وزن‌کشی و پخت روزانه — ${product.name}`,
      `خروجی هدف: ${formatNumber(sheet.targetOutputQty, 1)} ${salesUnitText} (معادل ${formatNumber(sheet.batchesRequired, 2)} بچ)`,
      `زمان کل کارگاه: ${formatDurationFa(sheet.totalPrepMinutes)}`,
      '--------------------------------',
      'لیست دقیق مواد روی ترازو:',
      ...sheet.ingredients.map(
        (ing) =>
          `• ${ing.name}: ${formatNumber(ing.scaledNetQuantity, 1)} ${RECIPE_UNIT_LABELS[ing.unit]} (تدارک با افت پخت: ${formatNumber(ing.scaledGrossQuantityWithWastage, 1)} ${RECIPE_UNIT_LABELS[ing.unit]})`
      ),
      ...(sheet.packaging.length > 0
        ? [
            '--------------------------------',
            'اقلام بسته‌بندی مورد نیاز:',
            ...sheet.packaging.map(
              (pkg) =>
                `• ${pkg.name}: ${formatNumber(pkg.scaledQuantity, 1)} ${RECIPE_UNIT_LABELS[pkg.unit]}`
            ),
          ]
        : []),
    ];
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(lines.join('\n'));
      }
    } catch {
      // Clipboard may be restricted in sandboxed iframes
    }
    setCopiedSheet(true);
    window.setTimeout(() => setCopiedSheet(false), 3000);
  };

  const presets = [
    { label: '۰٫۵ بچ', qty: Math.max(0.5, Number((product.batchYield * 0.5).toFixed(1))) },
    { label: '۱ بچ کامل', qty: product.batchYield },
    { label: '۲ بچ', qty: product.batchYield * 2 },
    { label: '۵ بچ', qty: product.batchYield * 5 },
    { label: `سهم روزانه (${formatNumber(dailyAvgQty, 1)} ${salesUnitText})`, qty: dailyAvgQty },
  ];

  return (
    <section
      aria-label="برگه پخت روزانه و تبدیل مقیاس رسپی"
      className="bg-white rounded-2xl border border-[#EAE4DC] p-5 sm:p-6 shadow-xs space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#F0EAE2]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#C86D2D] text-xs font-semibold">
            <ChefHat className="h-4 w-4" />
            <span>دستیار خط تولید و ترازوی کارگاه</span>
          </div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-[#2A1F1D]">
              برگه پخت روزانه و تبدیل مقیاس رسپی — {product.name}
            </h2>
            <HelpTooltip
              title="تبدیل‌گر هوشمند مقیاس رسپی"
              description="کافی است مشخص کنید امروز دقیقاً چند کیلو گرم یا چند عدد از این شیرینی می‌خواهید بپزید؛ برنامه تمام مقادیر فرمول را به‌صورت دقیق مقیاس‌دهی می‌کند و چک‌لیست وزن‌کشی روی ترازو، زمان پخت و هزینه مستقیم همین شیفت را تحویل استادکار می‌دهد."
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyKitchenSheet}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              copiedSheet
                ? 'bg-[#1F7A5A] text-white'
                : 'bg-[#2A1F1D] text-white hover:bg-[#3F302D]'
            }`}
          >
            {copiedSheet ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>برگه پخت کپی شد!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>کپی برگه پخت برای کارگاه</span>
              </>
            )}
          </button>

          {checkedCount > 0 && (
            <button
              type="button"
              onClick={() => setCheckedIds({})}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] text-xs font-medium text-[#6B5B56] hover:text-[#2A1F1D]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>پاک کردن تیک‌ها</span>
            </button>
          )}
        </div>
      </div>

      {/* Controls & Quick Presets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center bg-[#FAF8F5] border border-[#EAE4DC] rounded-xl p-4">
        <div className="lg:col-span-5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="kitchen-target-qty"
              className="text-xs font-bold text-[#2A1F1D]"
            >
              هدف پخت امروز ({salesUnitText}):
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id="kitchen-target-qty"
                type="number"
                min="0.5"
                step="0.5"
                value={targetQty}
                onChange={(e) =>
                  setTargetQty(Math.max(0.5, Number(e.target.value) || 0.5))
                }
                className="w-24 h-8 px-2.5 rounded-lg border border-[#DDD4C8] bg-white text-sm font-extrabold text-[#C86D2D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
              />
              <span className="text-xs font-semibold text-[#6B5B56]">
                {salesUnitText}
              </span>
            </div>
          </div>

          <input
            type="range"
            min={0.5}
            max={maxSliderQty}
            step={0.5}
            value={Math.min(targetQty, maxSliderQty)}
            onChange={(e) => setTargetQty(Number(e.target.value))}
            aria-label="اسلایدر مقدار هدف پخت امروز"
            className="w-full saffron-slider cursor-pointer"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            {presets.map((p) => {
              const isSelected = Math.abs(targetQty - p.qty) < 0.05;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setTargetQty(p.qty)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors tabular-nums ${
                    isSelected
                      ? 'bg-[#C86D2D] text-white'
                      : 'bg-white border border-[#EAE4DC] text-[#4F403C] hover:border-[#C86D2D]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Shift Summary Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
          <div className="p-3.5 rounded-xl bg-white border border-[#EAE4DC]">
            <div className="flex items-center gap-1.5 text-[11px] text-[#6B5B56]">
              <Scale className="h-3.5 w-3.5 text-[#C86D2D]" />
              <span>ضریب پخت (تعداد بچ)</span>
            </div>
            <div className="text-lg font-extrabold text-[#2A1F1D] mt-1">
              {formatNumber(sheet.batchesRequired, 2)} بچ
            </div>
            <div className="text-[11px] text-[#87756E]">
              مبنای هر بچ: {formatNumber(sheet.batchYield, 1)} {salesUnitText}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#EAE4DC]">
            <div className="flex items-center gap-1.5 text-[11px] text-[#6B5B56]">
              <Clock className="h-3.5 w-3.5 text-[#8C5A3C]" />
              <span>زمان کارگاه این پخت</span>
            </div>
            <div className="text-sm font-extrabold text-[#2A1F1D] mt-1.5">
              {formatDurationFa(sheet.totalPrepMinutes)}
            </div>
            <div className="text-[11px] text-[#87756E] mt-0.5">
              استادکار {formatNumber(Math.round(sheet.masterMinutesTotal))} دقیقه
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#EFF8F4] border border-[#C6E6D9]">
            <div className="text-[11px] text-[#175D44]">
              بهای مستقیم این شیفت پخت
            </div>
            <div className="text-base font-extrabold text-[#1F7A5A] mt-1">
              {formatCurrency(sheet.estimatedTotalDirectCost, currency)}
            </div>
            <div className="text-[11px] text-[#175D44]/80">
              شامل مواد، افت پخت، بسته و دستمزد
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Kitchen Weighing Checklist Table */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#2A1F1D]">
            چک‌لیست وزن‌کشی روی ترازوی کارگاه
          </span>
          <span className="font-semibold text-[#1F7A5A] tabular-nums">
            {formatNumber(checkedCount)} از {formatNumber(sheet.ingredients.length)}{' '}
            ماده وزن‌کشی شد
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#EAE4DC]">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EAE4DC] text-xs font-semibold text-[#6B5B56]">
                <th className="py-2.5 px-3 w-12 text-center">تیک</th>
                <th className="py-2.5 px-3">ماده اولیه</th>
                <th className="py-2.5 px-3">مقدار خالص روی ترازو</th>
                <th className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1">
                    تدارک انبار (با {formatPercent(sheet.wastagePercent, 1)} افت)
                    <HelpTooltip
                      size="xs"
                      title="مقدار تدارک با لحاظ افت پخت"
                      description="مقداری که باید از انبار کارگاه تحویل بگیرید تا پس از افت پخت و دورریز، دقیقاً خروجی هدف شما به دست بیاید."
                    />
                  </span>
                </th>
                <th className="py-2.5 px-4 text-left">هزینه مواد این پخت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE2] text-sm tabular-nums">
              {sheet.ingredients.map((row) => {
                const isDone = Boolean(checkedIds[row.ingredientId]);
                return (
                  <tr
                    key={row.ingredientId}
                    className={`transition-colors ${
                      isDone ? 'bg-[#EFF8F4]/60' : 'hover:bg-[#FCF9F5]'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => toggleChecked(row.ingredientId)}
                        aria-label={`تایید وزن‌کشی ${row.name}`}
                        className="h-4 w-4 accent-[#1F7A5A] rounded cursor-pointer"
                      />
                    </td>
                    <td
                      className={`py-2.5 px-3 font-semibold ${
                        isDone
                          ? 'line-through text-[#87756E]'
                          : 'text-[#2A1F1D]'
                      }`}
                    >
                      {row.name}
                    </td>
                    <td className="py-2.5 px-3 font-extrabold text-[#C86D2D]">
                      {formatNumber(row.scaledNetQuantity, 1)}{' '}
                      {RECIPE_UNIT_LABELS[row.unit]}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-semibold text-[#4F403C]">
                      {formatNumber(row.scaledGrossQuantityWithWastage, 1)}{' '}
                      {RECIPE_UNIT_LABELS[row.unit]}
                    </td>
                    <td className="py-2.5 px-4 text-left text-xs font-bold text-[#2A1F1D]">
                      {formatCurrency(row.estimatedCost, currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Packaging Needed Strip */}
        {sheet.packaging.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[#6B5B56] tabular-nums">
            <span className="font-bold text-[#2A1F1D]">بسته‌بندی لازم برای این پخت:</span>
            {sheet.packaging.map((pkg) => (
              <span
                key={pkg.ingredientId}
                className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#EAE4DC] font-medium text-[#4F403C]"
              >
                {pkg.name}:{' '}
                <strong className="text-[#2A1F1D]">
                  {formatNumber(pkg.scaledQuantity, 1)}{' '}
                  {RECIPE_UNIT_LABELS[pkg.unit]}
                </strong>
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
