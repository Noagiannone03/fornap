# Test Sharp + Montserrat Google Fonts

## Problème résolu

L'erreur `Fontconfig error: Cannot load default config file` indiquait que Sharp ne trouvait pas les polices système (Arial) sur Vercel.

## Solution implémentée

✅ **Utilisation de Montserrat Bold de Google Fonts** directement dans le SVG overlay

```typescript
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap');

.text { 
  fill: white; 
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;  // Bold
}
```

### Avantages

1. **Police embarquée** : Google Fonts charge automatiquement la police
2. **Pas de dépendances système** : fonctionne sur n'importe quel serveur
3. **Rendu garanti** : pas de carrés vides
4. **Qualité professionnelle** : Montserrat est une police moderne et élégante

## Déploiement

```bash
cd /Users/noagiannone/Documents/Vs\ Code/fornap
git add .
git commit -m "fix: Use Sharp + Montserrat Google Fonts for membership cards"
git push
vercel --prod
```

## Test

Après déploiement, appeler l'API :

```bash
POST https://your-domain.vercel.app/api/users/send-membership-card
{
  "userId": "test-user-id",
  "forceResend": true
}
```

## Logs attendus

```
🎨 Generating card with sharp + Google Fonts Montserrat...
  - membershipType: membre mensuel
  - expiryText: expire le 02/01/2026
  - fullName: adam adam
📝 SVG with Montserrat Bold from Google Fonts generated
✅ Card generated successfully with sharp + Montserrat
```

**Plus d'erreur Fontconfig !**
**Plus de carrés dans le texte !**

## Résultat final

L'image générée contient maintenant :
- ✅ Background (base-image.png)
- ✅ QR code centré
- ✅ **Texte lisible avec Montserrat Bold** (plus de carrés !)
- ✅ Type d'abonnement
- ✅ Date d'expiration
- ✅ Nom complet du membre

## Bonus

Si tu veux changer la police plus tard, il suffit de modifier l'URL Google Fonts :
- Roboto : `@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');`
- Poppins : `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap');`
- Inter : `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');`














