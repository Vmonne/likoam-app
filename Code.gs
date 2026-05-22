// ============================================================
// LIKOAM — Système de Gestion des Archives
// Auteure : Victorine Monné — victorinemonne.com
// Licence : AGPL v3
// Version : // Version : 0.1-beta (version publique — fonctionnalités de base) (version publique — fonctionnalités de base)
// Note : Le calcul automatique des DUA et le moteur de tri
//        sont disponibles dans la version complète (v2)
// ============================================================


// ============================================================
// CONFIGURATION — à adapter lors du déploiement
// ============================================================
const CONFIG = {
  DOSSIER_DRIVE_ID : "REMPLACER_PAR_VOTRE_ID_DE_DOSSIER", // ID du dossier Google Drive racine
  TIMEZONE         : "GMT",      // Adapter selon le pays : GMT, GMT+1, etc.
  MAX_TAILLE_MO    : 10
};


// ============================================================
// POINT D'ENTRÉE
// ============================================================
function doGet() {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const shAgents = ss.getSheetByName("Agents");
  const email    = Session.getActiveUser().getEmail().toLowerCase().trim();
  const data     = shAgents.getDataRange().getValues();

  let estAdmin = false;
  for (let i = 1; i < data.length; i++) {
    const emailLigne = data[i][4] ? data[i][4].toString().toLowerCase().trim() : "";
    const roleLigne  = data[i][5] ? data[i][5].toString().toLowerCase().trim() : "";
    if (emailLigne === email && roleLigne === "admin") {
      estAdmin = true;
      break;
    }
  }

  const template    = HtmlService.createTemplateFromFile("Index");
  template.estAdmin = estAdmin;

  return template.evaluate()
    .setTitle("LIKOAM — Gestion d'Archives")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}


// ============================================================
// UTILITAIRE — hashage SHA-256 des codes agents
// ============================================================
function _hacherCode(code) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    code.toString().trim()
  );
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}


// ============================================================
// INIT DATA — connexion + stats + listes en un seul appel
// ============================================================
function getInitData(codeSaisi) {
  try {
    if (!codeSaisi || codeSaisi.toString().trim() === "") {
      return { success: false, message: "Code requis." };
    }

    const ss         = SpreadsheetApp.getActiveSpreadsheet();
    const shAgents   = ss.getSheetByName("Agents");
    const agentsData = shAgents.getDataRange().getValues();
    const hashSaisi  = _hacherCode(codeSaisi);

    const agent = agentsData.find(row =>
      row[1] && _hacherCode(row[1]) === hashSaisi && row[2] === "Actif"
    );

    if (!agent) {
      return { success: false, message: "Code invalide ou compte inactif." };
    }

    const role = agent[5] ? agent[5].toString().trim() : "User";

    let stats = null;
    if (role.toLowerCase() === "admin") {
      const sheet      = ss.getSheets()[0];
      const data       = sheet.getDataRange().getValues();
      const aujourdhui = new Date(); aujourdhui.setHours(0,0,0,0);
      const limite30j  = new Date(); limite30j.setDate(aujourdhui.getDate() + 30);

      stats = { total:0, aValider:0, perimes:0, alertes:0,
                docsAValider:[], docsPerimes:[], docsAlertes:[] };
      stats.total = data.length - 1;

      for (let i = 1; i < data.length; i++) {
        const numero   = data[i][1];
        const url      = data[i][6];
        const statut   = data[i][8];
        const echeance = data[i][15];

        if (statut === "En attente") {
          stats.aValider++;
          stats.docsAValider.push({ numero, url });
        }
        if (echeance instanceof Date) {
          const d = new Date(echeance.getTime()); d.setHours(0,0,0,0);
          if (d < aujourdhui)      { stats.perimes++; stats.docsPerimes.push({ numero, url }); }
          else if (d <= limite30j) { stats.alertes++; stats.docsAlertes.push({ numero, url }); }
        }
      }
    }

    return {
      success : true,
      nom     : agent[0],
      code    : agent[1],
      service : agent[3],
      email   : agent[4] || "",
      role,
      stats,
      listes  : _getListes(ss)
    };

  } catch(e) {
    console.error("getInitData : " + e);
    return { success: false, message: "Erreur serveur. Veuillez réessayer." };
  }
}


