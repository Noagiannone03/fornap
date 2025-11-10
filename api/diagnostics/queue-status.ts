/**
 * Route API: Diagnostiquer le statut de la queue QStash
 *
 * Vérifie la configuration et affiche l'URL de callback
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { RESEND_CONFIG } from '../../src/shared/config/email.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    const callbackUrl = `${RESEND_CONFIG.webhookBaseUrl}/api/campaigns/process-batch`;

    res.status(200).json({
      success: true,
      config: {
        VERCEL_URL: process.env.VERCEL_URL || 'Non définie',
        WEBHOOK_BASE_URL: process.env.WEBHOOK_BASE_URL || 'Non définie',
        webhookBaseUrl: RESEND_CONFIG.webhookBaseUrl,
        callbackUrl: callbackUrl,
      },
      message: 'QStash utilisera cette URL pour appeler le traitement des batches',
      note: 'Cette URL doit être publiquement accessible sur Internet',
    });
  } catch (error: any) {
    console.error('Error checking queue status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la vérification',
    });
  }
}
