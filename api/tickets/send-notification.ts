/**
 * API pour envoyer des notifications email concernant les tickets de support
 *
 * Cette API gère:
 * 1. Notification admin quand un nouveau ticket est créé
 * 2. Notification utilisateur quand un admin répond
 * 3. Notification admin quand un utilisateur répond
 * 4. Notification utilisateur quand le statut change
 *
 * Endpoint: POST /api/tickets/send-notification
 * Body: {
 *   type: 'new_ticket' | 'new_message_to_user' | 'new_message_to_admin' | 'status_change' | 'ticket_created_confirmation',
 *   ticketId: string,
 *   ticketNumber: string,
 *   ticketSubject: string,
 *   ticketType: string,
 *   ticketPriority: string,
 *   ticketStatus?: string,
 *   previousStatus?: string,
 *   userName: string,
 *   userEmail: string,
 *   messageContent?: string,
 *   senderName?: string,
 *   adminEmail?: string (optionnel, pour les tests)
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendEmailWithFallback } from '../_lib/email-transport.js';
import { getFirestore } from '../_lib/firebase-admin.js';

// Configuration
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'contact@fornap.fr';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://fornap.fr';

/**
 * Récupère les emails de tous les développeurs actifs
 * Fallback sur SUPERADMIN_EMAIL en cas d'erreur
 */
async function getDeveloperEmails(): Promise<string[]> {
  try {
    const db = getFirestore();
    const adminsRef = db.collection('admins');

    const snapshot = await adminsRef
      .where('role', '==', 'developpeur')
      .where('isActive', '==', true)
      .get();

    if (snapshot.empty) {
      console.warn('⚠️ No active developers found, using fallback email');
      return [SUPERADMIN_EMAIL];
    }

    const emails = snapshot.docs
      .map(doc => doc.data().email)
      .filter((email): email is string => !!email);

    if (emails.length === 0) {
      console.warn('⚠️ No developer emails found, using fallback email');
      return [SUPERADMIN_EMAIL];
    }

    console.log(`✅ Found ${emails.length} developer email(s):`, emails.join(', '));
    return emails;
  } catch (error) {
    console.error('❌ Error fetching developer emails:', error);
    return [SUPERADMIN_EMAIL];
  }
}

// Types
type NotificationType =
  | 'new_ticket'
  | 'new_message_to_user'
  | 'new_message_to_admin'
  | 'status_change'
  | 'ticket_created_confirmation';

type TicketType = 'maintenance' | 'improvement' | 'feature_request' | 'bug_report' | 'other';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketStatus = 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';

interface NotificationRequest {
  type: NotificationType;
  ticketId: string;
  ticketNumber: string;
  ticketSubject: string;
  ticketType: TicketType;
  ticketPriority: TicketPriority;
  ticketStatus?: TicketStatus;
  previousStatus?: TicketStatus;
  userName: string;
  userEmail: string;
  messageContent?: string;
  senderName?: string;
  adminEmail?: string;
}

// Labels pour les templates
const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  maintenance: 'Maintenance',
  improvement: 'Amélioration',
  feature_request: 'Nouvelle fonctionnalité',
  bug_report: 'Correction de bug',
  other: 'Autre',
};

const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Basse',
  medium: 'Normale',
  high: 'Haute',
  urgent: 'Urgente',
};

const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  waiting_for_user: 'En attente de réponse',
  resolved: 'Résolu',
  closed: 'Fermé',
};

// Utility functions pour les badges
function getStatusBadge(status: TicketStatus): string {
  const colors: Record<TicketStatus, { bg: string; text: string }> = {
    open: { bg: '#e3f2fd', text: '#1565c0' },
    in_progress: { bg: '#fff8e1', text: '#f57c00' },
    waiting_for_user: { bg: '#fff3e0', text: '#ef6c00' },
    resolved: { bg: '#e8f5e9', text: '#2e7d32' },
    closed: { bg: '#f5f5f5', text: '#757575' },
  };
  const color = colors[status] || colors.open;
  return `<span style="display: inline-block; padding: 6px 14px; background-color: ${color.bg}; color: ${color.text}; border-radius: 20px; font-size: 13px; font-weight: 600;">${TICKET_STATUS_LABELS[status]}</span>`;
}

