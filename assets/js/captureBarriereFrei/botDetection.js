/**
 * Bot-Erkennung-Modul - Erkennt verdächtiges Verhalten
 * Dieses Modul implementiert Mechanismen zur Erkennung von automatisierten Bots
 * durch Analyse von Benutzerinteraktionen und Verhalten.
 * 
 * @module botDetection
 * @version 1.2.0
 */

/**
 * Richtet alle globalen Event-Listener für die Bot-Erkennung ein
 * Überwacht Mausbewegungen, Tastatureingaben, Scroll- und Touch-Events.
 * 
 * @param {Object} instance - Die CaptureBarriereFrei-Instanz
 * @public
 */
export function setupBotDetection(instance) {
    // Verbesserte Mausbewegungs-Überwachung mit Throttling
    let mouseThrottleTimer;
    document.addEventListener('mousemove', () => {
        if (!mouseThrottleTimer) {
            mouseThrottleTimer = setTimeout(() => {
                instance.interactions.mouseEvents++;
                if (!instance.interactions.interactionStarted) {
                    instance.interactions.interactionStarted = true;
                }
                instance.updateAllSecurityScores();
                mouseThrottleTimer = null;
            }, 100); // Throttle auf 100ms
        }
    });
    
    // Tastatureingaben überwachen
    document.addEventListener('keydown', () => {
        instance.interactions.keyboardEvents++;
        if (!instance.interactions.interactionStarted) {
            instance.interactions.interactionStarted = true;
        }
        instance.updateAllSecurityScores();
    });
    
    // Scrollverhalten überwachen
    document.addEventListener('scroll', () => {
        instance.interactions.scrollEvents++;
        instance.updateAllSecurityScores();
    });
    
    // Zusätzlich: Touch-Events für mobile Geräte überwachen
    document.addEventListener('touchstart', () => {
        instance.interactions.mouseEvents += 2; // Touch-Interaktionen zählen mehr
        if (!instance.interactions.interactionStarted) {
            instance.interactions.interactionStarted = true;
        }
        instance.updateAllSecurityScores();
    });
}

/**
 * Analysiert das Benutzerverhalten und berechnet einen Sicherheitsscore
 * Kombiniert verschiedene Faktoren wie Mausbewegungen, Tastatureingaben, Scrollverhalten
 * und prüft Sicherheitsfeatures wie Honeypot und Human-Verification.
 * 
 * @param {HTMLFormElement} form - Das Formular
 * @param {Object} formConfig - Die Formular-Konfiguration
 * @returns {number} - Der aktuelle Sicherheitsscore (höher = menschenähnlicher)
 * @public
 */
export function analyzeBotBehavior(form, formConfig) {
    let score = 0;
    let scoreFactors = {
        mouseInteraction: 0,
        keyboardActivity: 0,
        scrollBehavior: 0,
        humanVerification: 0,
        honeypotCheck: 0,
        interactionBalance: 0,
        finalScore: 0
    };
    
    // Natürliche Mausbewegungen bewerten
    if (this.interactions.mouseEvents > 4) {
        score += 8;
        scoreFactors.mouseInteraction = 8;
    }
    
    // Tastaturaktivität bewerten
    if (this.interactions.keyboardEvents > 3) {
        score += 12;
        scoreFactors.keyboardActivity = 12;
    }
    
    // Scrollverhalten bewerten
    if (this.interactions.scrollEvents > 0) {
        score += 7;
        scoreFactors.scrollBehavior = 7;
    }
    
    // "Ich bin kein Roboter" Checkbox-Status prüfen
    if (formConfig.humanVerification && formConfig.humanVerification.checkbox && 
        formConfig.humanVerification.checkbox.checked) {
        score += 25;
        scoreFactors.humanVerification = 25;
    }
    
    // Honeypot-Falle prüfen
    if (formConfig.honeypotField && formConfig.honeypotField.value.length > 0) {
        score = -150;
        scoreFactors.honeypotCheck = -150;
        scoreFactors.finalScore = -150; // Sofortiger Abbruch bei positivem Honeypot
        
        // Sicherheitsscore im versteckten Feld speichern
        if (formConfig.botScoreField) {
            formConfig.botScoreField.value = score.toString();
        }
        
        this.logDebug(`Honeypot ausgelöst für ${form.id}. Score zurückgesetzt auf ${score}`);
        
        // Button-Status aktualisieren nach Honeypot-Erkennung
        if (typeof this.updateSubmitButtonState === 'function') {
            this.updateSubmitButtonState(form, formConfig);
        }
        
        return score;
    }
    
    // Zusätzliche Prüfung: Verhältnis zwischen Maus- und Tastaturaktivität
    // Bots neigen dazu, nur einen Interaktionstyp zu nutzen
    const interactionRatio = this.interactions.mouseEvents / 
                            (this.interactions.keyboardEvents || 1);
    
    if (interactionRatio > 0.3 && interactionRatio < 3) {
        score += 5; // Bonus für ausgewogenes Verhalten
        scoreFactors.interactionBalance = 5;
    }
    
    // Sicherheitsscore im versteckten Feld speichern
    if (formConfig.botScoreField) {
        formConfig.botScoreField.value = score.toString();
    }
    
    scoreFactors.finalScore = score;
    
    // Detaillierte Protokollierung
    this.logDebug(`Sicherheitsscore aktualisiert für ${form.id}`, scoreFactors);
    
    // Button-Status aktualisieren nach Score-Berechnung
    if (typeof this.updateSubmitButtonState === 'function') {
        this.updateSubmitButtonState(form, formConfig);
    }
    
    return score;
}
