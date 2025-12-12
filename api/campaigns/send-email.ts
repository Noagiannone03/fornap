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
import { sendEmailWithFallback, type EmailSendResult } from '../_lib/email-transport.js';
import { generateMembershipCardImage, getMembershipCardFilename, type MembershipCardUserData } from '../_lib/membership-card-generator.js';

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
  errorMessage?: string,
  emailResult?: EmailSendResult
): Promise<void> {
  const FieldValue = getFieldValue();
  const recipientRef = db.collection('campaigns').doc(campaignId).collection('recipients').doc(recipientId);

  const updates: any = {
    status,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (status === 'sent') {
    updates.sentAt = FieldValue.serverTimestamp();
    if (emailResult) {
      updates.emailProvider = emailResult.provider;
      updates.fallbackUsed = emailResult.fallbackUsed;
    }
  } else if (status === 'failed' && errorMessage) {
    updates.errorMessage = errorMessage;
    if (emailResult) {
      updates.fallbackUsed = emailResult.fallbackUsed;
    }
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

      // 5. Préparer les pièces jointes (carte d'adhérent si activée)
      const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];

      if (campaign.content.attachMembershipCard) {
        console.log(`📇 Génération de la carte d'adhérent pour ${user.email}...`);

        try {
          // Préparer les données utilisateur pour la génération de carte
          const membershipCardUserData: MembershipCardUserData = {
            uid: userId,
            firstName: user.firstName,
            lastName: user.lastName,
            currentMembership: {
              planType: user.currentMembership?.planType || 'annual',
              expiryDate: user.currentMembership?.expiryDate || null,
              planName: user.currentMembership?.planName,
            },
          };

          // Générer l'image de la carte
          const cardImageBuffer = await generateMembershipCardImage(membershipCardUserData);

          // Ajouter en pièce jointe
          attachments.push({
            filename: getMembershipCardFilename(user.firstName, user.lastName),
            content: cardImageBuffer,
            contentType: 'image/png',
          });

          console.log(`✅ Carte d'adhérent générée pour ${user.email}`);
        } catch (cardError: any) {
          console.error(`⚠️ Erreur génération carte pour ${user.email}:`, cardError.message);
          // On continue l'envoi sans la carte plutôt que de bloquer tout l'email
        }
      }

      // 6. Envoyer l'email avec fallback automatique (FORNAP -> Brevo)
      const emailResult = await sendEmailWithFallback({
        to: user.email,
        subject: campaign.content.subject,
        html: emailHtml,
        from: '"FOR+NAP Social Club" <no-reply@fornap.fr>',
        replyTo: 'contact@fornap.fr',
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      if (!emailResult.success) {
        throw new Error(emailResult.error || 'Échec d\'envoi email');
      }

      console.log(`✅ Email envoyé à ${user.email} via ${emailResult.provider} (campagne: ${campaignId})${emailResult.fallbackUsed ? ' [fallback]' : ''}${attachments.length > 0 ? ' [avec carte adhérent]' : ''}`);

      // 7. Marquer comme envoyé (avec info provider)
      await updateRecipientStatus(db, campaignId, recipientId, 'sent', undefined, emailResult);

      // 8. Mettre à jour les stats de la campagne
      await updateCampaignStats(db, campaignId);

      res.status(200).json({
        success: true,
        message: `Email envoyé à ${user.email}`,
        recipientId,
        provider: emailResult.provider,
        fallbackUsed: emailResult.fallbackUsed,
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
