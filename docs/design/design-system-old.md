# FORNAP - Guide de Design System

Ce document définit les règles de design à suivre pour maintenir une cohérence visuelle sur toute la plateforme Fornap.

---

## 🎨 Palette de Couleurs

### Couleurs Principales
```css
Noir (Principal):     #000000
Blanc (Background):   #FFFFFF
Gris Foncé (Hover):   #333333
Gris Clair (Divider): #E9ECEF
Gris Texte:           #495057
```

### Utilisation
- **Textes principaux** : Noir (#000)
- **Backgrounds** : Blanc (#FFF)
- **Bordures** : Noir (#000)
- **Hover boutons noirs** : Gris foncé (#333)
- **Textes secondaires** : Gris (#495057)

**⚠️ RÈGLE ABSOLUE** : Pas de couleurs en dehors de noir, blanc et nuances de gris !

---

## 📏 Bordures

### Épaisseurs
```
Éléments normaux:     2px solid #000
Éléments accentués:   3px solid #000
Éléments highlights:  4px solid #000
Dividers:             1px solid #000
```

### Rayons de bordure (Border Radius)
```
Petits éléments:      8px
Éléments moyens:      12px
Cards/Papers:         16px
Grandes sections:     20px
```

**✅ Toujours utiliser des coins arrondis**
**❌ Ne jamais utiliser de coins carrés (radius: 0)**

---

## 🔤 Typographie

### Poids (Font Weight)
```
Titres principaux:    900 (Ultra Bold)
Titres secondaires:   700 (Bold)
Labels:               700 (Bold)
Texte normal:         400 (Regular)
```

### Tailles
```
Hero Title:           48px
Page Title (h1):      32px - 36px
Section Title (h2):   24px - 28px
Subsection (h3):      18px - 20px
Body Text:            14px - 16px
Small Text:           12px - 13px
```

### Style
- **Titres importants** : TOUJOURS EN MAJUSCULES
- **Labels de formulaire** : En gras (fw: 700)
- **Texte normal** : Capitalisation standard

---

## 🎯 Boutons

### Bouton Principal (Filled)
```tsx
<Button
  color="dark"
  styles={{
    root: {
      background: '#000',
      color: '#fff',
      borderRadius: '12px',
      fontWeight: 900,
      height: '48px',
      '&:hover': {
        background: '#333',
      },
    },
  }}
>
  TEXTE EN MAJUSCULES
</Button>
```

### Bouton Secondaire (Outline)
```tsx
<Button
  variant="outline"
  color="dark"
  styles={{
    root: {
      border: '2px solid #000',
      background: 'transparent',
      color: '#000',
      borderRadius: '12px',
      fontWeight: 700,
      height: '48px',
      '&:hover': {
        background: '#000',
        color: '#fff',
      },
    },
  }}
>
  TEXTE EN MAJUSCULES
</Button>
```

### Tailles de boutons
```
Small (sm):     height: 36px
Medium (md):    height: 48px
Large (lg):     height: 56px
Extra-large:    height: 64px
```

---

## 📝 Inputs (Formulaires)

### Input Standard
```tsx
<TextInput
  label="Label"
  placeholder="Placeholder"
  size="md"
  styles={{
    input: {
      borderRadius: '12px',
      height: '48px',
      border: '2px solid #000',
    },
    label: {
      fontWeight: 700,
      color: '#000',
    },
  }}
/>
```

### Règles
- **Bordure** : 2px solid #000
- **Border radius** : 12px
- **Hauteur** : 48px
- **Label** : Toujours en gras (fw: 700)
- **Placeholder** : Texte gris clair

---

## 🃏 Cards

### Card Standard
```tsx
<Card
  padding="xl"
  radius="lg"
  style={{
    border: '2px solid #000',
    background: '#fff',
  }}
>
  Contenu
</Card>
```

### Card Accentuée/Highlight
```tsx
<Card
  padding="xl"
  radius="lg"
  style={{
    border: '4px solid #000',
    background: '#fff',
  }}
>
  Contenu important
</Card>
```

### Card Inversée (Fond Noir)
```tsx
<Card
  padding="xl"
  radius="lg"
  style={{
    border: '3px solid #000',
    background: '#000',
    color: '#fff',
  }}
>
  Contenu
</Card>
```

---

## 📦 Spacing (Espacements)

### Padding
```
xs:   8px
sm:   12px
md:   16px
lg:   24px
xl:   32px
xxl:  48px
```

### Gap (Stack/Group)
```
xs:   4px
sm:   8px
md:   12px
lg:   16px
xl:   24px
```

### Margin
```
Entre sections:       40px - 60px
Entre éléments:       16px - 24px
Entre sous-éléments:  8px - 12px
```

---

## 🏷️ Badges

### Badge Standard
```tsx
<Badge
  color="dark"
  styles={{
    root: {
      background: '#000',
      color: '#fff',
      fontWeight: 900,
    },
  }}
>
  TEXTE
</Badge>
```

### Règles
- Toujours fond noir, texte blanc
- Texte en majuscules
- Font weight : 900

---

## ➗ Dividers

### Divider Standard
```tsx
<Divider color="#000" />
```

### Divider avec Label
```tsx
<Divider
  label="TEXTE"
  labelPosition="center"
  color="#000"
/>
```

---

## 📊 Progress Bar

### Barre de progression
```tsx
<Progress
  value={50}
  color="dark"
  size="md"
  radius="xl"
  styles={{
    root: {
      background: '#e9ecef',
      border: '1px solid #000',
    },
  }}
/>
```

---

## 🎭 States & Interactions

### Hover
- **Boutons noirs** : Background passe de #000 à #333
- **Boutons outline** : Background passe de transparent à #000, texte devient blanc
- **Links** : Soulignement apparaît

### Focus
- **Inputs** : Bordure reste noire, pas de changement de couleur

### Active/Selected
- **Bordure plus épaisse** : 3px ou 4px au lieu de 2px
- **Background noir** pour les éléments sélectionnés

---

## 📱 Responsive

### Breakpoints
```
xs: 0px
sm: 576px
md: 768px
lg: 992px
xl: 1200px
```

### Règles
- Sur mobile : Padding réduit (16px au lieu de 32px)
- Cards en colonne unique sur mobile
- Boutons full-width sur petit écran

---

## ✅ DO's (À Faire)

1. **Toujours** utiliser noir et blanc
2. **Toujours** utiliser des bordures arrondies
3. **Toujours** mettre les titres importants en majuscules
4. **Toujours** utiliser des labels en gras (fw: 700)
5. **Toujours** utiliser des bordures noires épaisses (2px minimum)
6. **Toujours** garder un look minimaliste et épuré
7. **Toujours** utiliser des espacements généreux

---

## ❌ DON'Ts (À Éviter)

1. **Jamais** utiliser de couleurs (violet, bleu, vert, etc.)
2. **Jamais** utiliser des coins carrés
3. **Jamais** utiliser des bordures fines (< 2px)
4. **Jamais** utiliser des ombres colorées
5. **Jamais** mélanger les styles (garder la cohérence)
6. **Jamais** utiliser de gradients de couleur
7. **Jamais** surcharger l'interface

---

## 🔧 Configuration Mantine

### Theme Override Recommandé
```tsx
// Dans src/theme/mantineTheme.ts
export const theme = createTheme({
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5C5F66',
      '#373A40',
      '#2C2E33',
      '#25262B',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },
  primaryColor: 'dark',
  defaultRadius: 'md',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  headings: {
    fontWeight: '900',
  },
});
```

---

## 📋 Checklist avant de publier une page

- [ ] Toutes les couleurs sont noir/blanc/gris ?
- [ ] Toutes les bordures sont arrondies ?
- [ ] Tous les titres importants sont en majuscules ?
- [ ] Tous les labels sont en gras ?
- [ ] Toutes les bordures font au moins 2px ?
- [ ] Les espacements sont cohérents ?
- [ ] Les boutons suivent le guide ?
- [ ] Le responsive fonctionne bien ?
- [ ] Le design est minimaliste ?

---

## 🎨 Exemples de Composants

### Page Container
```tsx
<Box
  style={{
    minHeight: '100vh',
    background: '#ffffff',
    padding: '4rem 1rem',
  }}
>
  <Container size="lg">
    {/* Contenu */}
  </Container>
</Box>
```

### Paper/Form Container
```tsx
<Paper
  style={{
    maxWidth: '500px',
    margin: '0 auto',
    padding: '3rem',
    borderRadius: '16px',
    border: '3px solid #000',
    background: 'white',
  }}
>
  {/* Contenu */}
</Paper>
```

### Section Title
```tsx
<Title order={1} size={48} fw={900} ta="center" c="#000">
  TITRE DE LA SECTION
</Title>
```

---

**Date de création** : 2025
**Version** : 1.0
**Dernière mise à jour** : Janvier 2025

---

> 💡 **Note** : Ce guide doit être suivi **strictement** pour maintenir la cohérence visuelle de la plateforme Fornap. En cas de doute, référez-vous toujours à ce document.
