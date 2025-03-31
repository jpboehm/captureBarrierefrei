/**
 * Konfigurationsmanager für MailSender
 * 
 * Verwaltet die Konfigurationsoptionen des MailSender-Moduls,
 * setzt Standardwerte und validiert Benutzereingaben.
 * 
 * @class
 */
class ConfigManager {
    /**
     * Erstellt eine neue Konfigurationsinstanz
     * @param {Object} userConfig - Benutzerdefinierte Konfigurationsoptionen
     */
    constructor(userConfig = {}) {
        // Standardkonfiguration
        this.defaultConfig = {
            recipient: 'empfaenger@beispiel.de', // Standard-Empfänger
            subject: 'Nachricht vom Kontaktformular',
            formSelector: 'form',
            endpoint: '/send_mail.php', // Server-Endpunkt für das Senden
            method: 'POST',
            debug: false,
            preserveFormHandlers: false, // Option zum Erhalten vorhandener Handler
            resetFormOnSuccess: true,    // Formular nur bei Erfolg zurücksetzen
            resetFormOnFailure: false,   // Formular bei Fehlern nicht zurücksetzen
            maxFileSize: 5 * 1024 * 1024, // 5MB maximale Dateigröße
            allowedFileTypes: ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'], // Erlaubte Dateitypen
            useTemplates: false,         // Template-Unterstützung standardmäßig deaktiviert
            fallbackToMailto: false      // Bei Fehlern auf mailto: ausweichen
        };

        // Benutzerkonfiguration mit Standardwerten zusammenführen
        this.config = {...this.defaultConfig, ...userConfig};

        // Konfiguration validieren und normalisieren
        this.validateConfig();
    }

    /**
     * Validiert und normalisiert die Konfiguration
     * @private
     */
    validateConfig() {
        // Endpoint prüfen und korrigieren (relativer Pfad)
        if (this.config.endpoint.startsWith('/')) {
            this.config.endpoint = this.config.endpoint.substring(1);
        }
    }

    /**
     * Gibt die aktuelle Konfiguration zurück
     * @returns {Object} - Die aktuelle Konfiguration
     * @public
     */
    getConfig() {
        return this.config;
    }

    /**
     * Setzt eine einzelne Konfigurationsoption
     * @param {string} key - Konfigurationsschlüssel
     * @param {*} value - Neuer Wert
     * @public
     */
    setOption(key, value) {
        this.config[key] = value;
        this.validateConfig();
    }

    /**
     * Aktualisiert mehrere Konfigurationsoptionen
     * @param {Object} options - Objekt mit zu aktualisierenden Optionen
     * @public
     */
    updateConfig(options) {
        this.config = {...this.config, ...options};
        this.validateConfig();
    }
}

export default ConfigManager;
