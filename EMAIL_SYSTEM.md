# Système d'Envoi d'Emails pour Campagnes

Ce document détaille le système d'envoi d'emails massifs pour les campagnes FORNAP, optimisé pour Vercel.

## Architecture Globale

```
┌─────────────┐    1. Trigger Send    ┌──────────────────┐
│  Frontend   ├──────────────────────>│ /api/send        │
│  (Admin)    │<──────────────────────┤ (Vercel)         │
└─────────────┘    2. Job Created     └────────┬─────────┘
                                               │
                                               │ 3. Create batches
                                               │    (50 emails/batch)
                                               │
                                               ▼
                                      ┌──────────────────┐
                                      │  Upstash QStash  │
                                      │  (Queue)         │
                                      └────────┬─────────┘
                                               │
                                               │ 4. Process batch
                                               │    (async, retry)
                                               ▼
                                      ┌──────────────────┐
                                      │ /api/process     │
                                      │ (Vercel)         │
                                      └────────┬─────────┘
                                               │
                                               │ 5. Send emails
                                               ▼
                                      ┌──────────────────┐
                                      │  Resend API      │
                                      │  (Batch API)     │
                                      └────────┬─────────┘
                                               │
                                               │ 6. Webhooks
                                               ▼
                                      ┌──────────────────┐
                                      │ /api/webhooks    │
                                      │ (Update status)  │
                                      └──────────────────┘
```

## Technologies Utilisées

### 1. Resend (Service d'Email)
- **Pourquoi ?** Meilleure délivrabilité que SMTP direct, API moderne
- **Plan gratuit :** 3000 emails/mois
- **Fonctionnalités :**
  - Batch API pour envois en masse
  - Webhooks pour tracking (ouverture, clic, bounce)
  - Support des domaines personnalisés

### 2. Upstash QStash (Queue Serverless)
- **Pourquoi ?** Contourne la limite de 10 secondes de Vercel (plan Hobby)
- **Plan gratuit :** 500 messages/jour
- **Fonctionnalités :**
  - Retry automatique avec backoff exponentiel
  - Signature des requêtes pour sécurité
  - Scheduling des jobs

### 3. Firebase Admin (Backend)
- Accès à Firestore depuis les routes API Vercel
- Mise à jour des statuts en temps réel

## Structure des Fichiers

### Services (`/src/shared/services/`)

```
services/
├── emailService.ts          # Envoi via Resend
├── queueService.ts          # Gestion de la queue QStash
├── templateService.ts       # Variables de fusion et tracking
└── campaignService.ts       # Logique métier des campagnes
```

### Routes API (`/api/`)

```
api/
├── _lib/
│   └── firebase-admin.ts    # Helper Firebase Admin
├── campaigns/
│   ├── send.ts              # Déclenchement de l'envoi
│   ├── process-batch.ts     # Traitement d'un batch
│   ├── webhooks/
│   │   └── resend.ts        # Webhooks Resend
│   └── track/
│       ├── open.ts          # Tracking des ouvertures
│       └── click.ts         # Tracking des clics
```

### Configuration (`/src/shared/config/`)

```
config/
└── email.ts                 # Configuration centralisée
```

## Flux d'Envoi Détaillé

### Phase 1 : Déclenchement

1. **Admin clique sur "Envoyer maintenant"**
   - Frontend : `CampaignDetailPage.tsx`
   - Appel API : `POST /api/campaigns/send`

2. **API `/api/campaigns/send` :**
   ```typescript
   1. Valide la configuration (clés API)
   2. Récupère la campagne depuis Firestore
   3. Récupère les destinataires (status = 'pending')
   4. Crée des batches de 50 emails
   5. Publie chaque batch dans QStash avec délai échelonné
   6. Met à jour le statut de la campagne à 'sending'
   7. Répond immédiatement au frontend
   ```

### Phase 2 : Traitement Asynchrone

3. **QStash traite chaque batch :**
   - Délai entre batches : 2 secondes
   - Appelle : `POST /api/campaigns/process-batch`

4. **API `/api/campaigns/process-batch` :**
   ```typescript
   1. Vérifie la signature QStash
   2. Récupère la campagne et les destinataires du batch
   3. Prépare les emails (variables de fusion, tracking)
   4. Envoie via Resend avec rate limiting (8 emails/sec)
   5. Met à jour les statuts dans Firestore
   6. Recalcule les statistiques de la campagne
   7. Si tous les batches sont terminés → statut 'sent'
   ```

### Phase 3 : Tracking

5. **Tracking des ouvertures :**
   - Pixel invisible 1x1 dans chaque email
   - URL : `/api/campaigns/track/open?campaign=XXX&recipient=YYY`
   - Met à jour le statut à 'opened'

6. **Tracking des clics :**
   - Tous les liens sont remplacés par des URLs de tracking
   - URL : `/api/campaigns/track/click?campaign=XXX&recipient=YYY&url=ZZZ`
   - Redirige vers l'URL originale après enregistrement

7. **Webhooks Resend (optionnel) :**
   - Événements : delivered, bounced, complained, opened, clicked
   - URL : `/api/campaigns/webhooks/resend`
   - Complète le tracking local

## Configuration Requise

### 1. Variables d'Environnement

Créer un fichier `.env` basé sur `.env.example` :

```bash
# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx

# QStash
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key

# Firebase
VITE_FIREBASE_PROJECT_ID=your_project_id

# URL de l'app
VITE_APP_URL=https://your-domain.com
```

### 2. Compte Resend

