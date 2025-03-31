/**
 * Formular-Schutz-Modul
 * Implementiert Mechanismen zum Schutz von Formularen vor automatisierten Bot-Zugriffen
 * und fügt zusätzliche Sicherheits- und Validierungsfunktionen hinzu.
 * 
 * @module formProtection
 * @version 1.2.0
 */
import { 
    createOrGetFeedbackElement, 
    createOrGetHiddenField, 
    createOrGetHoneypotField, 
    createOrGetHumanVerification,
    ensureStyles
} from './ui.js';

/**
 * Richtet einen MutationObserver ein, um dynamisch eingefügte Formulare zu schützen
 * Beobachtet Änderungen im DOM und aktiviert automatisch Schutzmaßnahmen für neue Formulare.
 * 
 * @param {Object} instance - Die CaptureBarriereFrei-Instanz
 * @public
 */
export function setupMutationObserver(instance) {
    const observer = new MutationObserver((mutations) => {
        let shouldScan = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Prüfen, ob ein Formular hinzugefügt wurde
                        if (node.tagName === 'FORM') {
                            shouldScan = true;
                            break;
                        }
                        // Prüfen, ob das Element Formulare enthalten könnte
                        if (node.querySelector && node.querySelector('form')) {
                            shouldScan = true;
                            break;
                        }
                    }
                }
            }
        });
        
        if (shouldScan) {
            instance.autoProtectForms();
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

/**
 * Schützt automatisch alle Formulare auf der Seite
 * Sucht nach allen Formularen, die dem konfigurierten Selektor entsprechen,
 * und aktiviert Schutzmaßnahmen für jedes ungeschützte Formular.
 * 
 * @public
 */
export function autoProtectForms() {
    const forms = document.querySelectorAll(this.config.formSelectors);
    
    forms.forEach(form => {
        // Prüfen, ob das Formular bereits geschützt ist
        if (!this.interactions.securedForms.has(form)) {
            this.protectForm(form);
        }
    });
    
    this.logDebug(`${this.interactions.securedForms.size} Formulare automatisch geschützt`);
}

/**
 * Erkennt automatisch erforderliche Felder im Formular
 * Analysiert Formularfelder und identifiziert diejenigen, die als Pflichtfelder gekennzeichnet sind.
 * 
 * @param {HTMLFormElement} form - Das Formular
 * @returns {Array} - Array mit gefundenen Pflichtfeldern und deren Fehler-Elementen
 * @private
 */
export function discoverRequiredFields(form) {
    const fields = [];
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        // Versteckte Felder und Submit-Buttons ignorieren
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button') {
            return;
        }
        
        // Honeypot-Feld ignorieren
        if (input.name === this.config.honeypotFieldName) {
            return;
        }
        
        // Prüfen, ob das Feld erforderlich ist
        const isRequired = input.hasAttribute('required') || input.getAttribute('aria-required') === 'true';
        
        if (isRequired) {
            // Fehler-Element erstellen oder finden
            const errorId = `${input.id || input.name}-error`;
            let errorElement = document.getElementById(errorId);
            
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.id = errorId;
                errorElement.className = 'error-message';
                errorElement.setAttribute('aria-live', 'polite');
                
                // Nach dem Input einfügen
                if (input.parentNode) {
                    input.insertAdjacentElement('afterend', errorElement);
                    
                    // ARIA-Attribute setzen
                    input.setAttribute('aria-invalid', 'false');
                    input.setAttribute('aria-describedby', errorId);
                }
            }
            
            // Feld zum Array hinzufügen
            fields.push({
                input,
                errorElement
            });
        }
    });
    
    return fields;
}

/**
 * Aktualisiert den Zustand des Submit-Buttons basierend auf Feldvalidierung und Bot-Score
 * @param {HTMLFormElement} form - Das Formular
 * @param {Object} formConfig - Die Formular-Konfiguration
 * @public
 */
