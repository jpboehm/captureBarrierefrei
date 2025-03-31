/**
 * Logger-Modul für die CaptureBarriereFrei-Bibliothek
 * Stellt Funktionen für strukturierte Konsolenausgaben bereit.
 * @module logger
 * @author CaptureBarriereFrei Team
 * @version 1.0.0
 */

/**
 * Logger-Klasse für formatierte Konsolenausgaben
 * Ermöglicht die Protokollierung von Änderungen und Tracking-Daten
 */
class Logger {
    /**
     * Erstellt eine neue Logger-Instanz
     * @param {Object} options - Konfigurationsoptionen
     * @param {boolean} [options.enabled=false] - Ob der Logger aktiviert ist
     * @param {string} [options.logLevel='info'] - Minimales Log-Level (debug, info, warn, error)
     * @param {string} [options.prefix='CaptureBarriereFrei'] - Präfix für alle Log-Nachrichten
     * @param {boolean} [options.showTimestamp=true] - Ob Zeitstempel angezeigt werden sollen
     */
    constructor(options = {}) {
        this.config = {
            enabled: false,
            logLevel: 'info',
            prefix: 'CaptureBarriereFrei',
            showTimestamp: true,
            ...options
        };

        this.logLevels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
    }

    /**
     * Prüft, ob eine Nachricht mit dem gegebenen Level ausgegeben werden soll
     * @param {string} level - Das zu prüfende Log-Level
     * @returns {boolean} - Ob das Level ausgegeben werden soll
     * @private
     */
    _shouldLog(level) {
        return this.config.enabled && 
               this.logLevels[level] >= this.logLevels[this.config.logLevel];
    }

    /**
     * Formatiert eine Log-Nachricht mit Präfix und Zeitstempel
     * @param {string} level - Log-Level der Nachricht
     * @param {string} message - Die Hauptnachricht
     * @returns {string} - Die formatierte Nachricht
     * @private
     */
    _formatMessage(level, message) {
        const parts = [];
        
        // Zeitstempel hinzufügen, wenn konfiguriert
        if (this.config.showTimestamp) {
            const now = new Date();
            const timestamp = now.toISOString().replace('T', ' ').substr(0, 19);
            parts.push(`[${timestamp}]`);
        }
        
        // Präfix und Level hinzufügen
        parts.push(`[${this.config.prefix}]`);
        parts.push(`[${level.toUpperCase()}]`);
        
        // Nachricht hinzufügen
        parts.push(message);
        
        return parts.join(' ');
    }

    /**
     * Gibt eine Debug-Nachricht aus
     * @param {string} message - Die Nachricht
     * @param {*} [data] - Optionale Daten zur Ausgabe
     */
    debug(message, data) {
        if (this._shouldLog('debug')) {
            if (data !== undefined) {
                console.debug(this._formatMessage('debug', message), data);
            } else {
                console.debug(this._formatMessage('debug', message));
            }
        }
    }

    /**
     * Gibt eine Info-Nachricht aus
     * @param {string} message - Die Nachricht
     * @param {*} [data] - Optionale Daten zur Ausgabe
     */
    info(message, data) {
        if (this._shouldLog('info')) {
            if (data !== undefined) {
                console.info(this._formatMessage('info', message), data);
            } else {
                console.info(this._formatMessage('info', message));
            }
        }
    }

    /**
     * Gibt eine Warnungs-Nachricht aus
     * @param {string} message - Die Nachricht
     * @param {*} [data] - Optionale Daten zur Ausgabe
     */
    warn(message, data) {
        if (this._shouldLog('warn')) {
            if (data !== undefined) {
                console.warn(this._formatMessage('warn', message), data);
            } else {
                console.warn(this._formatMessage('warn', message));
            }
        }
    }

    /**
     * Gibt eine Fehler-Nachricht aus
     * @param {string} message - Die Nachricht
     * @param {*} [data] - Optionale Daten zur Ausgabe
     */
    error(message, data) {
        if (this._shouldLog('error')) {
            if (data !== undefined) {
                console.error(this._formatMessage('error', message), data);
            } else {
                console.error(this._formatMessage('error', message));
            }
        }
    }

    /**
     * Protokolliert eine Änderung im System
     * @param {string} component - Die geänderte Komponente
     * @param {string} action - Die Aktion (z.B. 'created', 'updated', 'deleted')
     * @param {Object} details - Details zur Änderung
     */
    logChange(component, action, details) {
        this.info(`Änderung: ${component} wurde ${action}`, details);
    }

    /**
     * Protokolliert ein Tracking-Ereignis
     * @param {string} eventName - Name des Ereignisses
     * @param {Object} data - Tracking-Daten
     */
    logTracking(eventName, data) {
        this.debug(`Tracking: ${eventName}`, data);
    }

    /**
     * Protokolliert Benutzerinteraktionen
     * @param {string} interactionType - Art der Interaktion
     * @param {Object} interactionData - Interaktionsdaten
     */
    logInteraction(interactionType, interactionData) {
        this.debug(`Interaktion: ${interactionType}`, interactionData);
    }

    /**
     * Protokolliert Formularvalidierung
     * @param {string} formId - ID des Formulars
     * @param {boolean} isValid - Ob das Formular gültig ist
     * @param {Object} validationData - Validierungsdaten
     */
    logValidation(formId, isValid, validationData) {
        const status = isValid ? 'gültig' : 'ungültig';
        this.info(`Validierung: Formular ${formId} ist ${status}`, validationData);
    }

    /**
     * Protokolliert Sicherheitsüberprüfungen
     * @param {string} checkType - Art der Überprüfung
     * @param {number} score - Sicherheitswert
     * @param {Object} securityData - Sicherheitsdaten
     */
    logSecurity(checkType, score, securityData) {
        this.info(`Sicherheit: ${checkType} Score: ${score}`, securityData);
    }

    /**
     * Protokolliert Formularübermittlungen
     * @param {string} formId - ID des Formulars
     * @param {boolean} success - Ob die Übermittlung erfolgreich war
     * @param {Object} submissionData - Übermittlungsdaten
     */
    logSubmission(formId, success, submissionData) {
        const status = success ? 'erfolgreich' : 'fehlgeschlagen';
        this.info(`Übermittlung: Formular ${formId} ${status} abgesendet`, submissionData);
    }
}

// Singleton-Instanz exportieren
export default Logger;

