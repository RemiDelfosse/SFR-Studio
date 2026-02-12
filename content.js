// Content script pour Sprint Management Extension v2.0.3
// Fait le pont entre la page web et le background script

// ==================== INJECTION DU SCRIPT ====================

// Injecter le script dans le contexte de la page
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// ==================== MESSAGING JIRA ====================

// Écouter les messages de la page pour les requêtes Jira
window.addEventListener('message', function(event) {
  if (event.source !== window) return;
  
  if (event.data.type === 'JIRA_REQUEST_FROM_PAGE') {
    chrome.runtime.sendMessage({
      type: 'JIRA_REQUEST',
      payload: event.data.payload
    }, function(response) {
      window.postMessage({
        type: 'JIRA_RESPONSE_TO_PAGE',
        requestId: event.data.requestId,
        response: response
      }, '*');
    });
  }
});

// ==================== MESSAGING SHAREPOINT ====================

// Écouter les messages de la page pour les requêtes SharePoint
window.addEventListener('message', function(event) {
  if (event.source !== window) return;
  
  if (event.data.type === 'SHAREPOINT_REQUEST_FROM_PAGE') {
    chrome.runtime.sendMessage({
      type: 'SHAREPOINT_REQUEST',
      payload: event.data.payload
    }, function(response) {
      window.postMessage({
        type: 'SHAREPOINT_RESPONSE_TO_PAGE',
        requestId: event.data.requestId,
        response: response
      }, '*');
    });
  }
});

// ==================== MESSAGING PROXY ====================

// Écouter les messages de la page pour les requêtes Proxy génériques
window.addEventListener('message', function(event) {
  if (event.source !== window) return;
  
  if (event.data.type === 'PROXY_REQUEST_FROM_PAGE') {
    chrome.runtime.sendMessage({
      type: 'PROXY_REQUEST',
      payload: event.data.payload
    }, function(response) {
      window.postMessage({
        type: 'PROXY_RESPONSE_TO_PAGE',
        requestId: event.data.requestId,
        response: response
      }, '*');
    });
  }
});

// ==================== PING/PONG ====================

// Gérer le ping
window.addEventListener('message', function(event) {
  if (event.source !== window) return;
  
  if (event.data.type === 'SPRINT_EXTENSION_PING') {
    window.postMessage({ type: 'SPRINT_EXTENSION_PONG' }, '*');
  }
});

// Notifier la page que l'extension est prête
window.postMessage({ type: 'SPRINT_EXTENSION_READY' }, '*');

// Envoyer une seconde notification après 1 seconde (au cas où la première est manquée)
setTimeout(() => {
  window.postMessage({ type: 'SPRINT_EXTENSION_READY' }, '*');
}, 1000);
