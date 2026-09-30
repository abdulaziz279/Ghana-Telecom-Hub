import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  Firestore,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let dbInstance: Firestore | null = null;
let isInitialized = false;

export function getFirestoreServer(): Firestore | null {
  if (dbInstance) return dbInstance;
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('firebase-applet-config.json not found on server.');
      return null;
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const app = !getApps().length ? initializeApp(config) : getApp();
    if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
      dbInstance = getFirestore(app, config.firestoreDatabaseId);
    } else {
      dbInstance = getFirestore(app);
    }
    isInitialized = true;
    console.log('Firebase Cloud Firestore successfully connected on server.');
    return dbInstance;
  } catch (err: any) {
    console.warn('Error initializing Firebase Firestore on server:', err.message);
    return null;
  }
}

// Sync transaction to Cloud Firestore in real time
export async function syncTransactionToFirestore(tx: any) {
  try {
    const firestore = getFirestoreServer();
    if (!firestore || !tx || !tx.id) return;
    const txRef = doc(firestore, 'transactions', tx.id);
    await setDoc(txRef, {
      ...tx,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Also store in 'orders' collection for dedicated order fulfillment tracking
    const orderId = `order-${tx.id.replace('tx-', '')}`;
    const orderRef = doc(firestore, 'orders', orderId);
    await setDoc(orderRef, {
      id: orderId,
      orderNumber: `ORD-GH-${tx.reference.slice(-8)}`,
      transactionId: tx.id,
      recipientPhone: tx.recipientPhone,
      network: tx.network,
      serviceType: tx.serviceType,
      packageName: tx.packageName,
      dataVolume: tx.dataVolume || '',
      amountGHS: tx.amountGHS,
      status: tx.paymentStatus === 'success' ? 'COMPLETED' : tx.paymentStatus.toUpperCase(),
      carrierDispatchStatus: tx.dispatchStatus === 'dispatched' ? 'DELIVERED' : tx.dispatchStatus.toUpperCase(),
      carrierReference: tx.hubtelTransactionId || '',
      customerName: tx.customerName || '',
      customerEmail: tx.customerEmail || '',
      agentCode: tx.agentCode || '',
      createdAt: tx.createdAt,
      completedAt: tx.completedAt || '',
    }, { merge: true });
  } catch (err: any) {
    console.warn('Firestore transaction sync warning:', err.message);
  }
}

// Sync agent to Cloud Firestore
export async function syncAgentToFirestore(agent: any) {
  try {
    const firestore = getFirestoreServer();
    if (!firestore || !agent || !agent.id) return;
    const agentRef = doc(firestore, 'agents', agent.id);
    await setDoc(agentRef, {
      ...agent,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err: any) {
    console.warn('Firestore agent sync warning:', err.message);
  }
}

// Sync audit log to Cloud Firestore
export async function syncAuditLogToFirestore(log: any) {
  try {
    const firestore = getFirestoreServer();
    if (!firestore || !log || !log.id) return;
    const logRef = doc(firestore, 'auditLogs', log.id);
    await setDoc(logRef, {
      ...log,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err: any) {
    console.warn('Firestore audit log sync warning:', err.message);
  }
}

// Sync payout to Cloud Firestore
export async function syncPayoutToFirestore(payout: any) {
  try {
    const firestore = getFirestoreServer();
    if (!firestore || !payout || !payout.id) return;
    const payoutRef = doc(firestore, 'payouts', payout.id);
    await setDoc(payoutRef, {
      ...payout,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err: any) {
    console.warn('Firestore payout sync warning:', err.message);
  }
}
