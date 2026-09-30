import React from 'react';
import {
  ShieldCheck,
  Zap,
  Globe,
  Bell,
  User,
  LogOut,
  Building2,
  Users,
  CreditCard,
  Lock,
  Sun,
  Moon,
} from 'lucide-react';
import { CurrencyCode, UserAccount, UserRole } from '../types';
import { GHANA_CURRENCIES } from '../data/telecomCatalog';

interface HeaderProps {
  currentTab: 'portal' | 'agent' | 'admin';
  setCurrentTab: (tab: 'portal' | 'agent' | 'admin') => void;
  currentUser: UserAccount | null;
  selectedCurrency: CurrencyCode;
  setSelectedCurrency: (c: CurrencyCode) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  notificationCount: number;
  onToggleNotifications: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  selectedCurrency,
  setSelectedCurrency,
  onOpenAuth,
  onLogout,
  notificationCount,
  onToggleNotifications,
  theme,
  onToggleTheme,
}) => {
  return (
    <header id="main-header" className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      {/* Top utility bar */}
      <div className="bg-slate-950/80 px-4 py-1.5 text-xs border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Ghana Networks Status */}
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Ghana Telecom Grid
            </span>
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> MTN: 99.9%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Telecel: 99.8%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> AirtelTigo: 99.7%
              </span>
            </div>
          </div>

          {/* Compliance & Security Status */}
          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> SOC2 & GDPR Compliant
            </span>
            <span className="hidden md:inline text-slate-500">|</span>
            <span className="hidden md:flex items-center gap-1 text-slate-300">
              <Lock className="w-3 h-3 text-sky-400" /> AES-256-GCM Encrypted
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-3.5 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div
          id="brand-logo-btn"
          onClick={() => setCurrentTab('portal')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-rose-500 to-emerald-500 p-0.5 shadow-lg shadow-amber-500/10">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-white font-['Outfit',sans-serif]">
                Ghana Telecom
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-amber-400/20 text-amber-300 rounded border border-amber-400/30">
                PROD
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              MTN • Telecel • AirtelTigo Airtime & Data
            </p>
          </div>
        </div>

        {/* View Nav Tabs */}
        <nav className="hidden md:flex items-center p-1 bg-slate-800/80 rounded-xl border border-slate-700/60">
          <button
            id="nav-topup-desk"
            onClick={() => setCurrentTab('portal')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              currentTab === 'portal'
                ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Top-Up Desk
          </button>

          <button
            id="nav-agent-portal"
            onClick={() => setCurrentTab('agent')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              currentTab === 'agent'
                ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Sub-Agent Portal
            {currentUser?.role === 'AGENT' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          {/* Admin Dashboard: Strictly protected & hidden from vendors, merchants, and customers */}
          {currentUser?.role === 'ADMIN' && (
            <button
              id="nav-admin-enterprise"
              onClick={() => setCurrentTab('admin')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                currentTab === 'admin'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Admin Dashboard
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Admin Active"></span>
            </button>
          )}
        </nav>

        {/* Actions (Currency, Notifications, User) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Multi-Currency Dropdown */}
          <div className="relative flex items-center bg-slate-800 rounded-lg px-2 py-1 border border-slate-700">
            <Globe className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
            <select
              id="currency-selector"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
              className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer pr-1"
              aria-label="Select Currency"
            >
              {Object.values(GHANA_CURRENCIES).map((curr) => (
                <option key={curr.code} value={curr.code} className="bg-slate-900 text-white">
                  {curr.symbol} {curr.code}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Toggle (Dark / Light) */}
          <button
            id="theme-toggle-btn"
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-300" />
            )}
          </button>

          {/* Activity Alerts Button */}
          <button
            id="notifications-bell-btn"
            onClick={onToggleNotifications}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors relative border border-slate-700"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </button>

          {/* User Account / 2FA Badge */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-200 flex items-center justify-end gap-1">
                  {currentUser.fullName}
                  {currentUser.twoFactorEnabled && (
                    <span title="2FA Verified" className="text-emerald-400">
                      <ShieldCheck className="w-3 h-3 inline" />
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-amber-400 font-semibold tracking-wide uppercase">
                  {currentUser.role} {currentUser.agentCode ? `(${currentUser.agentCode})` : ''}
                </span>
              </div>
              <button
                id="header-logout-btn"
                onClick={onLogout}
                title="Sign Out"
                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 transition-colors border border-slate-700"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="header-signin-btn"
              onClick={onOpenAuth}
              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In / 2FA</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile navigation tab strip */}
      <div className="md:hidden flex border-t border-slate-800 bg-slate-950/90 px-2 py-1.5 justify-around">
        <button
          id="mobile-nav-topup"
          onClick={() => setCurrentTab('portal')}
          className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 ${
            currentTab === 'portal' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
          }`}
        >
          <CreditCard className="w-3 h-3" />
          Top-Up
        </button>
        <button
          id="mobile-nav-agent"
          onClick={() => setCurrentTab('agent')}
          className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 ${
            currentTab === 'agent' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
          }`}
        >
          <Users className="w-3 h-3" />
          Sub-Agent
        </button>
        {currentUser?.role === 'ADMIN' && (
          <button
            id="mobile-nav-admin"
            onClick={() => setCurrentTab('admin')}
            className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 ${
              currentTab === 'admin' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            <Building2 className="w-3 h-3" />
            Admin
          </button>
        )}
      </div>
    </header>
  );
};
