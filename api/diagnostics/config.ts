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
      SMTP_HOST: !!process.env.SMTP_HOST,
      SMTP_PORT: !!process.env.SMTP_PORT,
      SMTP_USER: !!process.env.SMTP_USER,
      SMTP_PASSWORD: !!process.env.SMTP_PASSWORD,
      VITE_FIREBASE_PROJECT_ID: !!process.env.VITE_FIREBASE_PROJECT_ID,
    };

    const allConfigured = Object.values(config).every(Boolean);

    res.status(200).json({
      success: allConfigured,
      config,
      message: allConfigured
        ? 'Toutes les variables SMTP sont configurées'
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
