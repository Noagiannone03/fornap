# ⚡ RÈGLES DE DESIGN FORNAP - VERSION RAPIDE

**Version courte pour se rappeler rapidement des règles essentielles**

---

## 🎨 COULEURS

### ✅ AUTORISÉ
- Noir : `#000`
- Blanc : `#FFF`
- Gris foncé (hover) : `#333`
- Gris clair : `#E9ECEF`
- Gris texte : `#495057`

### ❌ INTERDIT
- Toutes les autres couleurs (violet, bleu, vert, rouge, jaune, etc.)
- Les dégradés de couleur
- Les ombres colorées

---

## 📐 BORDURES

### ✅ TOUJOURS
- Bordures **arrondies** : 8px, 12px, 16px, 20px
- Bordures **noires épaisses** : 2px, 3px ou 4px
- `border: 2px solid #000` (minimum)

### ❌ JAMAIS
- Coins carrés (border-radius: 0)
- Bordures fines (< 2px)
- Bordures colorées

---

## 🔤 TEXTE

### ✅ RÈGLES
- **Titres importants** : MAJUSCULES + fw: 900
- **Labels** : Toujours en gras (fw: 700)
- **Couleur texte principal** : Noir #000
- **Texte secondaire** : Gris #495057

### Exemple
```tsx
<Title fw={900} c="#000">TITRE PRINCIPAL</Title>
<Text fw={700} c="#000">Label de formulaire</Text>
<Text c="dimmed">Texte secondaire</Text>
```

---

## 🔘 BOUTONS

### Bouton Noir (Principal)
```tsx
background: #000
color: #fff
borderRadius: 12px
fontWeight: 900
height: 48px
hover → background: #333
```

### Bouton Outline (Secondaire)
```tsx
background: transparent
border: 2px solid #000
color: #000
borderRadius: 12px
fontWeight: 700
hover → background: #000, color: #fff
```

**TOUJOURS en majuscules**

---

## 📝 INPUTS

### Configuration Standard
```tsx
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
```

---

## 🃏 CARDS

### Standard
- Border: `2px solid #000`
- BorderRadius: `16px` ou `lg`
- Background: `#fff`

### Accentuée
- Border: `4px solid #000`

### Fond Noir
- Background: `#000`
- Color: `#fff`
- Border: `3px solid #000`

---

## 📦 SPACING

```
Petit:    8-12px
Moyen:    16-24px
Grand:    32-48px
Énorme:   60px+
```

---

## ✅ CHECKLIST RAPIDE

Avant de valider ton code :

- [ ] **Pas de couleurs** autres que noir/blanc/gris ?
- [ ] **Bordures arrondies** partout ?
- [ ] **Bordures 2px minimum** ?
- [ ] **Titres en MAJUSCULES** ?
- [ ] **Labels en gras** ?
- [ ] **Style minimaliste** ?

---

## 🚫 LES 7 INTERDITS

1. ❌ **PAS DE COULEURS** (sauf noir/blanc/gris)
2. ❌ **PAS DE COINS CARRÉS**
3. ❌ **PAS DE BORDURES FINES** (< 2px)
4. ❌ **PAS DE GRADIENTS COLORÉS**
5. ❌ **PAS D'OMBRES COLORÉES**
6. ❌ **PAS DE DESIGN SURCHARGÉ**
7. ❌ **PAS D'INCOHÉRENCE**

---

## 💡 EN RÉSUMÉ

**FORNAP = Noir & Blanc + Bordures Arrondies + Minimaliste + Moderne**

Si t'hésites sur un style → Regarde les pages existantes (Login, Membership, Signup)

---

## 📚 DOCS COMPLÈTES

Pour plus de détails, consulte :
- `docs/design-system.md` - Guide complet
- `docs/composants-exemples.md` - Code prêt à l'emploi

---

**Fait avec ❤️ pour Fornap**
