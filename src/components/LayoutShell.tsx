import React, { useRef, useState } from 'react';
import {
  BarChart3,
  BookOpenCheck,
  Calculator,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Gift,
  LayoutDashboard,
  Menu,
  Package,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react';
import { CurrencyMode, TabId } from '../types/workshop';
import { HelpTooltip } from './HelpTooltip';

interface LayoutShellProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  currency: CurrencyMode;
  onCurrencyChange: (currency: CurrencyMode) => void;
  privacyMode: boolean;
  onTogglePrivacyMode: () => void;
  workshopName: string;
  onUpdateWorkshopName: (name: string) => void;
  alertCount: number;
  onExportJson: () => void;
  onImportJson: (fileContent: string) => void;
  onResetSample: () => void;
  statusBanner: { tone: 'success' | 'error'; message: string } | null;
  onDismissBanner: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  id: TabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'dashboard',
    label: 'داشبورد مدیریتی',
    shortLabel: 'داشبورد',
    icon: LayoutDashboard,
  },
  {
    id: 'pantry',
    label: 'بانک مواد اولیه و بسته‌بندی',
    shortLabel: 'مواد اولیه',
    icon: Package,
  },
  {
    id: 'recipes',
    label: 'فرمولاسیون و بهایابی',
    shortLabel: 'فرمولاسیون',
    icon: Calculator,
  },
  {
    id: 'planning',
    label: 'برنامه‌ریزی و شبیه‌ساز تورم',
    shortLabel: 'برنامه‌ریزی',
    icon: SlidersHorizontal,
  },
  {
    id: 'orders',
    label: 'سفارش‌ساز و پکیج هدیه',
    shortLabel: 'پکیج هدیه',
    icon: Gift,
  },
  {
    id: 'offline-analyst',
    label: 'تحلیلگر آفلاین',
    shortLabel: 'تحلیلگر آفلاین',
    icon: ShieldCheck,
  },
  {
    id: 'reports',
    label: 'گزارش‌های تحلیلی',
    shortLabel: 'گزارش‌ها',
    icon: BarChart3,
  },
];

