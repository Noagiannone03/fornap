/**
 * Outils disponibles pour l'IA Assistant
 * Ces outils permettent à l'IA d'interagir avec Firebase et d'effectuer des opérations
 */

import type { AITool } from '../../types/ai';
import {
  getUserById,
  getAllUsersForListSeparated,
  getUserStats,
  getUserActionHistory,
  getUserMembershipHistory,
  updateUser,
  addLoyaltyPoints,
  toggleAccountBlocked,
  getUsersCount,
} from '../userService';
import {
  getContributionKPIs,
  getContributionEvolution,
  getItemStatistics,
  getContributionGeographicData,
  getContributorDemographics,
  getRecentContributions,
  getAllContributions,
} from '../analytics/contributionAnalytics';
import { getAllMembershipPlans, getMembershipPlanById } from '../membershipService';

/**
 * OUTIL: Récupérer les informations d'un utilisateur
 */
export const getUserTool: AITool = {
  name: 'get_user',
  description: 'Récupère les informations complètes d\'un utilisateur par son UID',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'L\'UID de l\'utilisateur à récupérer',
      },
    },
    required: ['userId'],
  },
  execute: async (args) => {
    const user = await getUserById(args.userId);
    if (!user) {
      throw new Error(`Utilisateur ${args.userId} introuvable`);
    }
    return user;
  },
};

/**
 * OUTIL: Lister tous les utilisateurs
 */
export const listUsersTool: AITool = {
  name: 'list_users',
  description: 'Récupère la liste de tous les utilisateurs (nouveaux et legacy)',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute: async () => {
    const { users, legacyMembers } = await getAllUsersForListSeparated();
    return {
      totalUsers: users.length,
      totalLegacyMembers: legacyMembers.length,
      users: users.slice(0, 100), // Limiter à 100 pour éviter trop de données
      legacyMembers: legacyMembers.slice(0, 50),
    };
  },
};

/**
 * OUTIL: Statistiques utilisateur
 */
export const getUserStatsTool: AITool = {
  name: 'get_user_stats',
  description: 'Calcule les statistiques détaillées d\'un utilisateur (scans, transactions, événements)',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'L\'UID de l\'utilisateur',
      },
    },
    required: ['userId'],
  },
  execute: async (args) => {
    return await getUserStats(args.userId);
  },
};

/**
 * OUTIL: Historique d'actions utilisateur
 */
export const getUserActionHistoryTool: AITool = {
  name: 'get_user_action_history',
  description: 'Récupère l\'historique complet des actions d\'un utilisateur',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'L\'UID de l\'utilisateur',
      },
      limit: {
        type: 'number',
        description: 'Nombre maximum d\'actions à récupérer (défaut: 50)',
      },
    },
    required: ['userId'],
  },
  execute: async (args) => {
    return await getUserActionHistory(args.userId, args.limit || 50);
  },
};

/**
 * OUTIL: Historique d'abonnement utilisateur
 */
export const getUserMembershipHistoryTool: AITool = {
  name: 'get_user_membership_history',
  description: 'Récupère l\'historique complet des abonnements d\'un utilisateur',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'L\'UID de l\'utilisateur',
      },
    },
    required: ['userId'],
  },
  execute: async (args) => {
    return await getUserMembershipHistory(args.userId);
  },
};

/**
 * OUTIL: Mettre à jour un utilisateur
 */
export const updateUserTool: AITool = {
  name: 'update_user',
  description: 'Met à jour les informations d\'un utilisateur. ATTENTION: Utilisez avec précaution!',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'L\'UID de l\'utilisateur à mettre à jour',
      },
      updates: {
        type: 'object',
        description: 'Les champs à mettre à jour (ex: firstName, lastName, email, phone, etc.)',
      },
      adminUserId: {
        type: 'string',
        description: 'L\'UID de l\'admin effectuant la modification',
      },
    },
    required: ['userId', 'updates'],
  },
  execute: async (args) => {
    await updateUser(args.userId, args.updates, args.adminUserId);
    return { success: true, message: 'Utilisateur mis à jour avec succès' };
  },
};

/**
 * OUTIL: Ajouter des points de fidélité
 */
