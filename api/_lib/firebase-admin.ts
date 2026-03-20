/**
 * Firebase Admin SDK initialization for Vercel Serverless Functions
 * 
 * Cette librairie initialise Firebase Admin une seule fois
 * et fournit des helpers pour accéder à Firestore.
 */

import admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';

// Variable pour stocker l'instance initialisée
let firebaseApp: App | null = null;

/**
 * Initialise Firebase Admin SDK (une seule fois)
 * Utilise les variables d'environnement Vercel
 */
export function getFirebaseAdmin(): App {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Vérifier si Firebase Admin est déjà initialisé
    // Vérifier d'abord si admin.apps existe et est un tableau
    if (admin.apps && Array.isArray(admin.apps) && admin.apps.length > 0) {
      firebaseApp = admin.apps[0] as App;
      console.log('✅ Firebase Admin already initialized');
      return firebaseApp;
    }

    // Récupérer les credentials depuis les variables d'environnement
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
    }

    console.log('🔍 Parsing service account key...');
    const serviceAccount = JSON.parse(serviceAccountKey);

    console.log('🔍 Initializing Firebase Admin with credential...');
    console.log('Project ID:', serviceAccount.project_id);
    
    // Vérifier que admin.credential existe
    if (!admin.credential) {
      console.error('❌ admin.credential is undefined');
      throw new Error('Firebase Admin credential module is not available');
    }

    // Initialiser Firebase Admin avec la bonne syntaxe
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || process.env.VITE_FIREBASE_PROJECT_ID,
    });

    console.log('✅ Firebase Admin initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error);
    console.error('Error details:', error);
    throw new Error(`Failed to initialize Firebase Admin: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retourne une instance de Firestore
 * Initialise Firebase Admin si nécessaire
 */
export function getFirestore(): Firestore {
  const app = getFirebaseAdmin();
  return admin.firestore(app);
}

/**
 * Retourne une instance de Firebase Auth
 * Initialise Firebase Admin si nécessaire
 */
export function getAuth(): Auth {
  const app = getFirebaseAdmin();
  return admin.auth(app);
}

/**
 * Retourne FieldValue pour les opérations Firestore
 * (serverTimestamp, increment, etc.)
 */
export function getFieldValue() {
  getFirebaseAdmin(); // S'assurer que Firebase est initialisé
  return admin.firestore.FieldValue;
}

/**
 * Retourne Timestamp pour créer des timestamps Firestore
 */
export function getTimestamp() {
  getFirebaseAdmin(); // S'assurer que Firebase est initialisé
  return admin.firestore.Timestamp;
}

/**
 * Charge le HTML d'une campagne depuis les chunks Firestore (sous-collection 'content')
 * Le HTML est découpé en chunks de ~900 KB pour contourner la limite de 1 MiB de Firestore.
 * Utilisé côté serveur (API Vercel) avec firebase-admin.
 */
export async function loadCampaignHtmlAdmin(campaignId: string): Promise<string | null> {
  try {
    const db = getFirestore();
    const contentRef = db.collection('campaigns').doc(campaignId).collection('content');
    const snapshot = await contentRef.get();

    if (snapshot.empty) return null;

    const htmlChunks: { index: number; data: string }[] = [];
    for (const doc of snapshot.docs) {
      const docData = doc.data();
      if (docData.type === 'html') {
        htmlChunks.push({ index: docData.index, data: docData.data });
      }
    }

    if (htmlChunks.length === 0) return null;

    htmlChunks.sort((a, b) => a.index - b.index);
    return htmlChunks.map(c => c.data).join('');
  } catch (error) {
    console.error('❌ Error loading campaign HTML from chunks:', error);
    return null;
  }
}
