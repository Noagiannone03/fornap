/**
 * Route API: Tester les connexions aux services externes
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { testResendConnection } from '../../src/shared/services/emailService';
import { testQStashConnection } from '../../src/shared/services/queueService';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    console.log('=== Test des services externes ===');

    console.log('Test de Resend...');
    const resendTest = await testResendConnection();
    console.log('Résultat Resend:', resendTest);

    console.log('Test de QStash...');
    const qstashTest = await testQStashConnection();
    console.log('Résultat QStash:', qstashTest);

    const allSuccess = resendTest.success && qstashTest.success;

    res.status(200).json({
      success: allSuccess,
      resend: {
        success: resendTest.success,
        message: resendTest.success
          ? 'Resend est correctement configuré'
          : resendTest.error || 'Erreur de connexion à Resend',
        error: resendTest.error,
      },
      qstash: {
        success: qstashTest.success,
        message: qstashTest.success
          ? 'QStash est correctement configuré'
          : qstashTest.error || 'Erreur de connexion à QStash',
        error: qstashTest.error,
      },
    });
  } catch (error: any) {
    console.error('Error testing services:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du test des services',
    });
  }
}