// ============================================================
// LISTES DYNAMIQUES — services + catégories
// ============================================================
function getListesStats() {
  try {
    return _getListes(SpreadsheetApp.getActiveSpreadsheet());
  } catch(e) {
    console.error("getListesStats : " + e);
    return { services: [], categories: [] };
  }
}

function _getListes(ss) {
  const shServ = ss.getSheetByName("SERVICES");
  let services = [];
  if (shServ && shServ.getLastRow() > 1) {
    services = shServ.getRange(2, 1, shServ.getLastRow() - 1, 1)
                     .getValues().flat().filter(String);
  }

  const shDUA = ss.getSheetByName("Référence DUA");
  let categories = [];
  if (shDUA && shDUA.getLastRow() > 1) {
    categories = shDUA.getRange(2, 1, shDUA.getLastRow() - 1, 1)
                      .getValues().flat().filter(String);
  }

  return {
    services   : [...new Set(services)].sort(),
    categories : [...new Set(categories)].sort()
  };
}


// ============================================================
// VERSEMENT
// Note : Le calcul automatique des DUA est disponible en v2
// ============================================================
function processUpload(data) {
  try {
    if (!data.fileName || !data.base64 || !data.categorie || !data.titre) {
      return { success: false, message: "Données incomplètes." };
    }

    const tailleMo = (data.base64.length * 0.75) / (1024 * 1024);
    if (tailleMo > CONFIG.MAX_TAILLE_MO) {
      return { success: false, message: "Fichier trop volumineux (" + tailleMo.toFixed(1) + " Mo). Limite : " + CONFIG.MAX_TAILLE_MO + " Mo." };
    }

    const parentFolder = DriveApp.getFolderById(CONFIG.DOSSIER_DRIVE_ID);
    const nomCategorie = data.categorie;

    const sousDossiers = parentFolder.getFoldersByName(nomCategorie);
    const dossierDest  = sousDossiers.hasNext()
                         ? sousDossiers.next()
                         : parentFolder.createFolder(nomCategorie);

    const decoded = Utilities.base64Decode(data.base64);
    const blob    = Utilities.newBlob(decoded, data.mimeType || "application/octet-stream", data.fileName);
    const file    = dossierDest.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId   = file.getId();
    const cleanUrl = "https://drive.google.com/file/d/" + fileId + "/preview";

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0];
    const ligne = sheet.getLastRow() + 1;

    // Enregistrement du document
    const ligneVide = new Array(16).fill("");
    ligneVide[0]  = new Date();       // A — Horodateur
    ligneVide[3]  = data.codeAgent;   // D — Agent
    ligneVide[4]  = data.service;     // E — Service
    ligneVide[5]  = nomCategorie;     // F — Catégorie
    ligneVide[6]  = cleanUrl;         // G — Lien Drive
    ligneVide[8]  = "En attente";     // I — Statut
    ligneVide[11] = data.titre;       // L — Titre

    // TODO v2 : calcul automatique DUA, sort final et date d'élimination
    // ligneVide[12] = duaValeur;
    // ligneVide[13] = sortFinal;
    // ligneVide[15] = dateElimination;

    sheet.getRange(ligne, 1, 1, 16).setValues([ligneVide]);

    // Génération du numéro de document — format DOC-AAAA-XXX
    const annee  = new Date().getFullYear();
    const numero = "DOC-" + annee + "-" + String(ligne - 1).padStart(3, "0");
    sheet.getRange(ligne, 2).setValue(numero);
    SpreadsheetApp.flush();

    return {
      success   : true,
      message   : "Versement réussi !",
      numero    : numero,
      lienDrive : cleanUrl
    };

  } catch(e) {
    console.error("processUpload : " + e);
    return { success: false, message: "Erreur technique. Veuillez réessayer." };
  }
}


