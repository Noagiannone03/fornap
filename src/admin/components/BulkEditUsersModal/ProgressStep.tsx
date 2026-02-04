import {
  Stack,
  Text,
  Paper,
  Progress,
  Group,
  Alert,
  List,
  ScrollArea,
  Divider,
  Button,
} from '@mantine/core';
import {
  IconCheck,
  IconX,
  IconAlertCircle,
  IconLoader2,
} from '@tabler/icons-react';
import type { ProgressStepProps } from './types';

export function ProgressStep({
  progress,
  result,
  isExecuting,
  onClose,
}: ProgressStepProps) {
  const progressPercentage = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <Stack gap="md">
      {/* En cours d'execution */}
      {isExecuting && progress && (
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Group>
              <IconLoader2 size={20} className="animate-spin" />
              <Text size="sm" fw={500}>
                Modification en cours...
              </Text>
            </Group>
            <Progress value={progressPercentage} animated size="lg" />
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                {progress.current} / {progress.total}
              </Text>
              <Text size="xs" c="dimmed">
                {progressPercentage}%
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              Traitement : <strong>{progress.currentUserName}</strong>
            </Text>
            <Divider my="xs" />
            <Group justify="space-between">
              <Text size="sm" c="green">
                Succes : {progress.success}
              </Text>
              <Text size="sm" c="orange">
                Ignores : {progress.skipped}
              </Text>
              <Text size="sm" c="red">
                Erreurs : {progress.errors}
              </Text>
            </Group>
          </Stack>
        </Paper>
      )}

      {/* Resultats */}
      {result && (
        <>
          <Paper withBorder p="md" radius="md">
            <Stack gap="md">
              <Text size="lg" fw={600}>
                Resultat de la modification
              </Text>

              <Group grow>
                <Paper withBorder p="sm" radius="md" bg="green.0">
                  <Group>
                    <IconCheck size={24} color="green" />
                    <div>
                      <Text size="xs" c="dimmed">
                        Reussis
                      </Text>
                      <Text size="xl" fw={700} c="green">
                        {result.success}
                      </Text>
                    </div>
                  </Group>
                </Paper>

                <Paper withBorder p="sm" radius="md" bg="orange.0">
                  <Group>
                    <IconAlertCircle size={24} color="orange" />
                    <div>
                      <Text size="xs" c="dimmed">
                        Ignores
                      </Text>
                      <Text size="xl" fw={700} c="orange">
                        {result.skipped}
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

              {result.success > 0 && (
                <Alert icon={<IconCheck size={16} />} color="green" variant="light">
                  <Text size="sm">
                    {result.success} utilisateur{result.success > 1 ? 's ont' : ' a'} ete modifie
                    {result.success > 1 ? 's' : ''} avec succes !
                  </Text>
                </Alert>
              )}

              {result.skipped > 0 && (
                <Alert icon={<IconAlertCircle size={16} />} color="orange" variant="light">
                  <Text size="sm">
                    {result.skipped} utilisateur{result.skipped > 1 ? 's ont' : ' a'} ete ignore
                    {result.skipped > 1 ? 's' : ''} (non trouves ou deja dans l'etat souhaite).
                  </Text>
                </Alert>
              )}

              {result.errors > 0 && result.errorDetails.length > 0 && (
                <>
                  <Divider />
                  <div>
                    <Text size="sm" fw={600} mb="xs">
                      Details des erreurs :
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
            </Stack>
          </Paper>

          <Group justify="flex-end" mt="md">
            <Button onClick={onClose}>Fermer</Button>
          </Group>
        </>
      )}
    </Stack>
  );
}
