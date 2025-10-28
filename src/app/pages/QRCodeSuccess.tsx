import { useEffect } from 'react';
import { Container, Paper, Stack, Title, Text, Button } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import { QRCodeDisplay } from '../components/common/QRCodeDisplay';
import { IconCheck } from '@tabler/icons-react';

export const QRCodeSuccess = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  useEffect(() => {
    // Rediriger si pas d'utilisateur connecté
    if (!userProfile) {
      navigate('/login');
    }
  }, [userProfile, navigate]);

  if (!userProfile) {
    return null;
  }

  return (
    <Container
      size="sm"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        padding: '2rem 1rem',
      }}
    >
      <Paper
        p="xl"
        style={{
          maxWidth: '500px',
          width: '100%',
          borderRadius: '20px',
          border: '2px solid #000',
          background: 'white',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        }}
      >
        <Stack gap="xl" align="center">
          {/* Icône de succès */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconCheck size={48} color="white" stroke={3} />
          </div>

          {/* Titre et description */}
          <Stack gap="xs" align="center">
            <Title
              order={1}
              size={28}
              fw={900}
              ta="center"
              style={{ letterSpacing: '0.01em' }}
            >
              INSCRIPTION RÉUSSIE !
            </Title>
            <Text size="lg" c="dimmed" ta="center" maw={400}>
              Bienvenue chez Fornap, {userProfile.firstName} !
            </Text>
          </Stack>

          {/* Message d'introduction */}
          <Paper
            p="md"
            style={{
              width: '100%',
              borderRadius: '12px',
              background: '#f8f9fa',
              border: '2px solid #e9ecef',
            }}
          >
            <Text size="sm" fw={600} ta="center">
              Voici votre QR code d'accès personnel. Présentez-le à l'entrée du
              Fornap pour accéder à l'espace.
            </Text>
          </Paper>

          {/* QR Code */}
          <QRCodeDisplay
            uid={userProfile.uid}
            firstName={userProfile.firstName}
            lastName={userProfile.lastName}
            size={280}
            showDownloadButton={true}
            showUserInfo={false}
          />

          {/* Informations supplémentaires */}
          <Stack gap="xs" style={{ width: '100%' }}>
            <Text size="xs" c="dimmed" ta="center">
              Vous pouvez retrouver votre QR code à tout moment dans votre
              tableau de bord.
            </Text>
            <Text size="xs" c="dimmed" ta="center" fw={700}>
              Pensez à le télécharger et à le garder sur votre téléphone !
            </Text>
          </Stack>

          {/* Boutons d'action */}
          <Stack gap="sm" style={{ width: '100%' }}>
            <Button
              fullWidth
              size="lg"
              variant="filled"
              color="dark"
              onClick={() => navigate('/dashboard')}
              styles={{
                root: {
                  borderRadius: '12px',
                  fontWeight: 700,
                  height: '50px',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  },
                },
              }}
            >
              ACCÉDER À MON TABLEAU DE BORD
            </Button>

            <Button
              fullWidth
              size="md"
              variant="outline"
              color="dark"
              onClick={() => navigate('/')}
              styles={{
                root: {
                  borderRadius: '12px',
                  borderWidth: '2px',
                  fontWeight: 700,
                  '&:hover': {
                    background: '#f8f9fa',
                  },
                },
              }}
            >
              Retour à l'accueil
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
};
