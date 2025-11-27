# 🤖 Guide Complet : Assistant IA FORNAP

## 📋 Vue d'ensemble

Un assistant IA intelligent et puissant intégré au panel d'administration FORNAP, offrant des capacités similaires à Cursor AI pour interagir avec vos données Firebase, effectuer des analyses et gérer votre plateforme.

**Modèle utilisé** : Llama 3.3 70B (gratuit via OpenRouter)
**API Key** : Déjà configurée dans le code

## ✨ Fonctionnalités

### 🎯 Capacités principales

1. **Accès complet à Firebase**
   - Lecture de données (users, contributions, analytics)
   - Modifications de données (avec confirmation)
   - Requêtes complexes sur la base de données

2. **Analytics avancés**
   - KPIs en temps réel
   - Évolution temporelle
   - Statistiques par segment
   - Données démographiques et géographiques

3. **Recherche web**
   - Intégration DuckDuckGo
   - Recherche d'informations externes
   - Références documentaires

4. **Calculs personnalisés**
   - Statistiques avancées
   - Agrégations complexes
   - Analyses prédictives

## 🚀 Comment utiliser

### Option 1 : Page dédiée (recommandé)

Ajoutez la route dans votre router admin :

```tsx
import { AIAssistantPage } from './admin/pages/AIAssistantPage';

// Dans votre router
<Route path="/admin/ai-assistant" element={<AIAssistantPage />} />
```

### Option 2 : Bouton flottant accessible partout

Ajoutez dans votre layout admin :

```tsx
import { AIAssistantFab } from './admin/components/AIAssistant';

function AdminLayout() {
  return (
    <>
      {/* Votre contenu existant */}
      <Outlet />

      {/* Bouton flottant en bas à droite */}
      <AIAssistantFab />
    </>
  );
}
```

## 💡 Exemples de questions

### Analytics et statistiques

- "Combien d'utilisateurs actifs avons-nous ?"
- "Quel est le montant total des contributions ce mois ?"
- "Montre-moi l'évolution des contributions sur les 6 derniers mois"
- "Quelle est la tranche d'âge la plus représentée ?"
- "Top 10 des codes postaux avec le plus de contributions"
- "Quel est le forfait le plus populaire ?"

### Gestion des utilisateurs

- "Montre-moi les 10 derniers utilisateurs créés"
- "Combien de points de fidélité a l'utilisateur [UID] ?"
- "Quel est l'historique d'abonnement de l'utilisateur [email] ?"
- "Liste les utilisateurs avec un compte bloqué"
- "Combien d'utilisateurs ont un abonnement annual ?"

### Recherche et informations

- "Recherche des informations sur Firebase Firestore"
- "Comment optimiser les requêtes Firestore ?"
- "Quelle est la différence entre monthly et annual ?"
- "Explique-moi le système de points de fidélité"

### Calculs complexes

- "Calcule la moyenne des contributions par forfait"
- "Quel est le montant médian des contributions ?"
- "Combien de conversions vers membership ce mois ?"
- "Quel est le taux de conversion du crowdfunding ?"

## 🛠️ Outils disponibles

L'IA a accès à **22 outils** différents :

### Gestion des utilisateurs (9 outils)
- `get_user` - Récupérer les détails d'un utilisateur
- `list_users` - Lister tous les utilisateurs
- `get_user_stats` - Statistiques détaillées d'un utilisateur
- `get_user_action_history` - Historique des actions
- `get_user_membership_history` - Historique des abonnements
- `update_user` - Modifier un utilisateur ⚠️
- `add_loyalty_points` - Ajouter des points de fidélité ⚠️
- `toggle_account_blocked` - Bloquer/débloquer un compte ⚠️
- `get_users_count` - Compter les utilisateurs

### Analytics contributions (7 outils)
- `get_contribution_kpis` - KPIs globaux
- `get_contribution_evolution` - Évolution dans le temps
- `get_item_statistics` - Stats par forfait
- `get_contribution_geographic_data` - Distribution géographique
- `get_contributor_demographics` - Démographie des contributeurs
- `get_recent_contributions` - Dernières contributions
- `get_all_contributions` - Toutes les contributions

### Abonnements (2 outils)
- `get_membership_plans` - Liste des plans disponibles
- `get_membership_plan_by_id` - Détails d'un plan

### Utilitaires (4 outils)
- `web_search` - Recherche web (DuckDuckGo)
- `calculate_custom_stats` - Calculs statistiques personnalisés

⚠️ = Outil sensible (modifie des données)

## 🔒 Sécurité

### Protections en place

1. **Confirmation avant modification**
   - L'IA indique clairement dans son prompt de toujours demander confirmation
   - Les outils sensibles sont marqués comme nécessitant une validation
   - L'utilisateur doit explicitement confirmer les actions

2. **Traçabilité complète**
   - Toutes les actions sont enregistrées dans `actionHistory`
   - L'UID de l'admin est requis pour les modifications
   - Historique consultable dans le profil utilisateur

