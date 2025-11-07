# 🔍 Guide de Diagnostics - Système d'Envoi d'Emails

## 📋 Vue d'ensemble

Le système de diagnostics vous permet de vérifier et résoudre les problèmes d'envoi d'emails dans FORNAP. Ce guide vous explique comment utiliser les outils de diagnostic et résoudre les problèmes courants.

## 🚀 Accéder aux Diagnostics

### Depuis l'Admin
1. Connectez-vous à l'admin FORNAP
2. Allez dans **Campagnes Email** dans le menu
3. Cliquez sur **Diagnostics Email**

Ou directement : `https://votre-domaine.com/admin/campaigns/diagnostics`

## ✅ Checklist de Configuration

### Variables d'environnement requises sur Vercel

Toutes ces variables doivent être configurées dans **Vercel → Settings → Environment Variables** :

#### 1. Resend (Service d'envoi d'emails)
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```
- Obtenez votre clé API sur [resend.com](https://resend.com/api-keys)
- **Important** : Vérifiez votre domaine dans Resend avant d'envoyer des emails

#### 2. QStash (Queue de jobs)
```
QSTASH_TOKEN=xxxxxxxxxxxxxxxxxxxxx
QSTASH_CURRENT_SIGNING_KEY=sig_xxxxxxxxxxxxxxxxxxxxx
QSTASH_NEXT_SIGNING_KEY=sig_xxxxxxxxxxxxxxxxxxxxx
```
- Obtenez ces clés sur [upstash.com](https://console.upstash.com/qstash)
- QStash gère l'envoi asynchrone pour éviter les timeouts Vercel

#### 3. Firebase (Base de données)
```
VITE_FIREBASE_PROJECT_ID=votre-project-id
```
- Trouvez votre Project ID dans Firebase Console

#### 4. Webhook URL (optionnel)
```
WEBHOOK_BASE_URL=https://votre-domaine.vercel.app
```
- Utilisé par QStash pour appeler vos endpoints
- Par défaut, utilise `VERCEL_URL` automatiquement

## 🛠️ Utiliser les Diagnostics

### 1. Vérifier la Configuration

**Action** : Cliquez sur "Lancer tous les diagnostics"

**Ce qui est vérifié** :
- ✅ Présence de toutes les variables d'environnement
- ✅ Connexion à Resend
- ✅ Connexion à QStash
- ✅ Accessibilité des endpoints API

**Résultat attendu** : Tous les indicateurs doivent être verts ✅

### 2. Envoyer un Email de Test

**Action** :
1. Entrez votre adresse email
2. Cliquez sur "Envoyer l'email de test"
3. Vérifiez votre boîte mail (et spams !)

**Si l'email arrive** : ✅ Votre configuration fonctionne !

**Si l'email n'arrive pas** : Voir section "Résolution des problèmes"

## 🔧 Résolution des Problèmes

### ❌ Variable d'environnement manquante

**Symptôme** : Badge rouge "Erreur" sur une variable

**Solution** :
1. Allez dans Vercel → Settings → Environment Variables
2. Ajoutez la variable manquante
3. **Important** : Redéployez votre application
4. Relancez les diagnostics

### ❌ Erreur de connexion Resend

**Symptômes possibles** :
- "API Key invalide"
- "Domain not verified"
- "403 Forbidden"

**Solutions** :

#### A. API Key invalide
1. Vérifiez que `RESEND_API_KEY` commence par `re_`
2. Créez une nouvelle clé API sur [resend.com/api-keys](https://resend.com/api-keys)
3. Mettez à jour la variable sur Vercel
4. Redéployez

#### B. Domaine non vérifié
1. Allez sur [resend.com/domains](https://resend.com/domains)
2. Ajoutez votre domaine d'envoi (ex: fornap.com)
3. Configurez les DNS records (SPF, DKIM)
4. Attendez la vérification (peut prendre quelques heures)
5. Utilisez un email `@votre-domaine-verifie.com` dans `DEFAULT_FROM_EMAIL`

#### C. Quota dépassé
- Plan gratuit Resend : 100 emails/jour
- Plan payant : Vérifiez votre quota sur le dashboard
- Solution temporaire : Attendez 24h ou passez au plan payant

### ❌ Erreur de connexion QStash

**Symptômes possibles** :
- "Token invalide"
- "Signing key manquante"

**Solutions** :

#### A. Token invalide
1. Allez sur [console.upstash.com/qstash](https://console.upstash.com/qstash)
2. Copiez le token
3. Mettez à jour `QSTASH_TOKEN` sur Vercel
4. Redéployez

#### B. Signing keys manquantes
1. Sur Upstash QStash, allez dans **Signing Keys**
2. Copiez **Current Signing Key** → `QSTASH_CURRENT_SIGNING_KEY`
3. Copiez **Next Signing Key** → `QSTASH_NEXT_SIGNING_KEY`
4. Redéployez

### ❌ Email de test envoyé mais non reçu

**Vérifications** :

1. **Spams** : Vérifiez vos spams/courrier indésirable
2. **Dashboard Resend** : 
   - Allez sur [resend.com/emails](https://resend.com/emails)
   - Cherchez votre email de test
   - Vérifiez le statut (delivered, bounced, etc.)
3. **Logs Vercel** :
   - Allez sur Vercel → Deployments → Functions
   - Regardez les logs de `/api/diagnostics/test-email`
4. **Domaine d'envoi** :
   - Assurez-vous d'utiliser un domaine vérifié dans Resend
   - Format : `contact@votre-domaine-verifie.com`

### ❌ Campagne envoyée mais aucun email reçu

**Étapes de debug** :

#### 1. Vérifier le statut de la campagne
- La campagne doit passer de `draft` → `sending` → `sent`
- Si bloquée en `sending`, vérifiez les logs

#### 2. Vérifier les destinataires
- Dans la page détail de la campagne
- Vérifiez les statuts : `sent`, `failed`, `pending`
- Si beaucoup de `failed`, vérifiez les messages d'erreur

#### 3. Vérifier les logs Vercel
```
/api/campaigns/send         → Déclenchement de l'envoi
/api/campaigns/process-batch → Traitement des batches
```

#### 4. Vérifier QStash
- Allez sur [console.upstash.com/qstash](https://console.upstash.com/qstash)
- Onglet **Messages** : Vérifiez que les messages sont bien traités
- Si erreurs : Vérifiez que QStash peut accéder à votre URL Vercel

#### 5. Vérifier Resend Dashboard
- Allez sur [resend.com/emails](https://resend.com/emails)
- Filtrez par date de la campagne
- Vérifiez les statuts de livraison

## 📊 Comprendre le Flux d'Envoi

```
1. Admin crée une campagne
   ↓
