/**
 * Firebase Admin SDK initialization for Vercel Serverless Functions
 * 
 * Cette librairie initialise Firebase Admin une seule fois
 * et fournit des helpers pour accéder à Firestore.
 */

import * as admin from 'firebase-admin';

// Variable pour stocker l'instance initialisée
let firebaseApp: admin.app.App | null = null;

/**
 * Initialise Firebase Admin SDK (une seule fois)
 * Utilise les variables d'environnement Vercel
 */
export function getFirebaseAdmin(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Récupérer les credentials depuis les variables d'environnement
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
    );

    // Initialiser Firebase Admin
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || process.env.VITE_FIREBASE_PROJECT_ID,
    });

    console.log('✅ Firebase Admin initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error);
    throw new Error('Failed to initialize Firebase Admin');
  }
}

/**
 * Retourne une instance de Firestore
 * Initialise Firebase Admin si nécessaire
 */
export function getFirestore(): admin.firestore.Firestore {
  const app = getFirebaseAdmin();
  return admin.firestore(app);
}

/**
 * Retourne une instance de Firebase Auth
 * Initialise Firebase Admin si nécessaire
 */
export function getAuth(): admin.auth.Auth {
  const app = getFirebaseAdmin();
  return admin.auth(app);
}
