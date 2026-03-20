/**
 * Route API legacy pour le tracking des anciens emails.
 *
 * Gère:
 * - GET /api/campaigns/track/open
 * - GET /api/campaigns/track/click
 *
 * Les nouveaux emails utilisent /api/campaigns/pxl/*.
 * Cette route unique conserve la compatibilité tout en évitant
 * de consommer deux fonctions serverless distinctes sur Vercel.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore } from '../../_lib/firebase-admin.js';

const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

type RecipientStats = {
  status?: string;
  openCount?: number;
  clickCount?: number;
  openedAt?: unknown;
  clickedAt?: unknown;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    const action = req.query.action;

    if (action === 'open') {
      await handleOpen(req, res);
      return;
    }

    if (action === 'click') {
      await handleClick(req, res);
      return;
    }

    res.status(404).json({ error: 'Route de tracking inconnue' });
  } catch (error) {
    console.error('Erreur dans le tracking legacy:', error);

    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur interne de tracking' });
    }
  }
}

async function handleOpen(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const { campaign, recipient } = req.query;

  if (!campaign || !recipient || typeof campaign !== 'string' || typeof recipient !== 'string') {
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.status(200).send(TRACKING_PIXEL);
    return;
  }

  recordOpen(campaign, recipient).catch((error) => {
    console.error('Erreur lors de l’enregistrement de l’ouverture:', error);
  });

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.status(200).send(TRACKING_PIXEL);
}

async function handleClick(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const { campaign, recipient, url } = req.query;
  const defaultUrl = 'https://fornap.com';

  if (!url || typeof url !== 'string') {
    res.redirect(302, defaultUrl);
    return;
  }

  const originalUrl = decodeURIComponent(url);

  if (!campaign || !recipient || typeof campaign !== 'string' || typeof recipient !== 'string') {
    res.redirect(302, originalUrl);
    return;
  }

  recordClick(campaign, recipient).catch((error) => {
    console.error('Erreur lors de l’enregistrement du clic:', error);
  });

  res.redirect(302, originalUrl);
}

async function recordOpen(
  campaignId: string,
  recipientId: string
): Promise<void> {
  try {
    const db = getFirestore();
    const recipientRef = db
      .collection('campaigns')
      .doc(campaignId)
      .collection('recipients')
      .doc(recipientId);

    const recipientSnap = await recipientRef.get();

    if (!recipientSnap.exists) {
      console.warn('Destinataire introuvable');
      return;
    }

    const recipient = recipientSnap.data() as RecipientStats | undefined;
    const now = new Date();
    const openCount = (recipient?.openCount || 0) + 1;

    await recipientRef.update({
      status: 'opened',
      openedAt: recipient?.openedAt || now,
      openCount,
      updatedAt: now,
    });

    await updateCampaignStats(campaignId);
  } catch (error) {
    console.error('Erreur lors de l’enregistrement de l’ouverture:', error);
    throw error;
  }
}

async function recordClick(
  campaignId: string,
  recipientId: string
): Promise<void> {
  try {
    const db = getFirestore();
    const recipientRef = db
      .collection('campaigns')
      .doc(campaignId)
      .collection('recipients')
      .doc(recipientId);

    const recipientSnap = await recipientRef.get();

    if (!recipientSnap.exists) {
      console.warn('Destinataire introuvable');
      return;
    }

    const recipient = recipientSnap.data() as RecipientStats | undefined;
    const now = new Date();
    const clickCount = (recipient?.clickCount || 0) + 1;

    await recipientRef.update({
      status: 'clicked',
      clickedAt: recipient?.clickedAt || now,
      clickCount,
      updatedAt: now,
    });

    await updateCampaignStats(campaignId);
  } catch (error) {
    console.error('Erreur lors de l’enregistrement du clic:', error);
    throw error;
  }
}

async function updateCampaignStats(campaignId: string): Promise<void> {
  try {
    const db = getFirestore();
    const campaignRef = db.collection('campaigns').doc(campaignId);
    const recipientsSnap = await campaignRef.collection('recipients').get();
    const recipients = recipientsSnap.docs.map((doc) => doc.data() as RecipientStats);

    const totalRecipients = recipients.length;
    const sent = recipients.filter(
      (r) => r.status === 'sent' || r.status === 'opened' || r.status === 'clicked'
    ).length;
    const opened = recipients.filter(
      (r) => r.status === 'opened' || r.status === 'clicked'
    ).length;
    const clicked = recipients.filter((r) => r.status === 'clicked').length;

    const openRate = sent > 0 ? (opened / sent) * 100 : 0;
    const clickRate = sent > 0 ? (clicked / sent) * 100 : 0;

    await campaignRef.update({
      'stats.totalRecipients': totalRecipients,
      'stats.opened': opened,
      'stats.clicked': clicked,
      'stats.openRate': Math.round(openRate * 100) / 100,
      'stats.clickRate': Math.round(clickRate * 100) / 100,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Erreur mise à jour stats legacy:', error);
  }
}

