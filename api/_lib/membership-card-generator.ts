/**
 * Générateur de carte d'adhérent FORNAP
 *
 * Cette bibliothèque génère l'image PNG de la carte d'adhérent
 * avec le QR code unique de l'utilisateur.
 *
 * Utilisé par:
 * - /api/users/send-membership-card.ts (envoi individuel)
 * - /api/campaigns/send-email.ts (envoi en masse avec pièce jointe)
 */

import * as admin from 'firebase-admin';
import QRCode from 'qrcode';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Pour obtenir le chemin du répertoire actuel en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Chemin vers les ressources (dans api/users/)
const RESOURCES_PATH = join(__dirname, '..', 'users');

/**
 * Données utilisateur nécessaires pour la génération de carte
 */
export interface MembershipCardUserData {
  uid: string;
  firstName: string;
  lastName: string;
  currentMembership: {
    planType: 'monthly' | 'annual' | 'lifetime';
    expiryDate: admin.firestore.Timestamp | Date | string | number | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number } | null;
    planName?: string;
  };
}

/**
 * Génère l'image de la carte d'adhérent avec QR code
 *
 * @param userData - Données de l'utilisateur
 * @returns Buffer PNG de l'image de la carte
 */
export async function generateMembershipCardImage(userData: MembershipCardUserData): Promise<Buffer> {
  try {
    console.log('🎨 Generating card with @napi-rs/canvas + Local AcherusFeral Font...');

    // Enregistrer les polices locales avec GlobalFonts
    const fontBoldPath = join(RESOURCES_PATH, 'AcherusFeral-Bold.otf');
    const fontLightPath = join(RESOURCES_PATH, 'AcherusFeral-Light.otf');

    GlobalFonts.registerFromPath(fontBoldPath, 'AcherusFeral-Bold');
    GlobalFonts.registerFromPath(fontLightPath, 'AcherusFeral-Light');

    console.log('✅ Fonts registered successfully');

    // Charger l'image de fond
    const backgroundImagePath = join(RESOURCES_PATH, 'base-image.png');
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
 * Génère le nom du fichier de la carte d'adhérent
 *
 * @param firstName - Prénom de l'utilisateur
 * @param lastName - Nom de l'utilisateur
 * @returns Nom du fichier PNG
 */
export function getMembershipCardFilename(firstName: string, lastName: string): string {
  return `FOR+NAP-Carte-Membre-${firstName}-${lastName}.png`;
}
