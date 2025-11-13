import { Modal, Stack, Group, Text, Badge, Button, Divider, Box, Avatar, Paper, Grid } from '@mantine/core';
import {
  IconCheck,
  IconX,
  IconAlertCircle,
  IconUser,
  IconCalendar,
  IconCreditCard,
  IconTicket,
  IconMail,
  IconMapPin,
} from '@tabler/icons-react';
import type { ScanResult } from '../../../shared/types/scan';
import { ScanResultStatus } from '../../../shared/types/scan';

interface ScanResultModalProps {
  opened: boolean;
  onClose: () => void;
  result: ScanResult | null;
}

export function ScanResultModal({ opened, onClose, result }: ScanResultModalProps) {
  if (!result) return null;

  const isSuccess = result.status === ScanResultStatus.SUCCESS;
  const isWarning = result.status === ScanResultStatus.ALREADY_SCANNED;

  const getStatusColor = () => {
    if (isSuccess) return 'green';
    if (isWarning) return 'orange';
    return 'red';
  };

  const getStatusIcon = () => {
    if (isSuccess) return <IconCheck size={48} />;
    if (isWarning) return <IconAlertCircle size={48} />;
    return <IconX size={48} />;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      let date: Date;

      // Firestore Timestamp avec méthode toDate
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // Objet avec seconds (Firestore plain object)
      else if (timestamp.seconds !== undefined) {
        date = new Date(timestamp.seconds * 1000);
      }
      // Date déjà
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // String ou number
      else {
        date = new Date(timestamp);
      }

      // Vérifier que la date est valide
      if (isNaN(date.getTime())) {
        console.error('Date invalide:', timestamp);
        return 'Date invalide';
      }

      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      console.error('Erreur formatage date:', error, timestamp);
      return 'Erreur de date';
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      centered
      withCloseButton={false}
      overlayProps={{ opacity: 0.7, blur: 4 }}
    >
      <Stack gap="lg">
        {/* Header avec statut */}
        <Paper p="xl" radius="md" bg={`${getStatusColor()}.0`}>
          <Stack align="center" gap="md">
            <Box c={`${getStatusColor()}.7`}>
              {getStatusIcon()}
            </Box>
            <Stack align="center" gap="xs">
              <Badge size="xl" color={getStatusColor()} variant="filled">
                {isSuccess ? 'SCAN RÉUSSI' : isWarning ? 'ATTENTION' : 'SCAN ÉCHOUÉ'}
              </Badge>
              <Text size="lg" fw={600} ta="center" c={`${getStatusColor()}.9`}>
                {result.message}
              </Text>
            </Stack>
          </Stack>
        </Paper>

        {/* Informations utilisateur */}
        {result.user && (
          <Paper withBorder p="md" radius="md">
            <Group gap="md" mb="md">
              <Avatar size={60} color="indigo" radius="xl">
                {result.user.firstName?.[0]}{result.user.lastName?.[0]}
              </Avatar>
              <div style={{ flex: 1 }}>
                <Text size="xl" fw={700}>
                  {result.user.firstName} {result.user.lastName}
                </Text>
                <Group gap="xs" mt={4}>
                  <IconMail size={14} />
                  <Text size="sm" c="dimmed">{result.user.email}</Text>
                </Group>
              </div>
            </Group>

            <Divider my="md" />

            <Grid>
              <Grid.Col span={6}>
                <Group gap={8}>
                  <IconCreditCard size={16} color="var(--mantine-color-blue-6)" />
                  <div>
                    <Text size="xs" c="dimmed">Type d'abonnement</Text>
                    <Text size="sm" fw={600}>
                      {result.user.membershipType === 'monthly' ? 'Mensuel' :
                       result.user.membershipType === 'annual' ? 'Annuel' :
                       result.user.membershipType === 'lifetime' ? 'À vie' : 'N/A'}
                    </Text>
                  </div>
                </Group>
              </Grid.Col>

              <Grid.Col span={6}>
                <Group gap={8}>
                  <IconCalendar size={16} color="var(--mantine-color-green-6)" />
                  <div>
                    <Text size="xs" c="dimmed">Expiration</Text>
                    <Text size="sm" fw={600}>
                      {result.user.membershipExpiry ? formatDate(result.user.membershipExpiry) : 'Illimité'}
                    </Text>
                  </div>
                </Group>
              </Grid.Col>

              {result.user.postalCode && (
                <Grid.Col span={6}>
                  <Group gap={8}>
                    <IconMapPin size={16} color="var(--mantine-color-orange-6)" />
                    <div>
                      <Text size="xs" c="dimmed">Code postal</Text>
                      <Text size="sm" fw={600}>{result.user.postalCode}</Text>
                    </div>
                  </Group>
                </Grid.Col>
              )}

              <Grid.Col span={6}>
                <Group gap={8}>
                  <IconUser size={16} color="var(--mantine-color-violet-6)" />
                  <div>
                    <Text size="xs" c="dimmed">Nombre de scans</Text>
                    <Text size="sm" fw={600}>{result.user.scanCount || 0}</Text>
                  </div>
                </Group>
              </Grid.Col>
            </Grid>

            {result.user.isLegacyAccount && (
              <Badge color="orange" variant="light" fullWidth mt="md">
                Compte migré (ancien système)
              </Badge>
            )}

            {(result.user.isAccountBlocked || result.user.isCardBlocked) && (
              <Badge color="red" variant="filled" fullWidth mt="md">
                ⚠️ {result.user.isAccountBlocked ? 'Compte bloqué' : 'Carte bloquée'}
              </Badge>
            )}
          </Paper>
        )}

        {/* Informations billet */}
        {result.ticket && (
          <Paper withBorder p="md" radius="md" bg="blue.0">
            <Group gap="xs" mb="sm">
              <IconTicket size={20} color="var(--mantine-color-blue-6)" />
              <Text size="lg" fw={600}>Informations Billet</Text>
            </Group>
            <Grid>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Numéro</Text>
                <Text size="sm" fw={600}>{result.ticket.ticketNumber}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Catégorie</Text>
                <Text size="sm" fw={600}>{result.ticket.ticketCategoryName}</Text>
              </Grid.Col>
              {result.ticket.alreadyScanned && result.ticket.scannedAt && (
                <Grid.Col span={12}>
                  <Badge color="orange" variant="filled" fullWidth>
                    Scanné le {formatDate(result.ticket.scannedAt)}
                  </Badge>
                </Grid.Col>
              )}
            </Grid>
          </Paper>
        )}

        {/* Bouton fermer */}
        <Button
          size="lg"
          fullWidth
          onClick={onClose}
          color={getStatusColor()}
          variant="filled"
          leftSection={<IconX size={20} />}
        >
          Fermer et scanner suivant
        </Button>
      </Stack>
    </Modal>
  );
}
