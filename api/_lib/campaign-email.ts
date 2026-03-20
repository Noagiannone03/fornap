import { loadCampaignHtmlAdmin } from './firebase-admin.js';

const DEFAULT_FROM_NAME = 'FOR+NAP Social Club';
const DEFAULT_FROM_EMAIL = 'no-reply@fornap.fr';
const DEFAULT_REPLY_TO = 'contact@fornap.fr';

type MergeData = Record<string, string>;

function replaceMergeVariables(template: string, data: MergeData): string {
  let result = template;

  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value || '');
  });

  return result;
}

export async function loadCampaignEmailHtml(
  campaignId: string,
  campaign: any
): Promise<string> {
  let rawHtml = typeof campaign?.content?.html === 'string' ? campaign.content.html : '';

  if (campaign?.content?.htmlInStorage) {
    const chunkedHtml = await loadCampaignHtmlAdmin(campaignId);
    if (chunkedHtml) {
      rawHtml = chunkedHtml;
    }
  }

  return rawHtml;
}

export function buildCampaignMergeData(options: {
  campaignId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  membershipType?: string;
}): MergeData {
  const unsubscribeSubject = encodeURIComponent(`Désinscription mailing ${options.campaignId}`);
  const unsubscribeUrl = `mailto:${DEFAULT_REPLY_TO}?subject=${unsubscribeSubject}`;

  return {
    first_name: options.firstName || '',
    firstName: options.firstName || '',
    last_name: options.lastName || '',
    lastName: options.lastName || '',
    email: options.email || '',
    membership_type: options.membershipType || '',
    membershipType: options.membershipType || '',
    unsubscribe_url: unsubscribeUrl,
    unsubscribeUrl: unsubscribeUrl,
  };
}

export function personalizeCampaignHtml(html: string, mergeData: MergeData): string {
  return replaceMergeVariables(html, mergeData);
}

export function getCampaignFromAddress(campaign: any): string {
  const fromName = String(campaign?.content?.fromName || '').trim() || DEFAULT_FROM_NAME;
  return `"${fromName}" <${DEFAULT_FROM_EMAIL}>`;
}

export function getCampaignReplyTo(campaign: any): string {
  const replyTo = String(campaign?.content?.replyTo || '').trim();
  return replyTo || DEFAULT_REPLY_TO;
}

export function getCampaignMailHeaders(campaignId: string): Record<string, string> {
  const unsubscribeSubject = encodeURIComponent(`Désinscription mailing ${campaignId}`);

  return {
    'X-Campaign-ID': campaignId,
    'List-Unsubscribe': `<mailto:${DEFAULT_REPLY_TO}?subject=${unsubscribeSubject}>`,
    'X-Auto-Response-Suppress': 'All',
  };
}