function getPriorityBadge(priority: TicketPriority): string {
  const colors: Record<TicketPriority, { bg: string; text: string }> = {
    low: { bg: '#f5f5f5', text: '#757575' },
    medium: { bg: '#e3f2fd', text: '#1565c0' },
    high: { bg: '#fff3e0', text: '#ef6c00' },
    urgent: { bg: '#ffebee', text: '#c62828' },
  };
  const color = colors[priority] || colors.medium;
  return `<span style="display: inline-block; padding: 6px 14px; background-color: ${color.bg}; color: ${color.text}; border-radius: 20px; font-size: 13px; font-weight: 600;">${TICKET_PRIORITY_LABELS[priority]}</span>`;
}

// Template parts
function getEmailHeader(): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FOR+NAP Support</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden; max-width: 600px;">
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);">
              <img src="https://www.fornap.fr/assets/logo-etendu-fornap-CnmtvHyt.png" alt="FOR+NAP" style="width: 200px; height: auto; display: block; margin: 0 auto;" />
              <p style="font-size: 14px; color: #999; margin: 16px 0 0 0; letter-spacing: 2px; text-transform: uppercase;">Support Technique</p>
            </td>
          </tr>
`;
}

function getEmailFooter(): string {
  return `
          <tr>
            <td style="background-color: #1a1a1a; padding: 30px; text-align: center;">
              <p style="font-size: 13px; color: #999; margin: 0 0 8px 0;">
                FOR+NAP Social Club - Support Technique
              </p>
              <p style="font-size: 12px; color: #666; margin: 0;">
                Fort Napoléon, La Seyne-sur-Mer
              </p>
              <p style="font-size: 11px; color: #555; margin: 12px 0 0 0;">
                Cet email a été envoyé automatiquement. Merci de ne pas y répondre directement.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// Template generators
function generateNewTicketAdminEmail(data: NotificationRequest): { subject: string; html: string } {
  const adminUrl = `${BASE_URL}/admin/tickets/${data.ticketId}`;
  const subject = `[Nouveau Ticket] ${data.ticketNumber} - ${data.ticketSubject}`;

  const html = `
${getEmailHeader()}
          <tr>
            <td style="padding: 40px 50px;">
              <h1 style="font-size: 24px; color: #1a1a1a; margin: 0 0 24px 0; text-align: center;">
                Nouveau ticket de support
              </h1>
              <div style="background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%); border-left: 4px solid #ff4757; padding: 24px; margin: 0 0 24px 0; border-radius: 8px;">
                <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Ticket #</p>
                <p style="font-size: 18px; color: #1a1a1a; margin: 0 0 16px 0; font-weight: 700;">${data.ticketNumber}</p>
                <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Sujet</p>
                <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 16px 0; font-weight: 600;">${data.ticketSubject}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                  <tr>
                    <td style="width: 50%;">
                      <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Type</p>
                      <p style="font-size: 14px; color: #1a1a1a; margin: 0;">${TICKET_TYPE_LABELS[data.ticketType]}</p>
                    </td>
                    <td style="width: 50%;">
                      <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Priorité</p>
                      ${getPriorityBadge(data.ticketPriority)}
                    </td>
                  </tr>
                </table>
              </div>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 0 0 24px 0;">
                <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Créé par</p>
                <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 4px 0; font-weight: 600;">${data.userName}</p>
                <p style="font-size: 14px; color: #666; margin: 0;">${data.userEmail}</p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${adminUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 16px rgba(255, 71, 87, 0.3);">
                  Voir le ticket
                </a>
              </div>
              <p style="font-size: 14px; color: #666; text-align: center; margin: 0;">
                Connectez-vous au panel admin pour répondre à ce ticket.
              </p>
            </td>
          </tr>
${getEmailFooter()}
`;

  return { subject, html };
}

