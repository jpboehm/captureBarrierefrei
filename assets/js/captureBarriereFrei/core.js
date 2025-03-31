/**
 * CaptureBarriereFrei - Kernmodul
 * Implementiert die Hauptfunktionalität der Bibliothek als Klasse.
 * @module core
 * @author CaptureBarriereFrei Team
 * @version 1.2.0
 */
import { setupBotDetection, analyzeBotBehavior } from './botDetection.js';
import { protectForm, autoProtectForms, setupMutationObserver, updateSubmitButtonState } from './formProtection.js';
import { validateField, processFormSubmission } from './formValidation.js';
import { displaySuccessMessage, ensureAccessibilityFeatures } from './ui.js';
import { logDebug, getRandomId } from './utils.js';
import Logger from './logger.js';

/**
 * CaptureBarriereFrei - Eine barrierefreie Bot-Erkennungs- und Formularvalidierungslösung
 * Diese Klasse bildet den Kern der Bibliothek und koordiniert alle Funktionalitäten.
 */
class CaptureBarriereFrei {
    /**
     * Initialisiert die CaptureBarriereFrei-Instanz
     * @param {Object} options - Optionales Konfigurationsobjekt mit folgenden Eigenschaften:
     * @param {boolean} [options.autoProtect=true] - Automatisch alle Formulare schützen
     * @param {string} [options.formSelectors='form'] - CSS-Selektor für zu schützende Formulare
     * @param {string} [options.botScoreFieldName='security-score'] - Name des versteckten Felds für den Sicherheitsscore
     * @param {string} [options.startTimeFieldName='interaction-start-time'] - Name des versteckten Felds für die Startzeit
     * @param {string} [options.honeypotFieldName='url-field'] - Name des Honeypot-Felds
     * @param {number} [options.minTimeToFill=1800] - Minimale Zeit zum Ausfüllen in Millisekunden
     * @param {number} [options.thresholdScore=5] - Minimaler Score für erfolgreiche Validierung
     * @param {boolean} [options.enableLogging=false] - Debug-Ausgaben in der Konsole aktivieren
     */
    constructor(options = {}) {
        // Standardkonfiguration mit benutzerdefinierten Optionen zusammenführen
        this.config = {
            // Basis-Konfiguration mit Standardwerten
            autoProtect: true,                            
            formSelectors: 'form',                        
            botScoreFieldName: 'security-score',          
            startTimeFieldName: 'interaction-start-time', 
            honeypotFieldName: 'url-field',               
            minTimeToFill: 1800,                          
            thresholdScore: 5,                            
            enableLogging: false,                         
            
            // Anwenderspezifische Einstellungen überschreiben Standardwerte
            ...options
        };
        
        // Logger initialisieren
        this.logger = new Logger({
            enabled: this.config.enableLogging,
            prefix: 'CaptureBarriereFrei',
            logLevel: 'debug'
        });
        
        // Benutzerinteraktionen verfolgen
        this.interactions = {                            
            mouseEvents: 0,                              
            keyboardEvents: 0,                           
            scrollEvents: 0,
            interactionStarted: false,                   
            securedForms: new Map()                      
        };
        
        // Methoden-Bindung für korrekten Kontext
        this.logDebug = this.logger.debug.bind(this.logger);
        this.protectForm = protectForm.bind(this);
        this.autoProtectForms = autoProtectForms.bind(this);
        this.validateField = validateField.bind(this);
        this.processFormSubmission = processFormSubmission.bind(this); 
        this.displaySuccessMessage = displaySuccessMessage.bind(this); 
        this.analyzeBotBehavior = analyzeBotBehavior.bind(this);
        this.updateSubmitButtonState = updateSubmitButtonState.bind(this);
        
        // Bot-Erkennung einrichten
        setupBotDetection(this);
        
        // Formularschutz automatisch aktivieren wenn gewünscht
        if (this.config.autoProtect) {
            this.initializeAutoProtection();
        }
        
        // Initialisierung protokollieren
        this.logger.info('CaptureBarriereFrei initialisiert mit Konfiguration:', this.config);
    }
    
    /**
     * Initialisiert den automatischen Formularschutz
     * Führt Schutzmaßnahmen für alle Formulare durch und richtet kontinuierliche Überwachung ein.
     * @private
     */
    initializeAutoProtection() {
        // DOM-Ready abwarten oder direkt ausführen, wenn DOM bereits geladen
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.autoProtectForms());
        } else {
            this.autoProtectForms();
        }
        
        // MutationObserver für dynamische Inhalte einrichten
        setupMutationObserver(this);
        
        // Zusätzlich: Periodische Überprüfung auf neue Formulare (als Fallback)
        setInterval(() => this.autoProtectForms(), 3000);
    }
    
    /**
     * Aktualisiert den Sicherheitsscore für alle geschützten Formulare
     * Wird automatisch bei Benutzerinteraktionen aufgerufen.
     * @public
     */
    updateAllSecurityScores() {                        
        this.interactions.securedForms.forEach((formConfig, form) => {
            const oldScore = parseInt(formConfig.botScoreField.value, 10);
            this.analyzeBotBehavior(form, formConfig);
            const newScore = parseInt(formConfig.botScoreField.value, 10);
            
            this.logger.logSecurity('Sicherheitsscore aktualisiert', newScore, {
                formId: form.id || 'unbekannt',
                alteBewertung: oldScore,
                neueBewertung: newScore,
                veränderung: newScore - oldScore
            });
        });
    }
    
    /**
     * Sendet das Formular ab
     * Zeigt eine Erfolgsmeldung und führt die eigentliche Formularübermittlung durch.
     * @param {HTMLFormElement} form - Das Formular
     * @param {Object} formConfig - Die Formular-Konfiguration
     * @public
     */
    submitForm(form, formConfig) {
        // Überprüfen, ob das Formular gültige action und method Attribute hat
        if (!form.hasAttribute('action')) {
            this.logger.warn('Formular hat kein action-Attribut. Verwende aktuelle URL.');
            form.setAttribute('action', window.location.href);
        }
        
        if (!form.hasAttribute('method')) {
            this.logger.warn('Formular hat kein method-Attribut. Setze auf POST.');
            form.setAttribute('method', 'POST');
        }
        
        // Erfolgsmeldung visuell darstellen
        this.displaySuccessMessage(form);
        
        // Tracking-Daten sammeln
        const formData = new FormData(form);
        const trackingData = {
            timeToComplete: Date.now() - parseInt(formConfig.startTimeField.value, 10),
            securityScore: parseInt(formConfig.botScoreField.value, 10),
            formFields: Array.from(formData.keys()).length
        };
        
        // Protokollierung der Formularübermittlung
        this.logger.logSubmission(form.id || 'unbekannt', true, trackingData);
        
        // Nativen Submit verwenden statt programmatischem Submit
        setTimeout(() => {
            // Alle vorhandenen submit-Event-Listener speichern
            const clonedForm = form.cloneNode(true);
            
            // Neues Formular an Stelle des alten einfügen
            form.parentNode.replaceChild(clonedForm, form);
            
            // Formular absenden mit natürlichem Submit
            const submitButton = clonedForm.querySelector('[type="submit"]');
            if (submitButton) {
                submitButton.click();
            } else {
                // Falls kein Submit-Button existiert
                clonedForm.submit();
            }
        }, 1200);
    }
}

export default CaptureBarriereFrei;
