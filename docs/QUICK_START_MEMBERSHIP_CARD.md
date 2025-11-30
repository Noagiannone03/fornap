# 🚀 Guide de Démarrage Rapide - Système de Cartes d'Adhérent

## ✅ Configuration Complète

Tout est prêt à l'emploi ! Le système est configuré avec les credentials SMTP FORNAP.

## 📋 Checklist de Déploiement

### 1. ✅ Déployer sur Vercel

```bash
cd /Users/noagiannone/Documents/Vs\ Code/fornap
vercel --prod
```

Le système fonctionnera immédiatement car les credentials SMTP sont déjà configurés dans le code.

### 2. 🎨 Ajouter l'image de la carte (Optionnel)

Si vous avez déjà une image de carte d'adhérent :

```bash
# Convertir l'image en base64
node scripts/convert-card-image.mjs ./chemin/vers/carte-fornap.png

# Copier le contenu de carte-base64.txt
# Aller dans Vercel → Settings → Environment Variables
# Créer MEMBERSHIP_CARD_BACKGROUND et coller le contenu
# Redéployer
```

**Note** : Si vous n'ajoutez pas d'image, une image par défaut (transparente) sera utilisée.

### 3. 🧪 Tester le Système

#### Option A : Via l'Interface Admin

1. Se connecter à l'admin FORNAP
2. Aller dans **Gestion des Utilisateurs**
3. Sélectionner un utilisateur de test
4. Cliquer sur le menu **"..."**
5. Cliquer sur **"Envoyer la carte d'adhérent"**
6. Confirmer

Vous devriez voir :
- ✅ Badge vert "Email envoyé" sur l'utilisateur
- ✅ Email reçu dans la boîte mail de l'utilisateur

#### Option B : Via Script de Test

```bash
# Remplacer USER_ID par un vrai UID d'utilisateur
node scripts/test-membership-card.mjs USER_ID

# Pour forcer le renvoi
node scripts/test-membership-card.mjs USER_ID --force
```

#### Option C : Via API Direct

```bash
curl -X POST https://votre-domaine.vercel.app/api/users/send-membership-card \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "VOTRE_USER_ID",
    "forceResend": false
  }'
```

## 📧 Ce qui se Passe Quand on Envoie

1. L'API récupère les données de l'utilisateur depuis Firestore
2. Génère un QR code unique : `FORNAP-MEMBER:{uid}`
3. Crée une image JPG de la carte avec :
   - L'image de fond (si configurée)
   - Le QR code au centre
   - Le type d'abonnement (mensuel/annuel/honoraire)
   - La date d'expiration
   - Le nom et prénom
4. Envoie l'email via `no-reply@fornap.fr` avec :
   - Message de bienvenue personnalisé
   - Carte d'adhérent en pièce jointe (JPG)
5. Marque dans Firestore :
   - `emailStatus.membershipCardSent = true`
   - `emailStatus.membershipCardSentAt = timestamp`
   - `emailStatus.membershipCardSentCount++`

## 🎯 Utilisation Courante

### Créer un Utilisateur et Envoyer sa Carte

1. **Créer l'utilisateur** via l'admin
   - Bouton "Nouvel Utilisateur"
   - Remplir le formulaire
   - Enregistrer

2. **Envoyer la carte**
   - Menu "..." → "Envoyer la carte d'adhérent"
   - Confirmer
   - ✅ Email envoyé !

### Renvoyer une Carte

Si un utilisateur a perdu son email :

1. Trouver l'utilisateur dans la liste
2. Vérifier le badge "Email envoyé (x1)" ou plus
3. Menu "..." → "Renvoyer la carte d'adhérent"
4. Confirmer
5. Le compteur s'incrémente automatiquement

### Vérifier les Statistiques

Dans l'interface admin, vous pouvez voir :
- 📧 Badge vert : Email envoyé
- 📧 Badge rouge : Email non envoyé
- Nombre d'envois dans le tooltip

## 🔧 Configuration Avancée (Optionnel)

### Utiliser les Variables d'Environnement

Pour plus de sécurité, déplacer les credentials en variables d'environnement :

```bash
# Dans Vercel Dashboard → Settings → Environment Variables
SMTP_HOST=mail.fornap.fr
SMTP_PORT=587
SMTP_USER=no-reply@fornap.fr
SMTP_PASSWORD=rU6*suHY_b-ce1Z
```

Puis dans le code, retirer les valeurs par défaut :

```typescript
auth: {
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASSWORD,
}
```

### Changer le Serveur SMTP

Si vous voulez utiliser un autre serveur (Gmail, SendGrid, etc.) :

1. Modifier les variables d'environnement dans Vercel
2. Ou modifier les valeurs par défaut dans `api/users/send-membership-card.ts`

## 📊 Monitoring

### Voir Combien d'Emails ont été Envoyés

Dans Firestore Console :

```javascript
// Requête Firestore
collection('users')
  .where('emailStatus.membershipCardSent', '==', true)
  .count()
```

### Logs en Temps Réel

Vercel Dashboard → Deployments → Runtime Logs

Rechercher :
- `✅ Email envoyé à`
- `❌ Error sending email`

## 🐛 Problèmes Courants

### ❌ "User not found"
→ L'UID n'existe pas dans Firestore. Vérifier l'UID.

### ❌ "Email already sent"
→ Normal ! Utiliser "Renvoyer" au lieu de "Envoyer".

### ❌ "Failed to send email"
→ Vérifier les logs Vercel. Problème SMTP possible.

### ❌ Email non reçu
→ Vérifier le dossier SPAM, l'adresse email, les logs.

## 📚 Documentation Complète

- [`docs/MEMBERSHIP_CARD_EMAIL_SYSTEM.md`](./MEMBERSHIP_CARD_EMAIL_SYSTEM.md) - Documentation complète du système
- [`docs/SMTP_CONFIG.md`](./SMTP_CONFIG.md) - Configuration SMTP détaillée
- [`docs/ENVIRONMENT_VARIABLES.md`](./ENVIRONMENT_VARIABLES.md) - Toutes les variables d'environnement

## 🎉 Système Prêt !

Tout est configuré et prêt à l'emploi. Il suffit de :

1. ✅ Déployer sur Vercel
2. ✅ Tester avec un utilisateur
3. ✅ Profiter ! 🎊

---

**Support** : En cas de problème, consulter les logs Vercel et la documentation complète.

