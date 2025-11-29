import { getStatsForSearch } from '../analytics/analyticsService';
import { getUsersCount } from '../userService';
import type { OverviewKPIs } from '../../types/user';

export interface StatSearchResult {
  label: string;
  value: string;
  description: string;
  path: string;
  keywords: string[];
}

// Dictionnaire des définitions de stats
const STATS_DEFINITIONS: Omit<StatSearchResult, 'value'>[] = [
  {
    label: 'Membres Totaux',
    description: 'Nombre total d\'inscrits dans la base',
    path: '/admin/users',
    keywords: ['membres', 'users', 'total', 'utilisateurs', 'count', 'compte']
  },
  {
    label: 'Membres Actifs',
    description: 'Membres à jour de cotisation',
    path: '/admin/users?status=active',
    keywords: ['actifs', 'active', 'membres', 'cotisation']
  },
  {
    label: 'Revenu Total',
    description: 'Cumul des adhésions et dons',
    path: '/admin/analytics/financial',
    keywords: ['revenu', 'revenue', 'argent', 'total', 'ca', 'chiffre']
  },
  {
    label: 'MRR (Revenu Mensuel)',
    description: 'Revenu récurrent mensuel estimé',
    path: '/admin/analytics/financial',
    keywords: ['mrr', 'mensuel', 'mois', 'revenu']
  },
  {
    label: 'ARR (Revenu Annuel)',
    description: 'Revenu récurrent annuel estimé',
    path: '/admin/analytics/financial',
    keywords: ['arr', 'annuel', 'an', 'revenu']
  },
  {
    label: 'Taux de Renouvellement',
    description: 'Pourcentage de fidélisation',
    path: '/admin/analytics/overview',
    keywords: ['renouvellement', 'taux', 'fidélisation', 'retention']
  },
  {
    label: 'Âge Moyen',
    description: 'Âge moyen des membres',
    path: '/admin/analytics/demographics',
    keywords: ['age', 'moyen', 'démographie']
  }
];

/**
 * Recherche intelligente de statistiques
 * Utilise le cache Firestore 'analytics/summary' pour être rapide
 */
export async function searchStats(query: string): Promise<StatSearchResult[]> {
  const q = query.toLowerCase();
  
  // 1. Filtrer les définitions pertinentes
  const matchedDefs = STATS_DEFINITIONS.filter(def => 
    def.label.toLowerCase().includes(q) || 
    def.keywords.some(k => k.includes(q))
  );

  if (matchedDefs.length === 0) return [];

  // 2. Récupérer les valeurs (depuis le cache)
  const kpis = await getStatsForSearch();
  
  // Si pas de cache, on retourne juste les liens (fallback)
  if (!kpis) {
    return matchedDefs.map(def => ({
      ...def,
      value: 'Voir les détails ->'
    }));
  }

  // 3. Mapper les valeurs
  return matchedDefs.map(def => {
    let value = 'N/A';
    
    switch(def.label) {
      case 'Membres Totaux':
        value = kpis.totalMembers.toLocaleString('fr-FR');
        break;
      case 'Membres Actifs':
        value = kpis.activeMembers.toLocaleString('fr-FR');
        break;
      case 'Revenu Total':
        value = `${kpis.totalRevenue.toLocaleString('fr-FR')} €`;
        break;
      case 'MRR (Revenu Mensuel)':
        value = `${kpis.mrr.toLocaleString('fr-FR')} €/mois`;
        break;
      case 'ARR (Revenu Annuel)':
        value = `${kpis.arr.toLocaleString('fr-FR')} €/an`;
        break;
      case 'Taux de Renouvellement':
        value = `${kpis.renewalRate}%`;
        break;
      case 'Âge Moyen':
        value = `${kpis.averageAge} ans`;
        break;
      default:
        value = 'Voir ->';
    }

    return {
      ...def,
      value
    };
  });
}
