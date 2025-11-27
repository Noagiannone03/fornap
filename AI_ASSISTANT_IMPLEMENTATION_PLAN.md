# Plan d'Implémentation : Assistant IA "Fornap Intelligence"

Ce document détaille le plan complet pour intégrer un assistant IA conversationnel type "Cursor" dans le panel administrateur de Fornap.

## 1. Architecture & Concepts Clés

### Objectif
Créer un agent autonome capable d'agir comme un "Super Admin" virtuel pour :
1.  **Analyser** les données (KPIs, finances, membres).
2.  **Agir** sur la base de données (CRUD users, campagnes).
3.  **Assister** via une interface chat fluide (streaming).

### Stack Technique
*   **Frontend** : React + TypeScript (Architecture existante).
*   **UI Library** : Mantine v8 (Utilisation des composants `Drawer`, `Affix`, `ActionIcon`).
*   **IA SDK** : Vercel AI SDK Core (`ai` + `@ai-sdk/openai`).
*   **Modèle LLM** : OpenRouter (Compatible OpenAI API).
*   **Pattern de Sécurité** : "Client-side Function Calling" avec validation humaine pour les actions critiques.

### Architecture du Flux de Données
```mermaid
graph TD
    User[Administrateur] -->|Click| FloatingButton[Bouton Flottant (Bas-Gauche)]
    FloatingButton -->|Ouvre| Drawer[Panel Latéral (Droite)]
    Drawer -->|Prompt| AIHook[useChat (Vercel SDK)]
    AIHook -->|HTTP POST| OpenRouter[OpenRouter API]
    OpenRouter -->|Stream Token| AIHook
    OpenRouter -->|Tool Call Request| AIHook
    AIHook -->|Validation| ConfirmationDialog[Dialogue de Confirmation (Si action critique)]
    ConfirmationDialog -->|Approuvé| Tools[Outils Locaux (Services Firebase)]
    Tools -->|Query/Mutation| Firebase[Firestore DB]
    Tools -->|Result| AIHook
    AIHook -->|Final Response| Drawer
```

---

## 2. Structure des Dossiers

Nous allons créer un module dédié dans `src/admin/ai` pour encapsuler toute la logique.

```text
src/admin/
├── ai/
│   ├── components/           # Composants UI spécifiques à l'IA
│   │   ├── AIAssistant.tsx   # Composant racine (Bouton + Drawer)
│   │   ├── ChatInterface.tsx # Zone de chat (Input + Liste messages)
│   │   ├── ChatMessage.tsx   # Bulle de message (Markdown + UI)
│   │   └── ToolApproval.tsx  # UI pour valider une action (ex: suppression)
│   ├── hooks/
│   │   └── useAdminAI.ts     # Wrapper autour de useChat + config outils
│   ├── tools/                # Définitions des capacités de l'IA
│   │   ├── analyticsTools.ts # Outils d'analyse (KPIs, Stats)
│   │   ├── userTools.ts      # Outils de gestion membres (Recherche, Edit)
│   │   └── dbTools.ts        # Outils génériques (Queries complexes)
│   ├── types.ts              # Types partagés
│   └── config.ts             # Configuration (API Keys, System Prompt)
└── layouts/
    └── AdminLayout.tsx       # Point d'injection de l'Assistant
```

---

## 3. Étapes d'Implémentation

### Étape 1 : Installation des Dépendances
Nous devons installer le SDK Vercel AI pour gérer le streaming et les appels d'outils.

```bash
npm install ai @ai-sdk/openai zod
```
*   `ai`: Le cœur du SDK (hooks `useChat`, etc.).
*   `@ai-sdk/openai`: Le provider compatible avec OpenRouter.
*   `zod`: Pour la validation des schémas des outils (obligatoire pour le function calling).

