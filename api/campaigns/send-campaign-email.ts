/**
 * API pour envoyer un email de campagne à UN destinataire
 *
 * Endpoint: POST /api/campaigns/send-campaign-email
 * Body: { campaignId: string, recipientId: string }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore, getTimestamp } from '../_lib/firebase-admin.js';
import nodemailer from 'nodemailer';

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
    const { campaignId, recipientId } = req.body;

    if (!campaignId || !recipientId) {
      res.status(400).json({
        success: false,
        message: 'campaignId et recipientId requis',
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
        message: 'Campagne introuvable',
      });
      return;
    }

    const campaign = campaignSnap.data();

    // Récupérer le destinataire
    const recipientRef = campaignRef.collection('recipients').doc(recipientId);
    const recipientSnap = await recipientRef.get();

    if (!recipientSnap.exists) {
      res.status(404).json({
        success: false,
        message: 'Destinataire introuvable',
      });
      return;
    }

    const recipient = recipientSnap.data();

    // Vérifier le statut du destinataire
    if (recipient.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: `Destinataire déjà traité (statut: ${recipient.status})`,
      });
      return;
    }

    // Envoyer l'email
    const transporter = createEmailTransporter();

    const mailOptions = {
      from: `"${campaign.content.fromName}" <${campaign.content.fromEmail}>`,
      to: recipient.email,
      subject: campaign.content.subject,
      html: campaign.content.html,
      replyTo: campaign.content.replyTo || campaign.content.fromEmail,
    };

    await transporter.sendMail(mailOptions);

    // Mettre à jour le statut du destinataire
    await recipientRef.update({
      status: 'sent',
      sentAt: getTimestamp().FieldValue.serverTimestamp(),
      updatedAt: getTimestamp().FieldValue.serverTimestamp(),
    });

    console.log(`✅ Email envoyé à ${recipient.email} pour la campagne ${campaignId}`);

    res.status(200).json({
      success: true,
      message: `Email envoyé à ${recipient.email}`,
    });
  } catch (error: any) {
    console.error('❌ Erreur envoi email:', error);

    // Marquer le destinataire comme failed si possible
    if (req.body.campaignId && req.body.recipientId) {
      try {
        const db = getFirestore();
        await db
          .collection('campaigns')
          .doc(req.body.campaignId)
          .collection('recipients')
          .doc(req.body.recipientId)
          .update({
            status: 'failed',
            errorMessage: error.message || 'Erreur inconnue',
            updatedAt: getTimestamp().FieldValue.serverTimestamp(),
          });
      } catch (updateError) {
        console.error('❌ Erreur mise à jour statut:', updateError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de l\'email',
      error: error.message,
    });
  }
}
