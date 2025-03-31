/**
 * UI-Komponenten-Modul für die CaptureBarriereFrei-Bibliothek
 * Enthält Funktionen zur Erstellung und Verwaltung der Benutzeroberfläche.
 * @module ui
 */
import { getRandomId } from './utils.js';

/**
 * Erstellt oder findet das Feedback-Element für ein Formular
 * @param {HTMLFormElement} form - Das Formular
 * @returns {HTMLElement} - Das Feedback-Element
 */
export function createOrGetFeedbackElement(form) {
    // Eindeutige ID für das Feedback-Element generieren
    const feedbackId = `${form.id || 'form'}-feedback`;
    let feedbackElement = document.getElementById(feedbackId);
    
    // Nur ein neues Element erstellen, wenn es noch nicht existiert
    if (!feedbackElement) {
        feedbackElement = document.createElement('div');
        feedbackElement.id = feedbackId;
        feedbackElement.className = 'sr-only';
        feedbackElement.setAttribute('aria-live', 'assertive');
        
        // Am Anfang des Formulars einfügen
        form.insertAdjacentElement('afterbegin', feedbackElement);
        
        // ARIA-Attribute setzen für bessere Barrierefreiheit
        form.setAttribute('aria-describedby', feedbackId);
    }
    
    return feedbackElement;
}

/**
 * Erstellt oder findet ein verstecktes Feld im Formular
 * @param {HTMLFormElement} form - Das Formular
 * @param {string} name - Name des Feldes
 * @param {string} value - Startwert
 * @returns {HTMLInputElement} - Das versteckte Feld
 */
export function createOrGetHiddenField(form, name, value) {
    // Prüfen, ob das Feld bereits vorhanden ist
    let field = form.querySelector(`[name="${name}"]`);
    
    if (!field) {
        field = document.createElement('input');
        field.type = 'hidden';
        field.name = name;
        field.value = value;
        form.appendChild(field);
    }
    
    return field;
}

/**
 * Erstellt oder findet das Honeypot-Feld, eine Falle für automatisierte Bots
 * @param {HTMLFormElement} form - Das Formular
 * @returns {HTMLInputElement} - Das Honeypot-Feld
 */
export function createOrGetHoneypotField(form) {
    const honeypotName = this.config.honeypotFieldName;
    let honeypotField = form.querySelector(`[name="${honeypotName}"]`);
    
    if (!honeypotField) {
        // Container für das Honeypot-Feld erstellen (für Screenreader versteckt)
        const container = document.createElement('div');
        container.className = 'form-group';
        container.setAttribute('aria-hidden', 'true');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.height = '1px';
        container.style.overflow = 'hidden';
        
        // Label erstellen (für semantisches HTML)
        const label = document.createElement('label');
        label.htmlFor = `${form.id}-${honeypotName}`;
        label.textContent = 'Website (nicht ausfüllen)';
        
        // Honeypot-Feld erstellen: Ein unsichtbares Feld, das menschliche Benutzer nicht ausfüllen können
        honeypotField = document.createElement('input');
        honeypotField.type = 'text';
        honeypotField.id = `${form.id}-${honeypotName}`;
        honeypotField.name = honeypotName;
        honeypotField.tabIndex = -1; // Aus Tab-Reihenfolge ausschließen
        honeypotField.autocomplete = 'off'; // Autovervollständigung deaktivieren
        
        // Elemente zusammenfügen
        container.appendChild(label);
        container.appendChild(honeypotField);
        form.appendChild(container);
    }
    
    return honeypotField;
}

/**
 * Erstellt oder findet die Human-Verification-Checkbox
 * Eine barrierefreie Alternative zu herkömmlichen CAPTCHAs
 * @param {HTMLFormElement} form - Das Formular
 * @returns {Object} - Checkbox und Fehler-Element
 */
