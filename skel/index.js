import nodemon from 'nodemon';
import fs from 'fs';
import path from 'path';
import mongoPrebuilt from 'mongodb-prebuilt';
import denodeify from 'denodeify';

const dbpath = `${__dirname}/db`;

const {
  PORT = 3000,
  MONGO_PORT = parseInt(PORT, 10) + 2,
  MONGO_URL,
} = process.env;

// Taken from https://github.com/meteor/meteor/blob/debug-circle-timeout-promise-await/tools/utils/mongo-exit-codes.js
const MONGO_CODES = {
  0 : { code: 0,
        symbol: "EXIT_CLEAN",
        longText: "MongoDB exited cleanly"
      },
  1 : { code: 1,
        // No symbol in the source. This is in src/mongo/base/initializer.cpp.
        symbol: "global-initialization",
        longText: "MongoDB failed global initialization"
      },
  2 : { code: 2,
        symbol: "EXIT_BADOPTIONS",
        longText: "MongoDB was started with erroneous or incompatible command line options"
      },
  3 : { code: 3,
        symbol: "EXIT_REPLICATION_ERROR",
        longText: "There was an inconsistency between hostnames specified\n" +
        "on the command line compared with hostnames stored in local.sources"
      },
  4 : { code: 4,
        symbol: "EXIT_NEED_UPGRADE",
        longText: "MongoDB needs to upgrade to use this database"
      },
  5 : { code: 5,
        symbol: "EXIT_SHARDING_ERROR",
        longText: "A moveChunk operation failed"
      },
  12 : { code: 12,
         symbol: "EXIT_KILL",
         longText: "The MongoDB process was killed, on Windows"
       },
  14 : { code: 14,
         symbol: "EXIT_ABRUPT",
         longText: "Unspecified unrecoverable error. Exit was not clean"
       },
  20 : { code: 20,
         symbol: "EXIT_NTSERVICE_ERROR",
         longText: "Error managing NT Service on Windows"
       },
  45 : { code: 45,
         symbol: "EXIT_FS",
         longText: "MongoDB cannot open or obtain a lock on a file"
       },
  47 : { code: 47,
         symbol: "EXIT_CLOCK_SKEW",
         longText: "MongoDB exited due to excess clock skew"
       },
  48 : { code: 48,
         symbol: "EXIT_NET_ERROR",
         longText: "MongoDB exited because its port was closed, or was already\n" +
         "taken by a previous instance of MongoDB"
       },
  100 : { code: 100,
          symbol: "EXIT_UNCAUGHT",
          longText: "MongoDB had an unspecified uncaught exception.\n" +
          "This can be caused by MongoDB being unable to write to a local database.\n" +
          `Check that you have permissions to write to ${dbpath}. MongoDB does\n` +
          "not support filesystems like NFS that do not allow file locking."
        },
};

if (!MONGO_URL) {
  if (!fs.existsSync(dbpath)){
      fs.mkdirSync(dbpath);
  }

  // Weirdly, this promise never resolves if Mongo starts.
  // However, we'll just go ahead and start the node server anyway,
  // and if we see an error, we'll quit
  denodeify(mongoPrebuilt.start_server.bind(mongoPrebuilt))({
    auto_shutdown: true,
    args: {
      port: MONGO_PORT,
      dbpath,
    },
  })
  .catch((errorCode) => {
    const error = MONGO_CODES[errorCode];
    console.error(`Failed to start MongoDB server on port ${MONGO_PORT}`);
    console.error(`Error Code ${errorCode}: ${error ? error.longText : "Unknown"}`);
    process.exit(1);
  });
}

nodemon({
  script: path.join('server', 'index.js'),
  ext: 'js graphql',
  exec: 'babel-node',
}).on('restart', () => console.log('Restarting server due to file change\n'));


// Ensure stopping our parent process will properly kill nodemon's process
// Ala https://www.exratione.com/2013/05/die-child-process-die/

// SIGTERM AND SIGINT will trigger the exit event.
process.once("SIGTERM", function () {
  process.exit(0);
});
process.once("SIGINT", function () {
  process.exit(0);
});
// And the exit event shuts down the child.
process.once("exit", function () {
  nodemon.emit("SIGINT");
});
