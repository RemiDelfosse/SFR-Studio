# Sprint Management Extension v2.0.3

Extension Chrome unifiée pour Jira + SharePoint + Proxy Supabase

## 🚀 Installation

### Étape 1 : Charger l'extension dans Chrome

1. Ouvrez Chrome et allez sur `chrome://extensions/`
2. Activez le **"Mode développeur"** (toggle en haut à droite)
3. Cliquez sur **"Charger l'extension non empaquetée"**
4. Sélectionnez le dossier `/extension` de ce projet
5. L'extension devrait apparaître avec le nom **"Sprint Management Extension"**

### Étape 2 : Vérifier l'ID de l'extension

Après installation, notez l'**ID de l'extension** affiché sous le nom (ex: `iodlhpnaianlinbdfmjfcdgcmhhjpkhh`)

### Étape 3 : Configurer pour votre domaine Figma Make

Le `manifest.json` a été pré-configuré pour :
- ✅ `https://*.supabase.co/*` (domaines Figma Make)
- ✅ `https://studio-sprint-management.figma.site/*` (domaine original)

Si votre app tourne sur un autre domaine, modifiez le `manifest.json` :

```json
"content_scripts": [
  {
    "matches": [
      "https://studio-sprint-management.figma.site/*",
      "https://*.supabase.co/*",
      "VOTRE_DOMAINE_ICI/*"
    ],
    "js": ["content.js"],
    "run_at": "document_start"
  }
],
"web_accessible_resources": [
  {
    "resources": ["injected.js"],
    "matches": [
      "https://studio-sprint-management.figma.site/*",
      "https://*.supabase.co/*",
      "VOTRE_DOMAINE_ICI/*"
    ]
  }
]
```

### Étape 4 : Recharger l'extension

Après toute modification du `manifest.json` :
1. Retournez sur `chrome://extensions/`
2. Trouvez "Sprint Management Extension"
3. Cliquez sur le bouton **🔄 Recharger**

### Étape 5 : Tester

1. Ouvrez votre application Figma Make
2. Ouvrez la console (F12)
3. Vous devriez voir : `✅ Extension Sprint Management détectée !`

## 📡 API exposée

L'extension injecte `window.SprintManagementExtension` avec :

### API Jira

```javascript
// Login (teste les credentials)
await window.SprintManagementExtension.jira.login(
  'https://jira.private.sfr.com',
  'username',
  'password'
);

// Requête générique
await window.SprintManagementExtension.jira.request(
  'https://jira.private.sfr.com/rest/api/2/search?jql=...',
  'username',
  'password',
  'GET',
  null
);

// Récupérer des issues
await window.SprintManagementExtension.jira.getIssues(
  'https://jira.private.sfr.com',
  'username',
  'password',
  'project = ABC',
  100
);
```

### API SharePoint

```javascript
await window.SprintManagementExtension.sharepoint.testConnection();
await window.SprintManagementExtension.sharepoint.listFiles('/path');
```

### API Proxy (pour Supabase, etc.)

```javascript
const response = await window.SprintManagementExtension.proxy.fetch(
  'https://api.example.com/data',
  {
    method: 'GET',
    headers: { 'Authorization': 'Bearer token' }
  }
);
```

### Ping

```javascript
const isActive = await window.SprintManagementExtension.ping();
console.log('Extension active:', isActive);
```

## 🔧 Architecture

```
┌─────────────────┐
│   Page Web      │
│   (React App)   │
└────────┬────────┘
         │ window.SprintManagementExtension.jira.request()
         ↓
┌─────────────────┐
│  injected.js    │ ← Injecté dans la page, crée l'objet window
│  (Page Context) │
└────────┬────────┘
         │ window.postMessage({ type: 'JIRA_REQUEST_FROM_PAGE' })
         ↓
┌─────────────────┐
│  content.js     │ ← Content script, fait le pont
│  (Isolated)     │
└────────┬────────┘
         │ chrome.runtime.sendMessage({ type: 'JIRA_REQUEST' })
         ↓
┌─────────────────┐
│  background.js  │ ← Service Worker, fait les requêtes fetch
│  (Background)   │    avec credentials et permissions
└─────────────────┘
```

## 🛠️ Dépannage

### L'extension n'est pas détectée

1. ✅ Vérifiez que l'extension est **activée** dans `chrome://extensions/`
2. ✅ Vérifiez que votre domaine est dans `content_scripts.matches[]`
3. ✅ **Rechargez l'extension** après toute modification
4. ✅ **Rechargez la page** après avoir rechargé l'extension
5. ✅ Ouvrez la console et cherchez les logs

### L'extension est détectée mais les appels échouent

1. Vérifiez que le domaine Jira est dans `host_permissions[]`
2. Vérifiez vos credentials Jira
3. Ouvrez la console du background script :
   - `chrome://extensions/`
   - Cliquez sur "Service Worker" sous l'extension
   - Regardez les logs d'erreur

## 📝 Permissions requises

```json
"permissions": [
  "storage",     // Pour sauvegarder les timestamps
  "cookies",     // Pour SharePoint (session cookies)
  "activeTab"    // Pour accéder à l'onglet actif
],
"host_permissions": [
  "https://jira.private.sfr.com/*",
  "https://*.sharepoint.com/*",
  "https://*.supabase.co/*"
]
```

## 🔐 Sécurité

- ⚠️ Les credentials sont **transmis en clair** dans les messages
- ⚠️ Utilisez uniquement sur un **réseau sécurisé interne**
- ⚠️ Ne partagez pas l'extension avec des credentials en dur

## 📦 Version

**v2.0.3** - Extension unifiée Jira + SharePoint + Proxy