/**
 * Route API: Traiter un batch d'emails
 *
 * Endpoint: POST /api/campaigns/process-batch
 *
 * Cette route est appelée par QStash pour chaque batch.
 * Elle:
 * 1. Vérifie la signature QStash pour la sécurité
 * 2. Récupère les destinataires et le contenu de la campagne
 * 3. Envoie les emails via Resend
 * 4. Met à jour les statuts dans Firestore
 * 5. Met à jour les statistiques de la campagne
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore } from '../_lib/firebase-admin.js';
import { verifyQStashSignature } from '../../src/shared/services/queueService.js';
import {
  sendEmailBatch,
  prepareEmailOptions,
} from '../../src/shared/services/emailService.js';
import type { QStashEmailPayload, BatchProcessResult } from '../../src/shared/types/email.js';
import type { Campaign, CampaignRecipient, CampaignStats } from '../../src/shared/types/campaign.js';

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
    console.log('=== Traitement d\'un batch d\'emails ===');

    // 1. Vérifier la signature QStash
    const signatureCheck = await verifyQStashSignature(req as any);
    if (!signatureCheck.valid) {
      console.error('Signature QStash invalide:', signatureCheck.error);
      res.status(401).json({
        error: 'Signature invalide',
        message: signatureCheck.error,
      });
      return;
    }

    console.log('Signature QStash vérifiée ✓');

    // 2. Parser le payload
    const payload: QStashEmailPayload = req.body;

    if (!payload.campaignId || !payload.recipientIds) {
      res.status(400).json({ error: 'Payload invalide' });
      return;
    }

    console.log(
      `Batch ${payload.batchIndex + 1}/${payload.totalBatches} - Campagne: ${payload.campaignId}`
    );
    console.log(`${payload.recipientIds.length} emails à envoyer`);

    const startTime = Date.now();

    // 3. Récupérer la campagne
    const db = getFirestore();
    const campaignRef = db.collection('campaigns').doc(payload.campaignId);
    const campaignSnap = await campaignRef.get();

    if (!campaignSnap.exists) {
      console.error('Campagne introuvable');
      res.status(404).json({ error: 'Campagne introuvable' });
      return;
    }

    const campaign = campaignSnap.data() as Campaign;
    console.log(`Campagne: "${campaign.name}"`);

    // 4. Récupérer les destinataires
    const recipientsPromises = payload.recipientIds.map((recipientId) =>
      campaignRef.collection('recipients').doc(recipientId).get()
    );

    const recipientsSnaps = await Promise.all(recipientsPromises);

    const recipients: CampaignRecipient[] = recipientsSnaps
      .filter((snap) => snap.exists)
      .map((snap) => ({ id: snap.id, ...snap.data() } as CampaignRecipient));

    console.log(`${recipients.length} destinataires récupérés`);

    // 5. Préparer les emails
    const emailOptions = recipients.map((recipient) =>
      prepareEmailOptions(recipient, payload.campaignId, {
        subject: campaign.content.subject,
        html: campaign.content.html,
        fromName: campaign.content.fromName,
        fromEmail: campaign.content.fromEmail,
        replyTo: campaign.content.replyTo,
      })
    );

    console.log('Emails préparés, début de l\'envoi...');

    // 6. Envoyer les emails
    const sendResults = await sendEmailBatch(emailOptions);

    console.log('Envoi terminé, mise à jour des statuts...');

    // 7. Mettre à jour les statuts des destinataires
    const batch = db.batch();

    for (const result of sendResults) {
      const recipientRef = campaignRef
        .collection('recipients')
        .doc(result.recipientId);

      if (result.success) {
        batch.update(recipientRef, {
          status: 'sent',
          sentAt: result.sentAt || new Date(),
          updatedAt: new Date(),
        });
      } else {
        batch.update(recipientRef, {
          status: 'failed',
          errorMessage: result.error || 'Erreur inconnue',
          updatedAt: new Date(),
        });
      }
    }

    await batch.commit();

    console.log('Statuts mis à jour');

    // 8. Recalculer les statistiques de la campagne
    await updateCampaignStats(campaignRef);

    console.log('Statistiques mises à jour');

    // 9. Vérifier si tous les batches sont terminés
    const allRecipientsSnap = await campaignRef.collection('recipients').get();
    const allRecipients = allRecipientsSnap.docs.map((doc) => doc.data());

    const pendingCount = allRecipients.filter(
      (r: any) => r.status === 'pending'
    ).length;

    // Si plus aucun destinataire en attente, marquer la campagne comme terminée
    if (pendingCount === 0) {
      console.log('Tous les emails envoyés, campagne terminée');

      await campaignRef.update({
        status: 'sent',
        sentAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 10. Préparer le résultat
    const successCount = sendResults.filter((r) => r.success).length;
    const failureCount = sendResults.filter((r) => !r.success).length;

    const duration = Date.now() - startTime;

    const result: BatchProcessResult = {
      batchId: payload.batchId,
      campaignId: payload.campaignId,
      successCount,
      failureCount,
      results: sendResults,
      completedAt: new Date(),
    };

    console.log(`=== Batch terminé en ${duration}ms ===`);
    console.log(`Succès: ${successCount}, Échecs: ${failureCount}`);

    // 11. Répondre
    res.status(200).json(result);
  } catch (error) {
    console.error('Erreur lors du traitement du batch:', error);

    res.status(500).json({
      error: 'Erreur interne',
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
}

/**
 * Met à jour les statistiques d'une campagne
 */
async function updateCampaignStats(
  campaignRef: FirebaseFirestore.DocumentReference
): Promise<void> {
  try {
    // Récupérer tous les destinataires
    const recipientsSnap = await campaignRef.collection('recipients').get();

    const recipients = recipientsSnap.docs.map((doc) => doc.data());

    // Calculer les statistiques
    const totalRecipients = recipients.length;
    const sent = recipients.filter((r: any) => r.status === 'sent').length;
    const pending = recipients.filter((r: any) => r.status === 'pending').length;
    const failed = recipients.filter((r: any) => r.status === 'failed').length;
    const opened = recipients.filter((r: any) => r.status === 'opened').length;
    const clicked = recipients.filter((r: any) => r.status === 'clicked').length;
    const bounced = recipients.filter((r: any) => r.status === 'bounced').length;

    // Calculer les taux
    const openRate = sent > 0 ? (opened / sent) * 100 : 0;
    const clickRate = sent > 0 ? (clicked / sent) * 100 : 0;
    const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;
    const failureRate =
      totalRecipients > 0 ? (failed / totalRecipients) * 100 : 0;

    const stats: CampaignStats = {
      totalRecipients,
      sent,
      pending,
      failed,
      opened,
      clicked,
      bounced,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
    };

    // Mettre à jour
    await campaignRef.update({
      stats,
      updatedAt: new Date(),
    });

    console.log('Statistiques calculées:', stats);
  } catch (error) {
    console.error('Erreur lors de la mise à jour des stats:', error);
    throw error;
  }
}
