import { Modal, Stack, Grid, Text, Badge, Paper, Group, Divider } from '@mantine/core';
import { IconUser, IconMail, IconPhone, IconCalendar, IconMapPin, IconCreditCard, IconMessage, IconDevices, IconClock } from '@tabler/icons-react';
import type { Contribution } from '../../../shared/types/contribution';

interface ContributorDetailModalProps {
  opened: boolean;
  onClose: () => void;
  contribution: Contribution | null;
}

export function ContributorDetailModal({ opened, onClose, contribution }: ContributorDetailModalProps) {
  if (!contribution) return null;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateAge = (birthDate?: string): string => {
    if (!birthDate) return 'N/A';
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} ans`;
  };

  const InfoItem = ({
    icon,
    label,
    value
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | number | undefined | null;
  }) => (
    <Group gap="xs" align="flex-start">
      <div style={{ marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <Text size="xs" c="dimmed" fw={500}>{label}</Text>
        <Text size="sm">{value || 'Non renseigné'}</Text>
      </div>
    </Group>
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <IconUser size={20} />
          <Text fw={700} size="lg">Détails de la contribution</Text>
        </Group>
      }
      size="xl"
      centered
    >
      <Stack gap="md">
        {/* Informations du contributeur */}
        <Paper p="md" withBorder radius="md">
          <Text fw={600} size="md" mb="md">👤 Informations Contributeur</Text>
          <Grid gutter="md">
            <Grid.Col span={6}>
              <InfoItem
                icon={<IconUser size={16} />}
                label="Pseudo"
                value={contribution.contributor.pseudo}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <InfoItem
                icon={<IconUser size={16} />}
                label="Nom complet"
                value={`${contribution.contributor.prenom || ''} ${contribution.contributor.nom || ''}`.trim() || 'Non renseigné'}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <InfoItem
                icon={<IconMail size={16} />}
                label="Email"
                value={contribution.contributor.email}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <InfoItem
                icon={<IconPhone size={16} />}
                label="Téléphone"
                value={contribution.contributor.telephone}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <InfoItem
                icon={<IconCalendar size={16} />}
                label="Date de naissance"
                value={contribution.contributor.naissance
                  ? `${new Date(contribution.contributor.naissance).toLocaleDateString('fr-FR')} (${calculateAge(contribution.contributor.naissance)})`
                  : undefined
                }
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <InfoItem
                icon={<IconMapPin size={16} />}
                label="Code postal"
                value={contribution.contributor.codePostal}
              />
            </Grid.Col>
            {contribution.contributor.commentaire && (
              <Grid.Col span={12}>
                <InfoItem
                  icon={<IconMessage size={16} />}
                  label="Commentaire"
                  value={contribution.contributor.commentaire}
                />
              </Grid.Col>
            )}
          </Grid>
        </Paper>

        <Divider />

        {/* Informations de la contribution */}
        <Paper p="md" withBorder radius="md">
          <Text fw={600} size="md" mb="md">💳 Informations Contribution</Text>
          <Grid gutter="md">
            <Grid.Col span={6}>
              <InfoItem
                icon={<IconCreditCard size={16} />}
                label="Article"
                value={contribution.itemName}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Group gap="xs">
                <Text size="xs" c="dimmed" fw={500}>Type</Text>
                <Badge color={contribution.type === 'donation' ? 'pink' : 'blue'} variant="light">
                  {contribution.type === 'donation' ? 'Don sans contrepartie' : 'Pass avec contrepartie'}
                </Badge>
              </Group>
            </Grid.Col>
            <Grid.Col span={6}>
              <InfoItem
                icon={<IconCreditCard size={16} />}
                label="Montant"
                value={`${contribution.amount.toFixed(2)}€`}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Group gap="xs">
                <Text size="xs" c="dimmed" fw={500}>Statut du paiement</Text>
                <Badge
                  color={
                    contribution.paymentStatus === 'completed' ? 'green' :
                    contribution.paymentStatus === 'pending' ? 'yellow' : 'red'
                  }
                  variant="light"
                >
                  {contribution.paymentStatus === 'completed' ? 'Complété' :
                   contribution.paymentStatus === 'pending' ? 'En attente' : 'Échoué'}
                </Badge>
              </Group>
            </Grid.Col>
            <Grid.Col span={6}>
              <InfoItem
                icon={<IconCreditCard size={16} />}
                label="ID de paiement"
                value={contribution.paymentId}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Group gap="xs">
                <Text size="xs" c="dimmed" fw={500}>Membre</Text>
                <Badge color={contribution.isMember ? 'teal' : 'gray'} variant="filled">
                  {contribution.isMember ? 'Oui' : 'Non'}
                </Badge>
              </Group>
            </Grid.Col>
            {contribution.membershipType && (
              <Grid.Col span={6}>
                <Group gap="xs">
                  <Text size="xs" c="dimmed" fw={500}>Type d'adhésion</Text>
                  <Badge color={contribution.membershipType === 'monthly' ? 'teal' : 'indigo'} variant="light">
                    {contribution.membershipType === 'monthly' ? 'Mensuel' : 'Annuel'}
                  </Badge>
                </Group>
              </Grid.Col>
            )}
          </Grid>
        </Paper>

        <Divider />

        {/* Métadonnées */}
        <Paper p="md" withBorder radius="md">
          <Text fw={600} size="md" mb="md">🕒 Métadonnées</Text>
          <Grid gutter="md">
            <Grid.Col span={6}>
              <InfoItem
                icon={<IconClock size={16} />}
                label="Date de paiement"
                value={formatDate(contribution.paidAt)}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <InfoItem
                icon={<IconClock size={16} />}
                label="Date de création"
                value={formatDate(contribution.createdAt)}
              />
            </Grid.Col>
            {contribution.userAgent && (
              <Grid.Col span={12}>
                <InfoItem
                  icon={<IconDevices size={16} />}
                  label="Navigateur / Appareil"
                  value={contribution.userAgent}
                />
              </Grid.Col>
            )}
          </Grid>
        </Paper>
      </Stack>
    </Modal>
  );
}
