/**
 * Templates d'emails prédéfinis pour les campagnes
 * Chaque template contient le sujet, le preheader et le HTML complet
 */

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: 'membership' | 'error' | 'event' | 'newsletter' | 'custom';
  subject: string;
  preheader?: string;
  html: string;
  variables?: string[]; // Variables disponibles dans le template
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'membership_card',
    name: 'Carte d\'adhésion FOR+NAP',
    description: 'Email d\'envoi de la carte d\'adhésion avec QR code',
    category: 'membership',
    subject: 'Votre carte d\'adhésion FOR+NAP - Social club du Fort Napoléon à la Seyne sur Mer',
    preheader: 'Bienvenue dans la communauté FOR+NAP',
    variables: ['firstName', 'lastName', 'email'],
    html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carte d'adhésion FOR+NAP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">

        <!-- Container principal -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden; max-width: 600px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 50px 40px 30px 40px;">
              <img src="https://www.fornap.fr/assets/logo-etendu-fornap-CnmtvHyt.png" alt="FOR+NAP" style="width: 280px; height: auto; display: block; margin: 0 auto;" />
            </td>
          </tr>

          <!-- Contenu principal -->
          <tr>
            <td style="padding: 20px 50px 40px 50px;">

              <!-- Salutation -->
              <p style="font-size: 18px; line-height: 1.6; color: #1a1a1a; margin: 0 0 24px 0; text-align: center;">
                Hello <strong style="color: #000;">{{firstName}}</strong>,
              </p>

              <!-- Message principal -->
              <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 20px 0; text-align: center;">
                Merci d'avoir rejoint la communauté FOR+NAP !
              </p>

              <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 24px 0; text-align: center;">
                Voici ta carte d'adhésion à ce projet collectif.
              </p>

              <!-- Section principale avec bordure -->
              <div style="background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%); border-left: 4px solid #ff4757; padding: 24px; margin: 30px 0; border-radius: 8px;">
                <p style="font-size: 16px; line-height: 1.8; color: #1a1a1a; margin: 0 0 16px 0; text-align: center;">
                  À partir de l'<strong>équinoxe de mars 2026</strong>, le Fort Napoléon s'éveillera et deviendra un <strong>tiers-lieu créatif et culturel</strong> vibrant :
                </p>

                <p style="font-size: 15px; line-height: 1.8; color: #333; margin: 0 0 16px 0; font-style: italic; text-align: center;">
                  résidences d'artistes, concerts exaltants, fêtes mémorables, créations audacieuses, ateliers inspirants…
                </p>

                <p style="font-size: 16px; line-height: 1.8; color: #1a1a1a; margin: 0; text-align: center;">
                  Un espace pour <strong>vibrer, apprendre, expérimenter et partager</strong> toute l'année.
                </p>
              </div>

              <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 20px 0; text-align: center;">
                Nous sommes ravis de t'accueillir dans cette aventure.
              </p>

              <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 24px 0; text-align: center;">
                Le projet FOR+NAP s'étend jusqu'en <strong style="color: #000;">2037</strong> : d'ici là, le compte à rebours est lancé.
              </p>

              <p style="font-size: 16px; line-height: 1.7; color: #1a1a1a; margin: 0 0 32px 0; font-weight: 500; text-align: center;">
                Merci d'écrire avec nous les premières pages de cette fabuleuse histoire.
              </p>

              <!-- Divider -->
              <div style="height: 1px; background: linear-gradient(to right, transparent, #ddd, transparent); margin: 32px 0;"></div>

              <!-- Appel à l'action -->
              <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 16px 0; text-align: center;">
                En attendant, on compte sur toi pour diffuser l'énergie du Fort et faire connaître notre initiative — en particulier :
              </p>

              <div style="background-color: #fafafa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="font-size: 15px; line-height: 1.8; color: #1a1a1a; margin: 0 0 12px 0; text-align: center;">
                  <strong style="color: #ff4757;">•</strong> <strong>POP HOP BAZAAR</strong>, les week-ends du 6/7, 13/14 et 20/21 décembre 2025
                </p>

                <p style="font-size: 15px; line-height: 1.8; color: #1a1a1a; margin: 0; text-align: center;">
                  <strong style="color: #ff4757;">•</strong> Le <strong>CROWDFUNDING</strong>, ouvert jusqu'au 31 décembre, qui culminera lors d'<strong>INKIPIT</strong>, la grande soirée privée où nous célébrerons ensemble le passage à la nouvelle année.
                </p>
              </div>

              <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 24px 0 16px 0; text-align: center;">
                Toutes les infos sont ici : <a href="https://www.fornap.fr" style="color: #ff4757; text-decoration: none; font-weight: 600;">www.fornap.fr</a>
              </p>

              <!-- Citations inspirantes -->
              <div style="text-align: center; margin: 32px 0;">
                <p style="font-size: 15px; line-height: 1.6; color: #666; margin: 0 0 8px 0; font-style: italic;">
                  Découvre sans modération.
                </p>
                <p style="font-size: 15px; line-height: 1.6; color: #666; margin: 0 0 8px 0; font-style: italic;">
                  Reste curieux.
                </p>
                <p style="font-size: 15px; line-height: 1.6; color: #666; margin: 0 0 16px 0; font-style: italic;">
                  Sois vivant.
                </p>
                <p style="font-size: 24px; margin: 0;">🩷</p>
              </div>

            </td>
          </tr>

          <!-- Avertissement important -->
          <tr>
            <td style="padding: 0 50px 50px 50px;">
              <div style="background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%); border-radius: 12px; padding: 28px; text-align: center; box-shadow: 0 4px 16px rgba(255, 71, 87, 0.3);">
                <p style="font-size: 13px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1.5px;">
                  ⚠️ Important
                </p>
                <p style="font-size: 15px; font-weight: 600; color: #ffffff; line-height: 1.6; margin: 0;">
                  Ta carte d'adhésion en pièce jointe est ta <strong>clé d'entrée au Fort</strong>.<br/>
                  Sans elle, l'accès te sera refusé.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 30px; text-align: center;">
              <p style="font-size: 13px; color: #999; margin: 0 0 8px 0;">
                FOR+NAP Social Club
              </p>
              <p style="font-size: 12px; color: #666; margin: 0;">
                Fort Napoléon, La Seyne-sur-Mer
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
    `,
  },
  {
    id: 'error_invalid_card',
    name: 'Erreur - Carte invalide',
    description: 'Email informant d\'une erreur dans l\'envoi des cartes et de leur désactivation',
    category: 'error',
    subject: 'Oups, nous avons fait une erreur - Informations importantes',
    preheader: 'Veuillez ignorer le précédent email - Une nouvelle carte vous sera envoyée',
    variables: [],
    html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Correction - Carte d'adhésion FOR+NAP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">

        <!-- Container principal -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden; max-width: 600px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 50px 40px 30px 40px;">
              <img src="https://www.fornap.fr/assets/logo-etendu-fornap-CnmtvHyt.png" alt="FOR+NAP" style="width: 280px; height: auto; display: block; margin: 0 auto;" />
            </td>
          </tr>

          <!-- Contenu principal -->
          <tr>
            <td style="padding: 20px 50px 40px 50px;">

              <!-- Salutation -->
              <p style="font-size: 18px; line-height: 1.6; color: #1a1a1a; margin: 0 0 24px 0; text-align: center;">
                Bonjour,
              </p>

              <!-- Message d'erreur principal -->
              <div style="background: linear-gradient(135deg, #fff8f8 0%, #fff0f0 100%); border-left: 4px solid #ff4757; padding: 28px; margin: 30px 0; border-radius: 12px; box-shadow: 0 2px 8px rgba(255, 71, 87, 0.1);">
                <p style="font-size: 16px; line-height: 1.8; color: #2c2c2c; margin: 0 0 16px 0; text-align: center;">
                  Nous sommes en train de faire des essais avec notre base de données.
                </p>

                <p style="font-size: 16px; line-height: 1.8; color: #2c2c2c; margin: 0 0 16px 0; text-align: center;">
                  <strong style="color: #ff4757;">Vous avez reçu par erreur un mail</strong> vous attribuant une carte avec un QR code d'accès au fort.
                </p>

                <p style="font-size: 17px; line-height: 1.8; color: #e74c3c; margin: 0; text-align: center; font-weight: 700;">
                  ⚠️ Toutes les cartes éditées dans ce mail ont été désactivées.
                </p>
              </div>

              <!-- Pas de panique -->
              <div style="background: linear-gradient(135deg, #f0f9f4 0%, #e8f5ed 100%); border-left: 4px solid #27ae60; padding: 28px; border-radius: 12px; margin: 30px 0; box-shadow: 0 2px 8px rgba(39, 174, 96, 0.1);">
                <p style="font-size: 20px; line-height: 1.8; color: #1a1a1a; margin: 0 0 20px 0; text-align: center; font-weight: 700;">
                  Pas de panique 👌
                </p>

                <p style="font-size: 16px; line-height: 1.8; color: #2c2c2c; margin: 0 0 16px 0; text-align: center;">
                  Si vous avez bien renseigné vos coordonnées lors de l'événement <strong>EXORDE du 31 Décembre 2024</strong> au Fort Napoléon à la Seyne sur Mer,
                </p>

                <p style="font-size: 17px; line-height: 1.8; color: #27ae60; margin: 0 0 16px 0; text-align: center; font-weight: 700;">
                  ✅ vous allez recevoir un nouvel email avec votre carte d'adhésion et le bon QR CODE.
                </p>

                <p style="font-size: 15px; line-height: 1.8; color: #555; margin: 0; text-align: center; font-style: italic;">
                  Cette nouvelle carte doit remplacer celle envoyée par erreur.
                </p>
              </div>

              <!-- Divider -->
              <div style="height: 1px; background: linear-gradient(to right, transparent, #ddd, transparent); margin: 32px 0;"></div>

              <!-- Contact -->
              <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 16px 0; text-align: center;">
                Si vous ne recevez rien d'ici la <strong>fin de la semaine</strong>,<br/>
                voici un numéro pour nous joindre :
              </p>

              <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px solid #dee2e6; padding: 24px; border-radius: 12px; margin: 20px 0; text-align: center;">
                <p style="font-size: 22px; line-height: 1.8; color: #1a1a1a; margin: 0; font-weight: 700;">
                  📞 <a href="tel:0627611910" style="color: #ff4757; text-decoration: none;">06 27 61 19 10</a>
                </p>
              </div>

              <!-- Remerciement -->
              <p style="font-size: 16px; line-height: 1.7; color: #1a1a1a; margin: 32px 0 0 0; font-weight: 500; text-align: center;">
                Merci pour votre collaboration
              </p>

              <p style="font-size: 16px; line-height: 1.7; color: #666; margin: 8px 0 0 0; text-align: center;">
                L'équipe NO/ID
              </p>

            </td>
          </tr>

          <!-- Avertissement important -->
          <tr>
            <td style="padding: 0 50px 50px 50px;">
              <div style="background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%); border-radius: 12px; padding: 28px; text-align: center; box-shadow: 0 4px 16px rgba(255, 71, 87, 0.3);">
                <p style="font-size: 13px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1.5px;">
                  ⚠️ Important
                </p>
                <p style="font-size: 15px; font-weight: 600; color: #ffffff; line-height: 1.6; margin: 0;">
                  N'utilisez pas la carte précédemment reçue.<br/>
                  Seule la nouvelle carte sera valide pour l'accès au Fort.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 30px; text-align: center;">
              <p style="font-size: 13px; color: #999; margin: 0 0 8px 0;">
                FOR+NAP Social Club
              </p>
              <p style="font-size: 12px; color: #666; margin: 0;">
                Fort Napoléon, La Seyne-sur-Mer
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
    `,
  },
];

/**
 * Récupère un template par son ID
 */
export function getTemplateById(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find(t => t.id === id);
}

/**
 * Récupère tous les templates d'une catégorie
 */
export function getTemplatesByCategory(category: EmailTemplate['category']): EmailTemplate[] {
  return EMAIL_TEMPLATES.filter(t => t.category === category);
}

/**
 * Remplace les variables dans le HTML d'un template
 */
export function replaceTemplateVariables(html: string, variables: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}
