import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Stack,
  Title,
  Text,
  Badge,
  Group,
  Button,
  Divider,
  Avatar,
  Box,
} from '@mantine/core';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../shared/config/firebase';
import { QRCodeScanner } from '../components/common/QRCodeScanner';
import type { UserProfile } from '../../shared/types/user';
import { IconUser, IconMail, IconPhone, IconCalendar, IconShield } from '@tabler/icons-react';
import { useAdminAuth } from '../../shared/contexts/AdminAuthContext';

export const CheckIn = () => {
  const navigate = useNavigate();
  const { adminProfile } = useAdminAuth();
  const [memberProfile, setMemberProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);

  const handleScan = async (uid: string) => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer le profil du membre depuis Firestore
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        setMemberProfile(profile);
      } else {
        setError('Membre non trouvé dans la base de données');
        setMemberProfile(null);
      }
    } catch (err) {
      console.error('Erreur récupération profil:', err);
      setError('Erreur lors de la récupération des données du membre');
      setMemberProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMemberProfile(null);
    setError(null);
  };

  const isSubscriptionActive = memberProfile?.currentMembership?.status === 'active';

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      }}
    >
      <Container size="md" py={40}>
        <Stack gap="xl">
          {/* Bouton retour pour les admins */}
          {adminProfile && (
            <Button
              leftSection={<IconShield size={18} />}
              variant="light"
              color="indigo"
              onClick={() => navigate('/admin/dashboard')}
              style={{ alignSelf: 'flex-start' }}
            >
              Retour au panel admin
            </Button>
          )}

          {/* En-tête */}
          <Paper
            p="xl"
            style={{
              borderRadius: '20px',
              border: '2px solid #000',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            }}
          >
            <Stack gap="sm" align="center">
              <Title
                order={1}
                size={32}
                fw={900}
                ta="center"
                style={{ letterSpacing: '0.01em' }}
              >
                CHECK-IN MEMBRES
              </Title>
              <Text size="lg" c="dimmed" ta="center">
                Scannez le QR code d'un membre pour vérifier son abonnement
              </Text>
            </Stack>
          </Paper>

        {/* Scanner */}
        {!memberProfile && (
          <Paper
            p="xl"
            style={{
              borderRadius: '20px',
              border: '2px solid #000',
            }}
          >
            <QRCodeScanner onScan={handleScan} onError={setError} />
          </Paper>
        )}

        {/* Résultat du scan */}
        {loading && (
          <Paper
            p="xl"
            style={{
              borderRadius: '20px',
              border: '2px solid #000',
              textAlign: 'center',
            }}
          >
            <Text fw={700}>Chargement des informations...</Text>
          </Paper>
        )}

        {memberProfile && (
          <Paper
            p="xl"
            style={{
              borderRadius: '20px',
              border: '3px solid',
              borderColor: isSubscriptionActive ? '#2f9e44' : '#fa5252',
              background: isSubscriptionActive
                ? 'linear-gradient(135deg, #d3f9d8 0%, #ffffff 100%)'
                : 'linear-gradient(135deg, #ffe0e0 0%, #ffffff 100%)',
            }}
          >
            <Stack gap="xl">
              {/* Statut principal */}
              <Stack gap="md" align="center">
                <Avatar
                  size={100}
                  radius="xl"
                  style={{
                    border: '3px solid #000',
                  }}
                >
                  <IconUser size={50} />
                </Avatar>

                <Stack gap="xs" align="center">
                  <Title order={2} size={28} fw={900}>
                    {memberProfile.firstName.toUpperCase()}{' '}
                    {memberProfile.lastName.toUpperCase()}
                  </Title>

                  <Badge
                    size="xl"
                    variant="filled"
                    color={isSubscriptionActive ? 'green' : 'red'}
                    styles={{
                      root: {
                        fontSize: '1.1rem',
                        fontWeight: 900,
                        padding: '12px 24px',
                        borderRadius: '12px',
                      },
                    }}
                  >
                    {isSubscriptionActive ? 'ACCÈS AUTORISÉ' : 'ACCÈS REFUSÉ'}
                  </Badge>
                </Stack>
              </Stack>

              <Divider color="#000" />

              {/* Informations du membre */}
              <Stack gap="md">
                <Title order={3} size={18} fw={700}>
                  INFORMATIONS DU MEMBRE
                </Title>

                <Stack gap="sm">
                  <Group gap="sm">
                    <IconMail size={20} />
                    <Text fw={600}>Email:</Text>
                    <Text c="dimmed">{memberProfile.email}</Text>
                  </Group>

                  {memberProfile.phone && (
                    <Group gap="sm">
                      <IconPhone size={20} />
                      <Text fw={600}>Téléphone:</Text>
                      <Text c="dimmed">{memberProfile.phone}</Text>
                    </Group>
                  )}

                  {memberProfile.birthDate && (
                    <Group gap="sm">
                      <IconCalendar size={20} />
                      <Text fw={600}>Date de naissance:</Text>
                      <Text c="dimmed">
                        {memberProfile.birthDate.toDate().toLocaleDateString(
                          'fr-FR'
                        )}
                      </Text>
                    </Group>
                  )}
                </Stack>
              </Stack>

              <Divider color="#000" />

              {/* Abonnement */}
              <Stack gap="md">
                <Title order={3} size={18} fw={700}>
                  ABONNEMENT
                </Title>

                {memberProfile.currentMembership ? (
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text fw={600}>Type:</Text>
                      <Badge
                        variant="outline"
                        color="dark"
                        size="lg"
                        styles={{ root: { borderWidth: 2, fontWeight: 700 } }}
                      >
                        {memberProfile.currentMembership.planType.toUpperCase()}
                      </Badge>
                    </Group>

                    <Group justify="space-between">
                      <Text fw={600}>Statut:</Text>
                      <Badge
                        variant="filled"
                        color={isSubscriptionActive ? 'green' : 'red'}
                        size="lg"
                        fw={700}
                      >
                        {isSubscriptionActive ? 'ACTIF' : 'INACTIF'}
                      </Badge>
                    </Group>

                    {memberProfile.currentMembership.expiryDate && (
                      <Group justify="space-between">
                        <Text fw={600}>Date d'expiration:</Text>
                        <Text c="dimmed">
                          {memberProfile.currentMembership.expiryDate.toDate().toLocaleDateString('fr-FR')}
                        </Text>
                      </Group>
                    )}
                  </Stack>
                ) : (
                  <Text c="dimmed">Aucun abonnement trouvé</Text>
                )}
              </Stack>

              {/* Points de fidélité */}
              <Divider color="#000" />

              <Group justify="space-between" align="center">
                <Text fw={700} size="lg">
                  Points de fidélité:
                </Text>
                <Badge
                  size="xl"
                  variant="outline"
                  color="dark"
                  styles={{
                    root: {
                      borderWidth: 2,
                      fontWeight: 900,
                      fontSize: '1.2rem',
                      padding: '8px 16px',
                    },
                  }}
                >
                  {memberProfile.loyaltyPoints || 0} PTS
                </Badge>
              </Group>

              {/* Bouton de réinitialisation */}
              <Button
                fullWidth
                size="lg"
                variant="outline"
                color="dark"
                onClick={handleReset}
                styles={{
                  root: {
                    borderRadius: '12px',
                    borderWidth: '2px',
                    fontWeight: 700,
                    height: '56px',
                    '&:hover': {
                      background: '#f8f9fa',
                    },
                  },
                }}
              >
                SCANNER UN AUTRE MEMBRE
              </Button>
            </Stack>
          </Paper>
        )}
        </Stack>
      </Container>
    </Box>
  );
};
