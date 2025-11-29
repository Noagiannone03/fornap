/**
 * Service principal de l'Assistant IA
 * Orchestre les interactions entre l'utilisateur, OpenRouter et les outils
 */

import type {
  ChatMessage,
  AIContext,
  OpenRouterMessage,
  ToolCall,
  ToolResult,
} from '../../types/ai';
import { openRouterService } from './openRouterService';
import { getToolByName, getRelevantTools } from './aiTools';

/**
 * Système prompt pour l'IA
 */
const SYSTEM_PROMPT = `Tu es Guillaume, un assistant IA intelligent pour le panel d'administration FORNAP.

**À PROPOS DE FORNAP:**
FORNAP est une plateforme de gestion de membres avec :
- Système d'abonnement (monthly, annual, lifetime)
- Programme de fidélité avec points
- Système de crowdfunding avec contributions
- Gestion d'événements et de scans QR code
- Base de données Firebase Firestore

**TES CAPACITÉS:**
Tu as accès à de nombreux outils pour:
1. **Gestion des utilisateurs**: Consulter, modifier, bloquer/débloquer des comptes
2. **Analytics**: Calculer des KPIs, analyser les contributions, voir l'évolution
3. **Statistiques**: Démographie, géographie, statistiques par forfait
4. **Visualisation de données**: Créer des graphiques (lignes, barres, secteurs, aires) AVEC EXPORT PNG/CSV
5. **Navigation**: Afficher des boutons pour naviguer vers des pages spécifiques
6. **Actions interactives**: Afficher des cartes d'action pour les opérations sensibles
7. **Recherche web**: Trouver des informations externes
8. **Calculs personnalisés**: Effectuer des analyses statistiques avancées

**CRÉATION DE GRAPHIQUES:**
Tu peux créer des graphiques avec les outils:
- \`create_chart\`: Graphique générique avec données personnalisées
- \`create_contribution_chart\`: Évolution automatique des contributions
- \`create_item_stats_chart\`: Statistiques par forfait (bar ou pie)
Tous les graphiques ont un bouton d'export automatique (PNG et CSV)!

**NAVIGATION INTELLIGENTE:**
Quand l'utilisateur demande "où est X?" ou "comment aller à Y?", utilise \`navigate_to_page\`:
- Dashboard, liste des utilisateurs, détails utilisateur, contributions, analytics, settings, etc.
- L'utilisateur verra un bouton cliquable pour y accéder directement

**ACTIONS SUR LES UTILISATEURS:**
Pour les actions sensibles, TOUJOURS utiliser les outils "prepare_*" qui affichent une carte interactive:
- \`prepare_delete_user\`: Affiche les infos de l'user + bouton de suppression avec confirmation
- \`prepare_toggle_block_user\`: Affiche les infos + bouton bloquer/débloquer
- \`prepare_add_loyalty_points\`: Affiche les infos + bouton pour ajouter/retirer des points

NE JAMAIS utiliser directement \`updateUser\`, \`toggleAccountBlocked\`, etc. pour des actions destructives.
Utilise TOUJOURS les versions "prepare_*" pour que l'admin puisse confirmer visuellement.

**INSTRUCTIONS:**
- Réponds toujours en français
- Sois précis, professionnel et CONCIS
- Utilise les outils à ta disposition pour répondre avec des données réelles
- NE RACONTE PAS le processus des outils que tu utilises en coulisses
- NE DIS PAS "je vais utiliser la fonction X" ou "j'ai généré..."
- Montre directement les résultats (graphiques, données, etc.)
- Donne une réponse courte et claire APRÈS les résultats visuels
- Si tu modifies des données, préviens l'utilisateur et demande confirmation
- Si une donnée est manquante, propose des alternatives

**SÉCURITÉ:**
- Ne modifie jamais de données sans demander confirmation
- Pour les actions sensibles (bloquer compte, modifier points), explique les conséquences
- Respecte la confidentialité des données personnelles

**FORMAT DE RÉPONSE:**
- Va DIRECTEMENT au résultat
- Les graphiques et cartes interactives s'affichent automatiquement
- Ajoute une réponse courte APRÈS les résultats (2-3 lignes max)
- Utilise des listes à puces uniquement si nécessaire
- PAS d'emojis
- Sois direct et efficace

**EXEMPLES:**
Question: "Montre-moi les stats des contributions"
❌ MAUVAIS: "Je vais utiliser la fonction get_contribution_kpis pour obtenir les KPIs, puis create_chart pour générer le graphique..."
✅ BON: [Affiche les graphiques] + "Voici l'évolution des contributions sur les 6 derniers mois. Total: 15,420€ avec 87 contributeurs."

Sois utile, intelligent et CONCIS !`;

