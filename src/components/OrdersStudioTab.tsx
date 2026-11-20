import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Gift,
  Plus,
  Printer,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  CurrencyMode,
  CustomOrderSpec,
  PURCHASE_UNIT_LABELS,
  SALES_UNIT_LABELS,
  WorkshopState,
  WorkshopSummary,
} from '../types/workshop';
import { calculateCustomOrderQuote } from '../utils/accounting';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  getCurrencyLabel,
  getCurrencyMultiplier,
} from '../utils/format';
import { HelpTooltip } from './HelpTooltip';

interface OrdersStudioTabProps {
  state: WorkshopState;
  summary: WorkshopSummary;
  currency: CurrencyMode;
}

interface OccasionPreset {
  id: string;
  label: string;
  subtitle: string;
  buildSpec: (state: WorkshopState) => CustomOrderSpec;
}

const OCCASION_PRESETS: OccasionPreset[] = [
  {
    id: 'nowruz-vip',
    label: 'پکیج هدیه نوروزی VIP',
    subtitle: '۴۰ جعبه کادویی میکس سنتی و خشک',
    buildSpec: (state) => {
      const p0 = state.products[0];
      const p1 = state.products[1] ?? state.products[0];
      return {
        orderTitle: 'پکیج هدیه نوروزی VIP',
        customerName: 'مجموعه همکاران و مشتریان ویژه',
        deliveryDate: '۱۴۰۴/۱۲/۲۵',
        boxCount: 40,
        items: [
          ...(p0 ? [{ id: 'preset-1', productId: p0.id, quantityPerBox: 0.5 }] : []),
          ...(p1 && p1.id !== p0?.id
            ? [{ id: 'preset-2', productId: p1.id, quantityPerBox: 0.5 }]
            : []),
        ],
        extraPackagingCostPerBox: 55_000,
        extraDecorLaborPerBox: 18_000,
        targetMarginPercent: 32,
        discountPercent: 8,
      };
    },
  },
  {
    id: 'yalda-tray',
    label: 'سینی مجلسی شب یلدا',
    subtitle: '۲۵ سینی ویژه پذیرایی باقلوا و رولت',
    buildSpec: (state) => {
      const p0 = state.products[0];
      const p2 = state.products[2] ?? state.products[1] ?? state.products[0];
      return {
        orderTitle: 'سینی مجلسی ویژه شب یلدا',
        customerName: 'سفارشات اختصاصی شب چله',
        deliveryDate: '۱۴۰۴/۰۹/۲۹',
        boxCount: 25,
        items: [
          ...(p0 ? [{ id: 'yalda-1', productId: p0.id, quantityPerBox: 0.6 }] : []),
          ...(p2 && p2.id !== p0?.id
            ? [{ id: 'yalda-2', productId: p2.id, quantityPerBox: 0.7 }]
            : []),
        ],
        extraPackagingCostPerBox: 70_000,
        extraDecorLaborPerBox: 25_000,
        targetMarginPercent: 35,
        discountPercent: 5,
      };
    },
  },
  {
    id: 'corporate-event',
    label: 'سفارش همایش و پذیرایی سازمانی',
    subtitle: '۱۰۰ بسته تک‌نفره شرکتی با تخفیف تیراژ',
    buildSpec: (state) => {
      const p1 = state.products[1] ?? state.products[0];
      const p3 = state.products[3] ?? state.products[2] ?? state.products[0];
      return {
        orderTitle: 'پک پذیرایی همایش سالانه سازمانی',
        customerName: 'روابط عمومی شرکت سپهر صنعت',
        deliveryDate: '۱۴۰۴/۱۰/۱۵',
        boxCount: 100,
        items: [
          ...(p1 ? [{ id: 'corp-1', productId: p1.id, quantityPerBox: 0.25 }] : []),
          ...(p3 && p3.id !== p1?.id
            ? [{ id: 'corp-2', productId: p3.id, quantityPerBox: 0.25 }]
            : []),
        ],
        extraPackagingCostPerBox: 28_000,
        extraDecorLaborPerBox: 12_000,
        targetMarginPercent: 30,
        discountPercent: 14,
      };
    },
  },
];

