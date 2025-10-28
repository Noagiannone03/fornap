import { useState, useEffect } from 'react';
import { Box, Button, Stack, Text, Loader, Center } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { generateQRCodeDataURL, downloadQRCode } from '../../utils/qrcode';

interface QRCodeDisplayProps {
  uid: string;
  firstName: string;
  lastName: string;
  size?: number;
  showDownloadButton?: boolean;
  showUserInfo?: boolean;
}

export const QRCodeDisplay = ({
  uid,
  firstName,
  lastName,
  size = 300,
  showDownloadButton = true,
  showUserInfo = true,
}: QRCodeDisplayProps) => {
  const [qrCodeDataURL, setQRCodeDataURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateQR = async () => {
      try {
        setLoading(true);
        setError(null);
        const dataURL = await generateQRCodeDataURL(uid, { width: size });
        setQRCodeDataURL(dataURL);
      } catch (err) {
        console.error('Erreur génération QR code:', err);
        setError('Impossible de générer le QR code');
      } finally {
        setLoading(false);
      }
    };

    if (uid) {
      generateQR();
    }
  }, [uid, size]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadQRCode(uid, firstName, lastName);
    } catch (err) {
      console.error('Erreur téléchargement QR code:', err);
      setError('Impossible de télécharger le QR code');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Center h={size}>
        <Loader color="dark" size="lg" />
      </Center>
    );
  }

  if (error || !qrCodeDataURL) {
    return (
      <Center h={size}>
        <Text c="red" size="sm" fw={600}>
          {error || 'Erreur de chargement'}
        </Text>
      </Center>
    );
  }

  return (
    <Stack align="center" gap="md">
      {showUserInfo && (
        <Text size="lg" fw={700} ta="center">
          {firstName} {lastName}
        </Text>
      )}

      <Box
        style={{
          width: size,
          height: size,
          border: '3px solid #000',
          borderRadius: '16px',
          padding: '12px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={qrCodeDataURL}
          alt={`QR Code - ${firstName} ${lastName}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </Box>

      {showDownloadButton && (
        <Button
          leftSection={<IconDownload size={18} />}
          variant="filled"
          color="dark"
          size="md"
          onClick={handleDownload}
          loading={downloading}
          styles={{
            root: {
              borderRadius: '12px',
              fontWeight: 700,
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              },
            },
          }}
        >
          TÉLÉCHARGER LE QR CODE
        </Button>
      )}
    </Stack>
  );
};
