import { PubSub, SubscriptionManager } from 'graphql-subscriptions';

const pubsub = new PubSub();

function createSubscriptionManager(schema) {
  return new SubscriptionManager({
    schema,
    pubsub,
    setupFunctions: {
      // XXX: do we need these?
    },
  });
}

export { createSubscriptionManager, pubsub };
