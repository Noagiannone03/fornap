import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Title,
  Paper,
  Group,
  Button,
  Stack,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Switch,
  LoadingOverlay,
  Accordion,
  Card,
  ActionIcon,
  Divider,
  Grid,
  MultiSelect,
  Text,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCheck,
  IconPlus,
  IconTrash,
  IconCalendar,
  IconMapPin,
  IconTicket,
  IconSettings,
  IconUsers,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { createEvent } from '../../../shared/services/eventService';
import type {
  EventFormData,
  EventType,
  EventStatus,
  LocationType,
  EventArtist,
  TicketCategoryFormData,
} from '../../../shared/types/event';
import {
  EVENT_TYPE_LABELS,
  LOCATION_TYPE_LABELS,
  TIMEZONES,
  EVENT_CATEGORIES,
  EVENT_TAGS,
} from '../../../shared/types/event';

export function EventCreatePage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  // Basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [type, setType] = useState<EventType>('concert');
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Dates
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timezone, setTimezone] = useState('Europe/Paris');
  const [doorsOpenTime, setDoorsOpenTime] = useState('');

  // Location
  const [locationType, setLocationType] = useState<LocationType>('physical');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('France');
  const [onlineLink, setOnlineLink] = useState('');
  const [onlinePlatform, setOnlinePlatform] = useState('');
  const [accessInstructions, setAccessInstructions] = useState('');
  const [parkingInfo, setParkingInfo] = useState('');

  // Artists
  const [artists, setArtists] = useState<EventArtist[]>([]);

  // Ticket Categories
  const [ticketCategories, setTicketCategories] = useState<TicketCategoryFormData[]>([
    {
      id: `cat-${Date.now()}`,
      name: 'Standard',
      description: '',
      price: 0,
      capacity: 100,
      isActive: true,
      requiresMembership: false,
      salesStartDate: null,
      salesEndDate: null,
      benefits: [],
      order: 1,
    },
  ]);

  // Media
  const [coverImage, setCoverImage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');

  // Settings
  const [status, setStatus] = useState<EventStatus>('draft');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [allowWaitlist, setAllowWaitlist] = useState(false);
  const [maxTicketsPerUser, setMaxTicketsPerUser] = useState(10);
  const [minAge, setMinAge] = useState<number | undefined>(undefined);

  // Additional info
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [facebookEventUrl, setFacebookEventUrl] = useState('');

  // Add artist
  const handleAddArtist = () => {
    setArtists([
      ...artists,
      {
        id: `artist-${Date.now()}`,
        name: '',
        order: artists.length + 1,
      },
    ]);
  };

  const handleRemoveArtist = (index: number) => {
    setArtists(artists.filter((_, i) => i !== index));
  };

  const handleUpdateArtist = (index: number, field: keyof EventArtist, value: any) => {
    const updated = [...artists];
    updated[index] = { ...updated[index], [field]: value };
    setArtists(updated);
  };

  // Add ticket category
  const handleAddTicketCategory = () => {
    setTicketCategories([
      ...ticketCategories,
      {
        id: `cat-${Date.now()}`,
        name: '',
        description: '',
        price: 0,
        capacity: 50,
        isActive: true,
        requiresMembership: false,
        salesStartDate: null,
        salesEndDate: null,
        benefits: [],
        order: ticketCategories.length + 1,
      },
    ]);
  };

  const handleRemoveTicketCategory = (index: number) => {
    if (ticketCategories.length === 1) {
      notifications.show({
        title: 'Erreur',
        message: 'Un événement doit avoir au moins une catégorie de billet',
        color: 'red',
      });
      return;
    }
    setTicketCategories(ticketCategories.filter((_, i) => i !== index));
  };

  const handleUpdateTicketCategory = (
    index: number,
    field: keyof TicketCategoryFormData,
    value: any
  ) => {
    const updated = [...ticketCategories];
    updated[index] = { ...updated[index], [field]: value };
    setTicketCategories(updated);
  };

  // Submit
  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      notifications.show({
        title: 'Erreur',
        message: 'Le titre est requis',
        color: 'red',
      });
      return;
    }

    if (!startDate || !endDate) {
      notifications.show({
        title: 'Erreur',
        message: 'Les dates de début et fin sont requises',
        color: 'red',
      });
      return;
    }

    if (ticketCategories.some((cat) => !cat.name.trim())) {
      notifications.show({
        title: 'Erreur',
        message: 'Toutes les catégories de billets doivent avoir un nom',
        color: 'red',
      });
      return;
    }

    try {
      setSaving(true);

      const formData: EventFormData = {
        title,
        description,
        shortDescription: shortDescription || '',
        startDate,
        endDate,
        timezone,
        doorsOpenTime: doorsOpenTime || null,
        location: {
          type: locationType,
          venueName: locationType !== 'online' ? (venueName || '') : undefined,
          address: locationType === 'physical' || locationType === 'hybrid' ? (address || '') : undefined,
          city: locationType === 'physical' || locationType === 'hybrid' ? (city || '') : undefined,
          postalCode:
            locationType === 'physical' || locationType === 'hybrid' ? (postalCode || '') : undefined,
          country:
            locationType === 'physical' || locationType === 'hybrid' ? (country || '') : undefined,
          onlineLink: locationType === 'online' || locationType === 'hybrid' ? (onlineLink || '') : undefined,
          onlinePlatform:
            locationType === 'online' || locationType === 'hybrid' ? (onlinePlatform || '') : undefined,
          accessInstructions: accessInstructions || '',
          parkingInfo:
            locationType === 'physical' || locationType === 'hybrid' ? (parkingInfo || '') : undefined,
        },
        artists,
        type,
        categories,
        tags,
        coverImage: coverImage || '',
        images,
        videoUrl: videoUrl || '',
        ticketCategories,
        status,
        isActive,
        isFeatured,
        registrationOpen,
        registrationStartDate: null,
        registrationEndDate: null,
        requiresApproval,
        allowWaitlist,
        maxTicketsPerUser,
        minAge: minAge || undefined,
        termsAndConditions: termsAndConditions || '',
        refundPolicy: refundPolicy || '',
        contactEmail: contactEmail || '',
        contactPhone: contactPhone || '',
        websiteUrl: websiteUrl || '',
        facebookEventUrl: facebookEventUrl || '',
      };

      const eventId = await createEvent(formData, 'admin'); // TODO: Get real admin UID
      notifications.show({
        title: 'Succès',
        message: 'Événement créé avec succès',
        color: 'green',
      });
      navigate(`/admin/events/${eventId}`);
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Impossible de créer l\'événement',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container size="xl">
      <LoadingOverlay visible={saving} />

      {/* Header */}
      <Group justify="space-between" mb="xl">
        <Group>
          <ActionIcon variant="subtle" onClick={() => navigate('/admin/events')}>
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Title order={1}>Créer un événement</Title>
        </Group>
        <Group>
          <Button variant="outline" onClick={() => navigate('/admin/events')}>
            Annuler
          </Button>
          <Button leftSection={<IconCheck size={16} />} onClick={handleSubmit}>
            Créer l'événement
          </Button>
        </Group>
      </Group>

      <Accordion multiple defaultValue={['basic', 'dates', 'location', 'tickets']}>
        {/* Informations de base */}
        <Accordion.Item value="basic">
          <Accordion.Control icon={<IconCalendar size={20} />}>
            Informations de base
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <TextInput
                label="Titre de l'événement"
                placeholder="Ex: Concert Jazz sous les étoiles"
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                required
              />
              <Textarea
                label="Description complète"
                placeholder="Décrivez l'événement en détail..."
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
                minRows={4}
              />
              <Textarea
                label="Description courte"
                placeholder="Résumé pour les aperçus et cartes..."
                value={shortDescription}
                onChange={(e) => setShortDescription(e.currentTarget.value)}
                minRows={2}
              />
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select
                    label="Type d'événement"
                    placeholder="Sélectionnez un type"
                    data={Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                    value={type}
                    onChange={(value) => setType(value as EventType)}
                    required
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <MultiSelect
                    label="Catégories"
                    placeholder="Sélectionnez des catégories"
                    data={EVENT_CATEGORIES}
                    value={categories}
                    onChange={setCategories}
                  />
                </Grid.Col>
              </Grid>
              <MultiSelect
                label="Tags"
                placeholder="Sélectionnez des tags"
                data={EVENT_TAGS}
                value={tags}
                onChange={setTags}
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Dates et horaires */}
        <Accordion.Item value="dates">
          <Accordion.Control icon={<IconCalendar size={20} />}>
            Dates et horaires
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    type="datetime-local"
                    label="Date et heure de début"
                    value={startDate}
                    onChange={(e) => setStartDate(e.currentTarget.value)}
                    required
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    type="datetime-local"
                    label="Date et heure de fin"
                    value={endDate}
                    onChange={(e) => setEndDate(e.currentTarget.value)}
                    required
                  />
                </Grid.Col>
              </Grid>
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    type="datetime-local"
                    label="Heure d'ouverture des portes (optionnel)"
                    value={doorsOpenTime}
                    onChange={(e) => setDoorsOpenTime(e.currentTarget.value)}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select
                    label="Fuseau horaire"
                    data={TIMEZONES}
                    value={timezone}
                    onChange={(value) => setTimezone(value || 'Europe/Paris')}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Lieu */}
        <Accordion.Item value="location">
          <Accordion.Control icon={<IconMapPin size={20} />}>Lieu</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Select
                label="Type de lieu"
                data={Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                value={locationType}
                onChange={(value) => setLocationType(value as LocationType)}
              />

              {(locationType === 'physical' || locationType === 'hybrid') && (
                <>
                  <TextInput
                    label="Nom du lieu"
                    placeholder="Ex: Le Blue Note"
                    value={venueName}
                    onChange={(e) => setVenueName(e.currentTarget.value)}
                  />
                  <TextInput
                    label="Adresse"
                    placeholder="123 rue de la Musique"
                    value={address}
                    onChange={(e) => setAddress(e.currentTarget.value)}
                  />
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Ville"
                        placeholder="Paris"
                        value={city}
                        onChange={(e) => setCity(e.currentTarget.value)}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 3 }}>
                      <TextInput
                        label="Code postal"
                        placeholder="75001"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.currentTarget.value)}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 3 }}>
                      <TextInput
                        label="Pays"
                        placeholder="France"
                        value={country}
                        onChange={(e) => setCountry(e.currentTarget.value)}
                      />
                    </Grid.Col>
                  </Grid>
                  <Textarea
                    label="Informations de parking"
                    placeholder="Parking gratuit disponible..."
                    value={parkingInfo}
                    onChange={(e) => setParkingInfo(e.currentTarget.value)}
                    minRows={2}
                  />
                </>
              )}

              {(locationType === 'online' || locationType === 'hybrid') && (
                <>
                  <TextInput
                    label="Lien en ligne"
                    placeholder="https://zoom.us/j/..."
                    value={onlineLink}
                    onChange={(e) => setOnlineLink(e.currentTarget.value)}
                  />
                  <TextInput
                    label="Plateforme"
                    placeholder="Ex: Zoom, Teams, YouTube Live"
                    value={onlinePlatform}
                    onChange={(e) => setOnlinePlatform(e.currentTarget.value)}
                  />
                </>
              )}

              <Textarea
                label="Instructions d'accès"
                placeholder="Informations pour accéder à l'événement..."
                value={accessInstructions}
                onChange={(e) => setAccessInstructions(e.currentTarget.value)}
                minRows={2}
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Artistes */}
        <Accordion.Item value="artists">
          <Accordion.Control icon={<IconUsers size={20} />}>Artistes / Intervenants</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              {artists.map((artist, index) => (
                <Card key={artist.id} withBorder>
                  <Group justify="space-between" mb="md">
                    <Text fw={500}>Artiste {index + 1}</Text>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => handleRemoveArtist(index)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                  <Stack gap="sm">
                    <TextInput
                      label="Nom"
                      placeholder="Nom de l'artiste"
                      value={artist.name}
                      onChange={(e) => handleUpdateArtist(index, 'name', e.currentTarget.value)}
                    />
                    <TextInput
                      label="Rôle"
                      placeholder="Ex: Main Act, DJ, Speaker"
                      value={artist.role}
                      onChange={(e) => handleUpdateArtist(index, 'role', e.currentTarget.value)}
                    />
                    <Textarea
                      label="Bio"
                      placeholder="Biographie de l'artiste..."
                      value={artist.bio}
                      onChange={(e) => handleUpdateArtist(index, 'bio', e.currentTarget.value)}
                      minRows={2}
                    />
                  </Stack>
                </Card>
              ))}
              <Button
                leftSection={<IconPlus size={16} />}
                variant="light"
                onClick={handleAddArtist}
              >
                Ajouter un artiste
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Catégories de billets */}
        <Accordion.Item value="tickets">
          <Accordion.Control icon={<IconTicket size={20} />}>
            Catégories de billets
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              {ticketCategories.map((category, index) => (
                <Card key={category.id} withBorder>
                  <Group justify="space-between" mb="md">
                    <Text fw={500}>Catégorie {index + 1}</Text>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => handleRemoveTicketCategory(index)}
                      disabled={ticketCategories.length === 1}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                  <Stack gap="sm">
                    <Grid>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                          label="Nom de la catégorie"
                          placeholder="Ex: VIP, Standard, Early Bird"
                          value={category.name}
                          onChange={(e) =>
                            handleUpdateTicketCategory(index, 'name', e.currentTarget.value)
                          }
                          required
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <Switch
                          label="Catégorie active"
                          checked={category.isActive}
                          onChange={(e) =>
                            handleUpdateTicketCategory(
                              index,
                              'isActive',
                              e.currentTarget.checked
                            )
                          }
                        />
                      </Grid.Col>
                    </Grid>
                    <Textarea
                      label="Description"
                      placeholder="Décrivez les avantages de cette catégorie..."
                      value={category.description}
                      onChange={(e) =>
                        handleUpdateTicketCategory(index, 'description', e.currentTarget.value)
                      }
                      minRows={2}
                    />
                    <Grid>
                      <Grid.Col span={{ base: 12, md: 4 }}>
                        <NumberInput
                          label="Prix (€)"
                          placeholder="0"
                          value={category.price}
                          onChange={(value) =>
                            handleUpdateTicketCategory(index, 'price', value || 0)
                          }
                          min={0}
                          decimalScale={2}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 4 }}>
                        <NumberInput
                          label="Capacité"
                          placeholder="100"
                          value={category.capacity}
                          onChange={(value) =>
                            handleUpdateTicketCategory(index, 'capacity', value || 0)
                          }
                          min={1}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 4 }}>
                        <Switch
                          label="Réservé aux membres"
                          checked={category.requiresMembership}
                          onChange={(e) =>
                            handleUpdateTicketCategory(
                              index,
                              'requiresMembership',
                              e.currentTarget.checked
                            )
                          }
                          mt="xl"
                        />
                      </Grid.Col>
                    </Grid>
                  </Stack>
                </Card>
              ))}
              <Button
                leftSection={<IconPlus size={16} />}
                variant="light"
                onClick={handleAddTicketCategory}
              >
                Ajouter une catégorie de billet
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Paramètres */}
        <Accordion.Item value="settings">
          <Accordion.Control icon={<IconSettings size={20} />}>Paramètres</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Statut"
                    data={[
                      { value: 'draft', label: 'Brouillon' },
                      { value: 'published', label: 'Publié' },
                    ]}
                    value={status}
                    onChange={(value) => setStatus(value as EventStatus)}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Switch
                    label="Événement actif"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.currentTarget.checked)}
                    mt="xl"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Switch
                    label="Mettre en avant"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.currentTarget.checked)}
                    mt="xl"
                  />
                </Grid.Col>
              </Grid>

              <Divider />

              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <NumberInput
                    label="Nombre maximum de billets par utilisateur"
                    value={maxTicketsPerUser}
                    onChange={(value) => setMaxTicketsPerUser(value || 10)}
                    min={1}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <NumberInput
                    label="Âge minimum (optionnel)"
                    placeholder="Ex: 18"
                    value={minAge}
                    onChange={(value) => setMinAge(value || undefined)}
                    min={0}
                  />
                </Grid.Col>
              </Grid>

              <Switch
                label="Inscriptions ouvertes"
                checked={registrationOpen}
                onChange={(e) => setRegistrationOpen(e.currentTarget.checked)}
              />
              <Switch
                label="Approbation manuelle requise"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.currentTarget.checked)}
              />
              <Switch
                label="Autoriser la liste d'attente"
                checked={allowWaitlist}
                onChange={(e) => setAllowWaitlist(e.currentTarget.checked)}
              />

              <Divider />

              <TextInput
                label="Email de contact"
                placeholder="contact@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.currentTarget.value)}
              />
              <TextInput
                label="Téléphone de contact"
                placeholder="+33 1 23 45 67 89"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.currentTarget.value)}
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
}
