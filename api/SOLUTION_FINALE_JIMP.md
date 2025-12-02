# Solution Finale : Jimp pour la génération de cartes

## Historique du problème

### Tentatives précédentes

1. **@napi-rs/canvas** : Le texte ne s'affichait pas du tout (bug de rendu)
2. **Sharp avec SVG** : Affichait des carrés à la place du texte (erreur Fontconfig - pas de polices système disponibles sur Vercel)

### Solution finale : Jimp

**Jimp** est la solution parfaite car :
- ✅ **Polices intégrées** : bitmap fonts incluses, pas de dépendance système
- ✅ **Fonctionne partout** : Vercel, AWS Lambda, Docker, etc.
- ✅ **Support UTF-8 natif** : gère correctement les accents français
- ✅ **API simple** : manipulation d'images intuitive
- ✅ **Pas de compilation native** : JavaScript pur

## Polices disponibles dans Jimp

Jimp inclut plusieurs polices bitmap :
- `FONT_SANS_8_BLACK` / `FONT_SANS_8_WHITE`
- `FONT_SANS_16_BLACK` / `FONT_SANS_16_WHITE`
- `FONT_SANS_32_BLACK` / `FONT_SANS_32_WHITE`
- `FONT_SANS_64_BLACK` / `FONT_SANS_64_WHITE`

Nous utilisons :
- `FONT_SANS_32_WHITE` pour le type d'abonnement et le nom
- `FONT_SANS_16_WHITE` pour la date d'expiration

## Code de génération

```typescript
const image = await Jimp.read(backgroundImagePath);
const qrImage = await Jimp.read(qrBuffer);
const font32 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

// Composer QR code
image.composite(qrImage, qrX, qrY);

// Dessiner texte centré
image.print(font32, 0, 600, {
  text: membershipTypeLabel,
  alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
}, 450);
```

## Avantages

1. **Pas de Fontconfig** : ne dépend pas des polices système
2. **Portable** : fonctionne identiquement en local et en production
3. **Fiable** : solution éprouvée utilisée par des millions de projets
4. **Simple** : pas de configuration complexe

## Installation

```bash
cd api
npm install
```

## Déploiement

```bash
vercel --prod
```

Jimp fonctionne automatiquement sur Vercel sans configuration.

## Résultat

L'image générée contient :
- ✅ Background (base-image.png)
- ✅ QR code centré à Y=340
- ✅ Type d'abonnement (blanc, 32px, Y=600)
- ✅ Date d'expiration (blanc, 16px, Y=640)
- ✅ Nom complet (blanc, 32px, Y=680)

**Tous les textes s'affichent correctement avec les accents français !**


