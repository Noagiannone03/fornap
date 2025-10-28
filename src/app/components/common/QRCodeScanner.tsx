import { useState, useRef } from 'react';
import {
  Stack,
  Button,
  Text,
  Paper,
  Group,
  Loader,
  
  Alert,
} from '@mantine/core';
import {
  IconCamera,
  IconUpload,
  IconAlertCircle,
  IconCheck,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);

  const handleStartScan = async () => {
    try {
      setError(null);
      setSuccess(false);
      setScanning(true);

      // Créer le scanner
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      // Démarrer le scan
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
    } catch (err) {
      console.error('Erreur démarrage scanner:', err);
      setError('Impossible d\'accéder à la caméra');
      setScanning(false);
      onError?.('Impossible d\'accéder à la caméra');
    }
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
  };

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
      {scanning ? (
        <Paper
          p="lg"
          style={{
            borderRadius: '16px',
            border: '3px solid #000',
            background: '#000',
          }}
        >
          <Stack gap="md" align="center">
            <div
              id="qr-reader"
              ref={scannerDivRef}
              style={{
                width: '100%',
                maxWidth: '400px',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            />
            <Button
              variant="filled"
              color="red"
              onClick={handleStopScan}
              styles={{
                root: {
                  borderRadius: '12px',
                  fontWeight: 700,
                },
              }}
            >
              ARRÊTER LE SCAN
            </Button>
          </Stack>
        </Paper>
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
          title="Erreur"
          color="red"
          styles={{
            root: {
              borderRadius: '12px',
              border: '2px solid',
            },
          }}
        >
          {error}
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
