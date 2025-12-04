# 📧 Nouveau Système de Mailing Unifié - FORNAP

## 🎯 Vue d'ensemble

Le système de mailing a été complètement refondé pour être **simple, direct et efficace**.

### Principe de base
- ✅ **Un seul expéditeur** : `no-reply@fornap.fr` pour tous les emails
- ✅ **Envoi direct** : Via Nodemailer (SMTP FORNAP) sans queue ni batch
- ✅ **Tracking automatique** : Pixels d'ouverture et liens cliquables transformés automatiquement
- ✅ **Temps réel** : Suivi de la progression en direct depuis l'interface admin

### Ce qui a changé
- ❌ **Supprimé** : Resend, QStash, système de batches, queues
- ✅ **Ajouté** : API unifiée `/api/campaigns/send-email` avec tracking intégré

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Interface Admin                           │
│          (SendCampaignModal.tsx)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ 1. Lance l'envoi
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            campaignService.sendCampaignEmails()             │
│  - Récupère les utilisateurs ciblés                         │
│  - Boucle sur chaque utilisateur                            │
│  - Appelle l'API pour chacun                                │
│  - Met à jour la progression en temps réel                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ 2. Pour chaque utilisateur
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           API: /api/campaigns/send-email                    │
│                                                              │
│  1. Récupère la campagne et l'utilisateur                   │
│  2. Crée le recipient dans Firestore                        │
│  3. Injecte le pixel de tracking                            │
│  4. Transforme les liens pour le suivi des clics            │
│  5. Envoie via Nodemailer (SMTP)                            │
│  6. Met à jour le statut et les stats                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure des fichiers

### APIs Serverless (`/api/campaigns/`)
```
api/campaigns/
├── send-email.ts          # 🔥 API PRINCIPALE - Envoi + tracking
├── track/
│   ├── open.ts           # Tracking des ouvertures (pixel)
│   └── click.ts          # Tracking des clics (redirection)
```

### Services Frontend (`/src/shared/services/`)
```
src/shared/services/
├── campaignService.ts     # 🔥 Service principal des campagnes
├── emailService.ts        # ⚠️ Obsolète (conservé pour compatibilité)
└── queueService.ts        # ⚠️ Obsolète (conservé pour compatibilité)
```

### Configuration (`/src/shared/config/`)
```
src/shared/config/
└── email.ts              # Configuration SMTP simplifiée
```

---

## 🚀 Utilisation

### Envoyer une campagne

```typescript
import { sendCampaignEmails } from '@/shared/services/campaignService';

// Lancer l'envoi d'une campagne
const result = await sendCampaignEmails(
  campaignId,
  (progress) => {
    console.log(`${progress.current}/${progress.total}`);
    console.log(`Succès: ${progress.success}, Erreurs: ${progress.errors}`);
  }
);

console.log(`Terminé: ${result.success} succès, ${result.errors} erreurs`);
```

### Créer une campagne

```typescript
import { createCampaign, sendCampaignEmails } from '@/shared/services/campaignService';

// 1. Créer la campagne
const campaign = await createCampaign(adminId, {
  name: 'Newsletter Janvier 2025',
  content: {
    subject: 'Bienvenue !',
    html: '<html>...</html>',
  },
  targeting: {
    mode: 'all', // ou 'filtered' ou 'manual'
  },
  sendImmediately: true,
});

// 2. Envoyer
await sendCampaignEmails(campaign.id);
```

---

## 🎨 Tracking automatique

### Pixel d'ouverture

L'API injecte automatiquement un pixel invisible dans chaque email :

```html
<img src="https://fornap.fr/api/campaigns/track/open?campaign=XXX&recipient=YYY"
     width="1" height="1" alt="" style="display:block;" />
```

Quand l'email est ouvert, le pixel est chargé → ouverture trackée.

### Liens cliquables

Tous les liens sont automatiquement transformés :

**Avant :**
```html
<a href="https://fornap.fr/events">Voir les événements</a>
```

**Après transformation :**
```html
<a href="https://fornap.fr/api/campaigns/track/click?campaign=XXX&recipient=YYY&url=https%3A%2F%2Ffornap.fr%2Fevents">
  Voir les événements
</a>
```

