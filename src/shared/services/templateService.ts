/**
 * Service de gestion des templates d'emails
 *
 * Gère le remplacement des variables de fusion (merge variables)
 * dans les emails avant l'envoi.
 */

import type { MergeData } from '../types/email';
import type { CampaignRecipient } from '../types/campaign';

/**
 * Remplace toutes les variables de fusion dans un template
 *
 * @param template - Template HTML contenant des variables {{variable}}
 * @param data - Données à injecter
 * @returns Template avec les variables remplacées
 */
export function replaceMergeVariables(
  template: string,
  data: MergeData
): string {
  let result = template;

  // Remplacer chaque variable
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value || '');
  });

  // Nettoyer les variables non remplacées (optionnel)
  // result = result.replace(/{{[^}]+}}/g, '');

  return result;
}

/**
 * Génère les données de fusion pour un destinataire
 *
 * @param recipient - Destinataire de la campagne
 * @param campaignId - ID de la campagne
 * @returns Données de fusion
 */
export function generateMergeData(
  recipient: CampaignRecipient,
  campaignId: string
): MergeData {
  // Générer l'URL de désinscription
  const baseUrl = process.env.VITE_APP_URL || 'https://fornap.com';
  const unsubscribeUrl = `${baseUrl}/unsubscribe?campaign=${campaignId}&user=${recipient.userId}`;

  return {
    first_name: recipient.firstName || '',
    last_name: recipient.lastName || '',
    email: recipient.email || '',
    membership_type: 'Standard', // À récupérer depuis les données utilisateur si nécessaire
    unsubscribe_url: unsubscribeUrl,
  };
}

/**
 * Prépare le contenu HTML d'un email pour un destinataire spécifique
 *
 * @param htmlTemplate - Template HTML original
 * @param recipient - Destinataire
 * @param campaignId - ID de la campagne
 * @returns HTML personnalisé
 */
export function prepareEmailContent(
  htmlTemplate: string,
  recipient: CampaignRecipient,
  campaignId: string
): string {
  const mergeData = generateMergeData(recipient, campaignId);
  return replaceMergeVariables(htmlTemplate, mergeData);
}

/**
 * Valide qu'un template HTML est valide
 *
 * @param html - Template HTML à valider
 * @returns true si valide, false sinon
 */
export function validateTemplate(html: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!html || html.trim().length === 0) {
    errors.push('Le template est vide');
  }

  // Vérifier les balises HTML de base
  if (!html.includes('<html') && !html.includes('<body')) {
    errors.push('Le template doit contenir des balises HTML valides');
  }

  // Vérifier les variables de fusion mal formées
  const malformedVariables = html.match(/{{[^}]*$/g);
  if (malformedVariables) {
    errors.push('Le template contient des variables de fusion mal formées');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Ajoute un pixel de tracking pour les ouvertures
 *
 * @param html - HTML de l'email
 * @param trackingUrl - URL du pixel de tracking
 * @returns HTML avec pixel de tracking
 */
export function addTrackingPixel(html: string, trackingUrl: string): string {
  const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none" />`;

  // Insérer avant la balise de fermeture </body> si elle existe
  if (html.includes('</body>')) {
    return html.replace('</body>', `${trackingPixel}</body>`);
  }

  // Sinon, ajouter à la fin
  return html + trackingPixel;
}

/**
 * Convertit les liens dans l'email pour le tracking des clics
 *
 * @param html - HTML de l'email
 * @param campaignId - ID de la campagne
 * @param recipientId - ID du destinataire
 * @returns HTML avec liens trackés
 */
export function addClickTracking(
  html: string,
  campaignId: string,
  recipientId: string
): string {
  const baseUrl = process.env.VITE_APP_URL || 'https://fornap.com';

  // Remplacer tous les liens href
  return html.replace(
    /href=["']([^"']+)["']/g,
    (match, url) => {
      // Ne pas tracker les ancres locales ou les liens mailto
      if (url.startsWith('#') || url.startsWith('mailto:')) {
        return match;
      }

      // Encoder l'URL originale
      const encodedUrl = encodeURIComponent(url);

      // Créer l'URL de tracking
      const trackingUrl = `${baseUrl}/api/campaigns/track/click?campaign=${campaignId}&recipient=${recipientId}&url=${encodedUrl}`;

      return `href="${trackingUrl}"`;
    }
  );
}

/**
 * Prépare un email complet avec tracking
 *
 * @param htmlTemplate - Template HTML original
 * @param recipient - Destinataire
 * @param campaignId - ID de la campagne
 * @param options - Options de tracking
 * @returns HTML final prêt à envoyer
 */
export function prepareTrackedEmail(
  htmlTemplate: string,
  recipient: CampaignRecipient,
  campaignId: string,
  options: {
    enableOpenTracking?: boolean;
    enableClickTracking?: boolean;
  } = {}
): string {
  const { enableOpenTracking = true, enableClickTracking = true } = options;

  // 1. Remplacer les variables de fusion
  let html = prepareEmailContent(htmlTemplate, recipient, campaignId);

  // 2. Ajouter le tracking des clics
  if (enableClickTracking) {
    html = addClickTracking(html, campaignId, recipient.id);
  }

  // 3. Ajouter le pixel de tracking des ouvertures
  if (enableOpenTracking) {
    const baseUrl = process.env.VITE_APP_URL || 'https://fornap.com';
    const trackingUrl = `${baseUrl}/api/campaigns/track/open?campaign=${campaignId}&recipient=${recipient.id}`;
    html = addTrackingPixel(html, trackingUrl);
  }

  return html;
}