export function updateSubmitButtonState(form, formConfig) {
    // Submit-Button finden
    const submitButton = form.querySelector('[type="submit"]');
    if (!submitButton) return;
    
    // Prüfen, ob alle erforderlichen Felder ausgefüllt sind
    let allFieldsValid = true;
    formConfig.requiredFields.forEach(field => {
        if (field.input && field.input.required && !field.input.value.trim()) {
            allFieldsValid = false;
        }
    });
    
    // Bot-Score prüfen
    const botScore = parseInt(formConfig.botScoreField.value, 10);
    const botScoreThreshold = this.config.thresholdScore || 5;
    const botSuspected = botScore < botScoreThreshold;
    
    // Button basierend auf Validierungsstatus und Bot-Score aktivieren/deaktivieren
    if (!allFieldsValid || botSuspected) {
        submitButton.disabled = true;
        submitButton.classList.add('disabled');
        submitButton.setAttribute('aria-disabled', 'true');
        
        // ARIA-Label für Screenreader aktualisieren
        let reason = '';
        if (!allFieldsValid && botSuspected) {
            reason = 'Bitte füllen Sie alle Felder aus und führen Sie menschliche Interaktionen durch';
        } else if (!allFieldsValid) {
            reason = 'Bitte füllen Sie alle erforderlichen Felder aus';
        } else if (botSuspected) {
            reason = 'Bitte führen Sie menschliche Interaktionen durch, um den Bot-Schutz zu deaktivieren';
        }
        submitButton.setAttribute('aria-label', `Absenden (deaktiviert: ${reason})`);
    } else {
        submitButton.disabled = false;
        submitButton.classList.remove('disabled');
        submitButton.removeAttribute('aria-disabled');
        submitButton.setAttribute('aria-label', 'Absenden');
    }
}

/**
 * Schützt ein einzelnes Formular
 * Fügt Honeypot-Felder, versteckte Sicherheitsfelder und Validierungslogik hinzu.
 * 
 * @param {HTMLFormElement} form - Das zu schützende Formular
 * @returns {Object} - Die Formular-Konfiguration mit allen Schutzmaßnahmen
 * @public
 */
export function protectForm(form) {
    // Formular-Konfiguration erstellen
    const formConfig = {
        id: form.id || `captureForm-${Math.random().toString(36).substr(2, 9)}`,
        requiredFields: discoverRequiredFields.call(this, form),
        feedbackElement: createOrGetFeedbackElement.call(this, form)
    };
    
    // Versteckte Felder hinzufügen
    formConfig.botScoreField = createOrGetHiddenField.call(
        this, 
        form, 
        this.config.botScoreFieldName, 
        '0'
    );
    
    formConfig.startTimeField = createOrGetHiddenField.call(
        this, 
        form, 
        this.config.startTimeFieldName, 
        Date.now().toString()
    );
    
    // Honeypot-Feld hinzufügen, wenn nicht vorhanden
    formConfig.honeypotField = createOrGetHoneypotField.call(this, form);
    
    // Human-Verification-Checkbox hinzufügen, wenn nicht vorhanden
    formConfig.humanVerification = createOrGetHumanVerification.call(this, form);
    
    // Submit-Event-Listener hinzufügen
    form.addEventListener('submit', (event) => {
        this.processFormSubmission(event, form, formConfig);
    });
    
    // Formular-Validierungs-Event-Listener hinzufügen
    formConfig.requiredFields.forEach(field => {
        if (field.input) {
            // Input und Change Events hinzufügen, um den Button-Status zu aktualisieren
            ['blur', 'input', 'change'].forEach(eventType => {
                field.input.addEventListener(eventType, () => {
                    this.validateField(field.input, field.errorElement);
                    // Button-Status aktualisieren
                    updateSubmitButtonState.call(this, form, formConfig);
                });
            });
        }
    });
    
    // Human-Verification-Checkbox-Event-Listener
    if (formConfig.humanVerification && formConfig.humanVerification.checkbox) {
        const checkbox = formConfig.humanVerification.checkbox;
        const errorElement = formConfig.humanVerification.errorElement;
        
        checkbox.addEventListener('change', () => {
            this.logDebug('Checkbox Status: ' + (checkbox.checked ? 'Angehakt' : 'Nicht angehakt'));
            if (checkbox.checked && errorElement) {
                errorElement.textContent = '';
                checkbox.setAttribute('aria-invalid', 'false');
            }
            this.updateAllSecurityScores();
            // Button-Status aktualisieren nach Änderung der Checkbox
            updateSubmitButtonState.call(this, form, formConfig);
        });
        
        checkbox.addEventListener('keydown', (e) => {
            // Leertaste oder Enter aktiviert die Checkbox
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
    }
    
    // Formular in den geschützten Formularen speichern
    this.interactions.securedForms.set(form, formConfig);
    
    // Form ID zuweisen, falls keine vorhanden
    if (!form.id) {
        form.id = formConfig.id;
    }
    
    // Stile sicherstellen
    ensureStyles();
    
    // Initial den Button-Status setzen
    updateSubmitButtonState.call(this, form, formConfig);
    
    return formConfig;
}
