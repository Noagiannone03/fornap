# Variables d'Environnement - Système de Cartes d'Adhérent

## Configuration SMTP

Pour que le système d'envoi de cartes d'adhérent fonctionne, vous devez configurer les variables suivantes dans Vercel :

### Variables Requises

```bash
# Configuration SMTP
SMTP_HOST=smtp.gmail.com              # Serveur SMTP
SMTP_PORT=587                         # Port SMTP (587 pour TLS, 465 pour SSL)
SMTP_USER=noreply@4nap.fr            # Email d'envoi
SMTP_PASSWORD=votre_mot_de_passe     # Mot de passe SMTP

# Firebase
VITE_FIREBASE_PROJECT_ID=votre-projet-id

# Image de fond de la carte (base64)
MEMBERSHIP_CARD_BACKGROUND=data:image/png;base64,VOTRE_IMAGE_BASE64...
```

## Comment Configurer

### 1. Dans Vercel Dashboard

1. Aller sur votre projet Vercel
2. Settings → Environment Variables
3. Ajouter chaque variable une par une
4. Scope : Production, Preview, Development (selon besoin)

### 2. Image de Fond

Pour convertir votre image de carte en base64 :

#### Option A : Ligne de commande (Linux/Mac)

```bash
base64 -w 0 carte-fornap.png > carte-base64.txt
cat carte-base64.txt
```

#### Option B : En ligne

Utiliser un service comme :
- https://www.base64-image.de/
- https://base64.guru/converter/encode/image

#### Option C : Node.js

```javascript
const fs = require('fs');
const imageBuffer = fs.readFileSync('carte-fornap.png');
const base64Image = imageBuffer.toString('base64');
const dataUrl = `data:image/png;base64,${base64Image}`;
console.log(dataUrl);
```

### 3. Configuration SMTP selon le service

#### Gmail

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre_app_password  # Utiliser un App Password, pas le mot de passe principal
```

**Important** : Activer "App Passwords" dans les paramètres de sécurité Google

#### SendGrid

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=votre_api_key_sendgrid
```

#### Sendinblue (Brevo)

```bash
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=votre-email@example.com
SMTP_PASSWORD=votre_smtp_key
```

#### Mailgun

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@votre-domaine.mailgun.org
SMTP_PASSWORD=votre_smtp_password
```

## Vérification

Pour tester si les variables sont bien configurées :

### 1. Tester l'API directement

```bash
curl -X POST https://votre-domaine.vercel.app/api/users/send-membership-card \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-id","forceResend":false}'
```

### 2. Consulter les logs Vercel

1. Aller dans Vercel Dashboard
2. Votre projet → Deployments
3. Cliquer sur le dernier déploiement
4. Aller dans "Runtime Logs"
5. Rechercher les logs de l'API

### 3. Tester depuis l'interface admin

1. Connexion à l'admin FORNAP
2. Gestion des Utilisateurs
3. Sélectionner un utilisateur de test
4. Menu "..." → "Envoyer la carte d'adhérent"

## Sécurité

⚠️ **IMPORTANT** :

1. **Ne jamais** committer les vraies valeurs dans Git
2. Utiliser des **App Passwords** pour Gmail (pas le mot de passe principal)
3. Limiter les permissions des API keys au strict minimum
4. Utiliser différentes clés pour Production/Preview/Development
5. Régénérer les clés si elles sont compromises

## Troubleshooting

### Erreur : "Authentication failed"

- Vérifier `SMTP_USER` et `SMTP_PASSWORD`
- Pour Gmail : utiliser un App Password
- Vérifier que le compte n'est pas bloqué

### Erreur : "Connection timeout"

- Vérifier `SMTP_HOST` et `SMTP_PORT`
- Vérifier que le port n'est pas bloqué par un firewall
- Essayer le port 465 (SSL) au lieu de 587 (TLS)

### Erreur : "Image generation failed"

- Vérifier que `MEMBERSHIP_CARD_BACKGROUND` est bien au format base64
- Vérifier que l'image commence par `data:image/png;base64,` ou `data:image/jpeg;base64,`
- Vérifier la taille de l'image (max ~1-2MB en base64)

### L'email n'arrive pas

1. Vérifier les logs Vercel
2. Vérifier le dossier spam/courrier indésirable
3. Vérifier que l'adresse email du destinataire est valide
4. Tester avec un autre service SMTP

### Variables non reconnues

1. Vérifier l'orthographe exacte des noms de variables
2. Redéployer l'application après avoir ajouté les variables
3. Vérifier le scope (Production/Preview/Development)

## Support

Pour plus d'informations, consulter :
- [Documentation Vercel - Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Documentation Nodemailer](https://nodemailer.com/)
- `docs/MEMBERSHIP_CARD_EMAIL_SYSTEM.md` pour la documentation complète du système

