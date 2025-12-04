# Corrections du système de tracking email

## Date: 2025-12-05

### Problèmes identifiés et corrigés

#### 1. ❌ Erreur PXL: "Please pass options.pxl"

**Problème**: La librairie `pxl-for-emails` nécessite une instance de la librairie de base `pxl`.

**Solution**:
- Installé la dépendance manquante `pxl`
- Modifié `/api/_lib/pxl-tracking.ts` pour créer une instance PXL de base
- Passé cette instance à PxlForEmails via l'option `pxl`

**Fichiers modifiés**:
- `api/package.json` - Ajout de `pxl` comme dépendance
- `api/_lib/pxl-tracking.ts:10-35` - Configuration correcte

```typescript
import PxlTracker from 'pxl';
import PxlForEmails from 'pxl-for-emails';

const basePxl = new PxlTracker();

export const pxl = new PxlForEmails({
  pxl: basePxl,  // Instance PXL de base (requis)
  baseUrl: getBaseUrl(),
  openPath: '/api/campaigns/pxl/open',
  clickPath: '/api/campaigns/pxl/click',
  onOpen: async (recipient, campaign) => { ... },
  onClick: async (recipient, campaign, link) => { ... }
});
```

---

#### 2. ❌ Erreur Firebase: "Property content contains an invalid nested entity"

**Problème**: Le champ `content.design` contient l'objet JSON complet d'Unlayer avec des imbrications trop profondes que Firebase refuse.

**Solution**:
- Supprimé la sauvegarde de `content.design` dans Firestore
- Seul le HTML exporté est sauvegardé (suffisant pour l'envoi)
- Ajout des champs obligatoires `fromName`, `fromEmail`, `replyTo`

**Fichiers modifiés**:
- `src/admin/pages/Campaigns/CampaignCreatePage.tsx:181-202` - Suppression de la sauvegarde du design

```typescript
const content: any = {
  subject,
  html: finalHtml,
  fromName: 'FOR+NAP Social Club',
  fromEmail: 'no-reply@fornap.fr',
  replyTo: 'contact@fornap.fr',
};

// Preheader optionnel
if (preheader && preheader.trim()) {
  content.preheader = preheader;
}

// ⚠️ Ne PAS sauvegarder le design - Firebase n'accepte pas les objets trop profonds
```

---

#### 3. ❌ Problème de validation du Textarea

**Problème**: Le champ "Corps du message" se validait après chaque caractère tapé, empêchant l'utilisateur d'écrire plus d'une lettre.

**Solution**:
- Ajout de la propriété `autosize` au Textarea
- Cela permet au champ de s'agrandir automatiquement sans re-validation intempestive

**Fichiers modifiés**:
- `src/admin/pages/Campaigns/CampaignCreatePage.tsx:515-524` - Ajout de `autosize`

```tsx
<Textarea
  label="Corps du message"
  description="Rédigez le contenu de votre email"
  value={emailBody}
  onChange={(e) => setEmailBody(e.currentTarget.value)}
  minRows={12}
  autosize  // ← Correction
  required
/>
```

---

## Architecture du nouveau système de tracking

### Structure des fichiers

```
api/
├── _lib/
│   └── pxl-tracking.ts          # Configuration PXL et callbacks
├── campaigns/
│   ├── send-email.ts            # Envoi d'emails avec tracking PXL
│   ├── pxl/
│   │   ├── open.ts              # Endpoint de tracking des ouvertures
│   │   └── click.ts             # Endpoint de tracking des clics
│   └── track/                   # Anciens endpoints (LEGACY)
│       ├── open.ts
│       └── click.ts
```

### Flux de tracking

1. **Préparation de l'email** (`send-email.ts`)
   - PXL injecte automatiquement le pixel de tracking
   - PXL transforme tous les liens en liens de tracking
   - L'email est envoyé via Nodemailer

2. **Tracking des ouvertures** (`pxl/open.ts`)
   - Le client email charge le pixel 1x1
   - PXL vérifie la signature
   - Callback `onOpen` enregistre dans Firestore
   - Mise à jour automatique des stats de campagne

3. **Tracking des clics** (`pxl/click.ts`)
   - L'utilisateur clique sur un lien
   - PXL vérifie la signature
   - Callback `onClick` enregistre dans Firestore
   - Redirection vers l'URL originale
   - Mise à jour automatique des stats de campagne

### Avantages de PXL

✅ **Sécurité**: Signature cryptographique sur chaque lien
✅ **Performance**: Callbacks async, pas de blocage
✅ **Fiabilité**: Gestion automatique des erreurs
✅ **Compatibilité**: Fonctionne avec tous les clients email
✅ **Statistiques**: Compteurs d'ouvertures et de clics multiples

---

## Limitations connues

### Tracking des ouvertures
- ⚠️ Peut être bloqué par Apple Mail Privacy Protection
- ⚠️ Ne fonctionne pas si les images sont désactivées
- ⚠️ Les firewalls d'entreprise peuvent bloquer le pixel

### Tracking des clics
- ✅ Plus fiable que les ouvertures
- ✅ Fonctionne tant que le lien est cliquable

---

## Tests à effectuer

- [ ] Envoyer une campagne test avec l'éditeur Unlayer
- [ ] Envoyer une campagne test avec le mode HTML simple
- [ ] Vérifier que les ouvertures sont trackées dans Firestore
- [ ] Vérifier que les clics sont trackées dans Firestore
- [ ] Vérifier que les stats de campagne se mettent à jour
- [ ] Tester avec différents clients email (Gmail, Outlook, Apple Mail)

---

## Prochaines étapes

1. **Monitoring**: Ajouter des logs pour suivre les performances du tracking
2. **Analytics**: Dashboard pour visualiser les taux d'ouverture par client email
3. **A/B Testing**: Permettre de tester différents sujets/contenus
4. **Webhooks**: Notifier d'autres services lors d'événements de tracking
