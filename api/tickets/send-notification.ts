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
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06); overflow: hidden; max-width: 600px;">
          <!-- Header avec fond blanc -->
          <tr>
            <td align="center" style="padding: 40px 40px 30px 40px; background-color: #ffffff; border-bottom: 3px solid #ff4757;">
              <img src="https://www.fornap.fr/assets/logo-etendu-fornap-CnmtvHyt.png" alt="FOR+NAP" style="width: 180px; height: auto; display: block; margin: 0 auto;" />
              <p style="font-size: 12px; color: #ff4757; margin: 12px 0 0 0; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600;">Support Technique</p>
            </td>
          </tr>
`;
}

function getEmailFooter(): string {
  return `
          <tr>
            <td style="background-color: #f8f9fa; padding: 32px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="font-size: 13px; color: #6c757d; margin: 0 0 8px 0; font-weight: 500;">
                FOR+NAP Social Club
              </p>
              <p style="font-size: 12px; color: #868e96; margin: 0 0 16px 0;">
                Fort Napoléon · La Seyne-sur-Mer
              </p>
              <p style="font-size: 11px; color: #adb5bd; margin: 0; line-height: 1.6;">
                Cet email a été envoyé automatiquement.<br>
                Pour toute question, connectez-vous à votre espace membre.
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
  const subject = `🎫 Nouveau ticket ${data.ticketNumber} - ${data.ticketSubject}`;

  const html = `
${getEmailHeader()}
          <tr>
            <td style="padding: 40px 50px;">
              <p style="font-size: 15px; color: #495057; margin: 0 0 24px 0; line-height: 1.6;">
                Un nouveau ticket de support vient d'être créé et attend votre attention.
              </p>

              <div style="background-color: #fff5f7; border-left: 4px solid #ff4757; padding: 24px; margin: 0 0 24px 0; border-radius: 8px;">
                <div style="margin-bottom: 20px;">
                  <p style="font-size: 12px; color: #868e96; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">Ticket</p>
                  <p style="font-size: 20px; color: #212529; margin: 0; font-weight: 700; font-family: 'Courier New', monospace;">${data.ticketNumber}</p>
                </div>

                <div style="margin-bottom: 20px;">
                  <p style="font-size: 12px; color: #868e96; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">Sujet</p>
                  <p style="font-size: 16px; color: #212529; margin: 0; font-weight: 600; line-height: 1.4;">${data.ticketSubject}</p>
                </div>

                <div style="display: table; width: 100%;">
                  <div style="display: table-cell; width: 50%; padding-right: 12px;">
                    <p style="font-size: 12px; color: #868e96; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">Type</p>
                    <p style="font-size: 14px; color: #495057; margin: 0; font-weight: 500;">${TICKET_TYPE_LABELS[data.ticketType]}</p>
                  </div>
                  <div style="display: table-cell; width: 50%; padding-left: 12px;">
                    <p style="font-size: 12px; color: #868e96; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">Priorité</p>
                    ${getPriorityBadge(data.ticketPriority)}
                  </div>
                </div>
              </div>

              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 0 0 32px 0;">
                <p style="font-size: 12px; color: #868e96; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Demandeur</p>
                <p style="font-size: 16px; color: #212529; margin: 0 0 4px 0; font-weight: 600;">${data.userName}</p>
                <p style="font-size: 14px; color: #6c757d; margin: 0;">${data.userEmail}</p>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${adminUrl}" style="display: inline-block; padding: 14px 32px; background-color: #ff4757; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 6px; box-shadow: 0 2px 8px rgba(255, 71, 87, 0.25); transition: all 0.2s;">
                  Répondre au ticket →
                </a>
              </div>

              <p style="font-size: 13px; color: #868e96; text-align: center; margin: 0;">
                Cliquez sur le bouton ci-dessus pour accéder au panel admin
              </p>
            </td>
          </tr>
${getEmailFooter()}
`;

  return { subject, html };
}

