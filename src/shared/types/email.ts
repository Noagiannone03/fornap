/**
 * Types pour le système d'envoi d'emails - SIMPLIFIÉ
 *
 * ⚠️ SYSTÈME UNIFIÉ:
 * Plus de batches, queues ou webhooks Resend.
 * Tout passe par l'API serverless avec envoi direct via Nodemailer.
 */

/**
 * Résultat de l'envoi d'un email
 */
export interface SendEmailResult {
  /** ID du recipient (ou userId) */
  recipientId: string;

  /** Succès ou échec */
  success: boolean;

  /** ID de l'email (pour tracking interne) */
  messageId?: string;

  /** Message d'erreur si échec */
  error?: string;

  /** Timestamp de l'envoi */
  sentAt?: Date;
}

/**
 * Données pour le remplacement des variables de fusion dans les templates
 */
export interface MergeData {
  first_name: string;
  last_name: string;
  email: string;
  membership_type: string;
  [key: string]: string; // Variables personnalisées
}

/**
 * @deprecated Types legacy conservés pour compatibilité
 */
export interface SendEmailOptions {
  to: string;
  toName: string;
  subject: string;
  html: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  mergeData?: MergeData;
  headers?: Record<string, string>;
  tags?: Array<{ name: string; value: string }>;
}
