/**
 * Types pour le système d'envoi d'emails
 */

import type { CampaignRecipient } from './campaign';

/**
 * Statut d'un batch d'envoi
 */
export type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Représente un batch d'emails à envoyer
 */
export interface EmailBatch {
  /** ID unique du batch */
  id: string;

  /** ID de la campagne */
  campaignId: string;

  /** Liste des destinataires dans ce batch */
  recipients: CampaignRecipient[];

  /** Index du batch (pour suivi de progression) */
  batchIndex: number;

  /** Nombre total de batches */
  totalBatches: number;

  /** Statut du batch */
  status: BatchStatus;

  /** Date de création */
  createdAt: Date;

  /** Date de traitement */
  processedAt?: Date;

  /** Nombre d'emails envoyés avec succès */
  successCount: number;

  /** Nombre d'emails échoués */
  failureCount: number;

  /** Messages d'erreur si échec */
  errors?: string[];
}

/**
 * Payload pour la queue QStash
 */
export interface QStashEmailPayload {
  /** ID de la campagne */
  campaignId: string;

  /** ID du batch */
  batchId: string;

  /** Liste des IDs des destinataires */
  recipientIds: string[];

  /** Index du batch */
  batchIndex: number;

  /** Nombre total de batches */
  totalBatches: number;

  /** Nombre de tentatives */
  attemptCount?: number;
}

/**
 * Résultat de l'envoi d'un email
 */
export interface SendEmailResult {
  /** ID du destinataire */
  recipientId: string;

  /** Succès ou échec */
  success: boolean;

  /** ID de l'email chez le provider (Resend) */
  messageId?: string;

  /** Message d'erreur si échec */
  error?: string;

  /** Timestamp de l'envoi */
  sentAt?: Date;
}

/**
 * Résultat du traitement d'un batch
 */
export interface BatchProcessResult {
  /** ID du batch */
  batchId: string;

  /** ID de la campagne */
  campaignId: string;

  /** Nombre d'emails envoyés avec succès */
  successCount: number;

  /** Nombre d'emails échoués */
  failureCount: number;

  /** Liste des résultats individuels */
  results: SendEmailResult[];

  /** Timestamp de fin de traitement */
  completedAt: Date;
}

/**
 * Événement webhook de Resend
 */
export interface ResendWebhookEvent {
  /** Type d'événement */
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.complained' | 'email.bounced' | 'email.opened' | 'email.clicked';

  /** Date de création de l'événement */
  created_at: string;

  /** Données de l'événement */
  data: {
    /** ID de l'email chez Resend */
    email_id: string;

    /** Email du destinataire */
    to: string[];

    /** Email de l'expéditeur */
    from: string;

    /** Sujet */
    subject: string;

    /** Données spécifiques selon le type d'événement */
    [key: string]: any;
  };
}

/**
 * Données pour le remplacement des variables de fusion
 */
export interface MergeData {
  first_name: string;
  last_name: string;
  email: string;
  membership_type: string;
  unsubscribe_url: string;
  [key: string]: string; // Pour permettre des variables personnalisées
}

/**
 * Options pour l'envoi d'un email
 */
export interface SendEmailOptions {
  /** Email du destinataire */
  to: string;

  /** Nom du destinataire */
  toName: string;

  /** Sujet */
  subject: string;

  /** Contenu HTML */
  html: string;

  /** Expéditeur - nom */
  fromName: string;

  /** Expéditeur - email */
  fromEmail: string;

  /** Email de réponse */
  replyTo?: string;

  /** Données pour le remplacement des variables */
  mergeData?: MergeData;

  /** Headers personnalisés (pour tracking) */
  headers?: Record<string, string>;

  /** Tags pour catégoriser l'email chez Resend */
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Statistiques d'envoi d'une campagne
 */
export interface CampaignSendingStats {
  /** ID de la campagne */
  campaignId: string;

  /** Nombre total de destinataires */
  totalRecipients: number;

  /** Nombre de batches créés */
  totalBatches: number;

  /** Nombre de batches traités */
  processedBatches: number;

  /** Nombre d'emails envoyés */
  sentCount: number;

  /** Nombre d'emails en attente */
  pendingCount: number;

  /** Nombre d'emails échoués */
  failedCount: number;

  /** Pourcentage de progression */
  progressPercentage: number;

  /** Date de début d'envoi */
  startedAt?: Date;

  /** Date de fin d'envoi */
  completedAt?: Date;

  /** Statut général */
  status: 'idle' | 'sending' | 'completed' | 'failed';
}

/**
 * Réponse de l'API d'envoi
 */
export interface SendCampaignResponse {
  /** Succès ou échec */
  success: boolean;

  /** Message de réponse */
  message: string;

  /** Statistiques de l'envoi */
  stats?: CampaignSendingStats;

  /** Erreurs éventuelles */
  errors?: string[];
}