function generateNewMessageUserEmail(data: NotificationRequest): { subject: string; html: string } {
  const ticketUrl = `${BASE_URL}/dashboard/support/${data.ticketId}`;
  const subject = `💬 ${data.ticketNumber} - Nouvelle réponse de notre équipe`;
  const messagePreview = data.messageContent
    ? (data.messageContent.length > 300 ? data.messageContent.substring(0, 300) + '...' : data.messageContent)
    : '';

  const html = `
${getEmailHeader()}
          <tr>
            <td style="padding: 40px 50px;">
              <p style="font-size: 17px; line-height: 1.5; color: #212529; margin: 0 0 8px 0;">
                Bonjour <strong>${data.userName}</strong> 👋
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #495057; margin: 0 0 28px 0;">
                Bonne nouvelle ! Notre équipe vient de répondre à votre demande.
              </p>

              <div style="background-color: #f8f9fa; border-left: 4px solid #ff4757; padding: 24px; margin: 0 0 24px 0; border-radius: 8px;">
                <p style="font-size: 12px; color: #868e96; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Ticket ${data.ticketNumber}</p>
                <p style="font-size: 16px; color: #212529; margin: 0 0 20px 0; font-weight: 600; line-height: 1.4;">${data.ticketSubject}</p>

                <div style="background-color: #ffffff; padding: 18px; border-radius: 6px; border: 1px solid #dee2e6;">
                  <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%); border-radius: 50%; display: inline-block; margin-right: 12px; text-align: center; line-height: 36px; color: white; font-weight: 700; font-size: 14px;">
                      ${(data.senderName || 'Support').charAt(0).toUpperCase()}
                    </div>
                    <div style="display: inline-block;">
                      <p style="font-size: 14px; color: #212529; margin: 0; font-weight: 600;">${data.senderName || 'Équipe Support FOR+NAP'}</p>
                      <p style="font-size: 12px; color: #868e96; margin: 0;">vient de répondre</p>
                    </div>
                  </div>
                  <p style="font-size: 15px; color: #495057; margin: 0; line-height: 1.6; font-style: italic;">
                    "${messagePreview}"
                  </p>
                </div>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${ticketUrl}" style="display: inline-block; padding: 14px 32px; background-color: #ff4757; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 6px; box-shadow: 0 2px 8px rgba(255, 71, 87, 0.25);">
                  Voir la conversation complète →
                </a>
              </div>

              <p style="font-size: 13px; color: #868e96; text-align: center; margin: 0;">
                Répondez directement depuis votre espace membre
              </p>
            </td>
          </tr>
${getEmailFooter()}
`;

  return { subject, html };
}

function generateNewMessageAdminEmail(data: NotificationRequest): { subject: string; html: string } {
  const adminUrl = `${BASE_URL}/admin/tickets/${data.ticketId}`;
  const subject = `💬 ${data.ticketNumber} - ${data.userName} a répondu`;
  const messagePreview = data.messageContent
    ? (data.messageContent.length > 300 ? data.messageContent.substring(0, 300) + '...' : data.messageContent)
    : '';

  const html = `
${getEmailHeader()}
          <tr>
            <td style="padding: 40px 50px;">
              <p style="font-size: 15px; color: #495057; margin: 0 0 24px 0; line-height: 1.6;">
                ${data.userName} a ajouté une nouvelle réponse au ticket.
              </p>

              <div style="background-color: #fff5f7; border-left: 4px solid #ff4757; padding: 24px; margin: 0 0 24px 0; border-radius: 8px;">
                <div style="margin-bottom: 16px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                    <tr>
                      <td style="width: 70%;">
                        <p style="font-size: 12px; color: #868e96; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Ticket ${data.ticketNumber}</p>
                        <p style="font-size: 16px; color: #212529; margin: 0; font-weight: 600; line-height: 1.4;">${data.ticketSubject}</p>
                      </td>
                      <td style="text-align: right; width: 30%;">
                        ${getPriorityBadge(data.ticketPriority)}
                      </td>
                    </tr>
                  </table>
                </div>

                <div style="background-color: #ffffff; padding: 18px; border-radius: 6px; border: 1px solid #dee2e6;">
                  <div style="margin-bottom: 12px;">
                    <p style="font-size: 14px; color: #212529; margin: 0 0 2px 0; font-weight: 600;">${data.userName}</p>
                    <p style="font-size: 12px; color: #868e96; margin: 0;">${data.userEmail}</p>
                  </div>
                  <p style="font-size: 15px; color: #495057; margin: 0; line-height: 1.6; font-style: italic;">
                    "${messagePreview}"
                  </p>
                </div>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${adminUrl}" style="display: inline-block; padding: 14px 32px; background-color: #ff4757; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 6px; box-shadow: 0 2px 8px rgba(255, 71, 87, 0.25);">
                  Répondre au client →
                </a>
              </div>

              <p style="font-size: 13px; color: #868e96; text-align: center; margin: 0;">
                Accédez au panel admin pour gérer ce ticket
              </p>
            </td>
          </tr>
${getEmailFooter()}
`;

  return { subject, html };
}

