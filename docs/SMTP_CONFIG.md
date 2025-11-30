# Configuration SMTP pour FORNAP

## 📧 Credentials SMTP

### Informations de connexion

```
Serveur SMTP:  mail.fornap.fr
Port:          587 (TLS/STARTTLS)
Sécurité:      STARTTLS
Email:         no-reply@fornap.fr
Mot de passe:  rU6*suHY_b-ce1Z
```

## 🔧 Configuration dans Vercel

### Option 1 : Variables d'Environnement (Recommandé)

Dans Vercel Dashboard → Settings → Environment Variables :

```bash
SMTP_HOST=mail.fornap.fr
SMTP_PORT=587
SMTP_USER=no-reply@fornap.fr
SMTP_PASSWORD=rU6*suHY_b-ce1Z
```

**Avantages** :
- ✅ Plus sécurisé
- ✅ Facile à changer sans redéployer
- ✅ Différentes valeurs par environnement (dev/prod)

### Option 2 : Valeurs par défaut (Déjà configuré)

Les credentials sont déjà en dur dans le code comme fallback.
Si les variables d'environnement ne sont pas définies, le système utilisera automatiquement ces valeurs.

**Note** : L'option 2 est déjà active, donc le système fonctionne immédiatement sans configuration supplémentaire.

## 🧪 Test de la Configuration

### Test rapide via curl

```bash
curl -X POST https://votre-domaine.vercel.app/api/users/send-membership-card \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "forceResend": true
  }'
```

### Test avec le script Node.js

```bash
node scripts/test-membership-card.mjs YOUR_USER_ID --force
```

### Test depuis l'interface Admin

1. Se connecter à l'admin FORNAP
2. Aller dans "Gestion des Utilisateurs"
3. Sélectionner un utilisateur
4. Menu "..." → "Envoyer la carte d'adhérent"

## 🔍 Vérification des logs SMTP

### Dans Nodemailer

L'API log automatiquement dans la console :
- ✅ `Email envoyé avec succès à user@example.com`
- ❌ `Error sending email: ...`

### Dans Vercel

1. Vercel Dashboard → Votre Projet
2. Deployments → Dernier déploiement
3. Runtime Logs
4. Rechercher "Email" ou "SMTP"

## 🚨 Troubleshooting

### Erreur : "SMTP Authentication failed"

**Causes possibles** :
1. Mot de passe incorrect
2. Compte bloqué
3. Serveur SMTP inaccessible

**Solutions** :
```bash
# Tester la connexion SMTP
telnet mail.fornap.fr 587

# Vérifier les credentials dans Vercel
vercel env ls

# Re-déployer après avoir modifié les variables
vercel --prod
```

### Erreur : "Connection timeout"

**Causes possibles** :
1. Firewall bloque le port 587
2. Mauvais serveur SMTP
3. Problème réseau

**Solutions** :
- Essayer avec le port 465 (SSL) au lieu de 587 (TLS)
- Vérifier que `mail.fornap.fr` est accessible
- Ping le serveur : `ping mail.fornap.fr`

### Les emails arrivent en SPAM

**Solutions** :
1. Configurer SPF record pour le domaine
2. Configurer DKIM
3. Configurer DMARC
4. Vérifier la réputation de l'IP du serveur mail

### Emails non reçus

**Vérifier** :
1. ✅ Logs Vercel (email envoyé sans erreur ?)
2. ✅ Dossier SPAM du destinataire
3. ✅ Adresse email valide dans Firestore
4. ✅ Serveur mail FORNAP opérationnel

## 📊 Monitoring

### Statistiques d'envoi

Pour voir combien d'emails ont été envoyés :

```javascript
// Dans Firestore, requête sur la collection users
db.collection('users')
  .where('emailStatus.membershipCardSent', '==', true)
  .get()
  .then(snapshot => {
    console.log(`${snapshot.size} emails envoyés`);
  });
```

### Taux de succès

Vérifier dans les logs Vercel le ratio :
- Succès : `✅ Email envoyé avec succès`
- Échecs : `❌ Error sending email`

## 🔐 Sécurité

### Bonnes pratiques

1. ✅ **Ne jamais** exposer les credentials dans le code client
2. ✅ Utiliser HTTPS pour tous les appels API
3. ✅ Limiter l'accès à l'API aux admins authentifiés
4. ✅ Surveiller les logs pour détecter les abus
5. ✅ Changer le mot de passe régulièrement

### En cas de compromission

Si les credentials sont compromis :

1. **Changer immédiatement** le mot de passe dans le compte email
2. **Mettre à jour** dans Vercel :
   ```bash
   vercel env rm SMTP_PASSWORD production
   vercel env add SMTP_PASSWORD production
   ```
3. **Redéployer** l'application
4. **Auditer** les logs pour détecter des utilisations suspectes

## 📝 Notes Importantes

1. Le système fonctionne **immédiatement** avec les credentials en dur
2. Pour plus de sécurité, utiliser les variables d'environnement Vercel
3. L'email `no-reply@fornap.fr` ne doit **pas** être utilisé pour recevoir des réponses
4. Configurer un email de contact différent pour le support

## 🆘 Support

En cas de problème :
1. Consulter les logs Vercel
2. Tester avec `scripts/test-membership-card.mjs`
3. Vérifier que le serveur mail est accessible
4. Contacter l'hébergeur du serveur mail si nécessaire

---

**Dernière mise à jour** : Configuration validée et testée avec `no-reply@fornap.fr`

