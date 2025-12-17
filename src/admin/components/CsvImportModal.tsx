import { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Text,
  Stack,
  FileButton,
  Group,
  Paper,
  Progress,
  Alert,
  Divider,
  ScrollArea,
  TextInput,
  MultiSelect,
  Accordion,
  Badge,
  Tooltip,
  Box,
  Loader,
} from '@mantine/core';
import {
  IconUpload,
  IconFileTypeCsv,
  IconCheck,
  IconAlertCircle,
  IconX,
  IconEdit,
  IconRefresh,
  IconTags,
} from '@tabler/icons-react';
import { importUsersFromCsv, importSingleUser } from '../services/csvImportService';
import type { ImportResult, ImportError, CsvRow } from '../services/csvImportService';
import { getAllTags } from '../../shared/services/tagService';
import type { TagConfig } from '../../shared/services/tagService';
import * as XLSX from 'xlsx';

interface CsvImportModalProps {
  opened: boolean;
  onClose: () => void;
  adminUserId: string;
  onImportComplete: () => void;
}

interface EditableError extends ImportError {
  isEditing: boolean;
  editedData: CsvRow;
  retryStatus: 'idle' | 'loading' | 'success' | 'error';
  retryError?: string;
}

export function CsvImportModal({
  opened,
  onClose,
  adminUserId,
  onImportComplete,
}: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<TagConfig[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [editableErrors, setEditableErrors] = useState<EditableError[]>([]);

  // Charger les tags disponibles
  useEffect(() => {
    if (opened) {
      loadTags();
    }
  }, [opened]);

  const loadTags = async () => {
    setLoadingTags(true);
    try {
      const tags = await getAllTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
    setResult(null);
    setEditableErrors([]);
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);
    setEditableErrors([]);

    try {
      let csvContent: string;

      // Vérifier si c'est un fichier XLSX ou CSV
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parser le fichier XLSX
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Prendre la première feuille
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convertir en CSV avec tabulation comme séparateur
        csvContent = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
      } else {
        // C'est un fichier CSV classique
        csvContent = await file.text();
      }

      const importResult = await importUsersFromCsv(csvContent, adminUserId, {
        customTags: selectedTags,
      });
      setResult(importResult);

      // Préparer les erreurs éditables
      if (importResult.errors.length > 0) {
        setEditableErrors(
          importResult.errors.map((err) => ({
            ...err,
            isEditing: false,
            editedData: err.rawData || {
              inscription: '',
              nom: '',
              prenom: '',
              email: '',
              dateNaissance: '',
              codePostal: '',
              telephone: '',
            },
            retryStatus: 'idle',
          }))
        );
      }

      if (importResult.success > 0) {
        onImportComplete();
      }
    } catch (error: any) {
      setResult({
        success: 0,
        errors: [{ row: 0, email: '', error: error.message }],
        skipped: 0,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleEditError = (index: number) => {
    setEditableErrors((prev) =>
      prev.map((err, i) => (i === index ? { ...err, isEditing: true } : err))
    );
  };

  const handleCancelEdit = (index: number) => {
    setEditableErrors((prev) =>
      prev.map((err, i) =>
        i === index
          ? {
            ...err,
            isEditing: false,
            editedData: err.rawData || {
              inscription: '',
              nom: '',
              prenom: '',
              email: '',
              dateNaissance: '',
              codePostal: '',
              telephone: '',
            },
          }
          : err
      )
    );
  };

  const handleUpdateField = (index: number, field: keyof CsvRow, value: string) => {
    setEditableErrors((prev) =>
      prev.map((err, i) =>
        i === index
          ? {
            ...err,
            editedData: { ...err.editedData, [field]: value },
          }
          : err
      )
    );
  };

  const handleRetryImport = async (index: number) => {
    const errorItem = editableErrors[index];
    if (!errorItem) return;

    setEditableErrors((prev) =>
      prev.map((err, i) => (i === index ? { ...err, retryStatus: 'loading', retryError: undefined } : err))
    );

    try {
      await importSingleUser(errorItem.editedData, adminUserId, selectedTags);

      // Succès - marquer comme réussi
      setEditableErrors((prev) =>
        prev.map((err, i) => (i === index ? { ...err, retryStatus: 'success', isEditing: false } : err))
      );

      // Mettre à jour le compteur de succès
      setResult((prev) =>
        prev
          ? {
            ...prev,
            success: prev.success + 1,
          }
          : prev
      );

      onImportComplete();
    } catch (error: any) {
      setEditableErrors((prev) =>
        prev.map((err, i) =>
          i === index
            ? {
              ...err,
              retryStatus: 'error',
              retryError: error.message || 'Erreur inconnue',
            }
            : err
        )
      );
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setSelectedTags([]);
    setEditableErrors([]);
    onClose();
  };

  const pendingErrors = editableErrors.filter((e) => e.retryStatus !== 'success');
  const successfulRetries = editableErrors.filter((e) => e.retryStatus === 'success');

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Importer des utilisateurs depuis un CSV"
      size="xl"
      centered
    >
      <Stack gap="md">
        <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            <strong>Format attendu:</strong> Fichier CSV ou XLSX (le séparateur est détecté automatiquement)
          </Text>
          <Text size="xs" mt="xs" fw={600}>
            Colonnes requises:
          </Text>
          <Text size="xs" ml="md">
            • INSCRIPTION (date d'inscription, format: MM/DD/YYYY HH:MM:SS)
          </Text>
          <Text size="xs" ml="md">
            • NOM
          </Text>
          <Text size="xs" ml="md">
            • PRENOM
          </Text>
          <Text size="xs" ml="md">
            • ADRESSE EMAIL
          </Text>
          <Text size="xs" mt="xs" fw={600}>
            Colonnes optionnelles:
          </Text>
          <Text size="xs" ml="md">
            • DATE DE NAISSANCE (format: DD/MM/YYYY)
          </Text>
          <Text size="xs" ml="md">
            • CODE POSTAL
          </Text>
          <Text size="xs" ml="md">
            • NUMERO DE TELEPHONE
          </Text>
          <Text size="xs" mt="xs" c="orange" fw={500}>
            ⚠️ Tous les utilisateurs importés auront un abonnement ANNUAL à 12€, valable 1 an à partir de leur date d'inscription.
          </Text>
        </Alert>

        {!result && (
          <>
            {/* Sélection des tags */}
            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <Group gap="xs">
                  <IconTags size={20} />
                  <Text size="sm" fw={600}>
                    Tags à assigner aux utilisateurs importés
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  Selectionnez les tags qui seront automatiquement assignes a tous les utilisateurs importes depuis ce fichier.
                </Text>
                {loadingTags ? (
                  <Group gap="xs">
                    <Loader size="xs" />
                    <Text size="xs">Chargement des tags...</Text>
                  </Group>
                ) : (
                  <MultiSelect
                    data={availableTags.map((tag) => ({
                      value: tag.name,
                      label: tag.name,
                    }))}
                    value={selectedTags}
                    onChange={setSelectedTags}
                    placeholder="Sélectionner des tags"
                    searchable
                    clearable
                    nothingFoundMessage="Aucun tag trouvé"
                  />
                )}
                {selectedTags.length > 0 && (
                  <Group gap="xs">
                    <Text size="xs" c="dimmed">
                      Tags selectionnes:
                    </Text>
                    {selectedTags.map((tag) => (
                      <Badge key={tag} size="xs" color="blue">
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                )}
              </Stack>
            </Paper>

            {/* Sélection du fichier */}
            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <Group>
                  <IconFileTypeCsv size={32} />
                  <div style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                      {file ? file.name : 'Aucun fichier sélectionné'}
                    </Text>
                    {file && (
                      <Text size="xs" c="dimmed">
                        {(file.size / 1024).toFixed(2)} KB
                      </Text>
                    )}
                  </div>
                </Group>

                <Group justify="space-between">
                  <FileButton onChange={handleFileSelect} accept=".csv,.tsv,.xlsx,.xls,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel">
                    {(props) => (
                      <Button {...props} leftSection={<IconUpload size={16} />} variant="light">
                        Choisir un fichier CSV/XLSX
                      </Button>
                    )}
                  </FileButton>

                  {file && (
                    <Button variant="subtle" color="red" onClick={() => setFile(null)}>
                      Annuler
                    </Button>
                  )}
                </Group>
              </Stack>
            </Paper>

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={handleClose} disabled={importing}>
                Fermer
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || importing}
                loading={importing}
                leftSection={<IconUpload size={16} />}
              >
                {importing ? 'Import en cours...' : 'Importer'}
              </Button>
            </Group>
          </>
        )}

        {importing && (
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Text size="sm" fw={500}>
                Import en cours...
              </Text>
              <Progress value={100} animated />
              <Text size="xs" c="dimmed">
                Veuillez patienter pendant la création des comptes utilisateurs
              </Text>
            </Stack>
          </Paper>
        )}

        {result && (
          <>
            <Divider my="sm" />

            <Paper withBorder p="md" radius="md">
              <Stack gap="md">
                <Text size="lg" fw={600}>
                  Résultat de l'import
                </Text>

                {result.debugInfo && (
                  <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                    <Text size="xs" fw={600} mb="xs">
                      Informations de débogage:
                    </Text>
                    <Text size="xs">
                      • Séparateur détecté: <strong>{result.debugInfo.separator}</strong>
                    </Text>
                    <Text size="xs">
                      • Nombre de colonnes: <strong>{result.debugInfo.headers.length}</strong>
                    </Text>
                    {result.debugInfo.firstRowSample && (
                      <>
                        <Text size="xs" mt="xs" fw={600}>
                          Échantillon première ligne:
                        </Text>
                        <Text size="xs">
                          • Nom: <strong>{result.debugInfo.firstRowSample.nom || '(vide)'}</strong>
                        </Text>
                        <Text size="xs">
                          • Prénom: <strong>{result.debugInfo.firstRowSample.prenom || '(vide)'}</strong>
                        </Text>
                        <Text size="xs">
                          • Email: <strong>{result.debugInfo.firstRowSample.email || '(vide)'}</strong>
                        </Text>
                        <Text size="xs">
                          • Téléphone: <strong>{result.debugInfo.firstRowSample.telephone || '(vide)'}</strong>
                        </Text>
                      </>
                    )}
                  </Alert>
                )}

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
                          {successfulRetries.length > 0 && (
                            <Text span size="xs" c="dimmed" ml="xs">
                              (+{successfulRetries.length} corrigés)
                            </Text>
                          )}
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
                          {pendingErrors.length}
                        </Text>
                      </div>
                    </Group>
                  </Paper>

                  <Paper withBorder p="sm" radius="md" bg="gray.0">
                    <Group>
                      <IconAlertCircle size={24} color="gray" />
                      <div>
                        <Text size="xs" c="dimmed">
                          Ignorés
                        </Text>
                        <Text size="xl" fw={700} c="gray">
                          {result.skipped}
                        </Text>
                      </div>
                    </Group>
                  </Paper>
                </Group>

                {/* Section des erreurs éditables */}
                {editableErrors.length > 0 && (
                  <>
                    <Divider />
                    <div>
                      <Group justify="space-between" mb="xs">
                        <Text size="sm" fw={600}>
                          Détails des erreurs ({pendingErrors.length} restantes)
                        </Text>
                        <Text size="xs" c="dimmed">
                          Cliquez sur "Modifier" pour corriger les données et réessayer l'import
                        </Text>
                      </Group>

                      <ScrollArea h={400}>
                        <Accordion variant="separated">
                          {editableErrors.map((err, idx) => (
                            <Accordion.Item
                              key={idx}
                              value={`error-${idx}`}
                              style={{
                                backgroundColor:
                                  err.retryStatus === 'success'
                                    ? 'var(--mantine-color-green-0)'
                                    : err.retryStatus === 'error'
                                      ? 'var(--mantine-color-red-0)'
                                      : undefined,
                              }}
                            >
                              <Accordion.Control>
                                <Group justify="space-between" wrap="nowrap">
                                  <Group gap="xs">
                                    {err.retryStatus === 'success' ? (
                                      <Badge color="green" size="sm">
                                        Corrigé
                                      </Badge>
                                    ) : err.retryStatus === 'loading' ? (
                                      <Loader size="xs" />
                                    ) : (
                                      <Badge color="red" size="sm">
                                        Erreur
                                      </Badge>
                                    )}
                                    <Text size="sm" fw={500}>
                                      Ligne {err.row}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      ({err.email || 'email non trouvé'})
                                    </Text>
                                  </Group>
                                </Group>
                              </Accordion.Control>
                              <Accordion.Panel>
                                <Stack gap="sm">
                                  <Alert
                                    color={err.retryStatus === 'success' ? 'green' : 'red'}
                                    variant="light"
                                    icon={err.retryStatus === 'success' ? <IconCheck size={16} /> : <IconX size={16} />}
                                  >
                                    <Text size="xs">
                                      {err.retryStatus === 'success'
                                        ? 'Utilisateur importé avec succès !'
                                        : err.retryError || err.error}
                                    </Text>
                                  </Alert>

                                  {err.retryStatus !== 'success' && (
                                    <>
                                      {err.isEditing ? (
                                        <Box>
                                          <Text size="xs" fw={600} mb="xs">
                                            Modifier les données:
                                          </Text>
                                          <Stack gap="xs">
                                            <Group grow>
                                              <TextInput
                                                label="Inscription"
                                                placeholder="MM/DD/YYYY HH:MM:SS"
                                                size="xs"
                                                value={err.editedData.inscription}
                                                onChange={(e) =>
                                                  handleUpdateField(idx, 'inscription', e.target.value)
                                                }
                                              />
                                              <TextInput
                                                label="Email"
                                                placeholder="email@example.com"
                                                size="xs"
                                                value={err.editedData.email}
                                                onChange={(e) => handleUpdateField(idx, 'email', e.target.value)}
                                              />
                                            </Group>
                                            <Group grow>
                                              <TextInput
                                                label="Prénom"
                                                size="xs"
                                                value={err.editedData.prenom}
                                                onChange={(e) => handleUpdateField(idx, 'prenom', e.target.value)}
                                              />
                                              <TextInput
                                                label="Nom"
                                                size="xs"
                                                value={err.editedData.nom}
                                                onChange={(e) => handleUpdateField(idx, 'nom', e.target.value)}
                                              />
                                            </Group>
                                            <Group grow>
                                              <TextInput
                                                label="Date de naissance"
                                                placeholder="DD/MM/YYYY"
                                                size="xs"
                                                value={err.editedData.dateNaissance || ''}
                                                onChange={(e) =>
                                                  handleUpdateField(idx, 'dateNaissance', e.target.value)
                                                }
                                              />
                                              <TextInput
                                                label="Code postal"
                                                size="xs"
                                                value={err.editedData.codePostal || ''}
                                                onChange={(e) => handleUpdateField(idx, 'codePostal', e.target.value)}
                                              />
                                            </Group>
                                            <TextInput
                                              label="Téléphone"
                                              size="xs"
                                              value={err.editedData.telephone || ''}
                                              onChange={(e) => handleUpdateField(idx, 'telephone', e.target.value)}
                                            />
                                          </Stack>
                                          <Group justify="flex-end" mt="sm">
                                            <Button
                                              size="xs"
                                              variant="subtle"
                                              onClick={() => handleCancelEdit(idx)}
                                            >
                                              Annuler
                                            </Button>
                                            <Button
                                              size="xs"
                                              color="green"
                                              leftSection={<IconRefresh size={14} />}
                                              onClick={() => handleRetryImport(idx)}
                                              loading={err.retryStatus === 'loading'}
                                            >
                                              Réessayer l'import
                                            </Button>
                                          </Group>
                                        </Box>
                                      ) : (
                                        <Box>
                                          <Text size="xs" fw={600} mb="xs">
                                            Données actuelles:
                                          </Text>
                                          <Stack gap={4}>
                                            <Text size="xs">
                                              <strong>Inscription:</strong> {err.rawData?.inscription || '(vide)'}
                                            </Text>
                                            <Text size="xs">
                                              <strong>Nom:</strong> {err.rawData?.nom || '(vide)'}
                                            </Text>
                                            <Text size="xs">
                                              <strong>Prénom:</strong> {err.rawData?.prenom || '(vide)'}
                                            </Text>
                                            <Text size="xs">
                                              <strong>Email:</strong> {err.rawData?.email || '(vide)'}
                                            </Text>
                                            <Text size="xs">
                                              <strong>Date de naissance:</strong> {err.rawData?.dateNaissance || '(vide)'}
                                            </Text>
                                            <Text size="xs">
                                              <strong>Code postal:</strong> {err.rawData?.codePostal || '(vide)'}
                                            </Text>
                                            <Text size="xs">
                                              <strong>Téléphone:</strong> {err.rawData?.telephone || '(vide)'}
                                            </Text>
                                          </Stack>
                                          <Group justify="flex-end" mt="sm">
                                            <Tooltip label="Modifier les données pour réessayer">
                                              <Button
                                                size="xs"
                                                variant="light"
                                                leftSection={<IconEdit size={14} />}
                                                onClick={() => handleEditError(idx)}
                                              >
                                                Modifier et réessayer
                                              </Button>
                                            </Tooltip>
                                          </Group>
                                        </Box>
                                      )}
                                    </>
                                  )}
                                </Stack>
                              </Accordion.Panel>
                            </Accordion.Item>
                          ))}
                        </Accordion>
                      </ScrollArea>
                    </div>
                  </>
                )}

                {result.success > 0 && pendingErrors.length === 0 && (
                  <Alert icon={<IconCheck size={16} />} color="green" variant="light">
                    <Text size="sm">
                      {result.success} utilisateur{result.success > 1 ? 's ont' : ' a'} été créé
                      {result.success > 1 ? 's' : ''} avec succès !
                    </Text>
                    <Text size="xs" mt="xs">
                      Les documents utilisateurs ont été créés dans la base de données. Les utilisateurs devront créer leur compte pour se connecter.
                    </Text>
                    {selectedTags.length > 0 && (
                      <Text size="xs" mt="xs">
                        Tags assignes: <strong>{selectedTags.join(', ')}</strong>
                      </Text>
                    )}
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
