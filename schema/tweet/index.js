export { schema } from './tweet.graphql';

export const resolvers = {
  Tweet: {
    author(tweet, args, { User }) {
      return User.findOneById(tweet.authorId);
    },
    likers(tweet, { lastCreatedAt, limit }, { User }) {
      return User.likers(tweet, { lastCreatedAt, limit });
    },
  },
  Query: {
    tweet(root, { id }, { Tweet }) {
      return Tweet.findOneById(id);
    },
  },
  Mutation: {
    async createTweet(root, { input: { authorId, body } }, { Tweet }) {
      const id = await Tweet.insert({ authorId, body });
      return await Tweet.findOneById(id);
    },
    async updateTweet(root, { id, input }, { Tweet }) {
      await Tweet.updateById(id, input);
      return await Tweet.findOneById(id);
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
