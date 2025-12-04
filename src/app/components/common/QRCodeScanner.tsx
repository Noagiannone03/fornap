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
  Badge,
  TextInput,
  Avatar,
  SegmentedControl,
  Paper,
  rem,
  ActionIcon,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconCreditCard,
  IconClock,
  IconSearch,
  IconQrcode,
  IconMail,
  IconEdit,
  IconCamera,
  IconX,
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
  // Mode: 'scan' | 'search'
  const [mode, setMode] = useState<string>('scan');
  
  // Scanner states
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [startRequested, setStartRequested] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const scanCooldownMs = 2000;

  // Pending payment states
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [validatingPayment, setValidatingPayment] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [resendingCard, setResendingCard] = useState<string | null>(null);

  // --- Scanner Logic ---

  useEffect(() => {
    // Only initialize scanner if in scan mode
    if (mode !== 'scan') {
      handleStopScan();
      return;
    }

    if (!startRequested || scanning) return;

    const initScanner = async () => {
      try {
        setError(null);
        setSuccess(false);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('CAMERA_NOT_SUPPORTED');
        }

        const element = document.getElementById('qr-reader');
        if (!element) {
          // Retry shortly if element not yet ready
          setTimeout(() => setStartRequested(true), 100);
          return;
        }

        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {} // Ignore scan errors
        );

        setScanning(true);
        setStartRequested(false);
      } catch (err: any) {
        console.error('Erreur démarrage scanner:', err);
        setScanning(false);
        setStartRequested(false);

        let errorMessage = 'Impossible d\'accéder à la caméra';
        if (err.message === 'CAMERA_NOT_SUPPORTED') {
          errorMessage = 'Votre navigateur ne supporte pas l\'accès à la caméra.';
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Accès caméra refusé. Vérifiez vos permissions.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'Aucune caméra détectée.';
        }

        setError(errorMessage);
        onError?.(errorMessage);
      }
    };

    initScanner();
  }, [startRequested, scanning, mode]);

  const handleStartScan = () => {
    setStartRequested(true);
  };

  const handleStopScan = async () => {
    try {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          // Only stop if scanning (2) or paused (3)
          if (state === 2 || state === 3) {
            await scannerRef.current.stop();
          }
        } catch (err) {
          // Ignore state errors, scanner might be already stopped
          console.warn('Scanner stop warning:', err);
        }
        
        try {
          scannerRef.current.clear();
        } catch (err) {
          // Ignore clear errors
        }
        scannerRef.current = null;
      }
    } catch (err) {
      console.error('Erreur arrêt scanner:', err);
    }
    setScanning(false);
    setStartRequested(false);
  };

  useEffect(() => {
    // Start scanning automatically when entering scan mode
    if (mode === 'scan') {
      handleStartScan();
    }
    
    // Cleanup on unmount or mode change
    return () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2 || state === 3) {
            scannerRef.current.stop().catch((err) => console.warn('Cleanup stop error:', err));
          }
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [mode]);

  const handleScanSuccess = async (qrContent: string) => {
    const now = Date.now();
    if (now - lastScanTimeRef.current < scanCooldownMs) return;
    lastScanTimeRef.current = now;

    let uid: string | null = null;
    let isPending = false;

    if (qrContent.includes(':PENDING')) {
      const parts = qrContent.split(':');
      if (parts.length === 3 && parts[0] === 'FORNAP-MEMBER' && parts[2] === 'PENDING') {
        uid = parts[1];
        isPending = true;
      }
    }

    if (!uid) {
      const { parseQRCodeContent } = await import('../../../shared/utils/qrcode');
      uid = parseQRCodeContent(qrContent);
    }

    if (!uid) {
      setError('QR code invalide.');
      onError?.('QR code invalide');
      return;
    }

    if (isPending) {
      handlePendingPayment(uid);
      return;
    }

    setSuccess(true);
    setError(null);
    onScan(uid);
    setTimeout(() => setSuccess(false), 1500);
  };

  // --- Pending Payment Logic ---

  const handlePendingPayment = (uid: string) => {
    setPendingUserId(uid);
    setPendingModalOpen(true);
  };

  const handleValidatePayment = async () => {
    if (!pendingUserId) return;
    setValidatingPayment(true);
    try {
      const response = await fetch('/api/adhesion/validate-pending-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pendingUserId }),
      });
      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setPendingModalOpen(false);
        onScan(pendingUserId);
        setTimeout(() => setSuccess(false), 2000);
      } else {
        setError('Erreur validation: ' + data.error);
        setPendingModalOpen(false);
      }
    } catch (error) {
      setError('Erreur réseau');
      setPendingModalOpen(false);
    } finally {
      setValidatingPayment(false);
      setPendingUserId(null);
    }
  };

  const handleScanWithoutValidation = () => {
    if (!pendingUserId) return;
    setSuccess(true);
    onScan(pendingUserId);
    setPendingModalOpen(false);
    setPendingUserId(null);
    setTimeout(() => setSuccess(false), 1500);
  };

  // --- Search Logic ---

  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const usersRef = collection(db, 'users');
      const results: UserSearchResult[] = [];

      // Search by UID
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

      // Search by Code or Name (simplified for brevity)
      const searchTermLower = searchTerm.toLowerCase();
      const q = query(usersRef);
      const snapshot = await getDocs(q);
      
      snapshot.forEach((doc) => {
        if (results.find(r => r.uid === doc.id)) return; // Avoid duplicates
        
        const data = doc.data();
        const firstName = (data.firstName || '').toLowerCase();
        const lastName = (data.lastName || '').toLowerCase();
        const email = (data.email || '').toLowerCase();
        const memberCode = doc.id.substring(0, 7).toUpperCase();

        if (
          firstName.includes(searchTermLower) ||
          lastName.includes(searchTermLower) ||
          email.includes(searchTermLower) ||
          memberCode.includes(searchTerm.toUpperCase())
        ) {
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

      setSearchResults(results.slice(0, 10));
    } catch (error) {
      console.error('Erreur recherche:', error);
      setError('Erreur lors de la recherche');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery && mode === 'search') {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  const handleResendCard = async (userId: string) => {
    setResendingCard(userId);
    try {
      const response = await fetch('/api/users/send-membership-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, forceResend: true }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      } else {
        setError('Erreur: ' + data.error);
      }
    } catch (error) {
      setError('Erreur réseau');
    } finally {
      setResendingCard(null);
    }
  };

  return (
    <Stack gap="md">
      {/* Mode Toggle */}
      <Paper withBorder shadow="sm" radius="lg" p="xs">
        <SegmentedControl
          fullWidth
          value={mode}
          onChange={setMode}
          size="md"
          radius="md"
          data={[
            {
              value: 'scan',
              label: (
                <Center>
                  <IconQrcode style={{ width: rem(16), height: rem(16) }} />
                  <Box ml={10}>Scanner QR</Box>
                </Center>
              ),
            },
            {
              value: 'search',
              label: (
                <Center>
                  <IconSearch style={{ width: rem(16), height: rem(16) }} />
                  <Box ml={10}>Recherche Manuelle</Box>
                </Center>
              ),
            },
          ]}
        />
      </Paper>

      {/* Scan Mode */}
      {mode === 'scan' && (
        <Stack gap="md">
          <Box
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: '16px',
              overflow: 'hidden',
              backgroundColor: '#000',
              minHeight: '300px',
            }}
          >
            {/* Camera View */}
            {(scanning || startRequested) ? (
              <>
                <div id="qr-reader" style={{ width: '100%' }} />
                
                {/* Overlay Frame */}
                <Box
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '240px',
                    height: '240px',
                    border: '2px solid rgba(255, 255, 255, 0.8)',
                    borderRadius: '20px',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                    pointerEvents: 'none',
                  }}
                >
                  <Box
                    style={{
                      position: 'absolute',
                      top: -2, left: -2, right: -2, bottom: -2,
                      border: '2px solid transparent',
                      borderRadius: '20px',
                      background: 'linear-gradient(to right, #228be6, #228be6) top left / 30px 3px no-repeat, linear-gradient(to bottom, #228be6, #228be6) top left / 3px 30px no-repeat, linear-gradient(to left, #228be6, #228be6) top right / 30px 3px no-repeat, linear-gradient(to bottom, #228be6, #228be6) top right / 3px 30px no-repeat, linear-gradient(to right, #228be6, #228be6) bottom left / 30px 3px no-repeat, linear-gradient(to top, #228be6, #228be6) bottom left / 3px 30px no-repeat, linear-gradient(to left, #228be6, #228be6) bottom right / 30px 3px no-repeat, linear-gradient(to top, #228be6, #228be6) bottom right / 3px 30px no-repeat',
                    }}
                  />
                </Box>

                {/* Helper Text */}
                <Text
                  c="white"
                  size="sm"
                  fw={500}
                  style={{
                    position: 'absolute',
                    bottom: '40px',
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  Placez le QR code dans le cadre
                </Text>
              </>
            ) : (
              <Center h={300}>
                <Stack align="center" gap="sm">
                  <Loader color="white" type="dots" />
                  <Text c="white" size="sm">Initialisation de la caméra...</Text>
                </Stack>
              </Center>
            )}
          </Box>

          {/* Scan Controls */}
          {scanning && (
             <Button 
                variant="light" 
                color="red" 
                fullWidth 
                onClick={handleStopScan}
                leftSection={<IconCamera size={16} />}
             >
                Arrêter la caméra
             </Button>
          )}
        </Stack>
      )}

      {/* Search Mode */}
      {mode === 'search' && (
        <Stack gap="md">
          <TextInput
            placeholder="Rechercher par nom, email ou code..."
            leftSection={<IconSearch size={16} />}
            rightSection={
              searchQuery && (
                <ActionIcon onClick={() => setSearchQuery('')} variant="subtle" color="gray">
                  <IconX size={16} />
                </ActionIcon>
              )
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="lg"
            radius="md"
            autoFocus
          />

          {searching && (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
          )}

          {!searching && searchResults.length === 0 && searchQuery.length > 1 && (
             <Text c="dimmed" ta="center" size="sm" py="lg">
                Aucun membre trouvé pour "{searchQuery}"
             </Text>
          )}

          <Stack gap="sm">
            {searchResults.map((user) => (
              <Paper
                key={user.uid}
                withBorder
                p="md"
                radius="md"
                style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
                onClick={() => onScan(user.uid)}
              >
                <Group justify="space-between" align="flex-start">
                  <Group>
                    <Avatar color="blue" radius="xl">
                      {user.firstName?.[0]}
                    </Avatar>
                    <Box>
                      <Text size="sm" fw={600}>
                        {user.firstName} {user.lastName}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {user.email}
                      </Text>
                      <Badge size="xs" mt={4} variant="dot">
                        Code: {user.uid.substring(0, 7).toUpperCase()}
                      </Badge>
                    </Box>
                  </Group>
                  
                  <Group gap="xs">
                    <ActionIcon 
                        variant="light" 
                        color="blue"
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleResendCard(user.uid);
                        }}
                        loading={resendingCard === user.uid}
                        title="Renvoyer la carte"
                    >
                        <IconMail size={16} />
                    </ActionIcon>
                    {onEditUser && (
                        <ActionIcon
                            variant="light"
                            color="orange"
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onEditUser(user.uid);
                            }}
                            title="Modifier le membre"
                        >
                            <IconEdit size={16} />
                        </ActionIcon>
                    )}
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Stack>
      )}

      {/* Feedback Alerts */}
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} title="Erreur" color="red" radius="md" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert icon={<IconCheck size={16} />} title="Succès" color="green" radius="md">
          Opération effectuée avec succès
        </Alert>
      )}

      {/* Pending Payment Modal */}
      <Modal
        opened={pendingModalOpen}
        onClose={() => !validatingPayment && setPendingModalOpen(false)}
        title="Paiement en attente"
        centered
        size="md"
      >
        <Stack gap="md">
          <Alert color="orange" icon={<IconClock size={16} />}>
            Ce membre n'a pas encore validé son paiement.
          </Alert>
          
          <Group grow>
            <Button
              color="green"
              onClick={handleValidatePayment}
              loading={validatingPayment}
              leftSection={<IconCreditCard size={16} />}
            >
              Valider le paiement
            </Button>
            <Button
              variant="default"
              onClick={handleScanWithoutValidation}
              disabled={validatingPayment}
            >
              Scanner uniquement
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
