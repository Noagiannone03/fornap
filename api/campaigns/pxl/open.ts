/**
 * Route API: Endpoint PXL pour le tracking des ouvertures
 *
 * Endpoint: GET /api/campaigns/pxl/open
 *
 * Cette route est utilisée par la librairie PXL pour tracker
 * les ouvertures d'emails via un pixel transparent.
 *
 * Format des paramètres PXL:
 * - recipient: ID du destinataire (premier paramètre)
 * - campaign: ID de la campagne (second paramètre)
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
  // 3. L'appel du callback onOpen
  // 4. Le renvoi du pixel transparent
  return pxl.serveOpenPixel()(req, res);
}
