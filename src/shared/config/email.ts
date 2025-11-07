/**
 * Configuration pour le système d'envoi d'emails
 *
 * Ce fichier centralise toute la configuration liée à l'envoi d'emails :
 * - Batch size pour éviter les timeouts Vercel
 * - Rate limiting pour respecter les quotas des services
 * - Configuration des services (Resend, QStash)
 */

export const EMAIL_CONFIG = {
  /**
   * Nombre d'emails par batch
   * Limité à 50 pour rester dans la limite de 10s de Vercel (plan Hobby)
   * Chaque batch est traité par une fonction serverless séparée via QStash
   */
  BATCH_SIZE: 50,

  /**
   * Délai entre les batches (en secondes)
   * Pour éviter le rate limiting du service d'envoi
   */
  BATCH_DELAY_SECONDS: 2,

  /**
   * Nombre maximum de tentatives pour chaque email
   */
  MAX_RETRY_ATTEMPTS: 3,

  /**
   * Délai de retry en cas d'échec (en secondes)
   * QStash gérera automatiquement les retries avec backoff exponentiel
   */
  RETRY_DELAY_SECONDS: 60,

  /**
   * Template par défaut pour les emails
   */
  DEFAULT_FROM_NAME: 'FORNAP',
  DEFAULT_FROM_EMAIL: 'noreply@fornap.com', // À remplacer par votre domaine vérifié

  /**
   * Limite de taux d'envoi (emails par seconde)
   * Pour Resend plan gratuit : ~10 emails/seconde
   */
  RATE_LIMIT_PER_SECOND: 8,

  /**
   * Timeout pour les requêtes API (en ms)
   */
  API_TIMEOUT_MS: 8000, // Moins de 10s pour rester dans les limites Vercel

  /**
   * Variables de fusion disponibles dans les templates
   */
  MERGE_VARIABLES: [
    '{{first_name}}',
    '{{last_name}}',
    '{{email}}',
    '{{membership_type}}',
    '{{unsubscribe_url}}',
  ] as const,
} as const;

/**
 * Configuration Resend
 */
export const RESEND_CONFIG = {
  apiKey: process.env.RESEND_API_KEY || '',
  // URL de base pour les webhooks
  webhookBaseUrl: process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.WEBHOOK_BASE_URL || 'http://localhost:5173',
} as const;

/**
 * Configuration QStash (Upstash)
 */
export const QSTASH_CONFIG = {
  url: process.env.QSTASH_URL || '',
  token: process.env.QSTASH_TOKEN || '',
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
} as const;

/**
 * Configuration Firebase Admin (pour les routes API)
 */
export const FIREBASE_ADMIN_CONFIG = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
  // Pour l'authentification, on utilisera les credentials par défaut de Vercel
  // ou la variable d'environnement GOOGLE_APPLICATION_CREDENTIALS
};

/**
 * Validation de la configuration
 */
export function validateEmailConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!RESEND_CONFIG.apiKey) {
    errors.push('RESEND_API_KEY manquante');
  }

  if (!QSTASH_CONFIG.token) {
    errors.push('QSTASH_TOKEN manquante');
  }

  if (!QSTASH_CONFIG.currentSigningKey) {
    errors.push('QSTASH_CURRENT_SIGNING_KEY manquante');
  }

  if (!FIREBASE_ADMIN_CONFIG.projectId) {
    errors.push('VITE_FIREBASE_PROJECT_ID manquante');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
