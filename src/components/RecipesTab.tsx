import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Flame,
  PackageCheck,
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
  Utensils,
} from 'lucide-react';
import {
  CurrencyMode,
  Ingredient,
  PRODUCT_CATEGORIES,
  Product,
  ProductCategory,
  ProductCostBreakdown,
  RECIPE_UNIT_LABELS,
  RecipeUnit,
  SALES_UNIT_LABELS,
  SalesUnit,
  WorkshopSettings,
} from '../types/workshop';
import {
  convertRecipeQtyToPurchaseQty,
  simulateProductFinalPrice,
} from '../utils/accounting';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  getCurrencyLabel,
  getCurrencyMultiplier,
} from '../utils/format';
import { DedicatedProductAnalysis } from './DedicatedProductAnalysis';
import { HelpTooltip } from './HelpTooltip';
import { KitchenBatchScaler } from './KitchenBatchScaler';

interface RecipesTabProps {
  products: Product[];
  breakdowns: ProductCostBreakdown[];
  ingredients: Ingredient[];
  settings: WorkshopSettings;
  currency: CurrencyMode;
  selectedProductId: string;
  onSelectProduct: (id: string) => void;
  onUpdateProduct: (product: Product) => void;
  onUpdateSettings: (patch: Partial<WorkshopSettings>) => void;
  onAddProduct: () => void;
  onDeleteProduct: (id: string) => void;
}

