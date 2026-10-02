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
  Share2,
  ExternalLink,
  QrCode,
  Sparkles,
  MessageSquare,
  Globe,
  Check,
  Radio,
  X,
  Activity,
  Search,
  RefreshCw,
  Smartphone,
  AlertTriangle,
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

  // Live Order Tracking State for Sub-Agents
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<any | null>(null);
  const [trackingTimeline, setTrackingTimeline] = useState<any[]>([]);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [trackingQueryInput, setTrackingQueryInput] = useState('');
  const [isSearchingTracking, setIsSearchingTracking] = useState(false);

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

  const handleOpenTracking = async (query: string) => {
    if (!query || !query.trim()) {
      onShowToast('info', 'Enter Order Reference', 'Please enter a customer phone line or transaction reference.');
      return;
    }
    setIsSearchingTracking(true);
    setIsLoadingTracking(true);
    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.order) {
        throw new Error(data.error || 'No matching customer order found.');
      }
      setTrackingOrder(data.order);
      setTrackingTimeline(data.timeline || []);
      setIsTrackingModalOpen(true);
    } catch (err: any) {
      onShowToast('error', 'Tracking Not Found', err.message);
    } finally {
      setIsSearchingTracking(false);
      setIsLoadingTracking(false);
    }
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

  // Shareable links state
  const [selectedShareLinkTab, setSelectedShareLinkTab] = useState<string>('all');
  const [promoPitchMode, setPromoPitchMode] = useState<'ALL_ROUND' | 'DATA_FOCUSED' | 'AIRTIME_FOCUSED'>('ALL_ROUND');
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [copiedPromoText, setCopiedPromoText] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrModalUrl, setQrModalUrl] = useState('');
  const [qrModalTitle, setQrModalTitle] = useState('');

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ghanatelecom.com.gh';

  const shareLinks = useMemo(() => {
    const code = effectiveAgentCode || 'AGT-001';
    return [
      {
        id: 'all',
        title: 'Universal Store Link',
        subtitle: 'All Ghana Networks (MTN, Telecel, AirtelTigo)',
        badge: 'ALL NETWORKS',
        badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        url: `${currentOrigin}/buy/${code}`,
        shortPath: `/buy/${code}`,
        description: 'Customer opens the main store with all data & airtime bundles. Agent code automatically tagged.',
      },
      {
        id: 'mtn',
        title: 'MTN Ghana Direct Link',
        subtitle: 'Pre-selects MTN Data Bundles & Airtime',
        badge: 'MTN GHANA',
        badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        url: `${currentOrigin}/buy/${code}?net=MTN`,
        shortPath: `/buy/${code}?net=MTN`,
        description: 'Directly opens MTN packages. Best for MTN WhatsApp groups and status updates.',
      },
      {
        id: 'telecel',
        title: 'Telecel Ghana Direct Link',
        subtitle: 'Pre-selects Telecel Cash & Bundles',
        badge: 'TELECEL',
        badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        url: `${currentOrigin}/buy/${code}?net=TELECEL`,
        shortPath: `/buy/${code}?net=TELECEL`,
        description: 'Directly opens Telecel packages. Best for Telecel user communities.',
      },
      {
        id: 'airteltigo',
        title: 'AirtelTigo Direct Link',
        subtitle: 'Pre-selects AT Money & Big Time Bundles',
        badge: 'AIRTELTIGO',
        badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        url: `${currentOrigin}/buy/${code}?net=AIRTELTIGO`,
        shortPath: `/buy/${code}?net=AIRTELTIGO`,
        description: 'Directly opens AirtelTigo packages. Best for AT subscribers.',
      },
      {
        id: 'airtime',
        title: 'Instant Airtime Recharge Link',
        subtitle: 'Direct recharge for all phone lines',
        badge: 'AIRTIME',
        badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        url: `${currentOrigin}/buy/${code}?type=AIRTIME`,
        shortPath: `/buy/${code}?type=AIRTIME`,
        description: 'Opens Airtime Top-Up mode directly for quick balance top-ups.',
      },
    ];
  }, [currentOrigin, effectiveAgentCode]);

  const activeShareLink = useMemo(() => {
    return shareLinks.find((l) => l.id === selectedShareLinkTab) || shareLinks[0];
  }, [shareLinks, selectedShareLinkTab]);

  const getPromoText = (linkUrl: string, mode: 'ALL_ROUND' | 'DATA_FOCUSED' | 'AIRTIME_FOCUSED') => {
    switch (mode) {
      case 'DATA_FOCUSED':
        return `🔥 Unbeatable Ghana Data Bundles! Get high-speed MTN, Telecel & AirtelTigo data with instant automated credit to your phone. Tap to buy: ${linkUrl}`;
      case 'AIRTIME_FOCUSED':
        return `⚡ Running low on airtime? Instant mobile recharge for MTN, Telecel & AT with zero transaction fees! Tap here: ${linkUrl}`;
      case 'ALL_ROUND':
      default:
        return `🇬🇭 Need fast Airtime or Data in Ghana? Top up MTN, Telecel & AirtelTigo with instant automated delivery! Pay securely via MoMo or Card. Tap to recharge: ${linkUrl}`;
    }
  };

  const handleShareWhatsApp = (url: string) => {
    const text = getPromoText(url, promoPitchMode);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareTwitter = (url: string) => {
    const text = getPromoText(url, promoPitchMode);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareFacebook = (url: string) => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareTelegram = (url: string) => {
    const text = getPromoText(url, promoPitchMode);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = (url: string, id: string, name: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkId(id);
    onShowToast('success', 'Link Copied', `${name} short link copied! Ready to share.`);
    setTimeout(() => setCopiedLinkId(null), 2500);
  };

  const handleCopyPromoMessage = (url: string) => {
    const text = getPromoText(url, promoPitchMode);
    navigator.clipboard.writeText(text);
    setCopiedPromoText(true);
    onShowToast('success', 'Marketing Pitch Copied', 'Full promotional text and short link copied to clipboard.');
    setTimeout(() => setCopiedPromoText(false), 2500);
  };

  const handleOpenQrModal = (url: string, title: string) => {
    setQrModalUrl(url);
    setQrModalTitle(title);
    setIsQrModalOpen(true);
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

      {/* Customer Social Share Links & Marketing Hub */}
      <div
        id="agent-social-share-center"
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl transition-colors space-y-6"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-['Outfit',sans-serif]">
                  Social Media Short Links & Customer Links
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Commission Automated
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Share these dedicated short links on your WhatsApp status, X (Twitter), Facebook, and Telegram. When customers tap and purchase any package, your sub-agent code is automatically applied and your commission is credited directly to your balance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 self-start md:self-auto shrink-0">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Your Tag:</span>
            <span className="font-mono font-black text-amber-500 dark:text-amber-400 text-sm">
              {effectiveAgentCode}
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              +{effectiveCommissionRate}%
            </span>
          </div>
        </div>

        {/* Link Target Selector Pills */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Select Link Target to Share:
          </label>
          <div className="flex flex-wrap gap-2">
            {shareLinks.map((link) => {
              const isSelected = selectedShareLinkTab === link.id;
              return (
                <button
                  key={link.id}
                  id={`share-tab-${link.id}`}
                  onClick={() => setSelectedShareLinkTab(link.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 border-slate-900 dark:border-amber-400 shadow-md scale-[1.02]'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span>{link.title}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                      isSelected
                        ? 'bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950'
                        : link.badgeColor
                    }`}
                  >
                    {link.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Link Featured Showcase Card */}
        <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl text-white space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeShareLink.badgeColor}`}>
                  {activeShareLink.badge}
                </span>
                <h4 className="text-base font-bold text-white">{activeShareLink.title}</h4>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{activeShareLink.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="active-link-qr-btn"
                onClick={() => handleOpenQrModal(activeShareLink.url, activeShareLink.title)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="View and download scannable QR Code"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                <span>QR Code</span>
              </button>
              <a
                href={activeShareLink.url}
                target="_blank"
                rel="noopener noreferrer"
                id="active-link-test-btn"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                title="Test this link as a customer in a new tab"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span>Test Link</span>
              </a>
            </div>
          </div>

          {/* Monospaced URL Display Bar with Copy Action */}
          <div className="bg-slate-950/80 rounded-xl p-2.5 sm:p-3 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs sm:text-sm font-mono font-bold text-amber-300 truncate select-all">
                {activeShareLink.url}
              </p>
            </div>
            <button
              type="button"
              id="active-link-copy-btn"
              onClick={() => handleCopyLink(activeShareLink.url, activeShareLink.id, activeShareLink.title)}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 text-xs font-black rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
            >
              {copiedLinkId === activeShareLink.id ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-950" />
                  <span>Copy Short Link</span>
                </>
              )}
            </button>
          </div>

          {/* Marketing Pitch Customizer */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" /> Choose Promotional Caption Template:
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPromoPitchMode('ALL_ROUND')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    promoPitchMode === 'ALL_ROUND'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🚀 All-Round
                </button>
                <button
                  type="button"
                  onClick={() => setPromoPitchMode('DATA_FOCUSED')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    promoPitchMode === 'DATA_FOCUSED'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🔥 Data Bundles
                </button>
                <button
                  type="button"
                  onClick={() => setPromoPitchMode('AIRTIME_FOCUSED')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    promoPitchMode === 'AIRTIME_FOCUSED'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ Fast Airtime
                </button>
              </div>
            </div>

            {/* Live Message Preview */}
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-sans relative group">
              <p>{getPromoText(activeShareLink.url, promoPitchMode)}</p>
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Ready to post directly to social platforms</span>
                <button
                  type="button"
                  id="copy-promo-pitch-btn"
                  onClick={() => handleCopyPromoMessage(activeShareLink.url)}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedPromoText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied Pitch</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Pitch Text</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Instant Social Media Sharing Buttons */}
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                1-Click Instant Share to Social Handles:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* WhatsApp */}
                <button
                  type="button"
                  id="share-btn-whatsapp"
                  onClick={() => handleShareWhatsApp(activeShareLink.url)}
                  className="py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1caa50] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>WhatsApp</span>
                </button>

                {/* X (Twitter) */}
                <button
                  type="button"
                  id="share-btn-twitter"
                  onClick={() => handleShareTwitter(activeShareLink.url)}
                  className="py-2.5 px-3 bg-black hover:bg-slate-900 active:bg-slate-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 shadow transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span>Post on X</span>
                </button>

                {/* Telegram */}
                <button
                  type="button"
                  id="share-btn-telegram"
                  onClick={() => handleShareTelegram(activeShareLink.url)}
                  className="py-2.5 px-3 bg-[#0088cc] hover:bg-[#0077b5] active:bg-[#00669c] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.943z" />
                  </svg>
                  <span>Telegram</span>
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  id="share-btn-facebook"
                  onClick={() => handleShareFacebook(activeShareLink.url)}
                  className="py-2.5 px-3 bg-[#1877F2] hover:bg-[#166fe5] active:bg-[#1465d2] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick-Copy Grid of All 5 Network Short Links */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              All Pre-Configured Short Links (Instant Copy):
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              5 Direct Channels
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shareLinks.map((link) => (
              <div
                key={link.id}
                className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3 transition-colors hover:border-amber-400/50"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${link.badgeColor}`}>
                      {link.badge}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenQrModal(link.url, link.title)}
                      className="text-slate-400 hover:text-amber-500 transition-colors p-1 cursor-pointer"
                      title="View QR Code"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white">{link.title}</h5>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 truncate">
                    {link.shortPath}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(link.url, link.id, link.title)}
                    className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedLinkId === link.id ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
                    title="Open link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
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
              <p className="text-xs text-slate-500 dark:text-slate-400">Real-time commission breakdown & customer delivery trace</p>
            </div>
            <button
              onClick={loadAgentData}
              className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 cursor-pointer"
            >
              Refresh
            </button>
          </div>

          {/* Quick Customer Order Tracking Lookup Card */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/30">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-['Outfit',sans-serif]">
                  Customer Order Tracking & Delivery Trace
                </h4>
                <p className="text-[10px] text-slate-400">
                  Verify data bundle or airtime delivery for any customer across MTN, Telecel, and AT.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={trackingQueryInput}
                onChange={(e) => setTrackingQueryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleOpenTracking(trackingQueryInput);
                }}
                placeholder="Phone line or Order Ref..."
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-full sm:w-48 font-mono"
              />
              <button
                type="button"
                onClick={() => handleOpenTracking(trackingQueryInput)}
                disabled={isSearchingTracking || !trackingQueryInput.trim()}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors shrink-0"
              >
                {isSearchingTracking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                <span>Track</span>
              </button>
            </div>
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
                  <th className="pb-3 text-right">Tracking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {agentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
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
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenTracking(tx.reference)}
                          className="px-2.5 py-1 bg-amber-400/20 hover:bg-amber-400 text-amber-900 dark:text-amber-300 hover:text-slate-950 font-bold text-[10px] rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Track delivery status"
                        >
                          <Activity className="w-3 h-3" />
                          <span>Track</span>
                        </button>
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

      {/* QR Code Scan Modal */}
      {isQrModalOpen && (
        <div
          id="agent-qr-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div
            id="agent-qr-modal-card"
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-5 text-center relative"
          >
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-500 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-400/30">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Outfit',sans-serif]">
                Customer QR Scan Code
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {qrModalTitle}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-inner inline-block mx-auto">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrModalUrl)}`}
                alt="QR Code"
                className="w-48 h-48 mx-auto"
                loading="lazy"
              />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 break-all select-all">
                {qrModalUrl}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(qrModalUrl);
                  onShowToast('success', 'Link Copied', 'Short link copied to clipboard.');
                }}
                className="flex-1 py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </button>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Agent Customer Order Tracking & Delivery Verification Modal */}
      {isTrackingModalOpen && trackingOrder && (
        <div
          id="agent-order-tracking-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
            {/* Header */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base font-['Outfit',sans-serif]">
                      Customer Order Tracking
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-400 text-slate-950">
                      {trackingOrder.network}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Ref: <strong className="text-white">{trackingOrder.reference}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTrackingModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Order Quick Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Recipient SIM
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white block mt-0.5">
                    {trackingOrder.recipientPhone}
                  </span>
                  <span className="text-[10px] text-slate-400">{trackingOrder.customerName || 'Customer'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Package / Value
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-amber-600 dark:text-amber-400 block mt-0.5">
                    GH₵{trackingOrder.amountGHS.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400">{trackingOrder.packageName}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Payment Gateway
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                    {trackingOrder.status}
                  </span>
                  <span className="text-[10px] text-slate-400">Paystack Verified</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Carrier Delivery
                  </span>
                  <span className={`text-xs sm:text-sm font-mono font-bold block mt-0.5 ${
                    trackingOrder.carrierDispatchStatus === 'DELIVERED' || trackingOrder.carrierDispatchStatus === 'DISPATCHED'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-500'
                  }`}>
                    {trackingOrder.carrierDispatchStatus}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono truncate block">{trackingOrder.carrierReference}</span>
                </div>
              </div>

              {/* Delivery Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-500" />
                    Delivery Progress
                  </h4>
                  {isLoadingTracking && (
                    <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Querying Carrier Nodes...
                    </span>
                  )}
                </div>

                <div className="space-y-2.5">
                  {(trackingTimeline && trackingTimeline.length > 0 ? trackingTimeline : [
                    {
                      step: 1,
                      title: 'Order Placed & Gateway Initialized',
                      time: trackingOrder.createdAt,
                      status: 'COMPLETED',
                      description: `Order verified on ${trackingOrder.network}. Ref: ${trackingOrder.reference}.`,
                    },
                    {
                      step: 2,
                      title: 'Commission Credited to Balance',
                      time: trackingOrder.completedAt || trackingOrder.createdAt,
                      status: trackingOrder.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
                      description: `Commission of GH₵${((trackingOrder.amountGHS * effectiveCommissionRate) / 100).toFixed(2)} credited to your agent balance.`,
                    },
                    {
                      step: 3,
                      title: 'Hubtel Carrier Switch Dispatch',
                      time: trackingOrder.completedAt || trackingOrder.createdAt,
                      status: trackingOrder.carrierDispatchStatus === 'DELIVERED' || trackingOrder.carrierDispatchStatus === 'DISPATCHED' ? 'COMPLETED' : 'PENDING',
                      description: `Routed to ${trackingOrder.network} telecom node via Hubtel API.`,
                    },
                    {
                      step: 4,
                      title: 'Delivered to Customer Phone Line',
                      time: trackingOrder.completedAt || trackingOrder.createdAt,
                      status: trackingOrder.carrierDispatchStatus === 'DELIVERED' || trackingOrder.carrierDispatchStatus === 'DISPATCHED' ? 'COMPLETED' : 'PENDING',
                      description: `${trackingOrder.packageName} delivered to ${trackingOrder.recipientPhone}. Hubtel ID: ${trackingOrder.carrierReference}.`,
                    },
                  ]).map((t: any, idx: number) => {
                    const isDone = t.status === 'COMPLETED';
                    const isFailed = t.status === 'FAILED';
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                          isDone
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                            : isFailed
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isFailed
                            ? 'bg-rose-500 text-white'
                            : 'bg-amber-400 text-slate-950 font-bold'
                        }`}>
                          {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : isFailed ? <AlertTriangle className="w-3.5 h-3.5" /> : <span className="text-[10px]">{t.step || idx + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                              {t.title}
                            </h5>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {t.time ? new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                            {t.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Receipt Copy Section */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Customer Delivery Proof
                  </span>
                  <span className="font-mono text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-bold">
                    CARRIER CONFIRMED
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Carrier Transaction Ref: <strong className="font-mono text-slate-900 dark:text-white">{trackingOrder.carrierReference}</strong>
                </p>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const receiptMsg = `*GHANA TELECOM TOP-UP RECEIPT*\n\nHello, your recharge of *${trackingOrder.packageName}* to *${trackingOrder.recipientPhone}* has been confirmed delivered!\n\n• Network: ${trackingOrder.network}\n• Delivery Ref: ${trackingOrder.carrierReference}\n• Date: ${new Date(trackingOrder.createdAt).toLocaleDateString()}\n\nThank you for choosing ${effectiveAgentName}!`;
                    navigator.clipboard.writeText(receiptMsg);
                    onShowToast('success', 'Copied WhatsApp Receipt', 'Customer receipt copied to clipboard.');
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Copy WhatsApp Receipt</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenTracking(trackingOrder.reference || trackingOrder.orderNumber)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTracking ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTrackingModalOpen(false)}
                    className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
