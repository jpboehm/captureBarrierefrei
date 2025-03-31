/**
 * MailSender - Hauptklasse
 * 
 * Koordiniert die E-Mail-Versand-Funktionalität mit Formularverarbeitung,
 * Templateunterstützung und Dateianhangsbehandlung.
 * 
 * @class
 */

import ConfigManager from './ConfigManager.js';
import { scanFormFields, bindForms, updateFormStatus } from '../utils/formUtils.js';
import { validateFiles, formatFileSize } from '../utils/fileValidator.js';
import { replacePlaceholders, processConditionalBlocks, processLoops, createDynamicTemplate } from '../utils/templateEngine.js';
import { sendRequest, openMailtoFallback } from '../utils/ajaxHandler.js';

class MailSender {
    /**
     * Initialisiert einen neuen MailSender
     * @param {Object} config - Benutzerdefinierte Konfigurationsoptionen
     */
    constructor(config = {}) {
        // Konfigurationsmanager initialisieren
        this.configManager = new ConfigManager(config);
        this.config = this.configManager.getConfig();
        
        // Template-Konfiguration
        this.templateConfig = null;

        if (this.config.debug) {
            console.log('MailSender initialisiert mit Konfiguration:', this.config);
        }

        this.init();
    }

    /**
     * Initialisiert den MailSender und bindet Formular-Listener
     * @private
     */
    init() {
        // Initialisierung verzögern, bis DOM vollständig geladen ist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindForms());
        } else {
            this.bindForms();
        }
    }
    
    /**
     * Findet alle Formulare und fügt Event-Listener hinzu
     * @public
     */
    bindForms() {
        bindForms(this);
    }

    /**
     * Verarbeitet ein Formular-Submit-Event
     * @param {Event} event - Das Submit-Event
     * @public
     */
    handleSubmit(event) {
        // Standardverhalten verhindern, aber Ereignispropagation erlauben
        event.preventDefault();
        
        try {
            const form = event.target;
            
            // Reguläre Formulardaten für Template-Verarbeitung extrahieren
            const formDataPlain = scanFormFields(form);
            
            // FormData-Objekt für Dateien und reguläre Felder
            const formDataObj = new FormData(form);
            
            // Empfänger und Betreff hinzufügen
            formDataObj.append('recipient', this.config.recipient);
            formDataObj.append('subject', this.config.subject);
            
            // Templates anwenden, falls konfiguriert
            if (this.config.useTemplates && this.templateConfig) {
                this.applyTemplates(formDataPlain, form);
                
                // Aktualisierte Werte in FormData einfügen
                if (formDataPlain.subject) {
                    formDataObj.set('subject', formDataPlain.subject);
                }
                
                if (formDataPlain.customBody) {
                    formDataObj.set('customBody', formDataPlain.customBody);
                }
                
                // Bestätigungsmail-Daten hinzufügen
                if (formDataPlain.confirmation) {
                    formDataObj.set('confirmationRecipient', formDataPlain.confirmation.recipient);
                    formDataObj.set('confirmationSubject', formDataPlain.confirmation.subject);
                    formDataObj.set('confirmationBody', formDataPlain.confirmation.body);
                }
            }
            
            if (this.config.debug) {
                const formFields = {};
                for (let [key, value] of formDataObj.entries()) {
                    if (!(value instanceof File)) {
                        formFields[key] = value;
                    } else {
                        formFields[key] = `Datei: ${value.name} (${formatFileSize(value.size)})`;
                    }
                }
                console.log('MailSender: Gesammelte Formulardaten:', formFields);
                console.log('MailSender: Sende an Endpoint:', this.config.endpoint);
            }
            
            // Dateien validieren
            const fileInputs = form.querySelectorAll('input[type="file"]');
            if (fileInputs.length > 0) {
                for (const fileInput of fileInputs) {
                    if (fileInput.files.length > 0) {
                        const isValid = validateFiles(fileInput.files, this.config);
                        if (!isValid) {
                            return false;
                        }
                    }
                }
            }
            
            this.sendMailWithFiles(formDataObj, form);
        } catch (error) {
            console.error('MailSender: Fehler beim Verarbeiten des Formulars', error);
            
            if (this.config.fallbackToMailto) {
                openMailtoFallback({
                    recipient: this.config.recipient,
                    subject: this.config.subject,
                    message: 'Fehler beim Verarbeiten des Formulars'
                });
            }
        }
        
        return false;
    }

    /**
     * Sendet eine E-Mail mit Dateianlagen
     * @param {FormData} formData - FormData-Objekt mit Formulardaten
     * @param {HTMLFormElement} form - Das Formular
     * @public
     */
    sendMailWithFiles(formData, form) {
        updateFormStatus(form, 'sending', 'Nachricht wird gesendet...');
        
        if (this.config.debug) {
            console.log('MailSender: Sende Daten mit Dateien an', this.config.endpoint);
        }
        
        sendRequest(this.config.endpoint, {
            method: this.config.method,
            body: formData,
            credentials: 'same-origin'
        })
        .then(data => {
            if (this.config.debug) {
                console.log('MailSender: Antwort-Daten', data);
            }
            
            updateFormStatus(form, 'success', 'Ihre Nachricht wurde erfolgreich gesendet!');
            
            if (this.config.resetFormOnSuccess) {
                form.reset();
                if (this.config.debug) {
                    console.log('MailSender: Formular zurückgesetzt nach erfolgreichem Senden');
                }
            } else if (this.config.debug) {
                console.log('MailSender: Formular bleibt nach erfolgreichem Senden erhalten (resetFormOnSuccess: false)');
            }
        })
        .catch(error => {
            console.error('MailSender: Fehler beim Senden der Anfrage', error);
            updateFormStatus(form, 'error', 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
            
            if (this.config.resetFormOnFailure) {
                form.reset();
                if (this.config.debug) {
                    console.log('MailSender: Formular zurückgesetzt nach fehlgeschlagenem Senden');
                }
            } else if (this.config.debug) {
                console.log('MailSender: Formular bleibt nach fehlgeschlagenem Senden erhalten (resetFormOnFailure: false)');
            }
            
            if (this.config.fallbackToMailto) {
                openMailtoFallback(scanFormFields(form));
            }
        });
    }

    /**
     * Setzt die Template-Konfiguration
     * @param {Object} config - Template-Konfiguration
     * @public
     */
    setTemplates(config) {
        this.templateConfig = config;
        
        if (this.config.debug) {
            console.log('MailSender: Template-Konfiguration gesetzt', config);
        }
    }

    /**
     * Wendet Templates auf Formulardaten an
     * @param {Object} formData - Formulardaten
     * @param {HTMLFormElement} form - Formular-Element
     * @private
     */
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
                formData.subject = replacePlaceholders(
                    templateConfig.subject, 
                    formData, 
                    this.templateConfig
                );
            }

            if (templateConfig.body) {
                let bodyTemplate = templateConfig.body;
                
                if (templateConfig.dynamicBody) {
                    bodyTemplate = createDynamicTemplate(bodyTemplate, formData, form);
                }
                
                formData.customBody = replacePlaceholders(
                    bodyTemplate, 
                    formData, 
                    this.templateConfig
                );
            }

            if (templateConfig.confirmation && templateConfig.confirmation.enabled) {
                let confirmationBody = templateConfig.confirmation.body;
                
                if (templateConfig.confirmation.dynamicBody) {
                    confirmationBody = createDynamicTemplate(confirmationBody, formData, form);
                }
                
                formData.confirmation = {
                    recipient: formData.email || '',
                    subject: replacePlaceholders(
                        templateConfig.confirmation.subject, 
                        formData, 
                        this.templateConfig
                    ),
                    body: replacePlaceholders(
                        confirmationBody, 
                        formData, 
                        this.templateConfig
                    )
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
}

export default MailSender;
