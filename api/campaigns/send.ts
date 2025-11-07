/**
 * Route API: Déclencher l'envoi d'une campagne
 *
 * Endpoint: POST /api/campaigns/send
 *
 * Cette route:
 * 1. Récupère la campagne et ses destinataires
 * 2. Crée des batches pour respecter les limites de Vercel
 * 3. Publie les batches dans QStash pour traitement asynchrone
 * 4. Met à jour le statut de la campagne à 'sending'
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore } from '../_lib/firebase-admin';
import {
  publishEmailBatches,
  createBatchPayloads,
  testQStashConnection,
} from '../../src/shared/services/queueService';
import { EMAIL_CONFIG, validateEmailConfig } from '../../src/shared/config/email';
import type { Campaign, CampaignRecipient } from '../../src/shared/types/campaign';
import type { SendCampaignResponse } from '../../src/shared/types/email';

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
    console.log('=== Démarrage de l\'envoi de campagne ===');

    // 1. Valider la configuration
    const configValidation = validateEmailConfig();
    if (!configValidation.valid) {
      console.error('Configuration invalide:', configValidation.errors);
      res.status(500).json({
        success: false,
        message: 'Configuration email invalide',
        errors: configValidation.errors,
      } as SendCampaignResponse);
      return;
    }

    // 2. Tester la connexion QStash
    const qstashTest = await testQStashConnection();
    if (!qstashTest.success) {
      console.error('Erreur QStash:', qstashTest.error);
      res.status(500).json({
        success: false,
        message: 'Erreur de connexion QStash',
        errors: [qstashTest.error || 'Erreur inconnue'],
      } as SendCampaignResponse);
      return;
    }

    // 3. Récupérer l'ID de la campagne
    const { campaignId } = req.body;

    if (!campaignId) {
      res.status(400).json({
        success: false,
        message: 'ID de campagne manquant',
        errors: ['campaignId requis'],
      } as SendCampaignResponse);
      return;
    }

    console.log(`Traitement de la campagne: ${campaignId}`);

    // 4. Récupérer la campagne depuis Firestore
    const db = getFirestore();
    const campaignRef = db.collection('campaigns').doc(campaignId);
    const campaignSnap = await campaignRef.get();

    if (!campaignSnap.exists) {
      res.status(404).json({
        success: false,
        message: 'Campagne introuvable',
        errors: ['Campagne inexistante'],
      } as SendCampaignResponse);
      return;
    }

    const campaign = campaignSnap.data() as Campaign;

    // 5. Vérifier le statut de la campagne
    if (campaign.status !== 'scheduled' && campaign.status !== 'draft') {
      res.status(400).json({
        success: false,
        message: `Impossible d'envoyer une campagne avec le statut: ${campaign.status}`,
        errors: ['Statut invalide'],
      } as SendCampaignResponse);
      return;
    }

    console.log(`Campagne "${campaign.name}" - Statut: ${campaign.status}`);

    // 6. Récupérer tous les destinataires
    const recipientsSnap = await campaignRef
      .collection('recipients')
      .where('status', '==', 'pending')
      .get();

    if (recipientsSnap.empty) {
      res.status(400).json({
        success: false,
        message: 'Aucun destinataire en attente',
        errors: ['Pas de destinataires'],
      } as SendCampaignResponse);
      return;
    }

    const recipients: CampaignRecipient[] = recipientsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as CampaignRecipient)
    );

    console.log(`${recipients.length} destinataires à traiter`);

    // 7. Créer les payloads pour les batches
    const recipientIds = recipients.map((r) => r.id);
    const batchPayloads = createBatchPayloads(
      campaignId,
      recipientIds,
      EMAIL_CONFIG.BATCH_SIZE
    );

    console.log(`${batchPayloads.length} batches créés (${EMAIL_CONFIG.BATCH_SIZE} emails/batch)`);

    // 8. Mettre à jour le statut de la campagne à 'sending'
    await campaignRef.update({
      status: 'sending',
      updatedAt: new Date(),
    });

    console.log('Statut de la campagne mis à jour: sending');

    // 9. Publier les batches dans QStash
    const publishResult = await publishEmailBatches(batchPayloads);

    console.log(
      `Publication terminée: ${publishResult.publishedCount}/${batchPayloads.length} batches publiés`
    );

    // 10. Répondre avec le résultat
    if (publishResult.success) {
      res.status(200).json({
        success: true,
        message: `Envoi de ${recipients.length} emails démarré avec succès`,
        stats: {
          campaignId,
          totalRecipients: recipients.length,
          totalBatches: batchPayloads.length,
          processedBatches: 0,
          sentCount: 0,
          pendingCount: recipients.length,
          failedCount: 0,
          progressPercentage: 0,
          status: 'sending' as const,
        },
      } as SendCampaignResponse);
    } else {
      // Si certains batches ont échoué, on retourne quand même un succès partiel
      res.status(207).json({
        success: false,
        message: `Envoi démarré avec des erreurs (${publishResult.publishedCount}/${batchPayloads.length} batches publiés)`,
        stats: {
          campaignId,
          totalRecipients: recipients.length,
          totalBatches: batchPayloads.length,
          processedBatches: 0,
          sentCount: 0,
          pendingCount: recipients.length,
          failedCount: 0,
          progressPercentage: 0,
          status: 'sending' as const,
        },
        errors: publishResult.errors,
      } as SendCampaignResponse);
    }
  } catch (error) {
    console.error('Erreur lors du déclenchement de l\'envoi:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      errors: [error instanceof Error ? error.message : 'Erreur inconnue'],
    } as SendCampaignResponse);
  }
}
