import { Container, Group, Button, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const Navbar = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div
      style={{
        backgroundColor: '#000',
        borderBottom: '1px solid #fff',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)',
      }}
    >
      <Container size="xl" py="sm">
        <Group justify="space-between" align="center">
          <Text
            size="lg"
            fw={900}
            c="white"
            style={{
              cursor: 'pointer',
              letterSpacing: '0.1em',
              transition: 'all 0.2s ease',
            }}
            onClick={() => navigate('/')}
          >
            FORNAP
          </Text>

          <Group gap="xs">
            {!currentUser ? (
              <>
                <Button
                  variant="subtle"
                  c="white"
                  onClick={() => navigate('/login')}
                  styles={{
                    root: {
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                    },
                  }}
                >
                  Connexion
                </Button>
                <Button
                  variant="filled"
                  bg="white"
                  c="black"
                  onClick={() => navigate('/membership')}
                  styles={{
                    root: {
                      borderRadius: '8px',
                      fontWeight: 700,
                      padding: '0 24px',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: '#e0e0e0',
                      },
                    },
                  }}
                >
                  S'inscrire
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="subtle"
                  c="white"
                  onClick={() => navigate('/dashboard')}
                  styles={{
                    root: {
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                    },
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  variant="subtle"
                  c="white"
                  onClick={handleLogout}
                  styles={{
                    root: {
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                    },
                  }}
                >
                  Déconnexion
                </Button>
              </>
            )}
          </Group>
        </Group>
      </Container>
    </div>
  );
};
