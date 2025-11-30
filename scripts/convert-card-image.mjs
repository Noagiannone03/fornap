#!/usr/bin/env node

/**
 * Script pour convertir une image en base64 pour la carte d'adhérent
 * 
 * Usage:
 *   node scripts/convert-card-image.mjs <chemin-image>
 * 
 * Exemple:
 *   node scripts/convert-card-image.mjs ./assets/carte-fornap.png
 */

import fs from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function printUsage() {
  log(colors.cyan, '\n🖼️  Conversion d\'image en base64 pour carte d\'adhérent\n');
  console.log('Usage:');
  console.log('  node scripts/convert-card-image.mjs <chemin-image>\n');
  console.log('Formats supportés:');
  console.log('  - PNG (recommandé)');
  console.log('  - JPG/JPEG');
  console.log('  - GIF\n');
  console.log('Exemple:');
  console.log('  node scripts/convert-card-image.mjs ./assets/carte-fornap.png\n');
  console.log('Dimensions recommandées:');
  console.log('  - Largeur: 450px');
  console.log('  - Hauteur: 800px');
  console.log('  - Format: PNG avec fond transparent ou non\n');
}

function getMimeType(extension) {
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
  };
  return mimeTypes[extension.toLowerCase()] || 'image/png';
}

function convertImageToBase64(imagePath) {
  try {
    // Vérifier que le fichier existe
    if (!fs.existsSync(imagePath)) {
      log(colors.red, `❌ Erreur: Le fichier n'existe pas: ${imagePath}`);
      return null;
    }

    // Lire le fichier
    const imageBuffer = fs.readFileSync(imagePath);
    const fileSize = (imageBuffer.length / 1024).toFixed(2);
    
    log(colors.cyan, '\n📊 Informations sur le fichier:');
    console.log(`  Chemin: ${imagePath}`);
    console.log(`  Taille: ${fileSize} KB`);
    
    if (imageBuffer.length > 2 * 1024 * 1024) {
      log(colors.yellow, '  ⚠️  Attention: Fichier > 2MB, cela peut causer des problèmes');
    }

    // Déterminer le type MIME
    const extension = path.extname(imagePath);
    const mimeType = getMimeType(extension);
    console.log(`  Type MIME: ${mimeType}\n`);

    // Convertir en base64
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    log(colors.green, '✅ Conversion réussie !\n');

    // Sauvegarder dans un fichier
    const outputPath = path.join(path.dirname(imagePath), 'carte-base64.txt');
    fs.writeFileSync(outputPath, dataUrl);
    log(colors.green, `💾 Sauvegardé dans: ${outputPath}\n`);

    // Afficher un extrait
    const preview = dataUrl.substring(0, 100) + '...';
    log(colors.cyan, 'Aperçu (100 premiers caractères):');
    console.log(preview);
    console.log(`\nLongueur totale: ${dataUrl.length} caractères\n`);

    // Instructions
    log(colors.cyan, '📝 Prochaines étapes:\n');
    console.log('1. Copier le contenu de carte-base64.txt');
    console.log('2. Aller dans Vercel Dashboard → Settings → Environment Variables');
    console.log('3. Créer/Modifier la variable MEMBERSHIP_CARD_BACKGROUND');
    console.log('4. Coller la valeur (tout le contenu du fichier)');
    console.log('5. Redéployer l\'application si nécessaire\n');

    log(colors.yellow, '⚠️  Note: Ne pas committer le fichier carte-base64.txt dans Git\n');

    return dataUrl;

  } catch (error) {
    log(colors.red, `❌ Erreur lors de la conversion: ${error.message}`);
    return null;
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

const imagePath = args[0];

if (!imagePath) {
  log(colors.red, '❌ Erreur: Chemin d\'image requis');
  printUsage();
  process.exit(1);
}

const result = convertImageToBase64(imagePath);

if (result) {
  log(colors.green, '✨ Terminé avec succès !\n');
  process.exit(0);
} else {
  log(colors.red, '❌ La conversion a échoué\n');
  process.exit(1);
}

