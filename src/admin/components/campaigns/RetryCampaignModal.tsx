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
  IconRefresh,
} from '@tabler/icons-react';
import { retryFailedEmailsWithProgress } from '../../../shared/services/campaignService';

interface RetryCampaignModalProps {
  opened: boolean;
  onClose: () => void;
  onComplete: () => void;
  campaignId: string;
  campaignName: string;
  totalFailed: number;
}

interface ProgressState {
  current: number;
  total: number;
  currentRecipient: string;
  success: number;
  errors: number;
}

interface ResultState {
  success: number;
  errors: number;
  total: number;
  errorDetails: Array<{ email: string; error: string }>;
}

export function RetryCampaignModal({
  opened,
  onClose,
  onComplete,
  campaignId,
  campaignName,
  totalFailed,
}: RetryCampaignModalProps) {
  const [retrying, setRetrying] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);

  const handleRetry = async () => {
    setRetrying(true);
    setProgress({
      current: 0,
      total: totalFailed,
      currentRecipient: 'Démarrage du retry...',
      success: 0,
      errors: 0,
    });
    setResult(null);

    try {
      const retryResult = await retryFailedEmailsWithProgress(campaignId, (progressUpdate) => {
        setProgress(progressUpdate);
      });

      setResult(retryResult);
      onComplete();
    } catch (error: any) {
      setResult({
        success: 0,
        errors: totalFailed,
        total: totalFailed,
        errorDetails: [{ email: 'system', error: error.message }],
      });
    } finally {
      setRetrying(false);
    }
  };

  const handleClose = () => {
    if (!retrying) {
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
      title={`Renvoyer les emails en échec: ${campaignName}`}
      size="lg"
      centered
      closeOnClickOutside={!retrying}
      closeOnEscape={!retrying}
    >
      <Stack gap="md">
        {!result && !retrying && (
          <>
            <Alert icon={<IconAlertCircle size={16} />} color="orange" variant="light">
              <Text size="sm">
                <strong>Retry des emails en échec</strong>
              </Text>
              <Text size="xs" mt="xs">
                Cette action va tenter de renvoyer l'email à tous les destinataires qui n'ont pas reçu l'email lors du premier envoi.
              </Text>
              <Text size="xs" mt="xs" fw={600}>
                Nombre de destinataires en échec : {totalFailed}
              </Text>
            </Alert>

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                onClick={handleRetry}
                leftSection={<IconRefresh size={16} />}
                color="orange"
              >
                Réessayer maintenant
              </Button>
            </Group>
          </>
        )}

        {retrying && progress && (
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Text size="sm" fw={500}>
                Envoi en cours...
              </Text>
              <Progress value={progressPercentage} animated color="orange" />
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  {progress.current} / {progress.total}
                </Text>
                <Text size="xs" c="dimmed">
                  {progressPercentage}%
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Traitement : <strong>{progress.currentRecipient}</strong>
              </Text>
              <Group justify="space-between">
                <Text size="xs" c="green">
                  ✓ Succès : {progress.success}
                </Text>
                <Text size="xs" c="red">
                  ✗ Échecs : {progress.errors}
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
                  Résultat du retry
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
                                <strong>{err.email}</strong>: {err.error}
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
                      {result.success} email{result.success > 1 ? 's ont' : ' a'} été renvoyé
                      {result.success > 1 ? 's' : ''} avec succès !
                    </Text>
                    {result.errors > 0 && (
                      <Text size="xs" mt="xs" c="dimmed">
                        {result.errors} email{result.errors > 1 ? 's' : ''} reste{result.errors > 1 ? 'nt' : ''} en échec.
                      </Text>
                    )}
                  </Alert>
                )}

                {result.errors === result.total && result.total > 0 && (
                  <Alert icon={<IconX size={16} />} color="red" variant="light">
                    <Text size="sm">
                      Tous les envois ont échoué. Veuillez vérifier les erreurs ci-dessus.
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
