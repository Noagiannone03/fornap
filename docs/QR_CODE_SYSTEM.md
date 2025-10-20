# 🔐 Système QR Code Fornap

## Vue d'ensemble

Le système QR Code permet aux membres pré-existants (ajoutés manuellement dans Firestore) de créer facilement leur compte sur la plateforme en ligne en important simplement leur QR code.

---

## 🗂️ Architecture Firebase

### Collections Firestore

```
fornap-db/
├── users/                          # Utilisateurs avec compte actif
│   └── {uid}/
│       ├── email: string
│       ├── firstName: string
│       ├── lastName: string
│       ├── phone: string
│       ├── dateOfBirth: Timestamp
│       ├── postalCode: string
│       ├── createdAt: Timestamp
│       ├── interests: string[]
│       ├── howDidYouHearAboutUs: string
│       ├── preferredAmbiance: string
│       ├── subscription: {
│       │   type: string
│       │   status: 'active' | 'inactive'
│       │   startDate: Timestamp
│       │   endDate: Timestamp
│       │   autoRenew: boolean
│       │ }
│       └── qrCode: string
│
└── pre-members/                    # Membres pré-existants sans compte
    └── {uid}/                      # UID généré (format UUID v4)
        ├── firstName: string
        ├── lastName: string
        ├── email: string
        ├── phone: string
        ├── birthDate: string       # Format: "DD/MM/YYYY"
        ├── postalCode: string
        ├── ticketType: string
        ├── memberType: string      # Ex: "4nap-festival"
        ├── createdAt: Timestamp
        ├── endMember: Timestamp    # Date de fin d'adhésion
        ├── qrCodeUrl: string       # URL de l'image du QR code
        ├── qrCodeData: string      # Données encodées dans le QR (l'UID)
        ├── hasAccount: boolean     # false par défaut
        └── linkedUserId: string | null  # UID Firebase Auth une fois compte créé
```

---

## 🔄 Flux Utilisateur

### Scénario 1: Nouveau Membre

```
1. Utilisateur clique sur "S'INSCRIRE" sur le site
2. Choisit une formule d'abonnement
3. Passe par le processus d'inscription multi-étapes
4. Le compte est créé dans Firebase Auth
5. Le profil est créé dans users/{uid}
6. Un QR code est généré et stocké
```

### Scénario 2: Membre Pré-existant avec QR Code

```
1. Admin ajoute le membre manuellement dans pre-members/
   - Génère un UID unique (UUID v4)
   - Crée et stocke le QR code avec cet UID
   - hasAccount = false

2. Membre reçoit son QR code (image)

3. Membre va sur /qr-login

4. Importe son QR code

5. Système lit le QR code et extrait l'UID

6. Vérifie si un document existe dans pre-members/{uid}

7. Si oui:
   a. Affiche les données pré-remplies
   b. Demande uniquement:
      - Mot de passe
      - Confirmation mot de passe
      - Optionnel: centres d'intérêt, préférences
   c. Crée le compte Firebase Auth
   d. Copie les données de pre-members vers users/
   e. Met à jour pre-members:
      - hasAccount = true
      - linkedUserId = {nouveau uid Firebase Auth}
   f. Redirige vers le dashboard

8. Si non:
   - Affiche erreur "QR code non reconnu"
   - Propose de créer un nouveau compte
```

---

## 📱 Format du QR Code

### Contenu du QR Code

Le QR code contient simplement l'UID du membre:

```
11f75aa6-2b60-455f-bcb3-db0a20e85b1a
```

### Génération du QR Code

```typescript
import QRCode from 'qrcode';

async function generateQRCode(uid: string): Promise<string> {
  try {
    // Générer le QR code en base64
    const qrCodeDataUrl = await QRCode.toDataURL(uid, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrCodeDataUrl;
  } catch (error) {
    console.error('Erreur génération QR code:', error);
    throw error;
  }
}
```

### Lecture du QR Code