2. Admin clique "Envoyer"
   ↓
3. API /campaigns/send
   - Crée des batches de 50 emails
   - Publie les batches dans QStash
   - Change le statut à "sending"
   ↓
4. QStash traite les batches (un par un avec délai)
   ↓
5. API /campaigns/process-batch
   - Récupère les destinataires
   - Envoie via Resend
   - Met à jour les statuts
   ↓
6. Campagne terminée (statut "sent")
```

## 🎯 Bonnes Pratiques

### 1. Avant d'envoyer une campagne

- ✅ Lancez les diagnostics
- ✅ Envoyez un email de test
- ✅ Vérifiez que votre domaine est vérifié dans Resend
- ✅ Testez avec une petite liste d'abord

### 2. Configuration optimale

- 🔑 Utilisez un domaine vérifié pour `DEFAULT_FROM_EMAIL`
- 🔑 Configurez SPF et DKIM pour votre domaine
- 🔑 Utilisez un nom d'expéditeur reconnaissable
- 🔑 Ajoutez un `replyTo` valide

### 3. Monitoring

- 📊 Vérifiez régulièrement le dashboard Resend
- 📊 Consultez les logs Vercel en cas de problème
- 📊 Surveillez vos quotas d'envoi

## 🆘 Support

### En cas de problème persistant

1. **Logs Vercel** :
   - Allez dans Vercel → Functions
   - Filtrez par `/api/campaigns` et `/api/diagnostics`
   - Copiez les erreurs

2. **Dashboard Resend** :
   - Vérifiez les statuts d'envoi
   - Notez les codes d'erreur

3. **Console QStash** :
   - Vérifiez l'état des messages
   - Regardez les tentatives et erreurs

### Ressources utiles

- [Documentation Resend](https://resend.com/docs)
- [Documentation QStash](https://upstash.com/docs/qstash)
- [Vérifier le statut Vercel](https://www.vercel-status.com/)

## ✨ Checklist Post-Déploiement

Après chaque déploiement sur Vercel :

- [ ] Toutes les variables d'environnement sont configurées
- [ ] Redéploiement effectué après ajout de variables
- [ ] Diagnostics lancés et tous verts ✅
- [ ] Email de test envoyé et reçu
- [ ] Domaine vérifié dans Resend
- [ ] SPF et DKIM configurés
- [ ] Quota d'envoi suffisant

---

**Note** : Les modifications de variables d'environnement nécessitent TOUJOURS un redéploiement pour être prises en compte !

