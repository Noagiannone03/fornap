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
    const months = args.months || 6;
    
    // Calculer les dates (X derniers mois depuis maintenant)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const evolution = await getContributionEvolution(startDate, endDate);

    // Prendre les X derniers mois et formater les données
    const data = evolution.slice(-months).map((m) => ({
      mois: m.date,
      montant: m.totalAmount,
      contributions: m.totalCount,
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

    console.log('📊 Item Statistics:', stats);

    // Si aucune donnée, retourner un message d'erreur
    if (!stats || stats.length === 0) {
      return {
        error: 'Aucune contribution trouvée dans la base de données. Impossible de générer le graphique.',
        emptyData: true,
      };
    }

    const data = stats.map((s) => ({
      forfait: s.itemName,
      montant: s.totalAmount,
      contributions: s.count,
    }));

    console.log('📊 Chart Data:', data);

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
 * OUTIL: Navigation vers une page
 */
export const navigateToPageTool: AITool = {
  name: 'navigate_to_page',
  description: 'Affiche un bouton pour naviguer vers une page spécifique du site',
  parameters: {
    type: 'object',
    properties: {
      pageName: {
        type: 'string',
        enum: [
          'dashboard',
          'users',
          'user_detail',
          'contributions',
          'analytics',
          'settings',
          'membership_plans',
        ],
        description: 'Nom de la page vers laquelle naviguer',
      },
      userId: {
        type: 'string',
        description: 'ID de l\'utilisateur (pour user_detail)',
      },
      description: {
        type: 'string',
        description: 'Description de ce qu\'on trouvera sur cette page',
      },
    },
    required: ['pageName'],
  },
  execute: async (args) => {
    // Mapper les noms de pages vers les chemins
    const pathMap: Record<string, string> = {
      dashboard: '/admin/dashboard',
      users: '/admin/users',
      user_detail: `/admin/users/${args.userId || ''}`,
      contributions: '/admin/contributions',
      analytics: '/admin/contributions/analytics',
      settings: '/admin/settings',
      membership_plans: '/admin/membership-plans',
    };

    const titleMap: Record<string, string> = {
      dashboard: 'Tableau de bord',
      users: 'Liste des utilisateurs',
      user_detail: 'Détails de l\'utilisateur',
      contributions: 'Contributions',
      analytics: 'Analyses des contributions',
      settings: 'Paramètres',
      membership_plans: 'Plans d\'abonnement',
    };

    const iconMap: Record<string, string> = {
      dashboard: 'chart',
      users: 'users',
      user_detail: 'user',
      contributions: 'coin',
      analytics: 'chart',
      settings: 'settings',
      membership_plans: 'coin',
    };

    return {
      type: 'navigation_card',
      title: titleMap[args.pageName] || 'Navigation',
      description: args.description || `Cliquez pour accéder à ${titleMap[args.pageName]}`,
      path: pathMap[args.pageName],
      buttonLabel: `Aller à ${titleMap[args.pageName]}`,
      icon: iconMap[args.pageName] || 'arrow',
    };
  },
};

/**
 * OUTIL: Préparer la suppression d'un utilisateur (ActionCard)
 */
export const prepareDeleteUserTool: AITool = {
  name: 'prepare_delete_user',
  description: 'Prépare la suppression d\'un utilisateur en affichant ses infos et un bouton de confirmation',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'L\'UID de l\'utilisateur à supprimer',
      },
    },
    required: ['userId'],
  },
  execute: async (args) => {
    const user = await getUserById(args.userId);
    if (!user) {
      throw new Error(`Utilisateur ${args.userId} introuvable`);
    }

    return {
      type: 'action_card',
      variant: 'danger',
      title: 'Supprimer cet utilisateur',
      description: 'Cette action est irréversible. Vérifiez les informations avant de continuer.',
      data: {
        'Nom complet': `${user.firstName} ${user.lastName}`,
        'Email': user.email,
        'Téléphone': user.phone || '-',
        'Statut': user.status?.isAccountBlocked ? 'Bloqué' : 'Actif',
        'Points de fidélité': user.loyaltyPoints || 0,
        'Date de création': user.registration?.createdAt ? new Date(user.registration.createdAt.toDate()).toLocaleDateString('fr-FR') : '-',
      },
      actions: [
        {
          label: 'Supprimer définitivement',
          color: 'red',
          variant: 'filled',
          icon: 'delete',
          actionType: 'delete_user',
          actionData: {
            userId: args.userId,
          },
          confirmMessage: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.',
        },
      ],
    };
  },
};

