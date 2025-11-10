/**
 * ============================================
 * ADMIN ACTION HISTORY MODAL
 * ============================================
 * Modale pour afficher l'historique détaillé des actions d'un admin
 */

import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Timeline,
  Text,
  Badge,
  Group,
  Loader,
  Center,
  Alert,
  Paper,
  ScrollArea,
  Select,
  Button,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconUser,
  IconCalendar,
  IconShield,
  IconSettings,
  IconLogin,
  IconLogout,
  IconDownload,
} from '@tabler/icons-react';
import { AdminActionType } from '../../../shared/types/admin';
import type { AdminActionHistory, AdminUser } from '../../../shared/types/admin';
import { getAdminActionHistory, exportAdminHistory } from '../../../shared/services/adminService';
import { notifications } from '@mantine/notifications';

interface AdminActionHistoryModalProps {
  opened: boolean;
  onClose: () => void;
  admin: AdminUser;
}

/**
 * Configuration des couleurs et icônes par type d'action
 */
const ACTION_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  // Utilisateurs
  [AdminActionType.USER_CREATED]: { color: 'green', icon: IconUser, label: 'Utilisateur créé' },
  [AdminActionType.USER_UPDATED]: { color: 'blue', icon: IconUser, label: 'Utilisateur modifié' },
  [AdminActionType.USER_DELETED]: { color: 'red', icon: IconUser, label: 'Utilisateur supprimé' },
  [AdminActionType.USER_BLOCKED]: { color: 'orange', icon: IconUser, label: 'Utilisateur bloqué' },
  [AdminActionType.USER_UNBLOCKED]: { color: 'green', icon: IconUser, label: 'Utilisateur débloqué' },

  // Événements
  [AdminActionType.EVENT_CREATED]: { color: 'green', icon: IconCalendar, label: 'Événement créé' },
  [AdminActionType.EVENT_UPDATED]: { color: 'blue', icon: IconCalendar, label: 'Événement modifié' },
  [AdminActionType.EVENT_DELETED]: { color: 'red', icon: IconCalendar, label: 'Événement supprimé' },
  [AdminActionType.EVENT_PUBLISHED]: { color: 'teal', icon: IconCalendar, label: 'Événement publié' },
  [AdminActionType.EVENT_CANCELLED]: { color: 'orange', icon: IconCalendar, label: 'Événement annulé' },

  // Abonnements
  [AdminActionType.MEMBERSHIP_CREATED]: { color: 'green', icon: IconShield, label: 'Abonnement créé' },
  [AdminActionType.MEMBERSHIP_UPDATED]: { color: 'blue', icon: IconShield, label: 'Abonnement modifié' },
  [AdminActionType.MEMBERSHIP_DELETED]: { color: 'red', icon: IconShield, label: 'Abonnement supprimé' },
  [AdminActionType.MEMBERSHIP_RENEWED]: { color: 'teal', icon: IconShield, label: 'Abonnement renouvelé' },

  // Admins
  [AdminActionType.ADMIN_CREATED]: { color: 'green', icon: IconShield, label: 'Admin créé' },
  [AdminActionType.ADMIN_UPDATED]: { color: 'blue', icon: IconShield, label: 'Admin modifié' },
  [AdminActionType.ADMIN_DELETED]: { color: 'red', icon: IconShield, label: 'Admin supprimé' },
  [AdminActionType.ADMIN_ROLE_CHANGED]: { color: 'violet', icon: IconShield, label: 'Rôle modifié' },
  [AdminActionType.ADMIN_ACTIVATED]: { color: 'green', icon: IconShield, label: 'Admin activé' },
  [AdminActionType.ADMIN_DEACTIVATED]: { color: 'orange', icon: IconShield, label: 'Admin désactivé' },

  // Authentification
  [AdminActionType.ADMIN_LOGIN]: { color: 'green', icon: IconLogin, label: 'Connexion' },
  [AdminActionType.ADMIN_LOGOUT]: { color: 'gray', icon: IconLogout, label: 'Déconnexion' },
  [AdminActionType.ADMIN_LOGIN_FAILED]: { color: 'red', icon: IconLogin, label: 'Connexion échouée' },

  // Paramètres
  [AdminActionType.SETTINGS_UPDATED]: { color: 'blue', icon: IconSettings, label: 'Paramètres modifiés' },

  // Autres
  [AdminActionType.DATA_EXPORTED]: { color: 'cyan', icon: IconDownload, label: 'Export de données' },
  [AdminActionType.BULK_ACTION]: { color: 'violet', icon: IconSettings, label: 'Action groupée' },
};

