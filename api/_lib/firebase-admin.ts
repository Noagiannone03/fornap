/**
 * Helper pour initialiser Firebase Admin SDK dans les routes API
 *
 * Firebase Admin doit être initialisé une seule fois.
 * Ce module gère l'initialisation singleton.
 */

import admin from 'firebase-admin';

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

    // Option 1: Service Account en base64 (Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      try {
        const serviceAccount = JSON.parse(
          Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString()
        );

        app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId,
        });
        console.log('Firebase Admin initialisé avec Service Account (base64)');
      } catch (parseError) {
        console.error('Erreur parsing Service Account:', parseError);
        throw new Error('Service Account invalide');
      }
    }
    // Option 2: Variables individuelles
    else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId,
      });
      console.log('Firebase Admin initialisé avec credentials individuelles');
    }
    // Option 3: Credentials par défaut (développement local)
    else {
      try {
        app = admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId,
        });
        console.log('Firebase Admin initialisé avec credentials par défaut');
      } catch (defaultError) {
        throw new Error(
          'Firebase Admin: Aucune credential trouvée. ' +
          'Ajoutez FIREBASE_SERVICE_ACCOUNT_BASE64 dans Vercel. ' +
          'Voir docs/FIREBASE_ADMIN_SETUP.md'
        );
      }
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
