# Bonnes Pratiques de Design - Fornap

Ce document est le guide de référence pour le design de l'interface utilisateur de Fornap. Il a pour but d'assurer une cohérence visuelle et une expérience utilisateur de haute qualité sur l'ensemble de la plateforme. Toute nouvelle fonctionnalité ou modification doit impérativement respecter ces règles.

## Philosophie Générale

Le design de Fornap est **minimaliste, moderne et premium**. Il s'inspire de l'esthétique d'Apple en mettant l'accent sur :

- **La simplicité** : Des interfaces épurées, faciles à comprendre et à utiliser.
- **La clarté** : Une hiérarchie visuelle forte et une lisibilité optimale.
- **La fluidité** : Des interactions et des animations douces qui guident l'utilisateur.
- **L'audace** : Un style affirmé avec des contrastes forts (noir et blanc) et des éléments graphiques marqués (bordures épaisses, coins très arrondis).

---

## 🎨 1. Palette de Couleurs : Le Noir et Blanc est Roi

La palette est volontairement restreinte pour créer une identité forte et intemporelle.

### Couleurs Autorisées
| Couleur | Hexadécimal | Usage Principal |
|---|---|---|
| **Noir** | `#000000` | Textes, arrière-plans, bordures, boutons principaux. |
| **Blanc** | `#FFFFFF` | Arrière-plans principaux, textes sur fond noir. |
| **Gris Foncé**| `#333333` | État `hover` pour les éléments noirs. |
| **Gris Moyen**| `#495057` | Texte secondaire, placeholders, sous-titres. (`dimmed`) |
| **Gris Clair**| `#E9ECEF` | Diviseurs, arrière-plans de conteneurs désactivés. |

### ❌ Règle d'Or : Interdiction des Couleurs
**N'utilisez JAMAIS de couleurs** (bleu, vert, rouge, etc.) pour les éléments d'interface, sauf pour les notifications de statut (erreur, succès) où leur usage doit rester exceptionnel et discret. Le design repose sur le contraste du noir et blanc.

---

## 📐 2. Formes et Bordures : L'Arrondi et l'Épaisseur

Les formes définissent le caractère moderne et doux de l'interface.

### Coins Arrondis (`border-radius`)
L'utilisation de coins arrondis est **obligatoire** pour la majorité des éléments.
- **Petits éléments (badges, tags)** : `8px`
- **Éléments moyens (inputs, boutons)** : `12px` à `16px`
- **Conteneurs (cards, pop-ups)** : `16px` à `24px`
- **Éléments circulaires (avatars)** : `9999px`

### Bordures (`border`)
Les bordures sont un élément clé du design. Elles doivent être **noires et épaisses**.
- **Standard (inputs, cards, boutons secondaires)** : `2px solid #000`
- **Accentuation (élément sélectionné, focus)** : `3px solid #000`
- **Mise en avant forte** : `4px solid #000`

**❌ Règle d'Or : Pas de Coins Carrés ni de Bordures Fines**
Un élément avec `border-radius: 0` ou `border: 1px solid ...` est considéré comme une erreur de design.

---

## 🔤 3. Typographie : Lisibilité et Hiérarchie

La typographie est gérée par la police système pour un rendu natif et performant.

### Graisses (`font-weight`)
- **Titres principaux (H1, H2)** : `900` (Ultra-gras)
- **Titres secondaires et Labels** : `700` (Gras)
- **Texte courant** : `400` (Normal)

### Casse (`text-transform`)
- **Titres de section importants et boutons d'action principaux** : `UPPERCASE` (MAJUSCULES) pour un impact maximal.
- **Texte courant** : Capitalisation normale.

### Hiérarchie Visuelle
Utilisez une combinaison de taille, graisse et casse pour guider l'œil de l'utilisateur. Un titre de page doit être immédiatement identifiable.

---

## 🔘 4. Composants emblématiques

### Boutons
- **Primaire (fond noir)** : `background: #000`, `color: #fff`, `fontWeight: 900`, `borderRadius: 12px`, `height: 48px` (ou plus). Texte en MAJUSCULES.
- **Secondaire (contour)** : `border: 2px solid #000`, `color: #000`, `background: transparent`, `fontWeight: 700`. Au survol (`hover`), il devient un bouton primaire (`background: #000`, `color: #fff`).

### Champs de Saisie (`TextInput`, `PasswordInput`)
- **Style** : `border: 2px solid #000`, `borderRadius: 12px`, `height: 56px`.
- **Label** : Toujours visible et en `fontWeight: 700`.

### Cartes (`Card` / `Paper`)
- **Style** : `border: 2px solid #000`, `borderRadius: 16px` (ou plus), `background: #fff`.
- **Interaction** : Au survol, une légère élévation (`transform: translateY(-4px)`) et une ombre discrète (`box-shadow`) sont appliquées pour donner du feedback.

---

## ✨ 5. Animations et Transitions

Les animations doivent être **subtiles et fonctionnelles**. Elles améliorent l'expérience sans distraire.

- **Durée** : `300ms` est la durée de transition par défaut.
- **Timing Function** : `ease` ou `cubic-bezier(0.4, 0, 0.2, 1)` pour un mouvement naturel.
- **Propriétés à animer** : Privilégiez `transform` et `opacity` pour de meilleures performances.
- **Exemples** :
    - `fadeIn` pour l'apparition d'éléments.
    - `slideIn` pour les étapes de formulaire.
    - Effet de "lift" (élévation) au survol des cartes et boutons.

---

## ✅ Checklist de Validation Rapide

Avant de finaliser une interface, posez-vous ces questions :

- [ ] **Est-ce que mon design est exclusivement en noir, blanc et nuances de gris ?**
- [ ] **Tous les coins sont-ils arrondis ?**
- [ ] **Toutes les bordures importantes font-elles au moins 2px d'épaisseur ?**
- [ ] **Les titres et boutons importants sont-ils en MAJUSCULES et très gras (fw: 900) ?**
- [ ] **L'interface est-elle aérée et les espacements sont-ils cohérents ?**
- [ ] **Chaque élément interactif a-t-il un état `hover` et `focus` clair ?**

Si la réponse à l'une de ces questions est non, votre design doit être revu. En cas de doute, inspirez-vous des pages existantes comme `Login`, `Membership` ou `Home`.