function generateNewMessageUserEmail(data: NotificationRequest): { subject: string; html: string } {
  const ticketUrl = `${BASE_URL}/dashboard/support/${data.ticketId}`;
  const subject = `[${data.ticketNumber}] Nouvelle réponse à votre demande`;
  const messagePreview = data.messageContent
    ? (data.messageContent.length > 300 ? data.messageContent.substring(0, 300) + '...' : data.messageContent)
    : '';

  const html = `
${getEmailHeader()}
          <tr>
            <td style="padding: 40px 50px;">
              <p style="font-size: 18px; line-height: 1.6; color: #1a1a1a; margin: 0 0 24px 0;">
                Bonjour <strong>${data.userName}</strong>,
              </p>
              <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 24px 0;">
                Vous avez reçu une nouvelle réponse concernant votre demande de support.
              </p>
              <div style="background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%); border-left: 4px solid #ff4757; padding: 24px; margin: 0 0 24px 0; border-radius: 8px;">
                <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Ticket #${data.ticketNumber}</p>
                <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 16px 0; font-weight: 600;">${data.ticketSubject}</p>
                <div style="background-color: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e0e0e0;">
                  <p style="font-size: 13px; color: #666; margin: 0 0 8px 0;">
                    <strong>${data.senderName || 'Support FOR+NAP'}</strong> a écrit :
                  </p>
                  <p style="font-size: 15px; color: #1a1a1a; margin: 0; line-height: 1.6;">
                    ${messagePreview}
                  </p>
                </div>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${ticketUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 16px rgba(255, 71, 87, 0.3);">
                  Voir la conversation
                </a>
              </div>
              <p style="font-size: 14px; color: #666; text-align: center; margin: 0;">
                Connectez-vous à votre espace membre pour consulter et répondre.
              </p>
            </td>
          </tr>
${getEmailFooter()}
`;

  return { subject, html };
}

function generateNewMessageAdminEmail(data: NotificationRequest): { subject: string; html: string } {
  const adminUrl = `${BASE_URL}/admin/tickets/${data.ticketId}`;
  const subject = `[${data.ticketNumber}] Nouvelle réponse de ${data.userName}`;
  const messagePreview = data.messageContent
    ? (data.messageContent.length > 300 ? data.messageContent.substring(0, 300) + '...' : data.messageContent)
    : '';

  const html = `
${getEmailHeader()}
          <tr>
            <td style="padding: 40px 50px;">
              <h1 style="font-size: 24px; color: #1a1a1a; margin: 0 0 24px 0; text-align: center;">
                Nouvelle réponse client
              </h1>
              <div style="background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%); border-left: 4px solid #ff4757; padding: 24px; margin: 0 0 24px 0; border-radius: 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 16px;">
                  <tr>
                    <td>
                      <p style="font-size: 14px; color: #666; margin: 0 0 4px 0;">Ticket #${data.ticketNumber}</p>
                      <p style="font-size: 16px; color: #1a1a1a; margin: 0; font-weight: 600;">${data.ticketSubject}</p>
                    </td>
                    <td style="text-align: right;">
                      ${getPriorityBadge(data.ticketPriority)}
                    </td>
                  </tr>
                </table>
                <div style="background-color: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e0e0e0;">
                  <p style="font-size: 13px; color: #666; margin: 0 0 8px 0;">
                    <strong>${data.userName}</strong> (${data.userEmail}) a écrit :
                  </p>
                  <p style="font-size: 15px; color: #1a1a1a; margin: 0; line-height: 1.6;">
                    ${messagePreview}
                  </p>
                </div>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${adminUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 16px rgba(255, 71, 87, 0.3);">
                  Répondre au ticket
                </a>
              </div>
            </td>
          </tr>
${getEmailFooter()}
`;

  return { subject, html };
}