function generateStatusChangeEmail(data: NotificationRequest): { subject: string; html: string } {
  const ticketUrl = `${BASE_URL}/dashboard/support/${data.ticketId}`;
  const status = data.ticketStatus!;

  // Messages personnalisés et sympas pour chaque statut
  const statusMessages: Record<TicketStatus, { icon: string; title: string; message: string; color: string }> = {
    open: {
      icon: '🔄',
      title: 'Ticket réouvert',
      message: 'Nous avons rouvert votre ticket pour poursuivre l\'assistance. Notre équipe revient vers vous très prochainement.',
      color: '#1565c0'
    },
    in_progress: {
      icon: '⚡',
      title: 'C\'est parti !',
      message: 'Bonne nouvelle ! Notre équipe travaille activement sur votre demande. Nous vous tiendrons informé de l\'avancement.',
      color: '#f57c00'
    },
    waiting_for_user: {
      icon: '💭',
      title: 'On a besoin de vous',
      message: 'Pour avancer sur votre demande, nous aurions besoin de quelques informations supplémentaires de votre part. Consultez le ticket pour voir nos questions.',
      color: '#ef6c00'
    },
    resolved: {
      icon: '✅',
      title: 'Problème résolu !',
      message: 'Super ! Nous avons traité votre demande avec succès. Si tout est bon pour vous ou si vous avez d\'autres questions, n\'hésitez pas à nous le faire savoir.',
      color: '#2e7d32'
    },
    closed: {
      icon: '🎉',
      title: 'Ticket clôturé',
      message: 'Votre demande a été finalisée et le ticket est maintenant fermé. Merci de nous avoir fait confiance ! Si vous avez besoin d\'aide à nouveau, n\'hésitez pas à créer un nouveau ticket.',
      color: '#757575'
    },
  };

  const statusInfo = statusMessages[status];
  const subject = `${statusInfo.icon} ${data.ticketNumber} - ${statusInfo.title}`;

  const html = `
${getEmailHeader()}
          <tr>
            <td style="padding: 40px 50px;">
              <p style="font-size: 17px; line-height: 1.5; color: #212529; margin: 0 0 8px 0;">
                Bonjour <strong>${data.userName}</strong> 👋
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #495057; margin: 0 0 28px 0;">
                Le statut de votre ticket a été mis à jour.
              </p>

              <!-- Encadré de changement de statut -->
              <div style="background-color: #f8f9fa; border-left: 4px solid ${statusInfo.color}; padding: 24px; margin: 0 0 28px 0; border-radius: 8px;">
                <p style="font-size: 12px; color: #868e96; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Ticket ${data.ticketNumber}</p>
                <p style="font-size: 16px; color: #212529; margin: 0 0 24px 0; font-weight: 600; line-height: 1.4;">${data.ticketSubject}</p>

                <!-- Transition de statut -->
                <div style="background-color: #ffffff; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                    <tr>
                      <td style="text-align: center; width: 35%;">
                        ${data.previousStatus ? getStatusBadge(data.previousStatus) : '<span style="color: #adb5bd;">—</span>'}
                      </td>
                      <td style="text-align: center; width: 30%;">
                        <span style="font-size: 24px; color: ${statusInfo.color};">→</span>
                      </td>
                      <td style="text-align: center; width: 35%;">
                        ${getStatusBadge(status)}
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- Message personnalisé -->
                <div style="text-align: center; padding: 16px; background-color: ${status === 'closed' ? '#fff5f7' : '#ffffff'}; border-radius: 6px;">
                  <p style="font-size: 32px; margin: 0 0 12px 0;">${statusInfo.icon}</p>
                  <p style="font-size: 17px; color: #212529; margin: 0 0 12px 0; font-weight: 600;">${statusInfo.title}</p>
                  <p style="font-size: 15px; color: #495057; margin: 0; line-height: 1.6;">
                    ${statusInfo.message}
                  </p>
                </div>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${ticketUrl}" style="display: inline-block; padding: 14px 32px; background-color: #ff4757; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 6px; box-shadow: 0 2px 8px rgba(255, 71, 87, 0.25);">
                  ${status === 'closed' ? 'Voir le récapitulatif' : 'Consulter le ticket'} →
                </a>
              </div>

              <p style="font-size: 13px; color: #868e96; text-align: center; margin: 0;">
                ${status === 'closed' ? 'N\'hésitez pas à créer un nouveau ticket si besoin' : 'Vous pouvez consulter l\'historique complet depuis votre espace membre'}
              </p>
            </td>
          </tr>
${getEmailFooter()}
`;

  return { subject, html };
}

