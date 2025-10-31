# Composants Prêts à l'Emploi - Fornap

Ce fichier contient des composants réutilisables qui respectent le design system Fornap.
**Copier-coller directement dans votre code.**

---

## 🔘 Boutons

### Bouton Principal Noir
```tsx
<Button
  color="dark"
  size="lg"
  fullWidth
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
  TEXTE DU BOUTON
</Button>
```

### Bouton Outline
```tsx
<Button
  variant="outline"
  color="dark"
  size="lg"
  fullWidth
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
  TEXTE DU BOUTON
</Button>
```

### Bouton sur Fond Noir (Inversé)
```tsx
<Button
  variant="white"
  color="dark"
  size="lg"
  styles={{
    root: {
      background: '#fff',
      color: '#000',
      borderRadius: '12px',
      fontWeight: 900,
      height: '48px',
      border: '2px solid #fff',
      '&:hover': {
        background: 'transparent',
        color: '#fff',
      },
    },
  }}
>
  TEXTE DU BOUTON
</Button>
```

---

## 📝 Inputs

### TextInput Standard
```tsx
<TextInput
  label="Label du champ"
  placeholder="Placeholder"
  required
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

### PasswordInput
```tsx
<PasswordInput
  label="Mot de passe"
  placeholder="••••••••"
  required
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

### Deux inputs côte à côte
```tsx
<Group grow>
  <TextInput
    label="Prénom"
    placeholder="Jean"
    required
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
  <TextInput
    label="Nom"
    placeholder="Dupont"
    required
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
</Group>
```

---

## 🃏 Cards

### Card Simple
```tsx
<Card
  padding="xl"
  radius="lg"
  style={{
    border: '2px solid #000',
    background: '#fff',
  }}
>
  <Stack gap="md">
    <Text size="xl" fw={900} c="#000">
      TITRE DE LA CARD
    </Text>
    <Text size="sm">
      Contenu de la card
    </Text>
  </Stack>
</Card>
```

### Card Highlight (Accentuée)
```tsx
<Card
  padding="xl"
  radius="lg"
  style={{
    border: '4px solid #000',
    background: '#fff',
    position: 'relative',
  }}
>
  <Badge
    color="dark"
    style={{
      position: 'absolute',
      top: '-12px',
      right: '20px',
      background: '#000',
      color: '#fff',
      fontWeight: 900,
    }}
  >
    RECOMMANDÉ
  </Badge>
  <Stack gap="md">
    <Text size="xl" fw={900} c="#000">
      TITRE DE LA CARD
    </Text>
    <Text size="sm">
      Contenu important
    </Text>
  </Stack>
</Card>
```

### Card Fond Noir
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
  <Stack gap="md">
    <Text size="xl" fw={900} c="#fff">
      TITRE DE LA CARD
    </Text>
    <Text size="sm" c="#fff">
      Contenu sur fond noir
    </Text>
  </Stack>
</Card>
```

---

## 📄 Paper (Container de formulaire)

### Paper Standard
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
  <Stack gap="xl">
    <div style={{ textAlign: 'center' }}>
      <Title order={1} fw={900} c="#000">
        TITRE
      </Title>
      <Text c="dimmed" size="sm">
        Sous-titre
      </Text>
    </div>

    {/* Contenu du formulaire */}
  </Stack>
</Paper>
```

---

## 🏷️ Badges

### Badge Noir Standard
```tsx
<Badge
  color="dark"
  size="lg"
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

### Badge Outline
```tsx
<Badge
  variant="outline"
  color="dark"
  size="lg"
  styles={{
    root: {
      border: '2px solid #000',
      color: '#000',
      fontWeight: 900,
    },
  }}
>
  TEXTE
</Badge>
```

---

## 📊 Progress Bar

### Barre de Progression
```tsx
<div>
  <Text size="sm" c="dimmed" mb="xs" fw={700}>
    Progression : 50%
  </Text>
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
</div>
```

---

## ➗ Dividers

### Divider Simple
```tsx
<Divider color="#000" />
```

### Divider avec Label
```tsx
<Divider
  label="OU"
  labelPosition="center"
  color="#000"
  labelProps={{
    style: {
      fontWeight: 900,
      color: '#000',
    },
  }}
/>
```

---

## 📋 Liste avec Icônes

### Liste de Features
```tsx
import { IconCheck } from '@tabler/icons-react';

<List
  spacing="md"
  size="sm"
  icon={
    <ThemeIcon color="dark" size={24} radius="xl">
      <IconCheck size={16} />
    </ThemeIcon>
  }
