/**
 * Route API: Endpoint PXL pour le tracking des clics
 *
 * Endpoint: GET /api/campaigns/pxl/click
 *
 * Cette route est utilisée par la librairie PXL pour tracker
 * les clics sur les liens dans les emails.
 *
 * Format des paramètres PXL:
 * - recipient: ID du destinataire (premier paramètre)
 * - campaign: ID de la campagne (second paramètre)
 * - link: URL originale du lien (encodée)
 * - sig: Signature de sécurité générée par PXL
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pxl } from '../../_lib/pxl-tracking.js';

/**
 * Handler principal
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Déléguer à PXL qui gère:
  // 1. La vérification de la signature
  // 2. L'extraction des paramètres
  // 3. L'appel du callback onClick
  // 4. La redirection vers l'URL originale
  return pxl.serveClickRedirect()(req, res);
}
