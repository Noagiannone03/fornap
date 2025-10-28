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
