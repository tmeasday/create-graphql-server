export { schema } from './tweet.graphql';

export const resolvers = {
  Tweet: {
    author(tweet, args, { Tweet }) {
      return Tweet.author(tweet);
    },
    likers(tweet, { lastCreatedAt, limit }, { Tweet }) {
      return Tweet.likers(tweet, { lastCreatedAt, limit });
    },
  },
  Query: {
    tweet(root, { id }, { Tweet }) {
      return Tweet.findOneById(id);
    },
  },
  Mutation: {
    async createTweet(root, { input }, { Tweet }) {
      const id = await Tweet.insert(input);
      return Tweet.findOneById(id);
    },
    async updateTweet(root, { id, input }, { Tweet }) {
      await Tweet.updateById(id, input);
      return Tweet.findOneById(id);
    },
    removeTweet(root, { id }, { Tweet }) {
      return Tweet.removeById(id);
    },
  },
  Subscription: {
    tweetCreated: tweet => tweet,
    tweetUpdated: tweet => tweet,
    tweetRemoved: id => id,
  },
};
