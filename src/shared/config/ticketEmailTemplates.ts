/**
 * Templates d'emails pour le système de tickets de support
 * Notifications automatiques pour les changements de statut, nouveaux messages, etc.
 */

import { TicketStatus, TicketPriority, TicketType, TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS, TICKET_TYPE_LABELS } from '../types/ticket';

export interface TicketEmailVariables {
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
  ticketUrl: string;
  adminDashboardUrl?: string;
}

/**
 * Génère le header commun des emails de ticket
 */
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
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);">
              <img src="https://www.fornap.fr/assets/logo-etendu-fornap-CnmtvHyt.png" alt="FOR+NAP" style="width: 200px; height: auto; display: block; margin: 0 auto;" />
              <p style="font-size: 14px; color: #999; margin: 16px 0 0 0; letter-spacing: 2px; text-transform: uppercase;">Support Technique</p>
            </td>
          </tr>
`;
}

/**
 * Génère le footer commun des emails de ticket
 */
function getEmailFooter(): string {
  return `
          <!-- Footer -->
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

/**
 * Badge de statut coloré
 */
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

/**
 * Badge de priorité coloré
 */
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

/**
 * Template: Nouveau ticket créé (notification admin)
 */
export function getNewTicketAdminTemplate(vars: TicketEmailVariables): { subject: string; html: string } {
  const subject = `[Nouveau Ticket] ${vars.ticketNumber} - ${vars.ticketSubject}`;

  const html = `
${getEmailHeader()}
          <!-- Contenu principal -->
          <tr>
            <td style="padding: 40px 50px;">
              <!-- Titre -->
              <h1 style="font-size: 24px; color: #1a1a1a; margin: 0 0 24px 0; text-align: center;">
                Nouveau ticket de support
              </h1>

              <!-- Info ticket -->
              <div style="background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%); border-left: 4px solid #ff4757; padding: 24px; margin: 0 0 24px 0; border-radius: 8px;">
                <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Ticket #</p>
                <p style="font-size: 18px; color: #1a1a1a; margin: 0 0 16px 0; font-weight: 700;">${vars.ticketNumber}</p>

                <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Sujet</p>
                <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 16px 0; font-weight: 600;">${vars.ticketSubject}</p>

                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                  <tr>
                    <td style="width: 50%;">
                      <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Type</p>
                      <p style="font-size: 14px; color: #1a1a1a; margin: 0;">${TICKET_TYPE_LABELS[vars.ticketType]}</p>
                    </td>
                    <td style="width: 50%;">
                      <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Priorité</p>
                      ${getPriorityBadge(vars.ticketPriority)}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Info utilisateur -->
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 0 0 24px 0;">
                <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Créé par</p>
                <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 4px 0; font-weight: 600;">${vars.userName}</p>
                <p style="font-size: 14px; color: #666; margin: 0;">${vars.userEmail}</p>
              </div>

              <!-- Bouton action -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${vars.adminDashboardUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 16px rgba(255, 71, 87, 0.3);">
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

/**
 * Template: Nouveau message dans un ticket (notification utilisateur)
 */
export function getNewMessageUserTemplate(vars: TicketEmailVariables): { subject: string; html: string } {
  const subject = `[${vars.ticketNumber}] Nouvelle réponse à votre demande`;

  const html = `
${getEmailHeader()}
          <!-- Contenu principal -->
          <tr>
            <td style="padding: 40px 50px;">
              <!-- Salutation -->
              <p style="font-size: 18px; line-height: 1.6; color: #1a1a1a; margin: 0 0 24px 0;">
                Bonjour <strong>${vars.userName}</strong>,
              </p>

              <!-- Message principal -->
              <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 24px 0;">
                Vous avez reçu une nouvelle réponse concernant votre demande de support.
              </p>

              <!-- Info ticket -->
              <div style="background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%); border-left: 4px solid #ff4757; padding: 24px; margin: 0 0 24px 0; border-radius: 8px;">
                <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Ticket #${vars.ticketNumber}</p>
                <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 16px 0; font-weight: 600;">${vars.ticketSubject}</p>

                <!-- Aperçu du message -->
                <div style="background-color: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e0e0e0;">
                  <p style="font-size: 13px; color: #666; margin: 0 0 8px 0;">
                    <strong>${vars.senderName}</strong> a écrit :
                  </p>
                  <p style="font-size: 15px; color: #1a1a1a; margin: 0; line-height: 1.6;">
                    ${vars.messageContent ? (vars.messageContent.length > 300 ? vars.messageContent.substring(0, 300) + '...' : vars.messageContent) : ''}
                  </p>
                </div>
              </div>

              <!-- Bouton action -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${vars.ticketUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 16px rgba(255, 71, 87, 0.3);">
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

/**
 * Template: Nouveau message dans un ticket (notification admin)
 */
export function getNewMessageAdminTemplate(vars: TicketEmailVariables): { subject: string; html: string } {
  const subject = `[${vars.ticketNumber}] Nouvelle réponse de ${vars.userName}`;

  const html = `
${getEmailHeader()}
          <!-- Contenu principal -->
          <tr>
            <td style="padding: 40px 50px;">
              <!-- Titre -->
              <h1 style="font-size: 24px; color: #1a1a1a; margin: 0 0 24px 0; text-align: center;">
                Nouvelle réponse client
              </h1>

              <!-- Info ticket -->
              <div style="background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%); border-left: 4px solid #ff4757; padding: 24px; margin: 0 0 24px 0; border-radius: 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 16px;">
                  <tr>
                    <td>
                      <p style="font-size: 14px; color: #666; margin: 0 0 4px 0;">Ticket #${vars.ticketNumber}</p>
                      <p style="font-size: 16px; color: #1a1a1a; margin: 0; font-weight: 600;">${vars.ticketSubject}</p>
                    </td>
                    <td style="text-align: right;">
                      ${getPriorityBadge(vars.ticketPriority)}
                    </td>
                  </tr>
                </table>

                <!-- Aperçu du message -->
                <div style="background-color: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e0e0e0;">
                  <p style="font-size: 13px; color: #666; margin: 0 0 8px 0;">
                    <strong>${vars.userName}</strong> (${vars.userEmail}) a écrit :
                  </p>
                  <p style="font-size: 15px; color: #1a1a1a; margin: 0; line-height: 1.6;">
                    ${vars.messageContent ? (vars.messageContent.length > 300 ? vars.messageContent.substring(0, 300) + '...' : vars.messageContent) : ''}
                  </p>
                </div>
              </div>

              <!-- Bouton action -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${vars.adminDashboardUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 16px rgba(255, 71, 87, 0.3);">
                  Répondre au ticket
                </a>
              </div>
            </td>
          </tr>
${getEmailFooter()}
`;

  return { subject, html };
}

/**
 * Template: Changement de statut (notification utilisateur)
 */
export function getStatusChangeUserTemplate(vars: TicketEmailVariables): { subject: string; html: string } {
  const statusLabels: Record<TicketStatus, string> = {
    open: 'Ouvert',
    in_progress: 'En cours de traitement',
    waiting_for_user: 'En attente de votre réponse',
    resolved: 'Résolu',
    closed: 'Fermé',
  };

  const statusMessages: Record<TicketStatus, string> = {
    open: 'Votre ticket a été réouvert.',
    in_progress: 'Votre demande est maintenant en cours de traitement par notre équipe.',
    waiting_for_user: 'Nous attendons des informations supplémentaires de votre part pour continuer le traitement.',
    resolved: 'Votre demande a été traitée et résolue. Si vous avez d\'autres questions, n\'hésitez pas à répondre.',
    closed: 'Votre ticket a été clôturé. Merci de nous avoir contactés.',
  };

  const subject = `[${vars.ticketNumber}] Statut mis à jour : ${statusLabels[vars.ticketStatus!]}`;

  const html = `
${getEmailHeader()}
          <!-- Contenu principal -->
          <tr>
            <td style="padding: 40px 50px;">
              <!-- Salutation -->
              <p style="font-size: 18px; line-height: 1.6; color: #1a1a1a; margin: 0 0 24px 0;">
                Bonjour <strong>${vars.userName}</strong>,
              </p>

              <!-- Message principal -->
              <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 24px 0;">
                Le statut de votre demande de support a été mis à jour.
              </p>

              <!-- Info ticket -->
              <div style="background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%); border-left: 4px solid #ff4757; padding: 24px; margin: 0 0 24px 0; border-radius: 8px;">
                <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Ticket #${vars.ticketNumber}</p>
                <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0; font-weight: 600;">${vars.ticketSubject}</p>

                <!-- Changement de statut -->
                <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                    <tr>
                      <td style="text-align: center; width: 40%;">
                        ${vars.previousStatus ? getStatusBadge(vars.previousStatus) : ''}
                      </td>
                      <td style="text-align: center; width: 20%;">
                        <span style="font-size: 24px; color: #999;">→</span>
                      </td>
                      <td style="text-align: center; width: 40%;">
                        ${getStatusBadge(vars.ticketStatus!)}
                      </td>
                    </tr>
                  </table>
                </div>

                <p style="font-size: 15px; color: #333; margin: 16px 0 0 0; text-align: center; line-height: 1.6;">
                  ${statusMessages[vars.ticketStatus!]}
                </p>
              </div>

              <!-- Bouton action -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${vars.ticketUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 16px rgba(255, 71, 87, 0.3);">
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

/**
 * Template: Confirmation de création de ticket (notification utilisateur)
 */
export function getTicketCreatedUserTemplate(vars: TicketEmailVariables): { subject: string; html: string } {
  const subject = `[${vars.ticketNumber}] Votre demande a bien été enregistrée`;

  const html = `
${getEmailHeader()}
          <!-- Contenu principal -->
          <tr>
            <td style="padding: 40px 50px;">
              <!-- Salutation -->
              <p style="font-size: 18px; line-height: 1.6; color: #1a1a1a; margin: 0 0 24px 0;">
                Bonjour <strong>${vars.userName}</strong>,
              </p>

              <!-- Message principal -->
              <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 8px 0;">
                Merci de nous avoir contactés !
              </p>
              <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 24px 0;">
                Votre demande de support a bien été enregistrée. Notre équipe va l'examiner dans les plus brefs délais.
              </p>

              <!-- Info ticket -->
              <div style="background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%); border-left: 4px solid #ff4757; padding: 24px; margin: 0 0 24px 0; border-radius: 8px;">
                <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Numéro de ticket</p>
                <p style="font-size: 20px; color: #1a1a1a; margin: 0 0 20px 0; font-weight: 700; letter-spacing: 1px;">${vars.ticketNumber}</p>

                <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Sujet</p>
                <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0; font-weight: 600;">${vars.ticketSubject}</p>

                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                  <tr>
                    <td style="width: 50%;">
                      <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Type</p>
                      <p style="font-size: 14px; color: #1a1a1a; margin: 0;">${TICKET_TYPE_LABELS[vars.ticketType]}</p>
                    </td>
                    <td style="width: 50%;">
                      <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Priorité</p>
                      ${getPriorityBadge(vars.ticketPriority)}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Note importante -->
              <div style="background-color: #e3f2fd; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
                <p style="font-size: 14px; color: #1565c0; margin: 0; line-height: 1.6;">
                  <strong>Conservez ce numéro de ticket</strong> pour toute référence future concernant cette demande.
                </p>
              </div>

              <!-- Bouton action -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${vars.ticketUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 16px rgba(255, 71, 87, 0.3);">
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
