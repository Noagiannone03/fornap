import { useState } from 'react';
import {
  Container,
  Title,
  Paper,
  TextInput,
  Group,
  Button,
  Select,
  Table,
  Badge,
  ActionIcon,
  Menu,
  Avatar,
  Text,
  Stack,
  Pagination,
  MultiSelect,
} from '@mantine/core';
import {
  IconSearch,
  
  IconDownload,
  IconPlus,
  IconDots,
  IconEye,
  IconEdit,
  IconTrash,
  IconMail,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

// Mock data - À remplacer par des vraies données de Firebase
const mockUsers = [
  {
    uid: '1',
    firstName: 'Marie',
    lastName: 'Dupont',
    email: 'marie.dupont@example.com',
    membership: { type: 'annual', status: 'active' },
    loyaltyPoints: 250,
    createdAt: '2024-01-15',
    tags: ['actif', 'vip'],
  },
  {
    uid: '2',
    firstName: 'Jean',
    lastName: 'Martin',
    email: 'jean.martin@example.com',
    membership: { type: 'monthly', status: 'active' },
    loyaltyPoints: 120,
    createdAt: '2024-02-20',
    tags: ['actif'],
  },
  {
    uid: '3',
    firstName: 'Sophie',
    lastName: 'Bernard',
    email: 'sophie.bernard@example.com',
    membership: { type: 'honorary', status: 'active' },
    loyaltyPoints: 450,
    createdAt: '2023-11-10',
    tags: ['actif', 'vip', 'exposant'],
  },
  {
    uid: '4',
    firstName: 'Pierre',
    lastName: 'Dubois',
    email: 'pierre.dubois@example.com',
    membership: { type: 'monthly', status: 'expired' },
    loyaltyPoints: 80,
    createdAt: '2024-03-05',
    tags: ['inactif'],
  },
];

const membershipTypeColors: Record<string, string> = {
  monthly: 'blue',
  annual: 'green',
  honorary: 'grape',
};

const membershipStatusColors: Record<string, string> = {
  active: 'green',
  inactive: 'gray',
  pending: 'orange',
  expired: 'red',
};

export function UsersListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [membershipType, setMembershipType] = useState<string | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const handleViewUser = (uid: string) => {
    navigate(`/admin/users/${uid}`);
  };

  const handleEditUser = (uid: string) => {
    navigate(`/admin/users/${uid}/edit`);
  };

  const handleDeleteUser = (uid: string) => {
    // Implémenter la suppression
    console.log('Delete user:', uid);
  };

  const handleSendEmail = (email: string) => {
    // Implémenter l'envoi d'email
    console.log('Send email to:', email);
  };

  const handleExport = () => {
    // Implémenter l'export CSV/Excel
    console.log('Export users');
  };

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Gestion des Utilisateurs</Title>
        <Group>
          <Button
            leftSection={<IconDownload size={16} />}
            variant="light"
            onClick={handleExport}
          >
            Exporter
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/admin/users/new')}
          >
            Nouvel Utilisateur
          </Button>
        </Group>
      </Group>

      {/* Filters */}
      <Paper withBorder p="md" mb="md" radius="md">
        <Stack gap="md">
          <TextInput
            placeholder="Rechercher par nom, email..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />

          <Group>
            <Select
              placeholder="Type d'abonnement"
              data={[
                { value: 'all', label: 'Tous' },
                { value: 'monthly', label: 'Mensuel' },
                { value: 'annual', label: 'Annuel' },
                { value: 'honorary', label: 'Honoraire' },
              ]}
              value={membershipType}
              onChange={setMembershipType}
              clearable
              style={{ flex: 1 }}
            />

            <Select
              placeholder="Statut"
              data={[
                { value: 'all', label: 'Tous' },
                { value: 'active', label: 'Actif' },
                { value: 'inactive', label: 'Inactif' },
                { value: 'pending', label: 'En attente' },
                { value: 'expired', label: 'Expiré' },
              ]}
              value={membershipStatus}
              onChange={setMembershipStatus}
              clearable
              style={{ flex: 1 }}
            />

            <MultiSelect
              placeholder="Tags"
              data={[
                { value: 'actif', label: 'Actif' },
                { value: 'inactif', label: 'Inactif' },
                { value: 'vip', label: 'VIP' },
                { value: 'exposant', label: 'Exposant' },
                { value: 'atelier_couture', label: 'Atelier Couture' },
              ]}
              value={selectedTags}
              onChange={setSelectedTags}
              clearable
              style={{ flex: 1 }}
            />
          </Group>
        </Stack>
      </Paper>

      {/* Users Table */}
      <Paper withBorder radius="md" shadow="sm">
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Utilisateur</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Abonnement</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Points</Table.Th>
                <Table.Th>Tags</Table.Th>
                <Table.Th>Inscription</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {mockUsers.map((user) => (
                <Table.Tr key={user.uid}>
                  <Table.Td>
                    <Group gap="sm">
                      <Avatar color="indigo" radius="xl">
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </Avatar>
                      <div>
                        <Text size="sm" fw={500}>
                          {user.firstName} {user.lastName}
                        </Text>
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{user.email}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={membershipTypeColors[user.membership.type]} variant="light">
                      {user.membership.type === 'monthly'
                        ? 'Mensuel'
                        : user.membership.type === 'annual'
                        ? 'Annuel'
                        : 'Honoraire'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={membershipStatusColors[user.membership.status]} variant="dot">
                      {user.membership.status === 'active'
                        ? 'Actif'
                        : user.membership.status === 'expired'
                        ? 'Expiré'
                        : user.membership.status === 'pending'
                        ? 'En attente'
                        : 'Inactif'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {user.loyaltyPoints}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {user.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} size="xs" variant="outline">
                          {tag}
                        </Badge>
                      ))}
                      {user.tags.length > 2 && (
                        <Badge size="xs" variant="outline">
                          +{user.tags.length - 2}
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => handleViewUser(user.uid)}
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                      <Menu shadow="md" width={200}>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEdit size={14} />}
                            onClick={() => handleEditUser(user.uid)}
                          >
                            Modifier
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconMail size={14} />}
                            onClick={() => handleSendEmail(user.email)}
                          >
                            Envoyer un email
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => handleDeleteUser(user.uid)}
                          >
                            Supprimer
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <Group justify="space-between" p="md">
          <Text size="sm" c="dimmed">
            Affichage de 1 à {mockUsers.length} sur {mockUsers.length} utilisateurs
          </Text>
          <Pagination total={1} value={page} onChange={setPage} />
        </Group>
      </Paper>
    </Container>
  );
}
