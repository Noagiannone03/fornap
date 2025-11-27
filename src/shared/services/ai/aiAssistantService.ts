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
import { ALL_AI_TOOLS, getToolByName } from './aiTools';

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
4. **Visualisation de données**: Créer des graphiques (lignes, barres, secteurs, aires)
5. **Recherche web**: Trouver des informations externes
6. **Calculs personnalisés**: Effectuer des analyses statistiques avancées

**CRÉATION DE GRAPHIQUES:**
Tu peux créer des graphiques avec les outils:
- \`create_chart\`: Graphique générique avec données personnalisées
- \`create_contribution_chart\`: Évolution automatique des contributions
- \`create_item_stats_chart\`: Statistiques par forfait (bar ou pie)

Utilise ces outils quand l'utilisateur demande des visualisations ou quand les données sont mieux représentées visuellement.

**INSTRUCTIONS:**
- Réponds toujours en français
- Sois précis et professionnel
- Utilise les outils à ta disposition pour répondre avec des données réelles
- Si tu modifies des données, préviens l'utilisateur et demande confirmation
- Pour les questions complexes, décompose-les en plusieurs étapes
- Cite toujours tes sources (outils utilisés)
- Si une donnée est manquante, propose des alternatives

**SÉCURITÉ:**
- Ne modifie jamais de données sans demander confirmation
- Pour les actions sensibles (bloquer compte, modifier points), explique les conséquences
- Respecte la confidentialité des données personnelles

**FORMAT DE RÉPONSE:**
- Utilise des listes à puces pour la clarté
- Inclus des chiffres et statistiques quand pertinent
- Structure tes réponses avec des sections
- Utilise des emojis modérément pour rendre la lecture agréable

Sois utile, intelligent et proactif !`;

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

    // Ajouter l'historique
    for (const msg of this.conversationHistory) {
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

      // Première requête à l'IA
      let response = await openRouterService.chat(messages, ALL_AI_TOOLS);

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

        // Deuxième requête pour obtenir la réponse finale
        response = await openRouterService.chat(messagesWithToolResults, ALL_AI_TOOLS);
        assistantMessage = response.choices[0].message;

        // Retirer le message temporaire
        this.conversationHistory.pop();
      }

      // Créer le message assistant final
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantMessage.content || '',
        timestamp: new Date(),
        status: 'completed',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        toolResults: toolResults.length > 0 ? toolResults : undefined,
      };

      this.conversationHistory.push(assistantMsg);
      return assistantMsg;
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Désolé, une erreur s'est produite: ${error instanceof Error ? error.message : String(error)}`,
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

      // Stream la réponse
      for await (const chunk of openRouterService.chatStream(messages, ALL_AI_TOOLS)) {
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
