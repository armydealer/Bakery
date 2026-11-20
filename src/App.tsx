import { useEffect, useMemo, useState } from 'react';
import { DashboardTab } from './components/DashboardTab';
import { LayoutShell } from './components/LayoutShell';
import { OrdersStudioTab } from './components/OrdersStudioTab';
import { PantryTab } from './components/PantryTab';
import { PlanningTab } from './components/PlanningTab';
import { RecipesTab } from './components/RecipesTab';
import { ReportsTab } from './components/ReportsTab';
import { OfflineAnalystTab } from './components/offlineAnalyst/OfflineAnalystTab';
import { SAMPLE_WORKSHOP_STATE } from './data/sampleWorkshop';
import {
  CurrencyMode,
  FixedOverheadItem,
  Ingredient,
  IngredientCategory,
  MonthlyPerformanceRecord,
  Product,
  RiskAppetite,
  TabId,
  WorkshopSettings,
  WorkshopState,
} from './types/workshop';
import {
  appendMonthlySnapshot,
  applyCategoryInflation,
  calculateMaterialRequirements,
  calculateWorkshopSummary,
  scaleWorkshopProductionVolume,
} from './utils/accounting';
import { formatNumber } from './utils/format';
import {
  exportComprehensiveReportToExcel,
  exportWorkshopBackupJson,
  loadWorkshopState,
  saveWorkshopState,
  validateImportedWorkshopJson,
} from './utils/storage';

