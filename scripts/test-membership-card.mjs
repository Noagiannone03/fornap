#!/usr/bin/env node

/**
 * Script de test pour le système d'envoi de cartes d'adhérent
 * 
 * Usage:
 *   node scripts/test-membership-card.js <user-id> [--force]
 * 
 * Exemples:
 *   node scripts/test-membership-card.js abc123xyz
 *   node scripts/test-membership-card.js abc123xyz --force
 */

import fetch from 'node-fetch';

// Configuration
const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';
const ENDPOINT = `${API_URL}/api/users/send-membership-card`;

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function printUsage() {
  log(colors.cyan, '\n📧 Test du système d\'envoi de cartes d\'adhérent FORNAP\n');
  console.log('Usage:');
  console.log('  node scripts/test-membership-card.js <user-id> [--force]\n');
  console.log('Options:');
  console.log('  <user-id>  : UID de l\'utilisateur Firebase');
  console.log('  --force    : Force le renvoi même si déjà envoyé\n');
  console.log('Exemples:');
  console.log('  node scripts/test-membership-card.js abc123xyz');
  console.log('  node scripts/test-membership-card.js abc123xyz --force\n');
}

async function testMembershipCard(userId, forceResend = false) {
  try {
    log(colors.cyan, '\n🚀 Envoi de la carte d\'adhérent...\n');
    log(colors.blue, `User ID: ${userId}`);
    log(colors.blue, `Force Resend: ${forceResend}`);
    log(colors.blue, `Endpoint: ${ENDPOINT}\n`);

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        forceResend,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      log(colors.green, '✅ Succès !');
      console.log('\nRésultat:');
      console.log(JSON.stringify(data, null, 2));

      if (data.sentCount) {
        log(colors.yellow, `\n📊 Nombre d'envois: ${data.sentCount}`);
      }
    } else if (data.alreadySent) {
      log(colors.yellow, '⚠️  Email déjà envoyé');
      console.log('\nDétails:');
      console.log(JSON.stringify(data, null, 2));
      log(colors.cyan, '\n💡 Utilisez --force pour renvoyer l\'email');
    } else {
      log(colors.red, '❌ Erreur');
      console.log('\nDétails:');
      console.log(JSON.stringify(data, null, 2));
    }

  } catch (error) {
    log(colors.red, '❌ Erreur lors de la requête');
    console.error('\nDétails:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      log(colors.yellow, '\n⚠️  Impossible de se connecter à l\'API');
      log(colors.cyan, `Vérifiez que l'API est accessible à : ${API_URL}`);
    }
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

const userId = args[0];
const forceResend = args.includes('--force') || args.includes('-f');

if (!userId) {
  log(colors.red, '❌ Erreur: User ID requis');
  printUsage();
  process.exit(1);
}

testMembershipCard(userId, forceResend)
  .then(() => {
    log(colors.cyan, '\n✨ Test terminé\n');
  })
  .catch((error) => {
    log(colors.red, `\n❌ Erreur fatale: ${error.message}\n`);
    process.exit(1);
  });