// ============================================================
// DASHBOARD
// ============================================================
function getDashboardStats() {
  try {
    const sheet      = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const data       = sheet.getDataRange().getValues();
    const aujourdhui = new Date(); aujourdhui.setHours(0,0,0,0);
    const limite30j  = new Date(); limite30j.setDate(aujourdhui.getDate() + 30);

    const stats = { total:0, aValider:0, perimes:0, alertes:0,
                    docsAValider:[], docsPerimes:[], docsAlertes:[] };
    stats.total = data.length - 1;

    for (let i = 1; i < data.length; i++) {
      const numero   = data[i][1];
      const url      = data[i][6];
      const statut   = data[i][8];
      const echeance = data[i][15];

      if (statut === "En attente") {
        stats.aValider++;
        stats.docsAValider.push({ numero, ligne: i + 1, url });
      }
      if (echeance instanceof Date) {
        const d = new Date(echeance.getTime()); d.setHours(0,0,0,0);
        if (d < aujourdhui)      { stats.perimes++; stats.docsPerimes.push({ numero, ligne: i+1, url }); }
        else if (d <= limite30j) { stats.alertes++; stats.docsAlertes.push({ numero, ligne: i+1, url }); }
      }
    }
    return stats;
  } catch(e) {
    console.error("getDashboardStats : " + e);
    return { error: "Erreur lors du chargement des statistiques." };
  }
}

function getDernieresActivites() {
  try {
    const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];

    const debut = Math.max(2, lastRow - 14);
    const rows  = sheet.getRange(debut, 1, lastRow - debut + 1, 12).getValues();

    return rows
      .filter(r => r[0] && r[1])
      .reverse()
      .map(r => ({
        ts       : r[0] instanceof Date ? r[0].getTime() : null,
        numero   : r[1]  || "—",
        agent    : r[3]  || "—",
        service  : r[4]  || "—",
        categorie: r[5]  || "—",
        titre    : r[11] || "Sans titre",
        statut   : r[8]  || ""
      }));
  } catch(e) {
    console.error("getDernieresActivites : " + e);
    return [];
  }
}


// ============================================================
// RECHERCHE
// ============================================================
function executerRecherche(query, agentConnecte) {
  const LIMITE = 100;
  const BLOC   = 500;
  const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const isAdmin  = agentConnecte.role.toLowerCase() === "admin";
  const resultats = [];

  for (let debut = 2; debut <= lastRow && resultats.length < LIMITE; debut += BLOC) {
    const fin  = Math.min(debut + BLOC - 1, lastRow);
    const rows = sheet.getRange(debut, 1, fin - debut + 1, 16).getValues();

    for (const row of rows) {
      if (resultats.length >= LIMITE) break;
      if (!isAdmin && row[4] !== agentConnecte.service) continue;

      if (query.numero) {
        const n = query.numero.toLowerCase();
        if (!row[1].toString().toLowerCase().includes(n) &&
            !row[3].toString().toLowerCase().includes(n)) continue;
      }
      if (query.titre     && !row[11].toString().toLowerCase().includes(query.titre.toLowerCase())) continue;
      if (query.service   && row[4] !== query.service)   continue;
      if (query.categorie && row[5] !== query.categorie) continue;
      if (query.statut    && row[8] !== query.statut)    continue;

      if (query.dateFiltre) {
        try {
          const dateDoc = new Date(row[0]);
          const dDebut  = new Date(query.dateFiltre); dDebut.setHours(0,0,0,0);
          const dFin    = new Date(query.dateFiltre); dFin.setHours(23,59,59,999);
          if (dateDoc < dDebut || dateDoc > dFin) continue;
        } catch(e) {}
      }

      let lien = row[6] || "";
      if (lien.includes("drive.google.com")) {
        const m = lien.match(/[-\w]{25,}/);
        if (m) lien = "https://drive.google.com/file/d/" + m[0] + "/preview";
      }
      resultats.push({
        numero   : row[1],
        agent    : row[3],
        service  : row[4],
        categorie: row[5],
        lien,
        statut   : row[8],
        titre    : row[11] || "Sans Titre"
      });
    }
  }
  return resultats;
}


