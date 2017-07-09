import winston from 'winston';

winston.emitErrs = true;

const timestamp = function() { 
  return new Date(Date.now()).toLocaleString();
};

const formatter = function(options) {
  return options.timestamp() + 
  ' ' + 
  (options.level === 'error' ? ' ' + options.level.toUpperCase() : '' ) +
  ' ' + 
  (options.message ? options.message : '') +
  (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' )
  ;
}

const logger = new winston.Logger({
    transports: [

        // new winston.transports.File({
        //     level: 'debug',
        //     filename: './server/logs/all-logs.log',
        //     handleExceptions: true,
        //     json: true,
        //     maxsize: 5242880, //5MB
        //     maxFiles: 5,
        //     colorize: false
        // }),

        new winston.transports.File({
            level: 'debug',
            filename: './server/logs/all-logs-readable.log',
            handleExceptions: true,
            json: false,
            maxsize: 5242880, //5MB
            maxFiles: 5,
            colorize: false,
            timestamp: timestamp,
            formatter: formatter
        }),

        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true,
            timestamp: timestamp,
            formatter: formatter
        })

    ],

    exitOnError: false

});

export default logger;

export const stream = {
    write: function(message, encoding) {
      // logger.debug(message);
    }
};
