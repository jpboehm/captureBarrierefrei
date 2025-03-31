<?php
// Aktiviere Fehlerprotokollierung
error_reporting(E_ALL);
ini_set('display_errors', 1);

// HTTP-Header für HTML-Ausgabe
header('Content-Type: text/html; charset=utf-8');

echo "<h1>PHP Mail-Diagnose</h1>";

// PHP-Version und Umgebung überprüfen
echo "<h2>PHP-Umgebung</h2>";
echo "<p>PHP-Version: " . phpversion() . "</p>";
echo "<p>Server-Software: " . $_SERVER['SERVER_SOFTWARE'] . "</p>";
echo "<p>Server-Name: " . $_SERVER['SERVER_NAME'] . "</p>";

// Mail-Konfiguration überprüfen
echo "<h2>Mail-Konfiguration</h2>";
$mailConfig = [
    'SMTP' => ini_get('SMTP'),
    'smtp_port' => ini_get('smtp_port'),
    'sendmail_path' => ini_get('sendmail_path'),
    'sendmail_from' => ini_get('sendmail_from'),
    'mail.add_x_header' => ini_get('mail.add_x_header')
];

echo "<table border='1'>";
echo "<tr><th>Einstellung</th><th>Wert</th></tr>";
foreach ($mailConfig as $key => $value) {
    echo "<tr><td>$key</td><td>$value</td></tr>";
}
echo "</table>";

// Überprüfen, ob die mail()-Funktion verfügbar ist
echo "<h2>Mail-Funktionalität</h2>";
if (function_exists('mail')) {
    echo "<p style='color:green'>Die mail()-Funktion ist verfügbar.</p>";
} else {
    echo "<p style='color:red'>Die mail()-Funktion ist NICHT verfügbar.</p>";
}

// Test-Mail senden, wenn angefordert
if (isset($_POST['send_test'])) {
    $to = $_POST['test_email'];
    $subject = "Test-Mail von mail_diagnose.php";
    $message = "Dies ist eine Test-Mail, um die Funktionalität der PHP mail()-Funktion zu überprüfen.";
    $headers = "From: webmaster@" . $_SERVER['SERVER_NAME'] . "\r\n";
    $headers .= "Reply-To: webmaster@" . $_SERVER['SERVER_NAME'] . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    
    $result = mail($to, $subject, $message, $headers);
    
    echo "<h3>Test-Mail-Ergebnis</h3>";
    if ($result) {
        echo "<p style='color:green'>Test-Mail wurde scheinbar erfolgreich gesendet. Bitte überprüfen Sie Ihren Posteingang.</p>";
    } else {
        echo "<p style='color:red'>Test-Mail konnte nicht gesendet werden!</p>";
        echo "<p>Letzter Fehler: " . print_r(error_get_last(), true) . "</p>";
    }
}

// Formular für Test-Mail
echo "<h2>Test-Mail senden</h2>";
echo "<form method='post'>";
echo "<p><label>Test-E-Mail-Adresse: <input type='email' name='test_email' required></label></p>";
echo "<p><button type='submit' name='send_test'>Test-Mail senden</button></p>";
echo "</form>";

// Nützliche Hinweise
echo "<h2>Hinweise zur Fehlerbehebung</h2>";
echo "<ul>";
echo "<li>Überprüfen Sie, ob ein lokaler Mail-Server (wie Postfix, Sendmail) installiert und konfiguriert ist</li>";
echo "<li>Auf Windows-Servern: SMTP-Server in php.ini richtig konfigurieren</li>";
echo "<li>Auf lokalen Entwicklungsumgebungen: Erwägen Sie mail-Catcher wie MailHog oder Mailtrap.io</li>";
echo "<li>Überprüfen Sie Firewall-Einstellungen für ausgehende E-Mails (Port 25, 465, 587)</li>";
echo "<li>Prüfen Sie, ob Ihr Hosting-Provider das Senden von E-Mails über PHP mail() erlaubt</li>";
echo "<li>Alternative: Verwenden Sie eine Bibliothek wie PHPMailer oder SwiftMailer</li>";
echo "</ul>";
?>
