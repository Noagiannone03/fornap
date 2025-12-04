/**
 * Service d'envoi d'emails - SIMPLIFIÉ
 *
 * ⚠️ IMPORTANT: Ce service n'est plus utilisé pour l'envoi direct d'emails.
 *
 * Tous les envois d'emails passent maintenant par les APIs serverless:
 * - /api/campaigns/send-email : Envoi d'emails de campagne avec tracking
 * - /api/users/send-membership-card : Envoi de cartes d'adhésion
 *
 * Ces APIs utilisent Nodemailer avec no-reply@fornap.fr comme expéditeur.
 * Le tracking (pixels et liens) est géré automatiquement par l'API.
 *
 * Ce fichier est conservé uniquement pour la compatibilité avec le code existant.
 */

export type SendEmailResult = {
  recipientId: string;
  success: boolean;
  messageId?: string;
  error?: string;
  sentAt?: Date;
};

/**
 * @deprecated Utiliser l'API /api/campaigns/send-email à la place
 */
export async function sendSingleEmail(): Promise<SendEmailResult> {
  console.warn('⚠️ sendSingleEmail est obsolète - utiliser /api/campaigns/send-email');
  throw new Error('Cette fonction n\'est plus supportée - utiliser l\'API /api/campaigns/send-email');
}

/**
 * @deprecated Utiliser l'API /api/campaigns/send-email à la place
 */
export async function sendEmailBatch(): Promise<SendEmailResult[]> {
  console.warn('⚠️ sendEmailBatch est obsolète - utiliser /api/campaigns/send-email');
  throw new Error('Cette fonction n\'est plus supportée - utiliser l\'API /api/campaigns/send-email');
}