```typescript
import jsQR from 'jsqr';

async function readQRCode(imageFile: File): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);

        if (imageData) {
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code) {
            resolve(code.data); // L'UID
          } else {
            resolve(null);
          }
        } else {
          reject(new Error('Impossible de lire l\'image'));
        }
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });
}
```

---

## 🛠️ Implémentation

### Service Firebase pour Pre-Members

```typescript
// src/services/firebase/preMembers.ts
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';

export const preMemberService = {
  async getPreMember(uid: string) {
    const docRef = doc(db, 'pre-members', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { uid, ...docSnap.data() };
    }
    return null;
  },

  async linkUserAccount(preMemberUid: string, firebaseAuthUid: string) {
    const docRef = doc(db, 'pre-members', preMemberUid);
    await updateDoc(docRef, {
      hasAccount: true,
      linkedUserId: firebaseAuthUid,
      accountCreatedAt: new Date(),
    });
  },

  async createUserFromPreMember(preMemberData: any, firebaseAuthUid: string) {
    const userRef = doc(db, 'users', firebaseAuthUid);

    // Convertir les données pre-member en format user
    const userData = {
      uid: firebaseAuthUid,
      email: preMemberData.email,
      firstName: preMemberData.firstName,
      lastName: preMemberData.lastName,
      phone: preMemberData.phone,
      dateOfBirth: preMemberData.birthDate,
      postalCode: preMemberData.postalCode,
      createdAt: new Date(),

      subscription: {
        type: preMemberData.memberType,
        status: 'active',
        startDate: preMemberData.createdAt,
        endDate: preMemberData.endMember,
        autoRenew: false,
      },

      loyaltyPoints: 0,
      activityHistory: [],
      tags: [],
      interests: [],

      // Lien vers le pre-member original
      preMemberId: preMemberData.uid,
      qrCode: preMemberData.qrCodeUrl,
    };

    await setDoc(userRef, userData);
    return userData;
  },
};
```

### Intégration dans AuthContext

```typescript
// src/contexts/AuthContext.tsx

// Nouvelle méthode à ajouter
const signupFromQR = async (
  qrUid: string,
  password: string,
  additionalData?: Partial<SignupFormData>
) => {
  try {
    // 1. Récupérer les données du pre-member
    const preMember = await preMemberService.getPreMember(qrUid);

    if (!preMember) {
      throw new Error('QR code non reconnu');
    }

    if (preMember.hasAccount) {
      throw new Error('Ce QR code est déjà associé à un compte');
    }

    // 2. Créer le compte Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      preMember.email,
      password
    );

    // 3. Créer le profil utilisateur à partir des données pre-member
    await preMemberService.createUserFromPreMember(
      { ...preMember, ...additionalData },
      userCredential.user.uid
    );

    // 4. Lier le compte
    await preMemberService.linkUserAccount(qrUid, userCredential.user.uid);

    return userCredential.user;
  } catch (error) {
    console.error('Erreur signup from QR:', error);
    throw error;
  }
};
```

---

## 🎨 UI/UX du Flow QR Code

### Page QR Login (`/qr-login`)

**Éléments principaux:**
- Zone de drop/upload pour l'image QR code
- Preview de l'image uploadée
- Bouton "Vérifier le QR code"
- Lien vers création de compte classique
- Design minimaliste et rassurant

**États:**
1. **Initial**: Upload disponible
2. **Loading**: Lecture du QR code en cours
3. **Success**: QR code reconnu, affichage des infos
4. **Error**: QR code non reconnu

### Page Signup from QR (`/signup/from-qr?uid=xxx`)

**Affichage:**
- Message de bienvenue personnalisé: "Bonjour {firstName} !"
- Données pré-remplies (en lecture seule):
  - Nom, Prénom
  - Email
  - Téléphone
  - Code postal
  - Type d'abonnement
  - Date d'expiration
- Champs à compléter:
  - Mot de passe (requis)
  - Confirmer mot de passe (requis)
  - Centres d'intérêt (optionnel)
  - Comment avez-vous connu Fornap (optionnel)
  - Ambiance préférée (optionnel)

