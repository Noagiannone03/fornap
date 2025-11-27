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
  Stack,
  ThemeIcon,
} from '@mantine/core';
import {
  IconPlus,
  IconSearch,
  IconDots,
  IconEye,
  IconEdit,
  IconTrash,
  IconDownload,
  IconTools,
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
    <Container size="xl" style={{ position: 'relative', minHeight: 'calc(100vh - 100px)' }}>
      {/* Overlay En Développement */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px',
        }}
      >
        <Paper
         
          p={60}
          radius="xl"
          withBorder
          style={{
            maxWidth: 600,
            textAlign: 'center',
            border: 'none',
          }}
        >
          <Stack align="center" gap="xl">
            <ThemeIcon
              size={120}
              radius="xl"
              variant="white"
              style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)' }}
            >
              <IconTools size={70} color="#667eea" />
            </ThemeIcon>
            <div>
              <Title order={1} c="black" mb="md" style={{ fontSize: '2.5rem' }}>
                Bientôt disponible
              </Title>
              <Text size="xl" c="black" fw={400}>
                La gestion des espaces de coworking arrive prochainement
              </Text>
            </div>
          </Stack>
        </Paper>
      </div>
        <Group justify="space-between" mb="xl">
        <Title order={1} c="black">Gestion des Espaces Coworking</Title>
        <Group>
          <Button leftSection={<IconDownload size={16} />} variant="light" styles={{ label: { color: 'black' } }}>
            Exporter
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/admin/coworking/new')}
            styles={{ label: { color: 'black' } }}
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
            styles={{
              input: { color: 'black' },
              section: { color: 'black' },
            }}
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
            styles={{
              input: { color: 'black' },
              dropdown: { color: 'black' },
            }}
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
            styles={{
              input: { color: 'black' },
              dropdown: { color: 'black' },
            }}
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
