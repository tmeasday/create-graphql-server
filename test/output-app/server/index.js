import express from 'express';
import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import bodyParser from 'body-parser';
import { makeExecutableSchema } from 'graphql-tools';

import typeDefs from '../schema';
import resolvers from '../resolvers';
import addModelsToContext from '../model';

import { pubsub, subscriptionManager } from './subscriptions';
import connectToMongo from './mongo';

const schema = makeExecutableSchema({ typeDefs, resolvers });

// XXX: TODO
//  - authentication

const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;
const MONGO_PORT = process.env.MONGO_PORT || 3002;

async function startServer() {
  const db = await connectToMongo(MONGO_PORT);
  const context = addModelsToContext({ db, pubsub });

  const app = express();
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.use('/graphql', graphqlExpress((req) => {
    // Get the query, the same way express-graphql does it
    // https://github.com/graphql/express-graphql/blob/3fa6e68582d6d933d37fa9e841da5d2aa39261cd/src/index.js#L257
    const query = req.query.query || req.body.query;
    if (query && query.length > 2000) {
      // None of our app's queries are this long
      // Probably indicates someone trying to send an overly expensive query
      throw new Error('Query too large.');
    }

    return {
      schema,
      context: Object.assign({}, context),
      debug: true,
      formatError(e) { console.log(e) },
    };
  }));

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

  new SubscriptionServer(
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

// setInterval(() => console.log('interval'), 10000);
