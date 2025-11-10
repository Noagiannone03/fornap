/**
 * Route API: Vérifier le statut d'une campagne
 *
 * Endpoint: GET /api/diagnostics/campaign-status?campaignId=xxx
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore } from '../_lib/firebase-admin.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    const { campaignId } = req.query;

    if (!campaignId || typeof campaignId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'campaignId requis',
      });
      return;
    }

    const db = getFirestore();

    // Récupérer la campagne
    const campaignRef = db.collection('campaigns').doc(campaignId);
    const campaignSnap = await campaignRef.get();

    if (!campaignSnap.exists) {
      res.status(404).json({
        success: false,
        error: 'Campagne introuvable',
      });
      return;
    }

    const campaign = campaignSnap.data();

    // Récupérer TOUS les destinataires
    const recipientsSnap = await campaignRef
      .collection('recipients')
      .get();

    const recipients = recipientsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Compter par statut
    const statusCounts = {
      pending: 0,
      sent: 0,
      failed: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
    };

    const failedRecipients: any[] = [];

    recipients.forEach((r: any) => {
      if (r.status in statusCounts) {
        statusCounts[r.status as keyof typeof statusCounts]++;
      }

      if (r.status === 'failed') {
        failedRecipients.push({
          id: r.id,
          email: r.email,
          error: r.errorMessage || 'Erreur inconnue',
        });
      }
    });

    res.status(200).json({
      success: true,
      campaign: {
        id: campaignId,
        name: campaign?.name,
        status: campaign?.status,
        createdAt: campaign?.createdAt?.toDate?.() || campaign?.createdAt,
        sentAt: campaign?.sentAt?.toDate?.() || campaign?.sentAt,
      },
      recipients: {
        total: recipients.length,
        byStatus: statusCounts,
      },
      failedRecipients: failedRecipients.slice(0, 10), // Max 10 pour ne pas surcharger
      message: statusCounts.pending > 0
        ? `⚠️ ${statusCounts.pending} emails encore en attente. QStash doit appeler /api/campaigns/process-batch`
        : '✅ Tous les emails ont été traités',
    });
  } catch (error: any) {
    console.error('Error checking campaign status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la vérification',
    });
  }
}
