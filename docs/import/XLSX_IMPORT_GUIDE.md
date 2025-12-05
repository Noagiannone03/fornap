# Guide d'Import XLSX

## Format de fichier attendu

Le système d'import supporte maintenant les fichiers **CSV** et **XLSX** (Excel).

## Structure du fichier XLSX

### Colonnes requises

| Nom de la colonne | Format | Exemple | Obligatoire |
|-------------------|--------|---------|-------------|
| INSCRIPTION | MM/DD/YYYY HH:MM:SS | 12/12/2024 17:05:37 | ✅ Oui |
| NOM | Texte | Schaumburg | ✅ Oui |
| PRENOM | Texte | Luca | ✅ Oui |
| ADRESSE EMAIL | Email | exemple@email.com | ✅ Oui |

### Colonnes optionnelles

| Nom de la colonne | Format | Exemple | Obligatoire |
|-------------------|--------|---------|-------------|
| DATE DE NAISSANCE | DD/MM/YYYY | 10/12/1998 | ❌ Non |
| CODE POSTAL | Nombre | 13100 | ❌ Non |
| NUMERO DE TELEPHONE | Texte | 0619601896 | ❌ Non |

## Exemple de données

```
INSCRIPTION          NOM         PRENOM  DATE DE NAISSANCE  CODE POSTAL  ADRESSE EMAIL              NUMERO DE TELEPHONE
12/12/2024 17:05:37  Schaumburg  Luca    10/12/1998         13100        875burg@gmail.com          0619601896
12/31/2024 15:03:28  Achelatt    Lilou   12/4/2000          93100        achelatt.gilabert@gmail.com 0652006761
```

## Règles d'import

### Type d'abonnement

⚠️ **IMPORTANT** : Tous les utilisateurs importés auront automatiquement :

- **Type d'abonnement** : ANNUAL (annuel)
- **Prix** : 12€
- **Durée** : 1 an à partir de la date d'inscription
- **Date d'expiration** : Calculée automatiquement (date d'inscription + 1 an)

### Dates

- **Date d'inscription** : Format américain `MM/DD/YYYY HH:MM:SS`
  - Exemple : `12/12/2024 17:05:37` = 12 décembre 2024 à 17h05

- **Date de naissance** : Format français `DD/MM/YYYY` ou `D/M/YYYY`
  - Exemple : `10/12/1998` = 10 décembre 1998

### Validation

Le système valide automatiquement :
- ✅ Format des emails
- ✅ Présence des champs requis
- ✅ Format des dates
- ✅ Unicité des emails (les doublons sont ignorés)

## Processus d'import

1. **Préparation du fichier**
   - Assurez-vous que toutes les colonnes requises sont présentes
   - Vérifiez le format des dates
   - Exportez au format XLSX ou CSV

2. **Import dans l'admin**
   - Allez dans "Gestion des Utilisateurs"
   - Cliquez sur "Importer CSV"
   - Sélectionnez votre fichier XLSX ou CSV
   - Cliquez sur "Importer"

3. **Résultat**
   - Le système affiche :
     - ✅ Nombre d'utilisateurs créés avec succès
     - ❌ Nombre d'erreurs (avec détails)
     - ⚠️ Nombre de lignes ignorées (doublons, champs manquants)

4. **Post-import**
   - Les utilisateurs sont créés avec le statut `active`
   - Le tag `XLSX_IMPORT` est automatiquement ajouté
   - Les cartes d'adhérent peuvent être envoyées massivement via "Envoyer cartes"

## Tags automatiques

Chaque utilisateur importé reçoit automatiquement les tags :
- `XLSX_IMPORT` : Pour identifier les imports XLSX
- `NEW_MEMBER` : Pour identifier les nouveaux membres

## Données créées

Pour chaque utilisateur, le système crée :

1. **Document utilisateur** dans `users`
   - UID unique généré automatiquement
   - Email, nom, prénom
   - Date d'inscription (depuis le fichier)
   - Abonnement annual 12€
   - Date d'expiration calculée

2. **Sous-collection `membershipHistory`**
   - Historique de l'adhésion initiale

3. **Sous-collection `actionHistory`**
   - Action de création du compte

## Cas particuliers

### Email manquant ou invalide
❌ L'utilisateur est **ignoré** et compté dans les erreurs

### Date d'inscription manquante
❌ L'utilisateur est **ignoré** et compté dans les erreurs

### Date de naissance manquante
✅ L'utilisateur est **créé** avec la date actuelle comme date de naissance

### Code postal manquant
✅ L'utilisateur est **créé** avec un code postal vide

### Téléphone manquant
✅ L'utilisateur est **créé** avec un téléphone vide

## Conseils

- Testez d'abord avec un petit échantillon (5-10 lignes)
- Vérifiez les résultats avant d'importer tout le fichier
- Gardez une copie de sauvegarde de votre fichier XLSX
- Exportez la liste des utilisateurs après l'import pour vérification

## Support

En cas de problème :
1. Vérifiez le format de votre fichier XLSX
2. Consultez les messages d'erreur détaillés
3. Assurez-vous que les noms de colonnes correspondent exactement

---

**Dernière mise à jour** : 05/12/2025
