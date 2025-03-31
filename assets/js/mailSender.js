/**
 * MailSender - Agnostisches Mail-Sende-Script
 * Scannt Formularfelder automatisch und sendet die Daten
 */
class MailSender {
    constructor(config = {}) {
        // Standard-Konfiguration
        this.config = {
            recipient: 'empfaenger@beispiel.de', // Standard-Empfänger
            subject: 'Nachricht vom Kontaktformular',
            formSelector: 'form',
            endpoint: '/send_mail.php', // Server-Endpunkt für das Senden
            method: 'POST',
            debug: false,
            preserveFormHandlers: false, // Option zum Erhalten vorhandener Handlers
            resetFormOnSuccess: true,    // Formular nur bei Erfolg zurücksetzen
            resetFormOnFailure: false,   // Formular bei Fehlern nicht zurücksetzen
            maxFileSize: 5 * 1024 * 1024, // 5MB maximale Dateigröße
            allowedFileTypes: ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'], // Erlaubte Dateitypen
            useTemplates: true,         // Template-Unterstützung standardmäßig deaktiviert
            ...config // Überschreibe mit benutzerdefinierten Einstellungen
        };

        // Template-Konfiguration initialisieren
        this.templateConfig = null;

        // Endpoint prüfen und korrigieren (relativer Pfad)
        if (this.config.endpoint.startsWith('/')) {
            this.config.endpoint = this.config.endpoint.substring(1);
        }

        if (this.config.debug) {
            console.log('MailSender initialisiert mit Konfiguration:', this.config);
        }

        this.init();
    }