/**
 * OUTIL: Préparer le blocage/déblocage d'un compte (ActionCard)
 */
export const prepareToggleBlockUserTool: AITool = {
  name: 'prepare_toggle_block_user',
  description: 'Prépare le blocage ou déblocage d\'un compte en affichant les infos et un bouton',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'L\'UID de l\'utilisateur',
      },
      shouldBlock: {
        type: 'boolean',
        description: 'true pour bloquer, false pour débloquer',
      },
      reason: {
        type: 'string',
        description: 'Raison du blocage/déblocage',
      },
    },
    required: ['userId', 'shouldBlock', 'reason'],
  },
  execute: async (args) => {
    const user = await getUserById(args.userId);
    if (!user) {
      throw new Error(`Utilisateur ${args.userId} introuvable`);
    }

    const action = args.shouldBlock ? 'Bloquer' : 'Débloquer';
    const variant = args.shouldBlock ? 'warning' : 'success';

    return {
      type: 'action_card',
      variant,
      title: `${action} cet utilisateur`,
      description: args.reason,
      data: {
        'Nom complet': `${user.firstName} ${user.lastName}`,
        'Email': user.email,
        'Statut actuel': user.status?.isAccountBlocked ? 'Bloqué' : 'Actif',
        'Action': action,
        'Raison': args.reason,
      },
      actions: [
        {
          label: action,
          color: args.shouldBlock ? 'orange' : 'green',
          variant: 'filled',
          icon: args.shouldBlock ? 'lock' : 'unlock',
          actionType: 'block_user',
          actionData: {
            userId: args.userId,
            shouldBlock: args.shouldBlock,
            reason: args.reason,
          },
          confirmMessage: `Êtes-vous sûr de vouloir ${action.toLowerCase()} cet utilisateur ?`,
        },
      ],
    };
  },
};

/**
 * OUTIL: Préparer l'ajout de points de fidélité (ActionCard)
 */
