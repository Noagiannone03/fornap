/**
 * Module de transport email avec fallback automatique
 *
 * Stratégie:
 * 1. Essayer d'abord avec le SMTP FORNAP (no-reply@fornap.fr)
 * 2. En cas d'échec, basculer automatiquement sur Brevo (SMTP relay)
 * 3. Logger quel provider a été utilisé pour le monitoring
 *
 * Variables d'environnement requises pour Brevo:
 * - BREVO_SMTP_HOST (défaut: smtp-relay.brevo.com)
 * - BREVO_SMTP_PORT (défaut: 587)
 * - BREVO_SMTP_USER (défaut: 98192c001@smtp-brevo.com)
 * - BREVO_SMTP_KEY (clé SMTP Brevo)
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';

// Types pour le résultat d'envoi
export interface EmailSendResult {
  success: boolean;
  provider: 'fornap' | 'brevo';
  messageId?: string;
  error?: string;
  fallbackUsed: boolean;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: Mail.Attachment[];
}

// Configuration SMTP FORNAP (primaire)
function createFornapTransporter(): Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.fornap.fr',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'no-reply@fornap.fr',
      pass: process.env.SMTP_PASSWORD || 'rU6*suHY_b-ce1Z',
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10 secondes
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

// Configuration SMTP Brevo (fallback)
// IMPORTANT: Les credentials doivent être configurés via variables d'environnement Vercel
function createBrevoTransporter(): Transporter {
  if (!process.env.BREVO_SMTP_KEY) {
    throw new Error('BREVO_SMTP_KEY environment variable is required for fallback');
  }

  return nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER || '98192c001@smtp-brevo.com',
      pass: process.env.BREVO_SMTP_KEY,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

/**
 * Créer un transporter email (pour compatibilité avec le code existant)
 * @deprecated Utiliser sendEmailWithFallback() pour bénéficier du fallback automatique
 */
export function createEmailTransporter(): Transporter {
  return createFornapTransporter();
}

/**
 * Vérifie si une erreur SMTP justifie un fallback
 */
function shouldFallback(error: any): boolean {
  // Erreurs de connexion
  if (error.code === 'ECONNREFUSED') return true;
  if (error.code === 'ETIMEDOUT') return true;
  if (error.code === 'ECONNRESET') return true;
  if (error.code === 'ESOCKET') return true;
  if (error.code === 'ENOTFOUND') return true;

  // Erreurs d'authentification
  if (error.responseCode === 535) return true; // Auth failed
  if (error.responseCode === 534) return true; // Auth mechanism not supported

  // Erreurs de quota/limite
  if (error.responseCode === 421) return true; // Too many connections
  if (error.responseCode === 450) return true; // Mailbox unavailable (temp)
  if (error.responseCode === 451) return true; // Local error / rate limit
  if (error.responseCode === 452) return true; // Insufficient storage

  // Erreurs de timeout
  if (error.message?.includes('timeout')) return true;
  if (error.message?.includes('ETIMEDOUT')) return true;

  // Erreur générique de connexion
  if (error.message?.includes('connection')) return true;

  return false;
}

/**
 * Envoie un email avec fallback automatique sur Brevo en cas d'échec FORNAP
 *
 * @param options - Options de l'email (to, subject, html, etc.)
 * @returns Résultat de l'envoi avec info sur le provider utilisé
 */