**Validation:**
- Mot de passe minimum 8 caractères
- Les deux mots de passe doivent correspondre
- Email déjà validé (vient de pre-member)

---

## 🔒 Sécurité

### Validations

1. **Unicité de l'UID**: Chaque QR code a un UID unique (UUID v4)
2. **Vérification hasAccount**: Empêche l'utilisation multiple du même QR
3. **Email unique**: Firebase Auth garantit qu'un email ne peut avoir qu'un compte
4. **Expiration**: Vérifier endMember avant de permettre la création

### Protection des Données

```typescript
// Règles Firestore recommandées

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Pre-members: Lecture uniquement par l'utilisateur concerné
    match /pre-members/{uid} {
      allow read: if request.auth != null;
      allow write: if false; // Seulement via admin ou Cloud Functions
    }

    // Users: Accès complet pour l'utilisateur propriétaire
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 📊 Dashboard Admin

### Ajout Manuel de Membres

**Interface d'ajout:**
```typescript
interface AddPreMemberForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  postalCode: string;
  ticketType: string;
  memberType: string;
  endMember: Date;
}

async function addPreMember(data: AddPreMemberForm) {
  // 1. Générer un UID unique
  const uid = crypto.randomUUID();

  // 2. Générer le QR code
  const qrCodeDataUrl = await generateQRCode(uid);

  // 3. Upload du QR code vers Storage
  const qrCodeUrl = await uploadQRCode(uid, qrCodeDataUrl);

  // 4. Créer le document pre-member
  await setDoc(doc(db, 'pre-members', uid), {
    ...data,
    uid,
    qrCodeUrl,
    qrCodeData: uid,
    hasAccount: false,
    linkedUserId: null,
    createdAt: new Date(),
  });

  // 5. Envoyer le QR code par email au membre
  await sendQRCodeEmail(data.email, qrCodeUrl, data.firstName);

  return { uid, qrCodeUrl };
}
```

---

## 📧 Email Template

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .qr-code { text-align: center; margin: 40px 0; }
    .qr-code img { width: 300px; height: 300px; border: 2px solid #000; border-radius: 16px; }
    .button {
      display: inline-block;
      background: #000;
      color: #fff;
      padding: 16px 48px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 700;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bienvenue chez Fornap, {{firstName}} !</h1>
      <p>Votre adhésion a été activée avec succès.</p>
    </div>

    <div class="qr-code">
      <img src="{{qrCodeUrl}}" alt="Votre QR Code Fornap" />
      <p><strong>Votre QR Code d'accès</strong></p>
    </div>

    <p>
      Conservez précieusement ce QR code. Il vous permettra de :
    </p>
    <ul>
      <li>Accéder aux événements Fornap</li>
      <li>Créer votre compte sur notre plateforme en ligne</li>
      <li>Bénéficier de vos avantages membres</li>
    </ul>

    <div style="text-align: center;">
      <a href="https://fornap.com/qr-login" class="button">
        Créer mon compte en ligne
      </a>
    </div>

    <p style="margin-top: 40px; color: #666; font-size: 14px;">
      Valable jusqu'au {{expirationDate}}
    </p>
  </div>
</body>
</html>
```

---

## 🚀 TODO Techniques

- [ ] Installer bibliothèques: `npm install qrcode jsqr`
- [ ] Implémenter `generateQRCode()` dans utils
- [ ] Implémenter `readQRCode()` dans utils
- [ ] Créer `preMemberService` dans services/firebase
- [ ] Ajouter `signupFromQR()` dans AuthContext
- [ ] Créer page `/signup/from-qr`
- [ ] Créer interface admin pour ajouter pre-members
- [ ] Setup Firebase Storage pour stocker les QR codes
- [ ] Créer Cloud Function pour générer et envoyer QR codes
- [ ] Setup email templates
- [ ] Tester le flow complet

---

**Version**: 1.0.0
**Dernière mise à jour**: 2025-10-20
