import { useState } from 'react';
import {
  Modal,
  Button,
  Text,
  Stack,
  Textarea,
  Alert,
  Paper,
  Group,
  Divider,
} from '@mantine/core';
import {
  IconUserPlus,
  IconAlertCircle,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { db } from '../../shared/config/firebase';
import { doc, setDoc, Timestamp, collection } from 'firebase/firestore';
import { getUserByEmail } from '../../shared/services/userService';

interface QuickAddUserModalProps {
  opened: boolean;
  onClose: () => void;
  adminUserId: string;
  onAddComplete: () => void;
}

interface ParsedUser {
  inscription: string;
  nom: string;
  prenom: string;
  dateNaissance?: string;
  codePostal?: string;
  email: string;
  telephone?: string;
}

/**
 * Parse une date au format américain (MM/DD/YYYY ou M/D/YYYY)
 * Exemple: 4/29/1984 = 29 avril 1984
 */
function parseAmericanDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;

  try {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.error('Error parsing date:', dateStr, e);
  }

  return undefined;
}

/**
 * Parse la date d'inscription au format américain (MM/DD/YYYY HH:MM:SS)
 */
function parseInscriptionDate(inscriptionStr: string): Timestamp | null {
  if (!inscriptionStr) return null;

  try {
    const [datePart, timePart] = inscriptionStr.split(' ');
    if (!datePart) return null;

    const [month, day, year] = datePart.split('/');
    if (!month || !day || !year) return null;

    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day)
    );

    if (timePart) {
      const [hours, minutes, seconds] = timePart.split(':');
      if (hours) date.setHours(parseInt(hours));
      if (minutes) date.setMinutes(parseInt(minutes));
      if (seconds) date.setSeconds(parseInt(seconds));
    }

    return Timestamp.fromDate(date);
  } catch (e) {
    console.error('Error parsing inscription date:', inscriptionStr, e);
    return null;
  }
}

/**
 * Parse une ligne collée depuis le CSV
 * Format attendu: INSCRIPTION [TAB] NOM [TAB] PRENOM [TAB] DATE_NAISSANCE [TAB] CODE_POSTAL [TAB] EMAIL [TAB] TELEPHONE
 * Exemple: "12/31/2024 16:44:41    Eghikian    Marion    4/29/1984    83000    alexandre.eghikian@orange.fr    0627542706"
 */
function parseUserLine(line: string): ParsedUser | null {
  // Détecter le séparateur (tabulation, espaces multiples, etc.)
  let parts: string[];

  // Essayer avec tabulation d'abord
  if (line.includes('\t')) {
    parts = line.split('\t').map(p => p.trim()).filter(p => p);
  }
  // Sinon essayer avec plusieurs espaces
  else {
    parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p);
  }

  // On attend au minimum 6 champs (inscription, nom, prenom, date naissance, code postal, email)
  // Le téléphone est optionnel
  if (parts.length < 6) {
    return null;
  }

  const [inscription, nom, prenom, dateNaissance, codePostal, email, telephone] = parts;

  if (!inscription || !nom || !prenom || !email) {
    return null;
  }

  return {
    inscription: inscription.trim(),
    nom: nom.trim(),
    prenom: prenom.trim(),
    dateNaissance: dateNaissance?.trim(),
    codePostal: codePostal?.trim(),
    email: email.trim(),
    telephone: telephone?.trim(),
  };
}

/**
 * Crée un utilisateur dans Firestore
 * Lance une erreur si l'email existe déjà
 */
async function createUserFromLine(user: ParsedUser, adminUserId: string): Promise<void> {
  const email = user.email.toLowerCase().trim();

  // ✅ Vérifier si un utilisateur avec cet email existe déjà
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new Error(`Un utilisateur avec l'email ${email} existe déjà (${existingUser.firstName} ${existingUser.lastName})`);
  }

  const uid = doc(collection(db, 'users')).id;

  const inscriptionTimestamp = parseInscriptionDate(user.inscription);
  const createdAt = inscriptionTimestamp || Timestamp.now();

  const birthDateString = user.dateNaissance ? parseAmericanDate(user.dateNaissance) : undefined;
  const birthDate = birthDateString ? Timestamp.fromDate(new Date(birthDateString)) : undefined;

  // Calculer la date d'expiration (1 an après l'inscription)
  const startDate = createdAt;
  const expiryDate = new Date(createdAt.toDate());
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  const userData = {
    uid,
    email,
    firstName: user.prenom.trim(),
    lastName: user.nom.trim(),
    postalCode: user.codePostal || '',
    birthDate: birthDate || undefined, // Ne pas mettre de date par défaut si non fournie
    phone: user.telephone || '',

    status: {
      tags: ['QUICK_ADD', 'NEW_MEMBER'],
      isAccountBlocked: false,
      isCardBlocked: false,
    },

    registration: {
      source: 'admin' as const,
      createdBy: adminUserId,
      createdAt: createdAt,
    },

    currentMembership: {
      planId: 'adhesion_annual_12eur',
      planName: 'Adhésion annuelle 12€',
      planType: 'annual' as const,
      status: 'active' as const,
      paymentStatus: 'paid' as const,
      startDate: startDate,
      expiryDate: Timestamp.fromDate(expiryDate),
      price: 12,
      autoRenew: false,
    },

    loyaltyPoints: 0,

    emailStatus: {
      membershipCardSent: false,
      membershipCardSentCount: 0,
      membershipCardSentAt: null,
    },

    qrCode: `FORNAP-MEMBER:${uid}`,

    createdAt: createdAt,
    updatedAt: Timestamp.now(),
  };

  await setDoc(doc(db, 'users', uid), userData);

  // Créer membershipHistory
  await setDoc(doc(db, 'users', uid, 'membershipHistory', createdAt.toMillis().toString()), {
    id: createdAt.toMillis().toString(),
    planId: 'adhesion_annual_12eur',
    planName: 'Adhésion annuelle 12€',
    planType: 'annual',
    status: 'active',
    startDate: startDate,
    endDate: Timestamp.fromDate(expiryDate),
    price: 12,
    isRenewal: false,
  });

  // Créer actionHistory
  await setDoc(doc(db, 'users', uid, 'actionHistory', createdAt.toMillis().toString()), {
    id: createdAt.toMillis().toString(),
    actionType: 'membership_created',
    details: {
      reason: 'Ajout rapide - Adhésion annuelle 12€',
      originalInscriptionDate: user.inscription,
    },
    timestamp: createdAt,
  });
}

