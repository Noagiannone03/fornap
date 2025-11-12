import { useState, useRef, useEffect } from 'react';
import {
  Stack,
  Button,
  Text,
  Paper,
  Group,
  Loader,
  Alert,
  Box,
} from '@mantine/core';
import {
  IconCamera,
  IconUpload,
  IconAlertCircle,
  IconCheck,
  IconRefresh,
} from '@tabler/icons-react';
import { Html5Qrcode } from 'html5-qrcode';
import { readQRCodeFromImage } from '../../../shared/utils/qrcode';

interface QRCodeScannerProps {
  onScan: (uid: string) => void;
  onError?: (error: string) => void;
}

export const QRCodeScanner = ({ onScan, onError }: QRCodeScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [startRequested, setStartRequested] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);

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
        scannerRef.current.stop().catch(console.error);
        scannerRef.current.clear();
      }
    };
  }, []);

  const handleScanSuccess = async (qrContent: string) => {
    // Arrêter le scanner
    await handleStopScan();

    // Parser le contenu du QR code
    const { parseQRCodeContent } = await import('../../../shared/utils/qrcode');
    const uid = parseQRCodeContent(qrContent);

    if (uid) {
      setSuccess(true);
      setError(null);
      onScan(uid);
    } else {
      setError('QR code invalide. Veuillez scanner un QR code Fornap.');
      onError?.('QR code invalide');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      setSuccess(false);

      const uid = await readQRCodeFromImage(file);

      if (uid) {
        setSuccess(true);
        onScan(uid);
      } else {
        setError('Aucun QR code valide détecté dans l\'image');
        onError?.('QR code non détecté');
      }
    } catch (err) {
      console.error('Erreur lecture QR code:', err);
      setError('Erreur lors de la lecture du QR code');
      onError?.('Erreur de lecture');
    } finally {
      setUploading(false);
      // Réinitialiser l'input pour permettre de reselectionner le même fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Stack gap="lg">
      {/* Zone de scan caméra */}
      {(scanning || startRequested) ? (
        <Box
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '500px',
            borderRadius: '16px',
            overflow: 'hidden',
            background: '#000',
          }}
        >
          <div
            id="qr-reader"
            ref={scannerDivRef}
            style={{
              width: '100%',
              minHeight: '500px',
            }}
          />

          {/* Overlay avec cadre de scan */}
          <Box
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            {/* Cadre de visée avec coins en L */}
            <Box
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '320px',
                aspectRatio: '1',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '12px',
              }}
            >
              {/* Coin supérieur gauche */}
              <Box
                style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '-2px',
                  width: '50px',
                  height: '50px',
                  borderTop: '4px solid #00ff88',
                  borderLeft: '4px solid #00ff88',
                  borderRadius: '12px 0 0 0',
                }}
              />

              {/* Coin supérieur droit */}
              <Box
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '50px',
                  height: '50px',
                  borderTop: '4px solid #00ff88',
                  borderRight: '4px solid #00ff88',
                  borderRadius: '0 12px 0 0',
                }}
              />

              {/* Coin inférieur gauche */}
              <Box
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  left: '-2px',
                  width: '50px',
                  height: '50px',
                  borderBottom: '4px solid #00ff88',
                  borderLeft: '4px solid #00ff88',
                  borderRadius: '0 0 0 12px',
                }}
              />

              {/* Coin inférieur droit */}
              <Box
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '50px',
                  height: '50px',
                  borderBottom: '4px solid #00ff88',
                  borderRight: '4px solid #00ff88',
                  borderRadius: '0 0 12px 0',
                }}
              />

              {/* Ligne de scan animée */}
              <Box
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '10%',
                  right: '10%',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #00ff88, transparent)',
                  animation: 'scan 2s ease-in-out infinite',
                  boxShadow: '0 0 10px #00ff88',
                }}
              />
            </Box>

            {/* Instructions */}
            <Text
              style={{
                position: 'absolute',
                bottom: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                textAlign: 'center',
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                whiteSpace: 'nowrap',
              }}
            >
              Placez le QR code dans le cadre
            </Text>
          </Box>

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
                size="lg"
                onClick={handleStopScan}
                styles={{
                  root: {
                    borderRadius: '24px',
                    fontWeight: 700,
                    padding: '12px 32px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  },
                }}
              >
                ⬤ ARRÊTER
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
                <Loader size="lg" color="cyan" />
                <Text c="white" size="lg" fw={600}>
                  Démarrage de la caméra...
                </Text>
              </Stack>
            </Box>
          )}

          {/* Animation CSS pour la ligne de scan */}
          <style>{`
            @keyframes scan {
              0%, 100% {
                transform: translateY(-100px);
                opacity: 0;
              }
              10% {
                opacity: 1;
              }
              50% {
                transform: translateY(0);
              }
              90% {
                opacity: 1;
              }
              100% {
                transform: translateY(100px);
                opacity: 0;
              }
            }
          `}</style>
        </Box>
      ) : (
        <Stack gap="md">
          {/* Boutons d'action */}
          <Group grow>
            <Button
              leftSection={<IconCamera size={20} />}
              variant="filled"
              color="dark"
              size="lg"
              onClick={handleStartScan}
              disabled={uploading}
              styles={{
                root: {
                  borderRadius: '12px',
                  fontWeight: 700,
                  height: '56px',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  },
                },
              }}
            >
              SCANNER
            </Button>

            <Button
              leftSection={
                uploading ? (
                  <Loader size="xs" color="white" />
                ) : (
                  <IconUpload size={20} />
                )
              }
              variant="outline"
              color="dark"
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || scanning}
              styles={{
                root: {
                  borderRadius: '12px',
                  borderWidth: '2px',
                  fontWeight: 700,
                  height: '56px',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: '#f8f9fa',
                  },
                },
              }}
            >
              {uploading ? 'LECTURE...' : 'IMPORTER'}
            </Button>
          </Group>

          {/* Input file caché */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </Stack>
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

      {/* Instructions */}
      {!scanning && !uploading && (
        <Paper
          p="md"
          style={{
            borderRadius: '12px',
            background: '#f8f9fa',
            border: '2px solid #e9ecef',
          }}
        >
          <Text size="sm" c="dimmed" ta="center">
            Scannez le QR code d'un membre avec la caméra ou importez une image
            contenant le QR code
          </Text>
        </Paper>
      )}
    </Stack>
  );
};
