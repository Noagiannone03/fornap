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

const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Modèles gratuits avec fallback
 */
const FREE_MODELS_FALLBACK = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-2-9b-it:free',
  'meta-llama/llama-3.1-8b-instruct:free',
];

/**
 * Classe principale du service OpenRouter
 */
export class OpenRouterService {
  private apiKey: string;
  private defaultModel: string;

  constructor(apiKey: string = OPENROUTER_API_KEY, defaultModel: string = FREE_MODELS_FALLBACK[0]) {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  /**
   * Envoie une requête à OpenRouter
   */
  async chat(
    messages: OpenRouterMessage[],
    tools?: AITool[],
    config?: Partial<ModelConfig>
  ): Promise<OpenRouterResponse> {
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
          max_tokens: config?.maxTokens ?? 4000,
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

          // Si erreur 400 ou 429, essayer le prochain modèle
          if ((response.status === 400 || response.status === 429) && attempt < FREE_MODELS_FALLBACK.length - 1) {
            console.warn(`Model ${modelToUse} failed, trying next model...`);
            continue;
          }

          throw new Error(`OpenRouter API error: ${response.status} - ${errorMessage}`);
        }

        const data: OpenRouterResponse = await response.json();

        // Sauvegarder le modèle qui a fonctionné
        if (attempt > 0) {
          this.defaultModel = modelToUse;
          console.log(`Switched to fallback model: ${modelToUse}`);
        }

        return data;
      } catch (error) {
        if (attempt === FREE_MODELS_FALLBACK.length - 1) {
          console.error('All models failed:', error);
          throw error;
        }
        console.warn(`Attempt ${attempt + 1} failed, trying next model...`);
      }
    }

    throw new Error('All models failed');
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
