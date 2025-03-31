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
            preserveFormHandlers: false, // NEU: Option zum Erhalten vorhandener Handlers
            ...config // Überschreibe mit benutzerdefinierten Einstellungen
        };

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
        
        // WICHTIG: event.stopPropagation() wurde entfernt, damit andere Handler auch ausgeführt werden können
        
        try {
            const form = event.target;
            const formData = this.scanFormFields(form);
            
            // Füge Empfänger hinzu
            formData.recipient = this.config.recipient;
            formData.subject = this.config.subject;
            
            if (this.config.debug) {
                console.log('MailSender: Gesammelte Formulardaten:', formData);
                console.log('MailSender: Sende an Endpoint:', this.config.endpoint);
            }
            
            this.sendMail(formData, form);
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
        
        // Nochmals sicherstellen, dass das Formular nicht abgesendet wird
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

    sendMail(formData, form) {
        // Feedback-Element für Screenreader finden
        const feedbackElement = document.getElementById('form-feedback') || 
                               form.querySelector('[aria-live]') || 
                               document.createElement('div');
        
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
            form.reset();
            
            if (this.config.debug) {
                console.log('MailSender: E-Mail erfolgreich gesendet', data);
            }
        })
        .catch(error => {
            // Fehlerbehandlung
            console.error('MailSender: Fehler beim Senden der Anfrage', error);
            this.updateFormStatus(form, 'error', 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
            
            // Fallback: Mailto-Link öffnen, wenn Server-Senden fehlschlägt
            if (this.config.fallbackToMailto) {
                this.openMailtoFallback(formData);
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
}

// Exportiere für Module-Systeme
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MailSender;
}
