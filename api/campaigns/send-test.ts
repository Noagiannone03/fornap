import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore, getFieldValue } from '../_lib/firebase-admin.js';
import { sendEmailWithFallback } from '../_lib/email-transport.js';
import {
  buildCampaignMergeData,
  getCampaignFromAddress,
  getCampaignMailHeaders,
  getCampaignReplyTo,
  loadCampaignEmailHtml,
  personalizeCampaignHtml,
} from '../_lib/campaign-email.js';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    const { campaignId, to } = req.body;

    if (!campaignId || !to) {
      res.status(400).json({
        success: false,
        error: 'campaignId et to requis',
      });
      return;
    }

    if (!isValidEmail(String(to))) {
      res.status(400).json({
        success: false,
        error: 'Adresse email de test invalide',
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
        error: 'Campagne introuvable',
      });
      return;
    }

    const campaign = campaignSnap.data();
    const rawHtml = await loadCampaignEmailHtml(campaignId, campaign);

    if (!rawHtml.trim()) {
      res.status(400).json({
        success: false,
        error: 'Le contenu HTML de la campagne est vide',
      });
      return;
    }

    const html = personalizeCampaignHtml(
      rawHtml,
      buildCampaignMergeData({
        campaignId,
        email: String(to),
        firstName: 'Test',
        lastName: 'FORNAP',
        membershipType: 'Membre test',
      })
    );

    const emailResult = await sendEmailWithFallback({
      to: String(to),
      subject: campaign.content.subject,
      html,
      from: getCampaignFromAddress(campaign),
      replyTo: getCampaignReplyTo(campaign),
      headers: {
        ...getCampaignMailHeaders(campaignId),
        'X-Campaign-Test': 'true',
      },
    });

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Échec de l’envoi du test');
    }

    await campaignRef.update({
      lastTestSentAt: FieldValue.serverTimestamp(),
      lastTestSentTo: String(to),
      lastTestMessageId: emailResult.messageId || null,
      lastTestProvider: emailResult.provider,
      lastTestFallbackUsed: emailResult.fallbackUsed,
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      success: true,
      message: `Email de test envoyé à ${to}`,
      messageId: emailResult.messageId,
      sentAt: new Date().toISOString(),
      provider: emailResult.provider,
      fallbackUsed: emailResult.fallbackUsed,
    });
  } catch (error: any) {
    console.error('❌ Erreur send-test:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l’envoi du test',
    });
  }
}

