/**
 * Template-Hilfsfunktionen für das MailSender-Modul
 * Stellt Funktionen zum Laden und Verarbeiten von E-Mail-Templates bereit.
 * 
 * @author Capture Barrierefrei Team
 * @version 1.0.0
 */

/**
 * Lädt ein E-Mail-Template aus einer Datei und ersetzt Platzhalter
 * @param {string} templatePath - Pfad zur Template-Datei
 * @param {Object} data - Objekt mit Werten, die in das Template eingesetzt werden sollen
 * @returns {Promise<string>} - Promise mit dem verarbeiteten Template
 */
async function loadEmailTemplate(templatePath, data = {}) {
    try {
        // Template-Datei laden
        const response = await fetch(templatePath);
        if (!response.ok) {
            throw new Error(`Template konnte nicht geladen werden: ${response.status}`);
        }
        
        let template = await response.text();
        
        // Platzhalter ersetzen
        template = replaceVariables(template, data);
        
        // Bedingte Blöcke verarbeiten
        template = processConditionalBlocks(template, data);
        
        // Schleifen verarbeiten
        template = processLoops(template, data);
        
        return template;
    } catch (error) {
        console.error('Fehler beim Laden des Templates:', error);
        return '';
    }
}

/**
 * Ersetzt Platzhalter im Format {{name}} mit Werten aus dem Datenobjekt
 * @param {string} template - Der Template-String
 * @param {Object} data - Objekt mit Ersetzungswerten
 * @returns {string} - Template mit ersetzten Platzhaltern
 */
function replaceVariables(template, data) {
    return template.replace(/\{\{([^#\/][^}]*)\}\}/g, (match, key) => {
        const trimmedKey = key.trim();
        // Punktnotation unterstützen (z.B. {{user.name}})
        const value = getNestedValue(data, trimmedKey);
        
        // Wenn Wert undefined ist, Platzhalter beibehalten oder leeren String zurückgeben
        return value !== undefined ? escapeHTML(value) : '';
    });
}

/**
 * Verarbeitet bedingte Blöcke im Format {{#if variable}}...{{/if}}
 * @param {string} template - Der Template-String
 * @param {Object} data - Objekt mit Bedingungsvariablen
 * @returns {string} - Template mit verarbeiteten Bedingungen
 */
function processConditionalBlocks(template, data) {
    // Muster für bedingte Blöcke: {{#if variable}}...{{/if}}
    const conditionalPattern = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    
    return template.replace(conditionalPattern, (match, condition, content) => {
        const trimmedCondition = condition.trim();
        const value = getNestedValue(data, trimmedCondition);
        
        // Block anzeigen, wenn Wert truthy ist
        if (value) {
            // Ersetzung rekursiv auf den Inhalt anwenden
            return replaceVariables(content, data);
        }
        
        // Andernfalls Block ausblenden
        return '';
    });
}

/**
 * Verarbeitet Schleifen im Format {{#each array}}...{{/each}}
 * @param {string} template - Der Template-String
 * @param {Object} data - Objekt mit Arrays für Schleifen
 * @returns {string} - Template mit verarbeiteten Schleifen
 */
function processLoops(template, data) {
    // Muster für Schleifen: {{#each array}}...{{/each}}
    const loopPattern = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    
    return template.replace(loopPattern, (match, arrayName, content) => {
        const trimmedArrayName = arrayName.trim();
        const array = getNestedValue(data, trimmedArrayName);
        
        // Prüfen, ob ein Array vorhanden ist
        if (!Array.isArray(array)) {
            return '';
        }
        
        // Für jedes Element im Array den Inhalt verarbeiten
        return array.map(item => {
            // this-Keyword im Content durch das aktuelle Element ersetzen
            let itemContent = content.replace(/\{\{this\.(.*?)\}\}/g, (m, key) => {
                return `{{${key}}}`;
            });
            
            // Platzhalter im Context des aktuellen Elements ersetzen
            return replaceVariables(itemContent, item);
        }).join('');
    });
}

/**
 * Holt einen verschachtelten Wert aus einem Objekt mit Punkt-Notation
 * @param {Object} obj - Das Quelldatenobjekt
 * @param {string} path - Pfad zum Wert (z.B. "user.address.city")
 * @returns {*} - Der gefundene Wert oder undefined
 */
function getNestedValue(obj, path) {
    const keys = path.split('.');
    return keys.reduce((o, key) => (o || {})[key], obj);
}

/**
 * Escapet HTML-Sonderzeichen, um XSS-Angriffe zu verhindern
 * @param {string|number|boolean} value - Der zu escapende Wert
 * @returns {string} - Der escapte String
 */
function escapeHTML(value) {
    if (value === null || value === undefined) {
        return '';
    }
    
    // Zu String konvertieren
    const str = String(value);
    
    // HTML-Sonderzeichen escapen
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Generiert eine eindeutige Referenznummer für Anfragen
 * @param {string} prefix - Optionales Präfix für die Referenznummer
 * @returns {string} - Eindeutige Referenznummer
 */
function generateReferenceNumber(prefix = 'REF') {
    const timestamp = new Date().getTime().toString(36);
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generiert ein aktuelles Datum im deutschen Format
 * @returns {string} - Formatiertes Datum (TT.MM.JJJJ)
 */
function getCurrentDate() {
    return new Date().toLocaleDateString('de-DE');
}

/**
 * Generiert eine aktuelle Uhrzeit im deutschen Format
 * @returns {string} - Formatierte Uhrzeit (HH:MM:SS)
 */
function getCurrentTime() {
    return new Date().toLocaleTimeString('de-DE');
}

/**
 * Erstellt eine Text-Version des HTML-Templates für E-Mail-Clients, die kein HTML unterstützen
 * @param {string} htmlTemplate - Das HTML-Template
 * @returns {string} - Eine Nur-Text-Version des Templates
 */
function createPlainTextVersion(htmlTemplate) {
    return htmlTemplate
        // HTML-Tags entfernen
        .replace(/<[^>]*>/g, '')
        // Mehrfache Leerzeichen reduzieren
        .replace(/\s+/g, ' ')
        // Mehrfache Leerzeilen reduzieren
        .replace(/\n\s*\n/g, '\n\n')
        // Trim am Anfang und Ende
        .trim();
}

// Exportieren für modulare Verwendung
export {
    loadEmailTemplate,
    replaceVariables,
    processConditionalBlocks,
    processLoops,
    generateReferenceNumber,
    getCurrentDate,
    getCurrentTime,
    createPlainTextVersion
};
