// Background script pour Sprint Management Extension v2.0.3
// Gère les requêtes Jira et SharePoint avec les credentials/cookies

// ==================== JIRA API ====================

async function handleJiraRequest(request) {
  const { url, username, password, method = 'GET', body } = request;
  
  try {
    // Préparer les headers de base
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // ⚠️ CORRECTIF: N'ajouter Basic Auth QUE si username/password sont fournis
    // Sinon, on utilise les cookies de session web Jira (credentials: 'include')
    if (username && password) {
      const auth = 'Basic ' + btoa(`${username}:${password}`);
      headers['Authorization'] = auth;
    }
    
    const options = {
      method,
      headers,
      credentials: 'include' // Inclure les cookies pour la session web
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Background] Jira error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // Sauvegarder la date du dernier appel
    await chrome.storage.local.set({ 
      jira_last_call: new Date().toISOString() 
    });

    return { success: true, data };

  } catch (error) {
    console.error('[Background] Jira request failed:', error);
    return { 
      success: false, 
      error: error.message || 'Network error' 
    };
  }
}

// ==================== SHAREPOINT API ====================

async function handleSharePointRequest(request) {
  const { endpoint, method = 'GET', body, binaryResponse = false } = request;
  
  // URL de base SharePoint
  const baseUrl = 'https://globaltelko.sharepoint.com';
  const fullUrl = `${baseUrl}${endpoint}`;
  
  try {
    // Récupérer tous les cookies SharePoint
    const cookies = await chrome.cookies.getAll({ domain: '.sharepoint.com' });
    
    if (cookies.length === 0) {
      console.warn('[Background] No SharePoint cookies found - user might not be authenticated');
    }

    // Construire le header Cookie
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    const options = {
      method,
      headers: {
        'Accept': 'application/json;odata=verbose',
        'Content-Type': 'application/json;odata=verbose',
        'Cookie': cookieHeader
      },
      credentials: 'include'
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(fullUrl, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Background] SharePoint error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    let data;
    if (binaryResponse) {
      // Pour le téléchargement de fichiers
      const arrayBuffer = await response.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      data = base64;
    } else {
      // Pour les requêtes JSON normales
      data = await response.json();
    }
    
    // Sauvegarder la date du dernier appel
    await chrome.storage.local.set({ 
      sharepoint_last_call: new Date().toISOString() 
    });

    return { success: true, data };

  } catch (error) {
    console.error('[Background] SharePoint request failed:', error);
    return { 
      success: false, 
      error: error.message || 'Network error' 
    };
  }
}

// ==================== PROXY API (Générique pour Supabase, etc.) ====================

async function handleProxyRequest(request) {
  const { url, options = {} } = request;
  
  try {
    const fetchOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      credentials: 'omit' // Ne pas inclure les cookies par défaut
    };

    if (options.body) {
      fetchOptions.body = typeof options.body === 'string' 
        ? options.body 
        : JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);
    
    // Récupérer les headers de la réponse
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // Sauvegarder la date du dernier appel
    await chrome.storage.local.set({ 
      proxy_last_call: new Date().toISOString() 
    });

    return { 
      success: true, 
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers,
      data 
    };

  } catch (error) {
    console.error('[Background] Proxy request failed:', error);
    return { 
      success: false, 
      error: error.message || 'Network error' 
    };
  }
}

// ==================== MESSAGE LISTENER ====================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'JIRA_REQUEST') {
    handleJiraRequest(message.payload)
      .then(sendResponse)
      .catch(error => {
        console.error('[Background] Error handling Jira request:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indique que la réponse sera asynchrone
  }

  if (message.type === 'SHAREPOINT_REQUEST') {
    handleSharePointRequest(message.payload)
      .then(sendResponse)
      .catch(error => {
        console.error('[Background] Error handling SharePoint request:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indique que la réponse sera asynchrone
  }

  if (message.type === 'PROXY_REQUEST') {
    handleProxyRequest(message.payload)
      .then(sendResponse)
      .catch(error => {
        console.error('[Background] Error handling Proxy request:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indique que la réponse sera asynchrone
  }

  console.warn('[Background] Unknown message type:', message.type);
  sendResponse({ success: false, error: 'Unknown message type' });
});
