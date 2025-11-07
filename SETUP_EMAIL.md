# Guide de Configuration Rapide - Système d'Envoi d'Emails

Ce guide vous aide à configurer rapidement le système d'envoi d'emails pour les campagnes FORNAP.

## Prérequis

- Compte Vercel
- Compte Resend (gratuit)
- Compte Upstash (gratuit)
- Projet Firebase

## Étapes de Configuration

### 1. Créer un compte Resend

1. Aller sur [resend.com](https://resend.com)
2. Créer un compte gratuit
3. Dans le dashboard, aller dans **API Keys**
4. Créer une nouvelle clé API
5. **Copier la clé** (elle commence par `re_`)

### 2. Créer un compte Upstash QStash

1. Aller sur [console.upstash.com](https://console.upstash.com)
2. Créer un compte gratuit
3. Aller dans **QStash**
4. Copier les informations suivantes :
   - `QSTASH_TOKEN`
   - `QSTASH_CURRENT_SIGNING_KEY`
   - `QSTASH_NEXT_SIGNING_KEY`

### 3. Configurer les Variables d'Environnement

#### En Local (fichier `.env`)

Copier `.env.example` vers `.env` et remplir :

```bash
# Copier le fichier
cp .env.example .env

# Éditer le fichier
nano .env
```

Remplir les valeurs :

```bash
# Resend
RESEND_API_KEY=re_votre_cle_ici

# QStash
QSTASH_TOKEN=votre_token_ici
QSTASH_CURRENT_SIGNING_KEY=votre_cle_actuelle_ici
QSTASH_NEXT_SIGNING_KEY=votre_cle_suivante_ici

# Firebase (déjà configuré normalement)
VITE_FIREBASE_PROJECT_ID=votre_project_id

# URL de l'app (en prod)
VITE_APP_URL=https://votre-domaine.com
```

#### Sur Vercel (Production)

1. Aller dans votre projet Vercel
2. **Settings** → **Environment Variables**
3. Ajouter les mêmes variables que ci-dessus
4. **Important** : Ajouter pour tous les environnements (Production, Preview, Development)

### 4. Firebase Admin (pour les API Routes)

#### Option A : Service Account (Recommandé pour Production)

1. Aller dans [Firebase Console](https://console.firebase.google.com)
2. Sélectionner votre projet
3. **Project Settings** → **Service Accounts**
4. Cliquer sur **Generate New Private Key**
5. Télécharger le fichier JSON

Sur Vercel :
- Copier le contenu du fichier JSON
- Créer une variable `FIREBASE_SERVICE_ACCOUNT_KEY`
- Coller le contenu JSON complet

#### Option B : Credentials par défaut (Développement)

Localement, utiliser la variable :
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
```

### 5. Configurer le Domaine Email (Optionnel mais Recommandé)

Pour une meilleure délivrabilité :

1. Dans Resend, aller dans **Domains**
2. Ajouter votre domaine (ex: `fornap.com`)
3. Configurer les enregistrements DNS (SPF, DKIM, DMARC)
4. Attendre la vérification
5. Mettre à jour `DEFAULT_FROM_EMAIL` dans `.env`

### 6. Configurer les Webhooks Resend (Optionnel)

Pour un tracking avancé :

1. Dans Resend, aller dans **Webhooks**
2. Créer un nouveau webhook
3. URL : `https://votre-domaine.vercel.app/api/campaigns/webhooks/resend`
4. Sélectionner les événements :
   - `email.delivered`
   - `email.bounced`
   - `email.complained`
   - `email.opened` (si activé)
   - `email.clicked` (si activé)

### 7. Déployer sur Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Ou via Git (recommandé)
git push origin main
```

### 8. Tester le Système

1. Créer une campagne de test avec 1-2 destinataires
2. Cliquer sur **"Envoyer maintenant"**
3. Vérifier les logs dans Vercel Dashboard
4. Vérifier la réception des emails

## Vérification de la Configuration

### Test de Connexion

Créer un fichier de test `test-email-config.js` :

```javascript
import { testResendConnection } from './src/shared/services/emailService.js';
import { testQStashConnection } from './src/shared/services/queueService.js';

async function testConfig() {
  console.log('Test de Resend...');
  const resendTest = await testResendConnection();
  console.log(resendTest);

  console.log('\nTest de QStash...');
  const qstashTest = await testQStashConnection();
  console.log(qstashTest);
}

testConfig();
```

Exécuter :
```bash
node test-email-config.js
```

## Limites et Quotas

### Plan Gratuit Resend
- **3000 emails/mois**
- **~10 emails/seconde**
- **1 domaine vérifié**

### Plan Gratuit QStash
- **500 messages/jour** (= 25 000 emails/jour en batches de 50)
- **3 retries par défaut**

### Plan Hobby Vercel
- **100GB-Hrs/mois** de fonctions
- **10 secondes** de timeout par fonction
- **100GB/mois** de bandwidth

## Troubleshooting

### Erreur : "RESEND_API_KEY manquante"
→ Vérifier que la variable est bien définie dans Vercel

### Erreur : "Signature QStash invalide"
→ Vérifier les clés de signature dans Upstash

### Les emails ne partent pas
→ Vérifier les logs Vercel pour voir les erreurs détaillées

### Timeout sur Vercel
→ Réduire `BATCH_SIZE` dans `/src/shared/config/email.ts`

## Support

- Documentation complète : [EMAIL_SYSTEM.md](./EMAIL_SYSTEM.md)
- Issues : Créer une issue GitHub
- Logs : Vercel Dashboard → Fonctions → Logs

## Commandes Utiles

```bash
# Vérifier les variables d'environnement locales
cat .env | grep -v "^#"

# Voir les logs Vercel en temps réel
vercel logs --follow

# Redéployer après changement de config
vercel --prod
```

## Checklist Finale

- [ ] Compte Resend créé + API Key
- [ ] Compte Upstash créé + QStash tokens
- [ ] Variables d'environnement configurées (local + Vercel)
- [ ] Firebase Admin configuré
- [ ] Projet déployé sur Vercel
- [ ] Test d'envoi réussi
- [ ] (Optionnel) Domaine vérifié chez Resend
- [ ] (Optionnel) Webhooks configurés

---

Une fois toutes ces étapes complétées, votre système d'envoi d'emails est prêt ! 🚀
