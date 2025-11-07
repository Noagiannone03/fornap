/**
 * Route API: Tracking des clics dans les emails
 *
 * Endpoint: GET /api/campaigns/track/click
 *
 * Cette route enregistre le clic et redirige vers l'URL originale.
 *
 * Paramètres:
 * - campaign: ID de la campagne
 * - recipient: ID du destinataire
 * - url: URL originale (encodée)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore } from '../../_lib/firebase-admin';

/**
 * Handler principal
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    // 1. Récupérer les paramètres
    const { campaign, recipient, url } = req.query;

    // URL par défaut si manquante
    const defaultUrl = 'https://fornap.com';

    if (!url) {
      res.redirect(302, defaultUrl);
      return;
    }

    const originalUrl = decodeURIComponent(url as string);

    // Si pas de campaign/recipient, rediriger quand même
    if (!campaign || !recipient) {
      res.redirect(302, originalUrl);
      return;
    }

    const campaignId = campaign as string;
    const recipientId = recipient as string;

    console.log(`Tracking clic - Campaign: ${campaignId}, Recipient: ${recipientId}`);
    console.log(`URL: ${originalUrl}`);

    // 2. Enregistrer le clic (async, sans bloquer)
    recordClick(campaignId, recipientId).catch((error) => {
      console.error('Erreur lors de l\'enregistrement du clic:', error);
    });

    // 3. Rediriger immédiatement vers l'URL originale
    res.redirect(302, originalUrl);
  } catch (error) {
    console.error('Erreur dans le tracking de clic:', error);

    // Rediriger quand même vers l'URL ou la page d'accueil
    const fallbackUrl = (req.query.url as string) || 'https://fornap.com';
    res.redirect(302, fallbackUrl);
  }
}

/**
 * Enregistre le clic sur un lien
 */
async function recordClick(
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

    // Incrémenter le compteur de clics
    const clickCount = (recipient?.clickCount || 0) + 1;

    // Mettre à jour le statut
    await recipientRef.update({
      status: 'clicked',
      clickedAt: recipient?.clickedAt || now, // Garder le premier clic
      clickCount,
      updatedAt: now,
    });

    console.log(`Clic enregistré (count: ${clickCount})`);

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