>
  <List.Item>
    <Text size="sm">Première fonctionnalité</Text>
  </List.Item>
  <List.Item>
    <Text size="sm">Deuxième fonctionnalité</Text>
  </List.Item>
  <List.Item>
    <Text size="sm">Troisième fonctionnalité</Text>
  </List.Item>
</List>
```

---

## 🎯 Titres

### Page Title (Hero)
```tsx
<Title order={1} size={48} fw={900} ta="center" c="#000">
  TITRE PRINCIPAL
</Title>
```

### Section Title
```tsx
<Title order={2} size={32} fw={900} c="#000">
  TITRE DE SECTION
</Title>
```

### Subsection Title
```tsx
<Title order={3} size={24} fw={700} c="#000">
  SOUS-TITRE
</Title>
```

### Form Section Label
```tsx
<Text size="sm" fw={900} mb="md" c="#000">
  LABEL DE SECTION
</Text>
```

---

## 🔗 Links

### Link Standard
```tsx
<Anchor
  size="sm"
  style={{
    color: '#000',
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'underline',
  }}
  onClick={() => {}}
>
  Texte du lien
</Anchor>
```

### Inline Link
```tsx
<Text size="sm">
  Texte normal{' '}
  <Text
    component="span"
    fw={700}
    style={{
      color: '#000',
      cursor: 'pointer',
      textDecoration: 'underline',
    }}
    onClick={() => {}}
  >
    lien cliquable
  </Text>
</Text>
```

---

## 📦 Container de Page

### Page Container Standard
```tsx
<Box
  style={{
    minHeight: '100vh',
    background: '#ffffff',
    padding: '4rem 1rem',
  }}
>
  <Container size="lg">
    <Stack gap="xl" align="center" mb={60}>
      <Title order={1} size={48} fw={900} ta="center" c="#000">
        TITRE DE LA PAGE
      </Title>
      <Text size="lg" c="dimmed" ta="center" maw={600}>
        Description de la page
      </Text>
    </Stack>

    {/* Contenu de la page */}
  </Container>
</Box>
```

---

## 🎨 Section avec Fond Noir

### Section CTA (Call-to-Action)
```tsx
<Card
  mt={60}
  padding="xl"
  radius="lg"
  style={{
    background: '#000',
    color: 'white',
    border: '3px solid #000',
  }}
>
  <Stack gap="md" align="center">
    <Title order={2} size={28} fw={900} ta="center">
      TITRE DE LA SECTION
    </Title>
    <Text size="md" ta="center" maw={700}>
      Description de la section en blanc sur fond noir
    </Text>
    <Button
      size="lg"
      variant="white"
      color="dark"
      styles={{
        root: {
          borderRadius: '12px',
          height: '48px',
          fontWeight: 900,
          background: '#fff',
          color: '#000',
          border: '2px solid #fff',
          '&:hover': {
            background: 'transparent',
            color: '#fff',
          },
        },
      }}
    >
      APPEL À L'ACTION
    </Button>
  </Stack>
</Card>
```

---

## 📱 Grid Layout

### Grille 3 Colonnes (Responsive)
```tsx
<Grid gutter="xl">
  <Grid.Col span={{ base: 12, md: 4 }}>
    {/* Colonne 1 */}
  </Grid.Col>
  <Grid.Col span={{ base: 12, md: 4 }}>
    {/* Colonne 2 */}
  </Grid.Col>
  <Grid.Col span={{ base: 12, md: 4 }}>
    {/* Colonne 3 */}
  </Grid.Col>
</Grid>
```

### Grille 2 Colonnes
```tsx
<Grid gutter="xl">
  <Grid.Col span={{ base: 12, md: 6 }}>
    {/* Colonne 1 */}
  </Grid.Col>
  <Grid.Col span={{ base: 12, md: 6 }}>
    {/* Colonne 2 */}
  </Grid.Col>
</Grid>
```

---

## 🎁 Bonus : Composant Réutilisable

### Créer un composant Button personnalisé

```tsx
// src/components/ui/FButton.tsx
import { Button, ButtonProps } from '@mantine/core';

interface FButtonProps extends ButtonProps {
  variant?: 'filled' | 'outline';
}

export const FButton = ({ variant = 'filled', children, ...props }: FButtonProps) => {
  const styles = variant === 'filled'
    ? {
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
      }
    : {
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
      };

  return (
    <Button color="dark" styles={styles} {...props}>
      {children}
    </Button>
  );
};

// Utilisation :
// <FButton variant="filled">CONNEXION</FButton>
// <FButton variant="outline">ANNULER</FButton>
```

---

**Note** : Tous ces composants respectent le design system Fornap (noir et blanc, bordures arrondies, minimaliste).
