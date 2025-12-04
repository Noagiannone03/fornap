/**
 * Configuration et utilitaires pour le tracking email avec PXL
 *
 * Cette librairie gère automatiquement:
 * - Le tracking des ouvertures via pixel transparent
 * - Le tracking des clics sur les liens
 * - La persistance dans Firestore
 */

import PxlTracker from 'pxl';
import PxlForEmails from 'pxl-for-emails';
import { getFirestore, getFieldValue } from './firebase-admin.js';

// Configuration de la base URL pour le tracking
const getBaseUrl = (): string => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }
  return 'https://fornap.vercel.app';
};

/**
 * Instance PXL de base pour le tracking
 */
const basePxl = new PxlTracker();

/**
 * Instance PXL configurée pour les emails
 */
export const pxl = new PxlForEmails({
  // Instance PXL de base (requis)
  pxl: basePxl,

  // URL de base pour les endpoints de tracking
  baseUrl: getBaseUrl(),

  // Path pour le tracking des ouvertures
  openPath: '/api/campaigns/pxl/open',

  // Path pour le tracking des clics
  clickPath: '/api/campaigns/pxl/click',

  // Callback appelé quand un email est ouvert
  onOpen: async (recipient: string, campaign: string) => {
    try {
      console.log(`📧 [PXL] Email ouvert - Campaign: ${campaign}, Recipient: ${recipient}`);
      await recordEmailOpen(campaign, recipient);
    } catch (error) {
      console.error('❌ [PXL] Erreur onOpen:', error);
    }
  },

  // Callback appelé quand un lien est cliqué
  onClick: async (recipient: string, campaign: string, link: string) => {
    try {
      console.log(`🖱️ [PXL] Lien cliqué - Campaign: ${campaign}, Recipient: ${recipient}, Link: ${link}`);
      await recordEmailClick(campaign, recipient, link);
    } catch (error) {
      console.error('❌ [PXL] Erreur onClick:', error);
    }
  }
});

/**
 * Enregistre une ouverture d'email dans Firestore
 */
async function recordEmailOpen(campaignId: string, recipientId: string): Promise<void> {
  try {
    const db = getFirestore();
    const FieldValue = getFieldValue();

    const recipientRef = db
      .collection('campaigns')
      .doc(campaignId)
      .collection('recipients')
      .doc(recipientId);

    const recipientSnap = await recipientRef.get();

    if (!recipientSnap.exists) {
      console.warn('⚠️ [PXL] Destinataire introuvable');
      return;
    }

    const recipient = recipientSnap.data();
    const openCount = (recipient?.openCount || 0) + 1;

    // Mettre à jour le statut
    await recipientRef.update({
      status: 'opened',
      openedAt: recipient?.openedAt || FieldValue.serverTimestamp(),
      openCount,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ [PXL] Ouverture enregistrée (count: ${openCount})`);

    // Mettre à jour les stats de la campagne
    await updateCampaignStats(campaignId);
  } catch (error) {
    console.error('❌ [PXL] Erreur recordEmailOpen:', error);
    throw error;
  }
}

/**
 * Enregistre un clic sur un lien dans Firestore
 */
async function recordEmailClick(
  campaignId: string,
  recipientId: string,
  link: string
): Promise<void> {
  try {
    const db = getFirestore();
    const FieldValue = getFieldValue();

    const recipientRef = db
      .collection('campaigns')
      .doc(campaignId)
      .collection('recipients')
      .doc(recipientId);

    const recipientSnap = await recipientRef.get();

    if (!recipientSnap.exists) {
      console.warn('⚠️ [PXL] Destinataire introuvable');
      return;
    }

    const recipient = recipientSnap.data();
    const clickCount = (recipient?.clickCount || 0) + 1;

    // Mettre à jour le statut
    await recipientRef.update({
      status: 'clicked',
      clickedAt: recipient?.clickedAt || FieldValue.serverTimestamp(),
      clickCount,
      lastClickedLink: link,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ [PXL] Clic enregistré (count: ${clickCount})`);

    // Mettre à jour les stats de la campagne
    await updateCampaignStats(campaignId);
  } catch (error) {
    console.error('❌ [PXL] Erreur recordEmailClick:', error);
    throw error;
  }
}

/**
 * Met à jour les statistiques de la campagne
 */
async function updateCampaignStats(campaignId: string): Promise<void> {
  try {
    const db = getFirestore();
    const FieldValue = getFieldValue();
    const campaignRef = db.collection('campaigns').doc(campaignId);

    // Récupérer tous les destinataires
    const recipientsSnap = await campaignRef.collection('recipients').get();
    const recipients = recipientsSnap.docs.map((doc) => doc.data());

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

    console.log('✅ [PXL] Stats de campagne mises à jour');
  } catch (error) {
    console.error('❌ [PXL] Erreur updateCampaignStats:', error);
  }
}

/**
 * Prépare un email pour le tracking
 * Injecte le pixel de tracking et transforme les liens
 *
 * @param html - HTML de l'email
 * @param campaignId - ID de la campagne
 * @param recipientId - ID du destinataire
 * @returns HTML avec tracking intégré
 */
export function prepareEmailWithTracking(
  html: string,
  campaignId: string,
  recipientId: string
): string {
  try {
    console.log(`🔧 [PXL] Préparation email avec tracking - Campaign: ${campaignId}, Recipient: ${recipientId}`);

    // PXL transforme automatiquement le HTML en ajoutant:
    // - Le pixel de tracking pour les ouvertures
    // - La transformation des liens pour les clics
    const trackedHtml = pxl.addTracking(html, recipientId, campaignId);

    console.log('✅ [PXL] Email préparé avec tracking');
    return trackedHtml;
  } catch (error) {
    console.error('❌ [PXL] Erreur lors de la préparation du tracking:', error);
    // En cas d'erreur, retourner le HTML original sans tracking
    return html;
  }
}
