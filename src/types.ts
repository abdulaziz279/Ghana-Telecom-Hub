export type NetworkOperator = 'MTN' | 'Telecel' | 'AirtelTigo';
export type ServiceType = 'AIRTIME' | 'DATA';
export type UserRole = 'CUSTOMER' | 'AGENT' | 'ADMIN';
export type CurrencyCode = 'GHS' | 'USD' | 'EUR' | 'GBP' | 'NGN';

export interface CurrencyRate {
  code: CurrencyCode;
  symbol: string;
  rateToGHS: number; // e.g. 1 USD = 15.5 GHS -> rateToGHS = 15.5
  name: string;
}

export interface TelecomPackage {
  id: string;
  network: NetworkOperator;
  type: ServiceType;
  name: string;
  dataVolume?: string; // e.g. "5GB"
  validity: string;    // e.g. "30 Days", "No Expiry", "24 Hours"
  priceGHS: number;
  popular?: boolean;
  description: string;
  bundleCode?: string; // Hubtel telecom bundle code
}

export interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  password?: string;         // Account access password
  agentCode?: string;        // For sub-agents
  commissionRate?: number;    // e.g. 3.5 (%) for sub-agents
  balanceGHS: number;        // Agent balance or user wallet balance
  commissionEarnedGHS: number;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorType?: 'TOTP' | 'SMS_OTP';
  createdAt: string;
  status: 'active' | 'suspended' | 'pending_verification';
}

export interface Transaction {
  id: string;
  reference: string;
  userId?: string;
  agentId?: string;
  agentCode?: string;
  customerName: string;
  customerEmail: string;
  network: NetworkOperator;
  recipientPhone: string;
  serviceType: ServiceType;
  packageId?: string;
  packageName: string;
  dataVolume?: string;
  amountGHS: number;
  amountPaid: number;
  currency: CurrencyCode;
  paymentMethod: 'PAYSTACK_MOMO' | 'PAYSTACK_CARD' | 'AGENT_WALLET';
  paymentStatus: 'pending' | 'success' | 'failed';
  dispatchStatus: 'pending' | 'dispatched' | 'failed';
  hubtelTransactionId?: string;
  paystackReference?: string;
  commissionEarnedGHS: number;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
}

export interface CommissionPayout {
  id: string;
  agentId: string;
  agentName: string;
  agentPhone: string;
  amountGHS: number;
  paymentMethod: 'MTN_MOMO' | 'TELECEL_CASH' | 'AT_MONEY' | 'BANK';
  accountNumber: string;
  accountName: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestedAt: string;
  processedAt?: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail: string;
  actorRole: UserRole | 'SYSTEM';
  action: string;
  target: string;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details?: Record<string, any>;
  tamperHash: string;
}

export interface SecurityAlert {
  id: string;
  timestamp: string;
  type: 'UNAUTHORIZED_ACCESS' | 'FAILED_2FA' | 'RATE_LIMIT' | 'SUSPICIOUS_IP' | 'CREDENTIAL_STUFFING' | 'CARRIER_DISPATCH_FAILED';
  message: string;
  ipAddress: string;
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resolved: boolean;
}

export interface GatewaySettings {
  paystackPublicKey: string;
  paystackSecretKey: string;
  isPaystackLive: boolean;
  hubtelClientId: string;
  hubtelClientSecret: string;
  hubtelSenderId?: string;
  hubtelMerchantAccount: string;
  isHubtelLive: boolean;
  crmWebhookUrl: string;
  defaultCommissionRate: number;
  twoFactorMandatory: boolean;
  encryptionStandard: 'AES-256-GCM (SOC2 / GDPR Compliant)';
}

export interface AnalyticsSummary {
  totalRevenueGHS: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  activeAgentsCount: number;
  totalCommissionsPaidGHS: number;
  pendingCommissionsGHS: number;
  networkBreakdown: {
    MTN: number;
    Telecel: number;
    AirtelTigo: number;
  };
  serviceBreakdown: {
    AIRTIME: number;
    DATA: number;
  };
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  transactionId: string;
  reference: string;
  recipientPhone: string;
  network: NetworkOperator;
  serviceType: ServiceType;
  packageName: string;
  dataVolume?: string;
  amountGHS: number;
  status: string;
  carrierDispatchStatus: string;
  carrierReference: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  agentCode: string;
  createdAt: string;
  completedAt?: string;
}

