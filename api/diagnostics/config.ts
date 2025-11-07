/**
 * Route API: Vérifier la configuration des variables d'environnement
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    const config = {
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      QSTASH_TOKEN: !!process.env.QSTASH_TOKEN,
      QSTASH_CURRENT_SIGNING_KEY: !!process.env.QSTASH_CURRENT_SIGNING_KEY,
      QSTASH_NEXT_SIGNING_KEY: !!process.env.QSTASH_NEXT_SIGNING_KEY,
      WEBHOOK_BASE_URL: !!process.env.WEBHOOK_BASE_URL || !!process.env.VERCEL_URL,
      VITE_FIREBASE_PROJECT_ID: !!process.env.VITE_FIREBASE_PROJECT_ID,
    };

    const allConfigured = Object.values(config).every(Boolean);

    res.status(200).json({
      success: allConfigured,
      config,
      message: allConfigured
        ? 'Toutes les variables sont configurées'
        : 'Certaines variables sont manquantes',
    });
  } catch (error: any) {
    console.error('Error checking config:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la vérification',
    });
  }
}
