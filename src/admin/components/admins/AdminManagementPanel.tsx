/**
 * ============================================
 * ADMIN MANAGEMENT PANEL
 * ============================================
 * Composant principal pour gérer les administrateurs
 */

import { useState, useEffect } from 'react';
import {
  Stack,
  Button,
  Table,
  Badge,
  Group,
  ActionIcon,
  Text,
  Avatar,
  Loader,
  Center,
  Alert,
  TextInput,
  Select,
  Paper,
  Menu,
  rem,
} from '@mantine/core';
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconDots,
  IconShield,
  IconAlertCircle,
  IconSearch,
  IconCheck,
  IconX,
  IconHistory,
} from '@tabler/icons-react';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';
import { AdminPermission, AdminRole, ADMIN_ROLES_CONFIG } from '../../../shared/types/admin';
import type { AdminUser, AdminUserWithStats } from '../../../shared/types/admin';
import {
  getAllAdminsWithStats,
  toggleAdminActive,
  deleteAdmin,
} from '../../../shared/services/adminService';
import { notifications } from '@mantine/notifications';
import { CreateAdminModal } from './CreateAdminModal';
import { EditAdminModal } from './EditAdminModal';
import { AdminActionHistoryModal } from './AdminActionHistoryModal';
import { modals } from '@mantine/modals';

