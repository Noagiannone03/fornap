/**
 * Service de gestion de queue - OBSOLÈTE
 *
 * ⚠️ Ce service n'est plus utilisé.
 *
 * Le système de queue avec Upstash QStash a été remplacé par un système d'envoi
 * direct via l'API /api/campaigns/send-email.
 *
 * Les emails sont envoyés séquentiellement avec un délai de 500ms entre chaque envoi.
 * Plus besoin de batches, de queue ou de retry automatique.
 *
 * Ce fichier est conservé uniquement pour référence historique.
 */

/**
 * @deprecated Ne plus utiliser - les emails sont envoyés directement via l'API
 */
export async function publishEmailBatch(): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  console.warn('⚠️ publishEmailBatch est obsolète - utiliser /api/campaigns/send-email');
  throw new Error('Cette fonction n\'est plus supportée');
}

/**
 * @deprecated Ne plus utiliser - les emails sont envoyés directement via l'API
 */
export async function scheduleEmailBatches(): Promise<{
  success: boolean;
  batchCount: number;
  errors: string[];
}> {
  console.warn('⚠️ scheduleEmailBatches est obsolète - utiliser /api/campaigns/send-email');
  throw new Error('Cette fonction n\'est plus supportée');
}
