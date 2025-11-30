# Système d'Envoi Automatique de Cartes d'Adhérent FORNAP

## 📋 Vue d'ensemble

Ce système permet d'envoyer automatiquement par email une carte d'adhérent personnalisée avec QR code unique à chaque nouveau membre FORNAP.

## 🏗️ Architecture

### Composants

1. **API Serverless** (`/api/users/send-membership-card.ts`)
   - Fonction Vercel serverless
   - Génère la carte d'adhérent avec QR code
   - Envoie l'email via Nodemailer
   - Met à jour le statut dans Firestore

2. **Service Frontend** (`userService.ts`)
   - `sendMembershipCard()` - Appelle l'API
   - `getEmailStatus()` - Récupère le statut d'envoi

3. **Interface Admin** (`EnhancedUsersListPage.tsx`)
   - Indicateur visuel du statut d'envoi
   - Bouton pour envoyer/renvoyer la carte
   - Confirmation avant envoi

4. **Types TypeScript** (`user.ts`)
   - `EmailStatus` - Statut d'envoi des emails
   - Intégration dans le type `User`

## 📊 Structure de Données

### Champ `emailStatus` dans Firestore

```typescript
emailStatus: {
  membershipCardSent: boolean,          // Email envoyé ou non
  membershipCardSentAt: Timestamp,      // Date du dernier envoi
  membershipCardSentCount: number,      // Nombre d'envois
  lastEmailError?: string               // Dernière erreur (optionnel)
}
```

## 🚀 Utilisation

### 1. Configuration

Configurer les variables d'environnement dans Vercel :

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@4nap.fr
SMTP_PASSWORD=your_password

# Firebase
VITE_FIREBASE_PROJECT_ID=your_project_id

# Image de fond de la carte (en base64)
MEMBERSHIP_CARD_BACKGROUND=data:image/png;base64,...

# URL de l'API (optionnel, par défaut utilise le domaine actuel)
VITE_API_URL=https://your-domain.vercel.app
```

### 2. Envoyer une carte manuellement depuis l'admin

1. Aller dans "Gestion des Utilisateurs"
2. Trouver l'utilisateur
3. Cliquer sur le menu "..." 
4. Cliquer sur "Envoyer la carte d'adhérent"
5. Confirmer

### 3. Renvoyer une carte

Si l'email a déjà été envoyé, le bouton affichera "Renvoyer la carte d'adhérent".
Le système incrémente automatiquement le compteur d'envois.

### 4. Appeler l'API directement

```typescript
// Endpoint
POST /api/users/send-membership-card

// Body
{
  "userId": "user-uid-here",
  "forceResend": false  // true pour forcer le renvoi
}

// Response (succès)
{
  "success": true,
  "message": "Membership card email sent successfully",
  "userId": "user-uid-here",
  "email": "user@example.com",
  "sentCount": 1
}

// Response (déjà envoyé)
{
  "success": false,
  "message": "Email already sent. Use forceResend=true to resend.",
  "alreadySent": true,
  "sentAt": "2024-01-01T12:00:00Z",
  "sentCount": 1
}

// Response (erreur)
{
  "success": false,
  "error": "Error message here",
  "details": "Detailed error message"
}
```

## 🎨 Personnalisation de la Carte

### Image de Fond

L'image de fond de la carte est stockée en base64 dans la variable d'environnement `MEMBERSHIP_CARD_BACKGROUND`.

Pour convertir votre image :

```bash
# Linux/Mac
base64 -w 0 carte-fornap.png > carte-base64.txt

# Ou en ligne
# https://www.base64-image.de/
```

### Dimensions

- Canvas : 450x800 pixels
- QR Code : 190x190 pixels
- Position QR : X=130, Y=340

### Texte sur la Carte

Positions (modifiables dans `/api/users/send-membership-card.ts`) :

- Type d'abonnement : Y=630
- Date d'expiration : Y=660
- Nom et Prénom : Y=700

## 📧 Contenu de l'Email

L'email contient :
- Message de bienvenue personnalisé
- Informations sur le Fort Napoléon
- Informations sur le festival 4NAP
- Avertissement sur l'importance du QR code
- Carte d'adhérent en pièce jointe (JPG)

## 🔒 Sécurité

### Vérifications

- ✅ Vérifie que l'utilisateur existe
- ✅ Vérifie que l'email n'a pas déjà été envoyé (sauf si `forceResend=true`)
- ✅ Marque l'envoi dans la base de données
- ✅ Incrémente le compteur d'envois

### Méthode HTTP

- Seul `POST` est accepté
- Retourne `405 Method Not Allowed` pour autres méthodes

## 🐛 Debugging

### Logs

Les logs sont disponibles dans :
- Console Vercel (pour la fonction serverless)
- Console navigateur (pour les appels frontend)

### Erreurs Courantes

**1. "User not found"**
- L'UID n'existe pas dans Firestore
- Vérifier l'UID passé à l'API

**2. "Email already sent"**
- L'email a déjà été envoyé
- Utiliser `forceResend=true` pour renvoyer

**3. "Failed to generate membership card image"**
- Problème avec Canvas ou l'image de fond
- Vérifier la variable `MEMBERSHIP_CARD_BACKGROUND`

**4. "Failed to send membership email"**
- Problème SMTP
- Vérifier les credentials SMTP dans les variables d'environnement

**5. "Failed to update email status in database"**
- Problème Firebase
- Vérifier les permissions Firestore

## 📦 Dépendances

### API (`/api/package.json`)

```json
{
  "@vercel/node": "^3.0.0",
  "firebase-admin": "^13.6.0",
  "nodemailer": "^7.0.10",
  "qrcode": "^1.5.4",
  "canvas": "^2.11.2"
}
```

### Frontend (déjà dans `package.json` principal)

```json
{
  "nodemailer": "^7.0.10",
  "qrcode": "^1.5.4",
  "@types/nodemailer": "^7.0.3",
  "@types/qrcode": "^1.5.6"
}
```

## 🚀 Déploiement

### Vercel

Le système se déploie automatiquement avec le reste de l'application :

```bash
# Build et déploiement
vercel --prod

# Ou via Git (automatique)
git push origin main
```

### Variables d'Environnement

Configurer dans Vercel Dashboard :
1. Projet → Settings → Environment Variables
2. Ajouter toutes les variables listées dans "Configuration"
3. Redéployer si nécessaire

## 📝 Notes Importantes

1. **QR Code** : Le QR code est basé sur l'UID de l'utilisateur qui ne change jamais
2. **Format** : `FORNAP-MEMBER:{uid}`
3. **Compteur** : Le système garde un historique du nombre d'envois
4. **Nodemailer** : Utilisé au lieu de Resend pour un contrôle SMTP complet

## 🔄 Workflow Complet

1. Admin crée un utilisateur
2. Admin clique sur "Envoyer la carte d'adhérent"
3. Confirmation modale s'affiche
4. API génère la carte avec QR code
5. API envoie l'email via Nodemailer
6. API met à jour `emailStatus` dans Firestore
7. Interface admin affiche le badge "Email envoyé"

## 📞 Support

Pour toute question ou problème :
- Consulter les logs Vercel
- Vérifier les variables d'environnement
- Tester l'API directement via Postman/curl

---

**Créé pour FORNAP - Fort Napoléon Social Club**

