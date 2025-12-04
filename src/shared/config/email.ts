/**
 * Configuration pour le système d'envoi d'emails - SIMPLIFIÉ
 *
 * ⚠️ SYSTÈME UNIFIÉ:
 * Tous les emails sont envoyés via Nodemailer (SMTP FORNAP) depuis les APIs serverless.
 * Plus besoin de Resend ni de QStash.
 *
 * Configuration SMTP:
 * - Serveur: mail.fornap.fr (port 587, TLS)
 * - Expéditeur: no-reply@fornap.fr
 * - Gestion dans les variables d'environnement
 */

export const EMAIL_CONFIG = {
  /**
   * Configuration SMTP FORNAP
   * Défini dans les variables d'environnement:
   * - SMTP_HOST (défaut: mail.fornap.fr)
   * - SMTP_PORT (défaut: 587)
   * - SMTP_USER (défaut: no-reply@fornap.fr)
   * - SMTP_PASSWORD
   */
  DEFAULT_FROM_NAME: 'FOR+NAP Social Club',
  DEFAULT_FROM_EMAIL: 'no-reply@fornap.fr',
  DEFAULT_REPLY_TO: 'contact@fornap.fr',

  /**
   * Délai entre les envois d'emails (en ms)
   * Pour éviter de surcharger le serveur SMTP
   */
  DELAY_BETWEEN_EMAILS_MS: 500,

  /**
   * Variables de fusion disponibles dans les templates d'emails
   */
  MERGE_VARIABLES: [
    '{{first_name}}',
    '{{last_name}}',
    '{{email}}',
    '{{membership_type}}',
  ] as const,
} as const;

/**
 * Configuration Firebase Admin (pour les routes API)
 */
export const FIREBASE_ADMIN_CONFIG = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
};

/**
 * Validation de la configuration email
 */
export function validateEmailConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Vérifier que Firebase est configuré
  if (!FIREBASE_ADMIN_CONFIG.projectId) {
    errors.push('VITE_FIREBASE_PROJECT_ID manquante');
  }

  // Note: Les variables SMTP sont vérifiées côté API au moment de l'envoi

  return {
    valid: errors.length === 0,
    errors,
  };
}
