import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  CurrencyMode,
  INGREDIENT_CATEGORIES,
  Ingredient,
  IngredientCategory,
  PURCHASE_UNIT_LABELS,
  PurchaseUnit,
  WorkshopState,
  WorkshopSummary,
} from '../types/workshop';
import {
  formatNumber,
  getCurrencyLabel,
  getCurrencyMultiplier,
  parseNumericInput,
} from '../utils/format';
import { HelpTooltip } from './HelpTooltip';
import { IngredientShockRadar } from './IngredientShockRadar';

interface PantryTabProps {
  state: WorkshopState;
  summary: WorkshopSummary;
  ingredients: Ingredient[];
  currency: CurrencyMode;
  onAddIngredient: (ingredient: Omit<Ingredient, 'id'>) => void;
  onUpdateIngredient: (ingredient: Ingredient) => void;
  onDeleteIngredient: (id: string) => void;
  onApplyCategoryInflation: (
    category: IngredientCategory | 'ALL',
    percentChange: number
  ) => void;
  onInspectProduct: (productId: string) => void;
}

export const PantryTab: React.FC<PantryTabProps> = ({
  state,
  summary,
  ingredients,
  currency,
  onAddIngredient,
  onUpdateIngredient,
  onDeleteIngredient,
  onApplyCategoryInflation,
  onInspectProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IngredientCategory | 'ALL'>('ALL');

  // Inflation tool state
  const [inflationCategory, setInflationCategory] = useState<IngredientCategory | 'ALL'>('مغزیجات');
  const [inflationPercent, setInflationPercent] = useState<string>('20');

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<IngredientCategory>('آرد و غلات');
  const [newUnit, setNewUnit] = useState<PurchaseUnit>('kg');
  const [newPriceDisplay, setNewPriceDisplay] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const multiplier = getCurrencyMultiplier(currency);
  const currencyLabel = getCurrencyLabel(currency);

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((ing) => {
      const matchesCat =
        categoryFilter === 'ALL' || ing.category === categoryFilter;
      const matchesQuery =
        searchQuery.trim() === '' ||
        ing.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        ing.category.includes(searchQuery.trim());
      return matchesCat && matchesQuery;
    });
  }, [ingredients, categoryFilter, searchQuery]);

  const affectedInflationCount = useMemo(() => {
    if (inflationCategory === 'ALL') return ingredients.length;
    return ingredients.filter((i) => i.category === inflationCategory).length;
  }, [ingredients, inflationCategory]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    const numericPrice = parseNumericInput(newPriceDisplay);
    if (!trimmedName) {
      setFormError('لطفاً نام ماده اولیه یا قلم بسته‌بندی را وارد کنید.');
      return;
    }
    if (numericPrice <= 0) {
      setFormError('قیمت خرید باید عددی بزرگ‌تر از صفر باشد.');
      return;
    }

    onAddIngredient({
      name: trimmedName,
      category: newCategory,
      purchaseUnit: newUnit,
      pricePerUnit: Math.round(numericPrice / multiplier),
    });

    setNewName('');
    setNewPriceDisplay('');
    setFormError(null);
    setShowAddForm(false);
  };

  const handleInflationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseNumericInput(inflationPercent);
    if (pct === 0 || pct <= -95) return;
    onApplyCategoryInflation(inflationCategory, pct);
  };

  return (
    <div className="space-y-6">
      {/* Quick Category Inflation Updater */}
      <section
        aria-label="به‌روزرسانی سریع تورم گروهی"
        className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-[#C86D2D] text-xs font-semibold">
              <TrendingUp className="h-4 w-4" />
              <span>ابزار ضدتورم بازار ایران</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <h2 className="text-base font-bold text-[#2A1F1D]">
                به‌روزرسانی سریع تورم گروهی مواد اولیه
              </h2>
              <HelpTooltip
                title="افزایش یا کاهش دسته‌جمعی قیمت مواد"
                description="وقتی مثلاً قیمت همه مغزیجات یا لبنیات در بازار ۲۰٪ گران می‌شود، به‌جای اینکه دانه به دانه قیمت‌ها را عوض کنید، اینجا گروه و درصد را انتخاب کنید تا قیمت همه اقلام آن گروه و هزینه تمام شیرینی‌ها یکجا آپدیت شود."
              />
            </div>
            <p className="text-xs text-[#6B5B56] mt-1 leading-relaxed">
              با انتخاب یک گروه کالایی و اعمال درصد افزایش قیمت، بهای تمام‌شده تمام شیرینی‌ها و قیمت‌های پیشنهادی در کل سامانه به‌صورت خودکار بازمحاسبه می‌شود.
            </p>
          </div>

          <form
            onSubmit={handleInflationSubmit}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="min-w-[170px]">
              <label
                htmlFor="inflation-category"
                className="flex items-center gap-1 text-xs font-medium text-[#4F403C] mb-1.5"
              >
                <span>دسته‌بندی هدف</span>
                <HelpTooltip
                  size="xs"
                  title="دسته‌بندی هدف"
                  description="انتخاب کنید تغییر قیمت فقط روی یک گروه خاص (مثلاً لبنیات و روغن) اعمال شود یا روی همه مواد اولیه و بسته‌بندی‌ها."
                />
              </label>
              <select
                id="inflation-category"
                value={inflationCategory}
                onChange={(e) =>
                  setInflationCategory(e.target.value as IngredientCategory | 'ALL')
                }
                className="w-full h-10 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-sm text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
              >
                <option value="ALL">تمام مواد و بسته‌بندی‌ها</option>
                {INGREDIENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-[140px]">
              <label
                htmlFor="inflation-percent"
                className="flex items-center gap-1 text-xs font-medium text-[#4F403C] mb-1.5"
              >
                <span>درصد تغییر (٪)</span>
                <HelpTooltip
                  size="xs"
                  title="درصد تغییر قیمت"
                  description="عدد مثبت (مثلاً ۲۰) قیمت را ۲۰٪ بالا می‌برد و عدد منفی (مثلاً -۱۰) قیمت را ۱۰٪ ارزان‌تر می‌کند."
                />
              </label>
              <input
                id="inflation-percent"
                type="number"
                step="1"
                min="-50"
                max="300"
                value={inflationPercent}
                onChange={(e) => setInflationPercent(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-sm text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
              />
            </div>

            <button
              type="submit"
              className="h-10 px-4 rounded-xl bg-[#C86D2D] text-white text-xs font-semibold hover:bg-[#B25D22] transition-colors whitespace-nowrap"
            >
              اعمال روی {formatNumber(affectedInflationCount)} قلم
            </button>
          </form>
        </div>
      </section>

      {/* Ingredient Price Shock & Tornado Sensitivity Radar */}
      <IngredientShockRadar
        state={state}
        summary={summary}
        currency={currency}
        onInspectProduct={onInspectProduct}
      />

      {/* Toolbar: Search, Category Filters & Add Button */}
      <section className="bg-white rounded-2xl border border-[#EAE4DC] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#F0EAE2] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-[#2A1F1D]">
                فهرست مواد اولیه و بسته‌بندی (ویرایش مستقیم)
              </h2>
              <HelpTooltip
                title="بانک مواد اولیه و بسته‌بندی"
                description="تمام مواد خام (آرد، کره، پسته...) و لوازم بسته‌بندی (جعبه، زیرکیکی...) اینجا ثبت می‌شوند. هر خانه‌ای را مستقیماً می‌توانید تغییر دهید و بلافاصله قیمت تمام شیرینی‌های مرتبط به‌روز می‌شود."
              />
            </div>
            <span className="text-xs text-[#87756E]">
              تمامی ستون‌ها مستقیماً قابل ویرایش و ذخیره خودکار هستند
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 text-[#87756E] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام ماده اولیه یا بسته‌بندی..."
                aria-label="جستجو در بانک مواد اولیه"
                className="w-full h-10 pr-10 pl-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-sm text-[#2A1F1D] placeholder:text-[#9A8B84] focus:outline-none focus:border-[#C86D2D]"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddForm((prev) => !prev);
                setFormError(null);
              }}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#2A1F1D] text-white text-xs font-semibold hover:bg-[#3F302D] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>افزودن ماده جدید</span>
            </button>
          </div>

          {/* Interactive Category Filter Tabs */}
          <div
            role="group"
            aria-label="فیلتر دسته‌بندی مواد اولیه"
            className="flex items-center gap-1.5 overflow-x-auto pb-1"
          >
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === 'ALL'
                  ? 'bg-[#FAF3EC] text-[#C86D2D] font-semibold'
                  : 'text-[#6B5B56] hover:bg-[#FAF8F5] hover:text-[#2A1F1D]'
              }`}
            >
              همه اقلام ({formatNumber(ingredients.length)})
            </button>
            {INGREDIENT_CATEGORIES.map((cat) => {
              const count = ingredients.filter((i) => i.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-[#FAF3EC] text-[#C86D2D] font-semibold'
                      : 'text-[#6B5B56] hover:bg-[#FAF8F5] hover:text-[#2A1F1D]'
                  }`}
                >
                  {cat} ({formatNumber(count)})
                </button>
              );
            })}
          </div>
        </div>

        {/* Collapsible Add Ingredient Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateSubmit}
            className="p-5 bg-[#FCF9F5] border-b border-[#EAE4DC] space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#2A1F1D]">
                  ثبت ماده اولیه یا قلم بسته‌بندی جدید
                </h3>
                <HelpTooltip
                  size="xs"
                  title="افزودن قلم جدید"
                  description="نام ماده، گروه، واحد خرید (مثلاً کیلو گرم یا عدد) و قیمت خرید روز آن را وارد کنید تا بتوانید در دستور پخت شیرینی‌ها از آن استفاده کنید."
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                aria-label="بستن فرم افزودن"
                className="p-1 rounded-lg text-[#6B5B56] hover:bg-[#EFE9E1]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <p className="text-xs text-[#C93B3B] font-medium" role="alert">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label
                  htmlFor="new-ing-name"
                  className="block text-xs font-medium text-[#4F403C] mb-1"
                >
                  نام ماده
                </label>
                <input
                  id="new-ing-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثلاً: زعفران سرگل قائنات"
                  className="w-full h-10 px-3 rounded-xl border border-[#DDD4C8] bg-white text-sm text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
                />
              </div>

              <div>
                <label
                  htmlFor="new-ing-category"
                  className="block text-xs font-medium text-[#4F403C] mb-1"
                >
                  دسته‌بندی
                </label>
                <select
                  id="new-ing-category"
                  value={newCategory}
                  onChange={(e) =>
                    setNewCategory(e.target.value as IngredientCategory)
                  }
                  className="w-full h-10 px-3 rounded-xl border border-[#DDD4C8] bg-white text-sm text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
                >
                  {INGREDIENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="new-ing-unit"
                  className="block text-xs font-medium text-[#4F403C] mb-1"
                >
                  واحد خرید
                </label>
                <select
                  id="new-ing-unit"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value as PurchaseUnit)}
                  className="w-full h-10 px-3 rounded-xl border border-[#DDD4C8] bg-white text-sm text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
                >
                  {(Object.keys(PURCHASE_UNIT_LABELS) as PurchaseUnit[]).map(
                    (u) => (
                      <option key={u} value={u}>
                        {PURCHASE_UNIT_LABELS[u]}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="new-ing-price"
                  className="block text-xs font-medium text-[#4F403C] mb-1"
                >
                  قیمت خرید ({currencyLabel})
                </label>
                <input
                  id="new-ing-price"
                  type="number"
                  min="1"
                  step="100"
                  value={newPriceDisplay}
                  onChange={(e) => setNewPriceDisplay(e.target.value)}
                  placeholder={`مثلاً: ${currency === 'RIAL' ? '4500000' : '450000'}`}
                  className="w-full h-10 px-3 rounded-xl border border-[#DDD4C8] bg-white text-sm text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl border border-[#DDD4C8] bg-white text-xs font-medium text-[#4F403C] hover:bg-[#FAF8F5]"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#1F7A5A] text-white text-xs font-semibold hover:bg-[#176147] transition-colors"
              >
                ذخیره در بانک مواد
              </button>
            </div>
          </form>
        )}

        {/* Directly Editable Ingredients Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EAE4DC] text-xs font-semibold text-[#6B5B56]">
                <th className="py-3 px-4">
                  <span className="inline-flex items-center gap-1">
                    نام ماده / بسته‌بندی
                    <HelpTooltip
                      size="xs"
                      title="نام ماده اولیه"
                      description="نام هر قلم را می‌توانید مستقیماً داخل کادر تغییر دهید."
                    />
                  </span>
                </th>
                <th className="py-3 px-3">
                  <span className="inline-flex items-center gap-1">
                    دسته‌بندی
                    <HelpTooltip
                      size="xs"
                      title="دسته‌بندی ماده"
                      description="برای فیلتر کردن و اعمال سریع تورم گروهی به کار می‌رود."
                    />
                  </span>
                </th>
                <th className="py-3 px-3">
                  <span className="inline-flex items-center gap-1">
                    واحد خرید
                    <HelpTooltip
                      size="xs"
                      title="واحد خرید عمده"
                      description="واحدی که این ماده را از بازار می‌خرید (مثلاً کیلو گرم، گرم، لیتر یا عدد). برنامه هنگام حساب کردن رسپی، گرم و کیلو گرم را خودکار تبدیل می‌کند."
                    />
                  </span>
                </th>
                <th className="py-3 px-3">
                  <span className="inline-flex items-center gap-1">
                    قیمت خرید فعلی ({currencyLabel})
                    <HelpTooltip
                      size="xs"
                      title="قیمت خرید روز"
                      description="قیمت خرید هر یک واحد از این ماده را وارد کنید. به محض تغییر عدد، قیمت تمام‌شده همه شیرینی‌ها به‌صورت خودکار آپدیت می‌شود."
                    />
                  </span>
                </th>
                <th className="py-3 px-4 text-left">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE2] text-sm">
              {filteredIngredients.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-sm text-[#87756E]"
                  >
                    موردی با فیلتر انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredIngredients.map((ing) => (
                  <tr
                    key={ing.id}
                    className="hover:bg-[#FCF9F5] transition-colors"
                  >
                    <td className="py-2.5 px-4 min-w-[200px]">
                      <input
                        type="text"
                        value={ing.name}
                        onChange={(e) =>
                          onUpdateIngredient({
                            ...ing,
                            name: e.target.value,
                          })
                        }
                        aria-label={`نام ماده ${ing.name}`}
                        className="w-full h-9 px-2.5 rounded-lg border border-transparent hover:border-[#DDD4C8] focus:border-[#C86D2D] bg-transparent hover:bg-white focus:bg-white text-sm font-medium text-[#2A1F1D] focus:outline-none transition-colors"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={ing.category}
                        onChange={(e) =>
                          onUpdateIngredient({
                            ...ing,
                            category: e.target.value as IngredientCategory,
                          })
                        }
                        aria-label={`دسته‌بندی ${ing.name}`}
                        className="h-9 px-2 rounded-lg border border-[#EAE4DC] bg-[#FAF8F5] hover:border-[#C86D2D] focus:border-[#C86D2D] text-xs text-[#4F403C] focus:outline-none"
                      >
                        {INGREDIENT_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={ing.purchaseUnit}
                        onChange={(e) =>
                          onUpdateIngredient({
                            ...ing,
                            purchaseUnit: e.target.value as PurchaseUnit,
                          })
                        }
                        aria-label={`واحد خرید ${ing.name}`}
                        className="h-9 px-2 rounded-lg border border-[#EAE4DC] bg-[#FAF8F5] hover:border-[#C86D2D] focus:border-[#C86D2D] text-xs text-[#4F403C] focus:outline-none"
                      >
                        {(
                          Object.keys(PURCHASE_UNIT_LABELS) as PurchaseUnit[]
                        ).map((u) => (
                          <option key={u} value={u}>
                            {PURCHASE_UNIT_LABELS[u]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3 tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          step={currency === 'RIAL' ? '10000' : '1000'}
                          value={Math.round(ing.pricePerUnit * multiplier)}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            onUpdateIngredient({
                              ...ing,
                              pricePerUnit: Math.round(val / multiplier),
                            });
                          }}
                          aria-label={`قیمت ${ing.name} به ${currencyLabel}`}
                          className="w-32 h-9 px-2.5 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] focus:bg-white focus:border-[#C86D2D] text-sm font-semibold text-[#2A1F1D] tabular-nums focus:outline-none"
                        />
                        <span className="text-xs text-[#87756E] whitespace-nowrap">
                          {currencyLabel}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-left whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteIngredient(ing.id)}
                        aria-label={`حذف ${ing.name}`}
                        className="p-2 rounded-lg text-[#87756E] hover:text-[#C93B3B] hover:bg-[#FDF2F2] transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
