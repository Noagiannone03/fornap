/**
 * Route API: Endpoint pour le tracking des clics
 *
 * Endpoint: GET /api/campaigns/pxl/click?l=LINK_ID
 *
 * Cette route enregistre le clic et redirige vers l'URL originale.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore, getFieldValue } from '../../_lib/firebase-admin.js';

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
    // PXL envoie le lien comme ?l=LINK_ID
    // On doit extraire les infos du link ID qui contient: CAMPAIGN_ID-RECIPIENT_ID-URL_ENCODEE
    const { l: linkId } = req.query;

    console.log(`🖱️ [TRACKING] Clic - Link ID: ${linkId}`);

    // URL par défaut
    const defaultUrl = 'https://fornap.com';

    if (!linkId || typeof linkId !== 'string') {
      res.redirect(302, defaultUrl);
      return;
    }

    // Le linkId devrait contenir les métadonnées dans son format
    // Pour l'instant, on redirige juste vers la home
    // TODO: Stocker et récupérer les vraies URLs

    res.redirect(302, defaultUrl);
  } catch (error) {
    console.error('❌ Erreur tracking clic:', error);
    res.redirect(302, 'https://fornap.com');
  }
}
