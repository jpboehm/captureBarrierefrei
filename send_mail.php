<?php
// Setze Header für JSON-Antworten
header('Content-Type: application/json');

// Aktiviere Fehlerprotokollierung für eine bessere Diagnose
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Erlaube sowohl POST als auch OPTIONS (für CORS-Preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Beende für CORS-Preflight-Requests
    exit(0);
}

// Prüfe auf POST-Methode
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['success' => false, 'message' => 'Nur POST-Anfragen sind erlaubt']);
    exit;
}

// Debug-Information
$debug_info = [];
$debug_info['content_type'] = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : 'nicht gesetzt';

// Funktion zum Erstellen einer eindeutigen Boundary für Multipart-E-Mails
function generateBoundary() {
    return md5(uniqid(time()));
}

// Array für Dateianhänge initialisieren
$attachments = [];

// Überprüfe Content-Type, um festzustellen, wie die Daten empfangen werden sollten
if (isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'multipart/form-data') !== false) {
    // Formular mit Dateien
    $data = $_POST;
    
    // Prüfen ob Dateien hochgeladen wurden
    if (!empty($_FILES)) {
        foreach ($_FILES as $field_name => $file_info) {
            if ($file_info['error'] == UPLOAD_ERR_OK && $file_info['size'] > 0) {
                // Datei temporär speichern
                $attachments[] = [
                    'name' => $file_info['name'],
                    'type' => $file_info['type'],
                    'tmp_name' => $file_info['tmp_name'],
                    'size' => $file_info['size']
                ];
                
                // Informationen für Debug-Ausgabe
                $data[$field_name . '_info'] = "Datei: " . $file_info['name'] . 
                                               " (" . $file_info['size'] . " Bytes)";
            }
        }
        $debug_info['files'] = $_FILES;
    }
    
} elseif (isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) {
    // JSON-Daten empfangen
    $json_data = file_get_contents('php://input');
    $data = json_decode($json_data, true);
    
    if (!$data) {
        http_response_code(400); // Bad Request
        echo json_encode(['success' => false, 'message' => 'Ungültige JSON-Daten']);
        exit;
    }
} else {
    // Normales Formular ohne spezifischen Content-Type
    $data = $_POST;
    
    if (empty($data)) {
        http_response_code(400); // Bad Request
        echo json_encode(['success' => false, 'message' => 'Keine Formulardaten empfangen']);
        exit;
    }
}

$debug_info['received_data'] = $data;

// Extrahiere die notwendigen Felder
$recipient = isset($data['recipient']) ? $data['recipient'] : 'standard@beispiel.de';
$subject = isset($data['subject']) ? $data['subject'] : 'Nachricht vom Kontaktformular';

// Erstelle den E-Mail-Text
$body = "Eine neue Nachricht vom Kontaktformular:\n\n";

// Füge alle Formularfelder hinzu (außer recipient und subject)
foreach ($data as $key => $value) {
    if ($key !== 'recipient' && $key !== 'subject' && !strstr($key, '_info')) {
        // Wenn es sich um ein Array handelt (z.B. bei select-multiple)
        if (is_array($value)) {
            $value = implode(', ', $value);
        }
        $body .= "$key: $value\n";
    }
}

try {
    // Wenn Anhänge vorhanden sind, erstelle eine Multipart-E-Mail
    if (!empty($attachments)) {
        // Boundary für Multipart-Nachricht erstellen
        $mime_boundary = generateBoundary();
        
        // Header für Multipart-E-Mail
        $headers = "From: webmaster@" . $_SERVER['SERVER_NAME'] . "\r\n";
        $headers .= "Reply-To: " . (isset($data['email']) ? $data['email'] : 'no-reply@beispiel.de') . "\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: multipart/mixed; boundary=\"{$mime_boundary}\"\r\n";
        
        // Nachricht mit Boundary beginnen
        $message = "--{$mime_boundary}\r\n";
        $message .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $message .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $message .= $body . "\r\n\r\n";
        
        // Anhänge hinzufügen
        foreach ($attachments as $attachment) {
            $file_name = $attachment['name'];
            $file_type = $attachment['type'];
            $file_content = file_get_contents($attachment['tmp_name']);
            
            // Dateiinhalt Base64-kodieren
            $encoded_content = chunk_split(base64_encode($file_content));
            
            $message .= "--{$mime_boundary}\r\n";
            $message .= "Content-Type: {$file_type}; name=\"{$file_name}\"\r\n";
            $message .= "Content-Disposition: attachment; filename=\"{$file_name}\"\r\n";
            $message .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $message .= $encoded_content . "\r\n\r\n";
        }
        
        // Nachricht abschließen
        $message .= "--{$mime_boundary}--";
        
        // Debug-Info
        $debug_info['mail_with_attachments'] = true;
        $debug_info['attachment_count'] = count($attachments);
        
    } else {
        // Standard-Header und Nachricht für E-Mail ohne Anhänge
        $headers = "From: webmaster@" . $_SERVER['SERVER_NAME'] . "\r\n";
        $headers .= "Reply-To: " . (isset($data['email']) ? $data['email'] : 'no-reply@beispiel.de') . "\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        
        $message = $body;
        
        // Debug-Info
        $debug_info['mail_with_attachments'] = false;
    }
    
    // Debug-Informationen
    $debug_info['mail_to'] = $recipient;
    $debug_info['mail_subject'] = $subject;
    $debug_info['mail_headers'] = $headers;
    
    // Versuche, die E-Mail zu senden
    $mail_sent = mail($recipient, $subject, $message, $headers);
    $debug_info['mail_sent'] = $mail_sent;
    
    // Debug-Informationen für mail()-Funktion
    $debug_info['mail_error'] = error_get_last();
    
    // Antworte mit dem Ergebnis
    if ($mail_sent) {
        echo json_encode(['success' => true, 'message' => 'E-Mail erfolgreich gesendet', 'debug' => $debug_info]);
    } else {
        http_response_code(500); // Internal Server Error
        echo json_encode(['success' => false, 'message' => 'E-Mail konnte nicht gesendet werden', 'debug' => $debug_info]);
    }
} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['success' => false, 'message' => 'Fehler: ' . $e->getMessage(), 'debug' => $debug_info]);
}
?>