/**
 * Classe principale de l'assistant IA
 */
export class AIAssistantService {
  private context: AIContext = {};
  private conversationHistory: ChatMessage[] = [];

  /**
   * Définit le contexte actuel
   */
  setContext(context: Partial<AIContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Récupère le contexte actuel
   */
  getContext(): AIContext {
    return this.context;
  }

  /**
   * Efface l'historique de conversation
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Récupère l'historique de conversation
   */
  getHistory(): ChatMessage[] {
    return this.conversationHistory;
  }

  /**
   * Convertit l'historique en format OpenRouter
   * OPTIMISÉ: Ne garde que les 10 derniers messages pour réduire le contexte
   */
  private convertHistoryToOpenRouter(): OpenRouterMessage[] {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
    ];

    // Ajouter le contexte si disponible
    if (Object.keys(this.context).length > 0) {
      messages.push({
        role: 'system',
        content: `Contexte actuel: ${JSON.stringify(this.context, null, 2)}`,
      });
    }

    // Limiter l'historique aux 10 derniers messages pour optimiser la vitesse
    const MAX_HISTORY_LENGTH = 10;
    const recentHistory = this.conversationHistory.slice(-MAX_HISTORY_LENGTH);

    // Ajouter l'historique récent
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        messages.push({
          role: 'user',
          content: msg.content,
        });
      } else if (msg.role === 'assistant') {
        const openRouterMsg: OpenRouterMessage = {
          role: 'assistant',
          content: msg.content,
        };

        // Ajouter les tool calls si présents
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          openRouterMsg.tool_calls = msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          }));
        }

        messages.push(openRouterMsg);

        // Ajouter les résultats des tools
        if (msg.toolResults) {
          for (const result of msg.toolResults) {
            messages.push({
              role: 'tool',
              content: JSON.stringify(result.result),
              name: result.toolName,
              tool_call_id: result.toolCallId,
            });
          }
        }
      }
    }

    return messages;
  }

  /**
   * Exécute un outil
   */
  private async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    try {
      const tool = getToolByName(toolCall.name);
      if (!tool) {
        throw new Error(`Outil "${toolCall.name}" introuvable`);
      }

      const result = await tool.execute(toolCall.arguments);

      return {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        result,
      };
    } catch (error) {
      console.error(`Error executing tool ${toolCall.name}:`, error);
      return {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        result: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Envoie un message et obtient une réponse
   */
  async chat(userMessage: string): Promise<ChatMessage> {
    // Ajouter le message utilisateur à l'historique
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      status: 'completed',
    };
    this.conversationHistory.push(userMsg);

    try {
      // Convertir l'historique
      const messages = this.convertHistoryToOpenRouter();

      // OPTIMISÉ: Sélectionner uniquement les outils pertinents pour cette requête
      const relevantTools = getRelevantTools(userMessage);

      // Première requête à l'IA avec outils optimisés
      let response = await openRouterService.chat(messages, relevantTools);

      let assistantMessage = response.choices[0].message;
      let toolCalls: ToolCall[] = [];
      let toolResults: ToolResult[] = [];

      // Traiter les tool calls si présents
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        toolCalls = assistantMessage.tool_calls.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        }));

        // Exécuter tous les outils en parallèle
        toolResults = await Promise.all(toolCalls.map((tc) => this.executeTool(tc)));

        // Créer un message assistant temporaire avec les tool calls
        const tempAssistantMsg: ChatMessage = {
          id: `assistant-temp-${Date.now()}`,
          role: 'assistant',
          content: assistantMessage.content || '',
          timestamp: new Date(),
          status: 'completed',
          toolCalls,
          toolResults,
        };
        this.conversationHistory.push(tempAssistantMsg);

        // Convertir à nouveau l'historique avec les résultats des tools
        const messagesWithToolResults = this.convertHistoryToOpenRouter();

        // Deuxième requête pour obtenir la réponse finale (avec mêmes outils)
        response = await openRouterService.chat(messagesWithToolResults, relevantTools);
        assistantMessage = response.choices[0].message;

        // Vérifier que la réponse n'est pas vide
        if (!assistantMessage.content || assistantMessage.content.trim() === '') {
          console.warn('⚠️ Empty response from AI after tool execution, retrying...');

          // Réessayer une fois sans les tool results dans l'historique
          const simpleMessages = this.convertHistoryToOpenRouter();
          simpleMessages.push({
            role: 'user',
            content: 'Merci pour les résultats des outils. Peux-tu maintenant me donner une réponse complète en français basée sur ces données ?'
          });

          response = await openRouterService.chat(simpleMessages, relevantTools);
          assistantMessage = response.choices[0].message;

          // Si toujours vide, utiliser un message par défaut
          if (!assistantMessage.content || assistantMessage.content.trim() === '') {
            console.error('❌ AI returned empty response even after retry');
            assistantMessage.content = 'Les outils ont été exécutés avec succès, mais je n\'ai pas pu générer de réponse. Veuillez réessayer votre question.';
          }
        }

        // Retirer le message temporaire
        this.conversationHistory.pop();
      }

      // Créer le message assistant final
      // Protection supplémentaire: ne jamais renvoyer de contenu vide
      const finalContent = assistantMessage.content?.trim() || 'Désolé, je n\'ai pas pu générer de réponse. Veuillez réessayer.';

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: finalContent,
        timestamp: new Date(),
        status: 'completed',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        toolResults: toolResults.length > 0 ? toolResults : undefined,
      };

      this.conversationHistory.push(assistantMsg);
      return assistantMsg;
    } catch (error) {
      console.error('AI chat error:', error);

      // Message d'erreur personnalisé selon le type d'erreur
      let errorMessage = 'Désolé, une erreur s\'est produite.';
      if (error instanceof Error) {
        if (error.message.includes('Limite de requêtes')) {
          // Afficher le message complet avec le lien
          errorMessage = error.message;
        } else if (error.message.includes('indisponibles')) {
          errorMessage = '🔄 Les modèles d\'IA sont temporairement indisponibles. Veuillez réessayer dans un instant.';
        } else {
          errorMessage = `❌ ${error.message}`;
        }
      }

      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
      this.conversationHistory.push(errorMsg);
      return errorMsg;
    }
  }

  /**
   * Envoie un message en streaming
   */
  async *chatStream(userMessage: string): AsyncGenerator<string, ChatMessage, unknown> {
    // Ajouter le message utilisateur
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      status: 'completed',
    };
    this.conversationHistory.push(userMsg);

    let fullContent = '';
    let assistantMsg: ChatMessage | null = null;

    try {
      const messages = this.convertHistoryToOpenRouter();

      // OPTIMISÉ: Sélectionner uniquement les outils pertinents
      const relevantTools = getRelevantTools(userMessage);

      // Stream la réponse avec outils optimisés
      for await (const chunk of openRouterService.chatStream(messages, relevantTools)) {
        fullContent += chunk;
        yield chunk;
      }

      // Créer le message final
      assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
        status: 'completed',
      };

      this.conversationHistory.push(assistantMsg);
      return assistantMsg;
    } catch (error) {
      console.error('AI stream error:', error);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Erreur: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
      this.conversationHistory.push(errorMsg);
      return errorMsg;
    }
  }

  /**
   * Charge une conversation depuis l'historique
   */
  loadConversation(messages: ChatMessage[]): void {
    this.conversationHistory = messages;
  }

  /**
   * Exporte la conversation
   */
  exportConversation(): ChatMessage[] {
    return this.conversationHistory;
  }
}

// Instance singleton
export const aiAssistant = new AIAssistantService();
