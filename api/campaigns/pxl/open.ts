/**
 * Route API: Endpoint pour le tracking des ouvertures
 *
 * Endpoint: GET /api/campaigns/pxl/open?pxl=RECIPIENT_ID&metadata=CAMPAIGN_ID
 *
 * Cette route enregistre l'ouverture d'un email et retourne un pixel transparent.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore, getFieldValue } from '../../_lib/firebase-admin.js';

// Pixel transparent 1x1 en base64
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * Met à jour les statistiques de la campagne
 */
async function updateCampaignStats(campaignId: string): Promise<void> {
  try {
    const db = getFirestore();
    const FieldValue = getFieldValue();
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
    const pending = recipients.filter((r: any) => r.status === 'pending').length;
    const failed = recipients.filter((r: any) => r.status === 'failed').length;
    const opened = recipients.filter(
      (r: any) => r.status === 'opened' || r.status === 'clicked'
    ).length;
    const clicked = recipients.filter((r: any) => r.status === 'clicked').length;
    const bounced = recipients.filter((r: any) => r.status === 'bounced').length;

    const openRate = sent > 0 ? (opened / sent) * 100 : 0;
    const clickRate = sent > 0 ? (clicked / sent) * 100 : 0;
    const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;
    const failureRate = sent > 0 ? (failed / sent) * 100 : 0;

    // Mettre à jour
    await campaignRef.update({
      'stats.totalRecipients': totalRecipients,
      'stats.sent': sent,
      'stats.pending': pending,
      'stats.failed': failed,
      'stats.opened': opened,
      'stats.clicked': clicked,
      'stats.bounced': bounced,
      'stats.openRate': Math.round(openRate * 100) / 100,
      'stats.clickRate': Math.round(clickRate * 100) / 100,
      'stats.bounceRate': Math.round(bounceRate * 100) / 100,
      'stats.failureRate': Math.round(failureRate * 100) / 100,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log('✅ Stats de campagne mises à jour');
  } catch (error) {
    console.error('❌ Erreur updateCampaignStats:', error);
  }
}

/**
 * Handler principal
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    // PXL envoie les paramètres comme: ?pxl=RECIPIENT_ID&metadata=CAMPAIGN_ID
    const { pxl: recipientId, metadata: campaignId } = req.query;

    console.log(`📧 [TRACKING] Ouverture - Campaign: ${campaignId}, Recipient: ${recipientId}`);

    if (recipientId && campaignId && typeof recipientId === 'string' && typeof campaignId === 'string') {
      // Enregistrer l'ouverture de manière asynchrone (sans bloquer la réponse)
      recordOpen(campaignId, recipientId).catch((error) => {
        console.error('❌ Erreur enregistrement ouverture:', error);
      });
    }

    // Retourner immédiatement le pixel
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.status(200).send(TRACKING_PIXEL);
  } catch (error) {
    console.error('❌ Erreur tracking ouverture:', error);
    // Retourner quand même le pixel
    res.setHeader('Content-Type', 'image/gif');
    res.status(200).send(TRACKING_PIXEL);
  }
}

/**
 * Enregistre une ouverture d'email
 */
async function recordOpen(campaignId: string, recipientId: string): Promise<void> {
  try {
    const db = getFirestore();
    const FieldValue = getFieldValue();

    const recipientRef = db
      .collection('campaigns')
      .doc(campaignId)
      .collection('recipients')
      .doc(recipientId);

    const recipientSnap = await recipientRef.get();

    if (!recipientSnap.exists) {
      console.warn('⚠️ Destinataire introuvable');
      return;
    }

    const recipient = recipientSnap.data();
    const openCount = (recipient?.openCount || 0) + 1;

    // Mettre à jour le statut
    await recipientRef.update({
      status: 'opened',
      openedAt: recipient?.openedAt || FieldValue.serverTimestamp(),
      openCount,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Ouverture enregistrée (count: ${openCount})`);

    // Mettre à jour les stats de la campagne
    await updateCampaignStats(campaignId);
  } catch (error) {
    console.error('❌ Erreur recordOpen:', error);
    throw error;
  }
}
