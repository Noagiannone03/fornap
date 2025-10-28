import { useState, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Stack,
  Title,
  Text,
  Button,
  FileInput,
  Group,
  Divider,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';

export const QRLogin = () => {
  const [loading, setLoading] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLButtonElement>(null);

  const handleQRUpload = async (file: File | null) => {
    if (!file) return;

    setQrFile(file);
    setLoading(true);

    try {
      // TODO: Implémenter la lecture du QR code
      // 1. Lire l'image
      // 2. Décoder le QR code pour obtenir l'UID
      // 3. Vérifier si un document existe dans pre-members avec cet UID
      // 4. Si oui, rediriger vers un flow de création de compte pré-rempli
      // 5. Si non, afficher une erreur

      // Simulation pour le moment
      await new Promise((resolve) => setTimeout(resolve, 1500));

      notifications.show({
        title: 'QR Code détecté',
        message: 'Vérification de votre adhésion en cours...',
        color: 'dark',
      });

      // Rediriger vers le flux d'inscription avec les données pré-remplies
      // navigate('/signup/from-qr?uid=xxx');
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de lire le QR code. Veuillez réessayer.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: '#ffffff',
        padding: '2rem 1rem',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Container size="sm">
        <Paper
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '3.5rem',
            borderRadius: '24px',
            border: '2px solid #000',
            background: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}
          className="fade-in"
        >
          <Stack gap="xl">
            <div style={{ textAlign: 'center' }}>
              <Title
                order={1}
                size={42}
                fw={900}
                mb="sm"
                style={{ letterSpacing: '0.01em' }}
              >
                CONNEXION PAR QR CODE
              </Title>
              <Text size="lg" c="gray.6">
                Vous avez déjà un QR code Fornap ? Importez-le pour créer votre
                compte en ligne
              </Text>
            </div>

            <div
              style={{
                padding: '32px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                border: '2px dashed #000',
                textAlign: 'center',
              }}
            >
              <Stack gap="lg" align="center">
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '16px',
                    background: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="64px" style={{ lineHeight: 1 }}>
                    📷
                  </Text>
                </div>

                <FileInput
                  ref={fileInputRef}
                  accept="image/*"
                  value={qrFile}
                  onChange={handleQRUpload}
                  placeholder="Aucun fichier sélectionné"
                  style={{ display: 'none' }}
                />

                <Button
                  size="xl"
                  loading={loading}
                  onClick={() => fileInputRef.current?.click()}
                  styles={{
                    root: {
                      background: '#000',
                      borderRadius: '16px',
                      height: '64px',
                      fontSize: '18px',
                      fontWeight: 900,
                      minWidth: '280px',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: '#212529',
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
                      },
                      '&:active': {
                        transform: 'translateY(-2px)',
                      },
                    },
                  }}
                >
                  {qrFile ? 'Changer de QR code' : 'Importer mon QR code'}
                </Button>

                {qrFile && (
                  <Text size="sm" c="gray.6" fw={600}>
                    Fichier: {qrFile.name}
                  </Text>
                )}
              </Stack>
            </div>

            <Stack gap="md">
              <Text size="sm" fw={700} c="gray.7">
                Comment ça marche ?
              </Text>
              <Stack gap="xs">
                <Group gap="xs">
                  <Text size="lg" fw={900} c="gray.6">
                    1.
                  </Text>
                  <Text size="sm" c="gray.7">
                    Importez l'image de votre QR code Fornap
                  </Text>
                </Group>
                <Group gap="xs">
                  <Text size="lg" fw={900} c="gray.6">
                    2.
                  </Text>
                  <Text size="sm" c="gray.7">
                    Nous vérifions votre adhésion dans notre système
                  </Text>
                </Group>
                <Group gap="xs">
                  <Text size="lg" fw={900} c="gray.6">
                    3.
                  </Text>
                  <Text size="sm" c="gray.7">
                    Créez votre mot de passe et accédez à votre compte
                  </Text>
                </Group>
              </Stack>
            </Stack>

            <Divider
              label="OU"
              labelPosition="center"
              color="#000"
              styles={{
                label: {
                  fontWeight: 700,
                  fontSize: '14px',
                },
              }}
            />

            <Stack gap="md" align="center">
              <Text size="md" c="dimmed" fw={500}>
                Vous n'avez pas encore de QR code ?
              </Text>
              <Button
                variant="outline"
                fullWidth
                size="xl"
                onClick={() => navigate('/membership')}
                styles={{
                  root: {
                    borderRadius: '16px',
                    height: '64px',
                    fontSize: '18px',
                    fontWeight: 900,
                    borderWidth: '2px',
                    borderColor: '#000',
                    color: '#000',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: '#000',
                      color: '#fff',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    },
                  },
                }}
              >
                CRÉER UN NOUVEAU COMPTE
              </Button>
            </Stack>

            <Button
              variant="subtle"
              fullWidth
              onClick={() => navigate('/login')}
              styles={{
                root: {
                  fontWeight: 700,
                  color: '#000',
                  '&:hover': {
                    background: '#f8f9fa',
                  },
                },
              }}
            >
              Retour à la connexion
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};