    init() {
        // Versuche, die Initialisierung zu verzögern, bis das DOM vollständig geladen ist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindForms());
        } else {
            this.bindForms();
        }
    }
    
    bindForms() {
        // Alle passenden Formulare finden und Event-Listener hinzufügen
        const forms = document.querySelectorAll(this.config.formSelector);
        
        if (forms.length === 0 && this.config.debug) {
            console.warn(`MailSender: Keine Formulare mit Selektor "${this.config.formSelector}" gefunden.`);
            return;
        }
        
        forms.forEach(form => {
            // Entferne action-Attribut, um unbeabsichtigte Weiterleitungen zu verhindern
            if (form.getAttribute('action') === '#' || form.getAttribute('action') === '') {
                form.removeAttribute('action');
            }
            
            // GEÄNDERT: Nur wenn preserveFormHandlers false ist, Form ersetzen
            if (!this.config.preserveFormHandlers) {
                // Ersetze vorhandene Event-Listener, um Konflikte zu vermeiden
                const newForm = form.cloneNode(true);
                form.parentNode.replaceChild(newForm, form);
                form = newForm; // Form-Referenz aktualisieren
            }
            
            // Stelle sicher, dass der Submit-Handler nach anderen Skripten ausgeführt wird
            form.addEventListener('submit', (e) => this.handleSubmit(e), { capture: true });
            
            if (this.config.debug) {
                console.log(`MailSender: Formular gefunden und Listener hinzugefügt`, form);
            }
        });
    }

    handleSubmit(event) {
        // Verhindern der Standard-Formularübermittlung, aber Ereignis-Propagation erlauben für andere Handler
        event.preventDefault();
        
        try {
            const form = event.target;
            
            // Reguläre Formulardaten extrahieren für Template-Verarbeitung
            const formDataPlain = this.scanFormFields(form);
            
            // FormData-Objekt für Dateien und reguläre Felder verwenden
            const formDataObj = new FormData(form);
            
            // Empfänger und Betreff manuell hinzufügen
            formDataObj.append('recipient', this.config.recipient);
            formDataObj.append('subject', this.config.subject);
            
            // Templates anwenden, falls konfiguriert
            if (this.config.useTemplates && this.templateConfig) {
                this.applyTemplates(formDataPlain, form);
                
                // Aktualisierte Werte aus der Template-Verarbeitung in FormData einfügen
                if (formDataPlain.subject) {
                    formDataObj.set('subject', formDataPlain.subject);
                }
                
                if (formDataPlain.customBody) {
                    formDataObj.set('customBody', formDataPlain.customBody);
                }
                
                // Bestätigungsmail-Daten hinzufügen, falls vorhanden
                if (formDataPlain.confirmation) {
                    formDataObj.set('confirmationRecipient', formDataPlain.confirmation.recipient);
                    formDataObj.set('confirmationSubject', formDataPlain.confirmation.subject);
                    formDataObj.set('confirmationBody', formDataPlain.confirmation.body);
                }
            }
            
            // Nur für Debugging - reguläre Formulardaten zeigen
            if (this.config.debug) {
                const formFields = {};
                for (let [key, value] of formDataObj.entries()) {
                    // Dateien nicht im Log anzeigen (zu umfangreich)
                    if (!(value instanceof File)) {
                        formFields[key] = value;
                    } else {
                        formFields[key] = `Datei: ${value.name} (${this.formatFileSize(value.size)})`;
                    }
                }
                console.log('MailSender: Gesammelte Formulardaten:', formFields);
                console.log('MailSender: Sende an Endpoint:', this.config.endpoint);
            }
            
            // Dateien validieren, wenn vorhanden
            const fileInputs = form.querySelectorAll('input[type="file"]');
            if (fileInputs.length > 0) {
                for (const fileInput of fileInputs) {
                    if (fileInput.files.length > 0) {
                        const isValid = this.validateFiles(fileInput.files);
                        if (!isValid) {
                            return false; // Abbrechen, wenn Dateien ungültig sind
                        }
                    }
                }
            }
            
            this.sendMailWithFiles(formDataObj, form);
        } catch (error) {
            console.error('MailSender: Fehler beim Verarbeiten des Formulars', error);
            // Fallback, falls ein Fehler auftritt
            if (this.config.fallbackToMailto) {
                this.openMailtoFallback({
                    recipient: this.config.recipient,
                    subject: this.config.subject,
                    message: 'Fehler beim Verarbeiten des Formulars'
                });
            }
        }
        
        return false;
    }

    scanFormFields(form) {
        const formData = {};
        
        // Alle Formularelemente durchgehen
        const elements = form.elements;
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            
            // Ignoriere Submit-Buttons, leere Namen und Datei-Inputs (werden separat behandelt)
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
        
        // Datei-Inputs separat scannen und Informationen extrahieren
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
                            size: this.formatFileSize(file.size),
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
        
        // Basisdaten hinzufügen
        formData.recipient = this.config.recipient;
        formData.subject = this.config.subject;
        
        return formData;
    }

    validateFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Dateigröße überprüfen
            if (file.size > this.config.maxFileSize) {
                const maxSizeMB = this.config.maxFileSize / (1024 * 1024);
                alert(`Die Datei "${file.name}" ist zu groß. Maximale Größe: ${maxSizeMB}MB`);
                return false;
            }
            
            // Dateityp überprüfen
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            if (!this.config.allowedFileTypes.includes(fileExtension)) {
                alert(`Der Dateityp "${fileExtension}" ist nicht erlaubt. Erlaubte Typen: ${this.config.allowedFileTypes.join(', ')}`);
                return false;
            }
        }
        
        return true;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    sendMail(formData, form) {
        if (this.config.useTemplates && this.templateConfig) {
            this.applyTemplates(formData, form);
        }

        const fileInputs = form.querySelectorAll('input[type="file"]');
        if (fileInputs.length === 0) {
            this.updateFormStatus(form, 'sending', 'Nachricht wird gesendet...');
            
            if (this.config.debug) {
                console.log('MailSender: Sende Daten an', this.config.endpoint, formData);
            }
            
            fetch(this.config.endpoint, {
                method: this.config.method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(formData),
                credentials: 'same-origin'
            })
            .then(response => {
                if (this.config.debug) {
                    console.log('MailSender: Server-Antwort erhalten', response);
                }
                
                if (!response.ok) {
                    throw new Error(`Server antwortet mit Statuscode ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (this.config.debug) {
                    console.log('MailSender: Antwort-Daten', data);
                }
                
                this.updateFormStatus(form, 'success', 'Ihre Nachricht wurde erfolgreich gesendet!');
                
                if (this.config.resetFormOnSuccess) {
                    form.reset();
                    if (this.config.debug) {
                        console.log('MailSender: Formular zurückgesetzt nach erfolgreichem Senden');
                    }
                } else if (this.config.debug) {
                    console.log('MailSender: Formular bleibt nach erfolgreichem Senden erhalten (resetFormOnSuccess: false)');
                }
                
                if (this.config.debug) {
                    console.log('MailSender: E-Mail erfolgreich gesendet', data);
                }
            })
            .catch(error => {
                console.error('MailSender: Fehler beim Senden der Anfrage', error);
                this.updateFormStatus(form, 'error', 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
                
                if (this.config.resetFormOnFailure) {
                    form.reset();
                    if (this.config.debug) {
                        console.log('MailSender: Formular zurückgesetzt nach fehlgeschlagenem Senden');
                    }
                } else if (this.config.debug) {
                    console.log('MailSender: Formular bleibt nach fehlgeschlagenem Senden erhalten (resetFormOnFailure: false)');
                }
                
                if (this.config.fallbackToMailto) {
                    this.openMailtoFallback(formData);
                }
            });
        } else {
            const formDataObj = new FormData(form);
            for (const key in formData) {
                formDataObj.append(key, formData[key]);
            }
            this.sendMailWithFiles(formDataObj, form);
        }
    }

    sendMailWithFiles(formData, form) {
        const feedbackElement = document.getElementById('form-feedback') || 
                               form.querySelector('[aria-live]') || 
                               document.createElement('div');
        
        this.updateFormStatus(form, 'sending', 'Nachricht wird gesendet...');
        
        if (this.config.debug) {
            console.log('MailSender: Sende Daten mit Dateien an', this.config.endpoint);
        }
        
        fetch(this.config.endpoint, {
            method: this.config.method,
            body: formData,
            credentials: 'same-origin'
        })
        .then(response => {
            if (this.config.debug) {
                console.log('MailSender: Server-Antwort erhalten', response);
            }
            
            if (!response.ok) {
                throw new Error(`Server antwortet mit Statuscode ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (this.config.debug) {
                console.log('MailSender: Antwort-Daten', data);
            }
            
            this.updateFormStatus(form, 'success', 'Ihre Nachricht wurde erfolgreich gesendet!');
            
            if (this.config.resetFormOnSuccess) {
                form.reset();
                if (this.config.debug) {
                    console.log('MailSender: Formular zurückgesetzt nach erfolgreichem Senden');
                }
            } else if (this.config.debug) {
                console.log('MailSender: Formular bleibt nach erfolgreichem Senden erhalten (resetFormOnSuccess: false)');
            }
            
            if (this.config.debug) {
                console.log('MailSender: E-Mail erfolgreich gesendet', data);
            }
        })
        .catch(error => {
            console.error('MailSender: Fehler beim Senden der Anfrage', error);
            this.updateFormStatus(form, 'error', 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
            
            if (this.config.resetFormOnFailure) {
                form.reset();
                if (this.config.debug) {
                    console.log('MailSender: Formular zurückgesetzt nach fehlgeschlagenem Senden');
                }
            } else if (this.config.debug) {
                console.log('MailSender: Formular bleibt nach fehlgeschlagenem Senden erhalten (resetFormOnFailure: false)');
            }
            
            if (this.config.fallbackToMailto) {
                this.openMailtoFallback(this.scanFormFields(form));
            }
        });
    }

    updateFormStatus(form, status, message) {
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

    openMailtoFallback(formData) {
        let body = '';
        for (const key in formData) {
            if (key !== 'recipient' && key !== 'subject') {
                body += `${key}: ${formData[key]}\n`;
            }
        }
        
        const mailtoLink = `mailto:${formData.recipient}?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(body)}`;
        
        if (this.config.debug) {
            console.log('MailSender: Öffne Mailto-Fallback', mailtoLink);
        }
        
        window.location.href = mailtoLink;
    }

    setTemplates(config) {
        this.templateConfig = config;
        
        if (this.config.debug) {
            console.log('MailSender: Template-Konfiguration gesetzt', config);
        }
    }

    applyTemplates(formData, form) {
        if (!this.templateConfig || !this.templateConfig.templates) {
            if (this.config.debug) {
                console.warn('MailSender: Keine Template-Konfiguration vorhanden');
            }
            return;
        }

        try {
            const templateName = form.dataset.template || Object.keys(this.templateConfig.templates)[0];
            const templateConfig = this.templateConfig.templates[templateName];

            if (!templateConfig) {
                if (this.config.debug) {
                    console.warn(`MailSender: Kein Template mit Namen "${templateName}" gefunden`);
                }
                return;
            }

            if (templateConfig.subject) {
                formData.subject = this.replacePlaceholders(templateConfig.subject, formData);
            }

            // Dynamische Template-Erstellung basierend auf den Formularfeldern
            if (templateConfig.body) {
                // Normales Template-Verhalten beibehalten
                let bodyTemplate = templateConfig.body;
                
                // Prüfen, ob das Template dynamisch erstellt werden soll
                if (templateConfig.dynamicBody) {
                    bodyTemplate = this.createDynamicTemplate(bodyTemplate, formData, form);
                }
                
                formData.customBody = this.replacePlaceholders(bodyTemplate, formData);
            }

            // Auch für Bestätigungsmails dynamische Templates unterstützen
            if (templateConfig.confirmation && templateConfig.confirmation.enabled) {
                let confirmationBody = templateConfig.confirmation.body;
                
                if (templateConfig.confirmation.dynamicBody) {
                    confirmationBody = this.createDynamicTemplate(confirmationBody, formData, form);
                }
                
                formData.confirmation = {
                    recipient: formData.email || '',
                    subject: this.replacePlaceholders(templateConfig.confirmation.subject, formData),
                    body: this.replacePlaceholders(confirmationBody, formData)
                };
            }

            if (this.config.debug) {
                console.log('MailSender: Templates angewendet', {
                    template: templateName,
                    subject: formData.subject,
                    hasCustomBody: !!formData.customBody,
                    hasConfirmation: !!formData.confirmation,
                    dynamicTemplateUsed: !!(templateConfig.dynamicBody || 
                                         (templateConfig.confirmation && templateConfig.confirmation.dynamicBody))
                });
            }
        } catch (error) {
            console.error('MailSender: Fehler bei der Anwendung von Templates', error);
        }
    }

    /**
     * Erstellt ein dynamisches Template basierend auf den Formularfeldern
     * @param {string} baseTemplate - Die Basis-Template-HTML
     * @param {Object} formData - Die gesammelten Formulardaten
     * @param {HTMLFormElement} form - Das Formular-Element
     * @returns {string} - Das angepasste Template
     */
    createDynamicTemplate(baseTemplate, formData, form) {
        // Prüfen, ob das Template den Platzhalter für dynamische Felder enthält
        if (!baseTemplate.includes('{{dynamicFields}}')) {
            return baseTemplate; // Wenn nicht, unverändert zurückgeben
        }
        
        let dynamicFieldsHtml = '';
        const excludedFields = ['recipient', 'subject', 'customBody', 'confirmation', 'hasAttachments', 'attachments'];
        
        // Alle Formularfelder durchgehen und HTML-Struktur für jedes Feld erzeugen
        for (const fieldName in formData) {
            // Systeminterne Felder und leere Werte überspringen
            if (excludedFields.includes(fieldName) || 
                formData[fieldName] === undefined || 
                formData[fieldName] === '') {
                continue;
            }
            
            // Prüfen, ob es sich um ein Array oder Objekt handelt
            if (Array.isArray(formData[fieldName]) || typeof formData[fieldName] === 'object') {
                continue; // Komplexe Datentypen überspringen - werden durch andere Mechanismen gehandhabt
            }
            
            // Label für das Feld finden oder erstellen
            let labelText = this.getFieldLabel(fieldName, form);
            
            // HTML für das Feld erstellen
            dynamicFieldsHtml += `
            <div class="field">
                <span class="label">${labelText}:</span> ${formData[fieldName]}
            </div>`;
        }
        
        // Nachrichtenfeld gesondert behandeln, falls vorhanden
        if (formData.nachricht) {
            dynamicFieldsHtml += `
            <div class="message">
                <span class="label">Nachricht:</span>
                <p>${formData.nachricht}</p>
            </div>`;
        }
        
        // Platzhalter im Template ersetzen
        return baseTemplate.replace('{{dynamicFields}}', dynamicFieldsHtml);
    }
    
    /**
     * Versucht, das Label für ein Formularfeld zu finden
     * @param {string} fieldName - Der Name des Formularfelds
     * @param {HTMLFormElement} form - Das Formular
     * @returns {string} - Der Labeltext oder ein formatierter Feldname
     */
    getFieldLabel(fieldName, form) {
        // Versuchen, das Label-Element im Formular zu finden
        const input = form.querySelector(`[name="${fieldName}"]`);
        if (input && input.id) {
            const label = form.querySelector(`label[for="${input.id}"]`);
            if (label) {
                return label.textContent;
            }
        }
        
        // Fallback: Feldnamen formatieren (erste Buchstabe groß)
        return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    }

    replacePlaceholders(template, data) {
        let result = template;

        result = result.replace(/\{\{([^#\/][^}]*)\}\}/g, (match, key) => {
            const trimmedKey = key.trim();
            
            if (this.templateConfig.functions && this.templateConfig.functions[trimmedKey]) {
                return this.templateConfig.functions[trimmedKey]();
            }
            
            const value = data[trimmedKey];
            if (value !== undefined) {
                return value;
            } else if (this.templateConfig.defaults && this.templateConfig.defaults[trimmedKey]) {
                return this.templateConfig.defaults[trimmedKey];
            }
            
            return '';
        });

        result = this.processConditionalBlocks(result, data);

        if (data.attachments) {
            result = this.processLoops(result, data);
        }

        return result;
    }

    processConditionalBlocks(template, data) {
        return template.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
            const trimmedCondition = condition.trim();
            if (data[trimmedCondition]) {
                return content;
            }
            return '';
        });
    }

    processLoops(template, data) {
        return template.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, content) => {
            const trimmedArrayName = arrayName.trim();
            const array = data[trimmedArrayName];
            
            if (!Array.isArray(array)) {
                return '';
            }
            
            return array.map(item => {
                return content.replace(/\{\{this\.([^}]+)\}\}/g, (m, key) => {
                    return item[key] !== undefined ? item[key] : '';
                });
            }).join('');
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MailSender;
}
