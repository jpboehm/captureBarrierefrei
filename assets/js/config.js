/**
 * Konfigurationsdatei für das Kontaktformular
 * 
 * Hier können Sie einfach die wichtigsten Einstellungen für das Formular anpassen.
 * Kommentare erklären die Bedeutung jeder Einstellung.
 */

// ------ EMPFÄNGER-EINSTELLUNGEN ------
const EMPFAENGER_EMAIL = 'moin@jpboehm.de';     // Tragen Sie hier Ihre E-Mail-Adresse ein
const EMAIL_BETREFF = 'Neue Nachricht vom Kontaktformular';

// ------ FORMULAR-EINSTELLUNGEN ------
const FORMULAR_ID = '#kontaktFormular';         // Die ID des Formulars (mit # davor)
const FORMULAR_ZURUECKSETZEN = true;            // Formular nach dem Absenden leeren?

// ------ DATEI-UPLOAD-EINSTELLUNGEN ------
const MAX_DATEIGROESSE = 5;                     // Maximale Dateigröße in MB
const ERLAUBTE_DATEITYPEN = [                   // Erlaubte Dateiendungen
  '.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'
];

// ------ E-MAIL-VORLAGEN ------
const VORLAGEN_VERWENDEN = true;                // E-Mail-Vorlagen aktivieren?
const VORLAGE_KONTAKT = 'contact.html';         // Vorlage für Benachrichtigungen an Sie
const VORLAGE_BESTAETIGUNG = 'confirmation.html'; // Vorlage für Bestätigungsmails an Benutzer
const BESTAETIGUNGSMAIL_SENDEN = true;          // Automatische Bestätigungsmail an Benutzer senden?

// ------ BOT-SCHUTZ-EINSTELLUNGEN ------
const BOT_SCHUTZ_AKTIVIEREN = true;             // Schutz gegen automatisierte Anfragen
const MIN_AUSFUELLZEIT = 3;                     // Minimale Zeit zum Ausfüllen in Sekunden

// ------ ERWEITERTE EINSTELLUNGEN ------
// Diese Einstellungen müssen normalerweise nicht geändert werden
const DEBUGGING = false;                        // Debug-Meldungen in der Konsole anzeigen

/**
 * BITTE UNTENSTEHENDEN CODE NICHT ÄNDERN,
 * WENN SIE NICHT WISSEN WAS SIE TUN!
 */

// Erzeugt die vollständigen Konfigurationsobjekte für die Module
function erstelleModulKonfigurationen() {
  // Bot-Schutz-Konfiguration
  const captureConfig = {
    formSelectors: BOT_SCHUTZ_AKTIVIEREN ? 'form.protected' : '',
    minTimeToFill: MIN_AUSFUELLZEIT * 1000,
    thresholdScore: 10,
    enableLogging: DEBUGGING
  };
  
  // E-Mail-Konfiguration
  const mailConfig = {
    recipient: EMPFAENGER_EMAIL,
    subject: EMAIL_BETREFF,
    formSelector: FORMULAR_ID,
    endpoint: 'send_mail.php',
    method: 'POST',
    fallbackToMailto: false,
    debug: DEBUGGING,
    preserveFormHandlers: false,
    resetFormOnSuccess: FORMULAR_ZURUECKSETZEN,
    resetFormOnFailure: false,
    useTemplates: VORLAGEN_VERWENDEN,
    maxFileSize: MAX_DATEIGROESSE * 1024 * 1024,
    allowedFileTypes: ERLAUBTE_DATEITYPEN
  };
  
  return { captureConfig, mailConfig };
}

// Lädt eine E-Mail-Vorlage asynchron
function ladeVorlage(vorlagenName) {
  return new Promise((resolve, reject) => {
    fetch(`/assets/templates/${vorlagenName}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Vorlage ${vorlagenName} konnte nicht geladen werden (Status: ${response.status})`);
        }
        return response.text();
      })
      .then(text => resolve(text))
      .catch(error => {
        console.error(`Fehler beim Laden der Vorlage ${vorlagenName}:`, error);
        reject(error);
      });
  });
}

// Initialisiert die Module mit den Konfigurationen
async function initialisiere() {
  const { captureConfig, mailConfig } = erstelleModulKonfigurationen();
  
  // Bot-Schutz initialisieren
  if (BOT_SCHUTZ_AKTIVIEREN && window.CaptureBarriereFrei) {
    window.captureBarriereFreiInstance = new CaptureBarriereFrei(captureConfig);
    console.log('Bot-Schutz aktiviert');
  }
  
  // MailSender initialisieren (mit Verzögerung, um sicherzustellen, dass der Bot-Schutz zuerst geladen wird)
  if (window.MailSender) {
    const mailSender = new MailSender(mailConfig);
    
    // Vorlagen konfigurieren, wenn aktiviert
    if (VORLAGEN_VERWENDEN) {
      try {
        // Vorlagen asynchron laden
        const [kontaktVorlage, bestaetigungsVorlage] = await Promise.all([
          ladeVorlage(VORLAGE_KONTAKT),
          BESTAETIGUNGSMAIL_SENDEN ? ladeVorlage(VORLAGE_BESTAETIGUNG) : Promise.resolve('')
        ]);
        
        // Template-Konfiguration
        mailSender.setTemplates({
          templates: {
            'kontakt': {
              subject: `Neue Anfrage: {{vorname}} {{name}}`,
              body: kontaktVorlage,
              dynamicBody: true,
              attachments: true,
              confirmation: {
                enabled: BESTAETIGUNGSMAIL_SENDEN,
                subject: 'Ihre Anfrage bei Capture Barrierefrei',
                body: bestaetigungsVorlage,
                dynamicBody: true
              }
            }
          },
          functions: {
            date: () => new Date().toLocaleDateString('de-DE'),
            time: () => new Date().toLocaleTimeString('de-DE'),
            year: () => new Date().getFullYear().toString(),
            referenceNumber: () => 'REF-' + Math.random().toString(36).substr(2, 9).toUpperCase()
          },
          defaults: {
            nachricht: '[Keine Nachricht angegeben]',
            telefon: '[Keine Telefonnummer angegeben]'
          }
        });
        
        console.log('E-Mail-Vorlagen konfiguriert');
      } catch (error) {
        console.error('Fehler bei der Konfiguration der E-Mail-Vorlagen:', error);
      }
    }
  }
}

// Exportieren für die Verwendung im HTML
window.FormularKonfiguration = {
  initialisiere
};