export const OrdersStudioTab: React.FC<OrdersStudioTabProps> = ({
  state,
  summary,
  currency,
}) => {
  const multiplier = getCurrencyMultiplier(currency);
  const currencyLabel = getCurrencyLabel(currency);

  const [activePresetId, setActivePresetId] = useState<string>('nowruz-vip');
  const [spec, setSpec] = useState<CustomOrderSpec>(() =>
    OCCASION_PRESETS[0].buildSpec(state)
  );
  const [copiedQuote, setCopiedQuote] = useState(false);

  const quote = useMemo(
    () => calculateCustomOrderQuote(state, summary, spec),
    [state, summary, spec]
  );

  const handleSelectPreset = (preset: OccasionPreset) => {
    setActivePresetId(preset.id);
    setSpec(preset.buildSpec(state));
    setCopiedQuote(false);
  };

  const handleAddItem = () => {
    const unused =
      state.products.find(
        (p) => !spec.items.some((item) => item.productId === p.id)
      ) ?? state.products[0];
    if (!unused) return;
    setSpec((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `order-item-${Date.now()}`,
          productId: unused.id,
          quantityPerBox: unused.salesUnit === 'kg' ? 0.5 : 1,
        },
      ],
    }));
  };

  const handleUpdateItem = (
    id: string,
    patch: Partial<{ productId: string; quantityPerBox: number }>
  ) => {
    setSpec((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  };

  const handleRemoveItem = (id: string) => {
    setSpec((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const buildWhatsappText = (): string => {
    const lines = [
      `پیش‌فاکتور رسمی — ${state.settings.workshopName}`,
      `عنوان سفارش: ${spec.orderTitle}`,
      `مشتری محترم: ${spec.customerName}`,
      `تاریخ تحویل پیشنهادی: ${spec.deliveryDate}`,
      `تعداد کل بسته‌ها: ${formatNumber(quote.boxCount)} بسته`,
      '--------------------------------',
      'ترکیب هر بسته:',
      ...quote.items.map(
        (item) =>
          `• ${item.productName}: ${formatNumber(item.quantityPerBox, 2)} ${SALES_UNIT_LABELS[item.salesUnit]}`
      ),
      '--------------------------------',
      `قیمت هر بسته پیش از تخفیف: ${formatCurrency(quote.basePricePerBoxBeforeDiscount, currency)}`,
      ...(spec.discountPercent > 0
        ? [
            `تخفیف اختصاصی تیراژ (${formatPercent(spec.discountPercent, 1)}): ${formatCurrency(quote.totalDiscountAmount, currency)}`,
          ]
        : []),
      `قیمت نهایی هر بسته: ${formatCurrency(quote.finalPricePerBox, currency)}`,
      `مبلغ کل قابل پرداخت: ${formatCurrency(quote.totalOrderFinalRevenue, currency)}`,
    ];
    return lines.join('\n');
  };

  const handleCopyWhatsappQuote = async () => {
    const text = buildWhatsappText();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Fallback handled silently for sandboxed iframes
    }
    setCopiedQuote(true);
    window.setTimeout(() => setCopiedQuote(false), 3500);
  };

  const discountBarFillPercent =
    quote.maxSafeDiscountPercent > 0
      ? Math.min(100, (spec.discountPercent / quote.maxSafeDiscountPercent) * 100)
      : 100;

  const bargainingStatus = !quote.isProfitable
    ? {
        label: 'عبور از خط قرمز — این سفارش زیان‌ده است!',
        toneClass: 'bg-[#FDF2F2] border-[#F0C8C8] text-[#9E2A2A]',
        barColor: 'bg-[#C93B3B]',
      }
    : quote.isDiscountNearCap
    ? {
        label: 'نزدیک به سقف چانه‌زنی — مراقب حاشیه سود باشید',
        toneClass: 'bg-[#FDF7EE] border-[#EED7B8] text-[#9A4E16]',
        barColor: 'bg-[#C86D2D]',
      }
    : {
        label: 'محدوده امن و سودآور برای مذاکره با مشتری',
        toneClass: 'bg-[#EFF8F4] border-[#C6E6D9] text-[#175D44]',
        barColor: 'bg-[#1F7A5A]',
      };

  const totalOrderMrpBudget = quote.orderMrpRows.reduce(
    (sum, r) => sum + r.totalBudget,
    0
  );

  return (
    <div className="space-y-6">
      {/* Occasion Quick Presets Bar */}
      <section
        aria-label="قالب‌های آماده سفارشات مناسبتی"
        className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-4 no-print"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[#C86D2D] text-xs font-semibold">
              <Gift className="h-4 w-4" />
              <span>استودیو سفارش‌ساز مناسبتی و پکیج هدیه</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <h2 className="text-base font-bold text-[#2A1F1D]">
                طراحی پکیج‌های میکس، محاسبه سقف تخفیف مجاز و صدور پیش‌فاکتور
              </h2>
              <HelpTooltip
                title="استودیو پکیج هدیه و سفارش سازمانی"
                description="برای سفارش‌های شرکتی، پکیج‌های عید نوروز یا سینی‌های میکس شب یلدا می‌توانید چند شیرینی را در یک جعبه کادویی ترکیب کنید، هزینه جعبه و روبان را بزنید، سقف تخفیفی که بدون ضرر می‌توانید به مشتری بدهید را ببینید و فوراً لیست خرید همان سفارش و متن پیش‌فاکتور واتساپ را آماده کنید."
              />
            </div>
          </div>
          <span className="text-xs text-[#87756E]">
            محاسبه زنده بر اساس آخرین بهای تمام‌شده محصولات کارگاه
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {OCCASION_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`text-right p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                  isActive
                    ? 'bg-[#FAF3EC] border-[#C86D2D] shadow-xs'
                    : 'bg-[#FAF8F5] border-[#EAE4DC] hover:bg-white hover:border-[#D5C8BA]'
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isActive
                      ? 'bg-[#C86D2D] text-white'
                      : 'bg-white border border-[#EAE4DC] text-[#8C5A3C]'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-sm font-bold truncate ${
                      isActive ? 'text-[#C86D2D]' : 'text-[#2A1F1D]'
                    }`}
                  >
                    {preset.label}
                  </div>
                  <div className="text-xs text-[#6B5B56] mt-0.5 leading-relaxed">
                    {preset.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main 2-Column Workspace: Composer & Bargaining Gauge (7 cols) + Live Formal Quote (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left/Start 7 Columns: Box Composition + Pricing & Bargaining Red-Line */}
        <div className="xl:col-span-7 space-y-6 no-print">
          {/* Step 1: Order Meta & Box Contents */}
          <section className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#F0EAE2]">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#2A1F1D]">
                  ۱. مشخصات سفارش و ترکیب اقلام هر بسته
                </h3>
                <HelpTooltip
                  size="xs"
                  title="ترکیب هر جعبه یا سینی"
                  description="تعداد کل بسته‌های سفارش و مقدار هر شیرینی داخل یک بسته (مثلاً ۰٫۵ کیلو گرم باقلوا و ۰٫۵ کیلو گرم نخودچی) را مشخص کنید."
                />
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FAF3EC] text-[#C86D2D] text-xs font-semibold hover:bg-[#F3E4D5] transition-colors whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>افزودن شیرینی به بسته</span>
              </button>
            </div>

            {/* Meta Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              <div className="sm:col-span-2 lg:col-span-5">
                <label
                  htmlFor="order-title"
                  className="block text-xs font-medium text-[#4F403C] mb-1"
                >
                  عنوان پکیج یا سفارش
                </label>
                <input
                  id="order-title"
                  type="text"
                  value={spec.orderTitle}
                  onChange={(e) =>
                    setSpec((prev) => ({ ...prev, orderTitle: e.target.value }))
                  }
                  className="w-full h-9 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-sm font-semibold text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
                />
              </div>

              <div className="lg:col-span-4">
                <label
                  htmlFor="order-customer"
                  className="block text-xs font-medium text-[#4F403C] mb-1"
                >
                  نام شرکت / مشتری
                </label>
                <input
                  id="order-customer"
                  type="text"
                  value={spec.customerName}
                  onChange={(e) =>
                    setSpec((prev) => ({
                      ...prev,
                      customerName: e.target.value,
                    }))
                  }
                  className="w-full h-9 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-xs font-medium text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
                />
              </div>

              <div className="lg:col-span-3">
                <label
                  htmlFor="order-delivery-date"
                  className="block text-xs font-medium text-[#4F403C] mb-1"
                >
                  تاریخ تحویل
                </label>
                <input
                  id="order-delivery-date"
                  type="text"
                  value={spec.deliveryDate}
                  onChange={(e) =>
                    setSpec((prev) => ({
                      ...prev,
                      deliveryDate: e.target.value,
                    }))
                  }
                  className="w-full h-9 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-xs font-semibold text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
                />
              </div>
            </div>

            {/* Box Items Table */}
            <div className="space-y-2.5">
              {spec.items.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-[#FAF8F5] border border-dashed border-[#DDD4C8] text-xs text-[#87756E]">
                  هنوز شیرینی‌ای در این پکیج قرار داده نشده است. روی دکمه «افزودن شیرینی به بسته» کلیک کنید.
                </div>
              ) : (
                spec.items.map((item, idx) => {
                  const prod = state.products.find(
                    (p) => p.id === item.productId
                  );
                  const itemQuote = quote.items.find((q) => q.id === item.id);
                  const unitLabel = prod
                    ? SALES_UNIT_LABELS[prod.salesUnit]
                    : 'کیلو گرم';
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2.5 items-center p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4DC]"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <select
                          value={item.productId}
                          onChange={(e) =>
                            handleUpdateItem(item.id, {
                              productId: e.target.value,
                            })
                          }
                          aria-label={`انتخاب شیرینی ردیف ${idx + 1}`}
                          className="w-full h-9 px-2.5 rounded-lg border border-[#DDD4C8] bg-white text-xs font-semibold text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
                        >
                          {state.products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-6 sm:col-span-3 flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={item.quantityPerBox}
                          onChange={(e) =>
                            handleUpdateItem(item.id, {
                              quantityPerBox: Math.max(
                                0,
                                Number(e.target.value) || 0
                              ),
                            })
                          }
                          aria-label={`مقدار هر بسته ردیف ${idx + 1}`}
                          className="w-full h-9 px-2.5 rounded-lg border border-[#DDD4C8] bg-white text-xs font-bold text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
                        />
                        <span className="text-[11px] text-[#6B5B56] whitespace-nowrap shrink-0">
                          {unitLabel}
                        </span>
                      </div>

                      <div className="col-span-5 sm:col-span-3 text-left tabular-nums">
                        <div className="text-xs font-bold text-[#2A1F1D]">
                          {formatCurrency(
                            itemQuote?.costPerBox ?? 0,
                            currency,
                            false
                          )}{' '}
                          <span className="text-[10px] font-normal text-[#87756E]">
                            {currencyLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#87756E]">
                          کل سفارش:{' '}
                          {formatNumber(itemQuote?.totalQuantityForOrder ?? 0, 1)}{' '}
                          {unitLabel}
                        </div>
                      </div>

                      <div className="col-span-1 text-left">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          aria-label={`حذف قلم ردیف ${idx + 1}`}
                          className="p-1.5 rounded-lg text-[#87756E] hover:text-[#C93B3B] hover:bg-[#FDF2F2]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Order Volume + Luxury Packaging & Decoration Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-[#F0EAE2]">
              <div>
                <label
                  htmlFor="order-box-count"
                  className="flex items-center gap-1 text-xs font-medium text-[#4F403C] mb-1"
                >
                  <span>تعداد کل بسته‌های سفارش</span>
                  <HelpTooltip
                    size="xs"
                    title="تعداد بسته در سفارش"
                    description="مشتری چند جعبه یا سینی از این ترکیب سفارش داده است؟ لیست خرید مواد اولیه و سود کل بر اساس این عدد محاسبه می‌شود."
                  />
                </label>
                <input
                  id="order-box-count"
                  type="number"
                  min="1"
                  max="5000"
                  step="5"
                  value={spec.boxCount}
                  onChange={(e) =>
                    setSpec((prev) => ({
                      ...prev,
                      boxCount: Math.max(1, Math.round(Number(e.target.value) || 1)),
                    }))
                  }
                  className="w-full h-10 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-sm font-bold text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
                />
              </div>

              <div>
                <label
                  htmlFor="order-extra-pkg"
                  className="flex items-center gap-1 text-xs font-medium text-[#4F403C] mb-1"
                >
                  <span>جعبه کادویی و روبان ({currencyLabel}/بسته)</span>
                  <HelpTooltip
                    size="xs"
                    title="بسته‌بندی اختصاصی هدیه"
                    description="هزینه جعبه هاردباکس، ساک دستی، روبان، کارت تبریک یا سینی اختصاصی که به ازای هر بسته اضافه می‌شود."
                  />
                </label>
                <input
                  id="order-extra-pkg"
                  type="number"
                  min="0"
                  step={currency === 'RIAL' ? '50000' : '5000'}
                  value={Math.round(spec.extraPackagingCostPerBox * multiplier)}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    setSpec((prev) => ({
                      ...prev,
                      extraPackagingCostPerBox: Math.round(val / multiplier),
                    }));
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-sm font-semibold text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
                />
              </div>

              <div>
                <label
                  htmlFor="order-extra-labor"
                  className="flex items-center gap-1 text-xs font-medium text-[#4F403C] mb-1"
                >
                  <span>چیدمان و کادوپیچی ({currencyLabel}/بسته)</span>
                  <HelpTooltip
                    size="xs"
                    title="اجرت چیدمان و تزیین ویژه"
                    description="هزینه وقت پرسنل برای چیدمان اختصاصی سینی، پاپیون زدن و بسته‌بندی ویژه هر پکیج."
                  />
                </label>
                <input
                  id="order-extra-labor"
                  type="number"
                  min="0"
                  step={currency === 'RIAL' ? '10000' : '1000'}
                  value={Math.round(spec.extraDecorLaborPerBox * multiplier)}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    setSpec((prev) => ({
                      ...prev,
                      extraDecorLaborPerBox: Math.round(val / multiplier),
                    }));
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-sm font-semibold text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
                />
              </div>
            </div>
          </section>

          {/* Step 2: Margin, Bulk Discount & Bargaining Red-Line Gauge */}
          <section className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#F0EAE2]">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#2A1F1D]">
                  ۲. سیاست قیمت‌گذاری و خط قرمز چانه‌زنی با مشتری
                </h3>
                <HelpTooltip
                  size="xs"
                  title="سقف چانه‌زنی امن (حداکثر تخفیف بدون ضرر)"
                  description="وقتی مشتری سازمانی درخواست تخفیف عمده می‌کند، این خط‌کش دقیقاً به شما نشان می‌دهد تا چند درصد تخفیف هنوز سود دارید و از چه درصدی به بعد وارد ضرر می‌شوید."
                />
              </div>
              <span className="text-xs font-bold text-[#C86D2D] tabular-nums">
                سقف تخفیف بدون ضرر: {formatPercent(quote.maxSafeDiscountPercent, 1)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Target Margin Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor="order-target-margin"
                    className="font-semibold text-[#4F403C]"
                  >
                    حاشیه سود پایه پکیج (پیش از تخفیف)
                  </label>
                  <span className="font-extrabold text-[#1F7A5A] tabular-nums">
                    {formatPercent(spec.targetMarginPercent, 0)}
                  </span>
                </div>
                <input
                  id="order-target-margin"
                  type="range"
                  min={10}
                  max={65}
                  step={1}
                  value={spec.targetMarginPercent}
                  onChange={(e) =>
                    setSpec((prev) => ({
                      ...prev,
                      targetMarginPercent: Number(e.target.value),
                    }))
                  }
                  className="w-full saffron-slider cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[#87756E] tabular-nums">
                  <span>۱۰٪ (اقتصادی)</span>
                  <span>۳۵٪ (استاندارد)</span>
                  <span>۶۵٪ (لوکس VIP)</span>
                </div>
              </div>

              {/* Bulk Discount Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor="order-discount-slider"
                    className="font-semibold text-[#4F403C]"
                  >
                    تخفیف تیراژ پیشنهادی به مشتری
                  </label>
                  <span
                    className={`font-extrabold tabular-nums ${
                      !quote.isProfitable
                        ? 'text-[#C93B3B]'
                        : 'text-[#C86D2D]'
                    }`}
                  >
                    {formatPercent(spec.discountPercent, 1)}
                  </span>
                </div>
                <input
                  id="order-discount-slider"
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={spec.discountPercent}
                  onChange={(e) =>
                    setSpec((prev) => ({
                      ...prev,
                      discountPercent: Number(e.target.value),
                    }))
                  }
                  className="w-full saffron-slider cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[#87756E] tabular-nums">
                  <span>۰٪ (بدون تخفیف)</span>
                  <span>
                    سقف ایمن: {formatPercent(quote.maxSafeDiscountPercent, 1)}
                  </span>
                  <span>۵۰٪</span>
                </div>
              </div>
            </div>

            {/* Visual Bargaining Red-Line Meter */}
            <div
              className={`rounded-xl border p-4 space-y-2.5 ${bargainingStatus.toneClass}`}
            >
              <div className="flex items-center justify-between gap-2 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  {quote.isProfitable ? (
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{bargainingStatus.label}</span>
                </span>
                <span className="tabular-nums">
                  حاشیه سود خالص نهایی:{' '}
                  {formatPercent(quote.effectiveMarginPercent, 1)}
                </span>
              </div>

              <div className="h-2.5 w-full rounded-md bg-white/80 overflow-hidden border border-black/5">
                <div
                  className={`h-full transition-all duration-300 ${bargainingStatus.barColor}`}
                  style={{ width: `${Math.max(4, discountBarFillPercent)}%` }}
                />
              </div>

              <p className="text-[11px] leading-relaxed opacity-90 tabular-nums">
                {quote.isProfitable
                  ? `تا ${formatPercent(
                      Math.max(0, quote.maxSafeDiscountPercent - spec.discountPercent),
                      1
                    )} جای چانه‌زنی دیگر باقی مانده است؛ در صورت اعطای بیش از ${formatPercent(
                      quote.maxSafeDiscountPercent,
                      1
                    )} تخفیف، قیمت هر بسته به زیر بهای تمام‌شده (${formatCurrency(
                      quote.totalCostPerBox,
                      currency
                    )}) سقوط می‌کند.`
                  : `تخفیف فعلی از سقف ایمن (${formatPercent(
                      quote.maxSafeDiscountPercent,
                      1
                    )}) عبور کرده است و در هر بسته ${formatCurrency(
                      Math.abs(quote.unitProfitPerBox),
                      currency
                    )} زیان می‌دهید.`}
              </p>
            </div>
          </section>
        </div>

        {/* Right/End 5 Columns: Live Formal Quote Card (Printable + WhatsApp Copy) */}
        <aside
          aria-label="پیش‌فاکتور رسمی مشتری"
          className="xl:col-span-5 xl:sticky xl:top-22 space-y-4"
        >
          <div className="bg-white rounded-2xl border border-[#EAE4DC] shadow-xs overflow-hidden">
            {/* Invoice Accent Header */}
            <div className="bg-[#2A1F1D] text-white p-5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#E8C5A5]">
                  پیش‌فاکتور رسمی سفارش اختصاصی
                </span>
                <span className="text-xs text-[#D5C8BA] tabular-nums">
                  تحویل: {spec.deliveryDate}
                </span>
              </div>
              <h3 className="text-base font-extrabold truncate">
                {spec.orderTitle || 'پکیج اختصاصی کارگاه'}
              </h3>
              <p className="text-xs text-[#D5C8BA] truncate">
                {state.settings.workshopName} — مشتری: {spec.customerName || '—'}
              </p>
            </div>

            <div className="p-5 space-y-4 tabular-nums">
              {/* 4 Compact Financial KPIs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4DC]">
                  <div className="text-[11px] text-[#6B5B56]">
                    بهای تمام‌شده هر بسته
                  </div>
                  <div className="text-sm font-extrabold text-[#2A1F1D] mt-1">
                    {formatCurrency(quote.totalCostPerBox, currency)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF3EC] border border-[#EED7B8]">
                  <div className="text-[11px] text-[#9A4E16]">
                    قیمت نهایی هر بسته
                  </div>
                  <div className="text-sm font-extrabold text-[#C86D2D] mt-1">
                    {formatCurrency(quote.finalPricePerBox, currency)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4DC]">
                  <div className="text-[11px] text-[#6B5B56]">
                    مبلغ کل پیش‌فاکتور ({formatNumber(quote.boxCount)} بسته)
                  </div>
                  <div className="text-base font-extrabold text-[#2A1F1D] mt-1">
                    {formatCompactCurrency(
                      quote.totalOrderFinalRevenue,
                      currency
                    )}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    quote.isProfitable
                      ? 'bg-[#EFF8F4] border-[#C6E6D9]'
                      : 'bg-[#FDF2F2] border-[#F0C8C8]'
                  }`}
                >
                  <div
                    className={`text-[11px] ${
                      quote.isProfitable ? 'text-[#175D44]' : 'text-[#9E2A2A]'
                    }`}
                  >
                    سود خالص کل سفارش
                  </div>
                  <div
                    className={`text-base font-extrabold mt-1 ${
                      quote.isProfitable ? 'text-[#1F7A5A]' : 'text-[#C93B3B]'
                    }`}
                  >
                    {quote.totalOrderNetProfit >= 0 ? '+' : ''}
                    {formatCompactCurrency(quote.totalOrderNetProfit, currency)}
                  </div>
                </div>
              </div>

              {/* Per-Box Cost Breakdown */}
              <div className="divide-y divide-[#F0EAE2] text-xs">
                <div className="py-2 flex items-center justify-between">
                  <span className="text-[#6B5B56]">بهای شیرینی‌های داخل بسته</span>
                  <span className="font-semibold text-[#2A1F1D]">
                    {formatCurrency(quote.productsCostPerBox, currency)}
                  </span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-[#6B5B56]">جعبه کادویی و تزیینات</span>
                  <span className="font-semibold text-[#2A1F1D]">
                    {formatCurrency(
                      quote.extraPackagingCostPerBox + quote.extraDecorLaborPerBox,
                      currency
                    )}
                  </span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-[#6B5B56]">جمع پیش از تخفیف کل سفارش</span>
                  <span className="font-semibold text-[#2A1F1D]">
                    {formatCurrency(quote.totalOrderBeforeDiscount, currency)}
                  </span>
                </div>
                {spec.discountPercent > 0 && (
                  <div className="py-2 flex items-center justify-between text-[#C86D2D]">
                    <span>
                      تخفیف تیراژ ({formatPercent(spec.discountPercent, 1)})
                    </span>
                    <span className="font-bold">
                      - {formatCurrency(quote.totalDiscountAmount, currency)}
                    </span>
                  </div>
                )}
                <div className="pt-3 flex items-center justify-between text-sm font-extrabold text-[#2A1F1D]">
                  <span>مبلغ نهایی قابل پرداخت</span>
                  <span>
                    {formatCurrency(quote.totalOrderFinalRevenue, currency)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 no-print">
                <button
                  type="button"
                  onClick={handleCopyWhatsappQuote}
                  className={`inline-flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs font-semibold transition-colors ${
                    copiedQuote
                      ? 'bg-[#1F7A5A] text-white'
                      : 'bg-[#C86D2D] text-white hover:bg-[#B25D22]'
                  }`}
                >
                  {copiedQuote ? (
                    <>
                      <Check className="h-4 w-4 shrink-0" />
                      <span>متن پیش‌فاکتور کپی شد!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 shrink-0" />
                      <span>کپی پیش‌فاکتور واتساپ</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-xs font-semibold text-[#2A1F1D] hover:bg-[#F3ECE3] transition-colors"
                >
                  <Printer className="h-4 w-4 shrink-0 text-[#6B5B56]" />
                  <span>چاپ پیش‌فاکتور</span>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Dedicated Order MRP Shopping List */}
      <section
        aria-label="لیست خرید مواد اولیه اختصاصی این سفارش"
        className="bg-white rounded-2xl border border-[#EAE4DC] shadow-xs overflow-hidden"
      >
        <div className="p-5 border-b border-[#F0EAE2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#FAF3EC] text-[#C86D2D] flex items-center justify-center shrink-0">
              <ShoppingBasket className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-[#2A1F1D]">
                  لیست خرید مواد اولیه اختصاصی همین سفارش (با لحاظ افت پخت)
                </h3>
                <HelpTooltip
                  title="تأمین مواد فقط برای این سفارش"
                  description="برنامه به‌طور خودکار تمام شیرینی‌های داخل این پکیج را در تعداد کل بسته‌ها ضرب می‌کند و با در نظر گرفتن درصد افت پخت، دقیقاً می‌گوید چه مقدار آرد، کره، پسته و شکر برای انجام همین سفارش باید بخرید."
                />
              </div>
              <p className="text-xs text-[#6B5B56] mt-0.5">
                برای تحویل {formatNumber(quote.boxCount)} بسته «{spec.orderTitle}»
              </p>
            </div>
          </div>

          <div className="text-right sm:text-left tabular-nums">
            <div className="text-[11px] text-[#87756E]">
              بودجه کل خرید مواد خام این سفارش
            </div>
            <div className="text-base font-extrabold text-[#1F7A5A]">
              {formatCurrency(totalOrderMrpBudget, currency)}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EAE4DC] text-xs font-semibold text-[#6B5B56]">
                <th className="py-3 px-4">ماده اولیه</th>
                <th className="py-3 px-3">دسته‌بندی</th>
                <th className="py-3 px-3">مقدار ناخالص مورد نیاز</th>
                <th className="py-3 px-3">قیمت هر واحد ({currencyLabel})</th>
                <th className="py-3 px-4 text-left">بودجه خرید ({currencyLabel})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE2] text-sm tabular-nums">
              {quote.orderMrpRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-xs text-[#87756E]"
                  >
                    برای مشاهده لیست خرید اختصاصی، حداقل یک شیرینی به پکیج اضافه کنید.
                  </td>
                </tr>
              ) : (
                quote.orderMrpRows.map((row) => (
                  <tr
                    key={row.ingredientId}
                    className="hover:bg-[#FCF9F5] transition-colors"
                  >
                    <td className="py-2.5 px-4 font-semibold text-[#2A1F1D]">
                      {row.name}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[#6B5B56]">
                      {row.category}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#C86D2D]">
                      {formatNumber(row.totalQuantityRequired, 2)}{' '}
                      {PURCHASE_UNIT_LABELS[row.purchaseUnit]}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[#6B5B56]">
                      {formatCurrency(row.unitPrice, currency, false)}
                    </td>
                    <td className="py-2.5 px-4 text-left font-bold text-[#2A1F1D]">
                      {formatCurrency(row.totalBudget, currency, false)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
