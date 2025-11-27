/**
 * Types pour le système d'IA Assistant
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Types de rôles dans la conversation
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

/**
 * Statut d'un message
 */
export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'error';

/**
 * Message dans la conversation
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  error?: string;
}

/**
 * Appel d'un outil par l'IA
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

/**
 * Résultat d'un appel d'outil
 */
export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: any;
  error?: string;
}

/**
 * Conversation IA persistante
 */
export interface AIConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userId: string; // Admin qui a créé la conversation
}

/**
 * Contexte pour l'IA
 */
export interface AIContext {
  currentPage?: string;
  selectedUser?: string;
  selectedContribution?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
}

/**
 * Outil disponible pour l'IA
 */
export interface AITool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  execute: (args: Record<string, any>) => Promise<any>;
}

/**
 * Configuration du modèle OpenRouter
 */
export interface ModelConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * Modèles gratuits disponibles sur OpenRouter
 */
export const FREE_MODELS = {
  // Modèles performants gratuits
  QWEN_32B: 'qwen/qwen-2.5-72b-instruct:free',
  LLAMA_70B: 'meta-llama/llama-3.3-70b-instruct:free',
  MISTRAL_7B: 'mistralai/mistral-7b-instruct:free',
  GEMMA_9B: 'google/gemma-2-9b-it:free',

  // Modèle par défaut (équilibre performance/vitesse)
  DEFAULT: 'meta-llama/llama-3.3-70b-instruct:free',
} as const;

/**
 * Réponse de l'API OpenRouter
 */
export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Message formatté pour OpenRouter
 */
export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}
