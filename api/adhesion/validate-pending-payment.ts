/**
 * API pour valider un paiement pending
 * Endpoint: POST /api/adhesion/validate-pending-payment
 * Body: { userId: string }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore, getFieldValue } from '../_lib/firebase-admin.js';

interface ValidatePendingPaymentRequest {
  userId: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers pour les appels cross-origin depuis fornap-crowdfunding
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Gérer les requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Méthode autorisée: POST uniquement
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getFirestore();
    const { userId } = req.body as ValidatePendingPaymentRequest;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId in request body',
        success: false,
      });
    }

    // Récupérer l'utilisateur
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'User not found',
        success: false,
      });
    }

    const userData = userDoc.data();

    // Vérifier que le paiement est bien pending
    if (userData?.currentMembership?.paymentStatus !== 'pending') {
      return res.status(400).json({
        error: 'Payment is not pending',
        success: false,
        currentStatus: userData?.currentMembership?.paymentStatus,
      });
    }

    // Utiliser la fonction helper getFieldValue() pour obtenir FieldValue
    const FieldValue = getFieldValue();

    // Mettre à jour le statut de paiement
    await userRef.update({
      'currentMembership.paymentStatus': 'paid',
      'currentMembership.status': 'active',
      'status.tags': (userData.status?.tags || []).filter(
        (tag: string) => tag !== 'PENDING_PAYMENT'
      ),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Mettre à jour la contribution associée
    const contributionId = userData.registration?.adhesionContributionId || userData.registration?.crowdfundingContributionId;
    if (contributionId) {
      const contributionRef = db.collection('contributions').doc(contributionId);
      await contributionRef.update({
        paymentStatus: 'paid',
        paidAt: FieldValue.serverTimestamp(),
      });
    }

    console.log('✅ Paiement validé pour l\'utilisateur:', userId);

    // Envoyer l'email avec la carte d'adhérent
    try {
      // Construire l'URL de base
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;

      const sendCardResponse = await fetch(
        `${baseUrl}/api/users/send-membership-card`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            forceResend: false,
          }),
        }
      );

      const sendCardData = await sendCardResponse.json();

      if (!sendCardData.success) {
        console.warn('⚠️ Erreur lors de l\'envoi de l\'email:', sendCardData.error);
      } else {
        console.log('✅ Email avec carte d\'adhérent envoyé avec succès');
      }
    } catch (emailError) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', emailError);
      // Ne pas faire échouer la validation du paiement si l'email échoue
    }

    return res.status(200).json({
      success: true,
      message: 'Payment validated successfully',
      userId,
    });
  } catch (error: any) {
    console.error('❌ Error validating pending payment:', error);
    return res.status(500).json({
      error: 'Internal server error',
      success: false,
      details: error.message,
    });
  }
}












