import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  CheckCircle2,
  CreditCard,
  Settings,
  ShieldCheck,
  PlusCircle,
  ArrowUpRight,
  Send,
  Loader2,
  Activity,
  Zap,
  ListOrdered,
  Receipt,
  Search,
  RefreshCw,
  Copy,
  Smartphone,
  Check,
  Radio,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  Menu,
  X,
  LogOut,
  LogIn,
  KeyRound,
  UserCog,
  Lock,
} from 'lucide-react';
import {
  UserAccount,
  CommissionPayout,
  AnalyticsSummary,
  GatewaySettings,
  CurrencyCode,
  Transaction,
  OrderRecord,
  NetworkOperator,
} from '../types';
import { GHANA_CURRENCIES } from '../data/telecomCatalog';
import { AuditLogsView } from './AuditLogsView';
import { AdminAccessGuard } from './AdminAccessGuard';
import {
  db,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from '../firebase';

interface AdminPortalProps {
  currentUser: UserAccount | null;
  authToken?: string | null;
  selectedCurrency: CurrencyCode;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onUpdateCurrentUser?: (user: UserAccount) => void;
  onBackToSafeTab?: () => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentUser,
  authToken,
  selectedCurrency,
  onOpenAuth,
  onLogout,
  onUpdateCurrentUser,
  onBackToSafeTab,
  onShowToast,
}) => {
  const isAdmin = currentUser?.role === 'ADMIN';

  // Defensive Guard: If non-admin, block data loading and render protective barrier
  if (!isAdmin) {
    return (
      <AdminAccessGuard
        currentUser={currentUser}
        onOpenAuth={onOpenAuth || (() => {})}
        onReturnToStore={onBackToSafeTab || (() => {})}
        onReturnToAgent={onBackToSafeTab || (() => {})}
      />
    );
  }

  const [activeAdminTab, setActiveAdminTab] = useState<
    'ANALYTICS' | 'TRANSACTIONS' | 'ORDERS' | 'CREATE_AGENT' | 'PAYOUTS' | 'SETTINGS' | 'AUDIT' | 'PROFILE'
  >('ANALYTICS');

  // Overlay sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Admin Profile & Credentials modification form state
  const [adminFullName, setAdminFullName] = useState(currentUser?.fullName || '');
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || '');
  const [adminPhone, setAdminPhone] = useState(currentUser?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Sync profile form state when currentUser updates
  useEffect(() => {
    if (currentUser) {
      setAdminFullName(currentUser.fullName || '');
      setAdminEmail(currentUser.email || '');
      setAdminPhone(currentUser.phone || '');
    }
  }, [currentUser]);

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [agents, setAgents] = useState<UserAccount[]>([]);
  const [payouts, setPayouts] = useState<CommissionPayout[]>([]);
  const [settings, setSettings] = useState<GatewaySettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters for Transactions
  const [txSearch, setTxSearch] = useState('');
  const [txNetworkFilter, setTxNetworkFilter] = useState<string>('ALL');
  const [txStatusFilter, setTxStatusFilter] = useState<string>('ALL');

  // Filters for Orders
  const [orderSearch, setOrderSearch] = useState('');
  const [orderNetworkFilter, setOrderNetworkFilter] = useState<string>('ALL');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

  // Inline "Create Sub-Agent Portal" form state
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentPassword, setNewAgentPassword] = useState('Agent2026Secure!');
  const [newAgentCommission, setNewAgentCommission] = useState('3.5');
  const [newAgentBalance, setNewAgentBalance] = useState('0');
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);

  // Sub-Agent Account Modification state
  const [isEditAgentModalOpen, setIsEditAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<UserAccount | null>(null);
  const [editAgentName, setEditAgentName] = useState('');
  const [editAgentEmail, setEditAgentEmail] = useState('');
  const [editAgentPhone, setEditAgentPhone] = useState('');
  const [editAgentPassword, setEditAgentPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editAgentCommission, setEditAgentCommission] = useState('3.5');
  const [editAgentStatus, setEditAgentStatus] = useState<'active' | 'suspended'>('active');
  const [isUpdatingAgent, setIsUpdatingAgent] = useState(false);

  // Order Tracking Modal State
  const [trackingOrder, setTrackingOrder] = useState<OrderRecord | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingTimeline, setTrackingTimeline] = useState<any[]>([]);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [trackingSearchInput, setTrackingSearchInput] = useState('');
  const [isSearchingTracking, setIsSearchingTracking] = useState(false);

  // Manual Telecom Fulfillment & Diagnostics State
  const [fulfillingTx, setFulfillingTx] = useState<Transaction | null>(null);
  const [manualRefInput, setManualRefInput] = useState('');
  const [isFulfilling, setIsFulfilling] = useState(false);
  const [hubtelDiag, setHubtelDiag] = useState<any>(null);
  const [isTestingHubtel, setIsTestingHubtel] = useState(false);

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    paystackPublicKey: '',
    paystackSecretKey: '',
    isPaystackLive: true,
    hubtelClientId: '',
    hubtelClientSecret: '',
    hubtelSenderId: '',
    hubtelMerchantAccount: '',
    isHubtelLive: true,
    crmWebhookUrl: '',
    defaultCommissionRate: 3.5,
    twoFactorMandatory: true,
  });
  const [isTestingCrm, setIsTestingCrm] = useState(false);

  const curr = GHANA_CURRENCIES[selectedCurrency] || GHANA_CURRENCIES.GHS;

  // Authorization headers for protected administrative API endpoints
  const getAdminHeaders = () => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Actor-Email': currentUser?.email || 'juniorazigiza@gmail.com',
      'X-Actor-Role': 'ADMIN',
    };
    if (authToken) {
      h['Authorization'] = `Bearer ${authToken}`;
    }
    return h;
  };

  // Load all platform data via REST
  const loadData = async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const headers = getAdminHeaders();
      const [analyticsRes, txRes, ordersRes, agentsRes, payoutsRes, settingsRes] =
        await Promise.all([
          fetch('/api/analytics/dashboard', { headers }),
          fetch('/api/transactions', { headers }),
          fetch('/api/orders', { headers }),
          fetch('/api/agents', { headers }),
          fetch('/api/agents/payouts', { headers }),
          fetch('/api/admin/settings', { headers }),
        ]);

      const aData = await analyticsRes.json();
      const tData = await txRes.json();
      const oData = await ordersRes.json();
      const agData = await agentsRes.json();
      const pData = await payoutsRes.json();
      const sData = await settingsRes.json();

      setAnalytics(aData);
      if (Array.isArray(tData)) setTransactions(tData);
      if (Array.isArray(oData)) setOrders(oData);
      if (Array.isArray(agData)) setAgents(agData);
      if (Array.isArray(pData)) setPayouts(pData);
      if (sData) {
        setSettings(sData);
        setSettingsForm({
          paystackPublicKey: sData.paystackPublicKey || '',
          paystackSecretKey: sData.paystackSecretKey || '',
          isPaystackLive: sData.isPaystackLive !== false,
          hubtelClientId: sData.hubtelClientId || '',
          hubtelClientSecret: sData.hubtelClientSecret || '',
          hubtelSenderId: sData.hubtelSenderId || '',
          hubtelMerchantAccount: sData.hubtelMerchantAccount || '',
          isHubtelLive: sData.isHubtelLive !== false,
          crmWebhookUrl: sData.crmWebhookUrl || '',
          defaultCommissionRate: sData.defaultCommissionRate || 3.5,
          twoFactorMandatory: sData.twoFactorMandatory !== false,
        });
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time Firestore Cloud Storage Listeners (Active strictly for authenticated administrators)
  useEffect(() => {
    if (!isAdmin) return;
    loadData();

    let unsubTx: (() => void) | undefined;
    let unsubOrders: (() => void) | undefined;
    let unsubAgents: (() => void) | undefined;
    let unsubPayouts: (() => void) | undefined;

    try {
      // Real-time transactions listener
      const txQuery = query(
        collection(db, 'transactions'),
        orderBy('createdAt', 'desc'),
        limit(150)
      );
      unsubTx = onSnapshot(
        txQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveList: Transaction[] = [];
            snapshot.forEach((docSnap) => {
              liveList.push(docSnap.data() as Transaction);
            });
            setTransactions(liveList);
            setIsFirestoreConnected(true);
          }
        },
        (err) => {
          console.warn('Firestore transactions onSnapshot note:', err.message);
        }
      );

      // Real-time orders listener
      const ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(150)
      );
      unsubOrders = onSnapshot(
        ordersQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveOrders: OrderRecord[] = [];
            snapshot.forEach((docSnap) => {
              liveOrders.push(docSnap.data() as OrderRecord);
            });
            setOrders(liveOrders);
            setIsFirestoreConnected(true);
          }
        },
        (err) => {
          console.warn('Firestore orders onSnapshot note:', err.message);
        }
      );

      // Real-time sub-agents listener
      const agentsQuery = query(collection(db, 'agents'), limit(100));
      unsubAgents = onSnapshot(
        agentsQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveAgents: UserAccount[] = [];
            snapshot.forEach((docSnap) => {
              liveAgents.push(docSnap.data() as UserAccount);
            });
            setAgents(liveAgents);
          }
        },
        (err) => {
          console.warn('Firestore agents onSnapshot note:', err.message);
        }
      );

      // Real-time payouts listener
      const payoutsQuery = query(
        collection(db, 'payouts'),
        orderBy('requestedAt', 'desc'),
        limit(100)
      );
      unsubPayouts = onSnapshot(
        payoutsQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const livePayouts: CommissionPayout[] = [];
            snapshot.forEach((docSnap) => {
              livePayouts.push(docSnap.data() as CommissionPayout);
            });
            setPayouts(livePayouts);
          }
        },
        (err) => {
          console.warn('Firestore payouts onSnapshot note:', err.message);
        }
      );
    } catch (e: any) {
      console.warn('Firestore subscription fallback:', e.message);
    }

    return () => {
      if (unsubTx) unsubTx();
      if (unsubOrders) unsubOrders();
      if (unsubAgents) unsubAgents();
      if (unsubPayouts) unsubPayouts();
    };
  }, []);

  // Handle Sub-Agent Provisioning
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim() || !newAgentEmail.trim() || !newAgentPhone.trim()) {
      onShowToast('error', 'Required Fields', 'Please complete all required sub-agent fields.');
      return;
    }

    setIsCreatingAgent(true);
    try {
      const res = await fetch('/api/agents/create', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          fullName: newAgentName.trim(),
          email: newAgentEmail.trim(),
          phone: newAgentPhone.trim(),
          password: newAgentPassword.trim() || 'Agent2026Secure!',
          commissionRate: parseFloat(newAgentCommission),
          initialBalance: parseFloat(newAgentBalance),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create sub-agent.');
      }

      onShowToast(
        'success',
        'Sub-Agent Provisioned & Active',
        `Agent Code ${data.agent.agentCode} generated with ${data.agent.commissionRate}% commission base.`
      );
      setNewAgentName('');
      setNewAgentEmail('');
      setNewAgentPhone('');
      setNewAgentPassword('Agent2026Secure!');
      setNewAgentCommission('3.5');
      setNewAgentBalance('0');
      loadData();
    } catch (err: any) {
      onShowToast('error', 'Agent Creation Error', err.message);
    } finally {
      setIsCreatingAgent(false);
    }
  };

  // Open Edit Sub-Agent Modal
  const handleOpenEditAgent = (ag: UserAccount) => {
    setEditingAgent(ag);
    setEditAgentName(ag.fullName || '');
    setEditAgentEmail(ag.email || '');
    setEditAgentPhone(ag.phone || '');
    setEditAgentPassword('');
    setEditAgentCommission(String(ag.commissionRate || 3.5));
    setEditAgentStatus(ag.status === 'suspended' ? 'suspended' : 'active');
    setIsEditAgentModalOpen(true);
  };

  // Submit Sub-Agent Updates
  const handleUpdateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    if (!editAgentName.trim() || !editAgentEmail.trim() || !editAgentPhone.trim()) {
      onShowToast('error', 'Required Fields', 'Username, email, and phone number are required.');
      return;
    }

    setIsUpdatingAgent(true);
    try {
      const res = await fetch('/api/agents/update', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          agentId: editingAgent.id,
          fullName: editAgentName.trim(),
          email: editAgentEmail.trim(),
          phone: editAgentPhone.trim(),
          password: editAgentPassword.trim() ? editAgentPassword.trim() : undefined,
          commissionRate: parseFloat(editAgentCommission) || 3.5,
          status: editAgentStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update sub-agent account.');
      }

      onShowToast('success', 'Sub-Agent Account Updated', data.message || 'Account modified successfully.');
      setIsEditAgentModalOpen(false);
      loadData();
    } catch (err: any) {
      onShowToast('error', 'Update Error', err.message);
    } finally {
      setIsUpdatingAgent(false);
    }
  };

  // Open Live Order Tracking Modal
  const handleOpenTrackingModal = async (ord: OrderRecord) => {
    setTrackingOrder(ord);
    setIsTrackingModalOpen(true);
    setIsLoadingTracking(true);
    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(ord.reference || ord.orderNumber)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.timeline) {
          setTrackingTimeline(data.timeline);
        }
      }
    } catch (err) {
      console.warn('Failed to load tracking timeline:', err);
    } finally {
      setIsLoadingTracking(false);
    }
  };

  // Search & Track any order by Reference, Order #, Hubtel ID, or Phone
  const handleTrackByQuery = async (query: string) => {
    if (!query.trim()) {
      onShowToast('info', 'Enter Tracking Query', 'Please enter an order #, reference, Hubtel ID, or phone line.');
      return;
    }
    setIsSearchingTracking(true);
    setIsLoadingTracking(true);
    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.order) {
        throw new Error(data.error || 'No matching order found for tracking.');
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

  // Handle Payout Approval
  const handleApprovePayout = async (payoutId: string) => {
    try {
      const res = await fetch('/api/agents/payout-approve', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ payoutId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve payout.');
      }

      onShowToast('success', 'Payout Disbursed', data.message);
      loadData();
    } catch (err: any) {
      onShowToast('error', 'Payout Approval Error', err.message);
    }
  };

  // Save Gateway Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(settingsForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save gateway settings.');
      }

      onShowToast('success', 'Settings Updated', 'Paystack & Hubtel configurations updated.');
      loadData();
    } catch (err: any) {
      onShowToast('error', 'Settings Error', err.message);
    }
  };

  // Test CRM Webhook
  const handleTestCrmWebhook = async () => {
    if (!settingsForm.crmWebhookUrl) {
      onShowToast('warning', 'No Webhook URL', 'Please enter a CRM webhook URL first.');
      return;
    }

    setIsTestingCrm(true);
    try {
      const res = await fetch('/api/crm/test-webhook', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ webhookUrl: settingsForm.crmWebhookUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'CRM webhook test failed.');
      }

      onShowToast('success', 'CRM Webhook Online', data.message);
    } catch (err: any) {
      onShowToast('error', 'CRM Ping Failed', err.message);
    } finally {
      setIsTestingCrm(false);
    }
  };

  // Fulfill / Retry Carrier Dispatch for a transaction
  const handleFulfillTransaction = async (method: 'MANUAL' | 'RETRY_HUBTEL') => {
    if (!fulfillingTx) return;
    setIsFulfilling(true);
    try {
      const res = await fetch('/api/admin/transactions/fulfill', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          transactionId: fulfillingTx.id,
          method,
          manualReference: manualRefInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Fulfillment failed.');
      }

      onShowToast(
        'success',
        'Telecom Fulfillment Dispatched',
        data.message || 'The user SIM has been successfully credited and SMS notification sent.'
      );
      setFulfillingTx(null);
      setManualRefInput('');
      loadData();
    } catch (err: any) {
      onShowToast('error', 'Fulfillment Error', err.message);
    } finally {
      setIsFulfilling(false);
    }
  };

  // Test Hubtel Integration and Account Status
  const handleTestHubtel = async () => {
    setIsTestingHubtel(true);
    setHubtelDiag(null);
    try {
      const res = await fetch('/api/admin/test-hubtel', {
        method: 'POST',
        headers: getAdminHeaders(),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to run Hubtel diagnostics.');
      }

      setHubtelDiag(data.diagnostics);
      if (data.diagnostics?.commissionServices?.status === 'CONNECTED_READY') {
        onShowToast('success', 'Hubtel Ready', 'Hubtel Commission Services API authenticated and ready!');
      } else {
        onShowToast(
          'warning',
          'Hubtel Diagnostics Ready',
          data.diagnostics?.commissionServices?.message || 'Review account configuration below.'
        );
      }
    } catch (err: any) {
      onShowToast('error', 'Diagnostic Test Failed', err.message);
    } finally {
      setIsTestingHubtel(false);
    }
  };

  // Modify Administrator Profile & Credentials (Email & Password)
  const handleUpdateAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminFullName.trim() || !adminEmail.trim()) {
      onShowToast('error', 'Required Fields', 'Admin full name and email address are required.');
      return;
    }

    if (!adminEmail.includes('@') || !adminEmail.includes('.')) {
      onShowToast('error', 'Invalid Email', 'Please enter a valid administrator email address.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        onShowToast('error', 'Weak Password', 'New password must contain at least 6 characters.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        onShowToast('error', 'Password Mismatch', 'New password and confirmation password do not match.');
        return;
      }
    }

    setIsUpdatingProfile(true);
    try {
      const res = await fetch('/api/admin/profile/update', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          adminId: currentUser?.id,
          fullName: adminFullName.trim(),
          email: adminEmail.trim(),
          phone: adminPhone.trim(),
          currentPassword,
          newPassword: newPassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update administrator profile.');
      }

      onShowToast(
        'success',
        'Credentials Updated',
        data.message || 'Administrator details (email and password) updated successfully.'
      );
      if (data.user && onUpdateCurrentUser) {
        onUpdateCurrentUser(data.user);
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      loadData();
    } catch (err: any) {
      onShowToast('error', 'Update Failed', err.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getNetworkBadge = (net: NetworkOperator | string) => {
    const n = String(net).toUpperCase();
    if (n === 'MTN') return 'bg-amber-400 text-slate-950 font-extrabold';
    if (n === 'TELECEL') return 'bg-rose-600 text-white font-extrabold';
    return 'bg-blue-600 text-white font-extrabold';
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesNet =
      txNetworkFilter === 'ALL' || tx.network.toUpperCase() === txNetworkFilter.toUpperCase();
    const matchesStatus =
      txStatusFilter === 'ALL' || tx.paymentStatus.toLowerCase() === txStatusFilter.toLowerCase();
    const q = txSearch.toLowerCase();
    const matchesSearch =
      !txSearch ||
      tx.reference?.toLowerCase().includes(q) ||
      tx.recipientPhone?.includes(q) ||
      tx.customerEmail?.toLowerCase().includes(q) ||
      tx.packageName?.toLowerCase().includes(q) ||
      tx.hubtelTransactionId?.toLowerCase().includes(q);
    return matchesNet && matchesStatus && matchesSearch;
  });

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesNet =
      orderNetworkFilter === 'ALL' || o.network.toUpperCase() === orderNetworkFilter.toUpperCase();
    const matchesStatus =
      orderStatusFilter === 'ALL' ||
      o.carrierDispatchStatus.toUpperCase() === orderStatusFilter.toUpperCase();
    const q = orderSearch.toLowerCase();
    const matchesSearch =
      !orderSearch ||
      o.orderNumber?.toLowerCase().includes(q) ||
      o.recipientPhone?.includes(q) ||
      o.carrierReference?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.packageName?.toLowerCase().includes(q);
    return matchesNet && matchesStatus && matchesSearch;
  });

  return (
    <div id="admin-enterprise-view" className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Enterprise Title Banner with Real-Time Production & Firebase Indicators */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Platform Admin Dashboard
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              Production State: LIVE
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              Firebase Cloud Storage: Connected
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-['Outfit',sans-serif] text-white">
            Ghana Telecom Administration & Dispatch Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Real-time control center for live transactions, order fulfillment dispatch to customer
            phone lines, sub-agent provisioning, and carrier integrations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Refresh platform telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Now
          </button>
          <button
            id="quick-create-agent-nav-btn"
            onClick={() => setActiveAdminTab('CREATE_AGENT')}
            className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            Create Agent
          </button>

          {/* Admin Login / Re-auth Button - Accessible exclusively on Admin Dashboard by Admin */}
          {onOpenAuth && (
            <button
              id="admin-dashboard-login-btn"
              onClick={onOpenAuth}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Admin Login / Switch Account"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Login</span>
            </button>
          )}

          {/* Admin Logout Button - Accessible exclusively on Admin Dashboard by Admin */}
          {onLogout && (
            <button
              id="admin-dashboard-logout-btn"
              onClick={onLogout}
              className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-rose-100 text-xs font-bold rounded-xl border border-rose-800/80 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Logout Administrator Session"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Admin Logout</span>
            </button>
          )}

          {/* Overlay Sidebar Toggle Button */}
          <button
            id="admin-open-sidebar-btn"
            onClick={() => setIsSidebarOpen(true)}
            className="px-3 py-2 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Open Admin Overlay Sidebar"
          >
            <Menu className="w-4 h-4 text-amber-400" />
            <span>Admin Menu</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'ANALYTICS', label: 'Platform Overview', icon: Activity, count: null },
          {
            id: 'TRANSACTIONS',
            label: 'Transaction History',
            icon: Receipt,
            count: transactions.length,
          },
          {
            id: 'ORDERS',
            label: 'Order History & Dispatch',
            icon: ListOrdered,
            count: orders.length,
          },
          {
            id: 'CREATE_AGENT',
            label: 'Create Sub-Agent Portal',
            icon: Users,
            count: agents.length,
          },
          {
            id: 'PAYOUTS',
            label: 'Commission Payouts',
            icon: ArrowUpRight,
            count: payouts.filter((p) => p.status === 'pending').length,
          },
          { id: 'SETTINGS', label: 'Gateway & Dispatch Nodes', icon: Settings, count: null },
          { id: 'AUDIT', label: 'Audit Logs & Sentinel', icon: ShieldCheck, count: null },
          { id: 'PROFILE', label: 'Admin Profile & Credentials', icon: UserCog, count: null },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`admin-subtab-${tab.id}`}
              onClick={() => setActiveAdminTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? 'text-amber-400 dark:text-slate-950' : 'text-slate-500 dark:text-slate-400'
                }`}
              />
              <span>{tab.label}</span>
              {tab.count !== null && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    tab.id === 'PAYOUTS'
                      ? 'bg-amber-500 text-slate-950'
                      : isActive
                      ? 'bg-slate-800 text-amber-400 dark:bg-slate-900 dark:text-slate-100'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Pending / Failed Telecom Dispatch Alert Banner */}
      {transactions.filter((t) => t.paymentStatus === 'success' && t.dispatchStatus !== 'dispatched').length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 dark:border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Action Required: {transactions.filter((t) => t.paymentStatus === 'success' && t.dispatchStatus !== 'dispatched').length} Paid Order(s) Awaiting Airtime Credit
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Paystack payments were verified, but carrier telecom dispatch encountered an account configuration note or carrier queue. You can fulfill the airtime manually via MoMo/USSD or retry automated dispatch.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {transactions
                  .filter((t) => t.paymentStatus === 'success' && t.dispatchStatus !== 'dispatched')
                  .slice(0, 4)
                  .map((pTx) => (
                    <span
                      key={pTx.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      <span className="font-bold text-amber-500">{pTx.network}</span> {pTx.recipientPhone} (GH₵{pTx.amountGHS.toFixed(2)})
                      <button
                        onClick={() => {
                          setFulfillingTx(pTx);
                          setManualRefInput(`MM-${Date.now().toString().slice(-6)}`);
                        }}
                        className="ml-1 px-1.5 py-0.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-bold rounded cursor-pointer"
                      >
                        Fulfill Airtime &rarr;
                      </button>
                    </span>
                  ))}
              </div>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() => setActiveAdminTab('SETTINGS')}
              className="px-3.5 py-2 bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            >
              Configure Hubtel Account
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: ANALYTICS OVERVIEW & REVENUE BREAKDOWN */}
      {activeAdminTab === 'ANALYTICS' && analytics && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                Gross Platform Revenue
              </span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-['Outfit',sans-serif]">
                GH₵{analytics.totalRevenueGHS.toFixed(2)}
              </p>
              {selectedCurrency !== 'GHS' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                  ≈ {curr.symbol}
                  {(analytics.totalRevenueGHS / curr.rateToGHS).toFixed(2)} {selectedCurrency}
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                Total Orders Dispatched
              </span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-['Outfit',sans-serif]">
                {analytics.totalTransactions}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                {analytics.successfulTransactions} Instant Settlements (
                {analytics.totalTransactions > 0
                  ? ((analytics.successfulTransactions / analytics.totalTransactions) * 100).toFixed(
                      1
                    )
                  : 100}
                % Cleared)
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                Sub-Agent Network
              </span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-['Outfit',sans-serif]">
                {agents.length} Active Agents
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Generating retail volume & commissions
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                Commissions Disbursed
              </span>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 font-['Outfit',sans-serif]">
                GH₵{analytics.totalCommissionsPaidGHS.toFixed(2)}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                GH₵{analytics.pendingCommissionsGHS.toFixed(2)} pending in queue
              </p>
            </div>
          </div>

          {/* Carrier Revenue Share & Product Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Carrier Revenue Share
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                    <span className="text-amber-600 dark:text-amber-400">MTN Ghana</span>
                    <span>GH₵{analytics.networkBreakdown.MTN.toFixed(2)}</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{
                        width: `${
                          analytics.totalRevenueGHS > 0
                            ? (analytics.networkBreakdown.MTN / analytics.totalRevenueGHS) * 100
                            : 50
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                    <span className="text-rose-600 dark:text-rose-400">Telecel Ghana</span>
                    <span>GH₵{analytics.networkBreakdown.Telecel.toFixed(2)}</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{
                        width: `${
                          analytics.totalRevenueGHS > 0
                            ? (analytics.networkBreakdown.Telecel / analytics.totalRevenueGHS) * 100
                            : 30
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                    <span className="text-blue-600 dark:text-blue-400">AirtelTigo (AT)</span>
                    <span>GH₵{analytics.networkBreakdown.AirtelTigo.toFixed(2)}</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{
                        width: `${
                          analytics.totalRevenueGHS > 0
                            ? (analytics.networkBreakdown.AirtelTigo / analytics.totalRevenueGHS) * 100
                            : 20
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Product Volume Allocation
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                    <span className="text-slate-800 dark:text-slate-200">
                      High-Speed Data Bundles
                    </span>
                    <span>GH₵{analytics.serviceBreakdown.DATA.toFixed(2)}</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900 dark:bg-amber-400 rounded-full"
                      style={{
                        width: `${
                          analytics.totalRevenueGHS > 0
                            ? (analytics.serviceBreakdown.DATA / analytics.totalRevenueGHS) * 100
                            : 70
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                    <span className="text-slate-800 dark:text-slate-200">Flexi Airtime Top-Ups</span>
                    <span>GH₵{analytics.serviceBreakdown.AIRTIME.toFixed(2)}</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{
                        width: `${
                          analytics.totalRevenueGHS > 0
                            ? (analytics.serviceBreakdown.AIRTIME / analytics.totalRevenueGHS) * 100
                            : 30
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Real-time direct dispatch active: customer purchases credit recipient SIM lines
                  instantly.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTION HISTORY */}
      {activeAdminTab === 'TRANSACTIONS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Platform Transaction History ({filteredTransactions.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Full chronological ledger of payments processed via Paystack and mobile money
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Search reference, phone, email..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <select
                value={txNetworkFilter}
                onChange={(e) => setTxNetworkFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              >
                <option value="ALL">All Networks</option>
                <option value="MTN">MTN Ghana</option>
                <option value="Telecel">Telecel Ghana</option>
                <option value="AirtelTigo">AirtelTigo</option>
              </select>

              <select
                value={txStatusFilter}
                onChange={(e) => setTxStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="success">Success / Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px]">
                  <th className="pb-3">Reference & Date</th>
                  <th className="pb-3">Customer & Recipient</th>
                  <th className="pb-3">Network</th>
                  <th className="pb-3">Product Package</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Channel</th>
                  <th className="pb-3">Payment</th>
                  <th className="pb-3 text-right">Hubtel Dispatch Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No matching transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-200">
                            {tx.reference.slice(-10)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(tx.reference, tx.id)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            title="Copy full reference"
                          >
                            {copiedId === tx.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-400 block">
                          {new Date(tx.createdAt).toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {tx.recipientPhone}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate max-w-[140px] block">
                          {tx.customerEmail}
                        </span>
                      </td>

                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${getNetworkBadge(
                            tx.network
                          )}`}
                        >
                          {tx.network}
                        </span>
                      </td>

                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {tx.packageName}
                        {tx.dataVolume && (
                          <span className="block text-[11px] font-normal text-slate-400">
                            {tx.dataVolume}
                          </span>
                        )}
                      </td>

                      <td className="py-3 font-bold text-slate-900 dark:text-white font-mono">
                        GH₵{tx.amountGHS.toFixed(2)}
                      </td>

                      <td className="py-3 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        {tx.paymentMethod === 'PAYSTACK_MOMO'
                          ? 'MoMo'
                          : tx.paymentMethod === 'PAYSTACK_CARD'
                          ? 'Card'
                          : 'Wallet'}
                        {tx.agentCode && (
                          <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                            Agent: {tx.agentCode}
                          </span>
                        )}
                      </td>

                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            tx.paymentStatus === 'success'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : tx.paymentStatus === 'pending'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {tx.paymentStatus}
                        </span>
                        {tx.paymentStatus === 'success' && (
                          <span
                            className={`block mt-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              tx.dispatchStatus === 'dispatched'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : tx.dispatchStatus === 'failed'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            }`}
                          >
                            Airtime: {tx.dispatchStatus || 'pending'}
                          </span>
                        )}
                        {tx.failureReason && (
                          <span className="block mt-0.5 text-[9px] text-rose-500 max-w-[140px] truncate" title={tx.failureReason}>
                            {tx.failureReason}
                          </span>
                        )}
                      </td>

                      <td className="py-3 text-right">
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-[130px] ml-auto">
                          {tx.hubtelTransactionId || '—'}
                        </span>
                        {tx.paymentStatus === 'success' && tx.dispatchStatus !== 'dispatched' && (
                          <button
                            onClick={() => {
                              setFulfillingTx(tx);
                              setManualRefInput(`MM-${Date.now().toString().slice(-6)}`);
                            }}
                            className="mt-1 px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[10px] rounded-lg shadow-sm inline-flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <Zap className="w-3 h-3 text-slate-950" /> Fulfill Airtime
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ORDER HISTORY & CARRIER DISPATCH LOG */}
      {activeAdminTab === 'ORDERS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Carrier Fulfillment & Order History ({filteredOrders.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time tracking of telecom orders dispatched directly to customer phone lines
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Filter order #, phone line..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <select
                value={orderNetworkFilter}
                onChange={(e) => setOrderNetworkFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              >
                <option value="ALL">All Carriers</option>
                <option value="MTN">MTN Ghana</option>
                <option value="Telecel">Telecel Ghana</option>
                <option value="AirtelTigo">AirtelTigo</option>
              </select>

              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              >
                <option value="ALL">All Dispatches</option>
                <option value="DELIVERED">Delivered to SIM</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>

          {/* Quick Live Order Tracking Bar */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/30">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold font-['Outfit',sans-serif]">
                  Live Telecom Order Tracking & Carrier Audit
                </h3>
                <p className="text-[11px] text-slate-400">
                  Track any customer order across Paystack gateway clearance and Hubtel carrier dispatch.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={trackingSearchInput}
                onChange={(e) => setTrackingSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTrackByQuery(trackingSearchInput);
                }}
                placeholder="Enter Reference, Order #, or Phone..."
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-full sm:w-64"
              />
              <button
                type="button"
                onClick={() => handleTrackByQuery(trackingSearchInput)}
                disabled={isSearchingTracking || !trackingSearchInput.trim()}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0 transition-colors shadow-sm"
              >
                {isSearchingTracking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                <span>Track Order</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px]">
                  <th className="pb-3">Order Number</th>
                  <th className="pb-3">Recipient SIM Line</th>
                  <th className="pb-3">Carrier</th>
                  <th className="pb-3">Service & Package</th>
                  <th className="pb-3">Face Value</th>
                  <th className="pb-3">Dispatch Status</th>
                  <th className="pb-3">Carrier Reference</th>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No order fulfillment records available.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr
                      key={ord.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {ord.orderNumber}
                      </td>

                      <td className="py-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                          {ord.recipientPhone}
                        </span>
                        <span className="text-[11px] text-slate-400 block">{ord.customerName}</span>
                      </td>

                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${getNetworkBadge(
                            ord.network
                          )}`}
                        >
                          {ord.network}
                        </span>
                      </td>

                      <td className="py-3 font-medium text-slate-800 dark:text-slate-200">
                        {ord.packageName}
                        {ord.dataVolume && (
                          <span className="block text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            {ord.dataVolume}
                          </span>
                        )}
                      </td>

                      <td className="py-3 font-bold font-mono text-slate-900 dark:text-white">
                        GH₵{ord.amountGHS.toFixed(2)}
                      </td>

                      <td className="py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                            ord.carrierDispatchStatus === 'DELIVERED' ||
                            ord.carrierDispatchStatus === 'DISPATCHED'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {ord.carrierDispatchStatus}
                        </span>
                      </td>

                      <td className="py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {ord.carrierReference}
                      </td>

                      <td className="py-3 text-[11px] text-slate-400">
                        {new Date(ord.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenTrackingModal(ord)}
                          className="px-2.5 py-1 bg-amber-400/20 hover:bg-amber-400 text-amber-900 dark:text-amber-300 hover:text-slate-950 font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer shadow-sm"
                          title="View live fulfillment timeline & telecom trace"
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
      )}

      {/* TAB 4: CREATE SUB-AGENT PORTAL */}
      {activeAdminTab === 'CREATE_AGENT' && (
        <div className="space-y-6">
          {/* Sub-Agent Provisioning Form Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5 transition-colors">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <PlusCircle className="w-5 h-5 text-amber-500" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Create Sub-Agent Portal
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provision new retail sub-agents with custom commission bases and immediate MoMo
                  settlement access
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Agent Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="e.g. Kwame Mensah (Madina Branch)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Agent Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={newAgentEmail}
                    onChange={(e) => setNewAgentEmail(e.target.value)}
                    placeholder="agent@telecom.com.gh"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ghana Phone (MoMo Number) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newAgentPhone}
                    onChange={(e) => setNewAgentPhone(e.target.value)}
                    placeholder="0244123456"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAgentPassword}
                    onChange={(e) => setNewAgentPassword(e.target.value)}
                    placeholder="e.g. Agent2026Secure!"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newAgentCommission}
                    onChange={(e) => setNewAgentCommission(e.target.value)}
                    placeholder="3.5"
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Float Balance (GH₵)
                  </label>
                  <input
                    type="number"
                    value={newAgentBalance}
                    onChange={(e) => setNewAgentBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isCreatingAgent}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingAgent ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Provisioning...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" /> Provision & Activate Sub-Agent
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Directory of Provisioned Sub-Agents */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Active Sub-Agent Network ({agents.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage sub-agent codes, earned commissions, and float balances
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px]">
                    <th className="pb-3">Sub-Agent</th>
                    <th className="pb-3">Agent Code</th>
                    <th className="pb-3">Commission Rate</th>
                    <th className="pb-3">Float Balance</th>
                    <th className="pb-3">Commissions Earned</th>
                    <th className="pb-3">Security & 2FA</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {agents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400">
                        No sub-agents provisioned yet. Use the form above to create the first agent.
                      </td>
                    </tr>
                  ) : (
                    agents.map((ag) => (
                      <tr
                        key={ag.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {ag.fullName}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            {ag.phone} • {ag.email}
                          </span>
                        </td>

                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-mono font-bold text-amber-800 dark:text-amber-400">
                              {ag.agentCode || 'N/A'}
                            </span>
                            {ag.agentCode && (
                              <button
                                onClick={() => copyToClipboard(ag.agentCode!, ag.id)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                title="Copy code"
                              >
                                {copiedId === ag.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-3 font-bold text-emerald-700 dark:text-emerald-400">
                          {ag.commissionRate || 3.5}%
                        </td>

                        <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                          GH₵{ag.balanceGHS.toFixed(2)}
                        </td>

                        <td className="py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          GH₵{(ag.commissionEarnedGHS || 0).toFixed(2)}
                        </td>

                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5" /> 2FA Active
                          </span>
                        </td>

                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ag.status === 'suspended'
                              ? 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          }`}>
                            {ag.status}
                          </span>
                        </td>

                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEditAgent(ag)}
                            className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] rounded-lg shadow-sm inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="Modify username, password, email & phone"
                          >
                            <UserCog className="w-3.5 h-3.5" />
                            <span>Modify</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: COMMISSION PAYOUT APPROVALS */}
      {activeAdminTab === 'PAYOUTS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Sub-Agent Commission Payout Queue
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review and approve instant withdrawals to Mobile Money or Banks
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {payouts.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-8 text-center">
                No commission payout requests logged.
              </p>
            ) : (
              payouts.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        GH₵{p.amountGHS.toFixed(2)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          p.status === 'paid'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-1">
                      Agent: {p.agentName} ({p.agentPhone})
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Destination: {p.paymentMethod.replace('_', ' ')} • {p.accountNumber} (
                      {p.accountName})
                    </p>
                  </div>

                  {p.status === 'pending' ? (
                    <button
                      onClick={() => handleApprovePayout(p.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Disburse MoMo
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Completed: {new Date(p.processedAt || p.requestedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: GATEWAYS, CLOUD STORAGE & CRM SETTINGS */}
      {activeAdminTab === 'SETTINGS' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Cloud Storage & Production Status Badge */}
          <div className="p-4 bg-sky-50 dark:bg-sky-950/40 rounded-2xl border border-sky-200 dark:border-sky-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  Firebase Cloud Firestore Database Connected
                </p>
                <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                  Database ID: ai-studio-ghanatelecomairt-9025fb87-d614-4a7e-b2dd-0a3e89ed09a7
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Real-time Synchronized
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Paystack Payment Gateway Config */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                    Paystack Payment Gateway
                  </h3>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.isPaystackLive}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, isPaystackLive: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-500 rounded"
                  />
                  Production Live Mode
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Paystack Public Key
                </label>
                <input
                  type="text"
                  value={settingsForm.paystackPublicKey}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, paystackPublicKey: e.target.value })
                  }
                  placeholder="pk_live_xxxx"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Paystack Secret Key (Encrypted at Rest)
                </label>
                <input
                  type="password"
                  value={settingsForm.paystackSecretKey}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, paystackSecretKey: e.target.value })
                  }
                  placeholder="sk_live_xxxx"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                Live Webhook URL:{' '}
                <code className="text-slate-800 dark:text-slate-200 font-mono font-bold">
                  /api/paystack/webhook
                </code>
              </div>
            </div>

            {/* Hubtel Telecom Dispatch API Config */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                    Hubtel Telecom Dispatch API
                  </h3>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.isHubtelLive}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, isHubtelLive: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-500 rounded"
                  />
                  Live Dispatch Node
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hubtel Client ID
                </label>
                <input
                  type="text"
                  value={settingsForm.hubtelClientId}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, hubtelClientId: e.target.value })
                  }
                  placeholder="hbtl_live_telecom_gh"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hubtel Client Secret
                </label>
                <input
                  type="password"
                  value={settingsForm.hubtelClientSecret}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, hubtelClientSecret: e.target.value })
                  }
                  placeholder="Hubtel API Secret Key"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hubtel Prepaid Account Number (4-6 digit numeric account, NOT phone number)
                </label>
                <input
                  type="text"
                  value={settingsForm.hubtelMerchantAccount}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, hubtelMerchantAccount: e.target.value })
                  }
                  placeholder="e.g. 11691 or 2019944 (from portal.hubtel.com -> Wallets)"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
                <div className="mt-1.5 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Important:</strong> Hubtel Commission Services for real-time Airtime/Data top-ups requires your 4 to 6 digit numeric Prepaid Account ID (e.g. <code>11691</code>). If you enter a phone number like <code>0552727299</code>, Hubtel rejects the transaction with <strong>Error 4101: Could not find Prepaid account</strong>.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hubtel SMS Sender ID
                </label>
                <input
                  type="text"
                  value={settingsForm.hubtelSenderId}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, hubtelSenderId: e.target.value })
                  }
                  placeholder="Azigizaro"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Diagnostic Test Button & Output */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Carrier Connection Status
                  </span>
                  <button
                    type="button"
                    onClick={handleTestHubtel}
                    disabled={isTestingHubtel}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTestingHubtel ? 'animate-spin' : ''}`} />
                    Test Hubtel Connection & Account
                  </button>
                </div>

                {hubtelDiag && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-700 dark:text-slate-300">Commission Services Node:</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                          hubtelDiag.commissionServices?.status === 'CONNECTED_READY'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {hubtelDiag.commissionServices?.status}
                      </span>
                    </div>
                    {hubtelDiag.commissionServices?.message && (
                      <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                        {hubtelDiag.commissionServices.message}
                      </p>
                    )}
                    {hubtelDiag.recommendations && hubtelDiag.recommendations.length > 0 && (
                      <div className="pt-1 text-[11px] text-amber-600 dark:text-amber-400">
                        {hubtelDiag.recommendations.map((r: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-1">
                            <span>&bull;</span>
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CRM & Default Commission Settings */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Third-Party CRM Tool Integration & Security Protocols
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CRM Webhook Endpoint (HubSpot, Zoho CRM, Salesforce, or Custom Webhook)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={settingsForm.crmWebhookUrl}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, crmWebhookUrl: e.target.value })
                    }
                    placeholder="https://api.yourcrm.com/v1/webhook/contacts"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleTestCrmWebhook}
                    disabled={isTestingCrm}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    {isTestingCrm ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Send Test Ping
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Automatically transmits new customer signups and purchase telemetry payloads in
                  real-time.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Sub-Agent Commission Base (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settingsForm.defaultCommissionRate}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      defaultCommissionRate: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>AES-256-GCM Encryption At Rest active across all payment and phone records</span>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Save Production Settings
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 7: AUDIT LOGS & SECURITY SENTINEL */}
      {activeAdminTab === 'AUDIT' && (
        <AuditLogsView
          currentUser={currentUser}
          authToken={authToken}
          onShowToast={onShowToast}
        />
      )}

      {/* TAB 8: ADMINISTRATOR PROFILE & CREDENTIALS (EMAIL & PASSWORD) */}
      {activeAdminTab === 'PROFILE' && (
        <div className="space-y-6">
          {/* Security Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                    <UserCog className="w-3.5 h-3.5" /> Root Administrator
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> AES-256-GCM Encrypted
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">
                  Administrator Profile & Credentials
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Modify your primary administrator access credentials, including administrator email and password.
                  All changes are cryptographically audited and take effect instantly.
                </p>
              </div>

              {/* Quick Admin Actions */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {onOpenAuth && (
                  <button
                    onClick={onOpenAuth}
                    className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-amber-400" />
                    Admin Login / Re-Auth
                  </button>
                )}
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="px-3.5 py-2.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-bold text-xs rounded-xl border border-rose-800/80 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    Admin Logout
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Admin Identity Summary */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-500 flex items-center justify-center font-bold text-lg border border-amber-400/30">
                    <UserCog className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {currentUser?.fullName || 'Root Administrator'}
                    </h3>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-mono font-semibold">
                      ROLE: {currentUser?.role}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400">Admin ID:</span>
                    <span className="font-mono text-slate-900 dark:text-white font-semibold">
                      {currentUser?.id || 'admin-root'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400">Current Email:</span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                      {currentUser?.email}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400">Registered Phone:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {currentUser?.phone || '0247946116'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400">Account Status:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      ACTIVE & VERIFIED
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-500 dark:text-slate-400">Two-Factor Auth:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                      MFA ENFORCED
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Guidance Note */}
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-5 border border-amber-200 dark:border-amber-800/60 text-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Credential Security Protocol</span>
                </div>
                <p className="text-amber-900/80 dark:text-amber-200/80 leading-relaxed text-[11px]">
                  Updating your email requires a valid formatted email address. Updating your password requires your current password for security authorization. Ensure your password is at least 6 characters and stored safely.
                </p>
              </div>
            </div>

            {/* Right Column: Credential Edit Form */}
            <div className="lg:col-span-2">
              <form
                onSubmit={handleUpdateAdminProfile}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
              >
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-amber-500" />
                    Modify Administrator Details
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Update admin full name, administrator email address, phone, and password.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Administrator Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={adminFullName}
                      onChange={(e) => setAdminFullName(e.target.value)}
                      placeholder="e.g. Abdul Razak Sugri A Aziz"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  {/* Admin Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Administrator Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@ghanatelecom.com.gh"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white font-medium"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Used for administrative authentication and 2FA alerts
                    </p>
                  </div>

                  {/* Admin Phone */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Administrator Contact Phone (MoMo Enabled)
                    </label>
                    <input
                      type="tel"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      placeholder="0247946116"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                {/* Password Modification Section */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-500" />
                      Update Administrator Password
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Leave new password fields blank if you only want to update your email or personal details.
                    </p>
                  </div>

                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Current Admin Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password to verify identity"
                        className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                        title={showCurrentPassword ? 'Hide password' : 'Show password'}
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* New Password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        New Admin Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                          title={showNewPassword ? 'Hide password' : 'Show password'}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Confirm New Admin Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Re-type new password"
                          className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Submit & Reset Actions */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Instant database & session synchronization</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="w-full sm:w-auto px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingProfile ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    )}
                    Save Admin Details & Credentials
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY SIDEBAR FOR ADMIN DASHBOARD */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity cursor-pointer"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
            <div className="w-screen max-w-sm sm:max-w-md pointer-events-auto bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto">
              {/* Sidebar Header */}
              <div className="p-5 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-400 text-slate-950 rounded-xl font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Administrator Overlay Menu</h3>
                    <p className="text-[11px] text-amber-400 font-mono">Platform Admin Privileges</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sidebar Content */}
              <div className="p-5 space-y-5 flex-1">
                {/* Active Admin Profile Card */}
                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-500 flex items-center justify-center font-bold">
                      <UserCog className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {currentUser?.fullName || 'Root Admin'}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                        {currentUser?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-500 border border-amber-400/30">
                      SUPER ADMIN
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ACTIVE
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      2FA PROTECTED
                    </span>
                  </div>
                </div>

                {/* Navigation Sections */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Dashboard Sections
                  </h4>
                  <div className="space-y-1">
                    {[
                      { id: 'ANALYTICS', label: 'Platform Overview', icon: Activity },
                      { id: 'TRANSACTIONS', label: 'Transaction History', icon: Receipt },
                      { id: 'ORDERS', label: 'Order History & Dispatch', icon: ListOrdered },
                      { id: 'CREATE_AGENT', label: 'Create Sub-Agent Portal', icon: Users },
                      { id: 'PAYOUTS', label: 'Commission Payouts', icon: ArrowUpRight },
                      { id: 'SETTINGS', label: 'Gateway & Dispatch Nodes', icon: Settings },
                      { id: 'AUDIT', label: 'Audit Logs & Sentinel', icon: ShieldCheck },
                      { id: 'PROFILE', label: 'Admin Profile & Credentials', icon: UserCog },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isActive = activeAdminTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveAdminTab(item.id as any);
                            setIsSidebarOpen(false);
                          }}
                          className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                            isActive
                              ? 'bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 shadow-sm'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400 dark:text-slate-950' : 'text-slate-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          {isActive && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sidebar Footer: Admin Actions (Login & Logout) */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <button
                  onClick={() => {
                    setActiveAdminTab('PROFILE');
                    setIsSidebarOpen(false);
                  }}
                  className="w-full py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  Modify Admin Email / Password
                </button>

                {onOpenAuth && (
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-amber-400" />
                    Admin Login / Re-Authenticate
                  </button>
                )}

                {onLogout && (
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      onLogout();
                    }}
                    className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <LogOut className="w-4 h-4 text-white" />
                    Admin Logout
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL TELECOM FULFILLMENT & CARRIER DISPATCH */}
      {fulfillingTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400 text-slate-950 rounded-xl">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Telecom Airtime Fulfillment</h3>
                  <p className="text-xs text-slate-400">Direct carrier credit & confirmation dispatch</p>
                </div>
              </div>
              <button
                onClick={() => setFulfillingTx(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Order Info Summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Recipient Phone:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {fulfillingTx.recipientPhone}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Carrier Network:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${getNetworkBadge(
                      fulfillingTx.network
                    )}`}
                  >
                    {fulfillingTx.network}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Recharge Amount:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    GH₵{fulfillingTx.amountGHS.toFixed(2)}{' '}
                    {fulfillingTx.serviceType === 'DATA' && `(${fulfillingTx.dataVolume})`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Payment Status:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Paid via Paystack ({fulfillingTx.paystackReference?.slice(0, 14)}...)
                  </span>
                </div>
                {fulfillingTx.failureReason && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">
                    <span className="font-bold">Carrier Note:</span> {fulfillingTx.failureReason}
                  </div>
                )}
              </div>

              {/* Action 1: Manual Fulfillment via MoMo / Agent SIM */}
              <div className="p-4 bg-white dark:bg-slate-800/40 rounded-2xl border-2 border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Method 1: Manual Disbursal (MoMo *170# / Agent SIM)
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Send GH₵{fulfillingTx.amountGHS.toFixed(2)} to <strong>{fulfillingTx.recipientPhone}</strong> using your phone (e.g. MTN MoMo <code>*170#</code> &rarr; Transfer/Airtime for others), then enter the carrier transaction reference below.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Carrier / MoMo Transaction ID
                  </label>
                  <input
                    type="text"
                    value={manualRefInput}
                    onChange={(e) => setManualRefInput(e.target.value)}
                    placeholder="e.g. 2389104829 or MM-7168"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  onClick={() => handleFulfillTransaction('MANUAL')}
                  disabled={isFulfilling}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {isFulfilling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Confirm Disbursed & Send Receipt SMS
                </button>
              </div>

              {/* Action 2: Retry Hubtel Automated Node */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-sky-500" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Method 2: Retry Hubtel Automated API
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Retry automated dispatch directly to Hubtel&apos;s carrier endpoint.
                </p>
                <button
                  onClick={() => handleFulfillTransaction('RETRY_HUBTEL')}
                  disabled={isFulfilling}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-amber-400 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {isFulfilling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Retry Hubtel Top-Up API
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setFulfillingTx(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SUB-AGENT ACCOUNT MODIFICATION */}
      {isEditAgentModalOpen && editingAgent && (
        <div
          id="admin-edit-agent-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
            {/* Header */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base font-['Outfit',sans-serif]">
                    Modify Sub-Agent Account
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Code: <span className="text-amber-400 font-bold">{editingAgent.agentCode}</span> • ID: {editingAgent.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditAgentModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateAgent} className="p-6 space-y-4">
              {/* Username / Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sub-Agent Username / Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editAgentName}
                  onChange={(e) => setEditAgentName(e.target.value)}
                  placeholder="e.g. Kwame Mensah"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editAgentEmail}
                  onChange={(e) => setEditAgentEmail(e.target.value)}
                  placeholder="agent@ghanatelecom.com.gh"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    value={editAgentPhone}
                    onChange={(e) => setEditAgentPhone(e.target.value)}
                    placeholder="e.g. 0552727299"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Password (Optional Reset) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Reset Password
                  </label>
                  <span className="text-[11px] text-slate-400">Leave blank to keep unchanged</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editAgentPassword}
                    onChange={(e) => setEditAgentPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 chars)"
                    className="w-full pl-9 pr-10 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Commission Rate & Status */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={editAgentCommission}
                    onChange={(e) => setEditAgentCommission(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Account Status
                  </label>
                  <select
                    value={editAgentStatus}
                    onChange={(e) => setEditAgentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="active">Active (Permitted)</option>
                    <option value="suspended">Suspended (Blocked)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditAgentModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingAgent}
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingAgent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save Account Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LIVE TELECOM ORDER TRACKING & FULFILLMENT AUDIT */}
      {isTrackingModalOpen && trackingOrder && (
        <div
          id="admin-order-tracking-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
            {/* Header */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base font-['Outfit',sans-serif]">
                      Live Order Tracking & Trace
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getNetworkBadge(trackingOrder.network)}`}>
                      {trackingOrder.network}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Order: <strong className="text-white">{trackingOrder.orderNumber}</strong> • Ref: {trackingOrder.reference}
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
              {/* Order Status Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Recipient SIM
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white block mt-0.5">
                    {trackingOrder.recipientPhone}
                  </span>
                  <span className="text-[10px] text-slate-400">{trackingOrder.customerName}</span>
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
                  <span className="text-[10px] text-slate-400">{trackingOrder.paymentMethod.replace('PAYSTACK_', '')}</span>
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

              {/* Real-Time Fulfillment Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-500" />
                    Telecom Fulfillment Trace
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
                      description: `Order initialized via ${trackingOrder.network} MoMo. Reference: ${trackingOrder.reference}.`,
                    },
                    {
                      step: 2,
                      title: 'Payment Clearance',
                      time: trackingOrder.completedAt || trackingOrder.createdAt,
                      status: trackingOrder.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
                      description: trackingOrder.status === 'COMPLETED' ? `GH₵${trackingOrder.amountGHS.toFixed(2)} settled via Paystack.` : 'Awaiting confirmation.',
                    },
                    {
                      step: 3,
                      title: 'Carrier Switch Node Processing',
                      time: trackingOrder.completedAt || trackingOrder.createdAt,
                      status: trackingOrder.carrierDispatchStatus === 'DELIVERED' || trackingOrder.carrierDispatchStatus === 'DISPATCHED' ? 'COMPLETED' : 'PENDING',
                      description: `Routing to ${trackingOrder.network} telecom exchange via Hubtel carrier pipe.`,
                    },
                    {
                      step: 4,
                      title: 'Delivered to Recipient SIM',
                      time: trackingOrder.completedAt || trackingOrder.createdAt,
                      status: trackingOrder.carrierDispatchStatus === 'DELIVERED' || trackingOrder.carrierDispatchStatus === 'DISPATCHED' ? 'COMPLETED' : 'PENDING',
                      description: `${trackingOrder.packageName} credited to ${trackingOrder.recipientPhone}. Ref: ${trackingOrder.carrierReference}.`,
                    },
                  ]).map((t: any, idx: number) => {
                    const isDone = t.status === 'COMPLETED';
                    const isFailed = t.status === 'FAILED';
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                          isDone
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                            : isFailed
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isFailed
                            ? 'bg-rose-500 text-white'
                            : 'bg-amber-400 text-slate-950 font-bold'
                        }`}>
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> : isFailed ? <AlertTriangle className="w-4 h-4" /> : <span className="text-xs">{t.step || idx + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                              {t.title}
                            </h5>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {t.time ? new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
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

              {/* Technical Trace Data */}
              <div className="p-3.5 rounded-2xl bg-slate-900 dark:bg-slate-950 text-slate-300 font-mono text-[11px] space-y-1.5 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800 text-[10px]">
                  <span>TECHNICAL AUDIT TRACE</span>
                  <span className="text-emerald-400">LEDGER VERIFIED</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hubtel Transaction ID:</span>
                  <span className="text-white font-bold">{trackingOrder.carrierReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Order Reference:</span>
                  <span className="text-amber-400 font-bold">{trackingOrder.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sub-Agent Code:</span>
                  <span className="text-sky-400 font-bold">{trackingOrder.agentCode || 'DIRECT_PORTAL'}</span>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `[Ghana Telecom Order Verification]\nOrder #: ${trackingOrder.orderNumber}\nReference: ${trackingOrder.reference}\nRecipient: ${trackingOrder.recipientPhone}\nPackage: ${trackingOrder.packageName}\nCarrier: ${trackingOrder.network}\nStatus: ${trackingOrder.carrierDispatchStatus}\nHubtel ID: ${trackingOrder.carrierReference}`
                    );
                    onShowToast('info', 'Copied to Clipboard', 'Full order verification receipt copied.');
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Verification Trace</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTrackByQuery(trackingOrder.reference || trackingOrder.orderNumber)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTracking ? 'animate-spin' : ''}`} />
                    <span>Refresh Trace</span>
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