### Étape 2 : Configuration de l'IA (`src/admin/ai/config.ts`)
Définition du client OpenRouter et du "System Prompt" qui donne sa personnalité et ses limites à l'IA.
*   **Modèle** : Utiliser un modèle performant et gratuit/pas cher via OpenRouter (ex: `google/gemini-2.0-flash-001` ou `meta-llama/llama-3.3-70b-instruct` pour la rapidité et l'intelligence).
*   **Contexte** : Lui donner la date actuelle, le contexte de l'app (Fornap) et son rôle.

### Étape 3 : Création des Outils ("Tools")
C'est le cœur du système. L'IA ne devine pas, elle utilise ces fonctions.

#### A. `src/admin/ai/tools/analyticsTools.ts`
Wrapper les fonctions existantes de `src/shared/services/analytics/analyticsService.ts`.
*   `getOverviewKPIs`
*   `getFinancialKPIs`
*   `getMemberStats`

#### B. `src/admin/ai/tools/userTools.ts`
Wrapper les fonctions de `src/shared/services/userService.ts`.
*   `searchUsers` (Besoin de créer une fonction de recherche flexible)
*   `getUserDetails`
*   `updateUser` (**Action Critique** : Nécessite confirmation)

#### C. `src/admin/ai/tools/dbTools.ts`
Pour les requêtes flexibles type "SQL".
*   `runFirestoreQuery` : Permet à l'IA de construire une requête (`collection`, `where`, `orderBy`, `limit`).

### Étape 4 : Le Hook Principal (`src/admin/ai/hooks/useAdminAI.ts`)
Ce hook utilisera `useChat` du SDK Vercel.
*   Il configurera la liste des `tools` disponibles.
*   Il gérera l'état `isWaitingForConfirmation` pour les actions critiques.
*   Il gérera l'envoi de la clé API (stockée dans `import.meta.env.VITE_OPENROUTER_API_KEY`).

### Étape 5 : Interface Utilisateur (UI)

#### A. Bouton Flottant (`AIAssistant.tsx`)
*   Utiliser `<Affix position={{ bottom: 20, left: 20 }}>`.
*   Un beau bouton rond avec une icône "Robot" ou "Sparkles".
*   Animation au survol pour inciter au clic.

#### B. Panel Latéral (`ChatInterface.tsx`)
*   Utiliser `<Drawer position="right">` de Mantine.
*   Header : "Fornap Intelligence".
*   Body : Liste des messages (Scrollable).
*   Footer : Input zone (Textarea autosize + Bouton send).

#### C. Affichage des Messages (`ChatMessage.tsx`)
*   Support du Markdown (gras, listes, code blocks).
*   Affichage spécial pour les "Tool Invocations" (ex: "🔎 Recherche des utilisateurs...").
*   Affichage des dialogues de confirmation pour les actions critiques.

### Étape 6 : Intégration Globale
Modifier `src/admin/layouts/AdminLayout.tsx` pour inclure le composant `<AIAssistant />`. Il sera ainsi accessible depuis n'importe quelle page de l'admin.

---

## 4. Sécurité & Bonnes Pratiques

1.  **Validation Humaine (Human-in-the-Loop)** :
    *   Toute fonction qui modifie des données (`update`, `delete`, `create`) doit avoir un flag `requiresConfirmation: true`.
    *   L'UI doit bloquer l'exécution tant que l'utilisateur n'a pas cliqué sur "Confirmer" dans le chat.

2.  **Clé API** :
    *   La clé ne doit JAMAIS être hardcodée.
    *   Utiliser `.env.local` : `VITE_OPENROUTER_API_KEY=...`
    *   Ajouter `.env.local` au `.gitignore`.

3.  **Scope des Données** :
    *   L'IA utilise les services existants (`userService`, etc.) qui contiennent déjà la logique métier. On ne réécrit pas la logique d'accès aux données, on la "branche".

---

## 5. Instructions pour l'Agent Développeur

Si vous êtes l'agent chargé d'exécuter ce plan :
1.  Commencez par créer la structure de dossiers.
2.  Installez les paquets npm.
3.  Créez le fichier de config et les outils de base (commencez par `analytics` car c'est "read-only" et sûr).
4.  Créez l'UI basique (Bouton + Drawer vide).
5.  Connectez le `useChat` à l'UI.
6.  Testez avec une question simple ("Donne moi les KPIs").
7.  Ajoutez ensuite les outils plus complexes (User management) avec la logique de confirmation.
