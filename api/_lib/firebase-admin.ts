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

    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

    if (!projectId) {
      throw new Error('VITE_FIREBASE_PROJECT_ID non configurée');
    }

    // Initialiser avec les credentials
    // Option 1: GOOGLE_APPLICATION_CREDENTIALS (fichier JSON)
    // Option 2: Variables d'environnement individuelles pour Vercel

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Utiliser le fichier service account (local)
      app = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
    } else {
      // Utiliser les credentials par défaut (Vercel)
      app = admin.initializeApp({
        projectId,
      });
    }

    console.log('Firebase Admin initialisé avec succès');

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
