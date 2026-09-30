import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Printer,
  Copy,
  Zap,
  Lock,
  ArrowRight,
  RotateCcw,
  Check,
  MessageSquare,
  Radio,
  Delete,
  ExternalLink,
} from 'lucide-react';
import {
  NetworkOperator,
  ServiceType,
  TelecomPackage,
  CurrencyCode,
  UserAccount,
  Transaction,
} from '../types';
import { GHANA_CURRENCIES } from '../data/telecomCatalog';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  network: NetworkOperator;
  serviceType: ServiceType;
  selectedPackage: TelecomPackage | null;
  airtimeAmountGHS: number;
  recipientPhone: string;
  agentCode: string;
  currency: CurrencyCode;
  currentUser: UserAccount | null;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
  onTransactionSuccess: (tx: Transaction) => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  onClose,
  network,
  serviceType,
  selectedPackage,
  airtimeAmountGHS,
  recipientPhone,
  agentCode,
  currency,
  currentUser,
  onShowToast,
  onTransactionSuccess,
}) => {
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || 'customer@accra.gh');
  const [customerName, setCustomerName] = useState(currentUser?.fullName || 'Valued Customer');
  const [paymentMethod, setPaymentMethod] = useState<'PAYSTACK_MOMO' | 'PAYSTACK_CARD'>('PAYSTACK_MOMO');
  const [step, setStep] = useState<'REVIEW' | 'MOMO_AUTH_PROMPT' | 'PROCESSING' | 'SUCCESS' | 'FAILED'>('REVIEW');
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [activeReference, setActiveReference] = useState('');
  const [carrierSms, setCarrierSms] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isInsufficientFunds, setIsInsufficientFunds] = useState(false);
  const [copied, setCopied] = useState(false);
  const [promptCountdown, setPromptCountdown] = useState(180);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<string>('pay_offline');
  const [otpInput, setOtpInput] = useState('');
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);

  // Currency & Amount calculation
  const amountGHS = serviceType === 'AIRTIME' ? airtimeAmountGHS : selectedPackage?.priceGHS || 0;
  const curr = GHANA_CURRENCIES[currency] || GHANA_CURRENCIES.GHS;
  const convertedPrice = (amountGHS / curr.rateToGHS).toFixed(2);

  // Sync email when currentUser changes
  useEffect(() => {
    if (currentUser?.email) {
      setCustomerEmail(currentUser.email);
    }
  }, [currentUser]);

  // Countdown timer for MoMo PIN authorization step
  useEffect(() => {
    let timer: any;
    if (step === 'MOMO_AUTH_PROMPT' && promptCountdown > 0) {
      timer = setInterval(() => {
        setPromptCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setErrorMessage('Authorization prompt timed out on mobile device. Please try again.');
            setStep('FAILED');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, promptCountdown]);

  // Real-time listener: poll Paystack to check when customer enters 4-digit PIN on phone
  useEffect(() => {
    let pollInterval: any;
    if (step === 'MOMO_AUTH_PROMPT' && activeReference) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/paystack/status/${encodeURIComponent(activeReference)}`);
          if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const data = await res.json();
              if (data && (data.status === 'success' || data.paymentStatus === 'success')) {
                clearInterval(pollInterval);
                setCompletedTx(data.transaction);
                setCarrierSms(
                  data.carrierSmsReceipt ||
                    `[${network} Top-Up Alert] Dear Customer, your recharge of ${
                      serviceType === 'DATA' ? selectedPackage?.dataVolume || selectedPackage?.name : `GH₵${amountGHS.toFixed(2)} airtime`
                    } to ${recipientPhone} was successfully dispatched via Hubtel.`
                );
                setStep('SUCCESS');
                onTransactionSuccess(data.transaction);
                onShowToast(
                  'success',
                  'PIN Approved & Dispatched!',
                  `${network} ${serviceType} credited to ${recipientPhone} via Hubtel in real time.`
                );
              } else if (data && (data.status === 'failed' || data.paymentStatus === 'failed')) {
                clearInterval(pollInterval);
                const isFunds = data.isInsufficientFunds || (data.error || '').toLowerCase().includes('insufficient');
                setIsInsufficientFunds(isFunds);
                const failMsg = data.error || (isFunds ? 'Insufficient funds to complete transaction' : 'Payment declined on mobile device.');
                setErrorMessage(failMsg);
                setStep('FAILED');
                onShowToast(
                  'error',
                  isFunds ? 'Insufficient Funds' : 'Payment Declined',
                  failMsg
                );
              }
            }
          }
        } catch {
          // Gracefully continue polling until countdown expires or customer confirms
        }
      }, 3500);
    }
    return () => clearInterval(pollInterval);
  }, [step, activeReference, network, serviceType, selectedPackage, amountGHS, recipientPhone, onTransactionSuccess, onShowToast]);

  if (!isOpen) return null;

  const handleStartPayment = async () => {
    if (!recipientPhone || recipientPhone.length < 9) {
      onShowToast('error', 'Invalid Phone', 'Please verify the recipient phone number.');
      return;
    }
    if (!customerEmail) {
      onShowToast('error', 'Missing Email', 'Customer email is required for Paystack receipts.');
      return;
    }

    try {
      setStep('PROCESSING');
      // 1. Initialize Paystack Transaction via backend
      const initRes = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountGHS,
          currency,
          email: customerEmail,
          customerName,
          recipientPhone,
          network,
          serviceType,
          packageId: selectedPackage?.id || `${network.toLowerCase()}-airtime`,
          packageName: selectedPackage?.name || `${network} Flexi Airtime`,
          dataVolume: selectedPackage?.dataVolume,
          agentCode: agentCode.trim() || undefined,
          paymentMethod,
        }),
      });

      let initData: any = {};
      try {
        initData = await initRes.json();
      } catch {
        throw new Error('Payment gateway service returned an invalid response. Please retry in a few moments.');
      }

      if (!initRes.ok) {
        const isFunds = initData.isInsufficientFunds || (initData.error || '').toLowerCase().includes('insufficient');
        setIsInsufficientFunds(isFunds);
        const failMsg = initData.error || (isFunds ? 'Insufficient funds to complete transaction' : 'Failed to initialize payment gateway.');
        setErrorMessage(failMsg);
        setStep('FAILED');
        onShowToast('error', isFunds ? 'Insufficient Funds' : 'Payment Error', failMsg);
        return;
      }

      const reference = initData.reference;
      setActiveReference(reference);
      if (initData.authorizationUrl) {
        setAuthorizationUrl(initData.authorizationUrl);
      }
      if (initData.authStatus) {
        setAuthStatus(initData.authStatus);
      }

      // If Mobile Money channel, prompt the customer on their phone handset
      if (paymentMethod === 'PAYSTACK_MOMO') {
        setPromptCountdown(180);
        setStep('MOMO_AUTH_PROMPT');
        onShowToast(
          'info',
          'Authorization Prompt Sent to Phone',
          `Check your phone (${recipientPhone}) and enter your 4-digit PIN.`
        );
      } else {
        // Card Payment flow: check if Paystack Inline SDK is loaded in window
        const win = window as any;
        const publicKey = initData.paystackPublicKey;
        if (win.PaystackPop && publicKey && !publicKey.includes('sample_pubkey')) {
          const handler = win.PaystackPop.setup({
            key: publicKey,
            email: customerEmail,
            amount: Math.round(amountGHS * 100),
            currency: 'GHS',
            ref: reference,
            channels: ['card'],
            callback: async function (response: any) {
              await verifyAndComplete(reference, response.reference || response.trxref);
            },
            onClose: function () {
              setStep('REVIEW');
              onShowToast('warning', 'Payment Cancelled', 'Paystack payment window was closed.');
            },
          });
          handler.openIframe();
        } else if (initData.authorizationUrl) {
          window.location.href = initData.authorizationUrl;
        } else {
          setErrorMessage('Payment gateway is currently awaiting card authorization.');
          setStep('FAILED');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment initiation failed.');
      setStep('FAILED');
      onShowToast('error', 'Payment Error', err.message);
    }
  };

  const handleSubmitOtp = async () => {
    if (!otpInput.trim() || !activeReference) return;
    setIsSubmittingOtp(true);
    try {
      const res = await fetch('/api/paystack/submit-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: activeReference,
          otp: otpInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onShowToast('info', 'OTP Submitted', 'Verifying authorization with Paystack...');
        await handleConfirmAuthorizedOnDevice();
      } else {
        onShowToast('error', 'OTP Error', data.error || 'Invalid OTP. Please check your SMS and retry.');
      }
    } catch (err: any) {
      onShowToast('error', 'Submission Failed', err.message);
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  const handleConfirmAuthorizedOnDevice = async () => {
    setStep('PROCESSING');
    await verifyAndComplete(activeReference);
  };

  const verifyAndComplete = async (
    reference: string,
    paystackReference?: string
  ) => {
    try {
      const verifyRes = await fetch('/api/paystack/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          paystackReference,
        }),
      });

      let verifyData: any = {};
      try {
        verifyData = await verifyRes.json();
      } catch {
        throw new Error('Payment confirmation service returned an invalid response. Please verify transaction status.');
      }

      if (!verifyRes.ok) {
        if (verifyData.status === 'pending') {
          setStep('MOMO_AUTH_PROMPT');
          onShowToast(
            'info',
            'Authorization Still Pending',
            verifyData.error || `Please enter your 4-digit PIN on your ${network} phone handset to approve.`
          );
          return;
        }

        const isFunds = verifyData.isInsufficientFunds || (verifyData.error || '').toLowerCase().includes('insufficient');
        setIsInsufficientFunds(isFunds);
        const failMsg = verifyData.error || (isFunds ? 'Insufficient funds to complete transaction' : 'Payment authorization rejected or not yet confirmed by Paystack.');
        setErrorMessage(failMsg);
        setStep('FAILED');
        onShowToast('error', isFunds ? 'Insufficient Funds' : 'Payment Declined', failMsg);
        return;
      }

      setCompletedTx(verifyData.transaction);
      setCarrierSms(
        verifyData.carrierSmsReceipt ||
          `[${network}] Recharge of ${
            serviceType === 'DATA' ? selectedPackage?.dataVolume || selectedPackage?.name : `GH₵${amountGHS.toFixed(2)}`
          } to ${recipientPhone} was successful. Hubtel ID: ${verifyData.transaction.hubtelTransactionId}.`
      );
      setStep('SUCCESS');
      onTransactionSuccess(verifyData.transaction);
      onShowToast(
        'success',
        'Top-Up Dispatched in Real Time!',
        `${network} ${serviceType} credited to ${recipientPhone} via Hubtel.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment verification failed.');
      setStep('FAILED');
    }
  };

  const copyRef = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getNetworkBadge = (net: NetworkOperator) => {
    if (net === 'MTN') return 'bg-amber-400 text-slate-950 font-black';
    if (net === 'Telecel') return 'bg-red-600 text-white font-black';
    return 'bg-blue-600 text-white font-black';
  };

  const getNetworkThemeBorder = (net: NetworkOperator) => {
    if (net === 'MTN') return 'border-amber-400 focus:border-amber-500';
    if (net === 'Telecel') return 'border-red-500 focus:border-red-600';
    return 'border-blue-500 focus:border-blue-600';
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      id="purchase-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="purchase-modal-container"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors my-6"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${getNetworkBadge(network)}`}>
              {network}
            </span>
            <div>
              <h2 className="font-bold text-base font-['Outfit',sans-serif]">
                {step === 'SUCCESS'
                  ? 'Dispatch Receipt & Settlement'
                  : step === 'MOMO_AUTH_PROMPT'
                  ? 'Mobile Money PIN Authorization'
                  : `Instant ${serviceType === 'AIRTIME' ? 'Airtime' : 'Data Bundle'} Top-Up`}
              </h2>
              <p className="text-[11px] text-slate-400">
                Hubtel Telecom Dispatch & Paystack Gateway
              </p>
            </div>
          </div>
          <button
            id="close-purchase-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* STEP 1: REVIEW & CHECKOUT */}
          {step === 'REVIEW' && (
            <div className="space-y-4">
              {/* Order Summary Box */}
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
                    Product
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 text-right">
                    {serviceType === 'AIRTIME' ? `${network} Flexi Airtime` : selectedPackage?.name}
                    {selectedPackage?.dataVolume && ` (${selectedPackage.dataVolume})`}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
                    Recipient
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                    {recipientPhone}
                  </span>
                </div>

                {agentCode && (
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
                      Sub-Agent
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      {agentCode} (Commission Tagged)
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase">
                    Total Payable
                  </span>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                      GH₵{amountGHS.toFixed(2)}
                    </span>
                    {currency !== 'GHS' && (
                      <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                        ≈ {curr.symbol}
                        {convertedPrice} {currency}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Receipt Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Email (For Paystack Receipt)
                  </label>
                  <input
                    id="checkout-customer-email"
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Payment Channel
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="payment-channel-momo"
                      onClick={() => setPaymentMethod('PAYSTACK_MOMO')}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        paymentMethod === 'PAYSTACK_MOMO'
                          ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-slate-950 dark:text-amber-300 font-bold ring-2 ring-amber-400/40'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold">Ghana Mobile Money</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                          MTN MoMo, Telecel, AT
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      id="payment-channel-card"
                      onClick={() => setPaymentMethod('PAYSTACK_CARD')}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        paymentMethod === 'PAYSTACK_CARD'
                          ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-slate-950 dark:text-amber-300 font-bold ring-2 ring-amber-400/40'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold">Bank Card / Visa / MC</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                          Instant 3D Secure
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Paystack Security Notice */}
              <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-600 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Secured by <strong>Paystack Gateway</strong> with automated{' '}
                  <strong>Hubtel Telecom Dispatch</strong> upon clearance.
                </span>
              </div>

              {/* Pay Button */}
              <button
                type="button"
                id="submit-pay-button"
                onClick={handleStartPayment}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-400 dark:text-slate-950" />
                <span>
                  Proceed to Paystack Checkout (GH₵{amountGHS.toFixed(2)})
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: REAL MOBILE MONEY AUTHORIZATION PIN PROMPT (ON USER'S PHONE) */}
          {step === 'MOMO_AUTH_PROMPT' && (
            <div className="space-y-4">
              {/* Real-Time Handset Prompt */}
              <div className={`rounded-2xl p-5 border shadow-xl relative overflow-hidden text-white ${
                network === 'MTN'
                  ? 'bg-gradient-to-b from-amber-950/80 to-slate-950 border-amber-500/40 shadow-amber-500/10'
                  : network === 'Telecel'
                  ? 'bg-gradient-to-b from-red-950/80 to-slate-950 border-red-500/40 shadow-red-500/10'
                  : 'bg-gradient-to-b from-blue-950/80 to-slate-950 border-blue-500/40 shadow-blue-500/10'
              }`}>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      network === 'MTN'
                        ? 'bg-amber-400 text-slate-950'
                        : network === 'Telecel'
                        ? 'bg-red-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {network} MoMo
                    </span>
                    <span className="font-semibold text-slate-300">
                      Real-Time Handset Push
                    </span>
                  </div>
                  <span className="font-mono text-amber-400 text-[11px] font-bold">
                    ⏱ {formatSeconds(promptCountdown)}
                  </span>
                </div>

                <div className="text-center py-3 space-y-2.5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border ${
                    network === 'MTN'
                      ? 'bg-amber-400/20 text-amber-400 border-amber-400/40'
                      : network === 'Telecel'
                      ? 'bg-red-500/20 text-red-400 border-red-500/40'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  }`}>
                    <Smartphone className="w-7 h-7 animate-bounce" />
                  </div>

                  <h3 className="text-base font-extrabold text-white font-['Outfit',sans-serif]">
                    Check Your Phone Handset Now
                  </h3>

                  <p className="text-xs text-slate-200 leading-relaxed">
                    A real-time payment authorization prompt has been dispatched to:
                  </p>
                  <div className="inline-block px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 font-mono text-sm font-black text-amber-300">
                    {recipientPhone}
                  </div>

                  {/* USSD Handset Prompt Card */}
                  <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-left space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800">
                      <span>Live MoMo USSD Handset Prompt</span>
                      <span className="font-mono text-emerald-400">STATUS: SENT</span>
                    </div>
                    <p className="font-mono text-xs text-amber-300 leading-snug">
                      &quot;Authorize payment of GH₵{amountGHS.toFixed(2)} to Ghana Telecom Hub? Enter your 4-digit PIN on your phone to approve.&quot;
                    </p>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Secured by Bank of Ghana & Paystack Real-Time MoMo Gateway</span>
                    </div>
                  </div>

                  {/* Anti-fraud security reminder */}
                  <div className="mt-3 p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-200 text-xs leading-relaxed text-left flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300">Security Rule: </span>
                      Please enter your secret 4-digit PIN <span className="underline font-bold text-white">only on your physical phone handset</span> when prompted. Never share your PIN with anyone or enter it on any website.
                    </div>
                  </div>

                  {/* Live Listening Status Banner */}
                  <div className="mt-2 py-2 px-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Waiting for your PIN confirmation from {network}...</span>
                  </div>

                  {/* Optional OTP Input Card (If Paystack requests SMS OTP for the charge) */}
                  {authStatus === 'send_otp' && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-amber-400/40 text-left space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                        <span>SMS Verification Code (OTP)</span>
                        <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded">Action Needed</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Paystack dispatched an SMS verification code to <span className="font-mono font-bold text-white">{recipientPhone}</span>. Enter it here:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                          placeholder="Enter OTP from SMS"
                          className="flex-1 px-3 py-2 text-xs font-mono bg-slate-950 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={handleSubmitOtp}
                          disabled={isSubmittingOtp || !otpInput.trim()}
                          className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg disabled:opacity-50 cursor-pointer"
                        >
                          {isSubmittingOtp ? 'Verifying...' : 'Submit OTP'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  id="confirm-authorized-on-device-btn"
                  onClick={() => handleConfirmAuthorizedOnDevice()}
                  className={`w-full py-3.5 px-4 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98 ${
                    network === 'MTN'
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
                      : network === 'Telecel'
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>I Have Entered My 4-Digit PIN on My Phone</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>

                {/* Web Checkout Fallback Link */}
                {authorizationUrl && (
                  <div className="pt-1 text-center">
                    <a
                      href={authorizationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 cursor-pointer transition-colors"
                    >
                      <span>Didn&apos;t get phone prompt? Complete via Paystack Web Window</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPromptCountdown(180);
                      handleStartPayment();
                      onShowToast('info', 'Push Resent', `Sent new authorization prompt to ${recipientPhone}.`);
                    }}
                    className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Resend Prompt to Phone
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('REVIEW')}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer font-medium"
                  >
                    Cancel / Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PROCESSING & DISPATCHING */}
          {step === 'PROCESSING' && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Outfit',sans-serif]">
                  Processing Paystack Payment & Dispatch
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  Validating Mobile Money clearance with Paystack Gateway and triggering real-time Hubtel telecom node...
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Encrypted PCI-DSS Tokenized Channel</span>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESSFUL RECEIPT WITH HUBTEL DISPATCH */}
          {step === 'SUCCESS' && completedTx && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-['Outfit',sans-serif]">
                  Top-Up Successfully Dispatched!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hubtel has confirmed delivery to{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {completedTx.recipientPhone}
                  </span>.
                </p>
              </div>

              {/* Carrier SMS Delivery Notification Alert */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold mb-1">
                  <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Network Carrier SMS Notification:</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-mono leading-relaxed bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
                  {carrierSms ||
                    `[${network}] Y'ello! Your recharge of ${
                      completedTx.serviceType === 'DATA'
                        ? completedTx.packageName
                        : `GH₵${completedTx.amountGHS.toFixed(2)} airtime`
                    } was delivered to ${completedTx.recipientPhone}. Hubtel Trans ID: ${completedTx.hubtelTransactionId}.`}
                </p>
              </div>

              {/* Receipt Card */}
              <div className="bg-slate-50 dark:bg-slate-800/70 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-xs space-y-2.5 font-mono">
                <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Hubtel Dispatch ID:</span>
                  <div className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                    <span>{completedTx.hubtelTransactionId}</span>
                    <button
                      onClick={() => copyRef(completedTx.hubtelTransactionId || '')}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Copy Dispatch ID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Paystack Reference:</span>
                  <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                    <span>{completedTx.reference}</span>
                    <button
                      onClick={() => copyRef(completedTx.reference)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Copy Reference"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Network & Package:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {completedTx.network} • {completedTx.packageName}
                  </span>
                </div>

                <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Amount Settled:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    GH₵{completedTx.amountGHS.toFixed(2)}
                  </span>
                </div>

                {completedTx.agentCode && (
                  <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 font-sans">
                    <span>Agent Commission Credited:</span>
                    <span className="font-bold">GH₵{completedTx.commissionEarnedGHS.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                  <span>Dispatched At:</span>
                  <span>{new Date(completedTx.completedAt || completedTx.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {copied && (
                <p className="text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in">
                  Reference copied to clipboard!
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  id="print-receipt-btn"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </button>

                <button
                  type="button"
                  id="finish-purchase-btn"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Done / New Top-Up
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: FAILED (INSUFFICIENT FUNDS OR PAYMENT DECLINED POP-UP) */}
          {step === 'FAILED' && (
            <div className="py-2 space-y-4">
              {isInsufficientFunds || errorMessage.toLowerCase().includes('insufficient') || errorMessage.toLowerCase().includes('declined') ? (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                  </div>

                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white mb-1">
                      Payment Declined • Insufficient Funds
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-['Outfit',sans-serif]">
                      Insufficient Funds to Complete Transaction
                    </h3>
                    <p className="text-xs text-rose-600 dark:text-rose-300 mt-1 leading-relaxed">
                      Your <span className="font-bold text-slate-900 dark:text-white">{network} Mobile Money</span> account on <span className="font-mono font-bold text-slate-900 dark:text-white">{recipientPhone}</span> does not have enough funds to complete this purchase of <span className="font-bold text-slate-900 dark:text-white">GH₵{amountGHS.toFixed(2)}</span>, or the authorization prompt was declined on your phone screen.
                    </p>
                  </div>

                  {/* MoMo Balance Check Guide */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-left text-xs space-y-1.5">
                    <p className="font-bold text-amber-300 text-[11px] flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" />
                      How to check your balance:
                    </p>
                    <p className="text-[11px] text-slate-300 font-mono">
                      • {network === 'MTN' ? 'Dial *170# -> Option 6 (Wallet) -> 1 (Balance)' : network === 'Telecel' ? 'Dial *110# -> Option 5 (Account)' : 'Dial *110# -> Check Balance'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Ensure you have at least <span className="font-bold text-amber-300">GH₵{amountGHS.toFixed(2)}</span> in your wallet before approving the 4-digit PIN prompt.
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      id="retry-purchase-btn"
                      onClick={() => {
                        setStep('REVIEW');
                        setErrorMessage('');
                        setIsInsufficientFunds(false);
                      }}
                      className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Retry Payment with Sufficient Balance</span>
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-2.5 px-4 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel / Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Payment Authorization Unsuccessful
                    </h3>
                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 max-w-xs mx-auto leading-relaxed">
                      {errorMessage || 'Payment was declined or cancelled on your mobile device.'}
                    </p>
                  </div>

                  <div className="flex gap-2 max-w-xs mx-auto">
                    <button
                      type="button"
                      id="retry-purchase-btn"
                      onClick={() => {
                        setStep('REVIEW');
                        setErrorMessage('');
                        setIsInsufficientFunds(false);
                      }}
                      className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Try Again
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="py-2.5 px-4 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
