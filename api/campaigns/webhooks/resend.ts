/**
 * Route API: Webhooks Resend
 *
 * Endpoint: POST /api/campaigns/webhooks/resend
 *
 * Cette route reçoit les webhooks de Resend pour:
 * - email.delivered: Email livré
 * - email.bounced: Email rebondi (bounce)
 * - email.complained: Plainte pour spam
 * - email.opened: Email ouvert (si activé chez Resend)
 * - email.clicked: Lien cliqué (si activé chez Resend)
 *
 * Note: Pour utiliser les webhooks Resend, vous devez:
 * 1. Configurer un webhook dans le dashboard Resend
 * 2. Pointer vers cette URL: https://votre-domaine.vercel.app/api/campaigns/webhooks/resend
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore } from '../../_lib/firebase-admin';
import type { ResendWebhookEvent } from '../../../src/shared/types/email';

/**
 * Handler principal
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Vérifier la méthode HTTP
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    console.log('=== Webhook Resend reçu ===');

    // 1. Parser l'événement
    const event: ResendWebhookEvent = req.body;

    console.log(`Type d'événement: ${event.type}`);
    console.log(`Email ID: ${event.data.email_id}`);

    // 2. Extraire l'ID du destinataire depuis les headers (si présent)
    // Resend renvoie les headers personnalisés dans les webhooks
    const recipientId = extractRecipientId(event);
    const campaignId = extractCampaignId(event);

    if (!recipientId || !campaignId) {
      console.warn('Impossible d\'extraire recipientId ou campaignId');
      // On accepte quand même le webhook pour ne pas bloquer Resend
      res.status(200).json({ received: true });
      return;
    }

    console.log(`Campaign: ${campaignId}, Recipient: ${recipientId}`);

    // 3. Traiter l'événement selon son type
    await handleEvent(event.type, campaignId, recipientId, event.data);

    // 4. Répondre à Resend
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erreur lors du traitement du webhook:', error);

    // On répond quand même 200 pour ne pas que Resend retry indéfiniment
    res.status(200).json({
      received: true,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
}

/**
 * Traite un événement selon son type
 */
async function handleEvent(
  eventType: string,
  campaignId: string,
  recipientId: string,
  data: any
): Promise<void> {
  const db = getFirestore();
  const recipientRef = db
    .collection('campaigns')
    .doc(campaignId)
    .collection('recipients')
    .doc(recipientId);

  const now = new Date();

  switch (eventType) {
    case 'email.delivered':
      console.log('Email livré avec succès');
      // On ne change pas le statut, il reste 'sent'
      break;

    case 'email.bounced':
      console.log('Email rebondi (bounce)');
      await recipientRef.update({
        status: 'bounced',
        bouncedAt: now,
        updatedAt: now,
      });
      break;

    case 'email.complained':
      console.log('Plainte pour spam');
      // Marquer comme bounced aussi
      await recipientRef.update({
        status: 'bounced',
        bouncedAt: now,
        updatedAt: now,
      });
      break;

    case 'email.opened':
      console.log('Email ouvert');
      // Récupérer le destinataire pour incrémenter le compteur
      const recipientSnap = await recipientRef.get();
      if (recipientSnap.exists) {
        const recipient = recipientSnap.data();
        const openCount = (recipient?.openCount || 0) + 1;

        await recipientRef.update({
          status: 'opened',
          openedAt: recipient?.openedAt || now, // Garder la première ouverture
          openCount,
          updatedAt: now,
        });
      }
      break;

    case 'email.clicked':
      console.log('Lien cliqué');
      // Récupérer le destinataire pour incrémenter le compteur
      const recipientSnapClick = await recipientRef.get();
      if (recipientSnapClick.exists) {
        const recipient = recipientSnapClick.data();
        const clickCount = (recipient?.clickCount || 0) + 1;

        await recipientRef.update({
          status: 'clicked',
          clickedAt: recipient?.clickedAt || now, // Garder le premier clic
          clickCount,
          updatedAt: now,
        });
      }
      break;

    default:
      console.log(`Type d'événement non géré: ${eventType}`);
  }

  // Recalculer les stats de la campagne
  await updateCampaignStatsFromWebhook(campaignId);
}

/**
 * Extrait l'ID du destinataire depuis l'événement
 */
function extractRecipientId(event: ResendWebhookEvent): string | null {
  // L'ID du destinataire peut être dans les tags ou headers
  // On l'a ajouté lors de l'envoi avec la clé 'X-Recipient-ID'
  try {
    // Chercher dans les tags
    if (event.data && typeof event.data === 'object') {
      // Resend peut renvoyer les tags différemment selon la configuration
      const recipientId = (event.data as any).recipient_id;
      if (recipientId) return recipientId;
    }

    // Si pas trouvé, retourner null
    return null;
  } catch (error) {
    console.error('Erreur lors de l\'extraction du recipientId:', error);
    return null;
  }
}

/**
 * Extrait l'ID de la campagne depuis l'événement
 */
function extractCampaignId(event: ResendWebhookEvent): string | null {
  try {
    // Chercher dans les tags
    if (event.data && typeof event.data === 'object') {
      const campaignId = (event.data as any).campaign_id;
      if (campaignId) return campaignId;
    }

    return null;
  } catch (error) {
    console.error('Erreur lors de l\'extraction du campaignId:', error);
    return null;
  }
}

/**
 * Met à jour les statistiques d'une campagne (version simplifiée)
 */
async function updateCampaignStatsFromWebhook(
  campaignId: string
): Promise<void> {
  try {
    const db = getFirestore();
    const campaignRef = db.collection('campaigns').doc(campaignId);

    // Récupérer tous les destinataires
    const recipientsSnap = await campaignRef.collection('recipients').get();
    const recipients = recipientsSnap.docs.map((doc) => doc.data());

    // Calculer les statistiques
    const totalRecipients = recipients.length;
    const sent = recipients.filter((r: any) => r.status === 'sent' || r.status === 'opened' || r.status === 'clicked').length;
    const pending = recipients.filter((r: any) => r.status === 'pending').length;
    const failed = recipients.filter((r: any) => r.status === 'failed').length;
    const opened = recipients.filter((r: any) => r.status === 'opened' || r.status === 'clicked').length;
    const clicked = recipients.filter((r: any) => r.status === 'clicked').length;
    const bounced = recipients.filter((r: any) => r.status === 'bounced').length;

    // Calculer les taux
    const openRate = sent > 0 ? (opened / sent) * 100 : 0;
    const clickRate = sent > 0 ? (clicked / sent) * 100 : 0;
    const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;
    const failureRate = totalRecipients > 0 ? (failed / totalRecipients) * 100 : 0;

    // Mettre à jour
    await campaignRef.update({
      'stats.opened': opened,
      'stats.clicked': clicked,
      'stats.bounced': bounced,
      'stats.openRate': Math.round(openRate * 100) / 100,
      'stats.clickRate': Math.round(clickRate * 100) / 100,
      'stats.bounceRate': Math.round(bounceRate * 100) / 100,
      updatedAt: new Date(),
    });

    console.log('Statistiques de campagne mises à jour');
  } catch (error) {
    console.error('Erreur lors de la mise à jour des stats:', error);
  }
}