export const addLoyaltyPointsTool: AITool = {
  name: 'add_loyalty_points',
  description: 'Ajoute des points de fidélité à un utilisateur',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'L\'UID de l\'utilisateur',
      },
      points: {
        type: 'number',
        description: 'Nombre de points à ajouter',
      },
      reason: {
        type: 'string',
        description: 'Raison de l\'ajout de points',
      },
      adminUserId: {
        type: 'string',
        description: 'L\'UID de l\'admin effectuant l\'action',
      },
    },
    required: ['userId', 'points', 'reason'],
  },
  execute: async (args) => {
    const newBalance = await addLoyaltyPoints(
      args.userId,
      args.points,
      args.reason,
      args.adminUserId
    );
    return { success: true, newBalance, message: `${args.points} points ajoutés` };
  },
};

/**
 * OUTIL: Bloquer/débloquer un compte
 */
export const toggleAccountBlockedTool: AITool = {
  name: 'toggle_account_blocked',
  description: 'Bloque ou débloque un compte utilisateur',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'L\'UID de l\'utilisateur',
      },
      isBlocked: {
        type: 'boolean',
        description: 'true pour bloquer, false pour débloquer',
      },
      reason: {
        type: 'string',
        description: 'Raison du blocage/déblocage',
      },
      adminUserId: {
        type: 'string',
        description: 'L\'UID de l\'admin effectuant l\'action',
      },
    },
    required: ['userId', 'isBlocked', 'reason', 'adminUserId'],
  },
  execute: async (args) => {
    await toggleAccountBlocked(args.userId, args.isBlocked, args.reason, args.adminUserId);
    return {
      success: true,
      message: args.isBlocked ? 'Compte bloqué' : 'Compte débloqué',
    };
  },
};

/**
 * OUTIL: Compter les utilisateurs
 */
export const getUsersCountTool: AITool = {
  name: 'get_users_count',
  description: 'Compte le nombre total d\'utilisateurs dans le système',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute: async () => {
    const count = await getUsersCount();
    return { totalUsers: count };
  },
};

/**
 * OUTIL: KPIs des contributions
 */
export const getContributionKPIsTool: AITool = {
  name: 'get_contribution_kpis',
  description: 'Récupère les indicateurs clés de performance (KPIs) des contributions crowdfunding',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute: async () => {
    return await getContributionKPIs();
  },
};

/**
 * OUTIL: Évolution des contributions
 */
export const getContributionEvolutionTool: AITool = {
  name: 'get_contribution_evolution',
  description: 'Récupère l\'évolution des contributions dans le temps',
  parameters: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Date de début (format ISO 8601)',
      },
      endDate: {
        type: 'string',
        description: 'Date de fin (format ISO 8601)',
      },
    },
    required: ['startDate', 'endDate'],
  },
  execute: async (args) => {
    const start = new Date(args.startDate);
    const end = new Date(args.endDate);
    return await getContributionEvolution(start, end);
  },
};

/**
 * OUTIL: Statistiques par item/forfait
 */
export const getItemStatisticsTool: AITool = {
  name: 'get_item_statistics',
  description: 'Récupère les statistiques détaillées par type d\'item/forfait crowdfunding',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute: async () => {
    return await getItemStatistics();
  },
};

/**
 * OUTIL: Données géographiques
 */
export const getContributionGeographicDataTool: AITool = {
  name: 'get_contribution_geographic_data',
  description: 'Récupère la distribution géographique des contributions (par code postal)',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute: async () => {
    return await getContributionGeographicData();
  },
};

/**
 * OUTIL: Démographie des contributeurs
 */
export const getContributorDemographicsTool: AITool = {
  name: 'get_contributor_demographics',
  description: 'Récupère les données démographiques des contributeurs (âge moyen, tranches d\'âge)',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute: async () => {
    return await getContributorDemographics();
  },
};

/**
 * OUTIL: Contributions récentes
 */
export const getRecentContributionsTool: AITool = {
  name: 'get_recent_contributions',
  description: 'Récupère les contributions les plus récentes',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Nombre de contributions à récupérer (défaut: 10)',
      },
    },
    required: [],
  },
  execute: async (args) => {
    return await getRecentContributions(args.limit || 10);
  },
};

