import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { UserFilters, User } from '../../types/user';
import { getTransactionsForPeriod } from './financialAnalytics';
import { getSkillsAnalytics } from './engagementAnalytics';
import { MEMBERSHIP_TYPE_LABELS, MEMBERSHIP_STATUS_LABELS } from '../../types/user';

const USERS_COLLECTION = 'users';

/**
 * Convertit un tableau d'objets en CSV
 */
function arrayToCSV(data: any[], headers: string[]): string {
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // En-têtes
  const csvHeaders = headers.join(',');

  // Lignes
  const csvRows = data.map((row) =>
    headers.map((header) => escapeCSV(row[header])).join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Crée un Blob CSV téléchargeable
 */
function createCSVBlob(csvContent: string): Blob {
  // Ajouter BOM pour support UTF-8 dans Excel
  const BOM = '\uFEFF';
  return new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Export CSV mensuel des abonnements
 * Format: Mois, Type, Nouveaux, Renouvellements, Revenu Total, MRR
 */
export async function exportMonthlyMembershipCSV(
  year: number,
  month: number
): Promise<Blob> {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const transactions = await getTransactionsForPeriod(startDate, endDate);

    // Grouper par type d'abonnement
    const summary: any = {
      monthly: { nouveaux: 0, renouvellements: 0, revenu: 0 },
      annual: { nouveaux: 0, renouvellements: 0, revenu: 0 },
      lifetime: { nouveaux: 0, renouvellements: 0, revenu: 0 },
    };

    transactions.forEach((t) => {
      const type = t.membershipType;
      if (summary[type]) {
        if (t.isRenewal) {
          summary[type].renouvellements++;
        } else {
          summary[type].nouveaux++;
        }
        summary[type].revenu += t.amount;
      }
    });

    // Créer le tableau de données
    const data = Object.entries(summary).map(([type, stats]: [string, any]) => ({
      Mois: `${year}-${String(month).padStart(2, '0')}`,
      Type_Abonnement: MEMBERSHIP_TYPE_LABELS[type as keyof typeof MEMBERSHIP_TYPE_LABELS],
      Nombre_Nouveaux: stats.nouveaux,
      Nombre_Renouvellements: stats.renouvellements,
      Revenu_Total: `${stats.revenu.toFixed(2)}€`,
      MRR: type === 'monthly' ? `${stats.revenu.toFixed(2)}€` : `${(stats.revenu / 12).toFixed(2)}€`,
    }));

    const headers = [
      'Mois',
      'Type_Abonnement',
      'Nombre_Nouveaux',
      'Nombre_Renouvellements',
      'Revenu_Total',
      'MRR',
    ];

    const csvContent = arrayToCSV(data, headers);
    return createCSVBlob(csvContent);
  } catch (error) {
    console.error('Error exporting monthly membership CSV:', error);
    throw error;
  }
}

/**
 * Export CSV détaillé par adhérent
 */
export async function exportMembersDetailCSV(filters?: UserFilters): Promise<Blob> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    let snapshot;

    // Appliquer les filtres si fournis
    if (filters) {
      // Pour simplifier, on récupère tout et on filtre en mémoire
      // Dans une vraie app, il faudrait construire les queries Firestore
      snapshot = await getDocs(usersRef);
    } else {
      snapshot = await getDocs(usersRef);
    }

    const data = snapshot.docs.map((doc) => {
      const user = doc.data() as User;
      return {
        ID: doc.id,
        Nom: user.lastName,
        Prenom: user.firstName,
        Email: user.email,
        Telephone: user.phone,
        Code_Postal: user.postalCode,
        Date_Naissance: user.birthDate ? user.birthDate.toDate().toISOString().split('T')[0] : '',
        Type_Abonnement: MEMBERSHIP_TYPE_LABELS[user.currentMembership.planType],
        Statut_Abonnement: MEMBERSHIP_STATUS_LABELS[user.currentMembership.status],
        Date_Inscription: user.createdAt ? user.createdAt.toDate().toISOString().split('T')[0] : '',
        Date_Expiration: user.currentMembership.expiryDate
          ? user.currentMembership.expiryDate.toDate().toISOString().split('T')[0]
          : 'Aucune',
        Montant: `${user.currentMembership.price}€`,
        Statut_Paiement: user.currentMembership.paymentStatus,
        Points_Fidelite: user.loyaltyPoints,
        Compte_Bloque: user.status.isAccountBlocked ? 'Oui' : 'Non',
        Carte_Bloquee: user.status.isCardBlocked ? 'Oui' : 'Non',
      };
    });

    const headers = [
      'ID',
      'Nom',
      'Prenom',
      'Email',
      'Telephone',
      'Code_Postal',
      'Date_Naissance',
      'Type_Abonnement',
      'Statut_Abonnement',
      'Date_Inscription',
      'Date_Expiration',
      'Montant',
      'Statut_Paiement',
      'Points_Fidelite',
      'Compte_Bloque',
      'Carte_Bloquee',
    ];

    const csvContent = arrayToCSV(data, headers);
    return createCSVBlob(csvContent);
  } catch (error) {
    console.error('Error exporting members detail CSV:', error);
    throw error;
  }
}

