/**
 * API unifiée pour envoyer un email de campagne à UN utilisateur
 *
 * Cette API:
 * 1. Envoie l'email via Nodemailer (SMTP FORNAP)
 * 2. Utilise toujours no-reply@fornap.fr comme expéditeur
 * 3. Injecte automatiquement le pixel de tracking pour les ouvertures
 * 4. Transforme tous les liens pour le suivi des clics
 * 5. Enregistre l'envoi dans Firestore
 *
 * Endpoint: POST /api/campaigns/send-email
 * Body: { campaignId: string, userId: string }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore, getFieldValue } from '../_lib/firebase-admin.js';
import { prepareEmailWithTracking } from '../_lib/pxl-tracking.js';
import nodemailer from 'nodemailer';

// Configuration Nodemailer - TOUJOURS no-reply@fornap.fr
function createEmailTransporter() {
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'mail.fornap.fr',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // TLS sur port 587
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
 * Crée un destinataire dans la sous-collection recipients
 */
async function createRecipient(
  db: FirebaseFirestore.Firestore,
  campaignId: string,
  userId: string,
  email: string,
  firstName: string,
  lastName: string
): Promise<string> {
  const FieldValue = getFieldValue();
  const recipientRef = db.collection('campaigns').doc(campaignId).collection('recipients').doc();

  await recipientRef.set({
    campaignId,
    userId,
    email,
    firstName,
    lastName,
    status: 'pending',
    openCount: 0,
    clickCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return recipientRef.id;
}

/**
 * Met à jour le statut d'un destinataire
 */
async function updateRecipientStatus(
  db: FirebaseFirestore.Firestore,
  campaignId: string,
  recipientId: string,
  status: 'sent' | 'failed',
  errorMessage?: string
): Promise<void> {
  const FieldValue = getFieldValue();
  const recipientRef = db.collection('campaigns').doc(campaignId).collection('recipients').doc(recipientId);

  const updates: any = {
    status,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (status === 'sent') {
    updates.sentAt = FieldValue.serverTimestamp();
  } else if (status === 'failed' && errorMessage) {
    updates.errorMessage = errorMessage;
  }

  await recipientRef.update(updates);
}

/**
 * Met à jour les statistiques de la campagne
 */
async function updateCampaignStats(
  db: FirebaseFirestore.Firestore,
  campaignId: string
): Promise<void> {
  try {
    const FieldValue = getFieldValue();
    const campaignRef = db.collection('campaigns').doc(campaignId);

    // Récupérer tous les destinataires
    const recipientsSnap = await campaignRef.collection('recipients').get();
    const recipients = recipientsSnap.docs.map(doc => doc.data());

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
    console.error('❌ Erreur mise à jour stats:', error);
  }
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

    // 3. Créer le destinataire dans la sous-collection
    const recipientId = await createRecipient(
      db,
      campaignId,
      userId,
      user.email,
      user.firstName,
      user.lastName
    );

    console.log(`📝 Destinataire créé: ${recipientId}`);

    try {
      // 4. Préparer le HTML avec tracking PXL
      // PXL injecte automatiquement le pixel de tracking et transforme tous les liens
      const emailHtml = await prepareEmailWithTracking(
        campaign.content.html,
        campaignId,
        recipientId
      );

      // 5. Envoyer l'email via Nodemailer
      const transporter = createEmailTransporter();

      const mailOptions = {
        from: '"FOR+NAP Social Club" <no-reply@fornap.fr>', // TOUJOURS no-reply@fornap.fr
        to: user.email,
        subject: campaign.content.subject,
        html: emailHtml,
        replyTo: 'contact@fornap.fr', // Où les gens peuvent répondre
      };

      await transporter.sendMail(mailOptions);

      console.log(`✅ Email envoyé à ${user.email} (campagne: ${campaignId})`);

      // 6. Marquer comme envoyé
      await updateRecipientStatus(db, campaignId, recipientId, 'sent');

      // 7. Mettre à jour les stats de la campagne
      await updateCampaignStats(db, campaignId);

      res.status(200).json({
        success: true,
        message: `Email envoyé à ${user.email}`,
        recipientId,
      });
    } catch (emailError: any) {
      console.error('❌ Erreur envoi email:', emailError);

      // Marquer comme failed
      await updateRecipientStatus(db, campaignId, recipientId, 'failed', emailError.message);
      await updateCampaignStats(db, campaignId);

      throw emailError;
    }
  } catch (error: any) {
    console.error('❌ Erreur dans send-email:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'envoi de l\'email',
    });
  }
}