L'API de tracking redirige vers l'URL originale après avoir enregistré le clic.

---

## 📊 Statistiques

Les statistiques sont calculées en temps réel et stockées dans Firestore :

```typescript
{
  stats: {
    totalRecipients: 150,
    sent: 150,
    pending: 0,
    failed: 0,
    opened: 87,          // Emails ouverts
    clicked: 34,         // Emails cliqués
    bounced: 0,
    openRate: 58.0,      // % d'ouverture
    clickRate: 22.67,    // % de clics
    bounceRate: 0,
    failureRate: 0
  }
}
```

---

## ⚙️ Configuration SMTP

Les variables d'environnement nécessaires :

```env
# Configuration SMTP FORNAP
SMTP_HOST=mail.fornap.fr
SMTP_PORT=587
SMTP_USER=no-reply@fornap.fr
SMTP_PASSWORD=votre_mot_de_passe_smtp

# URL de base pour les liens de tracking
VITE_API_URL=https://fornap.fr
```

---

## 🔥 Points clés

### Expéditeur unique
**Tous les emails partent de `no-reply@fornap.fr`**

- Pas de choix d'expéditeur dans l'interface
- Email de réponse : `contact@fornap.fr`
- Nom d'affichage : `FOR+NAP Social Club`

### Envoi séquentiel
- **Délai entre envois** : 500ms
- Évite de surcharger le serveur SMTP
- Permet un suivi précis de la progression

### Recipients créés à la volée
- Plus besoin de pré-créer les recipients
- Créés automatiquement lors de l'envoi par l'API
- Stockés dans la sous-collection `campaigns/{id}/recipients`

### Gestion des erreurs
- Chaque email est marqué `sent` ou `failed`
- Les erreurs sont enregistrées dans Firestore
- Les stats sont mises à jour après chaque envoi

---

## 🧹 Code supprimé

Le nettoyage a inclus :

- ❌ Dépendance `resend` (npm)
- ❌ Dépendance `@upstash/qstash` (npm)
- ❌ API `/api/campaigns/send.ts` (préparation)
- ❌ API `/api/campaigns/send-campaign-email.ts` (obsolète)
- ❌ Système de batches et de queue
- ❌ Webhooks Resend
- ❌ Configuration QStash et Resend

---

## 📝 Code legacy conservé

Ces fichiers sont conservés pour compatibilité mais **ne sont plus utilisés** :

- `src/shared/services/emailService.ts` - Lance une erreur si appelé
- `src/shared/services/queueService.ts` - Lance une erreur si appelé
- `campaignService.prepareCampaignForSending()` - Fonction vide
- `campaignService.createCampaignRecipients()` - Fonction vide

---

## ✅ Avantages du nouveau système

1. **Simplicité** : Un seul point d'entrée pour tout
2. **Fiabilité** : Pas de dépendance externe (Resend, QStash)
3. **Contrôle** : Serveur SMTP FORNAP sous contrôle
4. **Tracking** : Intégré automatiquement
5. **Temps réel** : Suivi de progression en direct
6. **Maintenance** : Code simple et compréhensible
7. **Coûts** : Zéro coût externe (Resend gratuit limité)

---

## 🐛 Débogage

### Vérifier l'envoi d'un email

```bash
# Logs de l'API
vercel logs --follow

# Dans les logs, chercher :
"📝 Destinataire créé: XXX"
"✅ Email envoyé à user@example.com"
"✅ Stats de campagne mises à jour"
```

### Vérifier le tracking

```bash
# Ouvertures
"Tracking ouverture - Campaign: XXX, Recipient: YYY"
"Ouverture enregistrée (count: 1)"

# Clics
"Tracking clic - Campaign: XXX, Recipient: YYY"
"Clic enregistré (count: 1)"
```

---

## 📚 Ressources

- Configuration SMTP : `api/users/send-membership-card.ts` (exemple fonctionnel)
- Tracking pixels : `api/campaigns/track/open.ts`
- Tracking clics : `api/campaigns/track/click.ts`
- Service campagnes : `src/shared/services/campaignService.ts`

---

**Créé le** : 2025-01-XX
**Version** : 1.0
**Système** : Unifié et simplifié ✨
