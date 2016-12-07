import { PubSub, SubscriptionManager } from 'graphql-subscriptions';
import schema from '../schema';

const pubsub = new PubSub();
const subscriptionManager = new SubscriptionManager({
  schema,
  pubsub,
  setupFunctions: {
    // XXX: do we need these?
  },
});

export { subscriptionManager, pubsub };