export const prepareAddLoyaltyPointsTool: AITool = {
  name: 'prepare_add_loyalty_points',
  description: 'Prépare l\'ajout de points de fidélité en affichant les infos et un bouton',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'L\'UID de l\'utilisateur',
      },
      points: {
        type: 'number',
        description: 'Nombre de points à ajouter (peut être négatif pour retirer)',
      },
      reason: {
        type: 'string',
        description: 'Raison de l\'ajout/retrait de points',
      },
    },
    required: ['userId', 'points', 'reason'],
  },
  execute: async (args) => {
    const user = await getUserById(args.userId);
    if (!user) {
      throw new Error(`Utilisateur ${args.userId} introuvable`);
    }

    const isAdding = args.points >= 0;
    const newBalance = (user.loyaltyPoints || 0) + args.points;

    return {
      type: 'action_card',
      variant: 'info',
      title: `${isAdding ? 'Ajouter' : 'Retirer'} des points de fidélité`,
      description: args.reason,
      data: {
        'Nom complet': `${user.firstName} ${user.lastName}`,
        'Email': user.email,
        'Points actuels': user.loyaltyPoints || 0,
        'Points à ajouter': args.points,
        'Nouveau solde': newBalance,
        'Raison': args.reason,
      },
      actions: [
        {
          label: `${isAdding ? 'Ajouter' : 'Retirer'} ${Math.abs(args.points)} points`,
          color: 'blue',
          variant: 'filled',
          icon: 'coins',
          actionType: 'add_loyalty_points',
          actionData: {
            userId: args.userId,
            points: args.points,
            reason: args.reason,
          },
          confirmMessage: `Êtes-vous sûr de vouloir ${isAdding ? 'ajouter' : 'retirer'} ${Math.abs(args.points)} points ?`,
        },
      ],
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

  // Outils de navigation et actions
  navigateToPageTool,
  prepareDeleteUserTool,
  prepareToggleBlockUserTool,
  prepareAddLoyaltyPointsTool,
];

/**
 * Récupère un outil par son nom
 */
export function getToolByName(name: string): AITool | undefined {
  return ALL_AI_TOOLS.find((tool) => tool.name === name);
}

/**
 * OPTIMISATION: Sélectionne intelligemment les outils pertinents selon le contexte
 * Cela réduit la taille du contexte envoyé à l'API et améliore la vitesse
 */
export function getRelevantTools(userMessage: string): AITool[] {
  const messageLower = userMessage.toLowerCase();

  // Outils toujours disponibles (les plus utilisés)
  const coreTools = [
    getUserTool,
    listUsersTool,
    getContributionKPIsTool,
    navigateToPageTool,
  ];

  // Outils de visualisation (si demande de graphique/stats/chart)
  if (
    messageLower.includes('graph') ||
    messageLower.includes('chart') ||
    messageLower.includes('visualis') ||
    messageLower.includes('montre') ||
    messageLower.includes('affiche') ||
    messageLower.includes('évolution') ||
    messageLower.includes('statistique')
  ) {
    coreTools.push(
      createChartTool,
      createContributionChartTool,
      createItemStatsChartTool,
      getContributionEvolutionTool,
      getItemStatisticsTool
    );
  }

  // Outils de modification (si demande de modification/ajout/suppression)
  if (
    messageLower.includes('modif') ||
    messageLower.includes('chang') ||
    messageLower.includes('supprim') ||
    messageLower.includes('bloqu') ||
    messageLower.includes('débloque') ||
    messageLower.includes('point') ||
    messageLower.includes('ajout')
  ) {
    coreTools.push(
      updateUserTool,
      prepareDeleteUserTool,
      prepareToggleBlockUserTool,
      prepareAddLoyaltyPointsTool,
      addLoyaltyPointsTool,
      toggleAccountBlockedTool
    );
  }

  // Outils de contributions (si demande de contributions/crowdfunding)
  if (
    messageLower.includes('contribution') ||
    messageLower.includes('crowdfund') ||
    messageLower.includes('montant') ||
    messageLower.includes('forfait')
  ) {
    coreTools.push(
      getContributionEvolutionTool,
      getItemStatisticsTool,
      getRecentContributionsTool,
      getAllContributionsTool,
      getContributionGeographicDataTool,
      getContributorDemographicsTool
    );
  }

  // Outils de détails utilisateur (si demande spécifique sur un user)
  if (
    messageLower.includes('détail') ||
    messageLower.includes('historique') ||
    messageLower.includes('action') ||
    messageLower.includes('abonnement') ||
    messageLower.includes('membership')
  ) {
    coreTools.push(
      getUserStatsTool,
      getUserActionHistoryTool,
      getUserMembershipHistoryTool
    );
  }

  // Outils de recherche/calculs (si demande de recherche/calcul)
  if (
    messageLower.includes('recherch') ||
    messageLower.includes('calcul') ||
    messageLower.includes('combien') ||
    messageLower.includes('moyenne') ||
    messageLower.includes('total')
  ) {
    coreTools.push(
      calculateCustomStatsTool,
      getUsersCountTool,
      webSearchTool
    );
  }

  // Outils de plans (si demande sur les plans/abonnements)
  if (
    messageLower.includes('plan') ||
    messageLower.includes('abonnement') ||
    messageLower.includes('membership')
  ) {
    coreTools.push(
      getMembershipPlansTool,
      getMembershipPlanByIdTool
    );
  }

  // Dédupliquer les outils
  const uniqueTools = Array.from(new Set(coreTools));

  console.log(`🚀 Optimization: Sending ${uniqueTools.length} tools instead of ${ALL_AI_TOOLS.length}`);

  return uniqueTools;
}