/**
 * OUTIL: Toutes les contributions
 */
export const getAllContributionsTool: AITool = {
  name: 'get_all_contributions',
  description: 'Récupère toutes les contributions (attention: peut être volumineux)',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute: async () => {
    const contributions = await getAllContributions();
    return {
      total: contributions.length,
      contributions: contributions.slice(0, 100), // Limiter à 100
    };
  },
};

/**
 * OUTIL: Plans d'abonnement
 */
export const getMembershipPlansTool: AITool = {
  name: 'get_membership_plans',
  description: 'Récupère tous les plans d\'abonnement disponibles',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute: async () => {
    return await getAllMembershipPlans();
  },
};

/**
 * OUTIL: Plan d'abonnement spécifique
 */
export const getMembershipPlanByIdTool: AITool = {
  name: 'get_membership_plan_by_id',
  description: 'Récupère un plan d\'abonnement par son ID',
  parameters: {
    type: 'object',
    properties: {
      planId: {
        type: 'string',
        description: 'L\'ID du plan à récupérer',
      },
    },
    required: ['planId'],
  },
  execute: async (args) => {
    return await getMembershipPlanById(args.planId);
  },
};

/**
 * OUTIL: Recherche web
 */
export const webSearchTool: AITool = {
  name: 'web_search',
  description: 'Effectue une recherche sur le web pour trouver des informations externes',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'La requête de recherche',
      },
    },
    required: ['query'],
  },
  execute: async (args) => {
    try {
      // Utiliser l'API DuckDuckGo (gratuite et sans clé API)
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json&no_html=1&skip_disambig=1`
      );
      const data = await response.json();

      return {
        abstract: data.Abstract || 'Aucun résumé disponible',
        abstractText: data.AbstractText || '',
        abstractSource: data.AbstractSource || '',
        abstractURL: data.AbstractURL || '',
        relatedTopics: (data.RelatedTopics || []).slice(0, 5).map((topic: any) => ({
          text: topic.Text || '',
          url: topic.FirstURL || '',
        })),
      };
    } catch (error) {
      console.error('Web search error:', error);
      return {
        error: 'Erreur lors de la recherche web',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * OUTIL: Calculer des statistiques personnalisées
 */
export const calculateCustomStatsTool: AITool = {
  name: 'calculate_custom_stats',
  description: 'Effectue des calculs statistiques personnalisés sur les données',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['sum', 'average', 'min', 'max', 'count', 'median'],
        description: 'Type d\'opération à effectuer',
      },
      dataType: {
        type: 'string',
        enum: ['users', 'contributions', 'loyalty_points'],
        description: 'Type de données sur lesquelles effectuer le calcul',
      },
      field: {
        type: 'string',
        description: 'Champ sur lequel effectuer le calcul (ex: "amount", "loyaltyPoints")',
      },
    },
    required: ['operation', 'dataType'],
  },
  execute: async (args) => {
    // Implémentation basique - peut être étendue
    if (args.dataType === 'contributions') {
      const contributions = await getAllContributions();
      const values = contributions
        .filter((c) => c.paymentStatus === 'completed')
        .map((c) => (args.field ? c[args.field as keyof typeof c] : c.amount) as number)
        .filter((v) => typeof v === 'number' && !isNaN(v));

      switch (args.operation) {
        case 'sum':
          return { result: values.reduce((a, b) => a + b, 0) };
        case 'average':
          return { result: values.reduce((a, b) => a + b, 0) / values.length };
        case 'min':
          return { result: Math.min(...values) };
        case 'max':
          return { result: Math.max(...values) };
        case 'count':
          return { result: values.length };
        case 'median': {
          const sorted = [...values].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return {
            result:
              sorted.length % 2 !== 0
                ? sorted[mid]
                : (sorted[mid - 1] + sorted[mid]) / 2,
          };
        }
        default:
          return { error: 'Opération non supportée' };
      }
    }

    return { error: 'Type de données non supporté' };
  },
};

/**
 * OUTIL: Créer un graphique
 */
export const createChartTool: AITool = {
  name: 'create_chart',
  description: 'Génère un graphique à partir de données (ligne, barre, secteur, etc.)',
  parameters: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['line', 'bar', 'pie', 'area'],
        description: 'Type de graphique à créer',
      },
      title: {
        type: 'string',
        description: 'Titre du graphique',
      },
      data: {
        type: 'array',
        description: 'Données du graphique (array d\'objets)',
        items: {
          type: 'object',
        },
      },
      xKey: {
        type: 'string',
        description: 'Clé pour l\'axe X (pour line/bar/area)',
      },
      yKey: {
        type: 'string',
        description: 'Clé pour l\'axe Y (pour line/bar/area)',
      },
      nameKey: {
        type: 'string',
        description: 'Clé pour les noms (pour pie)',
      },
      valueKey: {
        type: 'string',
        description: 'Clé pour les valeurs (pour pie)',
      },
    },
    required: ['type', 'title', 'data'],
  },
  execute: async (args) => {
    return {
      chartType: 'chart',
      type: args.type,
      title: args.title,
      data: args.data,
      xKey: args.xKey,
      yKey: args.yKey,
      nameKey: args.nameKey,
      valueKey: args.valueKey,
    };
  },
};

/**
 * OUTIL: Créer un graphique des contributions par mois
 */
export const createContributionChartTool: AITool = {
  name: 'create_contribution_chart',
  description: 'Génère automatiquement un graphique de l\'évolution des contributions',
  parameters: {
    type: 'object',
    properties: {
      months: {
        type: 'number',
        description: 'Nombre de mois à afficher (par défaut 6)',
      },
    },
    required: [],
  },
  execute: async (args) => {
    const evolution = await getContributionEvolution();
    const months = args.months || 6;

    // Prendre les X derniers mois
    const data = evolution.evolutionByMonth.slice(-months).map(m => ({
      mois: m.month,
      montant: m.totalAmount,
      contributions: m.count,
    }));

    return {
      chartType: 'chart',
      type: 'line',
      title: `Évolution des contributions (${months} derniers mois)`,
      data,
      xKey: 'mois',
      yKey: 'montant',
    };
  },
};

/**
 * OUTIL: Créer un graphique des contributions par forfait
 */
export const createItemStatsChartTool: AITool = {
  name: 'create_item_stats_chart',
  description: 'Génère un graphique des statistiques par forfait',
  parameters: {
    type: 'object',
    properties: {
      chartType: {
        type: 'string',
        enum: ['bar', 'pie'],
        description: 'Type de graphique (bar ou pie)',
      },
    },
    required: [],
  },
  execute: async (args) => {
    const stats = await getItemStatistics();

    const data = stats.map(s => ({
      forfait: s.itemId,
      montant: s.totalAmount,
      contributions: s.count,
    }));

    const chartType = args.chartType || 'bar';

    if (chartType === 'pie') {
      return {
        chartType: 'chart',
        type: 'pie',
        title: 'Répartition des contributions par forfait',
        data,
        nameKey: 'forfait',
        valueKey: 'montant',
      };
    }

    return {
      chartType: 'chart',
      type: 'bar',
      title: 'Statistiques par forfait',
      data,
      xKey: 'forfait',
      yKey: 'montant',
    };
  },
};

/**
 * Liste de tous les outils disponibles
 */
export const ALL_AI_TOOLS: AITool[] = [
  // Outils utilisateurs
  getUserTool,
  listUsersTool,
  getUserStatsTool,
  getUserActionHistoryTool,
  getUserMembershipHistoryTool,
  updateUserTool,
  addLoyaltyPointsTool,
  toggleAccountBlockedTool,
  getUsersCountTool,

  // Outils contributions
  getContributionKPIsTool,
  getContributionEvolutionTool,
  getItemStatisticsTool,
  getContributionGeographicDataTool,
  getContributorDemographicsTool,
  getRecentContributionsTool,
  getAllContributionsTool,

  // Outils abonnements
  getMembershipPlansTool,
  getMembershipPlanByIdTool,

  // Outils utilitaires
  webSearchTool,
  calculateCustomStatsTool,

  // Outils graphiques
  createChartTool,
  createContributionChartTool,
  createItemStatsChartTool,
];

/**
 * Récupère un outil par son nom
 */
export function getToolByName(name: string): AITool | undefined {
  return ALL_AI_TOOLS.find((tool) => tool.name === name);
}