export const RecipesTab: React.FC<RecipesTabProps> = ({
  products,
  breakdowns,
  ingredients,
  settings,
  currency,
  selectedProductId,
  onSelectProduct,
  onUpdateProduct,
  onUpdateSettings,
  onAddProduct,
  onDeleteProduct,
}) => {
  const multiplier = getCurrencyMultiplier(currency);
  const currencyLabel = getCurrencyLabel(currency);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? products[0] ?? null,
    [products, selectedProductId]
  );

  const selectedBreakdown = useMemo(
    () =>
      breakdowns.find((b) => b.productId === selectedProduct?.id) ??
      breakdowns[0] ??
      null,
    [breakdowns, selectedProduct]
  );

  // Actual overhead % relative to direct cost for the selected product
  const actualOverheadPercent = useMemo(() => {
    if (!selectedBreakdown || selectedBreakdown.variableCostPerUnit <= 0) {
      return 0;
    }
    return Number(
      (
        (selectedBreakdown.overheadCostPerUnit /
          selectedBreakdown.variableCostPerUnit) *
        100
      ).toFixed(1)
    );
  }, [selectedBreakdown]);

  // Final Price Simulator local draft state (does NOT mutate saved product until user clicks Apply)
  const [simOverheadPct, setSimOverheadPct] = useState<number>(
    actualOverheadPercent
  );
  const [simTargetMarginPct, setSimTargetMarginPct] = useState<number>(
    selectedProduct?.targetMarginPercent ?? 32
  );
  const [simTouched, setSimTouched] = useState<boolean>(false);

  // Reset simulator cleanly whenever user switches product
  useEffect(() => {
    setSimOverheadPct(actualOverheadPercent);
    setSimTargetMarginPct(selectedProduct?.targetMarginPercent ?? 32);
    setSimTouched(false);
  }, [selectedProduct?.id]);

  // Keep simulator synced with live actuals while untouched
  useEffect(() => {
    if (!simTouched) {
      setSimOverheadPct(actualOverheadPercent);
      if (selectedProduct) {
        setSimTargetMarginPct(selectedProduct.targetMarginPercent);
      }
    }
  }, [actualOverheadPercent, selectedProduct?.targetMarginPercent, simTouched]);

  const finalPriceSim = useMemo(() => {
    if (!selectedBreakdown) return null;
    return simulateProductFinalPrice(selectedBreakdown, {
      overheadPercentOfDirectCost: simOverheadPct,
      targetMarginPercent: simTargetMarginPct,
    });
  }, [selectedBreakdown, simOverheadPct, simTargetMarginPct]);

  const ingredientMap = useMemo(() => {
    const map = new Map<string, Ingredient>();
    ingredients.forEach((ing) => map.set(ing.id, ing));
    return map;
  }, [ingredients]);

  const rawIngredientsList = useMemo(
    () => ingredients.filter((i) => i.category !== 'بسته‌بندی'),
    [ingredients]
  );

  const packagingList = useMemo(() => {
    const pkgs = ingredients.filter((i) => i.category === 'بسته‌بندی');
    return pkgs.length > 0 ? pkgs : ingredients;
  }, [ingredients]);

  if (!selectedProduct || !selectedBreakdown || !finalPriceSim) {
    return (
      <div className="bg-white rounded-2xl border border-[#EAE4DC] p-10 text-center space-y-4">
        <p className="text-sm text-[#6B5B56]">
          هنوز هیچ محصولی در کارگاه ثبت نشده است.
        </p>
        <button
          type="button"
          onClick={onAddProduct}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C86D2D] text-white text-sm font-semibold hover:bg-[#B25D22]"
        >
          <Plus className="h-4 w-4" />
          <span>ثبت اولین شیرینی</span>
        </button>
      </div>
    );
  }

  const updateField = <K extends keyof Product>(key: K, value: Product[K]) => {
    onUpdateProduct({ ...selectedProduct, [key]: value });
  };

  const addRecipeIngredient = () => {
    const defaultIng = rawIngredientsList[0] ?? ingredients[0];
    if (!defaultIng) return;
    const defaultUnit: RecipeUnit =
      defaultIng.purchaseUnit === 'kg'
        ? 'g'
        : defaultIng.purchaseUnit === 'liter'
        ? 'ml'
        : defaultIng.purchaseUnit;
    updateField('ingredients', [
      ...selectedProduct.ingredients,
      { ingredientId: defaultIng.id, quantity: 500, unit: defaultUnit },
    ]);
  };

  const updateRecipeIngredient = (
    index: number,
    patch: Partial<Product['ingredients'][number]>
  ) => {
    const next = selectedProduct.ingredients.map((item, idx) =>
      idx === index ? { ...item, ...patch } : item
    );
    updateField('ingredients', next);
  };

  const removeRecipeIngredient = (index: number) => {
    updateField(
      'ingredients',
      selectedProduct.ingredients.filter((_, idx) => idx !== index)
    );
  };

  const addPackagingItem = () => {
    const defaultPkg = packagingList[0];
    if (!defaultPkg) return;
    updateField('packaging', [
      ...selectedProduct.packaging,
      {
        ingredientId: defaultPkg.id,
        quantityPerSalesUnit: 1,
        unit: defaultPkg.purchaseUnit,
      },
    ]);
  };

  const updatePackagingItem = (
    index: number,
    patch: Partial<Product['packaging'][number]>
  ) => {
    const next = selectedProduct.packaging.map((item, idx) =>
      idx === index ? { ...item, ...patch } : item
    );
    updateField('packaging', next);
  };

  const removePackagingItem = (index: number) => {
    updateField(
      'packaging',
      selectedProduct.packaging.filter((_, idx) => idx !== index)
    );
  };

  const applySimulatedShowcasePrice = () => {
    onUpdateProduct({
      ...selectedProduct,
      sellingPrice: finalPriceSim.roundedShowcasePrice,
      targetMarginPercent: Math.round(simTargetMarginPct),
    });
    setSimTouched(false);
  };

  const resetSimulator = () => {
    setSimOverheadPct(actualOverheadPercent);
    setSimTargetMarginPct(selectedProduct.targetMarginPercent);
    setSimTouched(false);
  };

  const salesUnitText = SALES_UNIT_LABELS[selectedProduct.salesUnit];
  const marginStatus =
    selectedBreakdown.unitProfit < 0
      ? { label: 'زیان‌ده', color: 'text-[#C93B3B]' }
      : selectedBreakdown.profitMarginPercent < 15
      ? { label: 'هشدار حاشیه سود پایین', color: 'text-[#C93B3B]' }
      : selectedBreakdown.profitMarginPercent >= 30
      ? { label: 'سودآوری ممتاز', color: 'text-[#1F7A5A]' }
      : { label: 'سودآوری مطلوب', color: 'text-[#1F7A5A]' };

  return (
    <div className="space-y-6">
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Column 1 (Start): Product Selector Sidebar */}
      <aside
        aria-label="فهرست محصولات کارگاه"
        className="xl:col-span-3 bg-white rounded-2xl border border-[#EAE4DC] shadow-xs overflow-hidden"
      >
        <div className="p-4 border-b border-[#F0EAE2] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-[#2A1F1D]">
              محصولات کارگاه ({formatNumber(products.length)})
            </h2>
            <HelpTooltip
              size="xs"
              title="فهرست شیرینی‌های کارگاه"
              description="روی هر شیرینی کلیک کنید تا دستور پخت، هزینه‌ها و قیمت فروشش باز شود. با دکمه «محصول جدید» می‌توانید شیرینی تازه‌ای اضافه کنید."
            />
          </div>
          <button
            type="button"
            onClick={onAddProduct}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FAF3EC] text-[#C86D2D] text-xs font-semibold hover:bg-[#F3E4D5] transition-colors whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>محصول جدید</span>
          </button>
        </div>

        <div className="divide-y divide-[#F0EAE2]">
          {products.map((prod) => {
            const b = breakdowns.find((item) => item.productId === prod.id);
            const isSelected = prod.id === selectedProduct.id;
            const margin = b?.profitMarginPercent ?? 0;
            return (
              <button
                key={prod.id}
                type="button"
                onClick={() => onSelectProduct(prod.id)}
                className={`w-full text-right px-4 py-3.5 transition-colors flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-[#FAF3EC]'
                    : 'bg-white hover:bg-[#FCF9F5]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-bold truncate ${
                      isSelected ? 'text-[#C86D2D]' : 'text-[#2A1F1D]'
                    }`}
                  >
                    {prod.name}
                  </span>
                  <span
                    className={`text-xs font-bold tabular-nums shrink-0 ${
                      margin < 15 ? 'text-[#C93B3B]' : 'text-[#1F7A5A]'
                    }`}
                  >
                    {formatPercent(margin)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#87756E] tabular-nums">
                  <span>{prod.category}</span>
                  <span>
                    {formatNumber(prod.monthlyVolume)}{' '}
                    {SALES_UNIT_LABELS[prod.salesUnit]}/ماه
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Column 2 (Center): Step-by-Step Recipe Builder */}
      <div className="xl:col-span-5 space-y-5">
        {/* Product Basic Details */}
        <section className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#F0EAE2]">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-[#2A1F1D]">
                مشخصات پایه و فروش محصول
              </h2>
              <HelpTooltip
                size="xs"
                title="مشخصات پایه محصول"
                description="اطلاعات اصلی شیرینی مثل نام، نوع، واحد فروش (کیلو گرم یا عددی)، قیمت فعلی روی ویترین و میزان فروش ماهانه را اینجا وارد و ویرایش کنید."
              />
            </div>
            {products.length > 1 && (
              <button
                type="button"
                onClick={() => onDeleteProduct(selectedProduct.id)}
                aria-label={`حذف محصول ${selectedProduct.name}`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#87756E] hover:text-[#C93B3B] hover:bg-[#FDF2F2] transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>حذف محصول</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label
                htmlFor="prod-name"
                className="flex items-center gap-1 text-xs font-medium text-[#4F403C] mb-1"
              >
                <span>نام شیرینی / محصول</span>
                <HelpTooltip
                  size="xs"
                  title="نام محصول"
                  description="نامی که این شیرینی در ویترین و گزارش‌ها با آن شناخته می‌شود."
                />
              </label>
              <input
                id="prod-name"
                type="text"
                value={selectedProduct.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-sm font-semibold text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
              />
            </div>

            <div>
              <label
                htmlFor="prod-category"
                className="flex items-center gap-1 text-xs font-medium text-[#4F403C] mb-1"
              >
                <span>دسته‌بندی</span>
                <HelpTooltip
                  size="xs"
                  title="گروه شیرینی"
                  description="مشخص می‌کند این محصول جزو شیرینی خشک، تر، کیک و رولت یا سنتی و باقلوا است."
                />
              </label>
              <select
                id="prod-category"
                value={selectedProduct.category}
                onChange={(e) =>
                  updateField('category', e.target.value as ProductCategory)
                }
                className="w-full h-10 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-sm text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="prod-sales-unit"
                className="flex items-center gap-1 text-xs font-medium text-[#4F403C] mb-1"
              >
                <span>واحد فروش</span>
                <HelpTooltip
                  size="xs"
                  title="واحد فروش به مشتری"
                  description="اگر این شیرینی را وزنی می‌فروشید «کیلو گرم» و اگر دانه یا قالبی می‌فروشید «عددی / قالبی» را انتخاب کنید."
                />
              </label>
              <select
                id="prod-sales-unit"
                value={selectedProduct.salesUnit}
                onChange={(e) =>
                  updateField('salesUnit', e.target.value as SalesUnit)
                }
                className="w-full h-10 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-sm text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
              >
                <option value="kg">کیلو گرم</option>
                <option value="unit">عددی / قالبی</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="prod-selling-price"
                className="flex items-center gap-1 text-xs font-medium text-[#4F403C] mb-1"
              >
                <span>قیمت فروش فعلی ({currencyLabel} / {salesUnitText})</span>
                <HelpTooltip
                  size="xs"
                  title="قیمت ویترین فعلی"
                  description="قیمتی که الان روی اتیکت ویترین می‌فروشید. سود فعلی شما بر اساس همین قیمت حساب می‌شود."
                />
              </label>
              <input
                id="prod-selling-price"
                type="number"
                min="0"
                step={currency === 'RIAL' ? '10000' : '1000'}
                value={Math.round(selectedProduct.sellingPrice * multiplier)}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0);
                  updateField('sellingPrice', Math.round(val / multiplier));
                }}
                className="w-full h-10 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-sm font-semibold text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
              />
            </div>

            <div>
              <label
                htmlFor="prod-monthly-vol"
                className="flex items-center gap-1 text-xs font-medium text-[#4F403C] mb-1"
              >
                <span>تیراژ فروش ماهانه ({salesUnitText})</span>
                <HelpTooltip
                  size="xs"
                  title="میزان فروش ماهانه"
                  description="به‌طور میانگین در یک ماه چند کیلو گرم یا چند عدد از این شیرینی می‌فروشید. این عدد در تقسیم سربار و لیست خرید مواد اولیه مؤثر است."
                />
              </label>
              <input
                id="prod-monthly-vol"
                type="number"
                min="0"
                step="5"
                value={selectedProduct.monthlyVolume}
                onChange={(e) =>
                  updateField('monthlyVolume', Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full h-10 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-sm font-semibold text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
              />
            </div>
          </div>
        </section>

        {/* Step 1: Ingredients Formula */}
        <section className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#F0EAE2]">
            <div className="flex items-center gap-2">
              <Utensils className="h-4 w-4 text-[#C86D2D]" />
              <h3 className="text-sm font-bold text-[#2A1F1D]">
                گام ۱: فرمول مواد اولیه (برای یک بچ / دیگ)
              </h3>
              <HelpTooltip
                size="xs"
                title="فرمول مواد اولیه یک بچ"
                description="مقدار مواد اولیه‌ای که در یک پخت کامل (یک دیگ یا یک پاتیل میکسر) می‌ریزید را اینجا بنویسید. لازم نیست برای یک کیلو گرم تقسیم کنید؛ برنامه خودش روی خروجی کل تقسیم می‌کند."
              />
            </div>
            <button
              type="button"
              onClick={addRecipeIngredient}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EAE4DC] bg-[#FAF8F5] text-xs font-semibold text-[#2A1F1D] hover:bg-[#F3ECE3] whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>افزودن ماده</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {selectedProduct.ingredients.length === 0 ? (
              <p className="text-xs text-[#87756E] py-3 text-center">
                هنوز ماده اولیه‌ای به این رسپی اضافه نشده است.
              </p>
            ) : (
              selectedProduct.ingredients.map((item, idx) => {
                const ing = ingredientMap.get(item.ingredientId);
                const lineCost = ing
                  ? convertRecipeQtyToPurchaseQty(
                      item.quantity,
                      item.unit,
                      ing.purchaseUnit
                    ) * ing.pricePerUnit
                  : 0;
                return (
                  <div
                    key={`${item.ingredientId}-${idx}`}
                    className="grid grid-cols-12 gap-2 items-center pb-2.5 border-b border-[#F5F0EA] last:border-b-0 last:pb-0"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <select
                        value={item.ingredientId}
                        onChange={(e) =>
                          updateRecipeIngredient(idx, {
                            ingredientId: e.target.value,
                          })
                        }
                        aria-label={`ماده اولیه ردیف ${idx + 1}`}
                        className="w-full h-9 px-2.5 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs text-[#2A1F1D] focus:outline-none focus:border-[#C86D2D]"
                      >
                        {ingredients.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.quantity}
                        onChange={(e) =>
                          updateRecipeIngredient(idx, {
                            quantity: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        aria-label={`مقدار ماده ردیف ${idx + 1}`}
                        className="w-full h-9 px-2 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <select
                        value={item.unit}
                        onChange={(e) =>
                          updateRecipeIngredient(idx, {
                            unit: e.target.value as RecipeUnit,
                          })
                        }
                        aria-label={`واحد ماده ردیف ${idx + 1}`}
                        className="w-full h-9 px-1.5 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs text-[#2A1F1D]"
                      >
                        {(Object.keys(RECIPE_UNIT_LABELS) as RecipeUnit[]).map(
                          (u) => (
                            <option key={u} value={u}>
                              {RECIPE_UNIT_LABELS[u]}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="col-span-3 sm:col-span-2 text-left text-xs font-semibold text-[#4F403C] tabular-nums">
                      {formatCurrency(lineCost, currency, false)}
                    </div>

                    <div className="col-span-1 text-left">
                      <button
                        type="button"
                        onClick={() => removeRecipeIngredient(idx)}
                        aria-label={`حذف ماده ردیف ${idx + 1}`}
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
        </section>

        {/* Step 2: Batch Yield & Baking Shrinkage */}
        <section className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE2]">
            <Flame className="h-4 w-4 text-[#C86D2D]" />
            <h3 className="text-sm font-bold text-[#2A1F1D]">
              گام ۲: خروجی خالص بچ و افت پخت (ضایعات تولید)
            </h3>
            <HelpTooltip
              size="xs"
              title="خروجی پخت و افت فر"
              description="وقتی شیرینی در فر می‌پزد، بخشی از رطوبتش تبخیر می‌شود و کمی هم ضایعات و دورریز دارد. اینجا وزن نهایی قابل فروش و درصد افت پخت را بنویسید تا ضرر پنهان ضایعات محاسبه شود."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="batch-yield"
                className="flex items-center gap-1 text-xs font-medium text-[#4F403C] mb-1"
              >
                <span>خروجی خالص قابل‌فروش هر بچ ({salesUnitText})</span>
                <HelpTooltip
                  size="xs"
                  title="خروجی خالص هر بچ"
                  description="از مواد گام ۱ پس از پخت، دقیقاً چند کیلو گرم یا چند عدد شیرینی سالم و قابل فروش تحویل می‌گیرید؟"
                />
              </label>
              <input
                id="batch-yield"
                type="number"
                min="0.5"
                step="0.5"
                value={selectedProduct.batchYield}
                onChange={(e) =>
                  updateField(
                    'batchYield',
                    Math.max(0.5, Number(e.target.value) || 1)
                  )
                }
                className="w-full h-10 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-sm font-semibold text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
              />
            </div>

            <div>
              <label
                htmlFor="wastage-percent"
                className="flex items-center gap-1 text-xs font-medium text-[#4F403C] mb-1"
              >
                <span>درصد افت پخت و پرت مواد (٪)</span>
                <HelpTooltip
                  size="xs"
                  title="درصد افت پخت و پرت"
                  description="در شیرینی‌پزی معمولاً ۵٪ تا ۱۵٪ از وزن مواد هنگام پخت، تمیز کردن ظرف یا برش هدر می‌رود. اگر ۱۰٪ وارد کنید، هزینه واقعی مواد شما به نسبت ۱/(۱-۰٫۱) اصلاح می‌شود."
                />
              </label>
              <input
                id="wastage-percent"
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={selectedProduct.wastagePercent}
                onChange={(e) =>
                  updateField(
                    'wastagePercent',
                    Math.min(50, Math.max(0, Number(e.target.value) || 0))
                  )
                }
                className="w-full h-10 px-3 rounded-xl border border-[#DDD4C8] bg-[#FAF8F5] text-sm font-semibold text-[#2A1F1D] tabular-nums focus:outline-none focus:border-[#C86D2D]"
              />
            </div>
          </div>

          <div className="text-xs text-[#6B5B56] bg-[#FAF8F5] rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 tabular-nums">
            <span>
              هزینه مواد خام هر بچ:{' '}
              <strong className="text-[#2A1F1D]">
                {formatCurrency(selectedBreakdown.batchRawMaterialCost, currency)}
              </strong>
            </span>
            <span>
              پس از اعمال {formatPercent(selectedProduct.wastagePercent, 1)} افت پخت:{' '}
              <strong className="text-[#C86D2D]">
                {formatCurrency(
                  selectedBreakdown.batchAdjustedMaterialCost,
                  currency
                )}
              </strong>
            </span>
          </div>
        </section>

        {/* Step 3: Packaging Items */}
        <section className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#F0EAE2]">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-[#C86D2D]" />
              <h3 className="text-sm font-bold text-[#2A1F1D]">
                گام ۳: اقلام بسته‌بندی (به ازای هر {salesUnitText})
              </h3>
              <HelpTooltip
                size="xs"
                title="هزینه بسته‌بندی هر واحد"
                description="جعبه شیرینی، زیرکیکی، کاغذ روغنی، سلفون و روبان که برای هر یک کیلو گرم یا یک عدد شیرینی مصرف می‌شود را اینجا بگذارید تا از قلم نیفتد."
              />
            </div>
            <button
              type="button"
              onClick={addPackagingItem}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EAE4DC] bg-[#FAF8F5] text-xs font-semibold text-[#2A1F1D] hover:bg-[#F3ECE3] whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>افزودن بسته‌بندی</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {selectedProduct.packaging.length === 0 ? (
              <p className="text-xs text-[#87756E] py-2 text-center">
                قلم بسته‌بندی ثبت نشده است.
              </p>
            ) : (
              selectedProduct.packaging.map((pkg, idx) => {
                const ing = ingredientMap.get(pkg.ingredientId);
                const cost = ing
                  ? convertRecipeQtyToPurchaseQty(
                      pkg.quantityPerSalesUnit,
                      pkg.unit,
                      ing.purchaseUnit
                    ) * ing.pricePerUnit
                  : 0;
                return (
                  <div
                    key={`${pkg.ingredientId}-${idx}`}
                    className="grid grid-cols-12 gap-2 items-center"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <select
                        value={pkg.ingredientId}
                        onChange={(e) =>
                          updatePackagingItem(idx, {
                            ingredientId: e.target.value,
                          })
                        }
                        aria-label={`قلم بسته‌بندی ردیف ${idx + 1}`}
                        className="w-full h-9 px-2.5 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs text-[#2A1F1D]"
                      >
                        {ingredients.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.25"
                        value={pkg.quantityPerSalesUnit}
                        onChange={(e) =>
                          updatePackagingItem(idx, {
                            quantityPerSalesUnit: Math.max(
                              0,
                              Number(e.target.value) || 0
                            ),
                          })
                        }
                        aria-label={`تعداد بسته‌بندی ردیف ${idx + 1}`}
                        className="w-full h-9 px-2 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs tabular-nums"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <select
                        value={pkg.unit}
                        onChange={(e) =>
                          updatePackagingItem(idx, {
                            unit: e.target.value as RecipeUnit,
                          })
                        }
                        aria-label={`واحد بسته‌بندی ردیف ${idx + 1}`}
                        className="w-full h-9 px-1.5 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-xs text-[#2A1F1D]"
                      >
                        {(Object.keys(RECIPE_UNIT_LABELS) as RecipeUnit[]).map(
                          (u) => (
                            <option key={u} value={u}>
                              {RECIPE_UNIT_LABELS[u]}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <div className="col-span-3 sm:col-span-2 text-left text-xs font-semibold text-[#4F403C] tabular-nums">
                      {formatCurrency(cost, currency, false)}
                    </div>
                    <div className="col-span-1 text-left">
                      <button
                        type="button"
                        onClick={() => removePackagingItem(idx)}
                        aria-label={`حذف بسته‌بندی ردیف ${idx + 1}`}
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
        </section>

        {/* Step 4: Direct Labor (Both Minutes AND Hourly Rates Directly Editable) */}
        <section className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE2]">
            <Clock className="h-4 w-4 text-[#C86D2D]" />
            <h3 className="text-sm font-bold text-[#2A1F1D]">
              گام ۴: دستمزد و زمان کار مستقیم تولید (به ازای هر بچ)
            </h3>
            <HelpTooltip
              size="xs"
              title="دستمزد مستقیم تولید"
              description="چند دقیقه وقت استادکار و وردست برای آماده کردن یک بچ از این شیرینی صرف می‌شود؟ نرخ ساعتی هر دو را هم همینجا می‌توانید مستقیماً ویرایش کنید."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4DC] p-3">
              <div>
                <label
                  htmlFor="master-minutes"
                  className="block text-xs font-semibold text-[#2A1F1D] mb-1"
                >
                  زمان استادکار قناد (دقیقه / بچ)
                </label>
                <input
                  id="master-minutes"
                  type="number"
                  min="0"
                  step="5"
                  value={selectedProduct.masterMinutesPerBatch}
                  onChange={(e) =>
                    updateField(
                      'masterMinutesPerBatch',
                      Math.max(0, Number(e.target.value) || 0)
                    )
                  }
                  className="w-full h-9 px-3 rounded-lg border border-[#DDD4C8] bg-white text-sm font-semibold tabular-nums focus:outline-none focus:border-[#C86D2D]"
                />
              </div>
              <div>
                <label
                  htmlFor="recipe-master-rate"
                  className="block text-[11px] font-medium text-[#6B5B56] mb-1"
                >
                  نرخ ساعتی استادکار ({currencyLabel})
                </label>
                <input
                  id="recipe-master-rate"
                  type="number"
                  min="0"
                  step={currency === 'RIAL' ? '50000' : '5000'}
                  value={Math.round(settings.masterHourlyRate * multiplier)}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    onUpdateSettings({
                      masterHourlyRate: Math.round(val / multiplier),
                    });
                  }}
                  className="w-full h-8 px-2.5 rounded-lg border border-[#DDD4C8] bg-white text-xs font-semibold tabular-nums focus:outline-none focus:border-[#C86D2D]"
                />
              </div>
            </div>

            <div className="space-y-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4DC] p-3">
              <div>
                <label
                  htmlFor="assistant-minutes"
                  className="block text-xs font-semibold text-[#2A1F1D] mb-1"
                >
                  زمان وردست و کمک‌قناد (دقیقه / بچ)
                </label>
                <input
                  id="assistant-minutes"
                  type="number"
                  min="0"
                  step="5"
                  value={selectedProduct.assistantMinutesPerBatch}
                  onChange={(e) =>
                    updateField(
                      'assistantMinutesPerBatch',
                      Math.max(0, Number(e.target.value) || 0)
                    )
                  }
                  className="w-full h-9 px-3 rounded-lg border border-[#DDD4C8] bg-white text-sm font-semibold tabular-nums focus:outline-none focus:border-[#C86D2D]"
                />
              </div>
              <div>
                <label
                  htmlFor="recipe-assistant-rate"
                  className="block text-[11px] font-medium text-[#6B5B56] mb-1"
                >
                  نرخ ساعتی وردست ({currencyLabel})
                </label>
                <input
                  id="recipe-assistant-rate"
                  type="number"
                  min="0"
                  step={currency === 'RIAL' ? '50000' : '5000'}
                  value={Math.round(settings.assistantHourlyRate * multiplier)}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    onUpdateSettings({
                      assistantHourlyRate: Math.round(val / multiplier),
                    });
                  }}
                  className="w-full h-8 px-2.5 rounded-lg border border-[#DDD4C8] bg-white text-xs font-semibold tabular-nums focus:outline-none focus:border-[#C86D2D]"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Column 3 (End): Sticky Live Cost Breakdown & Final Price Simulator */}
      <aside
        aria-label="آنالیز زنده بهای تمام‌شده و شبیه‌ساز قیمت نهایی"
        className="xl:col-span-4 xl:sticky xl:top-22 space-y-5"
      >
        {/* Live Cost Breakdown Card */}
        <div className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-xs space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-[#2A1F1D]">
                  آنالیز زنده بهای تمام‌شده
                </h2>
                <HelpTooltip
                  size="xs"
                  title="بهای تمام‌شده هر واحد"
                  description="جمع دقیق تمام هزینه‌هایی که برای تولید یک کیلو گرم یا یک عدد از این شیرینی پرداخت می‌کنید (مواد، افت پخت، جعبه، دستمزد و سهم اجاره و قبوض)."
                />
              </div>
              <span className="text-xs text-[#87756E]">
                هر {salesUnitText}
              </span>
            </div>
            <p className="text-xs text-[#6B5B56] mt-0.5 truncate">
              {selectedProduct.name}
            </p>
          </div>

          {/* Cost Breakdown Line Items */}
          <div className="divide-y divide-[#F0EAE2] text-sm tabular-nums">
            <div className="py-2 flex items-center justify-between">
              <span className="text-[#6B5B56]">مواد اولیه خالص</span>
              <span className="font-medium text-[#2A1F1D]">
                {formatCurrency(
                  selectedBreakdown.rawMaterialCostPerUnit,
                  currency
                )}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-[#6B5B56]">
                هزینه افت پخت ({formatPercent(selectedProduct.wastagePercent, 1)})
              </span>
              <span className="font-medium text-[#C86D2D]">
                {formatCurrency(selectedBreakdown.wastageCostPerUnit, currency)}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-[#6B5B56]">بسته‌بندی</span>
              <span className="font-medium text-[#2A1F1D]">
                {formatCurrency(
                  selectedBreakdown.packagingCostPerUnit,
                  currency
                )}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-[#6B5B56]">دستمزد مستقیم تولید</span>
              <span className="font-medium text-[#2A1F1D]">
                {formatCurrency(
                  selectedBreakdown.directLaborCostPerUnit,
                  currency
                )}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-[#6B5B56]">سربار تولید کارگاه</span>
              <span className="font-medium text-[#2A1F1D]">
                {formatCurrency(
                  selectedBreakdown.overheadCostPerUnit,
                  currency
                )}
              </span>
            </div>

            <div className="pt-3 pb-1 flex items-center justify-between font-extrabold text-base">
              <span className="text-[#2A1F1D]">بهای تمام‌شده کل</span>
              <span className="text-[#2A1F1D]">
                {formatCurrency(selectedBreakdown.totalUnitCost, currency)}
              </span>
            </div>
          </div>

          {/* Current Profit & Margin Summary */}
          <div className="rounded-xl bg-[#FAF8F5] border border-[#EAE4DC] p-3.5 space-y-1.5 tabular-nums">
            <div className="flex items-center justify-between text-xs text-[#6B5B56]">
              <span>قیمت فروش فعلی ویترین</span>
              <span className="font-semibold text-[#2A1F1D]">
                {formatCurrency(selectedBreakdown.sellingPrice, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#4F403C] font-medium">سود خالص فعلی هر واحد</span>
              <span
                className={`font-extrabold ${
                  selectedBreakdown.unitProfit >= 0
                    ? 'text-[#1F7A5A]'
                    : 'text-[#C93B3B]'
                }`}
              >
                {formatCurrency(selectedBreakdown.unitProfit, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#EAE4DC]">
              <span className={`font-semibold ${marginStatus.color}`}>
                {marginStatus.label}
              </span>
              <span className={`text-base font-extrabold ${marginStatus.color}`}>
                {formatPercent(selectedBreakdown.profitMarginPercent)}
              </span>
            </div>
          </div>
        </div>

        {/* Dedicated Final Price Simulator (Before Saving Product) */}
        <section
          aria-label="شبیه‌ساز قیمت نهایی محصول"
          className="bg-white rounded-2xl border border-[#E6D5C8] p-5 shadow-xs space-y-4"
        >
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#F0EAE2]">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C86D2D]">
                <Sliders className="h-3.5 w-3.5" />
                <span>پیش‌نمایش زنده پیش از ذخیره</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <h2 className="text-base font-bold text-[#2A1F1D]">
                  شبیه‌ساز قیمت نهایی ویترین
                </h2>
                <HelpTooltip
                  size="xs"
                  title="شبیه‌ساز قیمت نهایی چیست؟"
                  description="قبل از اینکه قیمت محصول را عوض و ذخیره کنید، اینجا درصد سربار یا درصد سود دلخواهتان را دستی تست کنید تا همان لحظه ببینید قیمت پیشنهادی ویترین چقدر می‌شود. تا دکمه «ذخیره و اعمال» را نزنید، قیمت اصلی محصول تغییر نمی‌کند."
                />
              </div>
            </div>
            {simTouched && (
              <button
                type="button"
                onClick={resetSimulator}
                aria-label="بازنشانی شبیه‌ساز قیمت نهایی"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#EAE4DC] bg-[#FAF8F5] text-[11px] font-medium text-[#6B5B56] hover:text-[#2A1F1D]"
              >
                <RotateCcw className="h-3 w-3" />
                <span>بازنشانی</span>
              </button>
            )}
          </div>

          {/* Control 1: Manual Overhead % */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs gap-2">
              <label
                htmlFor="sim-overhead-input"
                className="flex items-center gap-1 font-semibold text-[#4F403C]"
              >
                <span>درصد سربار دستی (نسبت به هزینه مستقیم)</span>
                <HelpTooltip
                  size="xs"
                  title="درصد سربار دستی"
                  description="نشان می‌دهد چه درصدی بابت هزینه‌های ثابت (اجاره، گاز، برق، استهلاک) روی هزینه مواد و بسته‌بندی و دستمزد اضافه شود. مقدار پیش‌فرض، سهم واقعی همین محصول در کارگاه شماست."
                />
              </label>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  id="sim-overhead-input"
                  type="number"
                  min="0"
                  max="150"
                  step="0.5"
                  value={simOverheadPct}
                  onChange={(e) => {
                    setSimTouched(true);
                    setSimOverheadPct(
                      Math.min(150, Math.max(0, Number(e.target.value) || 0))
                    );
                  }}
                  className="w-16 h-8 px-2 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-center text-xs font-bold tabular-nums focus:outline-none focus:border-[#C86D2D]"
                />
                <span className="text-[#6B5B56] font-semibold">٪</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.min(100, simOverheadPct)}
              onChange={(e) => {
                setSimTouched(true);
                setSimOverheadPct(Number(e.target.value));
              }}
              aria-label="اسلایدر درصد سربار دستی"
              className="w-full saffron-slider cursor-pointer"
            />
            <div className="flex items-center justify-between text-[11px] text-[#87756E] tabular-nums">
              <span>
                سربار شبیه‌سازی‌شده:{' '}
                <strong className="text-[#4F403C]">
                  {formatCurrency(finalPriceSim.simulatedOverheadPerUnit, currency)}
                </strong>
              </span>
              <span>
                واقعی فعلی: {formatPercent(actualOverheadPercent, 1)}
              </span>
            </div>
          </div>

          {/* Control 2: Manual Target Margin % */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs gap-2">
              <label
                htmlFor="sim-margin-input"
                className="flex items-center gap-1 font-semibold text-[#4F403C]"
              >
                <span>درصد سود هدف (حاشیه سود خالص)</span>
                <HelpTooltip
                  size="xs"
                  title="درصد سود هدف"
                  description="مشخص کنید از قیمت نهایی فروش این شیرینی، چند درصدش باید سود خالص شما باشد (مثلاً ۳۵٪). برنامه قیمت ویترین را با فرمول دقیق حسابداری محاسبه می‌کند."
                />
              </label>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  id="sim-margin-input"
                  type="number"
                  min="5"
                  max="75"
                  step="1"
                  value={simTargetMarginPct}
                  onChange={(e) => {
                    setSimTouched(true);
                    setSimTargetMarginPct(
                      Math.min(75, Math.max(5, Number(e.target.value) || 5))
                    );
                  }}
                  className="w-16 h-8 px-2 rounded-lg border border-[#DDD4C8] bg-[#FAF8F5] text-center text-xs font-bold tabular-nums focus:outline-none focus:border-[#C86D2D]"
                />
                <span className="text-[#6B5B56] font-semibold">٪</span>
              </div>
            </div>
            <input
              type="range"
              min="5"
              max="70"
              step="1"
              value={Math.min(70, simTargetMarginPct)}
              onChange={(e) => {
                setSimTouched(true);
                setSimTargetMarginPct(Number(e.target.value));
              }}
              aria-label="اسلایدر درصد سود هدف شبیه‌ساز"
              className="w-full saffron-slider cursor-pointer"
            />
          </div>

          {/* Real-Time Showcase Price Output Box */}
          <div className="rounded-xl bg-[#EFF8F4] border border-[#C6E6D9] p-4 space-y-2.5 tabular-nums">
            <div className="flex items-center justify-between text-xs text-[#175D44]">
              <span>قیمت ویترین پیشنهادی (رندشده):</span>
              <span className="font-bold">
                هر {salesUnitText}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl font-extrabold text-[#1F7A5A]">
                {formatCurrency(finalPriceSim.roundedShowcasePrice, currency)}
              </span>
              <span
                className={`text-xs font-bold ${
                  finalPriceSim.priceDeltaFromCurrent >= 0
                    ? 'text-[#175D44]'
                    : 'text-[#C86D2D]'
                }`}
              >
                {finalPriceSim.priceDeltaFromCurrent >= 0 ? '+' : ''}
                {formatPercent(finalPriceSim.priceDeltaPercent, 1)} نسبت به فعلی
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#C6E6D9] text-[11px] text-[#175D44]">
              <div>
                بهای کل شبیه‌سازی:{' '}
                <strong className="text-[#2A1F1D]">
                  {formatCompactCurrency(
                    finalPriceSim.simulatedTotalUnitCost,
                    currency
                  )}
                </strong>
              </div>
              <div className="text-left">
                سود هر واحد:{' '}
                <strong className="text-[#1F7A5A]">
                  {formatCompactCurrency(
                    finalPriceSim.simulatedUnitProfit,
                    currency
                  )}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={applySimulatedShowcasePrice}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1F7A5A] text-white text-xs font-semibold hover:bg-[#176147] transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>ذخیره و اعمال قیمت ویترین در محصول</span>
            </button>
          </div>
        </section>
      </aside>
    </div>

    {/* Dedicated Product Analysis Section: Monthly, Quarterly & Annual Break-Even by Product Volume */}
    <DedicatedProductAnalysis
      product={selectedProduct}
      breakdown={selectedBreakdown}
      currency={currency}
      onUpdateMonthlyVolume={(newVol) => updateField('monthlyVolume', newVol)}
    />

    {/* Kitchen Daily Batch Scaler & Interactive Scale Checklist */}
    <KitchenBatchScaler
      product={selectedProduct}
      ingredients={ingredients}
      settings={settings}
      currency={currency}
    />
    </div>
  );
};