export default function App() {
  const [state, setState] = useState<WorkshopState>(() => loadWorkshopState());
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [currency, setCurrency] = useState<CurrencyMode>('TOMAN');
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite>('balanced');
  const [selectedProductId, setSelectedProductId] = useState<string>(
    () => loadWorkshopState().products[0]?.id ?? ''
  );
  const [statusBanner, setStatusBanner] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    saveWorkshopState(state);
  }, [state]);

  useEffect(() => {
    if (!statusBanner) return;
    const timer = window.setTimeout(() => setStatusBanner(null), 6000);
    return () => window.clearTimeout(timer);
  }, [statusBanner]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setStatusBanner(null);
  };

  const summary = useMemo(() => calculateWorkshopSummary(state), [state]);
  const mrpRows = useMemo(() => calculateMaterialRequirements(state), [state]);

  const alertCount = useMemo(
    () =>
      summary.productBreakdowns.filter(
        (p) => p.profitMarginPercent < 15 || p.unitProfit < 0
      ).length,
    [summary]
  );

  const showBanner = (tone: 'success' | 'error', message: string) => {
    setStatusBanner({ tone, message });
  };

  // Pantry handlers
  const handleAddIngredient = (ing: Omit<Ingredient, 'id'>) => {
    const id = `ing-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      ingredients: [{ ...ing, id }, ...prev.ingredients],
    }));
    showBanner('success', `«${ing.name}» با موفقیت به بانک مواد اولیه اضافه شد.`);
  };

  const handleUpdateIngredient = (updated: Ingredient) => {
    setState((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((i) =>
        i.id === updated.id ? updated : i
      ),
    }));
  };

  const handleUpdateIngredientPrice = (
    ingredientId: string,
    newPricePerUnitToman: number
  ) => {
    setState((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((i) =>
        i.id === ingredientId
          ? { ...i, pricePerUnit: Math.max(0, newPricePerUnitToman) }
          : i
      ),
    }));
  };

  const handleDeleteIngredient = (id: string) => {
    const target = state.ingredients.find((i) => i.id === id);
    setState((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((i) => i.id !== id),
      products: prev.products.map((p) => ({
        ...p,
        ingredients: p.ingredients.filter((item) => item.ingredientId !== id),
        packaging: p.packaging.filter((item) => item.ingredientId !== id),
      })),
    }));
    if (target) {
      showBanner('success', `«${target.name}» از بانک مواد اولیه حذف شد.`);
    }
  };

  const handleApplyCategoryInflation = (
    category: IngredientCategory | 'ALL',
    percentChange: number
  ) => {
    setState((prev) => ({
      ...prev,
      ingredients: applyCategoryInflation(
        prev.ingredients,
        category,
        percentChange
      ),
    }));
    const label = category === 'ALL' ? 'تمام مواد اولیه' : `گروه «${category}»`;
    const sign = percentChange > 0 ? '+' : '';
    showBanner(
      'success',
      `تغییر قیمت ${sign}${formatNumber(percentChange)}٪ روی ${label} اعمال و بهای تمام‌شده تمام محصولات بازمحاسبه شد.`
    );
  };

  // Product handlers
  const handleUpdateProduct = (updated: Product) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === updated.id ? updated : p)),
    }));
  };

  const handleUpdateProductQuick = (
    productId: string,
    patch: { sellingPrice?: number; monthlyVolume?: number }
  ) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === productId ? { ...p, ...patch } : p
      ),
    }));
  };

  const handleAddProduct = () => {
    const id = `prod-${Date.now()}`;
    const defaultIng = state.ingredients[0];
    const defaultPkg =
      state.ingredients.find((i) => i.category === 'بسته‌بندی') ??
      state.ingredients[0];

    const newProduct: Product = {
      id,
      name: 'شیرینی جدید کارگاه',
      category: 'شیرینی خشک',
      salesUnit: 'kg',
      sellingPrice: 480_000,
      monthlyVolume: 60,
      batchYield: 10,
      wastagePercent: 8,
      ingredients: defaultIng
        ? [{ ingredientId: defaultIng.id, quantity: 3000, unit: 'g' }]
        : [],
      packaging: defaultPkg
        ? [
            {
              ingredientId: defaultPkg.id,
              quantityPerSalesUnit: 1,
              unit: defaultPkg.purchaseUnit,
            },
          ]
        : [],
      masterMinutesPerBatch: 60,
      assistantMinutesPerBatch: 60,
      targetMarginPercent: 32,
    };

    setState((prev) => ({
      ...prev,
      products: [...prev.products, newProduct],
    }));
    setSelectedProductId(id);
    showBanner('success', 'محصول جدید اضافه شد؛ اکنون می‌توانید فرمول آن را تکمیل کنید.');
  };

  const handleDeleteProduct = (id: string) => {
    if (state.products.length <= 1) return;
    const remaining = state.products.filter((p) => p.id !== id);
    setState((prev) => ({
      ...prev,
      products: remaining,
    }));
    if (selectedProductId === id && remaining[0]) {
      setSelectedProductId(remaining[0].id);
    }
    showBanner('success', 'محصول انتخاب‌شده حذف شد.');
  };

  // Planning & Overhead handlers
  const handleUpdateSettings = (patch: Partial<WorkshopSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  };

  const handleAddOverhead = (item: Omit<FixedOverheadItem, 'id'>) => {
    const id = `ovh-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      overheads: [...prev.overheads, { ...item, id }],
    }));
    showBanner('success', `هزینه ثابت «${item.title}» ثبت شد.`);
  };

  const handleUpdateOverhead = (updated: FixedOverheadItem) => {
    setState((prev) => ({
      ...prev,
      overheads: prev.overheads.map((o) => (o.id === updated.id ? updated : o)),
    }));
  };

  const handleDeleteOverhead = (id: string) => {
    setState((prev) => ({
      ...prev,
      overheads: prev.overheads.filter((o) => o.id !== id),
    }));
  };

  const handleApplySimulatedPriceIncrease = (percent: number) => {
    const factor = 1 + percent / 100;
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => ({
        ...p,
        sellingPrice: Math.ceil((p.sellingPrice * factor) / 1000) * 1000,
      })),
    }));
    showBanner(
      'success',
      `افزایش قیمت فروش ${formatNumber(percent)}٪ روی تمام محصولات کارگاه اعمال شد.`
    );
  };

  const handleApplyVolumeScale = (scalePercent: number) => {
    setState((prev) => scaleWorkshopProductionVolume(prev, scalePercent));
    showBanner(
      'success',
      `تیراژ تولید ماهانه تمام محصولات بر اساس ${formatNumber(scalePercent)}٪ ظرفیت اسمی به‌روزرسانی شد.`
    );
  };

  // Monthly Performance History handlers
  const handleUpdateHistoryRecord = (updated: MonthlyPerformanceRecord) => {
    setState((prev) => ({
      ...prev,
      monthlyHistory: prev.monthlyHistory.map((item) =>
        item.id === updated.id ? updated : item
      ),
    }));
  };

  const handleRecordNewMonthSnapshot = () => {
    setState((prev) => ({
      ...prev,
      monthlyHistory: appendMonthlySnapshot(prev.monthlyHistory, summary),
    }));
    showBanner(
      'success',
      'اسنپ‌شات عملکرد ماه جاری با موفقیت در سوابق ۶ ماهه مرورگر ثبت شد.'
    );
  };

  // Backup & Export handlers
  const handleExportJson = () => {
    exportWorkshopBackupJson(state);
    showBanner('success', 'فایل پشتیبان JSON با موفقیت دانلود شد.');
  };

  const handleImportJson = (rawText: string) => {
    const validated = validateImportedWorkshopJson(rawText);
    if (!validated) {
      showBanner(
        'error',
        'ساختار فایل پشتیبان معتبر نیست. لطفاً فایل JSON خروجی‌گرفته‌شده از شیرین‌حساب را انتخاب کنید.'
      );
      return;
    }
    setState(validated);
    if (validated.products[0]) {
      setSelectedProductId(validated.products[0].id);
    }
    showBanner('success', 'اطلاعات کارگاه با موفقیت از فایل پشتیبان بازیابی شد.');
  };

  const handleResetSample = () => {
    const fresh = structuredClone(SAMPLE_WORKSHOP_STATE);
    setState(fresh);
    setSelectedProductId(fresh.products[0]?.id ?? '');
    showBanner('success', 'داده‌های نمونه کارگاه قنادی با موفقیت بازنشانی شد.');
  };

  const handleExportExcel = () => {
    exportComprehensiveReportToExcel(
      summary,
      mrpRows,
      currency,
      state.settings.workshopName
    );
    showBanner(
      'success',
      'فایل اکسل (.xlsx) شامل جدول بهایابی کامل و لیست خرید مواد اولیه آماده و دانلود شد.'
    );
  };

  const handleInspectProductFromDashboard = (productId: string) => {
    setSelectedProductId(productId);
    setActiveTab('recipes');
  };

  const handleNavigateFix = (tab: TabId, productId?: string) => {
    if (productId) {
      setSelectedProductId(productId);
    }
    setActiveTab(tab);
    setStatusBanner(null);
  };

  return (
    <LayoutShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      currency={currency}
      onCurrencyChange={setCurrency}
      privacyMode={privacyMode}
      onTogglePrivacyMode={() => setPrivacyMode((prev) => !prev)}
      workshopName={state.settings.workshopName}
      onUpdateWorkshopName={(name) =>
        handleUpdateSettings({ workshopName: name })
      }
      alertCount={alertCount}
      onExportJson={handleExportJson}
      onImportJson={handleImportJson}
      onResetSample={handleResetSample}
      statusBanner={statusBanner}
      onDismissBanner={() => setStatusBanner(null)}
    >
      {activeTab === 'dashboard' && (
        <DashboardTab
          summary={summary}
          monthlyHistory={state.monthlyHistory}
          currency={currency}
          onInspectProduct={handleInspectProductFromDashboard}
          onQuickUpdateProductPrice={(productId, sellingPrice) =>
            handleUpdateProductQuick(productId, { sellingPrice })
          }
          onNavigateTab={(tab) => handleTabChange(tab)}
          onUpdateHistoryRecord={handleUpdateHistoryRecord}
          onRecordNewMonthSnapshot={handleRecordNewMonthSnapshot}
        />
      )}

      {activeTab === 'pantry' && (
        <PantryTab
          state={state}
          summary={summary}
          ingredients={state.ingredients}
          currency={currency}
          onAddIngredient={handleAddIngredient}
          onUpdateIngredient={handleUpdateIngredient}
          onDeleteIngredient={handleDeleteIngredient}
          onApplyCategoryInflation={handleApplyCategoryInflation}
          onInspectProduct={handleInspectProductFromDashboard}
        />
      )}

      {activeTab === 'recipes' && (
        <RecipesTab
          products={state.products}
          breakdowns={summary.productBreakdowns}
          ingredients={state.ingredients}
          settings={state.settings}
          currency={currency}
          selectedProductId={selectedProductId}
          onSelectProduct={setSelectedProductId}
          onUpdateProduct={handleUpdateProduct}
          onUpdateSettings={handleUpdateSettings}
          onAddProduct={handleAddProduct}
          onDeleteProduct={handleDeleteProduct}
        />
      )}

      {activeTab === 'planning' && (
        <PlanningTab
          state={state}
          summary={summary}
          mrpRows={mrpRows}
          currency={currency}
          onUpdateSettings={handleUpdateSettings}
          onAddOverhead={handleAddOverhead}
          onUpdateOverhead={handleUpdateOverhead}
          onDeleteOverhead={handleDeleteOverhead}
          onUpdateIngredientPrice={handleUpdateIngredientPrice}
          onApplySimulatedPriceIncrease={handleApplySimulatedPriceIncrease}
          onApplyVolumeScale={handleApplyVolumeScale}
        />
      )}

      {activeTab === 'orders' && (
        <OrdersStudioTab
          state={state}
          summary={summary}
          currency={currency}
        />
      )}

      {activeTab === 'offline-analyst' && (
        <OfflineAnalystTab
          state={state}
          summary={summary}
          currency={currency}
          riskAppetite={riskAppetite}
          onChangeRiskAppetite={setRiskAppetite}
          onUpdateSettings={handleUpdateSettings}
          onNavigateFix={handleNavigateFix}
        />
      )}

      {activeTab === 'reports' && (
        <ReportsTab
          summary={summary}
          mrpRows={mrpRows}
          currency={currency}
          workshopName={state.settings.workshopName}
          onUpdateProductQuick={handleUpdateProductQuick}
          onExportExcel={handleExportExcel}
        />
      )}
    </LayoutShell>
  );
}
