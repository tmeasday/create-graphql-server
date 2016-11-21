export { schema } from './tweet.graphql';

export const resolvers = {
  Tweet: {
    author(tweet, args, { User }) {
      return User.findById(tweet.authorId);
    },
    likers(tweet, { lastCreatedAt, limit }, { User }) {
      return User.likers(tweet, { lastCreatedAt, limit });
    },
  },
  Query: {
    tweet(root, { id }, { Tweet }) {
      return Tweet.findOneById(parseInt(id, 10));
    },
  },
  Mutation: {
    createTweet(root, { authorId, body }, { Tweet }) {
      const id = Tweet.insert({ authorId, body });
      return Tweet.findOneById(parseInt(id, 10));
    },
    async updateTweet(root, { id, input }, { Tweet }) {
      await Tweet.updateById(parseInt(id, 10), { $set: input });
      return await Tweet.findOneById(id);
    },
    removeTweet(root, { id }, { Tweet }) {
      return Tweet.removeById(parseInt(id, 10));
    },
  },
  Subscription: {
    tweetCreated: tweet => tweet,
    tweetUpdated: tweet => tweet,
    tweetRemoved: id => id,
  },
};
