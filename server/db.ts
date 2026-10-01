import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  UserAccount,
  Transaction,
  CommissionPayout,
  AuditLog,
  SecurityAlert,
  GatewaySettings,
  AnalyticsSummary,
} from '../src/types';

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? '/tmp/data' : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const SEED_FILE = path.resolve(process.cwd(), 'data/database.json');

// Master encryption key for data encryption at rest (SOC2 / GDPR compliance)
const MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY || 'ghana_telecom_secure_master_aes256_k';
const CIPHER_ALGO = 'aes-256-gcm';

export function encryptField(plainText: string): string {
  try {
    const key = crypto.createHash('sha256').update(MASTER_KEY).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(CIPHER_ALGO, key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${tag}:${encrypted}`;
  } catch (err) {
    return plainText;
  }
}

export function decryptField(cipherPayload: string): string {
  try {
    const parts = cipherPayload.split(':');
    if (parts.length !== 3) return cipherPayload;
    const [ivHex, tagHex, encryptedHex] = parts;
    const key = crypto.createHash('sha256').update(MASTER_KEY).digest();
    const decipher = crypto.createDecipheriv(CIPHER_ALGO, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return cipherPayload;
  }
}

export interface AppDatabase {
  users: UserAccount[];
  transactions: Transaction[];
  payouts: CommissionPayout[];
  auditLogs: AuditLog[];
  securityAlerts: SecurityAlert[];
  settings: GatewaySettings;
}

const defaultSettings: GatewaySettings = {
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '',
  isPaystackLive: true,
  hubtelClientId: process.env.HUBTEL_CLIENT_ID || 'qarnmjva',
  hubtelClientSecret: process.env.HUBTEL_CLIENT_SECRET || 'boofqzgf',
  hubtelSenderId: process.env.HUBTEL_SENDER_ID || 'Azigizaro',
  hubtelMerchantAccount: process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || '0552727299',
  isHubtelLive: true,
  crmWebhookUrl: process.env.CRM_WEBHOOK_URL || '',
  defaultCommissionRate: 3.5, // 3.5% commission for sub-agents
  twoFactorMandatory: true,
  encryptionStandard: 'AES-256-GCM (SOC2 / GDPR Compliant)',
};

const initialUsers: UserAccount[] = [
  {
    id: 'user-admin-azigiza',
    email: 'juniorazigiza@gmail.com',
    fullName: 'Abdul Razak Sugri A Aziz',
    phone: '0247946116',
    role: 'ADMIN',
    password: 'Admin2026Secure!',
    balanceGHS: 0,
    commissionEarnedGHS: 0,
    twoFactorEnabled: true,
    twoFactorSecret: '19ADC544E3FA03882F827F7F3C4CC918',
    twoFactorType: 'SMS_OTP',
    createdAt: new Date().toISOString(),
    status: 'active',
  },
  {
    id: 'user-admin-01',
    email: 'admin@ghanatelecom.com.gh',
    fullName: 'Chief Telecom Administrator',
    phone: '0244123456',
    role: 'ADMIN',
    password: 'Admin2026Secure!',
    balanceGHS: 0,
    commissionEarnedGHS: 0,
    twoFactorEnabled: true,
    twoFactorSecret: 'GHANATELECOM2FAKEYADMIN',
    twoFactorType: 'SMS_OTP',
    createdAt: new Date().toISOString(),
    status: 'active',
  },
];

let cachedDb: AppDatabase | null = null;

export function loadDatabase(): AppDatabase {
  if (cachedDb) return cachedDb;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let sourceFile = DB_FILE;
    if (!fs.existsSync(DB_FILE) && isVercel && fs.existsSync(SEED_FILE)) {
      sourceFile = SEED_FILE;
    }

    if (fs.existsSync(sourceFile)) {
      const raw = fs.readFileSync(sourceFile, 'utf-8');
      cachedDb = JSON.parse(raw);
      // Cleanse any legacy test/demo users or transactions if present
      if (cachedDb && Array.isArray(cachedDb.users)) {
        if (cachedDb.settings) {
          cachedDb.settings.isPaystackLive = true;
          cachedDb.settings.isHubtelLive = true;
          if (cachedDb.settings.hubtelClientSecret && cachedDb.settings.hubtelClientSecret.includes('clientsecret=')) {
            const secretMatch = cachedDb.settings.hubtelClientSecret.match(/clientsecret=([^&]+)/i);
            if (secretMatch) cachedDb.settings.hubtelClientSecret = secretMatch[1];
            const senderMatch = cachedDb.settings.hubtelClientSecret.match(/from=([^&]+)/i);
            if (senderMatch) cachedDb.settings.hubtelSenderId = senderMatch[1];
          }
          if (!cachedDb.settings.hubtelSenderId) {
            cachedDb.settings.hubtelSenderId = 'Azigizaro';
          }
        }
        // Ensure juniorazigiza@gmail.com is set to ADMIN
        const userAzigiza = cachedDb.users.find((u) => u.email === 'juniorazigiza@gmail.com');
        if (userAzigiza) {
          userAzigiza.role = 'ADMIN';
          if (!userAzigiza.password) userAzigiza.password = 'Admin2026Secure!';
        } else {
          cachedDb.users.unshift(initialUsers[0]);
        }

        // Strictly purge any fake simulation agent or test accounts and fake balances
        cachedDb.users = cachedDb.users.filter(
          (u) =>
            u.email !== 'agent@telecom.gh' &&
            u.email !== 'customer@telecom.gh' &&
            u.id !== 'user-agent-01' &&
            u.id !== 'user-customer-01'
        );

        return cachedDb;
      }
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }

  // Seed default database with fresh production state
  cachedDb = {
    users: initialUsers,
    transactions: [],
    payouts: [],
    auditLogs: [
      {
        id: 'log-genesis-001',
        timestamp: new Date().toISOString(),
        actorId: 'user-admin-01',
        actorEmail: 'admin@ghanatelecom.com.gh',
        actorRole: 'ADMIN',
        action: 'PRODUCTION_PLATFORM_INITIALIZATION',
        target: 'System_Root',
        ipAddress: '127.0.0.1',
        userAgent: 'GhanaTelecom-Core/2026.1',
        status: 'SUCCESS',
        severity: 'LOW',
        details: { compliance: 'SOC2_TYPE_II', gdprRestEncryption: true, state: 'PRODUCTION_READY_FRESH' },
        tamperHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    ],
    securityAlerts: [],
    settings: defaultSettings,
  };

  saveDatabase(cachedDb);
  return cachedDb;
}

export function saveDatabase(db: AppDatabase): void {
  try {
    cachedDb = db;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

export function recordAuditLog(log: Omit<AuditLog, 'id' | 'timestamp' | 'tamperHash'>): AuditLog {
  const db = loadDatabase();
  const timestamp = new Date().toISOString();
  const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  // Tamper-evident cryptographic SHA-256 hash calculation
  const prevHash = db.auditLogs.length > 0 ? db.auditLogs[db.auditLogs.length - 1].tamperHash : 'GENESIS';
  const tamperHash = crypto
    .createHash('sha256')
    .update(`${prevHash}:${id}:${timestamp}:${log.actorEmail}:${log.action}:${log.target}`)
    .digest('hex');

  const fullLog: AuditLog = {
    ...log,
    id,
    timestamp,
    tamperHash,
  };

  db.auditLogs.unshift(fullLog);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
  saveDatabase(db);
  return fullLog;
}

export function recordSecurityAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'resolved'>): SecurityAlert {
  const db = loadDatabase();
  const timestamp = new Date().toISOString();
  const id = `sec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const fullAlert: SecurityAlert = {
    ...alert,
    id,
    timestamp,
    resolved: false,
  };
  db.securityAlerts.unshift(fullAlert);
  saveDatabase(db);

  // Also log to audit log
  recordAuditLog({
    actorId: 'SYSTEM',
    actorEmail: 'security-sentinel@ghanatelecom.com.gh',
    actorRole: 'SYSTEM',
    action: `SECURITY_ALERT_${alert.type}`,
    target: alert.ipAddress,
    ipAddress: alert.ipAddress,
    userAgent: 'CloudRun-WAF-Sentinel',
    status: 'WARNING',
    severity: alert.severity,
    details: { alertMessage: alert.message },
  });

  return fullAlert;
}
