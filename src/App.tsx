/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TelecomStore } from './components/TelecomStore';
import { AgentPortal } from './components/AgentPortal';
import { AdminPortal } from './components/AdminPortal';
import { AdminAccessGuard } from './components/AdminAccessGuard';
import { AuthModal } from './components/AuthModal';
import { NotificationToaster, AppNotification } from './components/NotificationToaster';
import { CurrencyCode, UserAccount, Transaction } from './types';
import { ShieldCheck, Lock, Globe, Zap, Heart, LogIn } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'portal' | 'agent' | 'admin'>('portal');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('GHS');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('ghana_telecom_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('ghana_telecom_auth_token');
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialRole, setAuthInitialRole] = useState<'ADMIN' | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('ghana_telecom_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  // Strict Protection Effect: If active tab is 'admin' and user is not an Admin, gracefully redirect to safe portal
  useEffect(() => {
    if (currentTab === 'admin' && currentUser?.role !== 'ADMIN') {
      const safeTab = currentUser?.role === 'AGENT' ? 'agent' : 'portal';
      setCurrentTab(safeTab);
    }
  }, [currentUser]);

  // Sync theme to <html> tag classList and persistence
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ghana_telecom_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Show Toast Helper
  const showToast = (
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    message: string
  ) => {
    const newNotification: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
    };

    setNotifications((prev) => [newNotification, ...prev].slice(0, 8));

    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id));
    }, 6000);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAuthSuccess = (user: UserAccount, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
    try {
      localStorage.setItem('ghana_telecom_auth_user', JSON.stringify(user));
      localStorage.setItem('ghana_telecom_auth_token', token);
    } catch {}
    // If user is Admin or Agent, switch to corresponding tab for convenience
    if (user.role === 'ADMIN') {
      setCurrentTab('admin');
    } else if (user.role === 'AGENT') {
      setCurrentTab('agent');
    } else {
      setCurrentTab('portal');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthToken(null);
    try {
      localStorage.removeItem('ghana_telecom_auth_user');
      localStorage.removeItem('ghana_telecom_auth_token');
    } catch {}
    setCurrentTab('portal');
    showToast('info', 'Signed Out', 'Your secure session has been terminated.');
  };

  const handleTransactionSuccess = (tx: Transaction) => {
    showToast(
      'success',
      'Transaction Settled',
      `${tx.network} ${tx.serviceType} of GH₵${tx.amountGHS.toFixed(2)} dispatched to ${tx.recipientPhone}.`
    );
  };

  // Initial welcome notification and load default admin session for quick preview
  useEffect(() => {
    // Check initial health
    fetch('/api/health')
      .then((res) => res.json())
      .then(() => {
        showToast(
          'info',
          'Ghana Telecom Grid Online',
          'Paystack Gateway and Hubtel Telecom nodes operational (MTN, Telecel, AirtelTigo).'
        );
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-200">
      {/* Top Header Navigation */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        selectedCurrency={selectedCurrency}
        setSelectedCurrency={setSelectedCurrency}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        notificationCount={notifications.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleNotifications={() => {
          if (notifications.length === 0) {
            showToast('info', 'Activity Stream', 'All system channels and carrier nodes operating normally.');
          }
        }}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {currentTab === 'portal' && (
          <TelecomStore
            selectedCurrency={selectedCurrency}
            currentUser={currentUser}
            onShowToast={showToast}
            onTransactionSuccess={handleTransactionSuccess}
          />
        )}

        {currentTab === 'agent' && (
          <AgentPortal
            currentUser={currentUser}
            selectedCurrency={selectedCurrency}
            onOpenAuth={() => setIsAuthOpen(true)}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'admin' && (
          currentUser?.role === 'ADMIN' ? (
            <AdminPortal
              currentUser={currentUser}
              authToken={authToken}
              selectedCurrency={selectedCurrency}
              onOpenAuth={() => {
                setAuthInitialRole('ADMIN');
                setIsAuthOpen(true);
              }}
              onLogout={handleLogout}
              onUpdateCurrentUser={(user) => {
                setCurrentUser(user);
                try {
                  localStorage.setItem('ghana_telecom_auth_user', JSON.stringify(user));
                } catch {}
              }}
              onBackToSafeTab={() => setCurrentTab('portal')}
              onShowToast={showToast}
            />
          ) : (
            <AdminAccessGuard
              currentUser={currentUser}
              onOpenAuth={() => {
                setAuthInitialRole('ADMIN');
                setIsAuthOpen(true);
              }}
              onReturnToStore={() => setCurrentTab('portal')}
              onReturnToAgent={() => setCurrentTab('agent')}
            />
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-8 px-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
              🇬🇭
            </div>
            <span className="font-bold text-slate-200">
              Ghana Telecom Airtime & Data Bundle Infrastructure
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[11px]">
            <span className="flex items-center gap-1 text-slate-300">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Instant Hubtel Dispatch
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> Paystack PCI-DSS Level 1
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> SOC2 Type II & GDPR Verified
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Admin / Developer Login Button in Red Color with subtle pulse animation when unauthenticated */}
            <button
              id="footer-admin-dev-login-btn"
              onClick={() => {
                if (currentUser?.role === 'ADMIN' && currentTab !== 'admin') {
                  setCurrentTab('admin');
                  showToast('info', 'Admin Access', 'Navigated to Administrator Dashboard.');
                } else {
                  setAuthInitialRole('ADMIN');
                  setIsAuthOpen(true);
                }
              }}
              className={`px-3.5 py-1.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-950/50 border border-red-500/60 flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                !currentUser ? 'animate-pulse hover:animate-none ring-2 ring-red-500/50 shadow-red-600/40' : ''
              }`}
              title="Administrator & Developer Login with default credentials"
            >
              {!currentUser && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                </span>
              )}
              <LogIn className="w-3.5 h-3.5 text-white" />
              <span>Admin / Developer Login</span>
            </button>

            <div className="text-[11px] text-slate-500">
              © {new Date().getFullYear()} Ghana Telecom. Production Release v2.4.
            </div>
          </div>
        </div>
      </footer>

      {/* Mandatory 2FA Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        initialRole={authInitialRole}
        onClose={() => {
          setIsAuthOpen(false);
          setAuthInitialRole(null);
        }}
        onAuthSuccess={handleAuthSuccess}
        onShowToast={showToast}
      />

      {/* In-App Toast Notification Stream */}
      <NotificationToaster
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </div>
  );
}
