import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Title,
  Paper,
  Group,
  Button,
  Text,
  Badge,
  LoadingOverlay,
  Tabs,
  Table,
  Grid,
  Card,
  Stack,
  ActionIcon,
  Avatar,
  Progress,
  Divider,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconEdit,
  IconCalendar,
  IconMapPin,
  IconTicket,
  IconUsers,
  IconChartBar,
  IconCheck,
  IconX,
  IconCurrencyEuro,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getEventById } from '../../../shared/services/eventService';
import { getEventPurchasesForList } from '../../../shared/services/ticketPurchaseService';
import type { Event, EventPurchaseListItem } from '../../../shared/types/event';
import {
  EVENT_TYPE_LABELS,
  EVENT_STATUS_LABELS,
  LOCATION_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  PURCHASE_STATUS_LABELS,
} from '../../../shared/types/event';

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [purchases, setPurchases] = useState<EventPurchaseListItem[]>([]);

  useEffect(() => {
    if (!eventId) return;
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventData, purchasesData] = await Promise.all([
        getEventById(eventId!),
        getEventPurchasesForList(eventId!),
      ]);

      if (!eventData) {
        notifications.show({
          title: 'Erreur',
          message: 'Événement introuvable',
          color: 'red',
        });
        navigate('/admin/events');
        return;
      }

      setEvent(eventData);
      setPurchases(purchasesData);
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les données',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      draft: 'gray',
      published: 'blue',
      ongoing: 'green',
      completed: 'teal',
      cancelled: 'red',
      confirmed: 'green',
      pending: 'yellow',
      paid: 'green',
      failed: 'red',
      refunded: 'orange',
    };
    return colors[status] || 'gray';
  };

  if (loading || !event) {
    return (
      <Container size="xl">
        <LoadingOverlay visible />
      </Container>
    );
  }

  // Calculate stats
  const stats = {
    totalCapacity: event.totalCapacity,
    totalSold: event.totalSold,
    totalRevenue: event.totalRevenue,
    totalCheckedIn: event.totalCheckedIn,
    occupancyRate: event.totalCapacity > 0 ? (event.totalSold / event.totalCapacity) * 100 : 0,
    checkInRate: event.totalSold > 0 ? (event.totalCheckedIn / event.totalSold) * 100 : 0,
  };

  return (
    <Container size="xl">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <Group>
          <ActionIcon variant="subtle" onClick={() => navigate('/admin/events')}>
            <IconArrowLeft size={20} />
          </ActionIcon>
          <div>
            <Title order={1}>{event.title}</Title>
            <Group gap="xs" mt="xs">
              <Badge color={getStatusColor(event.status)}>
                {EVENT_STATUS_LABELS[event.status]}
              </Badge>
              <Badge variant="light">{EVENT_TYPE_LABELS[event.type]}</Badge>
              {event.isFeatured && <Badge color="yellow">Mis en avant</Badge>}
              {!event.isActive && <Badge color="gray">Inactif</Badge>}
            </Group>
          </div>
        </Group>
        <Button
          leftSection={<IconEdit size={16} />}
          onClick={() => navigate(`/admin/events/${eventId}/edit`)}
        >
          Modifier
        </Button>
      </Group>

      {/* Stats Cards */}
      <Grid mb="xl">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Billets Vendus
                </Text>
                <Text size="xl" fw={700}>
                  {stats.totalSold} / {stats.totalCapacity}
                </Text>
                <Progress value={stats.occupancyRate} size="sm" mt="xs" />
                <Text size="xs" c="dimmed" mt="xs">
                  {stats.occupancyRate.toFixed(1)}% d'occupation
                </Text>
              </div>
              <IconTicket size={32} opacity={0.5} />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Revenus
                </Text>
                <Text size="xl" fw={700}>
                  {stats.totalRevenue.toLocaleString()}€
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Prix moyen:{' '}
                  {stats.totalSold > 0 ? (stats.totalRevenue / stats.totalSold).toFixed(2) : 0}€
                </Text>
              </div>
              <IconCurrencyEuro size={32} opacity={0.5} />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Check-in
                </Text>
                <Text size="xl" fw={700}>
                  {stats.totalCheckedIn} / {stats.totalSold}
                </Text>
                <Progress value={stats.checkInRate} size="sm" mt="xs" color="green" />
                <Text size="xs" c="dimmed" mt="xs">
                  {stats.checkInRate.toFixed(1)}% de présence
                </Text>
              </div>
              <IconUsers size={32} opacity={0.5} />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Participants
                </Text>
                <Text size="xl" fw={700}>
                  {purchases.length}
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Total achats
                </Text>
              </div>
              <IconUsers size={32} opacity={0.5} />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <Tabs.List>
          <Tabs.Tab value="details" leftSection={<IconCalendar size={16} />}>
            Détails
          </Tabs.Tab>
          <Tabs.Tab
            value="attendees"
            leftSection={<IconUsers size={16} />}
          >
            Participants ({purchases.length})
          </Tabs.Tab>
          <Tabs.Tab value="tickets" leftSection={<IconTicket size={16} />}>
            Catégories de billets
          </Tabs.Tab>
        </Tabs.List>

        {/* Details Tab */}
        <Tabs.Panel value="details" pt="md">
          <Paper p="md" withBorder>
            <Stack gap="xl">
              {/* Basic Info */}
              <div>
                <Title order={3} mb="md">
                  Informations générales
                </Title>
                <Stack gap="sm">
                  <Group>
                    <Text fw={500} w={150}>
                      Type :
                    </Text>
                    <Badge variant="light">{EVENT_TYPE_LABELS[event.type]}</Badge>
                  </Group>
                  <Group>
                    <Text fw={500} w={150}>
                      Statut :
                    </Text>
                    <Badge color={getStatusColor(event.status)}>
                      {EVENT_STATUS_LABELS[event.status]}
                    </Badge>
                  </Group>
                  {event.shortDescription && (
                    <div>
                      <Text fw={500} mb="xs">
                        Description courte :
                      </Text>
                      <Text c="dimmed">{event.shortDescription}</Text>
                    </div>
                  )}
                  <div>
                    <Text fw={500} mb="xs">
                      Description :
                    </Text>
                    <Text c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                      {event.description}
                    </Text>
                  </div>
                </Stack>
              </div>

              <Divider />

              {/* Dates */}
              <div>
                <Title order={3} mb="md">
                  <Group gap="xs">
                    <IconCalendar size={20} />
                    <span>Dates et horaires</span>
                  </Group>
                </Title>
                <Stack gap="sm">
                  <Group>
                    <Text fw={500} w={150}>
                      Début :
                    </Text>
                    <Text>{event.startDate.toDate().toLocaleString('fr-FR')}</Text>
                  </Group>
                  <Group>
                    <Text fw={500} w={150}>
                      Fin :
                    </Text>
                    <Text>{event.endDate.toDate().toLocaleString('fr-FR')}</Text>
                  </Group>
                  {event.doorsOpenTime && (
                    <Group>
                      <Text fw={500} w={150}>
                        Ouverture :
                      </Text>
                      <Text>{event.doorsOpenTime.toDate().toLocaleString('fr-FR')}</Text>
                    </Group>
                  )}
                  <Group>
                    <Text fw={500} w={150}>
                      Fuseau horaire :
                    </Text>
                    <Text c="dimmed">{event.timezone}</Text>
                  </Group>
                </Stack>
              </div>

              <Divider />

              {/* Location */}
              <div>
                <Title order={3} mb="md">
                  <Group gap="xs">
                    <IconMapPin size={20} />
                    <span>Lieu</span>
                  </Group>
                </Title>
                <Stack gap="sm">
                  <Group>
                    <Text fw={500} w={150}>
                      Type :
                    </Text>
                    <Badge variant="light">
                      {LOCATION_TYPE_LABELS[event.location.type]}
                    </Badge>
                  </Group>
                  {event.location.venueName && (
                    <Group>
                      <Text fw={500} w={150}>
                        Lieu :
                      </Text>
                      <Text>{event.location.venueName}</Text>
                    </Group>
                  )}
                  {event.location.address && (
                    <Group>
                      <Text fw={500} w={150}>
                        Adresse :
                      </Text>
                      <Text>
                        {event.location.address}, {event.location.postalCode} {event.location.city}
                      </Text>
                    </Group>
                  )}
                  {event.location.onlineLink && (
                    <Group>
                      <Text fw={500} w={150}>
                        Lien en ligne :
                      </Text>
                      <Text
                        component="a"
                        href={event.location.onlineLink}
                        target="_blank"
                        c="blue"
                      >
                        {event.location.onlineLink}
                      </Text>
                    </Group>
                  )}
                  {event.location.accessInstructions && (
                    <div>
                      <Text fw={500} mb="xs">
                        Instructions d'accès :
                      </Text>
                      <Text c="dimmed">{event.location.accessInstructions}</Text>
                    </div>
                  )}
                </Stack>
              </div>

              {/* Artists */}
              {event.artists.length > 0 && (
                <>
                  <Divider />
                  <div>
                    <Title order={3} mb="md">
                      Artistes / Intervenants
                    </Title>
                    <Stack gap="md">
                      {event.artists.map((artist) => (
                        <Card key={artist.id} withBorder>
                          <Group>
                            {artist.photo && <Avatar src={artist.photo} size="lg" radius="md" />}
                            <div>
                              <Text fw={500}>{artist.name}</Text>
                              {artist.role && (
                                <Text size="sm" c="dimmed">
                                  {artist.role}
                                </Text>
                              )}
                              {artist.bio && (
                                <Text size="sm" c="dimmed" mt="xs">
                                  {artist.bio}
                                </Text>
                              )}
                            </div>
                          </Group>
                        </Card>
                      ))}
                    </Stack>
                  </div>
                </>
              )}

              {/* Settings */}
              <Divider />
              <div>
                <Title order={3} mb="md">
                  Paramètres
                </Title>
                <Stack gap="sm">
                  <Group>
                    <Text fw={500} w={200}>
                      Inscriptions ouvertes :
                    </Text>
                    {event.registrationOpen ? (
                      <Badge color="green" leftSection={<IconCheck size={12} />}>
                        Oui
                      </Badge>
                    ) : (
                      <Badge color="red" leftSection={<IconX size={12} />}>
                        Non
                      </Badge>
                    )}
                  </Group>
                  <Group>
                    <Text fw={500} w={200}>
                      Approbation requise :
                    </Text>
                    {event.requiresApproval ? (
                      <Badge color="orange">Oui</Badge>
                    ) : (
                      <Badge color="gray">Non</Badge>
                    )}
                  </Group>
                  <Group>
                    <Text fw={500} w={200}>
                      Max billets/utilisateur :
                    </Text>
                    <Text>{event.maxTicketsPerUser}</Text>
                  </Group>
                  {event.minAge && (
                    <Group>
                      <Text fw={500} w={200}>
                        Âge minimum :
                      </Text>
                      <Text>{event.minAge} ans</Text>
                    </Group>
                  )}
                </Stack>
              </div>

              {/* Contact */}
              {(event.contactEmail || event.contactPhone) && (
                <>
                  <Divider />
                  <div>
                    <Title order={3} mb="md">
                      Contact
                    </Title>
                    <Stack gap="sm">
                      {event.contactEmail && (
                        <Group>
                          <Text fw={500} w={150}>
                            Email :
                          </Text>
                          <Text component="a" href={`mailto:${event.contactEmail}`} c="blue">
                            {event.contactEmail}
                          </Text>
                        </Group>
                      )}
                      {event.contactPhone && (
                        <Group>
                          <Text fw={500} w={150}>
                            Téléphone :
                          </Text>
                          <Text>{event.contactPhone}</Text>
                        </Group>
                      )}
                    </Stack>
                  </div>
                </>
              )}
            </Stack>
          </Paper>
        </Tabs.Panel>

        {/* Attendees Tab */}
        <Tabs.Panel value="attendees" pt="md">
          <Paper p="md" withBorder>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Participant</Table.Th>
                  <Table.Th>Catégorie</Table.Th>
                  <Table.Th>Quantité</Table.Th>
                  <Table.Th>Prix</Table.Th>
                  <Table.Th>Paiement</Table.Th>
                  <Table.Th>Statut</Table.Th>
                  <Table.Th>Check-in</Table.Th>
                  <Table.Th>Date d'achat</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {purchases.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={8}>
                      <Text ta="center" c="dimmed">
                        Aucun participant pour le moment
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  purchases.map((purchase) => (
                    <Table.Tr key={purchase.id}>
                      <Table.Td>
                        <div>
                          <Text size="sm" fw={500}>
                            {purchase.userName}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {purchase.userEmail}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {purchase.ticketNumber}
                          </Text>
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{purchase.ticketCategoryName}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{purchase.quantity}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {purchase.totalPrice}€
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="sm" color={getStatusColor(purchase.paymentStatus)}>
                          {PAYMENT_STATUS_LABELS[purchase.paymentStatus]}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="sm" color={getStatusColor(purchase.status)}>
                          {PURCHASE_STATUS_LABELS[purchase.status]}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {purchase.checkedIn ? (
                          <Badge color="green" leftSection={<IconCheck size={12} />}>
                            Présent
                          </Badge>
                        ) : (
                          <Badge color="gray">Absent</Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {purchase.createdAt.toDate().toLocaleDateString('fr-FR')}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        {/* Tickets Tab */}
        <Tabs.Panel value="tickets" pt="md">
          <Paper p="md" withBorder>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Catégorie</Table.Th>
                  <Table.Th>Prix</Table.Th>
                  <Table.Th>Vendus</Table.Th>
                  <Table.Th>Capacité</Table.Th>
                  <Table.Th>Occupation</Table.Th>
                  <Table.Th>Revenus</Table.Th>
                  <Table.Th>Statut</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {event.ticketCategories.map((category) => {
                  const occupancy =
                    category.capacity > 0 ? (category.sold / category.capacity) * 100 : 0;
                  const revenue = category.sold * category.price;
                  return (
                    <Table.Tr key={category.id}>
                      <Table.Td>
                        <div>
                          <Text fw={500}>{category.name}</Text>
                          {category.description && (
                            <Text size="xs" c="dimmed">
                              {category.description}
                            </Text>
                          )}
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>{category.price}€</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text>{category.sold}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text>{category.capacity}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={4}>
                          <Progress value={occupancy} size="sm" />
                          <Text size="xs" c="dimmed">
                            {occupancy.toFixed(1)}%
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>{revenue.toLocaleString()}€</Text>
                      </Table.Td>
                      <Table.Td>
                        {category.isActive ? (
                          <Badge color="green">Actif</Badge>
                        ) : (
                          <Badge color="gray">Inactif</Badge>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
