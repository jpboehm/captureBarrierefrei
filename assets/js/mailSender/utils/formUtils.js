/**
 * Formular-Hilfsfunktionen
 * 
 * Sammlung von Hilfsfunktionen für die Verarbeitung von Formularen,
 * Extraktion von Daten und Event-Handling.
 * 
 * @module formUtils
 */

/**
 * Bindet Event-Listener an Formulare
 * @param {MailSender} instance - Die MailSender-Instanz
 * @public
 */
export function bindForms(instance) {
    const forms = document.querySelectorAll(instance.config.formSelector);
    
    if (forms.length === 0 && instance.config.debug) {
        console.warn(`MailSender: Keine Formulare mit Selektor "${instance.config.formSelector}" gefunden.`);
        return;
    }
    
    forms.forEach(form => {
        // Entferne action-Attribut, um unbeabsichtigte Weiterleitungen zu verhindern
        if (form.getAttribute('action') === '#' || form.getAttribute('action') === '') {
            form.removeAttribute('action');
        }
        
        // GEÄNDERT: Nur wenn preserveFormHandlers false ist, Form ersetzen
        if (!instance.config.preserveFormHandlers) {
            // Ersetze vorhandene Event-Listener, um Konflikte zu vermeiden
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            form = newForm; // Form-Referenz aktualisieren
        }
        
        // Submit-Handler mit Bindung an die MailSender-Instanz
        form.addEventListener('submit', (e) => instance.handleSubmit(e), { capture: true });
        
        if (instance.config.debug) {
            console.log(`MailSender: Formular gefunden und Listener hinzugefügt`, form);
        }
    });
}

/**
 * Scannt alle Felder eines Formulars und extrahiert die Daten
 * @param {HTMLFormElement} form - Das Formular
 * @returns {Object} - Ein Objekt mit den Formulardaten
 * @public
 */
export function scanFormFields(form) {
    const formData = {};
    
    // Alle Formularelemente durchgehen
    const elements = form.elements;
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        
        // Ignoriere Submit-Buttons, leere Namen und Datei-Inputs
        if (element.type === 'submit' || !element.name || element.type === 'file') continue;
        
        // Wert je nach Elementtyp extrahieren
        if (element.type === 'checkbox' || element.type === 'radio') {
            if (element.checked) {
                formData[element.name] = element.value;
            }
        } else if (element.type === 'select-multiple') {
            const selectedValues = [];
            for (let j = 0; j < element.options.length; j++) {
                if (element.options[j].selected) {
                    selectedValues.push(element.options[j].value);
                }
            }
            formData[element.name] = selectedValues;
        } else {
            formData[element.name] = element.value;
        }
    }
    
    // Datei-Inputs separat scannen
    const fileInputs = form.querySelectorAll('input[type="file"]');
    if (fileInputs.length > 0) {
        const attachments = [];
        let hasAttachments = false;
        
        for (const fileInput of fileInputs) {
            if (fileInput.files.length > 0) {
                hasAttachments = true;
                for (let i = 0; i < fileInput.files.length; i++) {
                    const file = fileInput.files[i];
                    attachments.push({
                        name: file.name,
                        size: formatFileSize(file.size),
                        type: file.type
                    });
                }
            }
        }
        
        if (hasAttachments) {
            formData.hasAttachments = true;
            formData.attachments = attachments;
        }
    }
    
    return formData;
}

/**
 * Aktualisiert den Formularstatus und zeigt Feedback an
 * @param {HTMLFormElement} form - Das Formular
 * @param {string} status - Der Status (sending, success, error)
 * @param {string} message - Die anzuzeigende Nachricht
 * @public
 */
export function updateFormStatus(form, status, message) {
    const feedbackElement = document.getElementById('form-feedback');
    if (feedbackElement) {
        feedbackElement.textContent = message;
        feedbackElement.className = `sr-only status-${status}`;
    }
    
    form.setAttribute('data-status', status);
    
    const ariaLive = form.querySelector('[aria-live="assertive"]');
    if (ariaLive) {
        ariaLive.textContent = message;
    }
}

/**
 * Formatiert eine Dateigröße in menschenlesbares Format
 * @param {number} bytes - Die Größe in Bytes
 * @returns {string} - Formatierte Größe mit Einheit
 * @public
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Versucht, das Label für ein Formularfeld zu finden
 * @param {string} fieldName - Der Name des Formularfelds
 * @param {HTMLFormElement} form - Das Formular
 * @returns {string} - Der Labeltext oder ein formatierter Feldname
 * @public
 */
export function getFieldLabel(fieldName, form) {
    // Versuchen, das Label-Element im Formular zu finden
    const input = form.querySelector(`[name="${fieldName}"]`);
    if (input && input.id) {
        const label = form.querySelector(`label[for="${input.id}"]`);
        if (label) {
            return label.textContent;
        }
    }
    
    // Fallback: Feldnamen formatieren (erster Buchstabe groß)
    return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
}