function generateStatusChangeEmail(data: NotificationRequest): { subject: string; html: string } {
  const ticketUrl = `${BASE_URL}/dashboard/support/${data.ticketId}`;
  const status = data.ticketStatus!;

  const statusMessages: Record<TicketStatus, string> = {
    open: 'Votre ticket a été réouvert.',
    in_progress: 'Votre demande est maintenant en cours de traitement par notre équipe.',
    waiting_for_user: 'Nous attendons des informations supplémentaires de votre part pour continuer le traitement.',
    resolved: 'Votre demande a été traitée et résolue. Si vous avez d\'autres questions, n\'hésitez pas à répondre.',
    closed: 'Votre ticket a été clôturé. Merci de nous avoir contactés.',
  };

  const subject = `[${data.ticketNumber}] Statut mis à jour : ${TICKET_STATUS_LABELS[status]}`;

  const html = `
${getEmailHeader()}
          <tr>
            <td style="padding: 40px 50px;">
              <p style="font-size: 18px; line-height: 1.6; color: #1a1a1a; margin: 0 0 24px 0;">
                Bonjour <strong>${data.userName}</strong>,
              </p>
              <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 24px 0;">
                Le statut de votre demande de support a été mis à jour.
              </p>
              <div style="background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%); border-left: 4px solid #ff4757; padding: 24px; margin: 0 0 24px 0; border-radius: 8px;">
                <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Ticket #${data.ticketNumber}</p>
                <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0; font-weight: 600;">${data.ticketSubject}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                  <tr>
                    <td style="text-align: center; width: 40%;">
                      ${data.previousStatus ? getStatusBadge(data.previousStatus) : ''}
                    </td>
                    <td style="text-align: center; width: 20%;">
                      <span style="font-size: 24px; color: #999;">→</span>
                    </td>
                    <td style="text-align: center; width: 40%;">
                      ${getStatusBadge(status)}
                    </td>
                  </tr>
                </table>
                <p style="font-size: 15px; color: #333; margin: 16px 0 0 0; text-align: center; line-height: 1.6;">
                  ${statusMessages[status]}
                </p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${ticketUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 16px rgba(255, 71, 87, 0.3);">
                  Voir le ticket
                </a>
              </div>
              <p style="font-size: 14px; color: #666; text-align: center; margin: 0;">
                Connectez-vous à votre espace membre pour plus de détails.
              </p>
            </td>
          </tr>
${getEmailFooter()}
`;

  return { subject, html };
}

function generateTicketCreatedConfirmationEmail(data: NotificationRequest): { subject: string; html: string } {
  const ticketUrl = `${BASE_URL}/dashboard/support/${data.ticketId}`;
  const subject = `[${data.ticketNumber}] Votre demande a bien été enregistrée`;

  const html = `
${getEmailHeader()}
          <tr>
            <td style="padding: 40px 50px;">
              <p style="font-size: 18px; line-height: 1.6; color: #1a1a1a; margin: 0 0 24px 0;">
                Bonjour <strong>${data.userName}</strong>,
              </p>
              <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 8px 0;">
                Merci de nous avoir contactés !
              </p>
              <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 24px 0;">
                Votre demande de support a bien été enregistrée. Notre équipe va l'examiner dans les plus brefs délais.
              </p>
              <div style="background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%); border-left: 4px solid #ff4757; padding: 24px; margin: 0 0 24px 0; border-radius: 8px;">
                <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Numéro de ticket</p>
                <p style="font-size: 20px; color: #1a1a1a; margin: 0 0 20px 0; font-weight: 700; letter-spacing: 1px;">${data.ticketNumber}</p>
                <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Sujet</p>
                <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0; font-weight: 600;">${data.ticketSubject}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                  <tr>
                    <td style="width: 50%;">
                      <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Type</p>
                      <p style="font-size: 14px; color: #1a1a1a; margin: 0;">${TICKET_TYPE_LABELS[data.ticketType]}</p>
                    </td>
                    <td style="width: 50%;">
                      <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Priorité</p>
                      ${getPriorityBadge(data.ticketPriority)}
                    </td>
                  </tr>
                </table>
              </div>
              <div style="background-color: #e3f2fd; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
                <p style="font-size: 14px; color: #1565c0; margin: 0; line-height: 1.6;">
                  <strong>Conservez ce numéro de ticket</strong> pour toute référence future concernant cette demande.
                </p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${ticketUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 16px rgba(255, 71, 87, 0.3);">
                  Suivre ma demande
                </a>
              </div>
              <p style="font-size: 14px; color: #666; text-align: center; margin: 0;">
                Vous recevrez une notification par email dès qu'une réponse sera disponible.
              </p>
            </td>
          </tr>
${getEmailFooter()}
`;

  return { subject, html };
}

