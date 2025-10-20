# 🎨 Fornap Design System

## Philosophy

Le design system Fornap s'inspire de l'esthétique minimaliste et premium d'Apple, avec un focus sur:
- **Simplicité**: Interfaces épurées et intuitives
- **Fluidité**: Animations douces et transitions naturelles
- **Accessibilité**: Design inclusif et user-friendly
- **Modernité**: Design contemporain avec des coins arrondis et espaces généreux

---

## 🎨 Couleurs

### Palette Principale

```typescript
const colors = {
  // Primary
  black: '#000000',
  white: '#FFFFFF',

  // Grays
  gray50: '#F8F9FA',
  gray100: '#F1F3F5',
  gray200: '#E9ECEF',
  gray300: '#DEE2E6',
  gray400: '#CED4DA',
  gray500: '#ADB5BD',
  gray600: '#868E96',
  gray700: '#495057',
  gray800: '#343A40',
  gray900: '#212529',

  // Accent Colors
  success: '#2F9E44',
  warning: '#F59F00',
  error: '#FA5252',
  info: '#228BE6',
}
```

### Usage

- **Background principal**: Blanc (`#FFFFFF`)
- **Background secondaire**: Noir (`#000000`)
- **Texte principal**: Noir (`#000000`)
- **Texte secondaire**: Gray 700 (`#495057`)
- **Borders**: Noir 2px (`#000000`)
- **Hover states**: Gray 100 (`#F1F3F5`)

---

## 📐 Spacing & Sizing

### Border Radius (Design arrondi)

```typescript
const radius = {
  xs: '4px',
  sm: '8px',
  md: '12px',    // Default pour inputs et petits composants
  lg: '16px',    // Cards et Papers
  xl: '20px',    // Containers principaux
  xxl: '24px',   // Hero sections
  full: '9999px' // Buttons arrondis
}
```

### Spacing Scale

```typescript
const spacing = {
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
  xxxl: '64px',
}
```

### Container Sizes

```typescript
const containerSizes = {
  xs: '540px',
  sm: '720px',
  md: '960px',
  lg: '1140px',
  xl: '1320px',
}
```

---

## 🔤 Typography

