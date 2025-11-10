# Configuration Firebase Admin sur Vercel

## ⚠️ Problème Actuel

L'erreur `admin.initializeApp is not a function` ou les erreurs de credentials indiquent que **Firebase Admin n'a pas les permissions** pour accéder à Firestore depuis les routes API Vercel.

## 🔧 Solution : Ajouter un Service Account Firebase

### Étape 1 : Créer un Service Account

1. **Allez sur** : [Firebase Console](https://console.firebase.google.com/)
2. **Sélectionnez** votre projet FORNAP
3. **Cliquez** sur l'icône ⚙️ (Settings) → **Project settings**
4. **Onglet** "Service accounts"
5. **Cliquez** sur "Generate new private key"
6. **Téléchargez** le fichier JSON

Vous obtiendrez un fichier `fornap-xxxxx-firebase-adminsdk-xxxxx.json` qui contient :
```json
{
  "type": "service_account",
  "project_id": "fornap-xxxxx",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@fornap-xxxxx.iam.gserviceaccount.com",
  ...
}
```

### Étape 2 : Ajouter le Service Account dans Vercel

#### Option A : Via un fichier base64 (Recommandé)

1. **Convertir le JSON en base64** :
   ```bash
   # Sur Mac/Linux
   cat fornap-xxxxx-firebase-adminsdk-xxxxx.json | base64

   # Sur Windows PowerShell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("fornap-xxxxx-firebase-adminsdk-xxxxx.json"))
   ```

2. **Dans Vercel** :
   - Settings → Environment Variables
   - Add → Name: `FIREBASE_SERVICE_ACCOUNT_BASE64`
   - Value: Collez le résultat du base64 (très long)
   - Environments: Production, Preview, Development

#### Option B : Via variables individuelles

Extraire les champs du JSON et les ajouter dans Vercel :

```
FIREBASE_PROJECT_ID=fornap-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@fornap-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

⚠️ **Important** : Pour `FIREBASE_PRIVATE_KEY`, gardez les `\n` dans la clé.

### Étape 3 : Mettre à jour le code

Modifier `/api/_lib/firebase-admin.ts` pour utiliser le Service Account :

```typescript
import admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (app) {
    return app;
  }

  try {
    app = admin.app();
    return app;
  } catch (error) {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

    if (!projectId) {
      throw new Error('VITE_FIREBASE_PROJECT_ID non configurée');
    }

    // Option 1: Base64 Service Account
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString()
      );

      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    }
    // Option 2: Variables individuelles
    else if (process.env.FIREBASE_PRIVATE_KEY) {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId,
      });
    }
    // Option 3: Credentials par défaut (local)
    else {
      app = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
    }

    console.log('Firebase Admin initialisé avec succès');
    return app;
  }
}

export function getFirestore(): admin.firestore.Firestore {
  const app = getFirebaseAdmin();
  return app.firestore();
}

export function getAuth(): admin.auth.Auth {
  const app = getFirebaseAdmin();
  return app.auth();
}
```

### Étape 4 : Redéployer

Après avoir ajouté les variables d'environnement dans Vercel, redéployez l'application.

---

## 🚀 Alternative Rapide : Mode Test Sans Firebase Admin

Si vous voulez tester rapidement sans configurer Firebase Admin, je peux créer une version simplifiée qui utilise le client Firebase depuis le frontend. Cela permettra de tester l'envoi d'emails sans avoir besoin de Firebase Admin.

---

## 🔒 Sécurité

⚠️ **NE JAMAIS** commiter le fichier JSON du Service Account dans Git !

Ajoutez dans `.gitignore` :
```
*firebase-adminsdk*.json
```

---

## 📝 Checklist

- [ ] Télécharger le Service Account JSON depuis Firebase Console
- [ ] Convertir en base64 OU extraire les variables individuelles
- [ ] Ajouter `FIREBASE_SERVICE_ACCOUNT_BASE64` dans Vercel
- [ ] Mettre à jour `/api/_lib/firebase-admin.ts`
- [ ] Redéployer sur Vercel
- [ ] Tester `/api/diagnostics/campaign-status?campaignId=XXX`

---

## ✅ Comment Vérifier que ça Marche

Une fois configuré, testez :
```
https://fornap.vercel.app/api/diagnostics/campaign-status?campaignId=Nd9D6Ifid3hmRgGVT19v
```

Si ça marche, vous verrez :
```json
{
  "success": true,
  "campaign": {...},
  "recipients": {...}
}
```

Au lieu de :
```json
{
  "success": false,
  "error": "admin.initializeApp is not a function"
}
```
