import {
  Container,
  Title,
  Paper,
  Group,
  Button,
  TextInput,
  Select,
  Table,
  Badge,
  ActionIcon,
  Menu,
  Text,
  Progress,
} from '@mantine/core';
import {
  IconPlus,
  IconSearch,
  IconDots,
  IconEye,
  IconEdit,
  IconTrash,
  IconDownload,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

const mockSpaces = [
  {
    id: '1',
    name: 'Espace Créatif A',
    type: 'hot_desk',
    status: 'available',
    capacity: 10,
    currentOccupancy: 3,
    pricing: { dailyRate: 15 },
  },
  {
    id: '2',
    name: 'Bureau Privé 1',
    type: 'private_office',
    status: 'occupied',
    capacity: 4,
    currentOccupancy: 4,
    pricing: { dailyRate: 50 },
  },
  {
    id: '3',
    name: 'Salle de Réunion B',
    type: 'meeting_room',
    status: 'available',
    capacity: 8,
    currentOccupancy: 0,
    pricing: { dailyRate: 80 },
  },
  {
    id: '4',
    name: 'Bureau Dédié C',
    type: 'dedicated_desk',
    status: 'maintenance',
    capacity: 1,
    currentOccupancy: 0,
    pricing: { dailyRate: 25 },
  },
];

const spaceTypeLabels: Record<string, string> = {
  hot_desk: 'Hot Desk',
  dedicated_desk: 'Bureau Dédié',
  private_office: 'Bureau Privé',
  meeting_room: 'Salle Réunion',
  conference_room: 'Salle Conférence',
  phone_booth: 'Cabine Téléphone',
  event_space: 'Espace Événement',
};

const statusColors: Record<string, string> = {
  available: 'green',
  occupied: 'red',
  maintenance: 'orange',
  reserved: 'blue',
};

export function CoworkingListPage() {
  const navigate = useNavigate();

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Gestion des Espaces Coworking</Title>
        <Group>
          <Button leftSection={<IconDownload size={16} />} variant="light">
            Exporter
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/admin/coworking/new')}
          >
            Nouvel Espace
          </Button>
        </Group>
      </Group>

      {/* Filters */}
      <Paper withBorder p="md" mb="md" radius="md">
        <Group>
          <TextInput
            placeholder="Rechercher un espace..."
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Type"
            data={[
              { value: 'all', label: 'Tous' },
              { value: 'hot_desk', label: 'Hot Desk' },
              { value: 'dedicated_desk', label: 'Bureau Dédié' },
              { value: 'private_office', label: 'Bureau Privé' },
              { value: 'meeting_room', label: 'Salle Réunion' },
            ]}
            clearable
          />
          <Select
            placeholder="Statut"
            data={[
              { value: 'all', label: 'Tous' },
              { value: 'available', label: 'Disponible' },
              { value: 'occupied', label: 'Occupé' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'reserved', label: 'Réservé' },
            ]}
            clearable
          />
        </Group>
      </Paper>

      {/* Spaces Table */}
      <Paper withBorder radius="md" shadow="sm">
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nom</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Occupation</Table.Th>
                <Table.Th>Tarif/jour</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {mockSpaces.map((space) => {
                const occupancyPercent = (space.currentOccupancy / space.capacity) * 100;
                return (
                  <Table.Tr key={space.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {space.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">
                        {spaceTypeLabels[space.type]}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={statusColors[space.status]} variant="dot">
                        {space.status === 'available'
                          ? 'Disponible'
                          : space.status === 'occupied'
                          ? 'Occupé'
                          : space.status === 'maintenance'
                          ? 'Maintenance'
                          : 'Réservé'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Text size="sm" mb={4}>
                          {space.currentOccupancy} / {space.capacity}
                        </Text>
                        <Progress
                          value={occupancyPercent}
                          color={occupancyPercent === 100 ? 'red' : 'blue'}
                          size="sm"
                        />
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {space.pricing.dailyRate}€
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <ActionIcon variant="subtle" color="blue">
                          <IconEye size={16} />
                        </ActionIcon>
                        <Menu shadow="md" width={200}>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item leftSection={<IconEdit size={14} />}>
                              Modifier
                            </Menu.Item>
                            <Menu.Divider />
                            <Menu.Item color="red" leftSection={<IconTrash size={14} />}>
                              Supprimer
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
    </Container>
  );
}