export function createOrGetHumanVerification(form) {
    // Eindeutige ID für die Checkbox generieren
    const checkboxId = `${form.id || getRandomId()}-human-verification`;
    let checkbox = document.getElementById(checkboxId);
    
    // Nur erstellen wenn noch nicht vorhanden
    if (!checkbox) {
        // Container für die Checkbox erstellen
        const container = document.createElement('div');
        container.className = 'captcha-checkbox-container';
        
        // Checkbox-Wrapper erstellen mit korrekter ARIA-Rolle
        const wrapper = document.createElement('div');
        wrapper.className = 'checkbox-wrapper';
        wrapper.setAttribute('role', 'group');
        wrapper.setAttribute('aria-labelledby', `${checkboxId}-label`);
        
        // Unsichtbares Label für Screenreader
        const srLabel = document.createElement('span');
        srLabel.id = `${checkboxId}-label`;
        srLabel.className = 'sr-only';
        srLabel.textContent = 'Bestätigung dass Sie kein Roboter sind';
        
        // Checkbox erstellen mit allen notwendigen Attributen für Barrierefreiheit
        checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = checkboxId;
        checkbox.name = 'human-verification';
        checkbox.setAttribute('aria-required', 'true');
        checkbox.setAttribute('aria-describedby', `${checkboxId}-desc`);
        checkbox.setAttribute('aria-invalid', 'false');
        checkbox.required = true; // Setze required-Attribut
        
        // Sichtbares Label für die Checkbox
        const label = document.createElement('label');
        label.htmlFor = checkboxId;
        label.textContent = 'Ich bin kein Roboter';
        
        // Visuelles Checkmark-Icon (für Screenreader versteckt)
        const icon = document.createElement('div');
        icon.className = 'checkmark-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path fill="none" d="M0 0h24v24H0z"/>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
            </svg>
        `;
        
        // Branding-Element erstellen
        const branding = document.createElement('div');
        branding.id = `${checkboxId}-desc`;
        branding.className = 'captcha-branding';
        branding.innerHTML = `
            <span>geschützt durch</span>
            <strong>Capture Barrierefrei</strong>
        `;
        
        // Fehler-Element für Validierungsmeldungen
        const errorElement = document.createElement('div');
        errorElement.id = `${checkboxId}-error`;
        errorElement.className = 'error-message';
        errorElement.setAttribute('aria-live', 'polite');
        
        // Elemente in korrekter Reihenfolge zusammenfügen
        wrapper.appendChild(srLabel);
        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        wrapper.appendChild(icon);
        
        container.appendChild(wrapper);
        container.appendChild(branding);
        container.appendChild(errorElement);
        
        // Vor dem Submit-Button einfügen oder am Ende des Formulars
        const submitButton = form.querySelector('[type="submit"]');
        if (submitButton && submitButton.parentNode) {
            submitButton.parentNode.insertBefore(container, submitButton);
        } else {
            form.appendChild(container);
        }
        
        // Standard-CSS hinzufügen, falls nicht vorhanden
        ensureStyles();
    }
    
    return { 
        checkbox: checkbox || document.getElementById(checkboxId), 
        errorElement: document.getElementById(`${checkboxId}-error`)
    };
}

/**
 * Stellt sicher, dass die notwendigen CSS-Stile für alle Komponenten vorhanden sind
 * @returns {void}
 */
export function ensureStyles() {
    // Prüfen, ob die Styles bereits im Dokument vorhanden sind
    if (!document.getElementById('capture-barrierefrei-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'capture-barrierefrei-styles';
        styleEl.textContent = `
            /* Visually-Hidden-Klasse für Screenreader-Inhalte */
            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                margin: -1px;
                padding: 0;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                border: 0;
            }
            
            /* Fehlermeldungs-Styling */
            .error-message {
                color: #d32f2f;
                font-size: 0.875rem;
                margin-top: 0.25rem;
                font-weight: 500;
            }
            
            /* Visuelles Feedback für ungültige Eingaben */
            input[aria-invalid="true"],
            textarea[aria-invalid="true"],
            select[aria-invalid="true"] {
                border-color: #d32f2f !important;
            }
            
            /* Container für die CAPTCHA-ähnliche Checkbox */
            .captcha-checkbox-container {
                margin: 2rem 0;
                padding: 1rem;
                border: 1px solid #ccc;
                border-radius: 4px;
                max-width: 300px;
                background-color: #f9f9f9;
            }
            
            /* Styling für den Checkbox-Wrapper */
            .checkbox-wrapper {
                display: flex;
                align-items: center;
                position: relative;
                padding: 10px;
                border-radius: 3px;
                background-color: white;
                border: 1px solid #dadce0;
                box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            }
            
            /* Unsichtbare Checkbox für benutzerdefinierte Darstellung */
            .checkbox-wrapper input[type="checkbox"] {
                opacity: 0;
                position: absolute;
                margin: 0;
                width: 24px;
                height: 24px;
                cursor: pointer;
                z-index: 2;
            }
            
            /* Label-Styling */
            .checkbox-wrapper label {
                margin-left: 34px;
                font-size: 14px;
                cursor: pointer;
            }
            
            /* Benutzerdefiniertes Checkbox-Icon */
            .checkmark-icon {
                position: absolute;
                width: 24px;
                height: 24px;
                left: 10px;
                border: 2px solid #5f6368;
                border-radius: 2px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                overflow: hidden;
            }
            
            /* Aktive Checkbox-Zustände */
            .checkbox-wrapper input[type="checkbox"]:checked + label + .checkmark-icon {
                background-color: #0056b3;
                border-color: #0056b3;
            }
            
            .checkmark-icon svg {
                display: none;
                color: white;
            }
            
            .checkbox-wrapper input[type="checkbox"]:checked + label + .checkmark-icon svg {
                display: block;
                animation: checkmark 0.3s ease-in-out forwards;
            }
            
            /* Animation für das Häkchen */
            @keyframes checkmark {
                0% { transform: scale(0); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
            
            /* Branding-Komponente */
            .captcha-branding {
                margin-top: 8px;
                display: flex;
                justify-content: flex-end;
                align-items: center;
                font-size: 10px;
                color: #5f6368;
            }
            
            .captcha-branding strong {
                margin-left: 5px;
                color: #0056b3;
            }
            
            /* Fokus-Indikator für Tastatur-Benutzer */
            .checkbox-wrapper input[type="checkbox"]:focus + label + .checkmark-icon {
                outline: 3px solid #4d90fe;
                outline-offset: 2px;
            }
            
            /* Erfolgsmeldung-Styling */
            .success-message {
                background-color: #e8f5e9;
                border-left: 4px solid #4caf50;
                padding: 20px;
                margin-bottom: 20px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                animation: fadeIn 0.5s ease-in-out;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .success-message .success-icon {
                margin-right: 15px;
                color: #4caf50;
                flex-shrink: 0;
            }
            
            .success-message p {
                margin: 0;
                font-weight: 500;
            }
            
            /* Deaktivierter Button Styling */
            button[disabled], 
            button[aria-disabled="true"],
            button.disabled {
                background-color: #cccccc !important;
                color: #666666 !important;
                cursor: not-allowed !important;
                opacity: 0.7;
                box-shadow: none !important;
            }
            
            button[disabled]:hover,
            button[aria-disabled="true"]:hover, 
            button.disabled:hover {
                background-color: #cccccc !important;
                cursor: not-allowed !important;
            }
            
            /* Tooltip für deaktivierten Button */
            button[aria-disabled="true"]::after {
                content: attr(aria-label);
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
                visibility: hidden;
                opacity: 0;
                transition: visibility 0s, opacity 0.3s;
            }
            
            button[aria-disabled="true"]:hover::after {
                visibility: visible;
                opacity: 1;
            }
            
            /* Responsive Anpassungen */
            @media (max-width: 600px) {
                .captcha-checkbox-container {
                    max-width: 100%;
                }
            }
        `;
        document.head.appendChild(styleEl);
    }
}

/**
 * Zeigt eine barrierefreie Erfolgsmeldung an und versteckt das Formular
 * @param {HTMLFormElement} form - Das Formular
 * @returns {HTMLElement} - Das erstellte Erfolgsmeldungselement
 */
export function displaySuccessMessage(form) {
    // Prüfen, ob bereits eine Erfolgsmeldung vorhanden ist
    if (form.previousElementSibling && form.previousElementSibling.classList.contains('success-message')) {
        return form.previousElementSibling;
    }
    
    // Erfolgsmeldung erstellen mit korrekten ARIA-Attributen
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.setAttribute('role', 'alert'); // Screenreader lesen sofort vor
    successMessage.setAttribute('aria-live', 'assertive'); // Wichtige Änderung
    successMessage.innerHTML = `
        <div class="success-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
                <path fill="none" d="M0 0h24v24H0z"/>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
            </svg>
        </div>
        <p>Ihre Nachricht wurde erfolgreich gesendet. Vielen Dank für Ihre Kontaktaufnahme!</p>
    `;
    
    // Vor dem Formular einfügen
    form.parentNode.insertBefore(successMessage, form);
    
    // Formular ausblenden um Doppel-Submissions zu vermeiden
    form.style.display = 'none';
    
    return successMessage;
}

/**
 * Stellt sicher, dass alle erforderlichen Barrierefreiheits-Features aktiviert sind
 * @param {HTMLElement} container - Der Container, in dem die Features aktiviert werden sollen
 * @returns {void}
 */
export function ensureAccessibilityFeatures(container = document.body) {
    // Skip-Link hinzufügen, falls nicht vorhanden
    if (!document.querySelector('.skip-link')) {
        const mainContent = document.getElementById('main-content') || 
                           document.querySelector('main') || 
                           document.querySelector('[role="main"]');
        
        if (mainContent && !mainContent.id) {
            mainContent.id = 'main-content';
        }
        
        if (mainContent) {
            const skipLink = document.createElement('a');
            skipLink.href = `#${mainContent.id}`;
            skipLink.className = 'skip-link';
            skipLink.textContent = 'Zum Hauptinhalt springen';
            
            document.body.insertBefore(skipLink, document.body.firstChild);
        }
    }
    
    // Stellen Sie sicher, dass alle interaktiven Elemente fokussierbar sind
    const interactiveElements = container.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    interactiveElements.forEach(el => {
        if (!el.hasAttribute('tabindex') && el.style.display !== 'none' && el.style.visibility !== 'hidden') {
            // Element ist sichtbar und interaktiv, aber nicht explizit aus Tab-Reihenfolge entfernt
            el.setAttribute('tabindex', '0');
        }
    });
}
