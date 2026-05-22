# LIKOAM — Système de Gestion d' Archives / Records Management System

![Version](https://img.shields.io/badge/version-0.1-beta-bordeaux)
![Licence](https://img.shields.io/badge/licence-AGPL%20v3-blue)
![Plateforme](https://img.shields.io/badge/plateforme-Google%20Workspace-green)
![Statut](https://img.shields.io/badge/statut-actif-brightgreen)

🇫🇷 [Français](#-français) | 🇬🇧 [English](#-english)

---

## 🇫🇷 Français

### 📋 Qu'est-ce que LIKOAM ?

LIKOAM est un système de gestion des archives courantes et intermédiaires, conçu pour les institutions qui veulent digitaliser la gestion de leurs documents tout en préparant la migration vers un SAE définitif.

Il convient à toute organisation : ministères, collectivités, ONG, entreprises et organisations communautaires. Il fonctionne entièrement sur l'infrastructure Google Workspace (Google Sheets + Google Drive), ce qui le rend léger, accessible et facile à déployer sans installation de serveur.

---

### ✨ Fonctionnalités principales

**📊 Tableau de bord**
- Statistiques en temps réel sur le statut des documents
- Alertes pour les documents approchant de leur échéance de conservation
- Accès rapide aux documents en attente de validation
- Journal des activités récentes

**📤 Versement documentaire**
- Versement avec métadonnées complètes (titre, catégorie, service)
- Upload automatique vers Google Drive organisé par catégorie
- Modale de confirmation avant envoi
- Génération instantanée d'un bordereau de versement

**🔍 Recherche et consultation**
- Recherche avancée multi-critères
- Consultation directe via prévisualisation Google Drive
- Résultats filtrés selon le rôle et le service de l'agent

**🗄️ Coffre-fort des archives**
- Documents validés avec application des règles de conservation
- Suivi du sort final : Destruction (D), Tri (T), Conservation permanente (C)
- Filtres par catégorie, service, sort final et échéance

**📋 Registre des bordereaux**
- Génération automatique des bordereaux de versement et d'élimination
- Documents imprimables prêts pour export PDF
- Registre complet avec recherche et filtres

**⚙️ Panneau d'administration**
- Gestion des agents (création, activation/désactivation, rôles)
- Configuration des services et catégories avec DUA et sorts finaux
- Contrôle d'accès par rôle (Admin / Utilisateur)

---

### 🏗️ Architecture technique

| Composant | Technologie |
|---|---|
| Backend | Google Apps Script |
| Base de données | Google Sheets |
| Stockage fichiers | Google Drive |
| Frontend | HTML5 / CSS3 / Bootstrap 5 / Vanilla JS |
| Authentification | Système de code agent interne + SHA-256 |
| Déploiement | Google Apps Script Web App |

---

### 🚀 Déploiement

#### Prérequis
- Un compte Google Workspace ou Gmail
- Accès à Google Drive, Google Sheets et Google Apps Script

#### Étapes

**1. Préparer l'infrastructure Google**
- Créer un dossier Google Drive qui servira de stockage des documents
- Copier l'ID du dossier depuis l'URL : `drive.google.com/drive/folders/[ID_ICI]`

**2. Créer le projet Apps Script**
- Créer un nouveau Google Sheets
- Aller dans **Extensions → Apps Script**
- Coller le contenu de `Code.gs` et de `index.html`

**3. Configurer**
- Dans `Code.gs`, mettre à jour le bloc de configuration :
```javascript
const CONFIG = {
  DOSSIER_DRIVE_ID : "VOTRE_ID_ICI",
  TIMEZONE         : "GMT", // adapter selon votre pays
  MAX_TAILLE_MO    : 10
};
```
- Adapter le fuseau horaire selon le pays de déploiement (voir tableau ci-dessous)

**4. Préparer le Google Sheets**

**4. Préparer le Google Sheets**

Un modèle Google Sheets prêt à l'emploi est disponible :

📊 **[Accéder au modèle LIKOAM](https://docs.google.com/spreadsheets/d/1Pm0DNfa6StI4gH1YAb9OeHLSB06CknNj9q1sQDfFnmQ/edit?usp=sharing)**

Cliquez sur **Fichier → Faire une copie** pour obtenir votre propre version, puis copiez l'ID depuis l'URL dans `Code.gs`.

**5. Déployer**
- Cliquer **Déployer → Nouveau déploiement**
- Type : **Application Web**
- Exécuter en tant que : **Moi**
- Accès : **Toute personne**
- Copier l'URL de déploiement

#### Fuseaux horaires

| Pays | TIMEZONE | appsscript.json |
|---|---|---|
| Côte d'Ivoire | `GMT` | `Africa/Abidjan` |
| Sénégal | `GMT` | `Africa/Dakar` |
| Cameroun | `GMT+1` | `Africa/Douala` |
| RDC (Kinshasa) | `GMT+1` | `Africa/Kinshasa` |
| France | `GMT+1` | `Europe/Paris` |

---

### ⚠️ Limitations de cette version

Cette version publiée sur GitHub est une version fonctionnelle de base. Les fonctionnalités suivantes sont disponibles dans la version complète :

| Fonctionnalité | Version publique | Version complète |
|---|---|---|
| Calcul automatique des DUA | ❌ | ✅ |
| Calcul automatique du sort final | ❌ | ✅ |
| Calcul automatique des dates d'élimination | ❌ | ✅ |
| Numérotation avancée des documents | Basique | ✅ |

> Les champs DUA, Sort final et Date d'élimination peuvent être renseignés manuellement dans Google Sheets.

**Roadmap**
- **v1** — Consolidation et corrections (juin 2026)
- **v2.0** — Version autonome Python / Flask / SQLite, calcul automatique des DUA, déploiement hors ligne sans Google (fin 2026)

📧 Pour la version complète ou un déploiement accompagné : **likoamarchives@gmail.com**

---

### 📁 Structure du dépôt

```
likoam/
├── Code.gs        # Backend — Google Apps Script
├── index.html     # Frontend — Application monopage
├── README.md      # Ce fichier
└── LICENSE        # AGPL v3
```

---

### 👩🏽‍💻 Auteure

**Victorine Monné Loua** — Archiviste & Développeuse

🌐 [victorinemonne.com](https://victorinemonne.com)
🖥️ [likoam.com](https://likoam.com)
💼 [LinkedIn](https://linkedin.com/in/victorine-monné)
🐙 [GitHub](https://github.com/VMONNE)
📧 likoamarchives@gmail.com

---

### 📄 Licence

Ce projet est sous licence **GNU Affero General Public License v3.0** — voir le fichier [LICENSE](LICENSE) pour plus de détails.

---
---

## 🇬🇧 English

### 📋 What is LIKOAM?

LIKOAM is a web-based current and semi-current records management system built for institutions seeking to digitize their records management practices while preparing for eventual transfer to a permanent archival repository.

It is suitable for organizations of all types and sizes — government ministries, local authorities, NGOs, corporations, and community organizations. LIKOAM runs entirely on Google Workspace infrastructure (Google Sheets + Google Drive), making it lightweight, cost-effective, and straightforward to deploy — no server, no IT department required.

---

### ✨ Core Features

**📊 Dashboard**
- Live overview of records status across the institution
- Automated alerts for records approaching end of retention period
- Quick access to records pending validation
- Recent activity log

**📤 Accession**
- Register incoming records with full descriptive metadata
- Automatic upload and filing to Google Drive, organized by record series
- Confirmation modal before submission
- Instant generation of a transfer form upon accession

**🔍 Search & Retrieval**
- Advanced multi-criteria search
- Direct document access via Google Drive preview
- Access restricted by department and user role

**🗄️ Archival Repository**
- Validated records managed according to approved retention schedules
- Disposition tracking: Destruction (D), Review (T), Permanent Preservation (C)
- Filtering by record series, department, disposition action, and disposal date

**📋 Records Registers**
- Automatic generation of transfer and disposal authorization forms
- Print-ready documents for official records
- Searchable and filterable register of all transfers and disposals

**⚙️ Administration**
- User management (registration, activation/deactivation, role assignment)
- Department and record series configuration with retention periods
- Role-based access control (Administrator / User)

---

### 🏗️ Technical Architecture

| Component | Technology |
|---|---|
| Backend | Google Apps Script |
| Database | Google Sheets |
| File Storage | Google Drive |
| Frontend | HTML5 / CSS3 / Bootstrap 5 / Vanilla JS |
| Authentication | Internal agent code system + SHA-256 |
| Deployment | Google Apps Script Web App |

---

### 🚀 Deployment

#### Prerequisites
- A Google Workspace or Gmail account
- Access to Google Drive, Google Sheets and Google Apps Script

#### Steps

**1. Prepare Google infrastructure**
- Create a Google Drive folder for document storage
- Copy the folder ID from the URL: `drive.google.com/drive/folders/[ID_HERE]`

**2. Create the Apps Script project**
- Create a new Google Sheets file
- Go to **Extensions → Apps Script**
- Paste the contents of `Code.gs` and `index.html`

**3. Configure**
- In `Code.gs`, update the configuration block:
```javascript
const CONFIG = {
  DOSSIER_DRIVE_ID : "YOUR_FOLDER_ID",
  TIMEZONE         : "GMT", // adjust for your country
  MAX_TAILLE_MO    : 10
};
```

**4. Prepare the Google Sheets**

The project requires a Google Sheets file with the following sheets: `Documents`, `Agents`, `SERVICES`, `Référence DUA`, `BORDEREAUX`. Column structure is documented in the source code.

**5. Deploy**
- Click **Deploy → New deployment**
- Type: **Web App**
- Execute as: **Me**
- Access: **Anyone**
- Copy the deployment URL

#### Timezones

| Country | TIMEZONE | appsscript.json |
|---|---|---|
| Côte d'Ivoire | `GMT` | `Africa/Abidjan` |
| Senegal | `GMT` | `Africa/Dakar` |
| Cameroon | `GMT+1` | `Africa/Douala` |
| DRC (Kinshasa) | `GMT+1` | `Africa/Kinshasa` |
| France | `GMT+1` | `Europe/Paris` |

---

### ⚠️ Version limitations

This version published on GitHub is a functional baseline release. The following features are available in the full version:

| Feature | Public version | Full version |
|---|---|---|
| Automatic retention period calculation | ❌ | ✅ |
| Automatic disposition action assignment | ❌ | ✅ |
| Automatic disposal date calculation | ❌ | ✅ |
| Advanced document numbering | Basic | ✅ |

> DUA, disposition action and disposal date fields can be filled in manually directly in Google Sheets.

**Roadmap**
- **v1** — Consolidation and bug fixes (June 2026)
- **v2.0** — Standalone version (Python / Flask / SQLite), automatic retention calculation, offline deployment without Google (end 2026)

📧 For the full version or assisted deployment: **likoamarchives@gmail.com**

---

### 📁 Repository structure

```
likoam/
├── Code.gs        # Backend — Google Apps Script
├── index.html     # Frontend — Single page application
├── README.md      # This file
└── LICENSE        # AGPL v3
```

---

### 👩🏽‍💻 Author

**Victorine Monné Loua** — Archivist & Developer

🌐 [victorinemonne.com](https://victorinemonne.com)
🖥️ [likoam.com](https://likoam.com)
💼 [LinkedIn](https://linkedin.com/in/victorine-monné)
🐙 [GitHub](https://github.com/VMONNE)
📧 likoamarchives@gmail.com

---

### 📄 License

This project is licensed under the **GNU Affero General Public License v3.0** — see the [LICENSE](LICENSE) file for details.
