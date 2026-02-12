// Sprint Management Extension - Popup Script

// ==================== ELEMENTS ====================

const jiraStatus = document.getElementById('jira-status');
const jiraUrl = document.getElementById('jira-url');
const jiraLastCall = document.getElementById('jira-last-call');
const btnTestJira = document.getElementById('btn-test-jira');
const btnOpenJira = document.getElementById('btn-open-jira');

const sharepointStatus = document.getElementById('sharepoint-status');
const sharepointCookies = document.getElementById('sharepoint-cookies');
const sharepointLastCall = document.getElementById('sharepoint-last-call');
const btnTestSharePoint = document.getElementById('btn-test-sharepoint');
const btnOpenSharePoint = document.getElementById('btn-open-sharepoint');

const versionElement = document.getElementById('version');

// ==================== ERROR FORMATTING ====================

/**
 * Transformer les erreurs techniques en messages user-friendly avec instructions
 */
function formatErrorMessage(error, service) {
  const errorStr = String(error).toLowerCase();
  
  // Erreurs SharePoint
  if (service === 'sharepoint') {
    // 403 Unauthorized
    if (errorStr.includes('403') || errorStr.includes('unauthorized') || errorStr.includes('unauthenticated')) {
      return {
        title: 'Non connecté à SharePoint',
        message: 'Vous devez être connecté à SharePoint pour accéder aux données.',
        action: 'Cliquez sur "Ouvrir SharePoint" ci-dessous, connectez-vous, puis réessayez.'
      };
    }
    
    // 401 Authentication required
    if (errorStr.includes('401')) {
      return {
        title: 'Session expirée',
        message: 'Votre session SharePoint a expiré.',
        action: 'Reconnectez-vous à SharePoint puis réessayez.'
      };
    }
    
    // 404 Not Found
    if (errorStr.includes('404')) {
      return {
        title: 'Ressource introuvable',
        message: 'Le dossier ou fichier demandé n\'existe pas sur SharePoint.',
        action: 'Vérifiez le chemin dans votre configuration.'
      };
    }
    
    // Network errors
    if (errorStr.includes('network') || errorStr.includes('fetch')) {
      return {
        title: 'Erreur réseau',
        message: 'Impossible de contacter SharePoint.',
        action: 'Vérifiez votre connexion réseau et réessayez.'
      };
    }
  }
  
  // Erreurs Jira
  if (service === 'jira') {
    if (errorStr.includes('401') || errorStr.includes('unauthorized')) {
      return {
        title: 'Non authentifié',
        message: 'Vos identifiants Jira sont incorrects ou expirés.',
        action: 'Vérifiez vos identifiants dans l\'application.'
      };
    }
    
    if (errorStr.includes('403')) {
      return {
        title: 'Accès refusé',
        message: 'Vous n\'avez pas les permissions nécessaires.',
        action: 'Contactez votre administrateur Jira.'
      };
    }
    
    if (errorStr.includes('network') || errorStr.includes('fetch')) {
      return {
        title: 'Erreur réseau',
        message: 'Impossible de contacter Jira.',
        action: 'Vérifiez que vous êtes sur le réseau SFR.'
      };
    }
  }
  
  // Erreur générique
  return {
    title: 'Erreur',
    message: String(error),
    action: 'Réessayez ou contactez le support.'
  };
}

// ==================== STATUS HELPERS ====================

/**
 * Mettre à jour le statut d'un service avec icône et message
 */
function setStatus(element, status, message, errorDetails = null) {
  element.className = 'status-' + status;
  
  let icon = '';
  if (status === 'ok') icon = '✅';
  else if (status === 'error') icon = '❌';
  else if (status === 'warning') icon = '⚠️';
  else if (status === 'loading') icon = '⏳';
  
  element.textContent = icon + ' ' + message;
  
  // Afficher les détails de l'erreur si disponibles
  if (errorDetails && status === 'error') {
    element.title = `${errorDetails.message}\n\n${errorDetails.action}`;
  }
}

/**
 * Formater une date ISO en format lisible
 */
