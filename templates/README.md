# E-Mail-Templates für CaptureBarriereFrei

Dieser Ordner enthält HTML-Vorlagen für E-Mails, die durch das MailSender-Modul versendet werden. Die Templates nutzen einen einfachen Platzhalter-Mechanismus, um dynamische Inhalte einzufügen.

## Verfügbare Templates

- **contact.html**: Vorlage für E-Mails, die an den Administrator gesendet werden, wenn ein Benutzer das Kontaktformular ausfüllt
- **confirmation.html**: Vorlage für automatische Bestätigungsmails an Benutzer nach dem Absenden eines Formulars

## Platzhalter-Syntax

Platzhalter werden mit doppelten geschweiften Klammern gekennzeichnet und durch die entsprechenden Werte aus dem Formular oder anderen Datenquellen ersetzt:

```
{{feldname}}
```

### Verfügbare Platzhalter

#### Aus den Formularfeldern:
- `{{name}}` - Nachname des Absenders
- `{{vorname}}` - Vorname des Absenders
- `{{email}}` - E-Mail-Adresse
- `{{telefon}}` - Telefonnummer
- `{{nachricht}}` - Inhalt der Nachricht
- `{{optin}}` - Ausgewählte Option

#### Automatisch generiert:
- `{{date}}` - Aktuelles Datum (Format: TT.MM.JJJJ)
- `{{time}}` - Aktuelle Uhrzeit (Format: HH:MM:SS)
- `{{year}}` - Aktuelles Jahr (Format: JJJJ)
- `{{referenceNumber}}` - Automatisch generierte Referenznummer für die Anfrage

#### Bedingte Blöcke:
Verwenden Sie `{{#if variableName}}...{{/if}}` für bedingte Inhalte, die nur angezeigt werden, wenn eine Variable vorhanden oder "wahr" ist.

#### Schleifen:
Verwenden Sie `{{#each arrayName}}...{{/each}}` für die Iteration über Arrays, z.B. für angehängte Dateien.

## Anpassung der Templates

### Allgemeine Hinweise:
1. Behalten Sie das responsive Design bei, um optimale Darstellung auf verschiedenen Geräten zu gewährleisten
2. Beschränken Sie die Breite auf max. 600px für bessere Kompatibilität mit E-Mail-Clients
3. Verwenden Sie Inline-CSS statt externer Stylesheets für maximale Kompatibilität
4. Testen Sie Templates in verschiedenen E-Mail-Clients (Outlook, Gmail, Apple Mail etc.)

### Farben und Branding:
- Primärfarbe (Header, Buttons): `#4a86e8` 
- Sekundärfarbe (Highlights): `#f0f7ff`
- Text: `#333333`
- Footer: `#f2f2f2`

Um das Farbschema an Ihre Marke anzupassen, ersetzen Sie diese Farbcodes durchgängig im Stylesheet.

## Integration in den MailSender

Die Templates werden im JavaScript-Code wie folgt eingebunden:

```javascript
const mailSender = new MailSender({
    // Grundkonfiguration
    recipient: 'empfaenger@beispiel.de',
    formSelector: '#kontaktFormular',
});

// Template-Konfiguration setzen
mailSender.setTemplates({
    templates: {
        'kontakt': {
            subject: 'Neue Anfrage: {{vorname}} {{name}}',
            // Template aus Datei laden oder als String angeben
            body: loadTemplate('contact.html'),
            attachments: true,
            confirmation: {
                enabled: true,
                subject: 'Ihre Anfrage bei Capture Barrierefrei',
                body: loadTemplate('confirmation.html')
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
```

### Hilfsfunktion zum Laden der Templates

Fügen Sie die folgende Funktion zu Ihrem Code hinzu, um Templates aus Dateien zu laden:

```javascript
/**
 * Lädt ein E-Mail-Template aus einer Datei
 * @param {string} templateName - Der Name der Template-Datei ohne Pfad
 * @returns {string} - Der Inhalt des Templates
 */
function loadTemplate(templateName) {
    // In der Browser-Umgebung: Template per AJAX laden
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/templates/${templateName}`, false); // Synchroner Request
    xhr.send();
    
    if (xhr.status === 200) {
        return xhr.responseText;
    } else {
        console.error(`Template ${templateName} konnte nicht geladen werden.`);
        return '';
    }
}
```

## Best Practices

1. **Sicherheit**: Bereinigen Sie alle Benutzereingaben, bevor Sie sie in Templates einfügen, um XSS-Angriffe zu verhindern
2. **Barrierefreiheit**: Verwenden Sie semantisches HTML und stellen Sie ausreichenden Kontrast sicher
3. **Plaintext-Alternative**: Bieten Sie zusätzlich zur HTML-Version immer eine Nur-Text-Version an
4. **Internationalisierung**: Verwenden Sie für mehrsprachige Websites Templates in verschiedenen Sprachen

## Fehlerbehebung

- **Platzhalter werden nicht ersetzt**: Überprüfen Sie die Schreibweise und stellen Sie sicher, dass die Werte im Datenkontext vorhanden sind
- **Bilder werden nicht angezeigt**: Verwenden Sie absolute URLs für alle Bildquellen
- **Layout-Probleme**: Testen Sie in verschiedenen E-Mail-Clients und optimieren Sie für die gängigsten Clients

---

Bei Fragen zur Integration oder Anpassung der Templates wenden Sie sich bitte an das Entwicklungsteam.
