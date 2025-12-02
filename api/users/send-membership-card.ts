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
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { getFirestore, getFieldValue, getTimestamp } from '../_lib/firebase-admin.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Pour obtenir le chemin du répertoire actuel en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
interface MembershipCardEmailData {
  userId: string;
  forceResend?: boolean;
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

// Configuration Nodemailer
function createEmailTransporter() {
  // Configuration SMTP pour FORNAP
  // Utilise les variables d'environnement en priorité, sinon les credentials par défaut
  
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'mail.fornap.fr', // Serveur mail FORNAP
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true pour port 465, false pour port 587 (TLS)
    auth: {
      user: process.env.SMTP_USER || 'no-reply@fornap.fr',
      pass: process.env.SMTP_PASSWORD || 'rU6*suHY_b-ce1Z',
    },
    tls: {
      rejectUnauthorized: false // Accepter les certificats auto-signés si nécessaire
    }
  };

  return nodemailer.createTransport(smtpConfig);
}

/**
 * Génère l'image de la carte d'adhérent avec QR code
 */
async function generateMembershipCardImage(userData: UserData): Promise<Buffer> {
  try {
    // Configuration du canvas avec une résolution Ultra HD (×4 pour qualité maximale)
    const scale = 4;
    const baseWidth = 450;
    const baseHeight = 800;
    const canvas = createCanvas(baseWidth * scale, baseHeight * scale);
    const ctx = canvas.getContext('2d');

    // Activer le lissage de haute qualité
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Charger l'image de fond depuis le fichier PNG
    const backgroundImagePath = join(__dirname, 'base-image.png');
    const backgroundImg = await loadImage(backgroundImagePath);
    ctx.drawImage(backgroundImg, 0, 0, baseWidth * scale, baseHeight * scale);

    // Générer le QR code en haute résolution
    const qrCodeData = `FORNAP-MEMBER:${userData.uid}`;
    const qrBuffer = await QRCode.toBuffer(qrCodeData, {
      width: 190 * scale,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Charger et dessiner le QR code
    const qrImg = await loadImage(qrBuffer);
    const qrSize = 190 * scale;
    const qrX = (baseWidth * scale - qrSize) / 2; // Centré horizontalement
    const qrY = 340 * scale; // Position verticale
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Configuration du texte : pas d'ombre car fond noir
    // Utiliser du blanc pur pour maximum contraste
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    const centerX = (baseWidth * scale) / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // UID avec les 5 premiers caractères en gras pour identification
    const uidPrefix = userData.uid.substring(0, 5);
    const uidSuffix = userData.uid.substring(5);

    // Calculer la largeur pour centrer correctement
    ctx.font = `bold ${20 * scale}px Arial`;
    const prefixWidth = ctx.measureText(uidPrefix).width;
    ctx.font = `${20 * scale}px Arial`;
    const suffixWidth = ctx.measureText(uidSuffix).width;
    const totalWidth = prefixWidth + suffixWidth;

    // Position de départ (centré horizontalement)
    const startX = centerX - (totalWidth / 2);
    let currentX = startX;

    // Dessiner la partie bold (5 premiers caractères) - texte blanc sur fond noir
    ctx.font = `bold ${20 * scale}px Arial`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(uidPrefix, currentX, 575 * scale);
    currentX += prefixWidth;

    // Dessiner la partie normale (reste de l'UID)
    ctx.font = `${20 * scale}px Arial`;
    ctx.fillText(uidSuffix, currentX, 575 * scale);

    // Remettre textAlign à center pour les éléments suivants
    ctx.textAlign = 'center';

    // Type d'abonnement - texte blanc plus gros
    const membershipTypeLabel =
      userData.currentMembership.planType === 'monthly' ? 'membre mensuel' :
      userData.currentMembership.planType === 'annual' ? 'membre annuel' :
      'membre honoraire';

    ctx.font = `bold ${24 * scale}px Arial`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(membershipTypeLabel, centerX, 615 * scale);

    // Date d'expiration
    let expiryText = 'Membre honoraire';
    if (userData.currentMembership.expiryDate) {
      try {
        let expiryDate: Date;

        // Gérer différents formats de date possibles
        if (typeof userData.currentMembership.expiryDate === 'object' &&
            'toDate' in userData.currentMembership.expiryDate &&
            typeof userData.currentMembership.expiryDate.toDate === 'function') {
          // C'est un Timestamp Firestore
          expiryDate = userData.currentMembership.expiryDate.toDate();
        } else if (typeof userData.currentMembership.expiryDate === 'object' &&
                   ('_seconds' in userData.currentMembership.expiryDate || 'seconds' in userData.currentMembership.expiryDate)) {
          // Format sérialisé avec _seconds/_nanoseconds ou seconds/nanoseconds
          const seconds = (userData.currentMembership.expiryDate as any)._seconds || (userData.currentMembership.expiryDate as any).seconds;
          expiryDate = new Date(seconds * 1000);
        } else if (userData.currentMembership.expiryDate instanceof Date) {
          // C'est déjà un objet Date
          expiryDate = userData.currentMembership.expiryDate;
        } else if (typeof userData.currentMembership.expiryDate === 'string') {
          // C'est une chaîne de caractères
          expiryDate = new Date(userData.currentMembership.expiryDate);
        } else if (typeof userData.currentMembership.expiryDate === 'number') {
          // C'est un timestamp en millisecondes
          expiryDate = new Date(userData.currentMembership.expiryDate);
        } else {
          // Format inconnu, on garde le texte par défaut
          console.warn('⚠️ Unknown date format for expiryDate:', userData.currentMembership.expiryDate);
          expiryDate = new Date();
        }

        expiryText = `expire le ${expiryDate.toLocaleDateString('fr-FR')}`;
      } catch (dateError) {
        console.error('❌ Error parsing expiry date:', dateError);
        expiryText = 'Membre honoraire';
      }
    }

    ctx.font = `${22 * scale}px Arial`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(expiryText, centerX, 655 * scale);

    // Nom et Prénom - texte blanc plus gros
    ctx.font = `bold ${26 * scale}px Arial`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${userData.firstName} ${userData.lastName}`, centerX, 700 * scale);

    // Convertir en PNG pour qualité maximale (pas de compression avec perte)
    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error('❌ Error generating membership card image:', error);
    throw new Error('Failed to generate membership card image');
  }
}

/**
 * Envoie l'email avec la carte d'adhérent
 */
async function sendMembershipEmail(userData: UserData, cardImageBuffer: Buffer): Promise<void> {
  try {
    const transporter = createEmailTransporter();

    const mailOptions = {
      from: '"team fornap" <no-reply@fornap.fr>',
      to: userData.email,
      subject: 'Votre carte d\'adhésion FOR+NAP - Social club du Fort Napoléon à la Seyne sur Mer',
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
                      <p style="font-size: 18px; line-height: 1.6; color: #1a1a1a; margin: 0 0 24px 0;">
                        Hello <strong style="color: #000;">${userData.firstName}</strong>,
                      </p>
                      
                      <!-- Message principal -->
                      <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 20px 0;">
                        Merci d'avoir rejoint la communauté FOR+NAP !
                      </p>
                      
                      <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 24px 0;">
                        Voici ta carte d'adhésion à ce projet collectif.
                      </p>
                      
                      <!-- Section principale avec bordure -->
                      <div style="background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%); border-left: 4px solid #ff4757; padding: 24px; margin: 30px 0; border-radius: 8px;">
                        <p style="font-size: 16px; line-height: 1.8; color: #1a1a1a; margin: 0 0 16px 0;">
                          À partir de l'<strong>équinoxe de mars 2026</strong>, le Fort Napoléon s'éveillera et deviendra un <strong>tiers-lieu créatif et culturel</strong> vibrant :
                        </p>
                        
                        <p style="font-size: 15px; line-height: 1.8; color: #333; margin: 0 0 16px 0; font-style: italic;">
                          résidences d'artistes, concerts exaltants, fêtes mémorables, créations audacieuses, ateliers inspirants…
                        </p>
                        
                        <p style="font-size: 16px; line-height: 1.8; color: #1a1a1a; margin: 0;">
                          Un espace pour <strong>vibrer, apprendre, expérimenter et partager</strong> toute l'année.
                        </p>
                      </div>
                      
                      <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 20px 0;">
                        Nous sommes ravis de t'accueillir dans cette aventure.
                      </p>
                      
                      <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 24px 0;">
                        Le projet FOR+NAP s'étend jusqu'en <strong style="color: #000;">2037</strong> : d'ici là, le compte à rebours est lancé.
                      </p>
                      
                      <p style="font-size: 16px; line-height: 1.7; color: #1a1a1a; margin: 0 0 32px 0; font-weight: 500;">
                        Merci d'écrire avec nous les premières pages de cette fabuleuse histoire.
                      </p>
                      
                      <!-- Divider -->
                      <div style="height: 1px; background: linear-gradient(to right, transparent, #ddd, transparent); margin: 32px 0;"></div>
                      
                      <!-- Appel à l'action -->
                      <p style="font-size: 16px; line-height: 1.7; color: #333; margin: 0 0 16px 0;">
                        En attendant, on compte sur toi pour diffuser l'énergie du Fort et faire connaître notre initiative — en particulier :
                      </p>
                      
                      <div style="background-color: #fafafa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="font-size: 15px; line-height: 1.8; color: #1a1a1a; margin: 0 0 12px 0;">
                          <strong style="color: #ff4757;">•</strong> <strong>POP HOP BAZAAR</strong>, les week-ends du 6/7, 13/14 et 20/21 décembre 2025
                        </p>
                        
                        <p style="font-size: 15px; line-height: 1.8; color: #1a1a1a; margin: 0;">
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
      attachments: [
        {
          filename: `FOR+NAP-Carte-Membre-${userData.firstName}-${userData.lastName}.png`,
          content: cardImageBuffer,
          contentType: 'image/png',
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email envoyé avec succès à ${userData.email}`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error('Failed to send membership email');
  }
}

/**
 * Marque dans Firestore que l'email a été envoyé
 */
async function markEmailAsSent(userId: string, isResend: boolean): Promise<void> {
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
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Email status updated for user ${userId} (count: ${newCount})`);
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
  // Méthode autorisée: POST uniquement
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Récupérer l'instance Firestore (initialise Firebase Admin automatiquement)
    const db = getFirestore();

    // Valider le body
    const { userId, forceResend = false } = req.body as MembershipCardEmailData;

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

    // Envoyer l'email
    console.log(`📧 Sending email to ${userData.email}...`);
    await sendMembershipEmail(userData, cardImageBuffer);

    // Marquer comme envoyé dans la base de données
    await markEmailAsSent(userId, forceResend);

    // Succès !
    return res.status(200).json({
      success: true,
      message: 'Membership card email sent successfully',
      userId,
      email: userData.email,
      sentCount: emailStatus.membershipCardSentCount + 1,
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