export async function sendEmailWithFallback(options: EmailOptions): Promise<EmailSendResult> {
  const {
    to,
    subject,
    html,
    from = '"FOR+NAP Social Club" <no-reply@fornap.fr>',
    replyTo = 'contact@fornap.fr',
    attachments,
  } = options;

  const mailOptions: Mail.Options = {
    from,
    to,
    subject,
    html,
    replyTo,
    attachments,
  };

  // ================================================================
  // ⚠️ MODE TEST: BREVO UNIQUEMENT
  // Le bloc FORNAP est commenté pour tester uniquement Brevo.
  // Pour réactiver le système complet avec fallback, décommenter
  // le bloc ci-dessous et supprimer le bloc "MODE TEST BREVO".
  // ================================================================

  /*
  // Tentative 1: SMTP FORNAP
  try {
    console.log(`📧 [FORNAP] Tentative d'envoi à ${to}...`);
    const fornapTransporter = createFornapTransporter();

    const result = await fornapTransporter.sendMail(mailOptions);

    console.log(`✅ [FORNAP] Email envoyé avec succès à ${to} (messageId: ${result.messageId})`);

    return {
      success: true,
      provider: 'fornap',
      messageId: result.messageId,
      fallbackUsed: false,
    };
  } catch (fornapError: any) {
    console.error(`❌ [FORNAP] Échec d'envoi à ${to}:`, fornapError.message);
    console.error(`   Code: ${fornapError.code}, ResponseCode: ${fornapError.responseCode}`);

    // Vérifier si on doit tenter le fallback
    if (!shouldFallback(fornapError)) {
      // Erreur définitive (ex: email invalide), pas de fallback
      console.log(`⚠️ [FORNAP] Erreur non récupérable, pas de fallback`);
      return {
        success: false,
        provider: 'fornap',
        error: fornapError.message,
        fallbackUsed: false,
      };
    }

    // Tentative 2: SMTP Brevo (fallback)
  */

  // ================================================================
  // MODE TEST BREVO - Envoi direct via Brevo
  // ================================================================

  // Vérifier si Brevo est configuré
  if (!process.env.BREVO_SMTP_KEY) {
    console.error(`⚠️ [BREVO] BREVO_SMTP_KEY non configuré`);
    return {
      success: false,
      provider: 'brevo',
      error: `BREVO_SMTP_KEY non configuré`,
      fallbackUsed: false,
    };
  }

  try {
    console.log(`� [BREVO] Envoi direct à ${to}...`);
    const brevoTransporter = createBrevoTransporter();

    // Pour Brevo, on peut optionnellement changer l'adresse d'expédition
    // mais on garde la même pour la cohérence
    const brevoMailOptions: Mail.Options = {
      ...mailOptions,
      // Brevo permet d'envoyer avec n'importe quelle adresse from vérifiée
      // On garde no-reply@fornap.fr si le domaine est vérifié sur Brevo
      // Sinon, utiliser l'adresse par défaut Brevo
      from: process.env.BREVO_FROM_EMAIL || from,
    };

    const result = await brevoTransporter.sendMail(brevoMailOptions);

    console.log(`✅ [BREVO] Email envoyé avec succès à ${to} (messageId: ${result.messageId})`);

    return {
      success: true,
      provider: 'brevo',
      messageId: result.messageId,
      fallbackUsed: false,  // En mode test, pas de fallback car envoi direct
    };
  } catch (brevoError: any) {
    console.error(`❌ [BREVO] Échec d'envoi à ${to}:`, brevoError.message);

    return {
      success: false,
      provider: 'brevo',
      error: brevoError.message,
      fallbackUsed: false,
    };
  }

  /*
  // Fin du bloc FORNAP commenté (pour réactiver le fallback)
  }
  */
}

/**
 * Vérifie la connexion aux serveurs SMTP
 * Utile pour le monitoring et les health checks
 */
export async function checkEmailConnectivity(): Promise<{
  fornap: { available: boolean; error?: string };
  brevo: { available: boolean; error?: string };
}> {
  const results = {
    fornap: { available: false, error: undefined as string | undefined },
    brevo: { available: false, error: undefined as string | undefined },
  };

  // Test FORNAP
  try {
    const fornapTransporter = createFornapTransporter();
    await fornapTransporter.verify();
    results.fornap.available = true;
    console.log('✅ [FORNAP] Connexion SMTP OK');
  } catch (error: any) {
    results.fornap.error = error.message;
    console.error('❌ [FORNAP] Connexion SMTP KO:', error.message);
  }

  // Test Brevo
  try {
    const brevoTransporter = createBrevoTransporter();
    await brevoTransporter.verify();
    results.brevo.available = true;
    console.log('✅ [BREVO] Connexion SMTP OK');
  } catch (error: any) {
    results.brevo.error = error.message;
    console.error('❌ [BREVO] Connexion SMTP KO:', error.message);
  }

  return results;
}
