const { createLogger, format, transports } = require('winston');

// Logger-Konfiguration
const logConfiguration = {
    // Format der Log-Nachrichten
    format: format.combine(
        format.timestamp({
            format: 'MMM-DD-YYYY HH:mm:ss'
        }),
        format.printf(info => `${info.level}: ${[info.timestamp]}: ${info.message}`),
    ),
    // Transporte definieren (wo die Logs gespeichert werden)
    transports: [
        // Konsolen-Log
        new transports.Console({
            level: 'info'
        }),
        // Datei-Log für Fehler
        new transports.File({
            filename: 'logs/errors.log',
            level: 'error'
        }),
        // Datei-Log für alle Nachrichten
        new transports.File({
            filename: 'logs/combined.log'
        })
    ]
};

// Logger erstellen
const logger = createLogger(logConfiguration);

// Start-Druckanweisung hinzufügen
logger.info('--------------------------------------------------------');
logger.info('                     Bot-Start erfolgt                 |');
logger.info('--------------------------------------------------------');

module.exports = logger;