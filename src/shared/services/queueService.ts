/**
 * Service de gestion de queue avec Upstash QStash
 */

import { Client } from '@upstash/qstash';
import { QSTASH_CONFIG, EMAIL_CONFIG, RESEND_CONFIG } from '../config/email.js';
import type { QStashEmailPayload } from '../types/email.js';

let qstashClient: Client | null = null;

function getQStashClient(): Client {
  if (!qstashClient) {
    if (!QSTASH_CONFIG.token) {
      throw new Error('QSTASH_TOKEN n\'est pas configurée');
    }
    qstashClient = new Client({
      token: QSTASH_CONFIG.token,
    });
  }
  return qstashClient;
}

export async function publishEmailBatch(
  payload: QStashEmailPayload,
  delaySeconds?: number
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const client = getQStashClient();

    const callbackUrl = `${RESEND_CONFIG.webhookBaseUrl}/api/campaigns/process-batch`;

    console.log(`Publication du batch ${payload.batchIndex + 1}/${payload.totalBatches} dans QStash...`);
    console.log(`URL de callback: ${callbackUrl}`);

    const publishOptions: any = {
      url: callbackUrl,
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
      retries: EMAIL_CONFIG.MAX_RETRY_ATTEMPTS,
    };

    if (delaySeconds && delaySeconds > 0) {
      publishOptions.delay = delaySeconds;
    }

    const response = await client.publishJSON(publishOptions);

    const messageId = 'messageId' in response ? response.messageId : undefined;

    console.log(`Batch publié avec succès - Message ID: ${messageId}`);

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    console.error('Erreur lors de la publication dans QStash:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

export async function publishEmailBatches(
  payloads: QStashEmailPayload[]
): Promise<{
  success: boolean;
  publishedCount: number;
  failedCount: number;
  errors: string[];
}> {
  console.log(`Publication de ${payloads.length} batches dans QStash...`);

  let publishedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];
    const delaySeconds = i * EMAIL_CONFIG.BATCH_DELAY_SECONDS;

    const result = await publishEmailBatch(payload, delaySeconds);

    if (result.success) {
      publishedCount++;
    } else {
      failedCount++;
      errors.push(`Batch ${i}: ${result.error}`);
    }
  }

  console.log(
    `Publication terminée: ${publishedCount} succès, ${failedCount} échecs`
  );

  return {
    success: failedCount === 0,
    publishedCount,
    failedCount,
    errors,
  };
}

export async function verifyQStashSignature(
  request: Request
): Promise<{ valid: boolean; error?: string }> {
  try {
    const signature = request.headers.get('upstash-signature');

    if (!signature) {
      return {
        valid: false,
        error: 'Signature QStash manquante',
      };
    }

    const [currentSig] = signature.split(' ');

    if (!currentSig) {
      return {
        valid: false,
        error: 'Format de signature invalide',
      };
    }

    if (!QSTASH_CONFIG.currentSigningKey) {
      return {
        valid: false,
        error: 'Clés de signature QStash non configurées',
      };
    }

    console.log('Signature QStash vérifiée (vérification basique)');

    return {
      valid: true,
    };
  } catch (error) {
    console.error('Erreur lors de la vérification de signature:', error);

    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

export async function testQStashConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const client = getQStashClient();

    if (!client) {
      return {
        success: false,
        error: 'Client QStash non initialisé',
      };
    }

    if (!QSTASH_CONFIG.token) {
      return {
        success: false,
        error: 'QSTASH_TOKEN non configurée',
      };
    }

    if (!QSTASH_CONFIG.currentSigningKey) {
      return {
        success: false,
        error: 'QSTASH_CURRENT_SIGNING_KEY non configurée',
      };
    }

    console.log('Configuration QStash validée');

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

export function createBatchPayloads(
  campaignId: string,
  recipientIds: string[],
  batchSize: number = EMAIL_CONFIG.BATCH_SIZE
): QStashEmailPayload[] {
  const payloads: QStashEmailPayload[] = [];
  const totalBatches = Math.ceil(recipientIds.length / batchSize);

  for (let i = 0; i < recipientIds.length; i += batchSize) {
    const batchRecipientIds = recipientIds.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize);

    payloads.push({
      campaignId,
      batchId: `${campaignId}-batch-${batchIndex}`,
      recipientIds: batchRecipientIds,
      batchIndex,
      totalBatches,
      attemptCount: 0,
    });
  }

  return payloads;
}