export const LayoutShell: React.FC<LayoutShellProps> = ({
  activeTab,
  onTabChange,
  currency,
  onCurrencyChange,
  privacyMode,
  onTogglePrivacyMode,
  workshopName,
  onUpdateWorkshopName,
  alertCount,
  onExportJson,
  onImportJson,
  onResetSample,
  statusBanner,
  onDismissBanner,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeNav = NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportJson(reader.result);
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#FFFFFF] border-l border-[#EAE4DC]">
      <div>
        {/* Brand Block */}
        <div className="px-6 py-6 border-b border-[#EAE4DC]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C86D2D] text-white shadow-xs">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-extrabold tracking-tight text-[#2A1F1D] truncate">
                شیرین‌حساب
              </div>
              <div className="text-xs text-[#6B5B56] truncate">
                بهایابی صنعتی قنادی
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav aria-label="منوی اصلی سامانه" className="px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#FAF3EC] text-[#C86D2D] font-semibold'
                    : 'text-[#4F403C] hover:bg-[#FAF8F5] hover:text-[#2A1F1D]'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-[#C86D2D]' : 'text-[#87756E]'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'dashboard' && alertCount > 0 && (
                  <span
                    className="text-xs font-semibold text-[#C93B3B] tabular-nums shrink-0"
                    title="تعداد محصولات دارای هشدار حاشیه سود"
                  >
                    {alertCount.toLocaleString('fa-IR')} هشدار
                  </span>
                )}
                {item.id === 'offline-analyst' && (
                  <span className="px-1.5 py-0.5 rounded-md bg-[#EFF8F4] border border-[#C6E6D9] text-[#175D44] text-[10px] font-bold shrink-0">
                    ۱۰۰٪ آفلاین و آنی
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Data Persistence & Backup Section */}
      <div className="p-4 border-t border-[#EAE4DC] bg-[#FCFAF7] space-y-2">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-xs font-semibold text-[#6B5B56]">
            مدیریت داده‌ها و پشتیبان‌گیری
          </span>
          <HelpTooltip
            size="xs"
            title="ذخیره و پشتیبان‌گیری اطلاعات"
            description="تمام تغییرات شما به‌صورت خودکار در مرورگر ذخیره می‌شود. برای اطمینان بیشتر یا انتقال به گوشی و کامپیوتر دیگر، می‌توانید فایل پشتیبان JSON دانلود کنید و هر زمان خواستید بازیابی نمایید."
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
          aria-label="انتخاب فایل پشتیبان JSON"
        />

        <button
          type="button"
          onClick={onExportJson}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[#EAE4DC] bg-white text-xs font-medium text-[#2A1F1D] hover:bg-[#FAF8F5] transition-colors whitespace-nowrap"
        >
          <Download className="h-3.5 w-3.5 text-[#1F7A5A] shrink-0" />
          <span>خروجی فایل پشتیبان JSON</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[#EAE4DC] bg-white text-xs font-medium text-[#2A1F1D] hover:bg-[#FAF8F5] transition-colors whitespace-nowrap"
        >
          <Upload className="h-3.5 w-3.5 text-[#C86D2D] shrink-0" />
          <span>بازیابی اطلاعات</span>
        </button>

        {!confirmResetOpen ? (
          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-transparent text-xs font-medium text-[#6B5B56] hover:text-[#C93B3B] hover:bg-[#FDF2F2] transition-colors whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>بازنشانی داده‌های نمونه</span>
          </button>
        ) : (
          <div className="p-2.5 rounded-lg border border-[#F0C8C8] bg-[#FFF8F8] space-y-2">
            <p className="text-xs text-[#7D2424] leading-relaxed">
              اطلاعات فعلی به کارگاه نمونه بازگردد؟
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetSample();
                  setConfirmResetOpen(false);
                  setMobileMenuOpen(false);
                }}
                className="flex-1 py-1.5 px-2 rounded-md bg-[#C93B3B] text-white text-xs font-semibold hover:bg-[#B02E2E] transition-colors"
              >
                بله، بازنشانی
              </button>
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="flex-1 py-1.5 px-2 rounded-md border border-[#EAE4DC] bg-white text-[#2A1F1D] text-xs font-medium hover:bg-[#FAF8F5]"
              >
                انصراف
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-screen flex bg-[#FAF8F5] text-[#2A1F1D] ${
        privacyMode ? 'privacy-mode-active' : ''
      }`}
    >
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-[276px] shrink-0 sticky top-0 h-screen no-print">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden no-print"
          role="dialog"
          aria-modal="true"
          aria-label="منوی ناوبری موبایل"
        >
          <div
            className="fixed inset-0 bg-[#2A1F1D]/40 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-[280px] max-w-[85vw] z-10 shadow-xl">
            <div className="relative h-full">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="بستن منو"
                className="absolute top-5 left-4 z-20 p-2 rounded-lg text-[#6B5B56] hover:bg-[#FAF8F5]"
              >
                <X className="h-5 w-5" />
              </button>
              {sidebarContent}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 print-full-width">
        {/* Clean Single-Row Top Header */}
        <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-sm border-b border-[#EAE4DC] no-print">
          <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            {/* Start Zone: Mobile menu toggle + Active section title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="باز کردن منوی ناوبری"
                className="lg:hidden p-2 -mr-2 rounded-lg text-[#2A1F1D] hover:bg-[#FAF8F5]"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 min-w-0 text-sm">
                <div className="hidden sm:flex items-center gap-1 min-w-0">
                  <input
                    type="text"
                    value={workshopName}
                    onChange={(e) => onUpdateWorkshopName(e.target.value)}
                    aria-label="ویرایش نام کارگاه قنادی"
                    title="برای تغییر نام کارگاه کلیک کنید"
                    className="w-[195px] bg-transparent text-[#6B5B56] hover:bg-[#FAF8F5] focus:bg-[#FAF8F5] focus:text-[#2A1F1D] border border-transparent hover:border-[#EAE4DC] focus:border-[#C86D2D] rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none transition-colors truncate"
                  />
                  <HelpTooltip
                    size="xs"
                    title="نام کارگاه شما"
                    description="روی این کادر کلیک کنید و نام کارگاه یا قنادی خود را بنویسید. این نام در بالای صفحه، فایل اکسل و گزارش‌های چاپی PDF نمایش داده می‌شود."
                  />
                </div>
                <span className="hidden sm:inline text-[#D5C8BA]" aria-hidden="true">
                  /
                </span>
                <h1 className="text-base sm:text-lg font-bold text-[#2A1F1D] truncate">
                  {activeNav.label}
                </h1>
              </div>
            </div>

            {/* End Zone: Privacy Mode + Currency Switcher + Quick Report link */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onTogglePrivacyMode}
                aria-pressed={privacyMode}
                title="تار کردن مبالغ مالی حساس روی صفحه (برای نمایش به کارمندان یا مهمان)"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap ${
                  privacyMode
                    ? 'bg-[#2A1F1D] border-[#2A1F1D] text-white'
                    : 'bg-[#FAF8F5] border-[#EAE4DC] text-[#4F403C] hover:text-[#2A1F1D]'
                }`}
              >
                {privacyMode ? (
                  <EyeOff className="h-3.5 w-3.5 text-[#E6A36D]" />
                ) : (
                  <Eye className="h-3.5 w-3.5 text-[#6B5B56]" />
                )}
                <span className="hidden md:inline">حالت حریم خصوصی</span>
              </button>

              <HelpTooltip
                size="xs"
                title="واحد پول (تومان یا ریال)"
                description="با این کلید می‌توانید تمام قیمت‌ها و نمودارها را به تومان یا ریال ببینید. ارقام پایه به تومان ذخیره می‌شوند و در حالت ریال به‌طور خودکار ۱۰ برابر نمایش داده می‌شوند."
              />
              <div
                role="group"
                aria-label="انتخاب واحد پول نمایش"
                className="inline-flex items-center p-1 rounded-xl bg-[#F4EFE8] border border-[#EAE4DC]"
              >
                <button
                  type="button"
                  onClick={() => onCurrencyChange('TOMAN')}
                  aria-pressed={currency === 'TOMAN'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    currency === 'TOMAN'
                      ? 'bg-[#FFFFFF] text-[#C86D2D] shadow-xs'
                      : 'text-[#6B5B56] hover:text-[#2A1F1D]'
                  }`}
                >
                  تومان
                </button>
                <button
                  type="button"
                  onClick={() => onCurrencyChange('RIAL')}
                  aria-pressed={currency === 'RIAL'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    currency === 'RIAL'
                      ? 'bg-[#FFFFFF] text-[#C86D2D] shadow-xs'
                      : 'text-[#6B5B56] hover:text-[#2A1F1D]'
                  }`}
                >
                  ریال
                </button>
              </div>

              {activeTab !== 'reports' && (
                <button
                  type="button"
                  onClick={() => onTabChange('reports')}
                  className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#C86D2D] text-white text-xs font-semibold hover:bg-[#B25D22] transition-colors whitespace-nowrap shrink-0"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>گزارش تحلیلی</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Feedback Banner */}
        {statusBanner && (
          <div className="max-w-[1320px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 no-print">
            <div
              role="status"
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${
                statusBanner.tone === 'success'
                  ? 'bg-[#EFF8F4] border-[#C6E6D9] text-[#175D44]'
                  : 'bg-[#FDF2F2] border-[#F0C8C8] text-[#9E2A2A]'
              }`}
            >
              <span>{statusBanner.message}</span>
              <button
                type="button"
                onClick={onDismissBanner}
                aria-label="بستن پیام"
                className="p-1 rounded-md hover:bg-black/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print-full-width">
          {children}
        </main>
      </div>
    </div>
  );
};
