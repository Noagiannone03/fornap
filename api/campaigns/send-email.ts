/**
 * API pour envoyer un email de campagne à UN utilisateur
 * SIMPLIFIÉ - Comme l'envoi de cartes d'adhérent
 *
 * Endpoint: POST /api/campaigns/send-email
 * Body: { campaignId: string, userId: string }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore } from '../_lib/firebase-admin.js';
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

  return nodemailer.createTransport(smtpConfig);
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
    const { campaignId, userId } = req.body;

    if (!campaignId || !userId) {
      res.status(400).json({
        success: false,
        error: 'campaignId et userId requis',
      });
      return;
    }

    const db = getFirestore();

    // 1. Récupérer la campagne
    const campaignRef = db.collection('campaigns').doc(campaignId);
    const campaignSnap = await campaignRef.get();

    if (!campaignSnap.exists) {
      res.status(404).json({
        success: false,
        error: 'Campagne introuvable',
      });
      return;
    }

    const campaign = campaignSnap.data();

    // 2. Récupérer l'utilisateur
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      res.status(404).json({
        success: false,
        error: 'Utilisateur introuvable',
      });
      return;
    }

    const user = userSnap.data();

    // 3. Envoyer l'email
    const transporter = createEmailTransporter();

    const mailOptions = {
      from: `"${campaign.content.fromName}" <${campaign.content.fromEmail}>`,
      to: user.email,
      subject: campaign.content.subject,
      html: campaign.content.html,
      replyTo: campaign.content.replyTo || campaign.content.fromEmail,
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Email de campagne envoyé à ${user.email} (campagne: ${campaignId})`);

    res.status(200).json({
      success: true,
      message: `Email envoyé à ${user.email}`,
    });
  } catch (error: any) {
    console.error('❌ Erreur envoi email de campagne:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'envoi de l\'email',
    });
  }
}
