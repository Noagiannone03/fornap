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
 * Action à afficher dans une ActionCard
 */
export interface ActionCardAction {
  label: string;
  color?: string;
  variant?: 'filled' | 'outline' | 'light';
  icon?: string;
  actionType: string; // Type d'action à exécuter (ex: "delete_user", "block_user")
  actionData: Record<string, any>; // Données pour l'action
  confirmMessage?: string; // Si présent, demander confirmation avant d'exécuter
}

/**
 * ActionCard - Carte interactive avec des boutons d'action
 */
export interface ActionCard {
  type: 'action_card';
  title: string;
  description?: string;
  data?: Record<string, any>; // Données à afficher
  actions: ActionCardAction[];
  variant?: 'info' | 'warning' | 'danger' | 'success';
}

/**
 * NavigationCard - Carte avec un bouton de navigation
 */
export interface NavigationCard {
  type: 'navigation_card';
  title: string;
  description: string;
  path: string; // Chemin de navigation (ex: '/admin/users/123')
  buttonLabel: string;
  icon?: string;
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
 * IMPORTANT:
 * - Tous ces modèles ont le suffixe `:free` et sont confirmés gratuits
 * - Tous supportent le function calling (tools) nécessaire pour l'assistant IA
 */
export const FREE_MODELS = {
  // Modèles performants gratuits qui supportent les tools
  LLAMA_3_3_70B: 'meta-llama/llama-3.3-70b-instruct:free',
  QWEN_72B: 'qwen/qwen-2.5-72b-instruct:free',
  GEMINI_FLASH: 'google/gemini-2.0-flash-thinking-exp:free',
  LLAMA_3_1_70B: 'meta-llama/llama-3.1-70b-instruct:free',

  // Modèle par défaut (meilleur équilibre performance/vitesse/support des tools)
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
