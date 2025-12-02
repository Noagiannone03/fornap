import { useState, useRef, useEffect } from 'react';
import {
  Stack,
  Button,
  Text,
  Group,
  Loader,
  Alert,
  Box,
  Center,
  Modal,
  Title,
  Badge,
  TextInput,
  Card,
  Avatar,
  ActionIcon,
  Tabs,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconRefresh,
  IconCreditCard,
  IconClock,
  IconSearch,
  IconQrcode,
  IconMail,
  IconEdit,
  IconUser,
} from '@tabler/icons-react';
import { Html5Qrcode } from 'html5-qrcode';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';

interface QRCodeScannerProps {
  onScan: (uid: string) => void;
  onError?: (error: string) => void;
  onEditUser?: (uid: string) => void;
}

interface UserSearchResult {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  currentMembership?: {
    planType: 'monthly' | 'annual' | 'lifetime';
    planName: string;
  };
  emailStatus?: {
    membershipCardSent: boolean;
  };
}

export const QRCodeScanner = ({ onScan, onError, onEditUser }: QRCodeScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [startRequested, setStartRequested] = useState(false);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [validatingPayment, setValidatingPayment] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);
  const lastScanTimeRef = useRef<number>(0);
  const scanCooldownMs = 2000; // Cooldown de 2 secondes entre scans

  // États pour la recherche manuelle
  const [activeTab, setActiveTab] = useState<string | null>('scanner');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [resendingCard, setResendingCard] = useState<string | null>(null);

  // Effet pour démarrer le scanner une fois que le DOM est prêt
  useEffect(() => {
    if (!startRequested || scanning) return;

    const initScanner = async () => {
      try {
        setError(null);
        setSuccess(false);

        // Vérifier support caméra
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('CAMERA_NOT_SUPPORTED');
        }

        // Attendre que l'élément soit dans le DOM
        const element = document.getElementById('qr-reader');
        if (!element) {
          console.error('Element qr-reader not found');
          throw new Error('Element qr-reader not ready');
        }

        // Créer le scanner et démarrer directement (Html5Qrcode gère les permissions)
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        // Démarrer le scan - Html5Qrcode va demander la permission automatiquement
        await scanner.start(
          { facingMode: 'environment' }, // Caméra arrière
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // QR code scanné avec succès
            handleScanSuccess(decodedText);
          },
          () => {
            // Erreur de scan (ignorée, se produit continuellement)
          }
        );

        setScanning(true);
        setStartRequested(false);
      } catch (err: any) {
        console.error('Erreur démarrage scanner:', err);
        setScanning(false);
        setStartRequested(false);

        // Messages d'erreur détaillés
        let errorMessage = 'Impossible d\'accéder à la caméra';

        if (err.message === 'CAMERA_NOT_SUPPORTED') {
          errorMessage = 'Votre navigateur ne supporte pas l\'accès à la caméra. Utilisez Chrome, Firefox ou Safari.';
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Accès caméra refusé. Autorisez l\'accès dans les paramètres de votre navigateur puis réessayez.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'Aucune caméra détectée. Utilisez la fonction "Importer" pour scanner depuis une image.';
        } else if (err.message && err.message.includes('Permission')) {
          errorMessage = 'Erreur de permission caméra. Vérifiez les paramètres de votre navigateur.';
        }

        setError(errorMessage);
        onError?.(errorMessage);
      }
    };

    // Petit délai pour s'assurer que le DOM est mis à jour
    const timer = setTimeout(initScanner, 100);
    return () => clearTimeout(timer);
  }, [startRequested, scanning]);

  const handleStartScan = () => {
    setStartRequested(true);
  };

  const handleStopScan = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.error('Erreur arrêt scanner:', err);
    }
    setScanning(false);
    setStartRequested(false);
  };

  // Cleanup au démontage du composant
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) { // Scanner is running (state 2 = SCANNING)
            scannerRef.current.stop().then(() => {
              if (scannerRef.current) {
                scannerRef.current.clear();
              }
            }).catch(console.error);
          }
        } catch (err) {
          console.error('Error in cleanup:', err);
        }
      }
    };
  }, []);

  const handleScanSuccess = async (qrContent: string) => {
    // Vérifier le cooldown pour éviter les scans multiples
    const now = Date.now();
    if (now - lastScanTimeRef.current < scanCooldownMs) {
      return; // Ignorer le scan si trop récent
    }
    lastScanTimeRef.current = now;

    let uid: string | null = null;
    let isPending = false;

    // Vérifier si c'est un QR code PENDING (format: FORNAP-MEMBER:uid:PENDING)
    if (qrContent.includes(':PENDING')) {
      const parts = qrContent.split(':');
      if (parts.length === 3 && parts[0] === 'FORNAP-MEMBER' && parts[2] === 'PENDING') {
        uid = parts[1];
        isPending = true;
      }
    }

    // Si ce n'est pas un QR PENDING, parser normalement
    if (!uid) {
      const { parseQRCodeContent } = await import('../../../shared/utils/qrcode');
      uid = parseQRCodeContent(qrContent);
    }

    // Vérifier qu'on a bien un UID valide
    if (!uid) {
      setError('QR code invalide. Veuillez scanner un QR code Fornap.');
      onError?.('QR code invalide');
      return;
    }

    // Si c'est un utilisateur PENDING, proposer la validation
    if (isPending) {
      handlePendingPayment(uid);
      return;
    }

    // Scan normal
    setSuccess(true);
    setError(null);
    onScan(uid);

    // Réinitialiser le message de succès après 1.5 secondes
    setTimeout(() => {
      setSuccess(false);
    }, 1500);
  };

  // Gérer les paiements pending
  const handlePendingPayment = async (uid: string) => {
    // Ouvrir le modal élégant au lieu du window.confirm
    setPendingUserId(uid);
    setPendingModalOpen(true);
  };

  // Valider le paiement depuis le modal
  const handleValidatePayment = async () => {
    if (!pendingUserId) return;

    setValidatingPayment(true);

    try {
      // Appeler l'API pour valider le paiement
      const response = await fetch('/api/adhesion/validate-pending-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: pendingUserId }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setPendingModalOpen(false);
        
        // Scanner l'utilisateur maintenant qu'il est validé
        onScan(pendingUserId);
        
        // Message de succès
        setTimeout(() => {
          setSuccess(false);
        }, 2000);
      } else {
        setError('Erreur lors de la validation du paiement: ' + data.error);
        setPendingModalOpen(false);
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      setError('Erreur réseau lors de la validation');
      setPendingModalOpen(false);
    } finally {
      setValidatingPayment(false);
      setPendingUserId(null);
    }
  };

  // Scanner sans valider le paiement
  const handleScanWithoutValidation = () => {
    if (!pendingUserId) return;

    setSuccess(true);
    onScan(pendingUserId);
    
    setPendingModalOpen(false);
    setPendingUserId(null);
    
    setTimeout(() => setSuccess(false), 1500);
  };

  // Auto-start scanner on mount only if on scanner tab
  useEffect(() => {
    if (activeTab === 'scanner') {
      handleStartScan();
    }
  }, [activeTab]);

  // Fonction de recherche utilisateur
  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const usersRef = collection(db, 'users');
      const results: UserSearchResult[] = [];

      // Recherche par UID complet
      if (searchTerm.length >= 5) {
        const docRef = doc(db, 'users', searchTerm);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          results.push({
            uid: docSnap.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            currentMembership: data.currentMembership,
            emailStatus: data.emailStatus,
          });
        }
      }

      // Recherche par code membre (7 premiers caractères de l'UID)
      if (searchTerm.length >= 5 && searchTerm.length <= 7) {
        const allUsersQuery = query(usersRef);
        const querySnapshot = await getDocs(allUsersQuery);

        querySnapshot.forEach((doc) => {
          const memberCode = doc.id.substring(0, 7).toUpperCase();
          const searchUpper = searchTerm.toUpperCase();
          if (memberCode.startsWith(searchUpper) && !results.find(r => r.uid === doc.id)) {
            const data = doc.data();
            results.push({
              uid: doc.id,
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              email: data.email || '',
              currentMembership: data.currentMembership,
              emailStatus: data.emailStatus,
            });
          }
        });
      }

      // Recherche par nom/prénom
      const searchTermLower = searchTerm.toLowerCase();
      const firstNameQuery = query(usersRef);
      const lastNameQuery = query(usersRef);

      const [firstNameSnapshot, lastNameSnapshot] = await Promise.all([
        getDocs(firstNameQuery),
        getDocs(lastNameQuery),
      ]);

      const addResultIfMatches = (doc: any) => {
        const data = doc.data();
        const firstName = (data.firstName || '').toLowerCase();
        const lastName = (data.lastName || '').toLowerCase();
        const email = (data.email || '').toLowerCase();

        if (
          firstName.includes(searchTermLower) ||
          lastName.includes(searchTermLower) ||
          email.includes(searchTermLower)
        ) {
          if (!results.find(r => r.uid === doc.id)) {
            results.push({
              uid: doc.id,
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              email: data.email || '',
              currentMembership: data.currentMembership,
              emailStatus: data.emailStatus,
            });
          }
        }
      };

      firstNameSnapshot.forEach(addResultIfMatches);
      lastNameSnapshot.forEach(addResultIfMatches);

      setSearchResults(results.slice(0, 10)); // Limiter à 10 résultats
    } catch (error) {
      console.error('Erreur de recherche:', error);
      setError('Erreur lors de la recherche');
    } finally {
      setSearching(false);
    }
  };

  // Effet pour recherche en temps réel
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Renvoyer la carte par email
  const handleResendCard = async (userId: string) => {
    setResendingCard(userId);
    try {
      const response = await fetch('/api/users/send-membership-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          forceResend: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      } else {
        setError('Erreur lors de l\'envoi: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur réseau lors de l\'envoi');
    } finally {
      setResendingCard(null);
    }
  };

  return (
    <Stack gap="lg">
      {/* Barre de recherche toujours visible en haut */}
      <Box
        p="lg"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
        }}
      >
        <Stack gap="sm">
          <Group gap="xs">
            <IconSearch size={24} color="white" style={{ opacity: 0.9 }} />
            <Text size="lg" fw={700} c="white">
              Recherche rapide
            </Text>
          </Group>

          <TextInput
            placeholder="Code, nom, prénom, email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.currentTarget.value);
              if (e.currentTarget.value.length > 0) {
                setActiveTab('search');
              }
            }}
            size="xl"
            leftSection={<IconSearch size={20} />}
            rightSection={
              searchQuery && (
                <ActionIcon
                  onClick={() => {
                    setSearchQuery('');
                    setActiveTab('scanner');
                  }}
                  variant="subtle"
                  color="gray"
                  size="lg"
                >
                  ✕
                </ActionIcon>
              )
            }
            styles={{
              input: {
                borderRadius: '16px',
                fontSize: '16px',
                fontWeight: 500,
                border: 'none',
                backgroundColor: 'white',
                padding: '12px 16px',
                height: '56px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                '&::placeholder': {
                  color: '#adb5bd',
                },
              },
            }}
          />
        </Stack>
      </Box>

      {/* Onglets Scanner / Résultats */}
      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        styles={{
          root: {
            backgroundColor: 'transparent',
          },
          list: {
            borderBottom: '2px solid #e9ecef',
            marginBottom: '16px',
          },
          tab: {
            fontWeight: 600,
            fontSize: '15px',
            padding: '12px 20px',
            transition: 'all 0.2s ease',
            color: '#868e96',
            '&:hover': {
              backgroundColor: 'rgba(34, 139, 230, 0.08)',
              color: '#228be6',
            },
            '&[data-active]': {
              color: '#228be6',
              borderBottom: '3px solid #228be6',
            },
          },
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="scanner" leftSection={<IconQrcode size={18} />}>
            Scanner QR Code
          </Tabs.Tab>
          <Tabs.Tab value="search" leftSection={<IconUser size={18} />}>
            {searchResults.length > 0
              ? `Résultats (${searchResults.length})`
              : 'Résultats de recherche'}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="scanner" pt="lg">
          <Stack gap="md">
            {/* Zone de scan caméra */}
            {(scanning || startRequested) ? (
              <Box
                style={{
                  position: 'relative',
                  width: '100%',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#000',
                }}
              >
                <div
                  id="qr-reader"
                  ref={scannerDivRef}
                  style={{
                    width: '100%',
                  }}
                />

                {/* Cadre de scan simple */}
                <Box
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '70%',
                    maxWidth: '280px',
                    height: '280px',
                    border: '3px solid rgba(255, 255, 255, 0.6)',
                    borderRadius: '16px',
                    pointerEvents: 'none',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                  }}
                />

                {/* Instructions */}
                <Text
                  style={{
                    position: 'absolute',
                    bottom: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 500,
                    textAlign: 'center',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                    width: '90%',
                  }}
                >
                  Placez le QR code dans le cadre
                </Text>

                {/* Bouton arrêter */}
                {scanning && (
                  <Box
                    style={{
                      position: 'absolute',
                      bottom: '20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 10,
                    }}
                  >
                    <Button
                      variant="filled"
                      color="red"
                      size="md"
                      onClick={handleStopScan}
                      styles={{
                        root: {
                          borderRadius: '20px',
                          fontWeight: 600,
                        },
                      }}
                    >
                      Arrêter le scan
                    </Button>
                  </Box>
                )}

                {/* Message de chargement */}
                {startRequested && !scanning && (
                  <Box
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                    }}
                  >
                    <Stack gap="md" align="center">
                      <Loader size="lg" color="white" />
                      <Text c="white" size="md" fw={500}>
                        Démarrage de la caméra...
                      </Text>
                    </Stack>
                  </Box>
                )}
              </Box>
            ) : (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="search" pt="md">
          <Stack gap="md">

            {/* Résultats de recherche */}
            {searching && (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            )}

            {!searching && searchResults.length > 0 && (
              <Stack gap="md">
                <Text size="sm" c="dimmed" fw={500}>
                  {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''} trouvé{searchResults.length > 1 ? 's' : ''}
                </Text>
                {searchResults.map((user) => {
                  const memberCode = user.uid.substring(0, 7).toUpperCase();
                  return (
                    <Card
                      key={user.uid}
                      shadow="md"
                      padding="xl"
                      radius="lg"
                      withBorder
                      style={{
                        borderWidth: '2px',
                        borderColor: '#e9ecef',
                        transition: 'all 0.2s ease',
                        cursor: 'default',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#228be6';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(34, 139, 230, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e9ecef';
                        e.currentTarget.style.boxShadow = '';
                      }}
                    >
                      <Stack gap="md">
                        {/* Header avec avatar et infos */}
                        <Group justify="space-between" wrap="nowrap">
                          <Group gap="md" style={{ flex: 1 }}>
                            <Avatar size="xl" color="blue" radius="xl">
                              <IconUser size={32} />
                            </Avatar>

                            <Stack gap={6} style={{ flex: 1 }}>
                              <Group gap="sm">
                                <Text size="xl" fw={700}>
                                  {user.firstName} {user.lastName}
                                </Text>
                                <Badge
                                  size="lg"
                                  variant="gradient"
                                  gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
                                  styles={{
                                    root: {
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      padding: '6px 12px',
                                    },
                                  }}
                                >
                                  CODE: {memberCode}
                                </Badge>
                              </Group>

                              <Text size="md" c="dimmed">
                                {user.email}
                              </Text>

                              {user.currentMembership && (
                                <Badge
                                  size="md"
                                  variant="light"
                                  color={
                                    user.currentMembership.planType === 'lifetime'
                                      ? 'yellow'
                                      : user.currentMembership.planType === 'annual'
                                      ? 'green'
                                      : 'blue'
                                  }
                                  styles={{
                                    root: {
                                      fontWeight: 600,
                                    },
                                  }}
                                >
                                  {user.currentMembership.planName}
                                </Badge>
                              )}
                            </Stack>
                          </Group>
                        </Group>

                        {/* Actions */}
                        <Group gap="sm" grow>
                          <Button
                            variant="light"
                            color="blue"
                            size="md"
                            leftSection={<IconMail size={18} />}
                            onClick={() => handleResendCard(user.uid)}
                            loading={resendingCard === user.uid}
                            disabled={!!resendingCard}
                            styles={{
                              root: {
                                borderRadius: '10px',
                                height: '46px',
                                fontWeight: 600,
                              },
                            }}
                          >
                            Renvoyer carte
                          </Button>

                          {onEditUser && (
                            <Button
                              variant="light"
                              color="orange"
                              size="md"
                              leftSection={<IconEdit size={18} />}
                              onClick={() => onEditUser(user.uid)}
                              styles={{
                                root: {
                                  borderRadius: '10px',
                                  height: '46px',
                                  fontWeight: 600,
                                },
                              }}
                            >
                              Modifier
                            </Button>
                          )}

                          <Button
                            variant="filled"
                            color="green"
                            size="md"
                            leftSection={<IconCheck size={18} />}
                            onClick={() => onScan(user.uid)}
                            styles={{
                              root: {
                                borderRadius: '10px',
                                height: '46px',
                                fontWeight: 600,
                                boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
                              },
                            }}
                          >
                            Scanner
                          </Button>
                        </Group>
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>
            )}

            {!searching && searchQuery && searchResults.length === 0 && (
              <Center py="xl">
                <Stack align="center" gap="xs">
                  <Text size="lg" c="dimmed" fw={500}>
                    Aucun résultat
                  </Text>
                  <Text size="sm" c="dimmed">
                    Aucun membre trouvé pour "{searchQuery}"
                  </Text>
                </Stack>
              </Center>
            )}

            {!searching && !searchQuery && (
              <Center py="xl">
                <Stack align="center" gap="xs">
                  <IconSearch size={48} color="#adb5bd" />
                  <Text size="lg" c="dimmed" fw={500}>
                    Commencez à rechercher
                  </Text>
                  <Text size="sm" c="dimmed" ta="center" maw={300}>
                    Utilisez la barre de recherche ci-dessus pour trouver un membre
                  </Text>
                </Stack>
              </Center>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Modal de validation de paiement en attente */}
      <Modal
        opened={pendingModalOpen}
        onClose={() => {
          if (!validatingPayment) {
            setPendingModalOpen(false);
            setPendingUserId(null);
          }
        }}
        title={
          <Group gap="sm">
            <IconClock size={24} color="#f59f00" />
            <Title order={3}>Paiement en attente</Title>
          </Group>
        }
        centered
        size="md"
        styles={{
          title: {
            fontWeight: 600,
          },
          header: {
            borderBottom: '2px solid #f59f00',
            paddingBottom: '12px',
          },
        }}
      >
        <Stack gap="lg" py="md">
          {/* Badge d'alerte */}
          <Center>
            <Badge
              size="xl"
              variant="light"
              color="orange"
              leftSection={<IconClock size={18} />}
              styles={{
                root: {
                  paddingLeft: 12,
                  paddingRight: 16,
                  height: 36,
                },
              }}
            >
              En attente de validation
            </Badge>
          </Center>

          {/* Message explicatif */}
          <Box
            p="md"
            style={{
              backgroundColor: '#fff3e0',
              borderRadius: '12px',
              border: '2px solid #f59f00',
            }}
          >
            <Stack gap="sm">
              <Text size="md" fw={500} c="#e67700">
                ⚠️ Ce membre a effectué son inscription mais son paiement n'a pas encore été validé.
              </Text>
              <Text size="sm" c="dimmed">
                Avant de continuer, vérifiez avec le membre qu'il a bien effectué son paiement au comptoir ou par le moyen convenu.
              </Text>
            </Stack>
          </Box>

          {/* Options */}
          <Stack gap="md">
            <Button
              size="lg"
              color="green"
              leftSection={<IconCreditCard size={20} />}
              onClick={handleValidatePayment}
              loading={validatingPayment}
              fullWidth
              styles={{
                root: {
                  height: 56,
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                },
              }}
            >
              Valider le paiement et envoyer la carte
            </Button>

            <Button
              size="md"
              variant="light"
              color="gray"
              onClick={handleScanWithoutValidation}
              disabled={validatingPayment}
              fullWidth
              styles={{
                root: {
                  height: 48,
                  borderRadius: '10px',
                },
              }}
            >
              Scanner sans valider le paiement
            </Button>
          </Stack>

          {/* Note informative */}
          <Alert
            color="blue"
            variant="light"
            styles={{
              root: {
                borderRadius: '10px',
              },
            }}
          >
            <Text size="xs" c="dimmed">
              💡 <strong>Note:</strong> La validation du paiement enverra automatiquement un email avec la carte d'adhérent au membre.
            </Text>
          </Alert>
        </Stack>
      </Modal>

      {/* Messages d'état globaux */}
      {error && (
        <Alert
          icon={<IconAlertCircle size={20} />}
          title="Erreur d'accès à la caméra"
          color="red"
          styles={{
            root: {
              borderRadius: '12px',
              border: '2px solid',
            },
          }}
        >
          <Stack gap="md">
            <Text size="sm">{error}</Text>
            {error.includes('refusé') || error.includes('permissions') ? (
              <Group gap="xs">
                <Button
                  size="sm"
                  variant="light"
                  color="red"
                  leftSection={<IconRefresh size={16} />}
                  onClick={() => {
                    setError(null);
                    handleStartScan();
                  }}
                >
                  Réessayer
                </Button>
                <Text size="xs" c="dimmed">
                  Autorisez la caméra puis cliquez sur "Réessayer"
                </Text>
              </Group>
            ) : null}
          </Stack>
        </Alert>
      )}

      {success && (
        <Alert
          icon={<IconCheck size={20} />}
          title="Succès"
          color="green"
          styles={{
            root: {
              borderRadius: '12px',
              border: '2px solid',
            },
          }}
        >
          QR code scanné avec succès !
        </Alert>
      )}
    </Stack>
  );
};
