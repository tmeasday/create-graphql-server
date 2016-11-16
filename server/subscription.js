// See https://github.com/apollostack/GitHunt-API/blob/master/api/subscriptions.js

// Basically just use the graphql-subscriptions package to create a basic
// pubsub channel and subscriptionManager.

// In theory it would also attach setupFunctions for each subscription to
// filter the channel, like so:

// // this is the subscription name
// commentAdded: (options, args) => ({
//   // this is the channel name + predicate to re-run the sub query
//   commentAdded: comment => comment.repository_name === args.repoFullName,
// }),

// However, I'm not sure we are going to generate any subscriptions with
// arguments? (It would be cool if we did, I just don't know what they are)
