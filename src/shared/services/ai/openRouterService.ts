/**
 * Service d'intégration avec OpenRouter API
 * Gère les appels aux modèles d'IA gratuits
 */

import type {
  OpenRouterMessage,
  OpenRouterResponse,
  ModelConfig,
  AITool,
} from '../../types/ai';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Modèles gratuits avec fallback
 * IMPORTANT:
 * - Tous ces modèles doivent avoir le suffixe `:free` pour être gratuits
 * - Tous supportent le function calling (tools) pour l'assistant IA
 * - Modèles optimisés pour la vitesse (plus petits = plus rapides)
 */
const FREE_MODELS_FALLBACK = [
  'google/gemini-2.0-flash-exp:free',            // Gemini 2.0 Flash - TRÈS rapide, excellent pour tools
  'meta-llama/llama-3.2-3b-instruct:free',       // Llama 3.2 3B - Ultra rapide, bon pour tasks simples
  'qwen/qwen-2.5-72b-instruct:free',             // Qwen 2.5 72B - Backup pour tasks complexes
  'meta-llama/llama-3.3-70b-instruct:free',      // Llama 3.3 70B - Dernier recours si les autres échouent
];

/**
 * Classe principale du service OpenRouter
 */
export class OpenRouterService {
  private apiKey: string;
  private defaultModel: string;
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_DELAY = 500; // 500ms entre requêtes (optimisé pour rapidité)

  constructor(apiKey: string = OPENROUTER_API_KEY, defaultModel: string = FREE_MODELS_FALLBACK[0]) {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  /**
   * Attendre avant de faire une requête pour respecter le rate limit
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_DELAY) {
      const waitTime = this.MIN_REQUEST_DELAY - timeSinceLastRequest;
      console.log(`Rate limit protection: waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Envoie une requête à OpenRouter
   * OPTIMISÉ: Essaye tous les modèles, puis réessaye 2 fois depuis le début si échec
   */
  async chat(
    messages: OpenRouterMessage[],
    tools?: AITool[],
    config?: Partial<ModelConfig>
  ): Promise<OpenRouterResponse> {
    const MAX_RETRIES = 2; // Nombre de fois où on réessaye tous les modèles depuis le début

    // Boucle de retry globale
    for (let retryRound = 0; retryRound < MAX_RETRIES; retryRound++) {
      // Attendre le délai minimum entre les requêtes
      await this.waitForRateLimit();

      // Si c'est pas le premier essai, on attend un peu avant de recommencer
      if (retryRound > 0) {
        const waitTime = 3000 * retryRound; // 3s, 6s...
        console.log(`🔄 Retry round ${retryRound + 1}/${MAX_RETRIES}, waiting ${waitTime/1000}s before retrying all models...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Essayer avec le modèle principal, puis fallback
      for (let attempt = 0; attempt < FREE_MODELS_FALLBACK.length; attempt++) {
      try {
        const modelToUse = attempt === 0
          ? (config?.model || this.defaultModel)
          : FREE_MODELS_FALLBACK[attempt];

        const requestBody: any = {
          model: modelToUse,
          messages,
          temperature: config?.temperature ?? 0.7,
          max_tokens: config?.maxTokens ?? 1500, // Réduit de 4000 à 1500 pour plus de rapidité
          top_p: config?.topP ?? 1,
          frequency_penalty: config?.frequencyPenalty ?? 0,
          presence_penalty: config?.presencePenalty ?? 0,
        };

        // Ajouter les outils (function calling) si disponibles
        if (tools && tools.length > 0) {
          requestBody.tools = tools.map((tool) => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            },
          }));
          requestBody.tool_choice = 'auto';
        }

        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'FORNAP AI Assistant',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error?.message || response.statusText;

          // Si erreur 429 (rate limit), essayer le prochain modèle immédiatement
          if (response.status === 429) {
            if (attempt < FREE_MODELS_FALLBACK.length - 1) {
              console.warn(`⚡ Rate limit hit for ${modelToUse}, trying next model immediately...`);
              // Pas d'attente, on essaie directement le suivant
              continue;
            } else {
              throw new Error(
                'Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.'
              );
            }
          }

          // Si erreur 400 ou 404, essayer le prochain modèle
          if ((response.status === 400 || response.status === 404) && attempt < FREE_MODELS_FALLBACK.length - 1) {
            console.warn(`Model ${modelToUse} failed with ${response.status}, trying next model...`);
            continue;
          }

          throw new Error(`Erreur API (${response.status}): ${errorMessage}`);
        }

        const data: OpenRouterResponse = await response.json();

        // Vérifier que la réponse contient bien des données
        if (!data.choices || data.choices.length === 0) {
          throw new Error('Invalid response: no choices returned');
        }

        // Sauvegarder le modèle qui a fonctionné
        if (attempt > 0) {
          this.defaultModel = modelToUse;
          console.log(`✅ Switched to fallback model: ${modelToUse}`);
        } else {
          console.log(`✅ Request successful with model: ${modelToUse}`);
        }

        return data;
      } catch (error) {
        // Si c'est le dernier modèle de cette tentative
        if (attempt === FREE_MODELS_FALLBACK.length - 1) {
          console.error(`All models failed on retry round ${retryRound + 1}:`, error);

          // Si c'est la dernière tentative globale, on throw l'erreur finale
          if (retryRound === MAX_RETRIES - 1) {
            // Si c'est déjà un message personnalisé, le garder
            if (error instanceof Error && error.message.includes('Limite de requêtes')) {
              throw error;
            }
            throw new Error(
              'Tous les modèles sont indisponibles après plusieurs tentatives. Veuillez réessayer dans quelques instants.'
            );
          }
          // Sinon on break pour réessayer tous les modèles depuis le début
          break;
        }
        console.warn(`Attempt ${attempt + 1} failed, trying next model...`);
      }
    }
    }

    // Cette ligne ne devrait jamais être atteinte mais TypeScript l'exige
    throw new Error('Tous les modèles sont indisponibles.');
  }

  /**
   * Envoie une requête en streaming
   */
  async *chatStream(
    messages: OpenRouterMessage[],
    tools?: AITool[],
    config?: Partial<ModelConfig>
  ): AsyncGenerator<string, void, unknown> {
    try {
      const requestBody: any = {
        model: config?.model || this.defaultModel,
        messages,
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens ?? 4000,
        top_p: config?.topP ?? 1,
        frequency_penalty: config?.frequencyPenalty ?? 0,
        presence_penalty: config?.presencePenalty ?? 0,
        stream: true,
      };

      // Ajouter les outils si disponibles
      if (tools && tools.length > 0) {
        requestBody.tools = tools.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        }));
        requestBody.tool_choice = 'auto';
      }

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'FORNAP AI Assistant',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Ignorer les erreurs de parsing JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Error streaming from OpenRouter:', error);
      throw error;
    }
  }

  /**
   * Change le modèle par défaut
   */
  setDefaultModel(model: string): void {
    this.defaultModel = model;
  }

  /**
   * Récupère le modèle actuel
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }
}

// Instance singleton
export const openRouterService = new OpenRouterService();