export function QuickAddUserModal({
  opened,
  onClose,
  adminUserId,
  onAddComplete,
}: QuickAddUserModalProps) {
  const [inputLine, setInputLine] = useState('');
  const [parsedUser, setParsedUser] = useState<ParsedUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (value: string) => {
    setInputLine(value);
    setError(null);

    if (value.trim()) {
      const parsed = parseUserLine(value);
      if (parsed) {
        setParsedUser(parsed);
      } else {
        setParsedUser(null);
        setError('Format invalide. Vérifiez que vous avez copié une ligne complète du CSV.');
      }
    } else {
      setParsedUser(null);
    }
  };

  const handleAdd = async () => {
    if (!parsedUser) return;

    setLoading(true);
    setError(null);

    try {
      await createUserFromLine(parsedUser, adminUserId);

      notifications.show({
        title: 'Succès',
        message: `Utilisateur ${parsedUser.prenom} ${parsedUser.nom} créé avec succès`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      onAddComplete();
      handleClose();
    } catch (err: any) {
      console.error('Error creating user:', err);
      const errorMessage = err.message || 'Une erreur est survenue lors de la création de l\'utilisateur';

      setError(errorMessage);

      // Message différent si c'est un doublon d'email
      if (errorMessage.includes('existe déjà')) {
        notifications.show({
          title: 'Utilisateur déjà existant',
          message: errorMessage,
          color: 'orange',
          icon: <IconAlertCircle size={16} />,
        });
      } else {
        notifications.show({
          title: 'Erreur',
          message: errorMessage,
          color: 'red',
          icon: <IconX size={16} />,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInputLine('');
    setParsedUser(null);
    setError(null);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Ajout rapide d'un utilisateur"
      size="lg"
      centered
    >
      <Stack gap="md">
        <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            Collez une ligne du fichier CSV dans le champ ci-dessous.
          </Text>
          <Text size="xs" mt="xs" fw={600}>
            Format attendu (séparé par tabulations ou espaces multiples):
          </Text>
          <Text size="xs" ml="md" style={{ fontFamily: 'monospace' }}>
            INSCRIPTION [TAB] NOM [TAB] PRENOM [TAB] DATE_NAISSANCE [TAB] CODE_POSTAL [TAB] EMAIL [TAB] TELEPHONE
          </Text>
          <Text size="xs" mt="xs" c="dimmed">
            • INSCRIPTION: format MM/DD/YYYY HH:MM:SS (ex: 12/31/2024 16:44:41)
          </Text>
          <Text size="xs" c="dimmed">
            • DATE_NAISSANCE: format MM/DD/YYYY (ex: 4/29/1984)
          </Text>
          <Text size="xs" mt="xs" fw={600}>
            Exemple complet:
          </Text>
          <Text size="xs" style={{ fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' }}>
            12/31/2024 16:44:41    Eghikian    Marion    4/29/1984    83000    alexandre.eghikian@orange.fr    0627542706
          </Text>
        </Alert>

        <Textarea
          label="Ligne CSV"
          placeholder="Collez une ligne du CSV ici..."
          value={inputLine}
          onChange={(e) => handleInputChange(e.currentTarget.value)}
          minRows={3}
          autosize
          error={error}
        />

        {parsedUser && !error && (
          <>
            <Divider />
            <Paper withBorder p="md" radius="md" bg="green.0">
              <Stack gap="xs">
                <Group>
                  <IconCheck size={20} color="green" />
                  <Text size="sm" fw={600} c="green">
                    Ligne valide - Prêt à créer l'utilisateur
                  </Text>
                </Group>
                <Divider />
                <Text size="sm">
                  <strong>Nom:</strong> {parsedUser.nom}
                </Text>
                <Text size="sm">
                  <strong>Prénom:</strong> {parsedUser.prenom}
                </Text>
                <Text size="sm">
                  <strong>Email:</strong> {parsedUser.email}
                </Text>
                <Text size="sm">
                  <strong>Téléphone:</strong> {parsedUser.telephone || 'Non renseigné'}
                </Text>
                <Text size="sm">
                  <strong>Date de naissance:</strong> {parsedUser.dateNaissance || 'Non renseignée'}
                </Text>
                <Text size="sm">
                  <strong>Code postal:</strong> {parsedUser.codePostal || 'Non renseigné'}
                </Text>
                <Text size="sm">
                  <strong>Inscription:</strong> {parsedUser.inscription}
                </Text>
              </Stack>
            </Paper>
          </>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!parsedUser || loading}
            loading={loading}
            leftSection={<IconUserPlus size={16} />}
            color="green"
          >
            {loading ? 'Création en cours...' : 'Créer l\'utilisateur'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
