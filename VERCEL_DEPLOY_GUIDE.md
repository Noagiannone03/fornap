# 🚀 Guide de Déploiement Vercel - FORNAP

## ⚠️ IMPORTANT : Service Account Key Firebase

Avant de configurer les variables sur Vercel, vous devez récupérer votre Service Account Key Firebase.

### Option 1 : Utiliser le fichier existant

Si vous avez déjà un fichier `serviceAccountKey.json` dans votre projet :

```bash
# Affichez le contenu
cat serviceAccountKey.json

# Ou ouvrez-le dans un éditeur et copiez tout le contenu
```

### Option 2 : Générer un nouveau (recommandé)

1. Allez sur [Firebase Console](https://console.firebase.google.com/project/nap-7aa80/settings/serviceaccounts/adminsdk)
2. Cliquez sur **"Generate new private key"**
3. Téléchargez le fichier JSON
4. Ouvrez-le et copiez **TOUT** le contenu

Le contenu ressemble à ceci :
```json
{
  "type": "service_account",
  "project_id": "nap-7aa80",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@nap-7aa80.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

---

## 📋 Variables d'Environnement pour Vercel

Allez dans **Vercel → Settings → Environment Variables** et ajoutez **TOUTES** ces variables :

### 1️⃣ Resend (Service d'envoi d'emails)

```
RESEND_API_KEY
re_ZDfHCX2Q_DiDGQWddXqT6trhPQgXUYXyx
```

### 2️⃣ QStash (Queue de jobs asynchrones)

```
QSTASH_TOKEN
eyJVc2VySUQiOiI1OTE5NTE1Mi0xNWFhLTQyODItYTY0MC0yYWUzN2NjZDEzMDQiLCJQYXNzd29yZCI6ImRjNTZkNTBmYzUyYTRiOWJiYzM1YmNmMGNiZDYwMDhjIn0=
```

```
QSTASH_CURRENT_SIGNING_KEY
sig_4y45KBZk2Vm8JnSimcbj3VyFpPU1
```

```
QSTASH_NEXT_SIGNING_KEY
sig_5RtdjD5tcF4QdfQLoQ6pSQ1d6dW3
```

### 3️⃣ Firebase (Frontend - Variables VITE)

```
VITE_FIREBASE_PROJECT_ID
nap-7aa80
```

```
VITE_FIREBASE_API_KEY
AIzaSyALz161yfiLaOeHU82DQNJV4PkzAXO1wzM
```

```
VITE_FIREBASE_AUTH_DOMAIN
nap-7aa80.firebaseapp.com
```

```
VITE_FIREBASE_STORAGE_BUCKET
nap-7aa80.firebasestorage.app
```

```
VITE_FIREBASE_MESSAGING_SENDER_ID
434731738248
```

```
VITE_FIREBASE_APP_ID
1:434731738248:web:481644f3a6e809c06d2b3d
```

### 4️⃣ Firebase Admin (Backend API)

```
FIREBASE_SERVICE_ACCOUNT_KEY
```

**Valeur** : Collez ici **TOUT** le contenu du fichier JSON Service Account (voir section ci-dessus)

⚠️ **IMPORTANT** : Collez le JSON complet sur **UNE SEULE LIGNE** ou tel quel. Vercel accepte les deux formats.

### 5️⃣ Webhook (URL de production)

```
WEBHOOK_BASE_URL
https://fornap.vercel.app
```

⚠️ **Remplacez par votre vraie URL de production Vercel** (ex: `https://votre-app.vercel.app`)

---

## ❌ Variables à SUPPRIMER (si présentes)

Ces variables ne sont **plus nécessaires** ou **ne fonctionnent pas sur Vercel** :

- ❌ `VITE_APP_URL` (auto-détecté maintenant)
- ❌ `QSTASH_URL` (pas utilisée dans le code)
- ❌ `GOOGLE_APPLICATION_CREDENTIALS` (ne fonctionne pas sur Vercel, utilisez `FIREBASE_SERVICE_ACCOUNT_KEY` à la place)

---

## 📝 Checklist Complète

### Variables à configurer (15 au total) :

- [ ] `RESEND_API_KEY`
- [ ] `QSTASH_TOKEN`
- [ ] `QSTASH_CURRENT_SIGNING_KEY`
- [ ] `QSTASH_NEXT_SIGNING_KEY`
- [ ] `VITE_FIREBASE_PROJECT_ID`
- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_APP_ID`
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` ⚠️ (JSON complet)
- [ ] `WEBHOOK_BASE_URL` ⚠️ (votre URL de production)

### Variables à supprimer :

- [ ] ❌ `VITE_APP_URL`
- [ ] ❌ `QSTASH_URL`
- [ ] ❌ `GOOGLE_APPLICATION_CREDENTIALS`

---

## 🚀 Étapes de Déploiement

### 1. Récupérer le Service Account Key

```bash
# Dans votre projet local, si le fichier existe :
cat serviceAccountKey.json

# Sinon, générez-en un nouveau sur Firebase Console (voir ci-dessus)
```

### 2. Configurer les variables sur Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Sélectionnez votre projet FORNAP
3. **Settings** → **Environment Variables**
4. Ajoutez **toutes** les variables ci-dessus
5. **Important** : Sélectionnez les environnements :
   - ✅ Production
   - ✅ Preview
   - ✅ Development

### 3. Supprimer les anciennes variables

Supprimez : `VITE_APP_URL`, `QSTASH_URL`, `GOOGLE_APPLICATION_CREDENTIALS`

### 4. Redéployer

⚠️ **CRUCIAL** : Après avoir modifié les variables, vous **DEVEZ** redéployer :

1. **Settings** → **Deployments**
2. Trouvez le dernier déploiement
3. Cliquez sur **⋯** (3 points) → **Redeploy**
4. Confirmez le redéploiement

### 5. Tester

Une fois déployé :

1. Allez sur `https://fornap.vercel.app/admin/campaigns/diagnostics`
2. Cliquez sur **"Lancer tous les diagnostics"**
3. **Résultat attendu** : Tout doit être VERT ✅
4. Testez l'envoi d'un email de test

---

## 🔍 Vérification des Diagnostics

### Statut attendu après configuration correcte :

```
✅ Variables d'environnement
   ✅ RESEND_API_KEY - OK
   ✅ QSTASH_TOKEN - OK
   ✅ QSTASH_CURRENT_SIGNING_KEY - OK
   ✅ QSTASH_NEXT_SIGNING_KEY - OK
   ✅ WEBHOOK_BASE_URL - OK

✅ Connexion aux services
   ✅ Resend - Connecté
   ✅ QStash - Connecté

✅ Email de test
   ✅ Email envoyé avec succès
```

---

## 🐛 Troubleshooting

### Erreur 500 sur les diagnostics

**Cause** : Variables manquantes ou mal configurées

**Solution** :
1. Vérifiez que **toutes** les variables sont configurées
2. Vérifiez que `FIREBASE_SERVICE_ACCOUNT_KEY` contient le JSON complet
3. Redéployez après chaque modification

### "RESEND_API_KEY non configurée"

**Cause** : Variable non ajoutée ou redéploiement manquant

**Solution** :
1. Vérifiez que la variable existe dans Vercel
2. Redéployez l'application

### "FIREBASE_SERVICE_ACCOUNT_KEY non configurée"

**Cause** : Variable manquante ou JSON invalide

**Solution** :
1. Générez un nouveau Service Account Key sur Firebase
2. Copiez **TOUT** le contenu JSON
3. Collez-le dans Vercel (une seule ligne ou multiligne, les deux fonctionnent)
4. Redéployez

### Email de test non reçu

**Vérifications** :
1. ✅ Vérifiez vos **spams**
2. ✅ Dashboard Resend : [resend.com/emails](https://resend.com/emails)
3. ✅ Vérifiez que votre domaine est vérifié dans Resend
4. ✅ Logs Vercel : Functions → `/api/diagnostics/test-email`

---

## 📞 Support

### Liens utiles :

- [Firebase Console](https://console.firebase.google.com/project/nap-7aa80)
- [Resend Dashboard](https://resend.com/emails)
- [Upstash QStash Console](https://console.upstash.com/qstash)
- [Vercel Deployments](https://vercel.com)

### Commandes utiles :

```bash
# Build local pour tester
npm run build

# Tester en local
npm run dev

# Voir le contenu du Service Account (si fichier local existe)
cat serviceAccountKey.json
```

---

## ✅ Validation Finale

Avant de considérer le déploiement comme terminé :

- [ ] Toutes les variables sont configurées sur Vercel
- [ ] Application redéployée après configuration
- [ ] Page de diagnostics accessible
- [ ] Tous les diagnostics sont verts ✅
- [ ] Email de test envoyé et reçu
- [ ] Une campagne email test envoyée avec succès

**Si tous ces points sont validés, votre système d'envoi d'emails est 100% fonctionnel ! 🎉**

