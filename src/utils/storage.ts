import * as XLSX from 'xlsx';
import { SAMPLE_WORKSHOP_STATE } from '../data/sampleWorkshop';
import {
  CurrencyMode,
  MaterialRequirementRow,
  PURCHASE_UNIT_LABELS,
  SALES_UNIT_LABELS,
  WorkshopState,
  WorkshopSummary,
} from '../types/workshop';
import { getCurrencyLabel, getCurrencyMultiplier } from './format';

const STORAGE_KEY = 'shirin_hesab_workshop_v1';

export function loadWorkshopState(): WorkshopState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(SAMPLE_WORKSHOP_STATE);
    const parsed = JSON.parse(raw) as Partial<WorkshopState>;
    if (
      !parsed ||
      !Array.isArray(parsed.ingredients) ||
      !Array.isArray(parsed.products) ||
      !Array.isArray(parsed.overheads) ||
      !parsed.settings
    ) {
      return structuredClone(SAMPLE_WORKSHOP_STATE);
    }
    return {
      version: parsed.version ?? 1,
      settings: {
        ...SAMPLE_WORKSHOP_STATE.settings,
        ...parsed.settings,
      },
      ingredients: parsed.ingredients,
      products: parsed.products,
      overheads: parsed.overheads,
      monthlyHistory:
        Array.isArray(parsed.monthlyHistory) && parsed.monthlyHistory.length > 0
          ? parsed.monthlyHistory
          : structuredClone(SAMPLE_WORKSHOP_STATE.monthlyHistory),
    };
  } catch {
    return structuredClone(SAMPLE_WORKSHOP_STATE);
  }
}

export function saveWorkshopState(state: WorkshopState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota issues silently
  }
}

