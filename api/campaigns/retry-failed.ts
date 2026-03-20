/**
 * API pour réessayer l'envoi aux destinataires en échec
 *
 * Endpoint: POST /api/campaigns/retry-failed
 * Body: { campaignId: string }
 *
 * Fonctionnalités:
 * - Récupère tous les recipients avec status 'failed'
 * - Tente de renvoyer l'email à chacun
 * - Incrémente un compteur de retry
 * - Met à jour les stats en temps réel
 * - Retourne le résultat détaillé
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore, getFieldValue } from '../_lib/firebase-admin.js';
import { prepareEmailWithTracking } from '../_lib/pxl-tracking.js';
import { sendEmailWithFallback, type EmailSendResult } from '../_lib/email-transport.js';
import {
  buildCampaignMergeData,
  getCampaignFromAddress,
  getCampaignMailHeaders,
  getCampaignReplyTo,
  loadCampaignEmailHtml,
  personalizeCampaignHtml,
} from '../_lib/campaign-email.js';

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
    updates.lastRetryAt = FieldValue.serverTimestamp();
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

    const recipientsSnap = await campaignRef.collection('recipients').get();
    const recipients = recipientsSnap.docs.map(doc => doc.data());

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
    const { campaignId } = req.body;

    if (!campaignId) {
      res.status(400).json({
        success: false,
        error: 'campaignId requis',
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

    // 2. Récupérer tous les recipients en échec
    const recipientsSnap = await campaignRef
      .collection('recipients')
      .where('status', '==', 'failed')
      .get();

    const failedRecipients = recipientsSnap.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    }));

    if (failedRecipients.length === 0) {
      res.status(200).json({
        success: true,
        message: 'Aucun destinataire en échec',
        retryCount: 0,
        results: {
          success: 0,
          failed: 0,
          total: 0,
        }
      });
      return;
    }

    console.log(`🔄 Retry de ${failedRecipients.length} emails en échec`);

    // 3. Incrémenter le compteur de retry dans la campagne
    const currentRetryCount = campaign.retryCount || 0;
    await campaignRef.update({
      retryCount: currentRetryCount + 1,
      lastRetryAt: getFieldValue().serverTimestamp(),
    });

    const results = {
      success: 0,
      failed: 0,
      total: failedRecipients.length,
      fallbackCount: 0, // Nombre d'emails envoyés via Brevo
      errors: [] as Array<{ email: string; error: string }>,
    };

    const rawHtml = await loadCampaignEmailHtml(campaignId, campaign);
    if (!rawHtml.trim()) {
      throw new Error('Le contenu HTML de la campagne est vide');
    }

    // 4. Tenter de renvoyer chaque email (avec fallback automatique FORNAP -> Brevo)
    for (const recipient of failedRecipients) {
      try {
        // Récupérer les infos user si nécessaire
        const userRef = db.collection('users').doc(recipient.userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
          console.warn(`⚠️ User ${recipient.userId} introuvable`);
          results.failed++;
          results.errors.push({
            email: recipient.email,
            error: 'Utilisateur introuvable',
          });
          continue;
        }

        const user = userSnap.data();

        const personalizedHtml = personalizeCampaignHtml(
          rawHtml,
          buildCampaignMergeData({
            campaignId,
            email: recipient.email,
            firstName: recipient.firstName,
            lastName: recipient.lastName,
            membershipType: user?.currentMembership?.planName || user?.currentMembership?.planType || '',
          })
        );

        // Préparer le HTML avec tracking
        const emailHtml = await prepareEmailWithTracking(
          personalizedHtml,
          campaignId,
          recipient.id
        );

        // Envoyer l'email avec fallback automatique (FORNAP -> Brevo)
        const emailResult = await sendEmailWithFallback({
          to: recipient.email,
          subject: campaign.content.subject,
          html: emailHtml,
          from: getCampaignFromAddress(campaign),
          replyTo: getCampaignReplyTo(campaign),
          headers: getCampaignMailHeaders(campaignId),
        });

        if (!emailResult.success) {
          throw new Error(emailResult.error || 'Échec d\'envoi email');
        }

        console.log(`✅ Email renvoyé à ${recipient.email} via ${emailResult.provider}${emailResult.fallbackUsed ? ' [fallback]' : ''}`);

        // Marquer comme envoyé (avec info provider)
        await updateRecipientStatus(db, campaignId, recipient.id, 'sent', undefined, emailResult);

        results.success++;
        if (emailResult.fallbackUsed) {
          results.fallbackCount++;
        }
      } catch (error: any) {
        console.error(`❌ Erreur retry ${recipient.email}:`, error);

        // Marquer comme toujours en échec avec la nouvelle erreur
        await updateRecipientStatus(
          db,
          campaignId,
          recipient.id,
          'failed',
          error.message
        );

        results.failed++;
        results.errors.push({
          email: recipient.email,
          error: error.message,
        });
      }

      // Petite pause entre les envois (300ms)
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // 5. Mettre à jour les stats finales
    await updateCampaignStats(db, campaignId);

    // 6. Retourner le résultat
    const fallbackNote = results.fallbackCount > 0 ? ` (${results.fallbackCount} via Brevo)` : '';
    res.status(200).json({
      success: true,
      message: `Retry terminé: ${results.success} succès${fallbackNote}, ${results.failed} échecs sur ${results.total} emails`,
      retryCount: currentRetryCount + 1,
      results: {
        success: results.success,
        failed: results.failed,
        total: results.total,
        fallbackCount: results.fallbackCount,
      },
      errors: results.errors.slice(0, 10), // Max 10 erreurs pour ne pas surcharger
    });
  } catch (error: any) {
    console.error('❌ Erreur retry-failed:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du retry',
    });
  }
}