1. Créer un compte sur [resend.com](https://resend.com)
2. Créer une clé API
3. (Optionnel) Vérifier un domaine personnalisé
4. (Optionnel) Configurer les webhooks

### 3. Compte Upstash QStash

1. Créer un compte sur [upstash.com](https://upstash.com)
2. Aller dans QStash
3. Copier le token et les clés de signature

### 4. Configuration Vercel

1. Déployer le projet sur Vercel
2. Ajouter les variables d'environnement dans les Settings
3. Configurer les domaines personnalisés

## Limites et Optimisations

### Limites Vercel (Plan Hobby)

| Ressource | Limite | Solution |
|-----------|--------|----------|
| **Timeout fonction** | 10 secondes | QStash pour async |
| **Invocations** | 100GB-Hrs/mois | Batches de 50 emails |
| **Bandwidth** | 100GB/mois | Optimisation HTML |

### Limites Resend (Plan Gratuit)

| Ressource | Limite | Solution |
|-----------|--------|----------|
| **Emails/mois** | 3000 | Upgrade si besoin |
| **Rate limit** | ~10/sec | Rate limiting à 8/sec |
| **Domaines** | 1 vérifié | Utiliser 1 domaine |

### Limites QStash (Plan Gratuit)

| Ressource | Limite | Solution |
|-----------|--------|----------|
| **Messages/jour** | 500 | = 25 000 emails/jour |
| **Retries** | 3 par défaut | Configurable |

## Monitoring et Débogage

### Logs

Les logs sont disponibles dans :
- **Vercel Dashboard** : Logs des fonctions serverless
- **Upstash Console** : Logs des messages QStash
- **Resend Dashboard** : Logs des emails envoyés

### Statistiques en Temps Réel

Les statistiques sont mises à jour automatiquement :
- Après chaque batch traité
- Lors des événements de tracking
- Via les webhooks Resend

### Codes d'Erreur Courants

| Erreur | Cause | Solution |
|--------|-------|----------|
| `RESEND_API_KEY manquante` | Variable non configurée | Ajouter dans Vercel |
| `Signature QStash invalide` | Clés incorrectes | Vérifier clés dans Upstash |
| `Campaign not found` | ID incorrect | Vérifier Firestore |
| `Timeout` | Batch trop gros | Réduire BATCH_SIZE |

## Personnalisation

### Modifier la Taille des Batches

Fichier : `/src/shared/config/email.ts`

```typescript
export const EMAIL_CONFIG = {
  BATCH_SIZE: 50, // Changer ici (max recommandé : 100)
  // ...
}
```

### Modifier le Rate Limit

Fichier : `/src/shared/config/email.ts`

```typescript
export const EMAIL_CONFIG = {
  RATE_LIMIT_PER_SECOND: 8, // Changer ici (max Resend gratuit : 10)
  // ...
}
```

### Ajouter des Variables de Fusion

1. **Ajouter dans les types** (`/src/shared/types/email.ts`) :
   ```typescript
   export interface MergeData {
     // ... existantes
     custom_field: string; // Nouvelle variable
   }
   ```

2. **Générer la donnée** (`/src/shared/services/templateService.ts`) :
   ```typescript
   export function generateMergeData(...) {
     return {
       // ... existantes
       custom_field: recipient.customField || '',
     };
   }
   ```

3. **Utiliser dans le template** :
   ```html
   <p>Bonjour {{first_name}},</p>
   <p>Votre champ personnalisé : {{custom_field}}</p>
   ```

## Sécurité

### Protection des Routes API

1. **Signature QStash** : Toutes les requêtes de QStash sont signées
2. **Validation des données** : Vérification des IDs et statuts
3. **Rate limiting** : Protection contre les abus

### Bonnes Pratiques

- Ne jamais commiter le fichier `.env`
- Utiliser des domaines vérifiés pour meilleure délivrabilité
- Tester avec de petits volumes d'abord
- Surveiller les bounces et désabonner les adresses problématiques

## Tests

### Test Local (Dev)

1. **Démarrer le serveur** :
   ```bash
   npm run dev
   ```

2. **Tester une route API** :
   ```bash
   curl -X POST http://localhost:5173/api/campaigns/send \
     -H "Content-Type: application/json" \
     -d '{"campaignId":"test-campaign-id"}'
   ```

### Test de Production

1. Créer une campagne de test avec 1-2 destinataires
2. Cliquer sur "Envoyer maintenant"
3. Vérifier les logs dans Vercel
4. Vérifier la réception des emails

## Support et Troubleshooting

### Problèmes Courants

**1. Les emails ne partent pas**
- Vérifier les variables d'environnement
- Vérifier les logs Vercel
- Vérifier le statut de la campagne dans Firestore

**2. Timeout sur Vercel**
- Réduire BATCH_SIZE
- Vérifier que QStash est bien configuré

**3. Bounce rate élevé**
- Vérifier la qualité des adresses email
- Configurer SPF/DKIM/DMARC sur le domaine
- Utiliser un domaine vérifié chez Resend

## Prochaines Améliorations

- [ ] Dashboard de monitoring temps réel
- [ ] Tests A/B automatisés
- [ ] Planification avancée (récurrence)
- [ ] Personnalisation avancée des templates
- [ ] Export des statistiques
- [ ] Gestion des désabonnements

## Ressources

- [Documentation Resend](https://resend.com/docs)
- [Documentation QStash](https://upstash.com/docs/qstash)
- [Documentation Vercel Functions](https://vercel.com/docs/functions)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

---

**Auteur** : Claude AI
**Date** : 2025-01-07
**Version** : 1.0.0
