/**
 * Helper pour initialiser Firebase Admin SDK dans les routes API
 *
 * Firebase Admin doit être initialisé une seule fois.
 * Ce module gère l'initialisation singleton.
 */

import * as admin from 'firebase-admin';

// Instance singleton
let app: admin.app.App | null = null;

/**
 * Initialise ou retourne l'instance Firebase Admin
 */
export function getFirebaseAdmin(): admin.app.App {
  if (app) {
    return app;
  }

  try {
    // Vérifier si une app existe déjà
    app = admin.app();
    return app;
  } catch (error) {
    // Pas d'app existante, on l'initialise

    // Sur Vercel, on peut utiliser les variables d'environnement
    // ou les credentials par défaut
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

    if (!projectId) {
      throw new Error('VITE_FIREBASE_PROJECT_ID non configurée');
    }

    // Initialiser avec les credentials par défaut
    // Sur Vercel, définir GOOGLE_APPLICATION_CREDENTIALS
    // ou utiliser les variables d'environnement individuelles
    app = admin.initializeApp({
      projectId,
      // credential: admin.credential.applicationDefault(), // Utilise GOOGLE_APPLICATION_CREDENTIALS
    });

    console.log('Firebase Admin initialisé');

    return app;
  }
}

/**
 * Retourne l'instance Firestore
 */
export function getFirestore(): admin.firestore.Firestore {
  const app = getFirebaseAdmin();
  return app.firestore();
}

/**
 * Retourne l'instance Auth
 */
export function getAuth(): admin.auth.Auth {
  const app = getFirebaseAdmin();
  return app.auth();
}
