/**
 * Dateivalidierer für MailSender
 * 
 * Stellt Funktionen zur Validierung von Dateianhängen
 * hinsichtlich Größe und Dateityp bereit.
 * 
 * @module fileValidator
 */

/**
 * Validiert Dateien hinsichtlich Größe und Typ
 * @param {FileList} files - Liste der zu validierenden Dateien
 * @param {Object} config - Konfiguration mit maxFileSize und allowedFileTypes
 * @returns {boolean} - True, wenn alle Dateien gültig sind
 * @public
 */
export function validateFiles(files, config) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Dateigröße überprüfen
        if (file.size > config.maxFileSize) {
            const maxSizeMB = config.maxFileSize / (1024 * 1024);
            alert(`Die Datei "${file.name}" ist zu groß. Maximale Größe: ${maxSizeMB}MB`);
            return false;
        }
        
        // Dateityp überprüfen
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!config.allowedFileTypes.includes(fileExtension)) {
            alert(`Der Dateityp "${fileExtension}" ist nicht erlaubt. Erlaubte Typen: ${config.allowedFileTypes.join(', ')}`);
            return false;
        }
    }
    
    return true;
}

/**
 * Formatiert eine Dateigröße in menschenlesbares Format
 * @param {number} bytes - Die Größe in Bytes
 * @returns {string} - Formatierte Größe mit Einheit
 * @public
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
