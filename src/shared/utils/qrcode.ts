import QRCode from 'qrcode';

/**
 * Format du QR code: FORNAP-MEMBER:{uid}
 */
export const QR_CODE_PREFIX = 'FORNAP-MEMBER:';

/**
 * Génère le contenu du QR code pour un utilisateur
 */
export const generateQRCodeContent = (uid: string): string => {
  return `${QR_CODE_PREFIX}${uid}`;
};

/**
 * Parse le contenu d'un QR code et extrait l'UID de l'utilisateur
 * Retourne null si le format n'est pas valide
 */
export const parseQRCodeContent = (content: string): string | null => {
  if (!content.startsWith(QR_CODE_PREFIX)) {
    return null;
  }

  const uid = content.substring(QR_CODE_PREFIX.length);
  return uid.trim() || null;
};

/**
 * Génère une image QR code en Data URL
 */
export const generateQRCodeDataURL = async (
  uid: string,
  options?: {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }
): Promise<string> => {
  const content = generateQRCodeContent(uid);

  try {
    const dataURL = await QRCode.toDataURL(content, {
      width: options?.width || 300,
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF',
      },
      errorCorrectionLevel: 'H', // Haute correction d'erreur
    });

    return dataURL;
  } catch (error) {
    console.error('Erreur lors de la génération du QR code:', error);
    throw new Error('Impossible de générer le QR code');
  }
};

/**
 * Télécharge le QR code en tant qu'image PNG
 */
export const downloadQRCode = async (
  uid: string,
  firstName: string,
  lastName: string
): Promise<void> => {
  try {
    const dataURL = await generateQRCodeDataURL(uid, { width: 600 });

    // Créer un lien de téléchargement
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `fornap-qrcode-${firstName.toLowerCase()}-${lastName.toLowerCase()}.png`;

    // Déclencher le téléchargement
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Erreur lors du téléchargement du QR code:', error);
    throw new Error('Impossible de télécharger le QR code');
  }
};

/**
 * Interface pour les données de l'utilisateur nécessaires à la génération de la carte
 */
interface MembershipCardUserData {
  uid: string;
  firstName: string;
  lastName: string;
  membershipType: 'monthly' | 'annual' | 'lifetime';
  expiryDate?: Date | null;
}

/**
 * Charge une police de façon async
 */
const loadFont = async (fontName: string, fontUrl: string): Promise<void> => {
  try {
    const font = new FontFace(fontName, `url(${fontUrl})`);
    await font.load();
    document.fonts.add(font);
  } catch (error) {
    console.warn(`Impossible de charger la police ${fontName}:`, error);
  }
};

/**
 * Charge une image de façon async
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Impossible de charger l'image: ${src}`));
    img.src = src;
  });
};

/**
 * Génère et télécharge la carte d'adhérent complète (comme celle envoyée par email)
 */
export const downloadMembershipCard = async (
  userData: MembershipCardUserData
): Promise<void> => {
  try {
    // Charger les polices AcherusFeral
    await Promise.all([
      loadFont('AcherusFeral-Bold', '/fonts/AcherusFeral-Bold.otf'),
      loadFont('AcherusFeral-Light', '/fonts/AcherusFeral-Light.otf'),
    ]);

    // Charger l'image de fond
    const backgroundImage = await loadImage('/membership-card-base.png');

    // Générer le QR code
    const qrCodeDataURL = await generateQRCodeDataURL(userData.uid, {
      width: 380,
      margin: 1,
    });
    const qrImage = await loadImage(qrCodeDataURL);

    // Type d'abonnement
    const membershipTypeLabel =
      userData.membershipType === 'monthly' ? 'membre mensuel' :
        userData.membershipType === 'annual' ? 'membre annuel' :
          'membre honoraire';

    // Date d'expiration
    let expiryText = 'expire le 31/12/25';
    if (userData.expiryDate) {
      expiryText = `expire le ${userData.expiryDate.toLocaleDateString('fr-FR')}`;
    }

    const fullName = `${userData.firstName} ${userData.lastName}`;

    // Code membre (7 premiers caractères de l'UID en majuscules)
    const memberCode = userData.uid.substring(0, 7).toUpperCase();

    // Créer le canvas
    const canvas = document.createElement('canvas');
    canvas.width = 450;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Impossible de créer le contexte canvas');
    }

    // Activer l'antialiasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

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
    ctx.font = '300 17px "AcherusFeral-Light", Arial, sans-serif';
    ctx.fillText('CODE :', 225, 595);

    // Ligne 2: Code membre (Bold, 17px)
    ctx.font = '700 17px "AcherusFeral-Bold", Arial, sans-serif';
    ctx.fillText(memberCode, 225, 620);

    // Ligne 3: Type d'abonnement (Bold, 17px)
    ctx.font = '700 17px "AcherusFeral-Bold", Arial, sans-serif';
    ctx.fillText(membershipTypeLabel, 225, 645);

    // Ligne 4: Date d'expiration (Light, 15px)
    ctx.font = '300 15px "AcherusFeral-Light", Arial, sans-serif';
    ctx.fillText(expiryText, 225, 670);

    // Ligne 5: Nom complet (Bold, 19px)
    ctx.font = '700 19px "AcherusFeral-Bold", Arial, sans-serif';
    ctx.fillText(fullName, 225, 700);

    // Convertir en Data URL et télécharger
    const dataURL = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `FOR+NAP-Carte-Membre-${userData.firstName}-${userData.lastName}.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Erreur lors de la génération de la carte d\'adhérent:', error);
    throw new Error('Impossible de générer la carte d\'adhérent');
  }
};

/**
 * Valide si une chaîne correspond au format de QR code Fornap
 */
export const isValidQRCodeContent = (content: string): boolean => {
  return content.startsWith(QR_CODE_PREFIX) && content.length > QR_CODE_PREFIX.length;
};

/**
 * Extrait l'UID d'un QR code scanné depuis une image
 */
export const readQRCodeFromImage = async (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      const img = new Image();

      img.onload = async () => {
        try {
          // Créer un canvas pour traiter l'image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(null);
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          // Utiliser jsQR pour lire le QR code
          const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Importer jsQR dynamiquement
          const jsQR = (await import('jsqr')).default;
          const code = jsQR(imageDataObj.data, canvas.width, canvas.height);

          if (code && code.data) {
            const uid = parseQRCodeContent(code.data);
            resolve(uid);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('Erreur lors de la lecture du QR code:', error);
          resolve(null);
        }
      };

      img.onerror = () => {
        resolve(null);
      };

      img.src = imageData;
    };

    reader.onerror = () => {
      resolve(null);
    };

    reader.readAsDataURL(file);
  });
};
