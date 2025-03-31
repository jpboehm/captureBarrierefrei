/**
 * MailSender Modul - Entry Point
 * 
 * Bietet eine einheitliche Schnittstelle für das MailSender-System.
 * Importiert und exportiert alle Teilmodule und stellt die Hauptklasse bereit.
 * 
 * @module mailSender
 * @version 2.0.0
 */

import MailSender from './core/MailSender.js';

// Globale Registrierung für nicht-modulare Umgebungen
window.MailSender = MailSender;

export default MailSender;
