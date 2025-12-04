/**
 * Route API: Déclencher l'envoi d'une campagne
 *
 * Endpoint: POST /api/campaigns/send
 *
 * Cette route:
 * 1. Récupère la campagne et ses destinataires
 * 2. Envoie les emails un par un directement avec Nodemailer
 * 3. Met à jour les statuts et les statistiques
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore, getTimestamp } from '../_lib/firebase-admin.js';
import nodemailer from 'nodemailer';
import type { Campaign, CampaignRecipient } from '../../src/shared/types/campaign.js';

// Configuration Nodemailer
function createEmailTransporter() {
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'mail.fornap.fr',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'no-reply@fornap.fr',
      pass: process.env.SMTP_PASSWORD || 'rU6*suHY_b-ce1Z',
    },
    tls: {
      rejectUnauthorized: false
    }
  };

  return nodemailer.createTransporter(smtpConfig);
}

/**
 * Envoie un email à un destinataire
 */
async function sendEmailToRecipient(
  transporter: nodemailer.Transporter,
  recipient: CampaignRecipient,
  campaign: Campaign
): Promise<{ success: boolean; error?: string }> {
  try {
    const mailOptions = {
      from: `"${campaign.content.fromName}" <${campaign.content.fromEmail}>`,
      to: recipient.email,
      subject: campaign.content.subject,
      html: campaign.content.html,
      replyTo: campaign.content.replyTo || campaign.content.fromEmail,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email envoyé à ${recipient.email}`);
    return { success: true };
  } catch (error: any) {
    console.error(`❌ Erreur envoi email à ${recipient.email}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Met à jour les statistiques de la campagne
 */
async function updateCampaignStats(campaignId: string, db: FirebaseFirestore.Firestore): Promise<void> {
  const recipientsSnap = await db
    .collection('campaigns')
    .doc(campaignId)
    .collection('recipients')
    .get();

  const recipients = recipientsSnap.docs.map(doc => doc.data());

  const totalRecipients = recipients.length;
  const sent = recipients.filter((r: any) => r.status === 'sent').length;
  const pending = recipients.filter((r: any) => r.status === 'pending').length;
  const failed = recipients.filter((r: any) => r.status === 'failed').length;

  await db.collection('campaigns').doc(campaignId).update({
    'stats.totalRecipients': totalRecipients,
    'stats.sent': sent,
    'stats.pending': pending,
    'stats.failed': failed,
    updatedAt: getTimestamp().FieldValue.serverTimestamp(),
  });
}

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
    console.log('=== Démarrage de l\'envoi de campagne ===');

    const { campaignId } = req.body;

    if (!campaignId) {
      res.status(400).json({
        success: false,
        message: 'ID de campagne manquant',
      });
      return;
    }

    const db = getFirestore();
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

    // Récupérer les destinataires en attente
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

    const recipients: CampaignRecipient[] = recipientsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as CampaignRecipient)
    );

    console.log(`${recipients.length} destinataires à traiter`);

    // Mettre à jour le statut à 'sending'
    await campaignRef.update({
      status: 'sending',
      updatedAt: getTimestamp().FieldValue.serverTimestamp(),
    });

    // Créer le transporteur email
    const transporter = createEmailTransporter();

    let sentCount = 0;
    let failedCount = 0;

    // Envoyer les emails un par un
    for (const recipient of recipients) {
      const result = await sendEmailToRecipient(transporter, recipient, campaign);

      const recipientRef = campaignRef.collection('recipients').doc(recipient.id);

      if (result.success) {
        await recipientRef.update({
          status: 'sent',
          sentAt: getTimestamp().FieldValue.serverTimestamp(),
          updatedAt: getTimestamp().FieldValue.serverTimestamp(),
        });
        sentCount++;
      } else {
        await recipientRef.update({
          status: 'failed',
          errorMessage: result.error || 'Erreur inconnue',
          updatedAt: getTimestamp().FieldValue.serverTimestamp(),
        });
        failedCount++;
      }
    }

    // Mettre à jour les stats et le statut final
    await updateCampaignStats(campaignId, db);

    await campaignRef.update({
      status: 'sent',
      sentAt: getTimestamp().FieldValue.serverTimestamp(),
      updatedAt: getTimestamp().FieldValue.serverTimestamp(),
    });

    console.log(`=== Envoi terminé: ${sentCount} réussis, ${failedCount} échecs ===`);

    res.status(200).json({
      success: true,
      message: `Campagne envoyée: ${sentCount} emails envoyés, ${failedCount} échecs`,
      stats: {
        campaignId,
        totalRecipients: recipients.length,
        sentCount,
        failedCount,
        status: 'sent' as const,
      },
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
}
