import { useState } from 'react';
import {
  Modal,
  Button,
  Text,
  Stack,
  Group,
  Paper,
  Progress,
  Alert,
  List,
  Divider,
  ScrollArea,
} from '@mantine/core';
import {
  IconCheck,
  IconAlertCircle,
  IconX,
  IconSend,
} from '@tabler/icons-react';
import { sendMembershipCardsToAdminUsersWithoutCard } from '../../shared/services/userService';

interface SendAdminUsersCardsModalProps {
  opened: boolean;
  onClose: () => void;
  onComplete: () => void;
  totalUsers: number;
}

interface ProgressState {
  current: number;
  total: number;
  currentUser: string;
  success: number;
  errors: number;
}

interface ResultState {
  success: number;
  errors: number;
  total: number;
  skipped: number;
  errorDetails: Array<{ userId: string; userName: string; error: string }>;
}

export function SendAdminUsersCardsModal({
  opened,
  onClose,
  onComplete,
  totalUsers,
}: SendAdminUsersCardsModalProps) {
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);

  const handleSend = async () => {
    setSending(true);
    setProgress({
      current: 0,
      total: totalUsers,
      currentUser: 'Démarrage...',
      success: 0,
      errors: 0,
    });
    setResult(null);

    try {
      const sendResult = await sendMembershipCardsToAdminUsersWithoutCard((progressUpdate) => {
        setProgress(progressUpdate);
      });

      setResult(sendResult);
      onComplete();
    } catch (error: any) {
      setResult({
        success: 0,
        errors: totalUsers,
        total: totalUsers,
        skipped: 0,
        errorDetails: [{ userId: 'system', userName: 'Erreur système', error: error.message }],
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setProgress(null);
      setResult(null);
      onClose();
    }
  };

  const progressPercentage = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Envoyer les cartes aux utilisateurs admin sans carte"
      size="lg"
      centered
      closeOnClickOutside={!sending}
      closeOnEscape={!sending}
    >
      <Stack gap="md">
        {!result && !sending && (
          <>
            <Alert icon={<IconAlertCircle size={16} />} color="teal" variant="light">
              <Text size="sm">
                <strong>Envoi ciblé - Utilisateurs créés par admin</strong>
              </Text>
              <Text size="xs" mt="xs">
                Cette action va envoyer les cartes d'adhérent uniquement aux utilisateurs qui:
              </Text>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>
                  <Text size="xs">Ont été créés avec la source "admin"</Text>
                </li>
                <li>
                  <Text size="xs">N'ont pas encore reçu leur carte d'adhérent</Text>
                </li>
              </ul>
              <Text size="xs" mt="xs" fw={600} c="grape">
                ⚡ Les cartes seront envoyées avec l'entête EXORDE (soirée du 31 décembre 2024)
              </Text>
              <Text size="xs" mt="xs" fw={600}>
                Nombre d'utilisateurs concernés : {totalUsers}
              </Text>
              <Text size="xs" mt="xs" c="dimmed">
                Chaque envoi prend environ 0,5 seconde. Temps estimé : ~{Math.ceil(totalUsers * 0.5)} secondes
              </Text>
            </Alert>

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                onClick={handleSend}
                leftSection={<IconSend size={16} />}
                color="teal"
              >
                Envoyer {totalUsers} carte{totalUsers > 1 ? 's' : ''}
              </Button>
            </Group>
          </>
        )}

        {sending && progress && (
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Text size="sm" fw={500}>
                Envoi en cours...
              </Text>
              <Progress value={progressPercentage} animated color="teal" />
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  {progress.current} / {progress.total}
                </Text>
                <Text size="xs" c="dimmed">
                  {progressPercentage}%
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Traitement : <strong>{progress.currentUser}</strong>
              </Text>
              <Group justify="space-between">
                <Text size="xs" c="green">
                  ✓ Succès : {progress.success}
                </Text>
                <Text size="xs" c="red">
                  ✗ Erreurs : {progress.errors}
                </Text>
              </Group>
            </Stack>
          </Paper>
        )}

        {result && (
          <>
            <Divider my="sm" />

            <Paper withBorder p="md" radius="md">
              <Stack gap="md">
                <Text size="lg" fw={600}>
                  Résultat de l'envoi
                </Text>

                <Group grow>
                  <Paper withBorder p="sm" radius="md" bg="green.0">
                    <Group>
                      <IconCheck size={24} color="green" />
                      <div>
                        <Text size="xs" c="dimmed">
                          Réussis
                        </Text>
                        <Text size="xl" fw={700} c="green">
                          {result.success}
                        </Text>
                      </div>
                    </Group>
                  </Paper>

                  <Paper withBorder p="sm" radius="md" bg="red.0">
                    <Group>
                      <IconX size={24} color="red" />
                      <div>
                        <Text size="xs" c="dimmed">
                          Erreurs
                        </Text>
                        <Text size="xl" fw={700} c="red">
                          {result.errors}
                        </Text>
                      </div>
                    </Group>
                  </Paper>

                  <Paper withBorder p="sm" radius="md" bg="gray.0">
                    <Group>
                      <IconAlertCircle size={24} color="gray" />
                      <div>
                        <Text size="xs" c="dimmed">
                          Total traité
                        </Text>
                        <Text size="xl" fw={700} c="gray">
                          {result.total}
                        </Text>
                      </div>
                    </Group>
                  </Paper>
                </Group>

                {result.skipped > 0 && (
                  <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                    <Text size="sm">
                      {result.skipped} utilisateur{result.skipped > 1 ? 's ont' : ' a'} été ignoré{result.skipped > 1 ? 's' : ''} car ne correspondant pas aux critères (source non-admin ou carte déjà envoyée).
                    </Text>
                  </Alert>
                )}

                {result.errors > 0 && result.errorDetails.length > 0 && (
                  <>
                    <Divider />
                    <div>
                      <Text size="sm" fw={600} mb="xs">
                        Détails des erreurs:
                      </Text>
                      <ScrollArea h={200}>
                        <List size="xs" spacing="xs">
                          {result.errorDetails.map((err, idx) => (
                            <List.Item key={idx}>
                              <Text size="xs">
                                <strong>{err.userName}</strong>: {err.error}
                              </Text>
                            </List.Item>
                          ))}
                        </List>
                      </ScrollArea>
                    </div>
                  </>
                )}

                {result.success > 0 && (
                  <Alert icon={<IconCheck size={16} />} color="green" variant="light">
                    <Text size="sm">
                      {result.success} carte{result.success > 1 ? 's ont' : ' a'} été envoyée
                      {result.success > 1 ? 's' : ''} avec succès aux utilisateurs admin !
                    </Text>
                    <Text size="xs" mt="xs">
                      Les utilisateurs recevront leur carte d'adhérent par email avec leur QR code unique et l'entête mentionnant la soirée EXORDE du 31 décembre 2024.
                    </Text>
                  </Alert>
                )}
              </Stack>
            </Paper>

            <Group justify="flex-end" mt="md">
              <Button onClick={handleClose} color="teal">
                Fermer
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
