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

// Überprüfe Content-Type, um festzustellen, wie die Daten empfangen werden sollten
$contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';

// Empfange Daten basierend auf Content-Type
if (strpos($contentType, 'application/json') !== false) {
    // JSON-Daten empfangen
    $json_data = file_get_contents('php://input');
    $data = json_decode($json_data, true);
    
    if (!$data) {
        http_response_code(400); // Bad Request
        echo json_encode(['success' => false, 'message' => 'Ungültige JSON-Daten']);
        exit;
    }
} else {
    // Normales Formular
    $data = $_POST;
    
    if (empty($data)) {
        http_response_code(400); // Bad Request
        echo json_encode(['success' => false, 'message' => 'Keine Formulardaten empfangen']);
        exit;
    }
}

// Debug-Information
$debug_info = [];
$debug_info['received_data'] = $data;
$debug_info['content_type'] = $contentType;

// Extrahiere die notwendigen Felder
$recipient = isset($data['recipient']) ? $data['recipient'] : 'standard@beispiel.de';
$subject = isset($data['subject']) ? $data['subject'] : 'Nachricht vom Kontaktformular';

// Erstelle den E-Mail-Text
$body = "Eine neue Nachricht vom Kontaktformular:\n\n";

// Füge alle Formularfelder hinzu (außer recipient und subject)
foreach ($data as $key => $value) {
    if ($key !== 'recipient' && $key !== 'subject') {
        // Wenn es sich um ein Array handelt (z.B. bei select-multiple)
        if (is_array($value)) {
            $value = implode(', ', $value);
        }
        $body .= "$key: $value\n";
    }
}

try {
    // Header für die E-Mail
    $headers = "From: webmaster@" . $_SERVER['SERVER_NAME'] . "\r\n";
    $headers .= "Reply-To: " . (isset($data['email']) ? $data['email'] : 'no-reply@beispiel.de') . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    // Debug-Informationen
    $debug_info['mail_to'] = $recipient;
    $debug_info['mail_subject'] = $subject;
    $debug_info['mail_headers'] = $headers;
    $debug_info['mail_body'] = $body;

    // Versuche, die E-Mail zu senden
    $mail_sent = mail($recipient, $subject, $body, $headers);
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