function generateTicketCreatedConfirmationEmail(data: NotificationRequest): { subject: string; html: string } {
  const ticketUrl = `${BASE_URL}/dashboard/support/${data.ticketId}`;
  const subject = `✅ ${data.ticketNumber} - Demande enregistrée avec succès`;

  const html = `
${getEmailHeader()}
          <tr>
            <td style="padding: 40px 50px;">
              <p style="font-size: 17px; line-height: 1.5; color: #212529; margin: 0 0 8px 0;">
                Bonjour <strong>${data.userName}</strong> 👋
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #495057; margin: 0 0 8px 0;">
                Merci de nous avoir contactés !
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #495057; margin: 0 0 28px 0;">
                Votre demande de support a été enregistrée avec succès. Notre équipe en a été informée et reviendra vers vous rapidement.
              </p>

              <div style="background-color: #f8f9fa; border-left: 4px solid #ff4757; padding: 24px; margin: 0 0 24px 0; border-radius: 8px;">
                <div style="margin-bottom: 20px;">
                  <p style="font-size: 12px; color: #868e96; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">Votre numéro de ticket</p>
                  <p style="font-size: 24px; color: #212529; margin: 0; font-weight: 700; letter-spacing: 1px; font-family: 'Courier New', monospace;">${data.ticketNumber}</p>
                </div>

                <div style="margin-bottom: 20px;">
                  <p style="font-size: 12px; color: #868e96; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">Sujet</p>
                  <p style="font-size: 16px; color: #212529; margin: 0; font-weight: 600; line-height: 1.4;">${data.ticketSubject}</p>
                </div>

                <div style="display: table; width: 100%;">
                  <div style="display: table-cell; width: 50%; padding-right: 12px;">
                    <p style="font-size: 12px; color: #868e96; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">Type</p>
                    <p style="font-size: 14px; color: #495057; margin: 0; font-weight: 500;">${TICKET_TYPE_LABELS[data.ticketType]}</p>
                  </div>
                  <div style="display: table-cell; width: 50%; padding-left: 12px;">
                    <p style="font-size: 12px; color: #868e96; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">Priorité</p>
                    ${getPriorityBadge(data.ticketPriority)}
                  </div>
                </div>
              </div>

              <div style="background-color: #e7f5ff; border-radius: 6px; padding: 16px; margin: 0 0 28px 0; border: 1px solid #339af0;">
                <p style="font-size: 14px; color: #1971c2; margin: 0; line-height: 1.6; text-align: center;">
                  💡 <strong>Conseil :</strong> Conservez ce numéro pour toute référence future
                </p>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${ticketUrl}" style="display: inline-block; padding: 14px 32px; background-color: #ff4757; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 6px; box-shadow: 0 2px 8px rgba(255, 71, 87, 0.25);">
                  Suivre ma demande →
                </a>
              </div>

              <p style="font-size: 13px; color: #868e96; text-align: center; margin: 0;">
                📧 Vous recevrez un email dès qu'une réponse sera disponible
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
