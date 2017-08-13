import express from 'express';
import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import bodyParser from 'body-parser';
import { makeExecutableSchema } from 'graphql-tools';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import passport from 'passport';
import morgan from 'morgan';
import { getLogFilename, logger } from 'create-graphql-server-authorization';
import typeDefs from '../schema';
import resolvers from '../resolvers';
import addModelsToContext from '../model';
import authenticate from './authenticate';
import { parse, print } from 'graphql';
import { pubsub, subscriptionManager } from './subscriptions';

const log = logger(getLogFilename());
const stream = {
    write: function(message, encoding) {
      // log.debug(message);
    }
};
const schema = makeExecutableSchema({ typeDefs, resolvers });

const {
  PORT = 3000,
  WS_PORT = parseInt(PORT, 10) + 1,
  MONGO_PORT = parseInt(PORT, 10) + 2,
  MONGO_URL = `mongodb://localhost:${MONGO_PORT}/database`,
} = process.env;


async function startServer() {
  log.info('Logger started');

  const db = await MongoClient.connect(MONGO_URL);
  const UserCollection = db.collection('user');

  const app = express().use('*', cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(morgan("dev", { "stream": stream }));

  authenticate(app, UserCollection);

  app.use('/graphql', (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, me) => {
      req.context = addModelsToContext({ db, pubsub, me, UserCollection });
      graphqlExpress(() => {
        // Get the query, the same way express-graphql does it
        // https://github.com/graphql/express-graphql/blob/3fa6e68582d6d933d37fa9e841da5d2aa39261cd/src/index.js#L257
        const {variables, operationName} = req.body;
        const {_id, username, role} = me;
        const query = req.query.query || req.body.query;
        log.debug('-'.repeat(80));
        log.debug(`Request:\nUser: "${(username) ? username: '<no-user>'}", role: "${(role) ? role : '<no-role>'}", id: "${(_id) ? _id : '<no-id>'}",\nOperation: "${operationName ? operationName : '<no-name>'}", variables: "${variables ? JSON.stringify(variables) : '<no-variables>'}",\nQuery:\n${print(parse(query))}`);
        if (query && query.length > 4000) {
          // None of our app's queries are this long
          // Probably indicates someone trying to send an overly expensive query
          log.error('Query too large.');
          throw new Error('Query too large.');
        }
        return {
          schema,
          context: Object.assign({ me }, req.context),
          debug: true,
          formatError(e) { 
            console.log(e);
            return e;
          },
        };
      })(req, res, next);
    })(req, res, next);
  });

  app.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
  }));

  app.listen(PORT, () => console.log(
    `API Server is now running on http://localhost:${PORT}`
  ));

  // WebSocket server for subscriptions
  const websocketServer = createServer((request, response) => {
    response.writeHead(404);
    response.end();
  });

  websocketServer.listen(WS_PORT, () => console.log(
    `Websocket Server is now running on http://localhost:${WS_PORT}`
  ));

  return new SubscriptionServer(
    {
      subscriptionManager,

      // the obSubscribe function is called for every new subscription
      // and we use it to set the GraphQL context for this subscription
      onSubscribe: (msg, params) => {
        return Object.assign({}, params, {
          context: Object.assign({}, context),
        });
      },
    },
    websocketServer
  );
}

startServer()
  .then(() => {
    console.log('All systems go');
  })
  .catch((e) => {
    console.error('Uncaught error in startup');
    console.error(e);
    console.trace(e);
  });
