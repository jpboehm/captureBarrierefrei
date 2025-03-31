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
            
            // FormData-Objekt für Dateien und reguläre Felder verwenden
            const formDataObj = new FormData(form);
            
            // Empfänger und Betreff manuell hinzufügen
            formDataObj.append('recipient', this.config.recipient);
            formDataObj.append('subject', this.config.subject);
            
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
            
            // Ignoriere Submit-Buttons und Elemente ohne Namen
            if (element.type === 'submit' || !element.name) continue;
            
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
        
        return formData;
    }

    // Neue Methode zur Validierung von Dateien
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
    
    // Hilfsmethode zum Formatieren der Dateigröße
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    sendMail(formData, form) {
        // Wenn Templates konfiguriert sind, wenden wir sie an
        if (this.config.useTemplates && this.templateConfig) {
            this.applyTemplates(formData, form);
        }

        // Wenn es keine Datei-Inputs gibt, verwende die alte Methode
        const fileInputs = form.querySelectorAll('input[type="file"]');
        if (fileInputs.length === 0) {
            // Status-Indikator setzen
            this.updateFormStatus(form, 'sending', 'Nachricht wird gesendet...');
            
            if (this.config.debug) {
                console.log('MailSender: Sende Daten an', this.config.endpoint, formData);
            }
            
            // Senden mit Fetch API
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
                // Debug-Informationen anzeigen
                if (this.config.debug) {
                    console.log('MailSender: Antwort-Daten', data);
                }
                
                // Erfolgreiche Antwort
                this.updateFormStatus(form, 'success', 'Ihre Nachricht wurde erfolgreich gesendet!');
                
                // Formular nur zurücksetzen, wenn resetFormOnSuccess true ist
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
                // Fehlerbehandlung
                console.error('MailSender: Fehler beim Senden der Anfrage', error);
                this.updateFormStatus(form, 'error', 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
                
                // Formular nur zurücksetzen, wenn resetFormOnFailure true ist
                if (this.config.resetFormOnFailure) {
                    form.reset();
                    if (this.config.debug) {
                        console.log('MailSender: Formular zurückgesetzt nach fehlgeschlagenem Senden');
                    }
                } else if (this.config.debug) {
                    console.log('MailSender: Formular bleibt nach fehlgeschlagenem Senden erhalten (resetFormOnFailure: false)');
                }
                
                // Fallback: Mailto-Link öffnen, wenn Server-Senden fehlschlägt
                if (this.config.fallbackToMailto) {
                    this.openMailtoFallback(formData);
                }
            });
        } else {
            // Bei Datei-Inputs, FormData erstellen und die neue Methode verwenden
            const formDataObj = new FormData(form);
            for (const key in formData) {
                formDataObj.append(key, formData[key]);
            }
            this.sendMailWithFiles(formDataObj, form);
        }
    }

    // Neue Methode zum Senden von Formulardaten mit Dateien
    sendMailWithFiles(formData, form) {
        // Feedback-Element für Screenreader finden
        const feedbackElement = document.getElementById('form-feedback') || 
                               form.querySelector('[aria-live]') || 
                               document.createElement('div');
        
        // Status-Indikator setzen
        this.updateFormStatus(form, 'sending', 'Nachricht wird gesendet...');
        
        if (this.config.debug) {
            console.log('MailSender: Sende Daten mit Dateien an', this.config.endpoint);
        }
        
        // Senden mit Fetch API mit FormData (unterstützt Dateien)
        fetch(this.config.endpoint, {
            method: this.config.method,
            body: formData, // FormData direkt verwenden
            credentials: 'same-origin'
            // Wichtig: Keine Content-Type Header setzen, da FormData automatisch 'multipart/form-data' verwendet
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
            // Debug-Informationen anzeigen
            if (this.config.debug) {
                console.log('MailSender: Antwort-Daten', data);
            }
            
            // Erfolgreiche Antwort
            this.updateFormStatus(form, 'success', 'Ihre Nachricht wurde erfolgreich gesendet!');
            
            // Formular nur zurücksetzen, wenn resetFormOnSuccess true ist
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
            // Fehlerbehandlung
            console.error('MailSender: Fehler beim Senden der Anfrage', error);
            this.updateFormStatus(form, 'error', 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
            
            // Formular nur zurücksetzen, wenn resetFormOnFailure true ist
            if (this.config.resetFormOnFailure) {
                form.reset();
                if (this.config.debug) {
                    console.log('MailSender: Formular zurückgesetzt nach fehlgeschlagenem Senden');
                }
            } else if (this.config.debug) {
                console.log('MailSender: Formular bleibt nach fehlgeschlagenem Senden erhalten (resetFormOnFailure: false)');
            }
            
            // Fallback: Mailto-Link öffnen, wenn Server-Senden fehlschlägt
            if (this.config.fallbackToMailto) {
                this.openMailtoFallback(this.scanFormFields(form));
            }
        });
    }

    updateFormStatus(form, status, message) {
        // Feedback-Element aktualisieren
        const feedbackElement = document.getElementById('form-feedback');
        if (feedbackElement) {
            feedbackElement.textContent = message;
            feedbackElement.className = `sr-only status-${status}`;
        }
        
        // Visuelles Feedback (optional)
        form.setAttribute('data-status', status);
        
        // Aria-live für Screenreader
        const ariaLive = form.querySelector('[aria-live="assertive"]');
        if (ariaLive) {
            ariaLive.textContent = message;
        }
    }

    openMailtoFallback(formData) {
        // Erstelle Mailto-Link als Fallback
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

    /**
     * Setzt die Template-Konfiguration für E-Mails
     * @param {Object} config - Konfigurationsobjekt für Templates
     */
    setTemplates(config) {
        this.templateConfig = config;
        
        if (this.config.debug) {
            console.log('MailSender: Template-Konfiguration gesetzt', config);
        }
    }

    /**
     * Wendet Template auf Formulardaten an
     * @param {Object} formData - Die gesammelten Formulardaten
     * @param {HTMLFormElement} form - Das Formular-Element
     */
    applyTemplates(formData, form) {
        if (!this.templateConfig || !this.templateConfig.templates) {
            if (this.config.debug) {
                console.warn('MailSender: Keine Template-Konfiguration vorhanden');
            }
            return;
        }

        try {
            // Standard-Template verwenden oder das erste in der Konfiguration
            const templateName = form.dataset.template || Object.keys(this.templateConfig.templates)[0];
            const templateConfig = this.templateConfig.templates[templateName];

            if (!templateConfig) {
                if (this.config.debug) {
                    console.warn(`MailSender: Kein Template mit Namen "${templateName}" gefunden`);
                }
                return;
            }

            // Betreff aus Template mit Platzhaltern ersetzen
            if (templateConfig.subject) {
                formData.subject = this.replacePlaceholders(templateConfig.subject, formData);
            }

            // E-Mail-Body aus Template mit Platzhaltern ersetzen
            if (templateConfig.body) {
                formData.customBody = this.replacePlaceholders(templateConfig.body, formData);
            }

            // Generiere Bestätigungs-E-Mail falls konfiguriert
            if (templateConfig.confirmation && templateConfig.confirmation.enabled) {
                formData.confirmation = {
                    recipient: formData.email || '',
                    subject: this.replacePlaceholders(templateConfig.confirmation.subject, formData),
                    body: this.replacePlaceholders(templateConfig.confirmation.body, formData)
                };
            }

            if (this.config.debug) {
                console.log('MailSender: Templates angewendet', {
                    template: templateName,
                    subject: formData.subject,
                    hasCustomBody: !!formData.customBody,
                    hasConfirmation: !!formData.confirmation
                });
            }
        } catch (error) {
            console.error('MailSender: Fehler bei der Anwendung von Templates', error);
        }
    }

    /**
     * Ersetzt Platzhalter im Template mit tatsächlichen Werten
     * @param {string} template - Der Template-String
     * @param {Object} data - Objekt mit Ersetzungswerten
     * @returns {string} - Template mit ersetzten Platzhaltern
     */
    replacePlaceholders(template, data) {
        let result = template;

        // Einfache Platzhalter ersetzen {{variable}}
        result = result.replace(/\{\{([^#\/][^}]*)\}\}/g, (match, key) => {
            const trimmedKey = key.trim();
            
            // Prüfen ob es eine Funktion in der Template-Konfiguration gibt
            if (this.templateConfig.functions && this.templateConfig.functions[trimmedKey]) {
                return this.templateConfig.functions[trimmedKey]();
            }
            
            // Sonst den Wert aus den Formulardaten oder einen Standardwert verwenden
            const value = data[trimmedKey];
            if (value !== undefined) {
                return value;
            } else if (this.templateConfig.defaults && this.templateConfig.defaults[trimmedKey]) {
                return this.templateConfig.defaults[trimmedKey];
            }
            
            // Wenn kein Wert gefunden wurde, Platzhalter entfernen
            return '';
        });

        // Bedingte Blöcke verarbeiten {{#if variable}}...{{/if}}
        result = this.processConditionalBlocks(result, data);

        // Listen verarbeiten {{#each array}}...{{/each}}
        if (data.attachments) {
            result = this.processLoops(result, data);
        }

        return result;
    }

    /**
     * Verarbeitet bedingte Blöcke im Template
     * @param {string} template - Das Template
     * @param {Object} data - Die Daten
     * @returns {string} - Verarbeitetes Template
     */
    processConditionalBlocks(template, data) {
        return template.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
            const trimmedCondition = condition.trim();
            // Prüfen, ob der Wert existiert oder true ist
            if (data[trimmedCondition]) {
                return content;
            }
            return '';
        });
    }

    /**
     * Verarbeitet Schleifen im Template
     * @param {string} template - Das Template
     * @param {Object} data - Die Daten
     * @returns {string} - Verarbeitetes Template
     */
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

// Exportiere für Module-Systeme
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MailSender;
}
