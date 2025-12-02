import { db, auth } from '../../shared/config/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export interface CsvRow {
  horodateur?: string;
  initiateur?: string;
  nom: string;
  prenom: string;
  dateNaissance?: string;
  codePostal?: string;
  email: string;
  telephone?: string;
  engagements?: string;
  envoiBilleterie?: string;
  regle?: string;
  homme?: string;
  femme?: string;
}

export interface ImportResult {
  success: number;
  errors: Array<{ row: number; email: string; error: string }>;
  skipped: number;
}

/**
 * Parse une ligne CSV et mappe les colonnes aux champs attendus
 */
function parseCsvRow(headers: string[], values: string[], isFirstRow: boolean = false): CsvRow | null {
  const row: any = {};

  headers.forEach((header, index) => {
    const value = values[index]?.trim();
    const lowerHeader = header.toLowerCase();

    // Mapping des colonnes
    if (lowerHeader.includes('nom') && !lowerHeader.includes('prénom')) {
      row.nom = value;
      if (isFirstRow) console.log(`✓ Nom trouvé dans colonne "${header}"`);
    } else if (lowerHeader.includes('prénom')) {
      row.prenom = value;
      if (isFirstRow) console.log(`✓ Prénom trouvé dans colonne "${header}"`);
    } else if (lowerHeader.includes('email') || lowerHeader.includes('e-mail') || lowerHeader.includes('mail')) {
      row.email = value;
      if (isFirstRow) console.log(`✓ Email trouvé dans colonne "${header}"`);
    } else if (lowerHeader.includes('téléphone') || lowerHeader.includes('telephone') || lowerHeader.includes('phone') || lowerHeader.includes('numéro')) {
      row.telephone = value;
      if (isFirstRow) console.log(`✓ Téléphone trouvé dans colonne "${header}"`);
    } else if (lowerHeader.includes('naissance') || lowerHeader.includes('date de naissance')) {
      row.dateNaissance = value;
      if (isFirstRow) console.log(`✓ Date de naissance trouvée dans colonne "${header}"`);
    } else if (lowerHeader.includes('code postal') || lowerHeader.includes('postal') || lowerHeader.includes('zip')) {
      row.codePostal = value;
      if (isFirstRow) console.log(`✓ Code postal trouvé dans colonne "${header}"`);
    } else if (lowerHeader.includes('horodateur') || lowerHeader.includes('timestamp')) {
      row.horodateur = value;
      if (isFirstRow) console.log(`✓ Horodateur trouvé dans colonne "${header}"`);
    } else if (lowerHeader.includes('initié')) {
      row.initiateur = value;
      if (isFirstRow) console.log(`✓ Initiateur trouvé dans colonne "${header}"`);
    } else if (lowerHeader === 'homme') {
      row.homme = value;
      if (isFirstRow) console.log(`✓ Homme trouvé dans colonne "${header}"`);
    } else if (lowerHeader === 'femme') {
      row.femme = value;
      if (isFirstRow) console.log(`✓ Femme trouvé dans colonne "${header}"`);
    }
  });

  // Validation minimale: nom, prénom et email sont requis
  if (!row.nom || !row.prenom || !row.email) {
    if (isFirstRow) {
      console.log('❌ Ligne rejetée - Champs manquants:', {
        nom: row.nom ? '✓' : '✗',
        prenom: row.prenom ? '✓' : '✗',
        email: row.email ? '✓' : '✗',
      });
    }
    return null;
  }

  return row as CsvRow;
}

/**
 * Parse une date au format français (DD/MM/YYYY ou D/M/YYYY)
 */
function parseFrenchDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;

  try {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.error('Error parsing date:', dateStr, e);
  }

  return undefined;
}

/**
 * Parse l'horodateur au format américain (MM/DD/YYYY HH:MM:SS)
 * Exemple: "12/29/2024 4:15:12"
 */
function parseHorodateur(horodateurStr: string): Timestamp | null {
  if (!horodateurStr) return null;

  try {
    // Format: MM/DD/YYYY HH:MM:SS
    const [datePart, timePart] = horodateurStr.split(' ');

    if (!datePart) return null;

    const [month, day, year] = datePart.split('/');

    if (!month || !day || !year) return null;

    // Créer la date
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1, // Les mois commencent à 0 en JavaScript
      parseInt(day)
    );

    // Ajouter l'heure si présente
    if (timePart) {
      const [hours, minutes, seconds] = timePart.split(':');
      if (hours) date.setHours(parseInt(hours));
      if (minutes) date.setMinutes(parseInt(minutes));
      if (seconds) date.setSeconds(parseInt(seconds));
    }

    return Timestamp.fromDate(date);
  } catch (e) {
    console.error('Error parsing horodateur:', horodateurStr, e);
    return null;
  }
}

/**
 * Génère un mot de passe aléatoire pour l'utilisateur
 */
function generateRandomPassword(): string {
  return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + '!@#';
}

/**
 * Crée un utilisateur dans Firebase Auth et Firestore depuis les données CSV
 */