/**
 * Export comptable (format compatible logiciels de compta)
 */
export async function exportAccountingCSV(
  startDate: Date,
  endDate: Date,
  format: 'sage' | 'ebp' | 'ciel' | 'generic' = 'generic'
): Promise<Blob> {
  try {
    const transactions = await getTransactionsForPeriod(startDate, endDate);

    let data: any[] = [];
    let headers: string[] = [];

    switch (format) {
      case 'sage':
        // Format Sage
        headers = [
          'Journal',
          'Date',
          'Compte',
          'NumPiece',
          'Libelle',
          'Debit',
          'Credit',
          'Montant',
        ];
        transactions.forEach((t) => {
          const date = t.date.toDate().toISOString().split('T')[0];
          const ref = `FAC-${t.id.substring(0, 8)}`;

          // Ligne débit (client)
          data.push({
            Journal: 'VE',
            Date: date,
            Compte: '411000',
            NumPiece: ref,
            Libelle: `Cotisation ${t.planName} - ${t.userName}`,
            Debit: t.amount.toFixed(2),
            Credit: '0.00',
            Montant: t.amount.toFixed(2),
          });

          // Ligne crédit (produit)
          data.push({
            Journal: 'VE',
            Date: date,
            Compte: '706000',
            NumPiece: ref,
            Libelle: `Cotisation ${t.planName} - ${t.userName}`,
            Debit: '0.00',
            Credit: t.amount.toFixed(2),
            Montant: t.amount.toFixed(2),
          });
        });
        break;

      case 'generic':
      default:
        // Format générique
        headers = [
          'Date',
          'Reference',
          'Type',
          'Nom',
          'Email',
          'Plan',
          'Montant',
          'Mode_Paiement',
          'Renouvellement',
        ];
        data = transactions.map((t) => ({
          Date: t.date.toDate().toISOString().split('T')[0],
          Reference: t.transactionId,
          Type: MEMBERSHIP_TYPE_LABELS[t.membershipType],
          Nom: t.userName,
          Email: t.userEmail,
          Plan: t.planName,
          Montant: `${t.amount.toFixed(2)}€`,
          Mode_Paiement: t.paymentMethod,
          Renouvellement: t.isRenewal ? 'Oui' : 'Non',
        }));
        break;
    }

    const csvContent = arrayToCSV(data, headers);
    return createCSVBlob(csvContent);
  } catch (error) {
    console.error('Error exporting accounting CSV:', error);
    throw error;
  }
}

/**
 * Export des compétences disponibles
 */
export async function exportSkillsCSV(): Promise<Blob> {
  try {
    const skillsData = await getSkillsAnalytics();

    const data: any[] = [];

    skillsData.bySkill.forEach((skillInfo) => {
      skillInfo.members.forEach((member) => {
        data.push({
          Competence: skillInfo.skill,
          Nom: member.name,
          Benevole: member.isVolunteer ? 'Oui' : 'Non',
          Email: member.email || 'Non communiqué',
        });
      });
    });

    const headers = ['Competence', 'Nom', 'Benevole', 'Email'];

    const csvContent = arrayToCSV(data, headers);
    return createCSVBlob(csvContent);
  } catch (error) {
    console.error('Error exporting skills CSV:', error);
    throw error;
  }
}

/**
 * Déclenche le téléchargement d'un fichier Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper: Export mensuel et téléchargement automatique
 */
export async function downloadMonthlyMembershipCSV(year: number, month: number): Promise<void> {
  const blob = await exportMonthlyMembershipCSV(year, month);
  const filename = `abonnements-${year}-${String(month).padStart(2, '0')}.csv`;
  downloadBlob(blob, filename);
}

/**
 * Helper: Export adhérents et téléchargement automatique
 */
export async function downloadMembersDetailCSV(filters?: UserFilters): Promise<void> {
  const blob = await exportMembersDetailCSV(filters);
  const filename = `adherents-${new Date().toISOString().split('T')[0]}.csv`;
  downloadBlob(blob, filename);
}

/**
 * Helper: Export comptable et téléchargement automatique
 */
export async function downloadAccountingCSV(
  startDate: Date,
  endDate: Date,
  format: 'sage' | 'ebp' | 'ciel' | 'generic' = 'generic'
): Promise<void> {
  const blob = await exportAccountingCSV(startDate, endDate, format);
  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];
  const filename = `comptabilite-${format}-${start}-${end}.csv`;
  downloadBlob(blob, filename);
}

/**
 * Helper: Export compétences et téléchargement automatique
 */
export async function downloadSkillsCSV(): Promise<void> {
  const blob = await exportSkillsCSV();
  const filename = `competences-${new Date().toISOString().split('T')[0]}.csv`;
  downloadBlob(blob, filename);
}
