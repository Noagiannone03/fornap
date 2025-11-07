/**
 * Service d'envoi d'emails avec Resend
 */

import { Resend } from 'resend';
import { RESEND_CONFIG, EMAIL_CONFIG } from '../config/email';
import type { SendEmailOptions, SendEmailResult } from '../types/email';
import { prepareTrackedEmail } from './templateService';
import type { CampaignRecipient } from '../types/campaign';

let resendInstance: Resend | null = null;

function getResendClient(): Resend {
  if (!resendInstance) {
    if (!RESEND_CONFIG.apiKey) {
      throw new Error('RESEND_API_KEY n\'est pas configurée');
    }
    resendInstance = new Resend(RESEND_CONFIG.apiKey);
  }
  return resendInstance;
}

export async function sendSingleEmail(
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const startTime = Date.now();

  try {
    const resend = getResendClient();

    let finalHtml = options.html;
    if (options.mergeData) {
      finalHtml = options.html;
    }

    const headers: Record<string, string> = {
      'X-Entity-Ref-ID': options.headers?.['X-Entity-Ref-ID'] || '',
      ...(options.headers || {}),
    };

    const tags = options.tags || [];

    const response = await resend.emails.send({
      from: `${options.fromName} <${options.fromEmail}>`,
      to: [options.to],
      subject: options.subject,
      html: finalHtml,
      replyTo: options.replyTo,
      headers,
      tags,
    });

    if (response.error) {
      console.error('Erreur Resend:', response.error);
      return {
        recipientId: options.headers?.['X-Recipient-ID'] || '',
        success: false,
        error: response.error.message,
      };
    }

    const duration = Date.now() - startTime;
    console.log(`Email envoyé avec succès à ${options.to} (${duration}ms) - ID: ${response.data?.id}`);

    return {
      recipientId: options.headers?.['X-Recipient-ID'] || '',
      success: true,
      messageId: response.data?.id,
      sentAt: new Date(),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Erreur lors de l'envoi à ${options.to} (${duration}ms):`, error);

    return {
      recipientId: options.headers?.['X-Recipient-ID'] || '',
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

export async function sendEmailBatch(
  emails: SendEmailOptions[],
  delayBetweenEmails: number = 1000 / EMAIL_CONFIG.RATE_LIMIT_PER_SECOND
): Promise<SendEmailResult[]> {
  const results: SendEmailResult[] = [];

  console.log(`Envoi d'un batch de ${emails.length} emails avec délai de ${delayBetweenEmails}ms...`);

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const result = await sendSingleEmail(email);
    results.push(result);

    if (i < emails.length - 1) {
      await delay(delayBetweenEmails);
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  console.log(`Batch terminé: ${successCount} succès, ${failureCount} échecs`);

  return results;
}

export function prepareEmailOptions(
  recipient: CampaignRecipient,
  campaignId: string,
  emailContent: {
    subject: string;
    html: string;
    fromName: string;
    fromEmail: string;
    replyTo?: string;
  }
): SendEmailOptions {
  const trackedHtml = prepareTrackedEmail(
    emailContent.html,
    recipient,
    campaignId,
    {
      enableOpenTracking: true,
      enableClickTracking: true,
    }
  );

  return {
    to: recipient.email,
    toName: `${recipient.firstName} ${recipient.lastName}`.trim(),
    subject: emailContent.subject,
    html: trackedHtml,
    fromName: emailContent.fromName || EMAIL_CONFIG.DEFAULT_FROM_NAME,
    fromEmail: emailContent.fromEmail || EMAIL_CONFIG.DEFAULT_FROM_EMAIL,
    replyTo: emailContent.replyTo,
    headers: {
      'X-Campaign-ID': campaignId,
      'X-Recipient-ID': recipient.id,
      'X-User-ID': recipient.userId,
    },
    tags: [
      { name: 'campaign_id', value: campaignId },
      { name: 'recipient_id', value: recipient.id },
    ],
  };
}

export async function testResendConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    getResendClient();

    if (!RESEND_CONFIG.apiKey) {
      return {
        success: false,
        error: 'RESEND_API_KEY non configurée',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function calculateEmailDelay(emailsPerSecond: number): number {
  return Math.ceil(1000 / emailsPerSecond);
}

export function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  return batches;
}
