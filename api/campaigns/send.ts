/**
 * Route API: Préparer une campagne pour l'envoi
 *
 * Endpoint: POST /api/campaigns/send
 *
 * Cette route:
 * 1. Vérifie la campagne
 * 2. Compte les destinataires en attente
 * 3. Change le statut à 'sending'
 * 4. Retourne le nombre de destinataires
 *
 * Note: L'envoi réel se fait depuis le front-end via send-campaign-email.ts
 * pour permettre un suivi en temps réel
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore, getFieldValue } from '../_lib/firebase-admin.js';
import type { Campaign } from '../../src/shared/types/campaign.js';

/**
 * Handler principal
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    console.log('=== Préparation de la campagne pour envoi ===');

    const { campaignId } = req.body;

    if (!campaignId) {
      res.status(400).json({
        success: false,
        message: 'ID de campagne manquant',
      });
      return;
    }

    const db = getFirestore();
    const FieldValue = getFieldValue();
    const campaignRef = db.collection('campaigns').doc(campaignId);
    const campaignSnap = await campaignRef.get();

    if (!campaignSnap.exists) {
      res.status(404).json({
        success: false,
        message: 'Campagne introuvable',
      });
      return;
    }

    const campaign = campaignSnap.data() as Campaign;

    // Vérifier le statut
    if (campaign.status !== 'scheduled' && campaign.status !== 'draft') {
      res.status(400).json({
        success: false,
        message: `Impossible d'envoyer une campagne avec le statut: ${campaign.status}`,
      });
      return;
    }

    // Compter les destinataires en attente
    const recipientsSnap = await campaignRef
      .collection('recipients')
      .where('status', '==', 'pending')
      .get();

    if (recipientsSnap.empty) {
      res.status(400).json({
        success: false,
        message: 'Aucun destinataire en attente',
      });
      return;
    }

    const totalRecipients = recipientsSnap.size;

    console.log(`${totalRecipients} destinataires à traiter`);

    // Mettre à jour le statut à 'sending'
    await campaignRef.update({
      status: 'sending',
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log('=== Campagne prête pour envoi ===');

    res.status(200).json({
      success: true,
      message: `Campagne prête: ${totalRecipients} destinataires`,
      totalRecipients,
      campaignId,
    });
  } catch (error) {
    console.error('Erreur lors de la préparation:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
}
