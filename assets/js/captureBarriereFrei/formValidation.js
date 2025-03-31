/**
 * Formular-Validierung-Modul
 * Implementiert Funktionen zur Validierung von Formulareingaben und zur Verarbeitung
 * der Formularübermittlung mit Sicherheits- und Bot-Erkennungsmaßnahmen.
 * 
 * @module formValidation
 * @version 1.2.0
 */

/**
 * Validiert ein einzelnes Feld
 * Prüft die Gültigkeit der Eingabe und zeigt entsprechende Fehlermeldungen an.
 * 
 * @param {HTMLElement} input - Das Eingabeelement
 * @param {HTMLElement} errorElement - Das Fehlermeldungselement
 * @returns {boolean} - Gibt true zurück, wenn die Validierung erfolgreich ist
 * @public
 */
export function validateField(input, errorElement) {
    if (!input.checkValidity()) {
        input.setAttribute('aria-invalid', 'true');
        if (input.validity.valueMissing) {
            const labelText = input.labels && input.labels[0] ? 
                input.labels[0].textContent.trim() : 
                (input.getAttribute('placeholder') || 'Feld');
            errorElement.textContent = `${labelText} ist erforderlich.`;
        } else if (input.validity.typeMismatch) {
            if (input.type === 'email') {
                errorElement.textContent = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
            } else {
                errorElement.textContent = 'Ungültiges Format.';
            }
        } else if (input.validity.tooShort) {
            errorElement.textContent = `Mindestens ${input.minLength} Zeichen erforderlich.`;
        } else if (input.validity.tooLong) {
            errorElement.textContent = `Maximal ${input.maxLength} Zeichen erlaubt.`;
        } else if (input.validity.patternMismatch) {
            errorElement.textContent = input.title || 'Eingabe entspricht nicht dem erforderlichen Format.';
        } else {
            errorElement.textContent = 'Ungültige Eingabe.';
        }
        return false;
    } else {
        input.setAttribute('aria-invalid', 'false');
        errorElement.textContent = '';
        return true;
    }
}

/**
 * Verarbeitet die Formular-Übermittlung
 * Validiert alle Pflichtfelder, prüft Sicherheitsmerkmale und entscheidet, 
 * ob das Formular abgesendet werden kann.
 * 
 * @param {Event} event - Das Submit-Event
 * @param {HTMLFormElement} form - Das Formular
 * @param {Object} formConfig - Die Formular-Konfiguration
 * @public
 */
export function processFormSubmission(event, form, formConfig) {
    event.preventDefault();
    
    // Formularvalidierung durchführen
    let isValid = true;
    
    // Alle erforderlichen Felder validieren
    formConfig.requiredFields.forEach(field => {
        if (!this.validateField(field.input, field.errorElement)) {
            isValid = false;
        }
    });
    
    // Human-Verification-Checkbox prüfen
    if (formConfig.humanVerification && formConfig.humanVerification.checkbox && 
        !formConfig.humanVerification.checkbox.checked) {
        
        this.logDebug('Formular abgelehnt: Checkbox wurde nicht angehakt');
        
        if (formConfig.humanVerification.errorElement) {
            formConfig.humanVerification.errorElement.textContent = "Bitte bestätigen Sie, dass Sie kein Roboter sind.";
        }
        
        formConfig.humanVerification.checkbox.setAttribute('aria-invalid', 'true');
        formConfig.humanVerification.checkbox.focus();
        
        if (formConfig.feedbackElement) {
            formConfig.feedbackElement.textContent = 'Formular konnte nicht abgesendet werden. Bitte korrigieren Sie die markierten Felder.';
        }
        return;
    }
    
    // Zeit-Analyse
    const startTimeValue = formConfig.startTimeField.value;
    let startTime;
    
    // Neues Format verarbeiten (timestamp|lesbaresFormat)
    if (startTimeValue.includes('|')) {
        startTime = parseInt(startTimeValue.split('|')[0], 10);
    } else {
        // Fallback für ältere Einträge, die nur den Timestamp enthalten
        startTime = parseInt(startTimeValue, 10);
    }
    
    const elapsedTime = Date.now() - startTime;
    this.logDebug('Verstrichene Zeit seit Formularstart:', elapsedTime + 'ms');
    
    // Zeit-Schwellenwert prüfen
    if (elapsedTime < this.config.minTimeToFill) {
        this.logDebug('Verdächtig: Formular wurde zu schnell ausgefüllt (' + elapsedTime + 'ms)');
        formConfig.botScoreField.value = (parseInt(formConfig.botScoreField.value, 10) - 50).toString();
    }
    
    // Letzte Aktualisierung des Scores
    const finalScore = this.analyzeBotBehavior(form, formConfig);
    
    // Entscheidungskriterium prüfen
    if (finalScore < this.config.thresholdScore) {
        this.logDebug('Formular abgelehnt: Score zu niedrig (' + finalScore + ')');
        if (formConfig.feedbackElement) {
            formConfig.feedbackElement.textContent = "Unser Sicherheitssystem hat verdächtige Aktivitäten erkannt. Bitte versuchen Sie es erneut.";
        }
        return;
    }
    
    if (!isValid) {
        if (formConfig.feedbackElement) {
            formConfig.feedbackElement.textContent = 'Formular konnte nicht abgesendet werden. Bitte korrigieren Sie die markierten Felder.';
        }
        // Fokus auf das erste Feld mit Fehler setzen
        const firstInvalidField = form.querySelector('[aria-invalid="true"]');
        if (firstInvalidField) {
            firstInvalidField.focus();
        }
        return;
    }
    
    this.logDebug('Formular akzeptiert: Positiver Bot-Score (' + finalScore + ')');
    
    // Erfolgsrückmeldung
    if (formConfig.feedbackElement) {
        formConfig.feedbackElement.textContent = 'Ihre Nachricht wurde erfolgreich gesendet. Vielen Dank für Ihre Kontaktaufnahme!';
    }
    
    // Formular absenden
    this.submitForm(form, formConfig);
}
