import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Wifi,
  PhoneCall,
  CheckCircle2,
  Sparkles,
  Zap,
  Tag,
  Search,
  ArrowRight,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import {
  NetworkOperator,
  ServiceType,
  TelecomPackage,
  CurrencyCode,
  UserAccount,
  Transaction,
} from '../types';
import { TELECOM_PACKAGES, GHANA_CURRENCIES, detectNetworkFromPhone } from '../data/telecomCatalog';
import { PurchaseModal } from './PurchaseModal';

interface TelecomStoreProps {
  selectedCurrency: CurrencyCode;
  currentUser: UserAccount | null;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
  onTransactionSuccess: (tx: Transaction) => void;
}

export const TelecomStore: React.FC<TelecomStoreProps> = ({
  selectedCurrency,
  currentUser,
  onShowToast,
  onTransactionSuccess,
}) => {
  const [network, setNetwork] = useState<NetworkOperator>('MTN');
  const [serviceType, setServiceType] = useState<ServiceType>('DATA');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [airtimeAmountGHS, setAirtimeAmountGHS] = useState<number>(20);
  const [customAirtimeInput, setCustomAirtimeInput] = useState<string>('20');
  const [selectedPackage, setSelectedPackage] = useState<TelecomPackage | null>(null);
  const [agentCode, setAgentCode] = useState<string>(currentUser?.role === 'AGENT' ? currentUser.agentCode || '' : '');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const curr = GHANA_CURRENCIES[selectedCurrency] || GHANA_CURRENCIES.GHS;

  // Auto-detect network from phone
  useEffect(() => {
    if (recipientPhone.length >= 3) {
      const detected = detectNetworkFromPhone(recipientPhone);
      if (detected && detected !== network) {
        setNetwork(detected);
        onShowToast(
          'info',
          'Network Auto-Detected',
          `Selected ${detected} Ghana network based on mobile prefix.`
        );
      }
    }
  }, [recipientPhone]);

  // Packages filtered by network & search & category
  const filteredPackages = TELECOM_PACKAGES.filter((pkg) => {
    if (pkg.network !== network || pkg.type !== 'DATA') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = pkg.name.toLowerCase().includes(q);
      const matchVol = pkg.dataVolume?.toLowerCase().includes(q);
      const matchDesc = pkg.description.toLowerCase().includes(q);
      if (!matchName && !matchVol && !matchDesc) return false;
    }

    if (filterCategory === 'DAILY') {
      return pkg.validity.toLowerCase().includes('hour') || (pkg.validity.toLowerCase().includes('day') && !pkg.validity.toLowerCase().includes('30'));
    }
    if (filterCategory === 'WEEKLY') {
      return pkg.validity.toLowerCase().includes('7 day') || pkg.validity.toLowerCase().includes('week');
    }
    if (filterCategory === 'MONTHLY') {
      return pkg.validity.toLowerCase().includes('30') || pkg.validity.toLowerCase().includes('month');
    }
    if (filterCategory === 'NO_EXPIRY') {
      return pkg.validity.toLowerCase().includes('no expiry') || pkg.validity.toLowerCase().includes('lifetime');
    }
    if (filterCategory === 'BROADBAND') {
      return pkg.priceGHS >= 100 || pkg.name.toLowerCase().includes('turbonet') || pkg.name.toLowerCase().includes('broadband');
    }

    return true;
  });

  // Set initial selected package when packages change
  useEffect(() => {
    if (filteredPackages.length > 0 && (!selectedPackage || selectedPackage.network !== network)) {
      setSelectedPackage(filteredPackages[0]);
    }
  }, [network, filterCategory]);

  const handleAirtimePreset = (amt: number) => {
    setAirtimeAmountGHS(amt);
    setCustomAirtimeInput(amt.toString());
  };

  const handleCustomAirtimeChange = (val: string) => {
    setCustomAirtimeInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setAirtimeAmountGHS(num);
    }
  };

  const openCheckout = () => {
    if (!recipientPhone || recipientPhone.length < 9) {
      onShowToast('warning', 'Recipient Phone Required', 'Please enter a valid Ghana mobile number.');
      return;
    }
    if (serviceType === 'AIRTIME' && (!airtimeAmountGHS || airtimeAmountGHS < 1)) {
      onShowToast('warning', 'Invalid Amount', 'Minimum airtime purchase is GH₵1.00.');
      return;
    }
    if (serviceType === 'DATA' && !selectedPackage) {
      onShowToast('warning', 'Select Bundle', 'Please choose a data bundle package.');
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <div id="telecom-store-desk" className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      {/* Top Banner / Hero */}
      <div className="bg-slate-900 dark:bg-slate-900 text-white rounded-3xl p-6 sm:p-8 mb-8 border border-slate-800 relative overflow-hidden shadow-2xl transition-colors">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/15 border border-amber-400/30 rounded-full text-amber-300 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Ghana Instant Telecom Dispatch
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-['Outfit',sans-serif] text-white">
            High-Speed Data & Airtime Top-Up
          </h2>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Real-life instantaneous settlement via Paystack and automated dispatch through Hubtel.
            Recharge any MTN, Telecel, or AirtelTigo number in seconds.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Controls & Input Desk (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 flex items-center justify-center text-xs font-bold">1</span>
              Select Network Operator
            </h3>

            {/* Network Selector Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {/* MTN */}
              <button
                type="button"
                id="select-network-mtn"
                onClick={() => setNetwork('MTN')}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                  network === 'MTN'
                    ? 'border-amber-500 bg-amber-400 text-slate-950 font-bold shadow-md ring-2 ring-amber-400'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-black text-xs mb-1.5 shadow-sm ${
                  network === 'MTN' ? 'bg-slate-950 text-amber-400' : 'bg-amber-400 text-slate-950'
                }`}>
                  MTN
                </div>
                <span className="block font-bold text-xs">MTN Ghana</span>
                <span className={`text-[10px] ${network === 'MTN' ? 'text-slate-900 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>4G+ / 5G</span>
                {network === 'MTN' && (
                  <CheckCircle2 className="w-4 h-4 text-slate-950 absolute top-1.5 right-1.5" />
                )}
              </button>

              {/* Telecel */}
              <button
                type="button"
                id="select-network-telecel"
                onClick={() => setNetwork('Telecel')}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                  network === 'Telecel'
                    ? 'border-red-700 bg-red-600 text-white font-bold shadow-md ring-2 ring-red-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-black text-xs mb-1.5 shadow-sm ${
                  network === 'Telecel' ? 'bg-white text-red-600' : 'bg-red-600 text-white'
                }`}>
                  TC
                </div>
                <span className="block font-bold text-xs">Telecel</span>
                <span className={`text-[10px] ${network === 'Telecel' ? 'text-red-100 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>Vodafone Red</span>
                {network === 'Telecel' && (
                  <CheckCircle2 className="w-4 h-4 text-white absolute top-1.5 right-1.5" />
                )}
              </button>

              {/* AirtelTigo */}
              <button
                type="button"
                id="select-network-at"
                onClick={() => setNetwork('AirtelTigo')}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                  network === 'AirtelTigo'
                    ? 'border-blue-700 bg-blue-600 text-white font-bold shadow-md ring-2 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-black text-xs mb-1.5 shadow-sm ${
                  network === 'AirtelTigo' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                }`}>
                  AT
                </div>
                <span className="block font-bold text-xs">AirtelTigo</span>
                <span className={`text-[10px] ${network === 'AirtelTigo' ? 'text-blue-100 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>No Expiry</span>
                {network === 'AirtelTigo' && (
                  <CheckCircle2 className="w-4 h-4 text-white absolute top-1.5 right-1.5" />
                )}
              </button>
            </div>

            {/* Service Type Switcher (Airtime vs Data) */}
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 flex items-center justify-center text-xs font-bold">2</span>
              Product Service
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                id="service-toggle-data"
                onClick={() => setServiceType('DATA')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                  serviceType === 'DATA'
                    ? 'border-slate-900 dark:border-amber-400 bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 shadow-md font-bold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                <Wifi className={`w-5 h-5 ${serviceType === 'DATA' ? 'text-amber-400 dark:text-slate-950' : 'text-slate-400'}`} />
                <div className="text-left">
                  <p className="text-xs font-bold">Data Bundle</p>
                  <p className={`text-[10px] ${serviceType === 'DATA' ? 'text-slate-300 dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}>
                    Flexi & Monthly Plans
                  </p>
                </div>
              </button>

              <button
                type="button"
                id="service-toggle-airtime"
                onClick={() => setServiceType('AIRTIME')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                  serviceType === 'AIRTIME'
                    ? 'border-slate-900 dark:border-amber-400 bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 shadow-md font-bold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                <PhoneCall className={`w-5 h-5 ${serviceType === 'AIRTIME' ? 'text-amber-400 dark:text-slate-950' : 'text-slate-400'}`} />
                <div className="text-left">
                  <p className="text-xs font-bold">Flexi Airtime</p>
                  <p className={`text-[10px] ${serviceType === 'AIRTIME' ? 'text-slate-300 dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}>
                    Voice & SMS Credit
                  </p>
                </div>
              </button>
            </div>

            {/* Recipient Phone Input */}
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 flex items-center justify-center text-xs font-bold">3</span>
              Recipient Phone Number
            </h3>

            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">🇬🇭 +233</span>
              </div>
              <input
                id="recipient-phone-input"
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="024 123 4567"
                maxLength={12}
                className="w-full pl-20 pr-10 py-2.5 text-base font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white"
              />
              <Smartphone className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
            </div>

            {/* Sub-Agent Referral Code Field */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Sub-Agent Referral Code (Optional)
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Commission Support</span>
              </div>
              <input
                id="store-agent-code-input"
                type="text"
                value={agentCode}
                onChange={(e) => setAgentCode(e.target.value.toUpperCase())}
                placeholder="e.g. AGT-001"
                className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 uppercase"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Purchases tagged with an agent code credit their commission wallet instantly on completion.
              </p>
            </div>

            {/* Airtime Custom Amount (Only when Airtime is chosen) */}
            {serviceType === 'AIRTIME' && (
              <div className="space-y-3 mb-6">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Recharge Amount (GH₵)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 20, 50, 100, 200].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      id={`airtime-preset-${amt}`}
                      onClick={() => handleAirtimePreset(amt)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        airtimeAmountGHS === amt
                          ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      GH₵{amt}
                    </button>
                  ))}
                </div>

                <div className="relative pt-2">
                  <span className="absolute inset-y-0 left-0 pl-3 pt-2 flex items-center font-bold text-slate-500 dark:text-slate-400 text-xs">
                    GH₵
                  </span>
                  <input
                    id="custom-airtime-input"
                    type="number"
                    min="1"
                    max="500"
                    value={customAirtimeInput}
                    onChange={(e) => handleCustomAirtimeChange(e.target.value)}
                    placeholder="Custom amount (1 - 500)"
                    className="w-full pl-12 pr-4 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Checkout Action Button */}
            <button
              type="button"
              id="proceed-checkout-btn"
              onClick={openCheckout}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-400 dark:text-slate-950" />
              <span>
                Proceed to Paystack Checkout (
                {serviceType === 'AIRTIME'
                  ? `GH₵${airtimeAmountGHS}`
                  : `GH₵${selectedPackage?.priceGHS || 0}`}
                )
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Data Bundles Catalog & Selection (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          {serviceType === 'DATA' ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
              {/* Category Filter Chips */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Available {network} Data Bundles
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Select your preferred high-speed package</p>
                </div>

                <div className="relative min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="search-bundles-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search bundle..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                {[
                  { id: 'ALL', label: 'All Bundles' },
                  { id: 'DAILY', label: 'Daily Flexi' },
                  { id: 'WEEKLY', label: 'Weekly' },
                  { id: 'MONTHLY', label: 'Monthly' },
                  { id: 'NO_EXPIRY', label: 'No Expiry' },
                  { id: 'BROADBAND', label: 'Broadband' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    id={`filter-cat-${cat.id}`}
                    onClick={() => setFilterCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      filterCategory === cat.id
                        ? 'bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Package Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[560px] overflow-y-auto pr-1">
                {filteredPackages.map((pkg) => {
                  const isSelected = selectedPackage?.id === pkg.id;
                  const convertedPrice = (pkg.priceGHS / curr.rateToGHS).toFixed(2);
                  const net = pkg.network;

                  // Dynamic network-specific color branding
                  const isMtn = net === 'MTN';
                  const isTelecel = net === 'Telecel';
                  // AirtelTigo

                  const cardBg = isMtn
                    ? isSelected
                      ? 'bg-amber-400 text-slate-950 border-3 border-slate-950 shadow-xl ring-4 ring-amber-300/90 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-[1.01]'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-2 border-amber-500/90 hover:border-slate-950 shadow-md hover:shadow-lg'
                    : isTelecel
                    ? isSelected
                      ? 'bg-red-600 text-white border-3 border-white shadow-xl ring-4 ring-red-400/90 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-[1.01]'
                      : 'bg-red-600 hover:bg-red-500 text-white border-2 border-red-700 hover:border-white shadow-md hover:shadow-lg'
                    : isSelected
                    ? 'bg-blue-600 text-white border-3 border-white shadow-xl ring-4 ring-blue-400/90 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-[1.01]'
                    : 'bg-blue-600 hover:bg-blue-500 text-white border-2 border-blue-700 hover:border-white shadow-md hover:shadow-lg';

                  const badgeStyle = isMtn
                    ? 'bg-slate-950 text-amber-400 font-black'
                    : isTelecel
                    ? 'bg-white text-red-700 font-black'
                    : 'bg-white text-blue-700 font-black';

                  const validityStyle = isMtn
                    ? 'bg-amber-500/60 text-slate-950 font-black border border-amber-600/70'
                    : isTelecel
                    ? 'bg-red-800/90 text-white font-bold border border-red-400/60'
                    : 'bg-blue-800/90 text-white font-bold border border-blue-400/60';

                  const titleStyle = isMtn
                    ? 'text-slate-950 font-extrabold'
                    : isTelecel
                    ? 'text-white font-extrabold'
                    : 'text-white font-extrabold';

                  const descStyle = isMtn
                    ? 'text-slate-900 font-medium'
                    : isTelecel
                    ? 'text-red-100 font-medium'
                    : 'text-blue-100 font-medium';

                  const dividerStyle = isMtn
                    ? 'border-slate-950/25'
                    : isTelecel
                    ? 'border-white/25'
                    : 'border-white/25';

                  const priceStyle = isMtn
                    ? 'text-slate-950 font-black'
                    : isTelecel
                    ? 'text-white font-black'
                    : 'text-white font-black';

                  const subPriceStyle = isMtn
                    ? 'text-slate-800 font-semibold'
                    : isTelecel
                    ? 'text-red-200 font-semibold'
                    : 'text-blue-200 font-semibold';

                  const buttonStyle = isMtn
                    ? isSelected
                      ? 'bg-slate-950 text-amber-400 font-black shadow-md ring-2 ring-slate-950'
                      : 'bg-slate-950/90 hover:bg-slate-950 text-amber-300 font-bold'
                    : isTelecel
                    ? isSelected
                      ? 'bg-white text-red-700 font-black shadow-md ring-2 ring-white'
                      : 'bg-white/90 hover:bg-white text-red-700 font-bold'
                    : isSelected
                    ? 'bg-white text-blue-700 font-black shadow-md ring-2 ring-white'
                    : 'bg-white/90 hover:bg-white text-blue-700 font-bold';

                  return (
                    <div
                      key={pkg.id}
                      id={`package-card-${pkg.id}`}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`p-4 rounded-xl transition-all cursor-pointer relative flex flex-col justify-between ${cardBg}`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeStyle}`}>
                              {net}
                            </span>
                            <span className={`text-base font-extrabold font-['Outfit',sans-serif] ${titleStyle}`}>
                              {pkg.dataVolume || pkg.name}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${validityStyle}`}>
                            {pkg.validity}
                          </span>
                        </div>

                        <p className={`text-xs font-bold ${titleStyle}`}>{pkg.name}</p>
                        <p className={`text-[11px] mt-1 leading-snug ${descStyle}`}>
                          {pkg.description}
                        </p>
                      </div>

                      <div className={`mt-4 pt-3 border-t flex items-center justify-between ${dividerStyle}`}>
                        <div>
                          <span className={`text-base font-black ${priceStyle}`}>
                            GH₵{pkg.priceGHS.toFixed(2)}
                          </span>
                          {selectedCurrency !== 'GHS' && (
                            <span className={`block text-[11px] ${subPriceStyle}`}>
                              ≈ {curr.symbol}
                              {convertedPrice} {selectedCurrency}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          id={`select-btn-${pkg.id}`}
                          className={`px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${buttonStyle}`}
                        >
                          {isSelected ? 'Selected ✓' : 'Choose'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Airtime Information Card */
            <div className={`rounded-2xl p-6 shadow-md border space-y-4 transition-colors ${
              network === 'MTN'
                ? 'bg-amber-400 text-slate-950 border-amber-500'
                : network === 'Telecel'
                ? 'bg-red-600 text-white border-red-700'
                : 'bg-blue-600 text-white border-blue-700'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider ${
                  network === 'MTN'
                    ? 'bg-slate-950 text-amber-400'
                    : 'bg-white text-slate-950'
                }`}>
                  {network}
                </span>
                <h3 className={`text-sm font-extrabold uppercase tracking-wider ${
                  network === 'MTN' ? 'text-slate-950' : 'text-white'
                }`}>
                  {network} Ghana Airtime Recharge Guide
                </h3>
              </div>
              <p className={`text-xs leading-relaxed ${
                network === 'MTN' ? 'text-slate-900 font-medium' : 'text-slate-100 font-medium'
              }`}>
                Airtime recharges are delivered via Hubtel’s direct carrier integration to the recipient
                SIM card within 3-5 seconds of Paystack payment verification.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className={`p-3.5 rounded-xl border text-xs ${
                  network === 'MTN'
                    ? 'bg-amber-500/50 border-amber-600/60 text-slate-950'
                    : network === 'Telecel'
                    ? 'bg-red-700/80 border-red-500/60 text-white'
                    : 'bg-blue-700/80 border-blue-500/60 text-white'
                }`}>
                  <p className="font-extrabold">100% Promo Credit Bonus</p>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    Eligible bonus credit is assigned automatically by {network} based on active recharge promos.
                  </p>
                </div>
                <div className={`p-3.5 rounded-xl border text-xs ${
                  network === 'MTN'
                    ? 'bg-amber-500/50 border-amber-600/60 text-slate-950'
                    : network === 'Telecel'
                    ? 'bg-red-700/80 border-red-500/60 text-white'
                    : 'bg-blue-700/80 border-blue-500/60 text-white'
                }`}>
                  <p className="font-extrabold">Lifetime Validity</p>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    Airtime balances have no expiration date and can be converted into any data bundle anytime.
                  </p>
                </div>
              </div>

              <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                network === 'MTN'
                  ? 'bg-amber-500/40 border-amber-600/60 text-slate-950'
                  : network === 'Telecel'
                  ? 'bg-red-800/80 border-red-500/60 text-white'
                  : 'bg-blue-800/80 border-blue-500/60 text-white'
              }`}>
                <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${
                  network === 'MTN' ? 'text-slate-950' : 'text-white'
                }`} />
                <div>
                  <p className="font-extrabold">Automated Re-query Engine</p>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    If carrier networks experience temporary downtime, our Hubtel retry queue safely
                    holds and executes the recharge the instant the telecom node responds.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      <PurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        network={network}
        serviceType={serviceType}
        selectedPackage={selectedPackage}
        airtimeAmountGHS={airtimeAmountGHS}
        recipientPhone={recipientPhone}
        agentCode={agentCode}
        currency={selectedCurrency}
        currentUser={currentUser}
        onShowToast={onShowToast}
        onTransactionSuccess={onTransactionSuccess}
      />
    </div>
  );
};
