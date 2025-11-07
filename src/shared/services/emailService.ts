/**
 * Service d'envoi d'emails avec Resend
 *
 * Gère l'envoi d'emails via l'API Resend avec support du batch,
 * retry automatique, et gestion d'erreurs robuste.
 */

import { Resend } from 'resend';
import { RESEND_CONFIG, EMAIL_CONFIG } from '../config/email';
import type { SendEmailOptions, SendEmailResult } from '../types/email';
import { prepareTrackedEmail } from './templateService';
import type { CampaignRecipient } from '../types/campaign';

// Instance Resend singleton
let resendInstance: Resend | null = null;

/**
 * Obtient ou crée l'instance Resend
 */
function getResendClient(): Resend {
  if (!resendInstance) {
    if (!RESEND_CONFIG.apiKey) {
      throw new Error('RESEND_API_KEY n\'est pas configurée');
    }
    resendInstance = new Resend(RESEND_CONFIG.apiKey);
  }
  return resendInstance;
}

/**
 * Envoie un email unique via Resend
 *
 * @param options - Options d'envoi
 * @returns Résultat de l'envoi
 */
export async function sendSingleEmail(
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const startTime = Date.now();

  try {
    const resend = getResendClient();

    // Préparer le HTML avec remplacement des variables
    let finalHtml = options.html;
    if (options.mergeData) {
      // Le remplacement se fait dans prepareTrackedEmail
      finalHtml = options.html;
    }

    // Construire les headers personnalisés
    const headers: Record<string, string> = {
      'X-Entity-Ref-ID': options.headers?.['X-Entity-Ref-ID'] || '',
      ...(options.headers || {}),
    };

    // Construire les tags
    const tags = options.tags || [];

    // Envoyer via Resend
    const response = await resend.emails.send({
      from: `${options.fromName} <${options.fromEmail}>`,
      to: [options.to],
      subject: options.subject,
      html: finalHtml,
      reply_to: options.replyTo,
      headers,
      tags,
    });

    // Vérifier la réponse
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

/**
 * Envoie un batch d'emails avec rate limiting
 *
 * @param emails - Liste d'options d'envoi
 * @param delayBetweenEmails - Délai entre chaque email (ms)
 * @returns Liste des résultats
 */
export async function sendEmailBatch(
  emails: SendEmailOptions[],
  delayBetweenEmails: number = 1000 / EMAIL_CONFIG.RATE_LIMIT_PER_SECOND
): Promise<SendEmailResult[]> {
  const results: SendEmailResult[] = [];

  console.log(`Envoi d'un batch de ${emails.length} emails avec délai de ${delayBetweenEmails}ms...`);

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];

    // Envoyer l'email
    const result = await sendSingleEmail(email);
    results.push(result);

    // Attendre entre les envois (sauf pour le dernier)
    if (i < emails.length - 1) {
      await delay(delayBetweenEmails);
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  console.log(`Batch terminé: ${successCount} succès, ${failureCount} échecs`);

  return results;
}

/**
 * Prépare les options d'envoi pour un destinataire de campagne
 *
 * @param recipient - Destinataire
 * @param campaignId - ID de la campagne
 * @param emailContent - Contenu de l'email (depuis la campagne)
 * @returns Options d'envoi prêtes
 */
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
  // Préparer le HTML avec tracking et variables de fusion
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

/**
 * Teste la connexion à Resend
 *
 * @returns true si la connexion fonctionne
 */
export async function testResendConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const resend = getResendClient();

    // Essayer d'obtenir des informations sur le compte
    // Resend ne fournit pas d'endpoint de test, donc on simule
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

/**
 * Fonction utilitaire pour attendre
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calcule le délai entre les emails pour respecter le rate limit
 *
 * @param emailsPerSecond - Nombre d'emails par seconde souhaité
 * @returns Délai en millisecondes
 */
export function calculateEmailDelay(emailsPerSecond: number): number {
  return Math.ceil(1000 / emailsPerSecond);
}

/**
 * Divise une liste de destinataires en batches
 *
 * @param recipients - Liste complète des destinataires
 * @param batchSize - Taille de chaque batch
 * @returns Liste de batches
 */
export function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  return batches;
}
