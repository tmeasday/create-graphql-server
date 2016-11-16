// Let's sketch out what this file would do.
// You can refer to https://github.com/apollostack/GitHunt-API/blob/master/api/index.js
// if you are interested in the details.

// 1. Create a schema by calling schema/index.js

// 2. Create a pubsub channel + subscriptionManager from server/subscriptions.js

// 3. Create a db connection using server/mongo.js

// 4. Create a default context object including:
//   i. The pubsub + db
//   ii. Call out to models/index.js to setup the models

// 3. Create an express server
//   i. Set up routes+middleware for authentication
//   ii. Set it up w/ graphql-server to serve graphql over http
//     a. use the schema, obviously
//     b. attach a copy of the default context
//   iii. Set up graphiql

// 4. Create a subscriptions-transport-ws server
//   i. Create a subscriptionManager using server/subscriptionManager.js
//   ii. Also attach a copy of the default context
