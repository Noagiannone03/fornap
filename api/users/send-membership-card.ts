/**
 * API Serverless Vercel pour générer et envoyer la carte d'adhérent FORNAP
 * 
 * Cette fonction:
 * 1. Récupère les données de l'utilisateur depuis Firestore
 * 2. Génère un QR code unique basé sur l'UID
 * 3. Crée une image de carte d'adhérent avec Canvas
 * 4. Envoie l'email avec la carte en pièce jointe via Nodemailer
 * 5. Marque dans la base de données que l'email a été envoyé
 * 
 * Endpoint: POST /api/users/send-membership-card
 * Body: { userId: string, forceResend?: boolean }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import QRCode from 'qrcode';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { getFirestore, getFieldValue } from '../_lib/firebase-admin.js';
import { sendEmailWithFallback, type EmailSendResult } from '../_lib/email-transport.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Pour obtenir le chemin du répertoire actuel en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
interface MembershipCardEmailData {
  userId: string;
  forceResend?: boolean;
  includeExordeHeader?: boolean;
}

interface UserData {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  currentMembership: {
    planType: 'monthly' | 'annual' | 'lifetime';
    expiryDate: admin.firestore.Timestamp | Date | string | number | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number } | null;
    planName: string;
  };
  emailStatus?: {
    membershipCardSent: boolean;
    membershipCardSentAt: admin.firestore.Timestamp | null;
    membershipCardSentCount: number;
  };
}


/**
 * Génère l'image de la carte d'adhérent avec QR code - VERSION @napi-rs/canvas
 */
