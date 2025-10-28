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

const mockEvents = [
  {
    id: '1',
    title: 'Workshop Couture',
    type: 'workshop',
    status: 'published',
    startDate: '2024-06-15',
    registeredCount: 24,
    capacity: 30,
  },
  {
    id: '2',
    title: 'Soirée Networking',
    type: 'networking',
    status: 'published',
    startDate: '2024-06-20',
    registeredCount: 45,
    capacity: 50,
  },
  {
    id: '3',
    title: 'Exposition Artisans',
    type: 'exhibition',
    status: 'draft',
    startDate: '2024-07-01',
    registeredCount: 0,
    capacity: 100,
  },
];

const eventTypeColors: Record<string, string> = {
  workshop: 'blue',
  conference: 'purple',
  networking: 'green',
  exhibition: 'orange',
  concert: 'pink',
  other: 'gray',
};

const eventStatusColors: Record<string, string> = {
  draft: 'gray',
  published: 'green',
  ongoing: 'blue',
  completed: 'teal',
  cancelled: 'red',
};

export function EventsListPage() {
  const navigate = useNavigate();

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Gestion des Événements</Title>
        <Group>
          <Button leftSection={<IconDownload size={16} />} variant="light">
            Exporter
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/admin/events/new')}
          >
            Nouvel Événement
          </Button>
        </Group>
      </Group>

      {/* Filters */}
      <Paper withBorder p="md" mb="md" radius="md">
        <Group>
          <TextInput
            placeholder="Rechercher un événement..."
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Type"
            data={[
              { value: 'all', label: 'Tous' },
              { value: 'workshop', label: 'Atelier' },
              { value: 'conference', label: 'Conférence' },
              { value: 'networking', label: 'Networking' },
              { value: 'exhibition', label: 'Exposition' },
            ]}
            clearable
          />
          <Select
            placeholder="Statut"
            data={[
              { value: 'all', label: 'Tous' },
              { value: 'draft', label: 'Brouillon' },
              { value: 'published', label: 'Publié' },
              { value: 'ongoing', label: 'En cours' },
              { value: 'completed', label: 'Terminé' },
            ]}
            clearable
          />
        </Group>
      </Paper>

      {/* Events Table */}
      <Paper withBorder radius="md" shadow="sm">
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Événement</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Inscriptions</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {mockEvents.map((event) => (
                <Table.Tr key={event.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {event.title}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={eventTypeColors[event.type]} variant="light">
                      {event.type}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={eventStatusColors[event.status]} variant="dot">
                      {event.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {new Date(event.startDate).toLocaleDateString('fr-FR')}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {event.registeredCount} / {event.capacity}
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
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
    </Container>
  );
}