export function AdminManagementPanel() {
  const { adminProfile, checkPermission } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminUserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [historyModalOpened, setHistoryModalOpened] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const canCreateAdmin = checkPermission(AdminPermission.ADMINS_CREATE);
  const canEditAdmin = checkPermission(AdminPermission.ADMINS_EDIT);
  const canDeleteAdmin = checkPermission(AdminPermission.ADMINS_DELETE);

  // Charger les admins
  const loadAdmins = async () => {
    try {
      setLoading(true);
      const filters: any = {};

      if (roleFilter) {
        filters.role = [roleFilter as AdminRole];
      }

      if (searchQuery) {
        filters.search = searchQuery;
      }

      const data = await getAllAdminsWithStats(filters);
      setAdmins(data);
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des administrateurs',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, [searchQuery, roleFilter]);

  // Activer/Désactiver un admin
  const handleToggleActive = async (admin: AdminUser) => {
    if (!adminProfile) return;

    try {
      await toggleAdminActive(adminProfile.uid, admin.uid, !admin.isActive);
      notifications.show({
        title: 'Succès',
        message: `Admin ${admin.isActive ? 'désactivé' : 'activé'} avec succès`,
        color: 'green',
      });
      loadAdmins();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la modification',
        color: 'red',
      });
    }
  };

  // Supprimer un admin
  const handleDelete = (admin: AdminUser) => {
    if (!adminProfile) return;

    modals.openConfirmModal({
      title: 'Supprimer cet administrateur',
      children: (
        <Text size="sm">
          Êtes-vous sûr de vouloir supprimer <strong>{admin.firstName} {admin.lastName}</strong> ?
          Cette action est irréversible.
        </Text>
      ),
      labels: { confirm: 'Supprimer', cancel: 'Annuler' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteAdmin(adminProfile.uid, admin.uid);
          notifications.show({
            title: 'Succès',
            message: 'Admin supprimé avec succès',
            color: 'green',
          });
          loadAdmins();
        } catch (error: any) {
          notifications.show({
            title: 'Erreur',
            message: error.message || 'Erreur lors de la suppression',
            color: 'red',
          });
        }
      },
    });
  };

  // Éditer un admin
  const handleEdit = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setEditModalOpened(true);
  };

  // Voir l'historique d'un admin
  const handleViewHistory = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setHistoryModalOpened(true);
  };

  // Formater la date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    return new Date(timestamp.toMillis()).toLocaleDateString('fr-FR');
  };

  if (!checkPermission(AdminPermission.ADMINS_VIEW)) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Accès refusé" color="red">
        Vous n'avez pas les permissions pour voir les administrateurs.
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      {/* Header avec actions */}
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Gérer les comptes administrateurs et leurs permissions
        </Text>
        {canCreateAdmin && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreateModalOpened(true)}
          >
            Ajouter un administrateur
          </Button>
        )}
      </Group>

      {/* Filtres */}
      <Paper withBorder p="md">
        <Group>
          <TextInput
            placeholder="Rechercher un admin..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Filtrer par rôle"
            data={Object.values(AdminRole).map((role) => ({
              value: role,
              label: ADMIN_ROLES_CONFIG[role].label,
            }))}
            value={roleFilter}
            onChange={(value) => setRoleFilter(value || null)}
            clearable
            style={{ width: 200 }}
          />
        </Group>
      </Paper>

      {/* Tableau des admins */}
      {loading ? (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      ) : admins.length === 0 ? (
        <Paper withBorder p="xl">
          <Center>
            <Stack align="center" gap="xs">
              <IconShield size={48} color="gray" />
              <Text c="dimmed">Aucun administrateur trouvé</Text>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <Paper withBorder>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Admin</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Rôle</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Dernière connexion</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {admins.map((admin) => {
                const roleConfig = ADMIN_ROLES_CONFIG[admin.role];
                const isCurrentUser = admin.uid === adminProfile?.uid;

                return (
                  <Table.Tr key={admin.uid}>
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar color={roleConfig.color} radius="xl">
                          {admin.firstName.charAt(0)}
                          {admin.lastName.charAt(0)}
                        </Avatar>
                        <div>
                          <Group gap={4}>
                            <Text size="sm" fw={500}>
                              {admin.firstName} {admin.lastName}
                            </Text>
                            {isCurrentUser && (
                              <Badge size="xs" variant="light">
                                Vous
                              </Badge>
                            )}
                          </Group>
                          <Badge
                            size="sm"
                            variant="light"
                            color="blue"
                            leftSection={<IconHistory size={12} />}
                            style={{
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            styles={{
                              root: {
                                '&:hover': {
                                  transform: 'translateY(-1px)',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewHistory(admin);
                            }}
                          >
                            {admin.totalActions || 0} actions
                          </Badge>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{admin.email}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={roleConfig.color} variant="light">
                        {roleConfig.label}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={admin.isActive ? 'green' : 'red'} variant="dot">
                        {admin.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {formatDate(admin.lastLoginAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {!isCurrentUser && (
                        <Menu shadow="md" width={200}>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>

                          <Menu.Dropdown>
                            {canEditAdmin && (
                              <Menu.Item
                                leftSection={<IconPencil style={{ width: rem(14) }} />}
                                onClick={() => handleEdit(admin)}
                              >
                                Modifier
                              </Menu.Item>
                            )}

                            {canEditAdmin && (
                              <Menu.Item
                                leftSection={
                                  admin.isActive ? (
                                    <IconX style={{ width: rem(14) }} />
                                  ) : (
                                    <IconCheck style={{ width: rem(14) }} />
                                  )
                                }
                                onClick={() => handleToggleActive(admin)}
                              >
                                {admin.isActive ? 'Désactiver' : 'Activer'}
                              </Menu.Item>
                            )}

                            {canDeleteAdmin && (
                              <>
                                <Menu.Divider />
                                <Menu.Item
                                  color="red"
                                  leftSection={<IconTrash style={{ width: rem(14) }} />}
                                  onClick={() => handleDelete(admin)}
                                >
                                  Supprimer
                                </Menu.Item>
                              </>
                            )}
                          </Menu.Dropdown>
                        </Menu>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      {/* Modals */}
      <CreateAdminModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        onSuccess={loadAdmins}
      />

      {selectedAdmin && (
        <EditAdminModal
          opened={editModalOpened}
          onClose={() => {
            setEditModalOpened(false);
            setSelectedAdmin(null);
          }}
          admin={selectedAdmin}
          onSuccess={loadAdmins}
        />
      )}

      {selectedAdmin && (
        <AdminActionHistoryModal
          opened={historyModalOpened}
          onClose={() => {
            setHistoryModalOpened(false);
            setSelectedAdmin(null);
          }}
          admin={selectedAdmin}
        />
      )}
    </Stack>
  );
}