// ============================================================
// ARCHIVES
// ============================================================
function obtenirArchivesHistorique() {
  const LIMITE  = 100;
  const BLOC    = 500;
  const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const resultats = [];

  for (let fin = lastRow; fin >= 2 && resultats.length < LIMITE; fin -= BLOC) {
    const debut = Math.max(fin - BLOC + 1, 2);
    const rows  = sheet.getRange(debut, 1, fin - debut + 1, 16).getValues();

    for (let i = rows.length - 1; i >= 0 && resultats.length < LIMITE; i--) {
      const row    = rows[i];
      if (!row[8]) continue;
      const statut = row[8].toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
      if (statut !== "valide") continue;

      let lien = row[6] || "";
      if (lien.includes("drive.google.com")) {
        const m = lien.match(/[-\w]{25,}/);
        if (m) lien = "https://drive.google.com/file/d/" + m[0] + "/preview";
      }
      resultats.push({
        numero        : row[1],
        agent         : row[3],
        service       : row[4],
        categorie     : row[5],
        lien,
        dateValidation: row[9] instanceof Date
                        ? Utilities.formatDate(row[9], CONFIG.TIMEZONE, "dd/MM/yyyy") : row[9],
        titre         : row[11] || "Sans Titre",
        dua           : row[12],
        sortFinal     : row[13],
        echeance      : row[15] instanceof Date
                        ? Utilities.formatDate(row[15], CONFIG.TIMEZONE, "dd/MM/yyyy") : row[15]
      });
    }
  }
  return resultats;
}


// ============================================================
// VALIDATION DOCUMENT
// Note : Le calcul automatique des dates d'élimination est en v2
// ============================================================
function validerDocument(numeroDocRecu) {
  try {
    const cible = (numeroDocRecu || "").toString().trim();
    if (!cible) return "❌ Numéro invalide.";

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const data  = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1].toString().trim() === cible) {
        sheet.getRange(i + 1, 9).setValue("Validé");
        sheet.getRange(i + 1, 10).setValue(new Date());
        SpreadsheetApp.flush();
        return "✅ Document " + cible + " validé avec succès.";
      }
    }
    return "❌ Numéro " + cible + " introuvable.";
  } catch(e) {
    console.error("validerDocument : " + e);
    return "❌ Erreur technique. Veuillez réessayer.";
  }
}

function traiterActionDocument(numero, typeAction) {
  try {
    if (!numero || !typeAction) return "❌ Paramètres manquants.";

    const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const donnees = feuille.getDataRange().getValues();

    for (let i = 1; i < donnees.length; i++) {
      if (donnees[i][1] != numero) continue;

      const ligne = i + 1;

      if (typeAction === "valider") {
        feuille.getRange(ligne, 9).setValue("Validé");
        feuille.getRange(ligne, 10).setValue(new Date());
        // TODO v2 : calcul automatique de la date d'élimination selon la DUA

      } else if (typeAction === "trier") {
        feuille.getRange(ligne, 16).setValue("Archivé");

      } else if (typeAction === "detruire") {
        feuille.getRange(ligne, 16).setValue("Détruit");
        feuille.hideRows(ligne);

      } else {
        return "❌ Action non reconnue.";
      }

      SpreadsheetApp.flush();
      return "Document " + numero + " traité avec succès.";
    }
    return "Document non trouvé.";
  } catch(e) {
    console.error("traiterActionDocument : " + e);
    return "❌ Erreur technique. Veuillez réessayer.";
  }
}


// ============================================================
// ADMINISTRATION — AGENTS
// ============================================================
function ajouterAgentComplet(data) {
  try {
    if (!data.nom || !data.email) {
      return { success: false, message: "Nom et email obligatoires." };
    }

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Agents");
    if (!sheet) throw new Error("Feuille 'Agents' introuvable.");

    const emailSaisi = data.email.trim().toLowerCase();
    const valeurs    = sheet.getDataRange().getValues();

    for (let i = 1; i < valeurs.length; i++) {
      const emailExist = valeurs[i][4] ? valeurs[i][4].toString().trim().toLowerCase() : "";
      if (emailExist === emailSaisi) {
        return { success: false, message: "⚠️ Cet email est déjà utilisé." };
      }
    }

    const code       = "AG-" + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "HHmmss");
    const ligneCible = sheet.getLastRow() + 1;
    sheet.getRange(ligneCible, 1, 1, 6).setValues([[
      data.nom, code, "Actif", data.service, emailSaisi, data.role
    ]]);
    SpreadsheetApp.flush();

    return { success: true, message: "✅ Agent enregistré ! Code : " + code };
  } catch(e) {
    console.error("ajouterAgentComplet : " + e);
    return { success: false, message: "❌ Erreur serveur." };
  }
}

function getListeAgents() {
  const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Agents");
  const values = sheet.getDataRange().getValues();
  return values.slice(1).filter(row => row[0] !== "" && row[1] !== "");
}

