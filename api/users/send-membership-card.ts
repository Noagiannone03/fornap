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
    // Configuration du canvas avec les proportions exactes de l'ancienne fonction
    const canvas = createCanvas(450, 800);
    const ctx = canvas.getContext('2d');

    // Charger l'image de fond depuis le fichier PNG
    const backgroundImagePath = join(__dirname, 'base-image.png');
    const backgroundImg = await loadImage(backgroundImagePath);
    ctx.drawImage(backgroundImg, 0, 0, 450, 800);

    // Générer le QR code
    const qrCodeData = `FORNAP-MEMBER:${userData.uid}`;
    const qrBuffer = await QRCode.toBuffer(qrCodeData, {
      width: 190,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Charger et dessiner le QR code
    const qrImg = await loadImage(qrBuffer);
    const qrSize = 190;
    const qrX = (450 - qrSize) / 2; // Centré horizontalement
    const qrY = 340; // Position verticale
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Configuration du texte
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 2;

    // Type d'abonnement
    const membershipTypeLabel = 
      userData.currentMembership.planType === 'monthly' ? 'membre mensuel' :
      userData.currentMembership.planType === 'annual' ? 'membre annuel' :
      'membre honoraire';
    
    ctx.font = 'bold 20px Arial';
    ctx.fillText(membershipTypeLabel, 225, 630);

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
    
    ctx.font = '18px Arial';
    ctx.fillText(expiryText, 225, 660);

    // Nom et Prénom
    ctx.font = 'bold 22px Arial';
    ctx.fillText(`${userData.firstName} ${userData.lastName}`, 225, 700);

    // Convertir en JPG
    return canvas.toBuffer('image/jpeg', { quality: 0.9 });
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
      from: '"FORNAP Festival" <no-reply@fornap.fr>',
      to: userData.email,
      subject: 'Bienvenue au FOR+NAP social club - Fort Napoléon. La Seyne sur Mer',
      html: `
        <div style="max-width: 600px; margin: 0 auto; 
                    font-family: Arial, sans-serif; background: #000; 
                    color: #fff; padding: 30px; border-radius: 15px;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #fff; font-size: 2.5rem; margin: 0;">
              ◆ FOR+NAP ◆
            </h1>
            <p style="color: #ccc; font-size: 1.2rem; margin: 5px 0;">
              social club
            </p>
          </div>
          
          <p style="font-size: 1.1rem; line-height: 1.6;">
            Hello <strong>${userData.firstName}</strong>,
          </p>
          
          <p style="font-size: 1.1rem; line-height: 1.6;">
            Merci d'avoir rejoint la communauté FOR+NAP !
          </p>
          
          <p style="font-size: 1.1rem; line-height: 1.6;">
            Voici ta carte d'adhésion ainsi que ta place pour le festival 4NAP.<br>
            Ce festival est le premier projet de musiques électroniques qui s'insère dans une démarche d'une durée de 12 ans au Fort Napoléon à La Seyne-sur-Mer.
          </p>
          
          <p style="font-size: 1.1rem; line-height: 1.6;">
            Dès mi-septembre, le Fort Napoléon s'éveillera en un tiers lieu créatif et culturel foisonnant, proposant des résidences d'artistes, des concerts exaltants, des fêtes mémorables, des créations audacieuses et des ateliers inspirants. Ce sera un espace où l'on pourra vibrer, apprendre et partager tout au long de l'année.
          </p>
          
          <p style="font-size: 1.1rem; line-height: 1.6;">
            Nous sommes ravis de t'accueillir dans cette nouvelle aventure<br>
            et avons hâte de faire revivre ce lieu unique avec toi.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 1.1rem; line-height: 1.6; margin: 0;">
              En attendant, on compte sur toi pour nous aider à faire connaître notre initiative, en particulier le 4 NAP festival qui se déroulera du 11 au 14 Juillet<br>
              pour <strong>4 soirées, 4 thèmes,</strong><br>
              <strong>1 expérience unique à découvrir sans modération</strong> ;)
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666;">
            <p>◆</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 15px; background: #1a1a1a; border-radius: 8px; border: 1px solid #ff0000;">
            <p style="color: #ff0000; font-weight: bold; font-size: 0.9rem; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
              CE QR CODE EST VOTRE CLE D'ENTREE AU FORT. SANS LUI, L'ACCES VOUS SERA REFUSE.
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `FOR+NAP-Carte-Membre-${userData.firstName}-${userData.lastName}.jpg`,
          content: cardImageBuffer,
          contentType: 'image/jpeg',
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
