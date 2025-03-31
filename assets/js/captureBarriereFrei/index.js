/**
 * CaptureBarriereFrei - Eine barrierefreie Bot-Erkennungs- und Formularvalidierungslösung
 * Version: 1.2.0
 * 
 * Modulare Implementierung für automatischen Schutz aller Formulare
 */
import CaptureBarriereFrei from './core.js';

// Globalen Namespace für die Bibliothek erstellen
window.CaptureBarriereFrei = CaptureBarriereFrei;

// Automatische Initialisierung beim Laden des Skripts
document.addEventListener('DOMContentLoaded', function() {
    // Globale Instanz erstellen, wenn sie nicht bereits in index.html erstellt wurde
    if (!window.captureBarriereFreiInstance) {
        window.captureBarriereFreiInstance = new CaptureBarriereFrei();
        console.log('CaptureBarriereFrei: Automatisch initialisiert');
    }
});

export default CaptureBarriereFrei;