export function exportWorkshopBackupJson(state: WorkshopState): void {
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `shirin-hesab-backup-${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function validateImportedWorkshopJson(rawText: string): WorkshopState | null {
  try {
    const parsed = JSON.parse(rawText) as Partial<WorkshopState>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.ingredients) ||
      !Array.isArray(parsed.products) ||
      !Array.isArray(parsed.overheads) ||
      !parsed.settings ||
      typeof parsed.settings.masterHourlyRate !== 'number'
    ) {
      return null;
    }
    return {
      version: parsed.version ?? 1,
      settings: {
        ...SAMPLE_WORKSHOP_STATE.settings,
        ...parsed.settings,
      },
      ingredients: parsed.ingredients,
      products: parsed.products,
      overheads: parsed.overheads,
      monthlyHistory:
        Array.isArray(parsed.monthlyHistory) && parsed.monthlyHistory.length > 0
          ? parsed.monthlyHistory
          : structuredClone(SAMPLE_WORKSHOP_STATE.monthlyHistory),
    };
  } catch {
    return null;
  }
}

const QUADRANT_LABELS = {
  star: 'ستاره (سود بالا، فروش بالا)',
  plowhorse: 'پرفروش کم‌سود (نیازمند اصلاح قیمت)',
  puzzle: 'پرسود کم‌فروش (نیازمند بازاریابی)',
  dog: 'نیازمند بازنگری',
};

export function exportComprehensiveReportToExcel(
  summary: WorkshopSummary,
  mrpRows: MaterialRequirementRow[],
  currency: CurrencyMode,
  workshopName: string
): void {
  const mult = getCurrencyMultiplier(currency);
  const unitLabel = getCurrencyLabel(currency);

  const costingRows = summary.productBreakdowns.map((p) => ({
    'نام محصول': p.productName,
    'دسته‌بندی': p.category,
    'واحد فروش': SALES_UNIT_LABELS[p.salesUnit],
    'تیراژ ماهانه': p.monthlyVolume,
    [`مواد اولیه خالص (${unitLabel})`]: Math.round(p.rawMaterialCostPerUnit * mult),
    [`هزینه افت پخت و پرت (${unitLabel})`]: Math.round(p.wastageCostPerUnit * mult),
    [`هزینه بسته‌بندی (${unitLabel})`]: Math.round(p.packagingCostPerUnit * mult),
    [`دستمزد مستقیم (${unitLabel})`]: Math.round(p.directLaborCostPerUnit * mult),
    [`سربار تولید (${unitLabel})`]: Math.round(p.overheadCostPerUnit * mult),
    [`بهای تمام‌شده کل (${unitLabel})`]: Math.round(p.totalUnitCost * mult),
    [`قیمت فروش فعلی (${unitLabel})`]: Math.round(p.sellingPrice * mult),
    [`سود هر واحد (${unitLabel})`]: Math.round(p.unitProfit * mult),
    'حاشیه سود (٪)': Number(p.profitMarginPercent.toFixed(1)),
    [`قیمت پیشنهادی (${unitLabel})`]: Math.round(p.suggestedPrice * mult),
    [`سود خالص ماهانه (${unitLabel})`]: Math.round(p.monthlyProfit * mult),
    'جایگاه مهندسی منو': QUADRANT_LABELS[p.quadrant],
  }));

  const shoppingRows = mrpRows.map((row) => ({
    'نام ماده اولیه / بسته‌بندی': row.name,
    'دسته‌بندی': row.category,
    'مقدار مورد نیاز ماهانه': Number(row.totalQuantityRequired.toFixed(2)),
    'واحد خرید': PURCHASE_UNIT_LABELS[row.purchaseUnit],
    [`قیمت واحد (${unitLabel})`]: Math.round(row.unitPrice * mult),
    [`بودجه خرید ماهانه (${unitLabel})`]: Math.round(row.totalBudget * mult),
  }));

  const summarySheetRows = [
    { 'شاخص مالی کارگاه': 'نام کارگاه', 'مقدار': workshopName },
    { 'شاخص مالی کارگاه': `درآمد ماهانه پیش‌بینی‌شده (${unitLabel})`, 'مقدار': Math.round(summary.totalMonthlyRevenue * mult) },
    { 'شاخص مالی کارگاه': `بهای تمام‌شده کل ماهانه (${unitLabel})`, 'مقدار': Math.round(summary.totalMonthlyCost * mult) },
    { 'شاخص مالی کارگاه': `سود خالص ماهانه (${unitLabel})`, 'مقدار': Math.round(summary.netMonthlyProfit * mult) },
    { 'شاخص مالی کارگاه': 'حاشیه سود خالص کل (٪)', 'مقدار': Number(summary.netProfitMarginPercent.toFixed(1)) },
    { 'شاخص مالی کارگاه': `هزینه ثابت ماهانه (${unitLabel})`, 'مقدار': Math.round(summary.totalMonthlyFixedOverhead * mult) },
    {
      'شاخص مالی کارگاه': `نقطه سربه‌سر فروش (${unitLabel})`,
      'مقدار': Number.isFinite(summary.breakEvenRevenue) ? Math.round(summary.breakEvenRevenue * mult) : 0,
    },
  ];

  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };

  const wsCosting = XLSX.utils.json_to_sheet(costingRows);
  wsCosting['!views'] = [{ RTL: true }];
  wsCosting['!cols'] = [
    { wch: 24 },
    { wch: 16 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 13 },
    { wch: 18 },
    { wch: 20 },
    { wch: 28 },
  ];

  const wsShopping = XLSX.utils.json_to_sheet(shoppingRows);
  wsShopping['!views'] = [{ RTL: true }];
  wsShopping['!cols'] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
    { wch: 12 },
    { wch: 18 },
    { wch: 22 },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summarySheetRows);
  wsSummary['!views'] = [{ RTL: true }];
  wsSummary['!cols'] = [{ wch: 34 }, { wch: 26 }];

  XLSX.utils.book_append_sheet(wb, wsCosting, 'جدول بهایابی محصولات');
  XLSX.utils.book_append_sheet(wb, wsShopping, 'لیست خرید مواد اولیه');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'خلاصه مالی کارگاه');

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `shirin-hesab-report-${dateStamp}.xlsx`);
}
