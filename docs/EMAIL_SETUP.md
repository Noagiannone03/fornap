# Configuration Email avec Resend

## 🎯 État actuel

Le système de mailing est configuré avec le **domaine de test de Resend** (`onboarding@resend.dev`) qui permet d'envoyer des emails de test immédiatement.

## 🚀 Passer en production avec votre domaine

Pour envoyer des emails depuis votre propre domaine (`@fornap.com`), suivez ces étapes :

### 1. Ajouter votre domaine dans Resend

1. Connectez-vous à [Resend Dashboard](https://resend.com/domains)
2. Cliquez sur **"Add Domain"**
3. Entrez votre domaine : `fornap.com`
4. Cliquez sur **"Add"**

### 2. Configurer les enregistrements DNS

Resend vous fournira **3 enregistrements DNS** à ajouter chez votre hébergeur DNS (GoDaddy, Cloudflare, OVH, etc.) :

#### Enregistrement SPF
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
TTL: 3600
```

#### Enregistrement DKIM
```
Type: TXT
Name: resend._domainkey
Value: [Clé fournie par Resend]
TTL: 3600
```

#### Enregistrement DMARC (optionnel mais recommandé)
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@fornap.com
TTL: 3600
```

### 3. Vérifier le domaine

1. Après avoir ajouté les enregistrements DNS (attendez 5-30 minutes)
2. Retournez sur [Resend Domains](https://resend.com/domains)
3. Cliquez sur **"Verify"** à côté de votre domaine
4. Le statut devrait passer à **"Verified" ✅**

### 4. Mettre à jour la configuration

Une fois votre domaine vérifié, modifiez `/src/shared/config/email.ts` :

```typescript
DEFAULT_FROM_NAME: 'FORNAP',
DEFAULT_FROM_EMAIL: 'noreply@fornap.com', // Votre domaine vérifié
```

Puis redéployez sur Vercel.

## 📧 Adresses email recommandées

Une fois votre domaine vérifié, vous pouvez utiliser :

- `noreply@fornap.com` - Pour les emails automatiques
- `contact@fornap.com` - Pour les emails nécessitant une réponse
- `support@fornap.com` - Pour le support client
- `newsletter@fornap.com` - Pour les newsletters

## 🧪 Tester avec le domaine de test

Le domaine `onboarding@resend.dev` est parfait pour :
- ✅ Tests de développement
- ✅ Validation du système d'envoi
- ✅ Tests de templates

**Limitation** : Les emails peuvent finir dans les spams car ce n'est pas votre domaine.

## 🔍 Vérifier la configuration DNS

Vous pouvez vérifier vos enregistrements DNS avec :

```bash
# Vérifier SPF
dig TXT fornap.com

# Vérifier DKIM
dig TXT resend._domainkey.fornap.com

# Vérifier DMARC
dig TXT _dmarc.fornap.com
```

Ou utilisez des outils en ligne :
- [MXToolbox](https://mxtoolbox.com/SuperTool.aspx)
- [DNS Checker](https://dnschecker.org/)

## ⚠️ Troubleshooting

### Le domaine ne se vérifie pas

1. **Attendez** : La propagation DNS peut prendre jusqu'à 48h (généralement 5-30 min)
2. **Vérifiez les espaces** : Assurez-vous qu'il n'y a pas d'espaces dans les valeurs DNS
3. **Type d'enregistrement** : Vérifiez que vous avez bien choisi "TXT"
4. **Nom de l'enregistrement** : Respectez exactement ce que Resend indique

### Les emails vont dans les spams

1. Vérifiez que tous les enregistrements DNS sont corrects
2. Ajoutez un enregistrement DMARC
3. Commencez par envoyer de petits volumes
4. Évitez les mots déclencheurs de spam ("gratuit", "urgent", etc.)
5. Utilisez un design HTML propre

### Erreur "Domain not verified"

Si vous voyez cette erreur après avoir vérifié le domaine :
1. Vérifiez que vous avez bien modifié `DEFAULT_FROM_EMAIL` dans le code
2. Redéployez l'application sur Vercel
3. Videz le cache de votre navigateur

## 📚 Ressources

- [Documentation Resend](https://resend.com/docs)
- [Guide de configuration DNS](https://resend.com/docs/dashboard/domains/introduction)
- [Bonnes pratiques d'envoi](https://resend.com/docs/knowledge-base/best-practices)

## 🎉 Une fois configuré

Une fois votre domaine vérifié, votre système d'emailing sera prêt pour la production avec :
- ✅ Envoi d'emails depuis votre domaine
- ✅ Meilleure délivrabilité
- ✅ Tracking des ouvertures et clics
- ✅ Gestion des bounces
- ✅ Webhooks pour les événements
