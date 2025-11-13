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
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconRefresh,
} from '@tabler/icons-react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRCodeScannerProps {
  onScan: (uid: string) => void;
  onError?: (error: string) => void;
}

export const QRCodeScanner = ({ onScan, onError }: QRCodeScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [startRequested, setStartRequested] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);
  const lastScanTimeRef = useRef<number>(0);
  const scanCooldownMs = 2000; // Cooldown de 2 secondes entre scans

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

    // Parser le contenu du QR code
    const { parseQRCodeContent } = await import('../../../shared/utils/qrcode');
    const uid = parseQRCodeContent(qrContent);

    if (uid) {
      setSuccess(true);
      setError(null);

      // Appeler onScan mais garder le scanner actif
      onScan(uid);

      // Réinitialiser le message de succès après 1.5 secondes
      setTimeout(() => {
        setSuccess(false);
      }, 1500);
    } else {
      setError('QR code invalide. Veuillez scanner un QR code Fornap.');
      onError?.('QR code invalide');
    }
  };

  // Auto-start scanner on mount
  useEffect(() => {
    handleStartScan();
  }, []);

  return (
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

      {/* Messages d'état */}
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
