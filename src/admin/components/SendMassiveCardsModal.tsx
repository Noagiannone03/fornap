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
import { sendMembershipCardsToAll } from '../../shared/services/userService';

interface SendMassiveCardsModalProps {
  opened: boolean;
  onClose: () => void;
  onComplete: () => void;
  totalUsers: number;
  forceResend?: boolean;
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
  errorDetails: Array<{ userId: string; userName: string; error: string }>;
}

export function SendMassiveCardsModal({
  opened,
  onClose,
  onComplete,
  totalUsers,
  forceResend = false,
}: SendMassiveCardsModalProps) {
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
      const sendResult = await sendMembershipCardsToAll(forceResend, (progressUpdate) => {
        setProgress(progressUpdate);
      });

      setResult(sendResult);
      onComplete();
    } catch (error: any) {
      setResult({
        success: 0,
        errors: totalUsers,
        total: totalUsers,
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
      title={forceResend ? 'Renvoyer les cartes à tous les utilisateurs' : 'Envoyer les cartes à tous les utilisateurs'}
      size="lg"
      centered
      closeOnClickOutside={!sending}
      closeOnEscape={!sending}
    >
      <Stack gap="md">
        {!result && !sending && (
          <>
            <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
              <Text size="sm">
                <strong>Action groupée</strong>
              </Text>
              <Text size="xs" mt="xs">
                Cette action va {forceResend ? 'renvoyer' : 'envoyer'} les cartes d'adhérent à tous les {totalUsers} utilisateurs.
              </Text>
              <Text size="xs" mt="xs">
                {forceResend
                  ? 'Les cartes seront renvoyées même si elles ont déjà été envoyées.'
                  : 'Les cartes ne seront envoyées qu\'aux utilisateurs qui ne les ont pas encore reçues.'}
              </Text>
            </Alert>

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                onClick={handleSend}
                leftSection={<IconSend size={16} />}
                color={forceResend ? 'blue' : 'green'}
              >
                {forceResend ? 'Renvoyer à tous' : 'Envoyer à tous'}
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
              <Progress value={progressPercentage} animated />
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
                          Total
                        </Text>
                        <Text size="xl" fw={700} c="gray">
                          {result.total}
                        </Text>
                      </div>
                    </Group>
                  </Paper>
                </Group>

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
                      {result.success > 1 ? 's' : ''} avec succès !
                    </Text>
                  </Alert>
                )}
              </Stack>
            </Paper>

            <Group justify="flex-end" mt="md">
              <Button onClick={handleClose}>Fermer</Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
