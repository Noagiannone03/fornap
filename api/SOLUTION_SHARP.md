# Solution : Migration vers Sharp pour la génération de cartes

## Problème rencontré

`@napi-rs/canvas` ne rendait pas correctement le texte sur les cartes d'adhérent :
- ✅ Le QR code s'affichait
- ✅ L'image de fond s'affichait
- ❌ Le texte ne s'affichait pas (alors que les logs confirmaient que le code s'exécutait)

## Solution adoptée

Remplacement de `@napi-rs/canvas` par **Sharp** :
- ✅ Bibliothèque professionnelle pour la manipulation d'images
- ✅ Parfaitement supportée sur Vercel (aucune dépendance native)
- ✅ Utilise des overlays SVG pour le texte (rendu garanti)
- ✅ Plus rapide et plus fiable

## Avantages de Sharp

1. **Pas de dépendances natives** : fonctionne out-of-the-box sur Vercel
2. **Texte via SVG** : rendu parfait et prévisible
3. **Composition d'images** : overlay du QR code et du texte sur le background
4. **Performance** : optimisé pour les environnements serverless
5. **Qualité d'image** : contrôle précis de la compression JPEG

## Installation

```bash
cd api
npm install
```

## Déploiement sur Vercel

Sharp fonctionne automatiquement sur Vercel sans configuration supplémentaire.

```bash
vercel --prod
```

## Test local

Utiliser Vercel Dev pour tester localement :

```bash
vercel dev
```

Puis appeler l'endpoint :

```bash
POST http://localhost:3000/api/users/send-membership-card
{
  "userId": "your-user-id",
  "forceResend": false
}
```

## Rendu final

L'image générée contient :
- ✅ Background (base-image.png)
- ✅ QR code centré
- ✅ Type d'abonnement (membre mensuel/annuel/honoraire)
- ✅ Date d'expiration
- ✅ Nom et prénom du membre