function modifierStatut(code) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Agents");
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1].toString() === code.toString()) {
      sheet.getRange(i + 1, 3).setValue(data[i][2] === "Actif" ? "Inactif" : "Actif");
      return "OK";
    }
  }
}

function modifierRole(code) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Agents");
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1].toString() === code.toString()) {
      sheet.getRange(i + 1, 6).setValue(data[i][5] === "Admin" ? "User" : "Admin");
      return "OK";
    }
  }
}


// ============================================================
// ADMINISTRATION — SERVICES & CATÉGORIES
// ============================================================
function ajouterServiceApp(valeur) {
  try {
    const ss  = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("SERVICES");
    if (!sheet) {
      sheet = ss.insertSheet("SERVICES");
      sheet.getRange(1, 1).setValue("NOM DU SERVICE");
    }
    const existants = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues().flat();
    if (existants.includes(valeur)) return "⚠️ Le service '" + valeur + "' existe déjà.";
    sheet.getRange(sheet.getLastRow() + 1, 1).setValue(valeur);
    SpreadsheetApp.flush();
    return "✅ Service '" + valeur + "' ajouté !";
  } catch(e) {
    console.error("ajouterServiceApp : " + e);
    return "❌ Erreur lors de l'ajout du service.";
  }
}

function ajouterElementApp(type, valeur) {
  if (!valeur || valeur.trim() === "") return "⚠️ Valeur vide.";
  if (type === "Service") return ajouterServiceApp(valeur.trim());
  return "⚠️ Type non reconnu. Utilisez ajouterCategorieApp() pour les catégories.";
}

function ajouterCategorieApp(nom, dua, sort) {
  try {
    if (!nom || !dua || !sort) return "⚠️ Nom, DUA et sort final sont obligatoires.";
    const sheetDUA = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Référence DUA");
    sheetDUA.getRange(sheetDUA.getLastRow() + 1, 1, 1, 3).setValues([[nom, dua, sort]]);
    SpreadsheetApp.flush();
    return "✅ Catégorie '" + nom + "' ajoutée !";
  } catch(e) {
    console.error("ajouterCategorieApp : " + e);
    return "❌ Erreur lors de l'ajout de la catégorie.";
  }
}


// ============================================================
// BORDEREAUX
// ============================================================
function enregistrerBordereau(data) {
  try {
    const ss  = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("BORDEREAUX");
    if (!sheet) {
      sheet = ss.insertSheet("BORDEREAUX");
      sheet.getRange(1, 1, 1, 9).setValues([[
        "Date","Num Bordereau","Type","Agent","Service",
        "Num LIKOAM","Titre","Catégorie","Motif"
      ]]);
      sheet.setFrozenRows(1);
    }
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, 9).setValues([[
      new Date(),
      data.numBordereau || "",
      data.type         || "versement",
      data.agent        || "",
      data.service      || "",
      data.numLikoam    || "",
      data.titre        || "",
      data.categorie    || "",
      data.motif        || ""
    ]]);
    SpreadsheetApp.flush();
    return { success: true };
  } catch(e) {
    console.error("enregistrerBordereau : " + e);
    return { success: false, message: e.toString() };
  }
}

function getBordereaux(agent, type) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("BORDEREAUX");
    if (!sheet || sheet.getLastRow() <= 1) return [];

    const data    = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
    const isAdmin = (agent.role || "").toLowerCase() === "admin";

    return data
      .filter(r => {
        if (!r[0]) return false;
        if (type && r[2] !== type) return false;
        if (!isAdmin && r[3] !== agent.nom) return false;
        return true;
      })
      .reverse()
      .slice(0, 50)
      .map(r => ({
        date         : r[0] instanceof Date ? Utilities.formatDate(r[0], CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm") : r[0],
        numBordereau : r[1],
        type         : r[2],
        agent        : r[3],
        service      : r[4],
        numLikoam    : r[5],
        titre        : r[6],
        categorie    : r[7],
        motif        : r[8]
      }));
  } catch(e) {
    console.error("getBordereaux : " + e);
    return [];
  }
}


// ============================================================
// TRIGGER onEdit
// ============================================================
function onEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getIndex() === 1 && range.getColumn() === 9) {
    if (range.getValue().toString().toLowerCase() === "validé") {
      sheet.getRange(range.getRow(), 10).setValue(new Date());
      SpreadsheetApp.flush();
    }
  }
}
