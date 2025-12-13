import { db } from '../../shared/config/firebase';
import { doc, setDoc, Timestamp, collection } from 'firebase/firestore';
import { getUserByEmail } from '../../shared/services/userService';

export interface CsvRow {
  // Champs du fichier XLSX
  inscription: string; // Date d'inscription (ex: "12/12/2024 17:05:37")
  nom: string;
  prenom: string;
  dateNaissance?: string; // Date de naissance (ex: "10/12/1998")
  codePostal?: string;
  email: string;
  telephone?: string;
}

export interface ImportResult {
  success: number;
  errors: Array<{ row: number; email: string; error: string }>;
  skipped: number;
  debugInfo?: {
    separator: string;
    headers: string[];
    firstRowSample?: {
      nom?: string;
      prenom?: string;
      email?: string;
      telephone?: string;
    };
  };
}

/**
 * Parse une ligne CSV/XLSX et mappe les colonnes aux champs attendus
 * Champs du fichier XLSX: INSCRIPTION, NOM, PRENOM, DATE DE NAISSANCE, CODE POSTAL, ADRESSE EMAIL, NUMERO DE TELEPHONE
 * IMPORTANT: Ne pas écraser une valeur déjà trouvée (priorité à la première occurrence)
 */
function parseCsvRow(headers: string[], values: string[], isFirstRow: boolean = false): CsvRow | null {
  const row: any = {};

  headers.forEach((header, index) => {
    const value = values[index]?.trim();
    const lowerHeader = header.toLowerCase();

    // Mapping des colonnes selon le format XLSX fourni
    if (!row.inscription && lowerHeader.includes('inscription')) {
      row.inscription = value;
      if (isFirstRow) console.log(`✓ Inscription trouvée dans colonne "${header}"`);
    } else if (!row.nom && lowerHeader.includes('nom') && !lowerHeader.includes('prenom') && !lowerHeader.includes('prénom')) {
      row.nom = value;
      if (isFirstRow) console.log(`✓ Nom trouvé dans colonne "${header}"`);
    } else if (!row.prenom && (lowerHeader.includes('prenom') || lowerHeader.includes('prénom'))) {
      row.prenom = value;
      if (isFirstRow) console.log(`✓ Prénom trouvé dans colonne "${header}"`);
    } else if (!row.dateNaissance && lowerHeader.includes('naissance')) {
      row.dateNaissance = value;
      if (isFirstRow) console.log(`✓ Date de naissance trouvée dans colonne "${header}"`);
    } else if (!row.codePostal && (lowerHeader.includes('code postal') || lowerHeader.includes('postal'))) {
      row.codePostal = value;
      if (isFirstRow) console.log(`✓ Code postal trouvé dans colonne "${header}"`);
    } else if (!row.email && (lowerHeader.includes('email') || lowerHeader.includes('e-mail') || lowerHeader.includes('adresse email'))) {
      row.email = value;
      if (isFirstRow) console.log(`✓ Email trouvé dans colonne "${header}"`);
    } else if (!row.telephone && (lowerHeader.includes('telephone') || lowerHeader.includes('téléphone') || lowerHeader.includes('numero'))) {
      row.telephone = value;
      if (isFirstRow) console.log(`✓ Téléphone trouvé dans colonne "${header}"`);
    }
  });

  // Validation minimale: inscription, nom, prénom et email sont requis
  if (!row.inscription || !row.nom || !row.prenom || !row.email) {
    if (isFirstRow) {
      console.log('❌ Ligne rejetée - Champs manquants:', {
        inscription: row.inscription ? '✓' : '✗',
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
 * Parse la date d'inscription au format américain (MM/DD/YYYY HH:MM:SS)
 * Exemple: "12/12/2024 17:05:37"
 */
function parseInscriptionDate(inscriptionStr: string): Timestamp | null {
  if (!inscriptionStr) return null;

  try {
    // Format: MM/DD/YYYY HH:MM:SS
    const [datePart, timePart] = inscriptionStr.split(' ');

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
    console.error('Error parsing inscription date:', inscriptionStr, e);
    return null;
  }
}

/**
 * Crée un document utilisateur dans Firestore depuis les données XLSX
 * IMPORTANT: Tous les utilisateurs ont un abonnement ANNUAL à 12€
 * IMPORTANT: La date d'expiration est TOUJOURS calculée (1 an après l'inscription)
 * Lance une erreur si l'email existe déjà
 */
async function createUserFromCsv(row: CsvRow, adminUserId: string): Promise<void> {
  const email = row.email.toLowerCase().trim();

  // ✅ Vérifier si un utilisateur avec cet email existe déjà
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new Error(`Email déjà utilisé par ${existingUser.firstName} ${existingUser.lastName}`);
  }

  // Générer un UID unique avec Firestore (au lieu d'utiliser Firebase Auth)
  const uid = doc(collection(db, 'users')).id;

  // Parser la date d'inscription depuis le champ INSCRIPTION
  const inscriptionTimestamp = parseInscriptionDate(row.inscription);
  const createdAt = inscriptionTimestamp || Timestamp.now();

  // Parser la date de naissance (format français: DD/MM/YYYY ou D/M/YYYY)
  const birthDateString = row.dateNaissance ? parseFrenchDate(row.dateNaissance) : undefined;
  const birthDate = birthDateString ? Timestamp.fromDate(new Date(birthDateString)) : undefined;

  // ⚠️ IMPORTANT: Calculer la date d'expiration (1 an après l'inscription)
  const startDate = createdAt;
  const expiryDate = new Date(createdAt.toDate());
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  // ⚠️ IMPORTANT: Tous les utilisateurs ont un abonnement ANNUAL à 12€
  const userData = {
    uid,
    email,
    firstName: row.prenom.trim(),
    lastName: row.nom.trim(),
    postalCode: row.codePostal || '',
    birthDate: birthDate || undefined, // Ne pas mettre de date par défaut si non fournie
    phone: row.telephone || '',

    // Statut et métadonnées
    status: {
      tags: ['XLSX_IMPORT', 'NEW_MEMBER'],
      isAccountBlocked: false,
      isCardBlocked: false,
    },

    // Origine du compte
    registration: {
      source: 'admin' as const,
      createdBy: adminUserId,
      createdAt: createdAt,
    },

    // ⚠️ Abonnement actuel - ANNUAL, 12€, expiration calculée
    currentMembership: {
      planId: 'adhesion_annual_12eur',
      planName: 'Adhésion annuelle 12€',
      planType: 'annual' as const,
      status: 'active' as const,
      paymentStatus: 'paid' as const,
      startDate: startDate,
      expiryDate: Timestamp.fromDate(expiryDate), // ⚠️ NE JAMAIS mettre null pour annual
      price: 12, // ⚠️ Prix: 12€
      autoRenew: false,
    },

    // Points de fidélité
    loyaltyPoints: 0,

    // Email Status - PAS encore envoyée
    emailStatus: {
      membershipCardSent: false,
      membershipCardSentCount: 0,
      membershipCardSentAt: null,
    },

    // QR Code
    qrCode: `FORNAP-MEMBER:${uid}`,

    // Timestamps
    createdAt: createdAt, // Date d'inscription originale
    updatedAt: Timestamp.now(), // Date actuelle de l'import
  };

  // Créer le document dans Firestore
  await setDoc(doc(db, 'users', uid), userData);

  // Créer les sous-collections
  // 1. membershipHistory
  await setDoc(doc(db, 'users', uid, 'membershipHistory', createdAt.toMillis().toString()), {
    id: createdAt.toMillis().toString(),
    planId: 'adhesion_annual_12eur',
    planName: 'Adhésion annuelle 12€',
    planType: 'annual',
    status: 'active',
    startDate: startDate,
    endDate: Timestamp.fromDate(expiryDate),
    price: 12,
    isRenewal: false,
  });

  // 2. actionHistory
  await setDoc(doc(db, 'users', uid, 'actionHistory', createdAt.toMillis().toString()), {
    id: createdAt.toMillis().toString(),
    actionType: 'membership_created',
    details: {
      reason: 'Import XLSX - Adhésion annuelle 12€',
      originalInscriptionDate: row.inscription,
    },
    timestamp: createdAt,
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
 * Parse une ligne CSV en tenant compte des guillemets
 */
function parseCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      // Gestion des guillemets doublés ("") qui représentent un guillemet littéral
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip le prochain guillemet
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      // On a trouvé un séparateur hors des guillemets
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Ajouter la dernière valeur
  result.push(current.trim());

  return result;
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

  // Parser la première ligne comme headers en tenant compte des guillemets
  const headers = parseCSVLine(lines[0], separator);
  console.log('Headers détectés:', headers);

  // Parser les autres lignes en tenant compte des guillemets
  const rows = lines.slice(1).map(line => parseCSVLine(line, separator));

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

    // Déterminer le séparateur utilisé
    const separator = detectSeparator(csvContent.split('\n')[0]);
    const separatorName = separator === '\t' ? 'TABULATION' : separator === ',' ? 'VIRGULE' : separator === ';' ? 'POINT-VIRGULE' : separator;

    console.log(`Début de l'import: ${rows.length} lignes à traiter`);

    // Initialiser debugInfo
    result.debugInfo = {
      separator: separatorName,
      headers: headers,
    };

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // +2 car ligne 1 = headers, et index commence à 0
      const isFirstRow = i === 0;

      try {
        const parsedRow = parseCsvRow(headers, rows[i], isFirstRow);

        if (!parsedRow) {
          result.skipped++;
          continue;
        }

        // Capturer un échantillon de la première ligne pour le debug
        if (isFirstRow && result.debugInfo) {
          result.debugInfo.firstRowSample = {
            nom: parsedRow.nom,
            prenom: parsedRow.prenom,
            email: parsedRow.email,
            telephone: parsedRow.telephone,
          };
          console.log('✓ Première ligne validée, import des utilisateurs...');
          console.log('Échantillon première ligne:', result.debugInfo.firstRowSample);
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