export function AdminActionHistoryModal({ opened, onClose, admin }: AdminActionHistoryModalProps) {
  const [history, setHistory] = useState<AdminActionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (opened) {
      loadHistory();
    }
  }, [opened, filterType]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const actionType = filterType ? (filterType as AdminActionType) : undefined;
      const data = await getAdminActionHistory(admin.uid, 100, actionType);
      setHistory(data);
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement de l\'historique',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const fullHistory = await exportAdminHistory(admin.uid);

      // Convertir en JSON et télécharger
      const dataStr = JSON.stringify(fullHistory, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `admin_${admin.firstName}_${admin.lastName}_history_${new Date().toISOString()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      notifications.show({
        title: 'Succès',
        message: 'Historique exporté avec succès',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'export',
        color: 'red',
      });
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp.toMillis());
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getActionConfig = (actionType: AdminActionType) => {
    return ACTION_CONFIG[actionType] || {
      color: 'gray',
      icon: IconSettings,
      label: actionType,
    };
  };

  // Créer la liste des types d'actions pour le filtre
  const actionTypeOptions = [
    { value: '', label: 'Tous les types' },
    ...Object.keys(ACTION_CONFIG).map((key) => ({
      value: key,
      label: ACTION_CONFIG[key].label,
    })),
  ];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Text fw={600}>
            Historique de {admin.firstName} {admin.lastName}
          </Text>
          <Badge color="gray" variant="light">
            {history.length} actions
          </Badge>
        </Group>
      }
      size="xl"
    >
      <Stack gap="md">
        {/* Filtres et actions */}
        <Group justify="space-between">
          <Select
            placeholder="Filtrer par type d'action"
            data={actionTypeOptions}
            value={filterType}
            onChange={(value) => setFilterType(value)}
            clearable
            style={{ flex: 1 }}
          />
          <Button
            leftSection={<IconDownload size={16} />}
            variant="light"
            onClick={handleExport}
            loading={exporting}
          >
            Exporter
          </Button>
        </Group>

        {/* Contenu */}
        {loading ? (
          <Center py="xl">
            <Loader size="lg" />
          </Center>
        ) : history.length === 0 ? (
          <Alert icon={<IconAlertCircle size={16} />} color="blue">
            Aucune action trouvée pour cet administrateur.
          </Alert>
        ) : (
          <ScrollArea h={500}>
            <Timeline active={-1} bulletSize={24} lineWidth={2}>
              {history.map((action, index) => {
                const config = getActionConfig(action.actionType);
                const Icon = config.icon;

                return (
                  <Timeline.Item
                    key={index}
                    bullet={<Icon size={12} />}
                    color={config.color}
                    title={
                      <Group gap="xs">
                        <Badge color={config.color} variant="light" size="sm">
                          {config.label}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          {formatDate(action.timestamp)}
                        </Text>
                      </Group>
                    }
                  >
                    <Text size="sm" mt={4}>
                      {action.description}
                    </Text>

                    {/* Afficher les changements si disponibles */}
                    {action.changes && (
                      <Paper withBorder p="xs" mt="xs" bg="gray.0">
                        <Stack gap={4}>
                          {action.changes.before && (
                            <Text size="xs" c="dimmed">
                              <strong>Avant:</strong>{' '}
                              {JSON.stringify(action.changes.before, null, 2)}
                            </Text>
                          )}
                          {action.changes.after && (
                            <Text size="xs" c="dimmed">
                              <strong>Après:</strong>{' '}
                              {JSON.stringify(action.changes.after, null, 2)}
                            </Text>
                          )}
                        </Stack>
                      </Paper>
                    )}
                  </Timeline.Item>
                );
              })}
            </Timeline>
          </ScrollArea>
        )}
      </Stack>
    </Modal>
  );
}
