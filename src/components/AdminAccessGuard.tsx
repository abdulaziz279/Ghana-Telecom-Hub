import React from 'react';
import {
  ShieldAlert,
  Lock,
  ArrowLeft,
  UserCheck,
  Building2,
  Users,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { UserAccount } from '../types';

interface AdminAccessGuardProps {
  currentUser: UserAccount | null;
  onOpenAuth: () => void;
  onReturnToStore: () => void;
  onReturnToAgent: () => void;
}

export const AdminAccessGuard: React.FC<AdminAccessGuardProps> = ({
  currentUser,
  onOpenAuth,
  onReturnToStore,
  onReturnToAgent,
}) => {
  const isAgent = currentUser?.role === 'AGENT';
  const isCustomer = currentUser?.role === 'CUSTOMER';
  const isUnauthenticated = !currentUser;

  return (
    <div id="admin-access-guard" className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border-2 border-rose-500/20 dark:border-rose-500/30 shadow-2xl relative overflow-hidden transition-colors">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 text-center space-y-6">
          {/* Security Badge & Icon */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <Lock className="w-3.5 h-3.5" />
            <span>RESTRICTED ZONE • ZERO-TRUST RBAC</span>
          </div>

          <div className="w-20 h-20 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border-2 border-rose-200 dark:border-rose-800 shadow-inner">
            <ShieldAlert className="w-10 h-10 animate-pulse" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit',sans-serif]">
              Administrator Dashboard Protected
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-lg mx-auto mt-2 leading-relaxed">
              The Administrator Dashboard is strictly confidential and protected from vendors, merchants, and customers. Direct administrative clearance and verified 2-Factor Authentication are mandatory.
            </p>
          </div>

          {/* Contextual Account State Box */}
          {isAgent && (
            <div className="bg-amber-50 dark:bg-amber-950/40 rounded-2xl p-5 border border-amber-300 dark:border-amber-800 text-left space-y-2">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
                <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Vendor / Sub-Agent Clearance Level</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                You are currently signed in as sub-agent <strong>{currentUser.fullName}</strong> ({currentUser.email} • Code: <strong>{currentUser.agentCode}</strong>). Sub-agent and merchant accounts are isolated to sales dispatches and commission tracking, and are restricted from viewing platform carrier settings, gateway keys, or regulatory audit trails.
              </p>
            </div>
          )}

          {isCustomer && (
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 text-left space-y-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <CreditCard className="w-4 h-4 text-slate-500" />
                <span>Customer Clearance Level</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                You are currently signed in as customer <strong>{currentUser.fullName}</strong> ({currentUser.email}). Customer accounts are restricted to airtime and data bundle purchases. Administrative control functions are hidden from customer accounts.
              </p>
            </div>
          )}

          {isUnauthenticated && (
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 text-left space-y-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Unauthenticated Access Blocked</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                No active administrative session was detected. Access to system configurations, operator balances, and compliance logs requires an authenticated Administrator session with 2-Factor Authentication.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isAgent ? (
              <>
                <button
                  id="guard-return-agent-btn"
                  onClick={onReturnToAgent}
                  className="w-full sm:w-auto px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm rounded-xl inline-flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to Sub-Agent Portal
                </button>
                <button
                  id="guard-switch-admin-btn"
                  onClick={onOpenAuth}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-sm rounded-xl inline-flex items-center justify-center gap-2 transition-all border border-slate-700 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  Switch to Administrator Account
                </button>
              </>
            ) : isCustomer ? (
              <>
                <button
                  id="guard-return-store-btn"
                  onClick={onReturnToStore}
                  className="w-full sm:w-auto px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm rounded-xl inline-flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to Top-Up Desk
                </button>
                <button
                  id="guard-switch-admin-btn"
                  onClick={onOpenAuth}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-sm rounded-xl inline-flex items-center justify-center gap-2 transition-all border border-slate-700 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  Sign In with Administrator 2FA
                </button>
              </>
            ) : (
              <>
                <button
                  id="guard-admin-login-btn"
                  onClick={onOpenAuth}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 font-bold text-sm rounded-xl inline-flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-amber-400 dark:text-slate-950" />
                  Sign In with Administrator Credentials
                </button>
                <button
                  id="guard-back-store-btn"
                  onClick={onReturnToStore}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-xl inline-flex items-center justify-center gap-2 transition-all border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to Customer Top-Up Desk
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
