/**
 * Lädt ein E-Mail-Template aus einer Datei und ersetzt Platzhalter
 * @param {string} templatePath - Pfad zur Template-Datei
 * @param {Object} data - Objekt mit Werten, die in das Template eingesetzt werden sollen
 * @returns {Promise<string>} - Promise mit dem verarbeiteten Template
 */
async function loadEmailTemplate(templatePath, data = {}) {
    try {
        // Template-Datei laden - Hier ggf. Pfad anpassen, falls absolute Pfade verwendet werden
        const response = await fetch(templatePath);
        if (!response.ok) {
            throw new Error(`Fehler beim Laden des Templates: ${response.statusText}`);
        }
        const template = await response.text();

        // Platzhalter im Template ersetzen
        let processedTemplate = template;
        for (const [key, value] of Object.entries(data)) {
            const placeholder = `{{${key}}}`;
            processedTemplate = processedTemplate.replace(new RegExp(placeholder, 'g'), value);
        }

        return processedTemplate;
    } catch (error) {
        console.error('Fehler beim Verarbeiten des Templates:', error);
        throw error;
    }
}

export { loadEmailTemplate };