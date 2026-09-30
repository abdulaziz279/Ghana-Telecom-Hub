import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Wallet,
  ArrowUpRight,
  Copy,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Percent,
  Clock,
  ShieldCheck,
  Send,
  Loader2,
  BarChart3,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { UserAccount, Transaction, CommissionPayout, CurrencyCode } from '../types';
import { GHANA_CURRENCIES } from '../data/telecomCatalog';

interface AgentPortalProps {
  currentUser: UserAccount | null;
  selectedCurrency: CurrencyCode;
  onOpenAuth: () => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}

export const AgentPortal: React.FC<AgentPortalProps> = ({
  currentUser,
  selectedCurrency,
  onOpenAuth,
  onShowToast,
}) => {
  const [agentTransactions, setAgentTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<CommissionPayout[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Payout request modal state
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<string>('100');
  const [payoutMethod, setPayoutMethod] = useState<'MTN_MOMO' | 'TELECEL_CASH' | 'AT_MONEY' | 'BANK'>('MTN_MOMO');
  const [accountNumber, setAccountNumber] = useState(currentUser?.phone || '');
  const [accountName, setAccountName] = useState(currentUser?.fullName || '');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  const curr = GHANA_CURRENCIES[selectedCurrency] || GHANA_CURRENCIES.GHS;

  // Active agent: strictly uses real authenticated agent account data
  const isRealAgent = currentUser?.role === 'AGENT';
  const effectiveAgentId = isRealAgent ? currentUser.id : '';
  const effectiveAgentCode = isRealAgent ? currentUser.agentCode || '' : '';
  const effectiveAgentName = isRealAgent ? currentUser.fullName : '';
  const effectiveBalance = isRealAgent ? currentUser.balanceGHS || 0 : 0;
  const effectiveCommissionRate = isRealAgent ? currentUser.commissionRate || 3.5 : 3.5;
  const effectiveEarned = isRealAgent ? currentUser.commissionEarnedGHS || 0 : 0;

  const loadAgentData = async () => {
    if (!effectiveAgentCode) return;
    setIsLoading(true);
    try {
      const [txRes, payoutRes] = await Promise.all([
        fetch(`/api/transactions?agentId=${encodeURIComponent(effectiveAgentCode)}`),
        fetch('/api/agents/payouts'),
      ]);

      const txData = await txRes.json();
      const payoutData = await payoutRes.json();

      if (Array.isArray(txData)) {
        setAgentTransactions(txData);
      }
      if (Array.isArray(payoutData)) {
        setPayouts(payoutData.filter((p: CommissionPayout) => p.agentId === effectiveAgentId));
      }
    } catch (err: any) {
      console.error('Failed to load agent data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAgentData();
  }, [currentUser]);

  const copyAgentCode = () => {
    navigator.clipboard.writeText(effectiveAgentCode);
    setCopied(true);
    onShowToast('success', 'Code Copied', `Agent code ${effectiveAgentCode} copied to clipboard.`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payoutAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      onShowToast('error', 'Invalid Amount', 'Please enter a valid payout amount.');
      return;
    }
    if (amountNum > effectiveBalance) {
      onShowToast(
        'error',
        'Insufficient Balance',
        `Your available balance is GH₵${effectiveBalance.toFixed(2)}.`
      );
      return;
    }

    setIsSubmittingPayout(true);
    try {
      const res = await fetch('/api/agents/payout-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: effectiveAgentId,
          amountGHS: amountNum,
          paymentMethod: payoutMethod,
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit payout request.');
      }

      onShowToast(
        'success',
        'Payout Requested',
        `Payout request of GH₵${amountNum.toFixed(2)} queued for automated processing.`
      );
      setIsPayoutModalOpen(false);
      loadAgentData();
    } catch (err: any) {
      onShowToast('error', 'Payout Error', err.message);
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const totalSalesVolume = agentTransactions
    .filter((t) => t.paymentStatus === 'success')
    .reduce((sum, t) => sum + t.amountGHS, 0);

  const [chartMetric, setChartMetric] = useState<'ALL' | 'COMMISSION' | 'VOLUME'>('ALL');

  // Generate 30-day timeline data for Recharts Bar Chart
  const chartData = useMemo(() => {
    const days: {
      dateKey: string;
      label: string;
      fullDate: string;
      commission: number;
      volume: number;
      count: number;
    }[] = [];

    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const fullDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      days.push({
        dateKey,
        label,
        fullDate,
        commission: 0,
        volume: 0,
        count: 0,
      });
    }

    const dayMap = new Map<string, typeof days[0]>();
    days.forEach((day) => dayMap.set(day.dateKey, day));

    agentTransactions.forEach((tx) => {
      if (tx.paymentStatus === 'success') {
        const txDate = tx.createdAt ? tx.createdAt.split('T')[0] : '';
        const entry = dayMap.get(txDate);
        if (entry) {
          const comm =
            typeof tx.commissionEarnedGHS === 'number' && !isNaN(tx.commissionEarnedGHS)
              ? tx.commissionEarnedGHS
              : (Number(tx.amountGHS) * effectiveCommissionRate) / 100;
          entry.commission = Number((entry.commission + comm).toFixed(2));
          entry.volume = Number((entry.volume + Number(tx.amountGHS)).toFixed(2));
          entry.count += 1;
        }
      }
    });

    return days;
  }, [agentTransactions, effectiveCommissionRate]);

  const thirtyDaySummary = useMemo(() => {
    const totalCommission = chartData.reduce((acc, d) => acc + d.commission, 0);
    const totalVolume = chartData.reduce((acc, d) => acc + d.volume, 0);
    const totalTxCount = chartData.reduce((acc, d) => acc + d.count, 0);
    const activeDays = chartData.filter((d) => d.count > 0).length;
    return {
      totalCommission: Number(totalCommission.toFixed(2)),
      totalVolume: Number(totalVolume.toFixed(2)),
      totalTxCount,
      activeDays,
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs text-white min-w-[210px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
            <span className="font-bold text-slate-200">{data.fullDate}</span>
            <span className="text-[10px] bg-slate-800 text-amber-300 font-semibold px-2 py-0.5 rounded-md font-mono">
              {data.count} {data.count === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                Commission:
              </span>
              <span className="font-bold font-mono text-emerald-300">GH₵{data.commission.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                Sales Volume:
              </span>
              <span className="font-bold font-mono text-blue-300">GH₵{data.volume.toFixed(2)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!isRealAgent) {
    return (
      <div id="agent-portal-restricted" className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6 transition-colors">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-900 dark:text-amber-300 border border-amber-400/30">
              Sub-Agent Commission Portal
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-3 font-['Outfit',sans-serif]">
              Authorized Sub-Agent Access
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
              This portal is restricted to provisioned sub-agents. In accordance with platform policy, all sub-agent accounts are created exclusively by the Administrator with designated commission percentages.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 text-left space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <p className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Production Agent Infrastructure:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
              <li>Sub-agent accounts are provisioned exclusively by the Platform Administrator.</li>
              <li>Each transaction with your agent code credits instantaneous commission directly to your balance.</li>
              <li>Real-time payout settlements to MTN MoMo, Telecel Cash, and AT Money accounts.</li>
            </ul>
          </div>

          <button
            id="open-agent-auth-btn"
            onClick={onOpenAuth}
            className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 font-bold text-sm rounded-xl inline-flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400 dark:text-slate-950" />
            Sign In with Sub-Agent Credentials
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="agent-portal-view" className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 dark:bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Sub-Agent Commission Engine
              </span>
              <span className="text-xs text-slate-400">SOC2 Verified Agent</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-['Outfit',sans-serif] text-white">
              {effectiveAgentName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Earn instantaneous commission on every Ghana Telecom airtime and data purchase.
            </p>
          </div>

          {/* Agent Referral Code Card */}
          <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Your Sub-Agent Referral Code
              </p>
              <p className="text-xl font-mono font-black text-amber-400 tracking-wider">
                {effectiveAgentCode}
              </p>
              <p className="text-[10px] text-slate-400">
                Base Commission: <span className="text-emerald-400 font-bold">{effectiveCommissionRate}%</span> per transaction
              </p>
            </div>
            <button
              id="copy-agent-code-btn"
              onClick={copyAgentCode}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer shrink-0"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Available Commission
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white font-['Outfit',sans-serif]">
              GH₵{effectiveBalance.toFixed(2)}
            </h3>
            {selectedCurrency !== 'GHS' && (
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                ≈ {curr.symbol}{(effectiveBalance / curr.rateToGHS).toFixed(2)} {selectedCurrency}
              </p>
            )}
          </div>
          <button
            id="request-payout-modal-btn"
            onClick={() => setIsPayoutModalOpen(true)}
            className="mt-4 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Request MoMo Payout
          </button>
        </div>

        {/* Total Lifetime Commissions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Lifetime Earned
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white font-['Outfit',sans-serif]">
              GH₵{effectiveEarned.toFixed(2)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Instant settlements credited</p>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Commission Rate:</span>
            <span className="font-bold text-slate-900 dark:text-white">{effectiveCommissionRate}%</span>
          </div>
        </div>

        {/* Total Sales Volume */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Sales Volume
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white font-['Outfit',sans-serif]">
              GH₵{totalSalesVolume.toFixed(2)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Across all Ghana carriers</p>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Transactions:</span>
            <span className="font-bold text-slate-900 dark:text-white">{agentTransactions.length}</span>
          </div>
        </div>

        {/* Active Carriers */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Network Support
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">MTN Ghana:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Active</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Telecel:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Active</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">AirtelTigo:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Active</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            Instant Hubtel API Dispatches
          </div>
        </div>
      </div>

      {/* 30-Day Performance & Commission Analytics (Recharts Bar Chart) */}
      <div
        id="agent-30day-analytics-chart"
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-6"
      >
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-500 dark:text-amber-400 flex items-center justify-center border border-amber-400/30 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-['Outfit',sans-serif]">
                  30-Day Commission & Volume Analytics
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Last 30 Days
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Visualizing daily commission earnings and customer transaction volumes
              </p>
            </div>
          </div>

          {/* Metric Mode Filter Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold border border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              id="chart-filter-all"
              onClick={() => setChartMetric('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartMetric === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Dual Comparison
            </button>
            <button
              type="button"
              id="chart-filter-commission"
              onClick={() => setChartMetric('COMMISSION')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartMetric === 'COMMISSION'
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Commission Earnings
            </button>
            <button
              type="button"
              id="chart-filter-volume"
              onClick={() => setChartMetric('VOLUME')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartMetric === 'VOLUME'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sales Volume
            </button>
          </div>
        </div>

        {/* 30-Day Aggregated Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              30-Day Total Commission
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
              GH₵{thirtyDaySummary.totalCommission.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400">At {effectiveCommissionRate}% base rate</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              30-Day Total Volume
            </span>
            <span className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5 block">
              GH₵{thirtyDaySummary.totalVolume.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400">Airtime & data gross</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Orders Processed
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
              {thirtyDaySummary.totalTxCount}
            </span>
            <span className="text-[10px] text-slate-400">Successful checkouts</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Active Selling Days
            </span>
            <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">
              {thirtyDaySummary.activeDays} <span className="text-xs text-slate-400 font-normal">/ 30</span>
            </span>
            <span className="text-[10px] text-slate-400">Days with activity</span>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="w-full h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 15, left: -5, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                interval={2}
                angle={-35}
                textAnchor="end"
                height={42}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `GH₵${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
              />
              {(chartMetric === 'ALL' || chartMetric === 'COMMISSION') && (
                <Bar
                  dataKey="commission"
                  name="Commission Earned (GH₵)"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={chartMetric === 'ALL' ? 18 : 34}
                />
              )}
              {(chartMetric === 'ALL' || chartMetric === 'VOLUME') && (
                <Bar
                  dataKey="volume"
                  name="Sales Volume (GH₵)"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={chartMetric === 'ALL' ? 18 : 34}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Section: Transactions Generated & Payout Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Generated Transactions */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Transactions Under Code ({effectiveAgentCode})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Real-time commission breakdown</p>
            </div>
            <button
              onClick={loadAgentData}
              className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 cursor-pointer"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px]">
                  <th className="pb-3">Reference / Time</th>
                  <th className="pb-3">Recipient Phone</th>
                  <th className="pb-3">Network & Service</th>
                  <th className="pb-3">Amount (GH₵)</th>
                  <th className="pb-3 text-right">Commission (GH₵)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {agentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No transactions have been tagged with code {effectiveAgentCode} yet.
                    </td>
                  </tr>
                ) : (
                  agentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 font-mono">
                        <span className="font-bold text-slate-900 dark:text-white">{tx.reference}</span>
                        <span className="block text-[10px] text-slate-400 font-sans">
                          {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {tx.recipientPhone}
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-slate-900 dark:text-white">{tx.network}</span>{' '}
                        <span className="text-slate-500 dark:text-slate-400">• {tx.packageName}</span>
                      </td>
                      <td className="py-3 font-bold text-slate-900 dark:text-white">
                        GH₵{tx.amountGHS.toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          +GH₵{tx.commissionEarnedGHS.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payout Requests History */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Payout Requests</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Instant MoMo & Bank settlements</p>
            </div>
            <button
              onClick={() => setIsPayoutModalOpen(true)}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer"
            >
              + New Request
            </button>
          </div>

          <div className="space-y-3">
            {payouts.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">No payout requests recorded.</p>
            ) : (
              payouts.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        GH₵{p.amountGHS.toFixed(2)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          p.status === 'paid'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : p.status === 'pending'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {p.paymentMethod.replace('_', ' ')} • {p.accountNumber}
                    </p>
                  </div>
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Payout Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base font-['Outfit',sans-serif]">
                  Request Commission Payout
                </h3>
              </div>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestPayout} className="p-6 space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold block">
                  Available Commission Balance:
                </span>
                <span className="text-xl font-black text-emerald-950 dark:text-emerald-100">
                  GH₵{effectiveBalance.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Withdrawal Amount (GH₵)
                </label>
                <input
                  id="payout-amount-input"
                  type="number"
                  min="10"
                  max={effectiveBalance}
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payout Channel
                </label>
                <select
                  id="payout-channel-select"
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                >
                  <option value="MTN_MOMO">MTN Mobile Money</option>
                  <option value="TELECEL_CASH">Telecel Cash (Vodafone)</option>
                  <option value="AT_MONEY">AT Money (AirtelTigo)</option>
                  <option value="BANK">Ghana Commercial Bank (Instant Settlement)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  MoMo Number / Account Number
                </label>
                <input
                  id="payout-phone-input"
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Name on SIM / Bank
                </label>
                <input
                  id="payout-name-input"
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                id="confirm-payout-btn"
                disabled={isSubmittingPayout}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingPayout ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Confirm Payout Request
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
