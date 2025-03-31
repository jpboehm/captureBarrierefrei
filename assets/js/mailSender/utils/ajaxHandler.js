/**
 * AJAX-Handler für MailSender
 * 
 * Bietet Funktionen für die asynchrone Kommunikation mit dem Server
 * und Fallback-Mechanismen, wenn die Kommunikation fehlschlägt.
 * 
 * @module ajaxHandler
 */

/**
 * Sendet eine AJAX-Anfrage an den Server
 * @param {string} url - Die Ziel-URL
 * @param {Object} options - Fetch-Optionen wie method, body, headers
 * @returns {Promise} - Promise mit der Antwort des Servers
 * @public
 */
export function sendRequest(url, options = {}) {
    return fetch(url, {
        method: options.method || 'POST',
        headers: options.headers || {},
        body: options.body || null,
        credentials: options.credentials || 'same-origin'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server antwortet mit Statuscode ${response.status}`);
        }
        return response.json();
    });
}

/**
 * Öffnet einen mailto-Link als Fallback
 * @param {Object} data - Daten für den mailto-Link
 * @public
 */
export function openMailtoFallback(data) {
    let body = '';
    
    // Textkörper aus Daten erstellen
    if (typeof data === 'object') {
        for (const key in data) {
            if (key !== 'recipient' && key !== 'subject' && key !== 'message') {
                body += `${key}: ${data[key]}\n`;
            }
        }
        
        // Nachricht anhängen, falls vorhanden
        if (data.message) {
            body += `\n${data.message}`;
        }
    } else {
        body = data.toString();
    }
    
    // Empfänger und Betreff verwenden oder Defaults
    const recipient = data.recipient || 'empfaenger@beispiel.de';
    const subject = data.subject || 'Kontaktformular';
    
    // mailto-Link erstellen und öffnen
    const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
}
