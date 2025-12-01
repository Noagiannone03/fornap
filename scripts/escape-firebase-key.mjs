#!/usr/bin/env node

/**
 * Script pour échapper correctement la clé Firebase Service Account pour Vercel
 * 
 * Usage:
 * node scripts/escape-firebase-key.mjs path/to/service-account.json
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('❌ Usage: node scripts/escape-firebase-key.mjs path/to/service-account.json');
  process.exit(1);
}

const keyPath = args[0];

if (!fs.existsSync(keyPath)) {
  console.error(`❌ File not found: ${keyPath}`);
  process.exit(1);
}

try {
  const keyContent = fs.readFileSync(keyPath, 'utf8');
  const keyJson = JSON.parse(keyContent);

  // Vérifier que c'est bien une clé de service Firebase
  if (!keyJson.type || keyJson.type !== 'service_account') {
    console.error('❌ This does not appear to be a Firebase service account key');
    process.exit(1);
  }

  // Convertir en string JSON compacte (une seule ligne)
  const compactJson = JSON.stringify(keyJson);

  console.log('✅ Firebase Service Account Key (ready for Vercel):');
  console.log('');
  console.log('Copy the following line and paste it as the value for FIREBASE_SERVICE_ACCOUNT_KEY in Vercel:');
  console.log('');
  console.log('─'.repeat(80));
  console.log(compactJson);
  console.log('─'.repeat(80));
  console.log('');
  console.log('✅ Done! Copy the line above and paste it in Vercel Environment Variables.');

} catch (error) {
  console.error('❌ Error processing key file:', error.message);
  process.exit(1);
}






