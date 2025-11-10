/**
 * Route API: Envoyer un email de test
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendSingleEmail } from '../../src/shared/services/emailService.js';
import { EMAIL_CONFIG } from '../../src/shared/config/email.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    const { to } = req.body;

    if (!to) {
      res.status(400).json({
        success: false,
        error: 'Adresse email destinataire manquante',
      });
      return;
    }

    console.log(`Envoi d'un email de test à ${to}...`);

    const testHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Email de test FORNAP</h1>
  </div>
  
  <div style="background-color: #f8f9fa; padding: 30px 20px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #333; margin-top: 0;">Félicitations !</h2>
    
    <p style="font-size: 16px; margin: 20px 0;">
      Votre système d'envoi d'emails fonctionne correctement ! 🚀
    </p>
    
    <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #666;">
        <strong>Date d'envoi:</strong> ${new Date().toLocaleString('fr-FR')}<br>
        <strong>Service:</strong> Resend via FORNAP<br>
        <strong>Type:</strong> Email de test
      </p>
    </div>
    
    <p style="font-size: 14px; color: #666; margin: 20px 0;">
      Si vous recevez cet email, cela signifie que :
    </p>
    
    <ul style="font-size: 14px; color: #666;">
      <li>✅ Votre API Key Resend est valide</li>
      <li>✅ La configuration des variables d'environnement est correcte</li>
      <li>✅ Les routes API fonctionnent correctement</li>
      <li>✅ Le système d'envoi est opérationnel</li>
    </ul>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p style="font-size: 12px; color: #999; margin: 0;">
        Cet email a été envoyé depuis le système de diagnostics de FORNAP.<br>
        Si vous n'avez pas demandé cet email, vous pouvez l'ignorer.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const result = await sendSingleEmail({
      to,
      toName: to,
      subject: '✅ Email de test FORNAP - Système fonctionnel',
      html: testHtml,
      fromName: EMAIL_CONFIG.DEFAULT_FROM_NAME,
      fromEmail: EMAIL_CONFIG.DEFAULT_FROM_EMAIL,
      headers: {
        'X-Test-Email': 'true',
        'X-Sent-At': new Date().toISOString(),
      },
      tags: [
        { name: 'type', value: 'test' },
        { name: 'source', value: 'diagnostics' },
      ],
    });

    if (result.success) {
      console.log(`Email de test envoyé avec succès - Message ID: ${result.messageId}`);
      res.status(200).json({
        success: true,
        message: `Email de test envoyé à ${to}`,
        messageId: result.messageId,
        sentAt: result.sentAt,
      });
    } else {
      console.error(`Échec de l'envoi de l'email de test:`, result.error);
      res.status(500).json({
        success: false,
        error: result.error || 'Échec de l\'envoi',
        details: result,
      });
    }
  } catch (error: any) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'envoi',
      details: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
}
