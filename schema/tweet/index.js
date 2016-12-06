export { schema } from './tweet.graphql';

export const resolvers = {
  Tweet: {
    id(tweet) {
      return tweet._id;
    },
    author(tweet, args, { Tweet }) {
      return Tweet.author(tweet);
    },
    likers(tweet, { lastCreatedAt, limit }, { Tweet }) {
      return Tweet.likers(tweet, { lastCreatedAt, limit });
    },
  },
  Query: {
    tweets(root, { lastCreatedAt, limit }, { Tweet }) {
      return Tweet.all({ lastCreatedAt, limit });
    },
    tweet(root, { id }, { Tweet }) {
      return Tweet.findOneById(id);
    },
  },
  Mutation: {
    async createTweet(root, { input: { authorId, body } }, { Tweet }) {
      const id = await Tweet.insert({ authorId, body });
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