// Main handler
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const data = req.body as NotificationRequest;

    // Validation
    if (!data.type || !data.ticketId || !data.ticketNumber || !data.ticketSubject) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    let emailContent: { subject: string; html: string };
    let recipientEmails: string[];

    switch (data.type) {
      case 'new_ticket':
        emailContent = generateNewTicketAdminEmail(data);
        // Envoyer à tous les développeurs au lieu d'un seul email
        recipientEmails = data.adminEmail ? [data.adminEmail] : await getDeveloperEmails();
        break;

      case 'new_message_to_user':
        emailContent = generateNewMessageUserEmail(data);
        recipientEmails = [data.userEmail];
        break;

      case 'new_message_to_admin':
        emailContent = generateNewMessageAdminEmail(data);
        // Envoyer à tous les développeurs au lieu d'un seul email
        recipientEmails = data.adminEmail ? [data.adminEmail] : await getDeveloperEmails();
        break;

      case 'status_change':
        if (!data.ticketStatus) {
          res.status(400).json({ error: 'ticketStatus is required for status_change notifications' });
          return;
        }
        emailContent = generateStatusChangeEmail(data);
        recipientEmails = [data.userEmail];
        break;

      case 'ticket_created_confirmation':
        emailContent = generateTicketCreatedConfirmationEmail(data);
        recipientEmails = [data.userEmail];
        break;

      default:
        res.status(400).json({ error: 'Invalid notification type' });
        return;
    }

    console.log(`📧 Sending ${data.type} notification for ticket ${data.ticketNumber} to ${recipientEmails.length} recipient(s): ${recipientEmails.join(', ')}`);

    // Envoyer l'email à tous les destinataires
    const results = await Promise.allSettled(
      recipientEmails.map(email =>
        sendEmailWithFallback({
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
        })
      )
    );

    // Analyser les résultats
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failedCount = results.length - successCount;

    if (successCount > 0) {
      console.log(`✅ Email sent successfully to ${successCount}/${results.length} recipient(s)`);
      res.status(200).json({
        success: true,
        totalRecipients: results.length,
        successCount,
        failedCount,
        results: results.map((r, i) => ({
          email: recipientEmails[i],
          success: r.status === 'fulfilled' && r.value.success,
          provider: r.status === 'fulfilled' ? r.value.provider : undefined,
          error: r.status === 'rejected' ? r.reason : (r.status === 'fulfilled' && !r.value.success ? r.value.error : undefined),
        })),
      });
    } else {
      console.error(`❌ Failed to send email to all recipients`);
      res.status(500).json({
        success: false,
        error: 'Failed to send email to all recipients',
        totalRecipients: results.length,
        successCount,
        failedCount,
      });
    }
  } catch (error: any) {
    console.error('❌ Error in send-notification:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