function formatDate(isoString) {
  if (!isoString) return 'Jamais';
  
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  
  return date.toLocaleString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

// ==================== JIRA FUNCTIONS ====================

/**
 * Vérifier le statut Jira
 */
async function checkJiraStatus() {
  try {
    // Récupérer la dernière URL Jira utilisée
    const storage = await chrome.storage.local.get(['jira_url', 'jira_last_call']);
    
    if (storage.jira_url) {
      jiraUrl.textContent = storage.jira_url;
    }
    
    if (storage.jira_last_call) {
      jiraLastCall.textContent = formatDate(storage.jira_last_call);
      setStatus(jiraStatus, 'ok', 'Connecté');
    } else {
      setStatus(jiraStatus, 'warning', 'Aucun appel effectué');
    }
    
  } catch (error) {
    console.error('Erreur lors de la vérification Jira:', error);
    setStatus(jiraStatus, 'error', 'Erreur de vérification');
  }
}

/**
 * Tester la connexion Jira
 */
async function testJira() {
  setStatus(jiraStatus, 'loading', 'Test en cours...');
  btnTestJira.disabled = true;
  
  try {
    const jiraUrl = 'https://jira.private.sfr.com';
    
    // Envoyer la requête au background script
    const response = await chrome.runtime.sendMessage({
      type: 'JIRA_REQUEST',
      payload: {
        url: `${jiraUrl}/rest/api/2/myself`,
        username: '', // Pas de username
        password: '', // Pas de password (utilise les cookies)
        method: 'GET'
      }
    });
    
    if (response.success) {
      setStatus(jiraStatus, 'ok', `✅ Connecté (${response.data.displayName})`);
      await chrome.storage.local.set({ jira_url: jiraUrl });
      await checkJiraStatus();
    } else {
      const formattedError = formatErrorMessage(response.error, 'jira');
      setStatus(jiraStatus, 'error', `❌ ${formattedError.title}`, formattedError);
    }
    
  } catch (error) {
    console.error('Erreur test Jira:', error);
    setStatus(jiraStatus, 'error', '❌ Erreur lors du test');
  } finally {
    btnTestJira.disabled = false;
  }
}

/**
 * Ouvrir Jira dans un nouvel onglet
 */
function openJira() {
  chrome.tabs.create({ url: 'https://jira.private.sfr.com' });
}

// ==================== SHAREPOINT FUNCTIONS ====================

/**
 * Vérifier le statut SharePoint
 */
async function checkSharePointStatus() {
  try {
    // Vérifier les cookies SharePoint
    const cookies = await chrome.cookies.getAll({ domain: '.sharepoint.com' });
    sharepointCookies.textContent = `${cookies.length} cookie(s)`;
    
    // Récupérer la dernière date d'appel
    const storage = await chrome.storage.local.get(['sharepoint_last_call']);
    
    if (storage.sharepoint_last_call) {
      sharepointLastCall.textContent = formatDate(storage.sharepoint_last_call);
      setStatus(sharepointStatus, 'ok', 'Connecté');
    } else if (cookies.length > 0) {
      setStatus(sharepointStatus, 'warning', 'Prêt (non testé)');
    } else {
      const errorDetails = {
        title: 'Non connecté à SharePoint',
        message: 'Aucun cookie SharePoint trouvé.',
        action: 'Cliquez sur "Ouvrir SharePoint" pour vous connecter.'
      };
      setStatus(sharepointStatus, 'error', 'Non connecté', errorDetails);
    }
    
  } catch (error) {
    console.error('Erreur lors de la vérification SharePoint:', error);
    const errorDetails = {
      title: 'Erreur de vérification',
      message: 'Impossible de vérifier le statut SharePoint.',
      action: 'Rechargez l\'extension ou consultez la console.'
    };
    setStatus(sharepointStatus, 'error', 'Erreur de vérification', errorDetails);
  }
}

/**
 * Tester la connexion SharePoint
 */
async function testSharePoint() {
  setStatus(sharepointStatus, 'loading', 'Test en cours...');
  btnTestSharePoint.disabled = true;
  
  try {
    // Envoyer la requête au background script
    const response = await chrome.runtime.sendMessage({
      type: 'SHAREPOINT_REQUEST',
      payload: {
        endpoint: '/sites/DWVD/_api/web/lists',
        method: 'GET'
      }
    });
    
    if (response.success) {
      setStatus(sharepointStatus, 'ok', '✅ Connexion réussie');
      await checkSharePointStatus();
    } else {
      const formattedError = formatErrorMessage(response.error, 'sharepoint');
      setStatus(sharepointStatus, 'error', `❌ ${formattedError.title}`, formattedError);
    }
    
  } catch (error) {
    console.error('Erreur test SharePoint:', error);
    setStatus(sharepointStatus, 'error', '❌ Erreur lors du test');
  } finally {
    btnTestSharePoint.disabled = false;
  }
}

/**
 * Ouvrir SharePoint dans un nouvel onglet
 */
function openSharePoint() {
  chrome.tabs.create({ url: 'https://globaltelko.sharepoint.com/sites/DWVD' });
}

// ==================== INITIALIZATION ====================

async function init() {
  // Vérifier les statuts au chargement
  await Promise.all([
    checkJiraStatus(),
    checkSharePointStatus()
  ]);
  
  // Afficher la version de l'extension
  const manifest = chrome.runtime.getManifest();
  versionElement.textContent = `v${manifest.version}`;
}

// ==================== EVENT LISTENERS ====================

btnTestJira.addEventListener('click', testJira);
btnOpenJira.addEventListener('click', openJira);

btnTestSharePoint.addEventListener('click', testSharePoint);
btnOpenSharePoint.addEventListener('click', openSharePoint);

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', init);