async function generateMembershipCardImage(userData: UserData): Promise<Buffer> {
  try {
    console.log('🎨 Generating card with @napi-rs/canvas + Local AcherusFeral Font...');

    // Enregistrer les polices locales avec GlobalFonts
    const fontBoldPath = join(__dirname, 'AcherusFeral-Bold.otf');
    const fontLightPath = join(__dirname, 'AcherusFeral-Light.otf');

    GlobalFonts.registerFromPath(fontBoldPath, 'AcherusFeral-Bold');
    GlobalFonts.registerFromPath(fontLightPath, 'AcherusFeral-Light');

    console.log('✅ Fonts registered successfully');

    // Charger l'image de fond
    const backgroundImagePath = join(__dirname, 'base-image.png');
    const backgroundImage = await loadImage(backgroundImagePath);

    // Générer le QR code en haute résolution
    const qrCodeData = `FORNAP-MEMBER:${userData.uid}`;
    const qrDataUrl = await QRCode.toDataURL(qrCodeData, {
      width: 380, // Double résolution pour meilleure qualité
      margin: 1,
      errorCorrectionLevel: 'H', // Niveau de correction d'erreur élevé
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    const qrImage = await loadImage(qrDataUrl);

    // Type d'abonnement
    const membershipTypeLabel =
      userData.currentMembership?.planType === 'monthly' ? 'membre mensuel' :
      userData.currentMembership?.planType === 'annual' ? 'membre annuel' :
      'membre honoraire';

    // Date d'expiration
    let expiryText = 'expire le 31/12/25';
    if (userData.currentMembership?.expiryDate) {
      try {
        let expiryDate: Date;
        if (typeof userData.currentMembership.expiryDate === 'object' &&
            'toDate' in userData.currentMembership.expiryDate &&
            typeof userData.currentMembership.expiryDate.toDate === 'function') {
          expiryDate = userData.currentMembership.expiryDate.toDate();
        } else if (typeof userData.currentMembership.expiryDate === 'object' &&
                   ('_seconds' in userData.currentMembership.expiryDate || 'seconds' in userData.currentMembership.expiryDate)) {
          const seconds = (userData.currentMembership.expiryDate as any)._seconds || (userData.currentMembership.expiryDate as any).seconds;
          expiryDate = new Date(seconds * 1000);
        } else if (userData.currentMembership.expiryDate instanceof Date) {
          expiryDate = userData.currentMembership.expiryDate;
        } else if (typeof userData.currentMembership.expiryDate === 'string') {
          expiryDate = new Date(userData.currentMembership.expiryDate);
        } else if (typeof userData.currentMembership.expiryDate === 'number') {
          expiryDate = new Date(userData.currentMembership.expiryDate);
        } else {
          expiryDate = new Date();
        }
        expiryText = `expire le ${expiryDate.toLocaleDateString('fr-FR')}`;
      } catch (dateError) {
        console.error('❌ Error parsing expiry date:', dateError);
      }
    }

    const fullName = `${userData.firstName} ${userData.lastName}`;

    // Code membre (7 premiers caractères de l'UID en majuscules)
    const memberCode = userData.uid.substring(0, 7).toUpperCase();

    console.log('  - memberCode:', memberCode);
    console.log('  - membershipType:', membershipTypeLabel);
    console.log('  - expiryText:', expiryText);
    console.log('  - fullName:', fullName);

    // Créer le canvas
    const canvas = createCanvas(450, 800);
    const ctx = canvas.getContext('2d');

    // Activer l'antialiasing pour un meilleur rendu
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Ces options existent selon le backend canvas disponible sur Vercel,
    // mais elles ne sont pas déclarées dans le type SKRSContext2D.
    const advancedCtx = ctx as typeof ctx & {
      textDrawingMode?: 'glyph' | 'path';
      quality?: 'fast' | 'good' | 'best' | 'nearest' | 'bilinear';
    };
    advancedCtx.textDrawingMode = 'glyph';
    advancedCtx.quality = 'best';

    // Dessiner l'image de fond
    ctx.drawImage(backgroundImage, 0, 0, 450, 800);

    // Dessiner le QR code
    ctx.drawImage(qrImage, 130, 340, 190, 190);

    // Ajouter une ombre pour le texte
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    // Configurer le texte
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';

    // Ligne 1: "CODE :" (Light, 17px)
    ctx.font = '300 17px "AcherusFeral-Light"';
    ctx.fillText('CODE :', 225, 595);

    // Ligne 2: Code membre (Bold, 17px) - Même taille que le type d'abonnement
    ctx.font = '700 17px "AcherusFeral-Bold"';
    ctx.fillText(memberCode, 225, 620);

    // Ligne 3: Type d'abonnement (Bold, 17px)
    ctx.font = '700 17px "AcherusFeral-Bold"';
    ctx.fillText(membershipTypeLabel, 225, 645);

    // Ligne 4: Date d'expiration (Light, 15px)
    ctx.font = '300 15px "AcherusFeral-Light"';
    ctx.fillText(expiryText, 225, 670);

    // Ligne 5: Nom complet (Bold, 19px)
    ctx.font = '700 19px "AcherusFeral-Bold"';
    ctx.fillText(fullName, 225, 700);

    // Convertir en buffer PNG (sans perte, meilleure qualité)
    const buffer = canvas.toBuffer('image/png');

    console.log('✅ Card generated successfully with @napi-rs/canvas (PNG format)');
    return buffer;
  } catch (error) {
    console.error('❌ Error generating membership card image:', error);
    throw new Error('Failed to generate membership card image');
  }
}

/**
 * Envoie l'email avec la carte d'adhérent (avec fallback automatique sur Brevo)
 */
async function sendMembershipEmail(userData: UserData, cardImageBuffer: Buffer, includeExordeHeader: boolean = false): Promise<EmailSendResult> {
  // Générer le contenu de l'entête EXORDE si nécessaire
  const exordeHeaderHtml = includeExordeHeader ? `
    <!-- Message intro EXORDE -->
    <div style="background-color: #fafafa; border-left: 4px solid #ff4757; padding: 20px; margin: 0 0 32px 0; border-radius: 8px;">
      <p style="font-size: 15px; line-height: 1.7; color: #1a1a1a; margin: 0 0 12px 0; text-align: center;">
        <strong>Bonjour,</strong>
      </p>
      <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 12px 0; text-align: center;">
        Si tu reçois ce mail, c'est que tu es venu.e à <strong style="color: #ff4757;">EXORDE</strong><br/>
        le <strong>31 Décembre 2024</strong> au Fort Napoléon à la Seyne sur Mer.
      </p>
      <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0; text-align: center;">
        Nous avons enfin édité la carte d'adhésion<br/>
        pour le lieu que nous nous apprêtons à ouvrir.
      </p>
    </div>
  ` : '';

  const emailHtml = `
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

                      ${exordeHeaderHtml}

                      <!-- Salutation -->
                      <p style="font-size: 18px; line-height: 1.6; color: #1a1a1a; margin: 0 0 24px 0; text-align: center;">
                        Hello <strong style="color: #000;">${userData.firstName}</strong>,
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
  `;

  // Envoyer l'email avec fallback automatique
  const result = await sendEmailWithFallback({
    to: userData.email,
    subject: 'Votre carte d\'adhésion FOR+NAP - Social club du Fort Napoléon à la Seyne sur Mer',
    html: emailHtml,
    from: '"team fornap" <no-reply@fornap.fr>',
    attachments: [
      {
        filename: `FOR+NAP-Carte-Membre-${userData.firstName}-${userData.lastName}.png`,
        content: cardImageBuffer,
        contentType: 'image/png',
      },
    ],
  });

  if (!result.success) {
    console.error('❌ Error sending email:', result.error);
    throw new Error(`Failed to send membership email: ${result.error}`);
  }

  console.log(`✅ Email envoyé avec succès à ${userData.email} via ${result.provider}${result.fallbackUsed ? ' (fallback)' : ''}`);
  return result;
}

/**
 * Marque dans Firestore que l'email a été envoyé
 */
async function markEmailAsSent(userId: string, isResend: boolean, emailResult: EmailSendResult): Promise<void> {
  try {
    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error('User not found in Firestore');
    }

    const currentEmailStatus = userDoc.data()?.emailStatus || {
      membershipCardSent: false,
      membershipCardSentAt: null,
      membershipCardSentCount: 0,
    };

    const newCount = isResend ? currentEmailStatus.membershipCardSentCount + 1 : 1;

    // Utiliser la fonction helper getFieldValue() pour obtenir FieldValue
    const FieldValue = getFieldValue();

    await userRef.update({
      'emailStatus.membershipCardSent': true,
      'emailStatus.membershipCardSentAt': FieldValue.serverTimestamp(),
      'emailStatus.membershipCardSentCount': newCount,
      'emailStatus.lastProvider': emailResult.provider,
      'emailStatus.lastFallbackUsed': emailResult.fallbackUsed,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Email status updated for user ${userId} (count: ${newCount}, provider: ${emailResult.provider})`);
  } catch (error) {
    console.error('❌ Error marking email as sent:', error);
    console.error('Error details:', error);
    throw new Error('Failed to update email status in database');
  }
}

/**
 * Handler principal de l'API
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Gérer les requêtes CORS preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 heures
    return res.status(200).end();
  }

  // Ajouter les headers CORS pour toutes les requêtes
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Méthode autorisée: POST uniquement
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Récupérer l'instance Firestore (initialise Firebase Admin automatiquement)
    const db = getFirestore();

    // Valider le body
    const { userId, forceResend = false, includeExordeHeader = false } = req.body as MembershipCardEmailData;

    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing userId in request body',
        success: false,
      });
    }

    // Récupérer les données de l'utilisateur
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ 
        error: 'User not found',
        success: false,
      });
    }

    const userData = userDoc.data() as UserData;
    userData.uid = userId;

    // Vérifier si l'email a déjà été envoyé
    const emailStatus = userData.emailStatus || {
      membershipCardSent: false,
      membershipCardSentAt: null,
      membershipCardSentCount: 0,
    };

    if (emailStatus.membershipCardSent && !forceResend) {
      console.log(`⚠️ Email already sent for user ${userId}. Use forceResend=true to resend.`);
      return res.status(200).json({
        success: false,
        message: 'Email already sent. Use forceResend=true to resend.',
        alreadySent: true,
        sentAt: emailStatus.membershipCardSentAt,
        sentCount: emailStatus.membershipCardSentCount,
      });
    }

    // Générer la carte d'adhérent
    console.log(`📝 Generating membership card for ${userData.firstName} ${userData.lastName}...`);
    const cardImageBuffer = await generateMembershipCardImage(userData);

    // Envoyer l'email (avec fallback automatique sur Brevo si FORNAP échoue)
    console.log(`📧 Sending email to ${userData.email}...`);
    const emailResult = await sendMembershipEmail(userData, cardImageBuffer, includeExordeHeader);

    // Marquer comme envoyé dans la base de données (avec info provider)
    await markEmailAsSent(userId, forceResend, emailResult);

    // Succès !
    return res.status(200).json({
      success: true,
      message: 'Membership card email sent successfully',
      userId,
      email: userData.email,
      sentCount: emailStatus.membershipCardSentCount + 1,
      provider: emailResult.provider,
      fallbackUsed: emailResult.fallbackUsed,
    });

  } catch (error: any) {
    console.error('❌ Error in send-membership-card API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      success: false,
      details: error.message,
    });
  }
}