3. **Limitation des données**
   - Résultats limités (max 100 users, 50 legacy members)
   - Pagination automatique
   - Évite la surcharge

4. **Respect de la confidentialité**
   - Les données transitent par OpenRouter (API sécurisée)
   - Pas de stockage des conversations par défaut
   - Données personnelles filtrées si nécessaire

## 📊 Interface utilisateur

### Composants de l'UI

1. **AIAssistantPanel**
   - Interface de chat principale
   - Affichage des messages
   - Visualisation des outils utilisés
   - Fonction de copie
   - Auto-scroll

2. **AIAssistantFab**
   - Bouton flottant en bas à droite
   - Animation gradient (bleu → cyan)
   - Ouvre une modal avec le chat

3. **AIAssistantPage**
   - Page complète dédiée
   - Panneau latéral d'information
   - Exemples de questions
   - Documentation des capacités

### Fonctionnalités de l'interface

- ✅ Messages en temps réel
- ✅ Indication de chargement
- ✅ Affichage des outils utilisés (dépliable)
- ✅ Copie des réponses en un clic
- ✅ Effacement de la conversation
- ✅ Historique de conversation
- ✅ Support du Markdown
- ✅ Badges pour les outils

## 🎯 Cas d'usage pratiques

### 1. Dashboard quotidien

```
"Donne-moi un résumé de la journée :
- Nouveaux utilisateurs
- Contributions du jour
- Points de fidélité distribués"
```

### 2. Analyse de performance

```
"Compare les contributions entre ce mois et le mois dernier.
Quelles sont les tendances ?"
```

### 3. Gestion des membres

```
"Trouve tous les utilisateurs dont l'abonnement expire
dans les 7 prochains jours"
```

### 4. Support client

```
"L'utilisateur avec l'email [email] ne voit pas ses points.
Peux-tu vérifier son compte et son historique ?"
```

### 5. Recherche d'information

```
"Comment puis-je améliorer les performances de mes
requêtes Firestore ? Recherche des best practices"
```

## 🔧 Configuration avancée

### Changer de modèle IA

Dans `src/shared/services/ai/openRouterService.ts` :

```typescript
import { openRouterService } from './shared/services/ai/openRouterService';

// Changer pour un modèle plus rapide
openRouterService.setDefaultModel('qwen/qwen-2.5-72b-instruct:free');

// Ou un modèle plus petit
openRouterService.setDefaultModel('mistralai/mistral-7b-instruct:free');
```

### Modèles gratuits disponibles

- **Llama 3.3 70B** (par défaut) - Excellent équilibre performance/vitesse
- **Qwen 2.5 72B** - Très performant sur les tâches analytiques
- **Mistral 7B** - Rapide, bon pour les questions simples
- **Gemma 2 9B** - Bon compromis

### Modifier le système prompt

Dans `src/shared/services/ai/aiAssistantService.ts`, modifiez la constante `SYSTEM_PROMPT` :

```typescript
const SYSTEM_PROMPT = `
  Ton prompt personnalisé...
`;
```

### Ajouter un nouvel outil

Dans `src/shared/services/ai/aiTools.ts` :

```typescript
export const myCustomTool: AITool = {
  name: 'my_tool_name',
  description: 'Ce que fait l\'outil',
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Description du paramètre',
      },
    },
    required: ['param1'],
  },
  execute: async (args) => {
    // Votre logique ici
    const result = await yourFunction(args.param1);
    return result;
  },
};

// N'oubliez pas de l'ajouter à ALL_AI_TOOLS
export const ALL_AI_TOOLS = [
  // ... outils existants
  myCustomTool,
];
```

## 🐛 Dépannage

### L'IA ne répond pas

1. Vérifiez la console du navigateur
2. Vérifiez que l'API Key est correcte
3. Testez la connexion à OpenRouter
4. Vérifiez votre connexion internet

### Erreurs de permissions Firebase

1. L'IA utilise les mêmes permissions que l'utilisateur connecté
2. Vérifiez que l'utilisateur est admin
3. Vérifiez les règles Firestore

### L'IA ne trouve pas les données

1. Vérifiez que les données existent dans Firebase
2. Essayez de reformuler la question
3. Soyez plus spécifique (utilisez des UIDs plutôt que des emails)

### Performance lente

1. Limitez le nombre de résultats demandés
2. Utilisez un modèle plus rapide (Mistral 7B)
3. Évitez les questions trop complexes nécessitant de nombreux outils

## 📚 Resources

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Llama 3.3 Model Card](https://openrouter.ai/models/meta-llama/llama-3.3-70b-instruct)
- [DATABASE.md - Structure de la BDD](/docs/database/DATABASE.md)

## 🎉 Conclusion

Vous avez maintenant un assistant IA complet et puissant pour gérer FORNAP !

**Prochaines améliorations possibles :**
- Sauvegarde des conversations dans Firebase
- Génération de rapports PDF
- Notifications proactives
- Suggestions intelligentes basées sur le contexte
- Support multimodal (images, graphiques)

Profitez de cette IA pour gagner du temps et prendre de meilleures décisions ! 🚀
