/**
 * Extrait et nettoie les adresses email depuis du texte brut, CSV, ou tout contenu copié-collé.
 * Utilise une regex standard pour détecter les emails dans n'importe quel format de texte.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Extrait toutes les adresses email uniques depuis un texte brut.
 * Gère les séparateurs courants : virgules, points-virgules, espaces, retours à la ligne, tabs.
 */
export function extractEmailsFromText(text: string): string[] {
  if (!text || !text.trim()) return [];

  const matches = text.match(EMAIL_REGEX);
  if (!matches) return [];

  // Dédupliquer et normaliser en minuscules
  const uniqueEmails = new Set(matches.map(email => email.toLowerCase().trim()));
  return Array.from(uniqueEmails);
}

/**
 * Extrait toutes les adresses email depuis le contenu d'un fichier CSV/TXT.
 * Parcourt toutes les cellules/lignes pour trouver les emails.
 */
export function extractEmailsFromCsvContent(csvContent: string): string[] {
  return extractEmailsFromText(csvContent);
}

/**
 * Lit un fichier (CSV, TXT, etc.) et en extrait les adresses email.
 * Retourne une Promise avec la liste des emails extraits.
 */
export function extractEmailsFromFile(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        resolve([]);
        return;
      }
      resolve(extractEmailsFromText(content));
    };

    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };

    reader.readAsText(file);
  });
}
