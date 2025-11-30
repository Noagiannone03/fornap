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
