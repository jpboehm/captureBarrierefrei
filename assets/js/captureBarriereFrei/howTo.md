# CaptureBarriereFrei Code-Referenzen

## Modulare Struktur

Die CaptureBarriereFrei-Bibliothek ist in folgende Module aufgeteilt:

### Kernmodul (core.js)
```javascript
class CaptureBarriereFrei {
    constructor(config = {}) {
        // Konfiguration und Initialisierung
    }
    
    updateAllBotScores() {
        // Aktualisiert Scores für alle Formulare
    }
    
    submitForm(form, formConfig) {
        // Sendet das Formular ab
    }
}
```

### Bot-Erkennung (botDetection.js)
```javascript
export function setupBotDetection(instance) {
    // Event-Listener für Mausbewegungen, Tastatur, Scroll
}

export function calculateBotScore(form, formConfig) {
    // Berechnung des Bot-Scores basierend auf Benutzerverhalten
}
```

### Formularschutz (formProtection.js)
```javascript
export function protectForm(form) {
    // Schutzmaßnahmen für ein Formular implementieren
}

export function autoProtectForms() {
    // Automatisch alle Formulare auf der Seite schützen
}
```

### UI-Komponenten (ui.js)
```javascript
// Feedback-Element für Screenreader
export function createOrGetFeedbackElement(form) {
    // Erzeugt ein für Screenreader zugängliches Feedback-Element
}

// Versteckte Formularfelder
export function createOrGetHiddenField(form, name, value) {
    // Erzeugt oder findet ein verstecktes Feld im Formular
}

// Honeypot gegen automatisierte Bots
export function createOrGetHoneypotField(form) {
    // Erzeugt ein unsichtbares Feld als Falle für Bots
}

// Barrierefreie "Ich bin kein Roboter"-Checkbox
export function createOrGetHumanVerification(form) {
    // Erzeugt die barrierefreie Alternative zu herkömmlichen CAPTCHAs
}

// Styling für alle UI-Komponenten
export function ensureStyles() {
    // Fügt notwendige CSS-Stile für alle Komponenten hinzu
}

// Barrierefreie Erfolgsmeldung
export function displaySuccessMessage(form) {
    // Zeigt Erfolgsmeldung nach erfolgreicher Übermittlung und versteckt Formular
}

// Globale Barrierefreiheit-Features
export function ensureAccessibilityFeatures(container) {
    // Aktiviert wichtige Barrierefreiheit-Features wie Skip-Links
}
```

## Verwendung in HTML

Einbindung in die Webseite:

```html
<!-- Einfache Einbindung des Skripts -->
<script src="assets/js/captureBarriereFrei.js"></script>

<!-- Das Skript schützt automatisch alle Formulare -->
<form id="kontaktFormular">
    <!-- Formularfelder -->
    <input type="text" required>
    <!-- Bot-Erkennung wird automatisch hinzugefügt -->
</form>
```

## Konfigurationsbeispiel

```javascript
const captureConfig = {
    formSelectors: 'form.protected',  // Nur bestimmte Formulare schützen
    minTimeToFill: 3000,              // Mindestzeit zum Ausfüllen (ms)
    requiredScore: 10,                // Erforderlicher Mindest-Score
    debug: true                       // Debug-Modus aktivieren
};

const capture = new CaptureBarriereFrei(captureConfig);
```