async function createUserFromCsv(row: CsvRow, adminUserId: string): Promise<void> {
  const email = row.email.toLowerCase().trim();
  const password = generateRandomPassword();

  // Créer l'utilisateur dans Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;

  // Préparer les données utilisateur
  // Utiliser l'horodateur du CSV s'il existe, sinon utiliser la date actuelle
  const creationTimestamp = row.horodateur ? parseHorodateur(row.horodateur) : null;
  const createdAt = creationTimestamp || Timestamp.now();

  const dateOfBirth = row.dateNaissance ? parseFrenchDate(row.dateNaissance) : undefined;

  // Calculer la date de fin d'adhésion (1 an à partir de la date de création)
  const startDate = createdAt;
  const endDate = createdAt.toDate();
  endDate.setFullYear(endDate.getFullYear() + 1);

  const userData = {
    uid,
    email,
    firstName: row.prenom.trim(),
    lastName: row.nom.trim(),
    dateOfBirth,
    phone: row.telephone || undefined,
    postalCode: row.codePostal || undefined,

    // Membership
    currentMembership: {
      type: 'annual',
      status: 'active',
      startDate: startDate,
      endDate: Timestamp.fromDate(endDate),
      autoRenew: false,
    },

    // Loyalty
    loyalty: {
      points: 0,
      tier: 'bronze',
      lifetimePoints: 0,
    },

    // Status
    status: {
      tags: ['CSV_IMPORT', 'NEW_MEMBER'],
      isAccountBlocked: false,
      isCardBlocked: false,
      accountBlockedReason: null,
      cardBlockedReason: null,
    },

    // Email Status - PAS encore envoyée
    emailStatus: {
      membershipCardSent: false,
      membershipCardSentCount: 0,
      membershipCardSentAt: null,
    },

    // Registration info
    registration: {
      source: 'admin',
      createdBy: adminUserId,
      createdAt: createdAt,
      ipAddress: null,
      userAgent: null,
    },

    // QR Code
    qrCode: `FORNAP-MEMBER:${uid}`,

    // Timestamps
    createdAt: createdAt,
    updatedAt: Timestamp.now(), // Date actuelle de l'import
  };

  // Créer le document dans Firestore
  await setDoc(doc(db, 'users', uid), userData);

  // Créer les sous-collections
  // 1. membershipHistory
  await setDoc(doc(db, 'users', uid, 'membershipHistory', createdAt.toMillis().toString()), {
    type: 'annual',
    status: 'active',
    startDate: startDate,
    endDate: Timestamp.fromDate(endDate),
    createdAt: createdAt,
    createdBy: adminUserId,
    reason: 'Import CSV - Adhésion initiale',
  });

  // 2. actionHistory
  await setDoc(doc(db, 'users', uid, 'actionHistory', createdAt.toMillis().toString()), {
    type: 'account_created',
    performedBy: adminUserId,
    timestamp: createdAt,
    details: {
      source: 'csv_import',
      reason: 'Compte créé via import CSV',
      originalHorodateur: row.horodateur || 'Non disponible',
    },
  });
}

/**
 * Détecte le séparateur utilisé dans le CSV
 */
function detectSeparator(line: string): string {
  const separators = ['\t', ';', ',', '|'];

  // Compter le nombre d'occurrences de chaque séparateur
  const counts = separators.map(sep => ({
    separator: sep,
    count: line.split(sep).length - 1,
  }));

  // Retourner le séparateur le plus fréquent (s'il y en a au moins 1)
  const best = counts.reduce((a, b) => (b.count > a.count ? b : a));

  if (best.count === 0) {
    throw new Error('Impossible de détecter le séparateur du CSV. Assurez-vous que le fichier utilise des tabulations, virgules, points-virgules ou pipes.');
  }

  console.log('Séparateur détecté:', best.separator === '\t' ? 'TABULATION' : best.separator);
  return best.separator;
}

/**
 * Parse le contenu CSV complet et retourne les lignes valides
 */
function parseCSV(csvContent: string): { headers: string[]; rows: string[][] } {
  const lines = csvContent.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('Le fichier CSV doit contenir au moins une ligne d\'en-tête et une ligne de données');
  }

  // Détecter automatiquement le séparateur
  const separator = detectSeparator(lines[0]);

  // Parser la première ligne comme headers
  const headers = lines[0].split(separator).map(h => h.trim());
  console.log('Headers détectés:', headers);

  // Parser les autres lignes
  const rows = lines.slice(1).map(line => line.split(separator).map(v => v.trim()));

  return { headers, rows };
}

/**
 * Importe des utilisateurs depuis un fichier CSV
 */
export async function importUsersFromCsv(
  csvContent: string,
  adminUserId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    errors: [],
    skipped: 0,
  };

  try {
    const { headers, rows } = parseCSV(csvContent);

    console.log(`Début de l'import: ${rows.length} lignes à traiter`);

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // +2 car ligne 1 = headers, et index commence à 0
      const isFirstRow = i === 0;

      try {
        const parsedRow = parseCsvRow(headers, rows[i], isFirstRow);

        if (!parsedRow) {
          result.skipped++;
          continue;
        }

        if (isFirstRow) {
          console.log('✓ Première ligne validée, import des utilisateurs...');
        }

        await createUserFromCsv(parsedRow, adminUserId);
        result.success++;

        // Log de progression tous les 50 utilisateurs
        if (result.success % 50 === 0) {
          console.log(`Progression: ${result.success} utilisateurs importés...`);
        }

      } catch (error: any) {
        console.error(`Error importing row ${rowNumber}:`, error);
        result.errors.push({
          row: rowNumber,
          email: rows[i][headers.findIndex(h => h.toLowerCase().includes('email'))] || 'unknown',
          error: error.message || 'Erreur inconnue',
        });
      }
    }

    console.log(`Import terminé: ${result.success} succès, ${result.errors.length} erreurs, ${result.skipped} ignorés`);

  } catch (error: any) {
    console.error('Erreur lors du parsing du CSV:', error);
    throw new Error(`Erreur lors du parsing du CSV: ${error.message}`);
  }

  return result;
}