### Familles de polices

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             'Helvetica Neue', Arial, sans-serif;
```

### Échelle typographique

```typescript
const typography = {
  // Headings
  h1: {
    fontSize: '48px',
    fontWeight: 900,
    lineHeight: 1.2,
    letterSpacing: '0.02em',
  },
  h2: {
    fontSize: '36px',
    fontWeight: 900,
    lineHeight: 1.3,
    letterSpacing: '0.01em',
  },
  h3: {
    fontSize: '24px',
    fontWeight: 700,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '20px',
    fontWeight: 700,
    lineHeight: 1.5,
  },

  // Body
  bodyLarge: {
    fontSize: '18px',
    fontWeight: 400,
    lineHeight: 1.6,
  },
  body: {
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: 1.6,
  },
  bodySmall: {
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  caption: {
    fontSize: '12px',
    fontWeight: 400,
    lineHeight: 1.4,
  },
}
```

---

## 🔘 Components

### Buttons

#### Primary Button
```tsx
<Button
  size="lg"
  style={{
    background: '#000',
    color: '#fff',
    borderRadius: '12px',
    height: '48px',
    fontWeight: 700,
    padding: '0 32px',
    border: 'none',
    transition: 'all 0.3s ease',
  }}
  styles={{
    root: {
      '&:hover': {
        background: '#212529',
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
      '&:active': {
        transform: 'translateY(0)',
      }
    }
  }}
>
  TEXTE BOUTON
</Button>
```

#### Secondary Button
```tsx
<Button
  variant="outline"
  size="lg"
  style={{
    borderColor: '#000',
    borderWidth: '2px',
    color: '#000',
    borderRadius: '12px',
    height: '48px',
    fontWeight: 700,
    padding: '0 32px',
    background: 'transparent',
    transition: 'all 0.3s ease',
  }}
  styles={{
    root: {
      '&:hover': {
        background: '#000',
        color: '#fff',
        transform: 'translateY(-2px)',
      }
    }
  }}
>
  TEXTE BOUTON
</Button>
```

### Inputs

#### Text Input
```tsx
<TextInput
  size="md"
  styles={{
    input: {
      borderRadius: '12px',
      height: '48px',
      border: '2px solid #000',
      fontSize: '16px',
      padding: '0 16px',
      transition: 'all 0.3s ease',
      '&:focus': {
        borderColor: '#000',
        boxShadow: '0 0 0 3px rgba(0,0,0,0.1)',
      }
    },
    label: {
      fontWeight: 700,
      color: '#000',
      marginBottom: '8px',
    }
  }}
/>
```

### Cards / Papers

```tsx
<Paper
  p="xl"
  style={{
    borderRadius: '16px',
    border: '2px solid #000',
    background: '#fff',
    transition: 'all 0.3s ease',
  }}
  styles={{
    root: {
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      }
    }
  }}
>
  {/* Content */}
</Paper>
```

---

## 🎭 Animations

### Transitions Standards

```typescript
const transitions = {
  fast: '150ms ease',
  normal: '300ms ease',
  slow: '500ms ease',
}
```

### Animations Communes

#### Fade In
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.3s ease;
}
```

#### Slide In (pour steps)
```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.slide-in {
  animation: slideIn 0.4s ease;
}
```

#### Slide Out
```css
@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(-20px);
  }
}

.slide-out {
  animation: slideOut 0.4s ease;
}
```

---

## 📱 Responsive Design

### Breakpoints

```typescript
const breakpoints = {
  xs: '576px',   // Mobile
  sm: '768px',   // Tablet
  md: '992px',   // Desktop small
  lg: '1200px',  // Desktop
  xl: '1400px',  // Desktop large
}
```

### Mobile-First Approach

Toujours designer pour mobile d'abord, puis adapter pour les plus grands écrans.

```tsx
<Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
  {/* Content */}
</Grid.Col>
```

---

## ✨ UX Principles

### 1. Feedback Immédiat
- Toute action utilisateur doit avoir un feedback visuel (hover, active states)
- Utiliser des notifications pour confirmer les actions importantes
- Loading states pour les opérations asynchrones

### 2. Animations Fluides
- Transitions de 300ms par défaut
- Pas d'animations brusques
- Utiliser `ease` ou `ease-out` pour les transitions

### 3. Hiérarchie Visuelle
- Titres en UPPERCASE et bold (900)
- Espacement généreux entre les sections (48-64px)
- Contraste clair entre éléments principaux et secondaires

### 4. Accessibilité
- Contraste minimum 4.5:1 pour le texte
- Taille minimale des zones cliquables: 44x44px
- Labels clairs pour tous les inputs
- Focus states visibles

### 5. Consistance
- Mêmes styles pour les mêmes composants
- Espacement cohérent
- Nomenclature cohérente (UPPERCASE pour les CTA importants)

---

## 🎯 Best Practices Fornap

### Do's ✅

- Utiliser des coins arrondis (12px minimum)
- Borders épaisses (2px) pour les éléments importants
- Espacement généreux (minimum 16px entre éléments)
- Animations subtiles et fluides
- UPPERCASE pour les titres et CTA importants
- Feedback visuel sur toutes les interactions

### Don'ts ❌

- Pas de coins carrés sur les composants interactifs
- Pas de borders fines (minimum 2px)
- Pas d'animations brusques ou trop rapides
- Pas de texte en lowercase pour les CTA
- Pas de composants sans états hover
- Pas de formulaires sans validation visuelle

---

## 📦 Component Library

### Structure des fichiers de composants

```
src/
  components/
    common/
      Button/
        Button.tsx
        Button.styles.ts
        Button.types.ts
      Input/
      Card/
    layout/
      Navbar/
      Footer/
    forms/
      SignupForm/
      LoginForm/
```

### Exemple de composant réutilisable

```tsx
// src/components/common/Button/Button.tsx
import { Button as MantineButton, ButtonProps } from '@mantine/core';
import { buttonStyles } from './Button.styles';

interface FornapButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Button = ({
  variant = 'primary',
  children,
  ...props
}: FornapButtonProps) => {
  return (
    <MantineButton
      style={buttonStyles[variant]}
      {...props}
    >
      {children}
    </MantineButton>
  );
};
```

---

## 🔍 Code Quality

### Nommage

- Composants: PascalCase (`Button`, `SignupForm`)
- Fichiers: PascalCase pour les composants, camelCase pour les utils
- Variables: camelCase (`userProfile`, `isLoading`)
- Constantes: UPPERCASE (`API_URL`, `MAX_FILE_SIZE`)
- Types/Interfaces: PascalCase avec préfixe (`IUser`, `UserProfile`)

### Structure des props

```typescript
interface ComponentProps {
  // Required props first
  title: string;
  onSubmit: () => void;

  // Optional props
  subtitle?: string;
  loading?: boolean;

  // Style props last
  className?: string;
  style?: React.CSSProperties;
}
```

---

## 📚 Resources

- [Mantine Documentation](https://mantine.dev/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design](https://material.io/design)

---

**Version**: 1.0.0
**Dernière mise à jour**: 2025-10-20
