// Sprint Management Extension - Injected Script
// Expose l'API unifiée sur window.SprintManagementExtension

(function() {
  'use strict';
  
  let requestIdCounter = 0;

  // ==================== API JIRA ====================

  const JiraAPI = {
    // Faire une requête Jira générique
    request: function(url, username, password, method = 'GET', body = null) {
      return new Promise((resolve, reject) => {
        const requestId = ++requestIdCounter;

        const handler = (event) => {
          if (event.data.type === 'JIRA_RESPONSE_TO_PAGE' && event.data.requestId === requestId) {
            window.removeEventListener('message', handler);
            
            if (event.data.response.success) {
              resolve(event.data.response.data);
            } else {
              reject(new Error(event.data.response.error || 'Request failed'));
            }
          }
        };

        window.addEventListener('message', handler);

        window.postMessage({
          type: 'JIRA_REQUEST_FROM_PAGE',
          requestId,
          payload: { url, username, password, method, body }
        }, '*');
      });
    },

    // Login Jira (teste les credentials)
    login: async function(jiraUrl, username, password) {
      const url = `${jiraUrl}/rest/api/2/myself`;
      return await this.request(url, username, password);
    },

    // Récupérer les issues d'un sprint
    getIssues: async function(jiraUrl, username, password, jql, maxResults = 100) {
      const encodedJql = encodeURIComponent(jql);
      const url = `${jiraUrl}/rest/api/2/search?jql=${encodedJql}&maxResults=${maxResults}&fields=summary,status,assignee,issuetype,priority,customfield_10016`;
      return await this.request(url, username, password);
    },

    // Récupérer une issue par clé
    getIssue: async function(jiraUrl, username, password, issueKey) {
      const url = `${jiraUrl}/rest/api/2/issue/${issueKey}`;
      return await this.request(url, username, password);
    },

    // Ajouter un commentaire
    addComment: async function(jiraUrl, username, password, issueKey, commentText) {
      const url = `${jiraUrl}/rest/api/2/issue/${issueKey}/comment`;
      const body = { body: commentText };
      return await this.request(url, username, password, 'POST', body);
    },

    // Récupérer les transitions disponibles
    getTransitions: async function(jiraUrl, username, password, issueKey) {
      const url = `${jiraUrl}/rest/api/2/issue/${issueKey}/transitions`;
      return await this.request(url, username, password);
    },

    // Effectuer une transition
    transitionIssue: async function(jiraUrl, username, password, issueKey, transitionId) {
      const url = `${jiraUrl}/rest/api/2/issue/${issueKey}/transitions`;
      const body = { transition: { id: transitionId } };
      return await this.request(url, username, password, 'POST', body);
    },

    // Récupérer les boards
    getBoards: async function(jiraUrl, username, password) {
      const url = `${jiraUrl}/rest/agile/1.0/board`;
      return await this.request(url, username, password);
    },

    // Récupérer les sprints d'un board
    getSprints: async function(jiraUrl, username, password, boardId) {
      const url = `${jiraUrl}/rest/agile/1.0/board/${boardId}/sprint`;
      return await this.request(url, username, password);
    }
  };

  // ==================== API SHAREPOINT ====================

  const SharePointAPI = {
    // Faire une requête SharePoint générique
    request: function(endpoint, method = 'GET', body = null, binaryResponse = false) {
      return new Promise((resolve, reject) => {
        const requestId = ++requestIdCounter;

        const handler = (event) => {
          if (event.data.type === 'SHAREPOINT_RESPONSE_TO_PAGE' && event.data.requestId === requestId) {
            window.removeEventListener('message', handler);
            
            if (event.data.response.success) {
              resolve(event.data.response.data);
            } else {
              reject(new Error(event.data.response.error || 'Request failed'));
            }
          }
        };

        window.addEventListener('message', handler);

        window.postMessage({
          type: 'SHAREPOINT_REQUEST_FROM_PAGE',
          requestId,
          payload: { endpoint, method, body, binaryResponse }
        }, '*');
      });
    },

    // Tester la connexion SharePoint
    testConnection: async function() {
      const endpoint = '/sites/DWVD/_api/web/lists';
      const data = await this.request(endpoint);
      return data.d || data;
    },

    // Lister les fichiers d'un dossier
    listFiles: async function(folderPath) {
      const encodedPath = encodeURIComponent(folderPath);
      const endpoint = `/sites/DWVD/_api/web/GetFolderByServerRelativeUrl('${encodedPath}')/Files`;
      const data = await this.request(endpoint);
      return data.d || data;
    },

    // Télécharger un fichier
    downloadFile: async function(filePath) {
      const encodedPath = encodeURIComponent(filePath);
      const endpoint = `/sites/DWVD/_api/web/GetFileByServerRelativeUrl('${encodedPath}')/$value`;
      return await this.request(endpoint, 'GET', null, true);
    }
  };

  // ==================== API PROXY GÉNÉRIQUE (pour Supabase, etc.) ====================

  const ProxyAPI = {
    // Faire une requête HTTP générique via l'extension
    // Utile pour contourner les proxys réseau qui bloquent certains services (ex: Supabase)
    fetch: function(url, options = {}) {
      return new Promise((resolve, reject) => {
        const requestId = ++requestIdCounter;

        const handler = (event) => {
          if (event.data.type === 'PROXY_RESPONSE_TO_PAGE' && event.data.requestId === requestId) {
            window.removeEventListener('message', handler);
            
            if (event.data.response.success) {
              // Retourner un objet compatible avec l'API Fetch
              resolve({
                ok: event.data.response.ok,
                status: event.data.response.status,
                statusText: event.data.response.statusText,
                headers: event.data.response.headers,
                json: async () => event.data.response.data,
                text: async () => JSON.stringify(event.data.response.data)
              });
            } else {
              reject(new Error(event.data.response.error || 'Request failed'));
            }
          }
        };

        window.addEventListener('message', handler);

        window.postMessage({
          type: 'PROXY_REQUEST_FROM_PAGE',
          requestId,
          payload: { url, options }
        }, '*');
      });
    }
  };

  // ==================== API PUBLIQUE UNIFIÉE ====================

  window.SprintManagementExtension = {
    version: '2.0.3',
    
    // API Jira
    jira: JiraAPI,
    
    // API SharePoint
    sharepoint: SharePointAPI,

    // API Proxy générique
    proxy: ProxyAPI,

    // Ping pour vérifier que l'extension est active
    ping: function() {
      return new Promise((resolve) => {
        const handler = (event) => {
          if (event.data.type === 'SPRINT_EXTENSION_PONG') {
            window.removeEventListener('message', handler);
            resolve(true);
          }
        };
        
        window.addEventListener('message', handler);
        window.postMessage({ type: 'SPRINT_EXTENSION_PING' }, '*');
        
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve(false);
        }, 1000);
      });
    }
  };

  // Notifier l'application que l'extension est prête
  window.dispatchEvent(new CustomEvent('sprint-extension-ready', { 
    detail: { version: '2.0.3' } 
  }));

})();
