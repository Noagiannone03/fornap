/**
 * Route API: Tracking des ouvertures d'emails (LEGACY - Gardé pour compatibilité)
 *
 * Endpoint: GET /api/campaigns/track/open
 *
 * ⚠️ LEGACY: Cette route est conservée pour compatibilité avec les anciens emails.
 * Les nouveaux emails utilisent /api/campaigns/pxl/open avec la librairie PXL.
 *
 * Cette route renvoie un pixel transparent 1x1 et enregistre
 * l'ouverture de l'email dans Firestore.
 *
 * Paramètres:
 * - campaign: ID de la campagne
 * - recipient: ID du destinataire
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore } from '../../_lib/firebase-admin.js';

// Pixel transparent 1x1 en base64
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * Handler principal
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    // 1. Récupérer les paramètres
    const { campaign, recipient } = req.query;

    if (!campaign || !recipient) {
      // Renvoyer quand même le pixel pour ne pas casser l'affichage de l'email
      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.status(200).send(TRACKING_PIXEL);
      return;
    }

    const campaignId = campaign as string;
    const recipientId = recipient as string;

    console.log(`Tracking ouverture - Campaign: ${campaignId}, Recipient: ${recipientId}`);

    // 2. Enregistrer l'ouverture (async, sans bloquer la réponse)
    recordOpen(campaignId, recipientId).catch((error) => {
      console.error('Erreur lors de l\'enregistrement de l\'ouverture:', error);
    });

    // 3. Renvoyer le pixel immédiatement
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.status(200).send(TRACKING_PIXEL);
  } catch (error) {
    console.error('Erreur dans le tracking d\'ouverture:', error);

    // Renvoyer quand même le pixel
    res.setHeader('Content-Type', 'image/gif');
    res.status(200).send(TRACKING_PIXEL);
  }
}

/**
 * Enregistre l'ouverture d'un email
 */
async function recordOpen(
  campaignId: string,
  recipientId: string
): Promise<void> {
  try {
    const db = getFirestore();
    const recipientRef = db
      .collection('campaigns')
      .doc(campaignId)
      .collection('recipients')
      .doc(recipientId);

    const recipientSnap = await recipientRef.get();

    if (!recipientSnap.exists) {
      console.warn('Destinataire introuvable');
      return;
    }

    const recipient = recipientSnap.data();
    const now = new Date();

    // Incrémenter le compteur d'ouvertures
    const openCount = (recipient?.openCount || 0) + 1;

    // Mettre à jour le statut
    await recipientRef.update({
      status: 'opened',
      openedAt: recipient?.openedAt || now, // Garder la première ouverture
      openCount,
      updatedAt: now,
    });

    console.log(`Ouverture enregistrée (count: ${openCount})`);

    // Mettre à jour les stats de la campagne
    await updateCampaignStats(campaignId);
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement:', error);
    throw error;
  }
}

/**
 * Met à jour les statistiques de la campagne
 */
async function updateCampaignStats(campaignId: string): Promise<void> {
  try {
    const db = getFirestore();
    const campaignRef = db.collection('campaigns').doc(campaignId);

    // Récupérer tous les destinataires
    const recipientsSnap = await campaignRef.collection('recipients').get();
    const recipients = recipientsSnap.docs.map((doc) => doc.data());

    // Calculer les stats
    const totalRecipients = recipients.length;
    const sent = recipients.filter(
      (r: any) =>
        r.status === 'sent' ||
        r.status === 'opened' ||
        r.status === 'clicked'
    ).length;
    const opened = recipients.filter(
      (r: any) => r.status === 'opened' || r.status === 'clicked'
    ).length;
    const clicked = recipients.filter((r: any) => r.status === 'clicked')
      .length;

    const openRate = sent > 0 ? (opened / sent) * 100 : 0;
    const clickRate = sent > 0 ? (clicked / sent) * 100 : 0;

    // Mettre à jour
    await campaignRef.update({
      'stats.opened': opened,
      'stats.clicked': clicked,
      'stats.openRate': Math.round(openRate * 100) / 100,
      'stats.clickRate': Math.round(clickRate * 100) / 100,
      updatedAt: new Date(),
    });

    console.log('Stats mises à jour');
  } catch (error) {
    console.error('Erreur mise à jour stats:', error);
  }
}
