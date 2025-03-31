/**
 * Template-Engine für MailSender
 * 
 * Verarbeitet HTML-Templates für E-Mails, ersetzt Platzhalter
 * und verarbeitet bedingte Blöcke und Schleifen.
 * 
 * @module templateEngine
 */

import { getFieldLabel, formatFileSize } from './formUtils.js';

/**
 * Ersetzt Platzhalter in einer Vorlage durch tatsächliche Werte
 * @param {string} template - Die Template-Zeichenkette
 * @param {Object} data - Daten für die Platzhalter
 * @param {Object} templateConfig - Konfiguration für das Template
 * @returns {string} - Die verarbeitete Vorlage
 * @public
 */
export function replacePlaceholders(template, data, templateConfig) {
    let result = template;

    // Einfache Platzhalter ersetzen {{name}}
    result = result.replace(/\{\{([^#\/][^}]*)\}\}/g, (match, key) => {
        const trimmedKey = key.trim();
        
        // Prüfen, ob eine Funktion für diesen Platzhalter existiert
        if (templateConfig && templateConfig.functions && templateConfig.functions[trimmedKey]) {
            return templateConfig.functions[trimmedKey]();
        }
        
        // Prüfen, ob ein Wert für den Platzhalter in den Daten existiert
        const value = data[trimmedKey];
        if (value !== undefined) {
            return value;
        } 
        // Prüfen, ob ein Standardwert existiert
        else if (templateConfig && templateConfig.defaults && templateConfig.defaults[trimmedKey]) {
            return templateConfig.defaults[trimmedKey];
        }
        
        // Leeren String zurückgeben, wenn kein Wert gefunden wurde
        return '';
    });

    // Bedingte Blöcke verarbeiten
    result = processConditionalBlocks(result, data);

    // Schleifen verarbeiten, falls Anhänge vorhanden sind
    if (data.attachments) {
        result = processLoops(result, data);
    }

    return result;
}

/**
 * Verarbeitet bedingte Blöcke im Template
 * @param {string} template - Die Template-Zeichenkette
 * @param {Object} data - Daten für die Bedingungsprüfung
 * @returns {string} - Die verarbeitete Vorlage
 * @public
 */
export function processConditionalBlocks(template, data) {
    return template.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
        const trimmedCondition = condition.trim();
        if (data[trimmedCondition]) {
            return content;
        }
        return '';
    });
}

/**
 * Verarbeitet Schleifen im Template (z.B. für Anhänge)
 * @param {string} template - Die Template-Zeichenkette
 * @param {Object} data - Daten mit Arrays für die Schleifen
 * @returns {string} - Die verarbeitete Vorlage
 * @public
 */
export function processLoops(template, data) {
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

/**
 * Erstellt ein dynamisches Template basierend auf den Formulardaten
 * @param {string} baseTemplate - Die Basis-Template-HTML
 * @param {Object} formData - Die gesammelten Formulardaten
 * @param {HTMLFormElement} form - Das Formular-Element
 * @returns {string} - Das angepasste Template
 * @public
 */
export function createDynamicTemplate(baseTemplate, formData, form) {
    // Prüfen, ob das Template den Platzhalter für dynamische Felder enthält
    if (!baseTemplate.includes('{{dynamicFields}}')) {
        return baseTemplate; // Wenn nicht, unverändert zurückgeben
    }
    
    let dynamicFieldsHtml = '';
    const excludedFields = ['recipient', 'subject', 'customBody', 'confirmation', 'hasAttachments', 'attachments'];
    
    // Alle Formularfelder durchgehen und HTML-Struktur erzeugen
    for (const fieldName in formData) {
        // Systeminterne Felder und leere Werte überspringen
        if (excludedFields.includes(fieldName) || 
            formData[fieldName] === undefined || 
            formData[fieldName] === '') {
            continue;
        }
        
        // Komplexe Datentypen überspringen
        if (Array.isArray(formData[fieldName]) || typeof formData[fieldName] === 'object') {
            continue;
        }
        
        // Label für das Feld finden oder erstellen
        let labelText = getFieldLabel(fieldName, form);
        
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

// Aktualisiere alle Pfadreferenzen zu Templates, falls vorhanden
// Beispiel: 
// - Von: fetch(`/templates/${templateName}`)
// - Zu: fetch(`/assets/templates/${templateName}`)
