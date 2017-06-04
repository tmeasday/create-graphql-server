import winston from 'winston';

winston.emitErrs = true;

const logger = new winston.Logger({
    transports: [

        new winston.transports.File({
            level: 'info',
            filename: './server/logs/all-logs.log',
            handleExceptions: true,
            json: true,
            maxsize: 5242880, //5MB
            maxFiles: 5,
            colorize: false
        }),

        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true
        })

    ],

    exitOnError: false

});

export default logger;

export const stream = {
    write: function(message, encoding) {
        logger.info(message);
    }
};
