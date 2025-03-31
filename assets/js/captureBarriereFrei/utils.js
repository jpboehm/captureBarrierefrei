/**
 * Hilfsfunktionen-Modul für die CaptureBarriereFrei-Bibliothek
 * Enthält allgemeine Funktionen, die in verschiedenen Komponenten verwendet werden.
 * @module utils
 */

/**
 * Erzeugt Debug-Ausgaben in der Konsole, wenn der Debug-Modus aktiviert ist
 * @param {...any} args - Die auszugebenden Argumente (beliebige Anzahl)
 * @returns {void}
 */
export function logDebug(...args) {
    if (this.config && this.config.enableLogging) {
        console.log('[CaptureBarriereFrei]', ...args);
    }
}

/**
 * Generiert eine zufällige ID für Formularelemente
 * @param {string} [prefix='capture'] - Optional: Präfix für die generierte ID
 * @returns {string} Eine eindeutige ID
 */
export function getRandomId(prefix = 'capture') {
    return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Prüft, ob ein Element bereits im DOM existiert
 * @param {string} selector - CSS-Selektor des zu prüfenden Elements
 * @returns {boolean} true, wenn das Element existiert, sonst false
 */
export function elementExists(selector) {
    return document.querySelector(selector) !== null;
}

/**
 * Throttle-Funktion zur Begrenzung der Ausführungsfrequenz einer Funktion
 * @param {Function} callback - Die auszuführende Funktion
 * @param {number} delay - Verzögerung in Millisekunden
 * @returns {Function} Die gedrosselte Funktion
 */
export function throttle(callback, delay = 100) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            callback.apply(this, args);
        }
    };
}

/**
 * Bereinigt und validiert einen Konfigurationsparameter
 * @param {any} value - Der zu prüfende Wert
 * @param {any} defaultValue - Der Standardwert, falls value ungültig ist
 * @param {Function} [validator] - Optional: Funktion zur Validierung
 * @returns {any} Der bereinigte Wert oder der Standardwert
 */
export function sanitizeConfig(value, defaultValue, validator) {
    if (validator && typeof validator === 'function') {
        return validator(value) ? value : defaultValue;
    }
    return value !== undefined ? value : defaultValue;
}
