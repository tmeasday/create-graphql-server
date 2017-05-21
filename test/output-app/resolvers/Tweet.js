const resolvers = {
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
    tweets(root, { lastCreatedAt, limit }, { Tweet, user }) {
      return Tweet.authorized({
        doc: Tweet.all({ lastCreatedAt, limit }), 
        mode: 'readMany', 
        user
      });
    },

    tweet(root, { id }, { Tweet, user }) {
      return Tweet.authorized({
        doc: Tweet.findOneById(id), 
        mode: 'readOne', 
        user
      });
    },
  },
  Mutation: {
    async createTweet(root, { input }, { Tweet, user }) {
      const authorized = Tweet.isAuthorized({
        doc: input,
        mode: 'create',
        user
      });
      if (!authorized) throw new Error('Not authorized');
      const id = await Tweet.insert(input);
      return Tweet.findOneById(id);
    },

    async updateTweet(root, { id, input }, { Tweet, user }) {
      const authorized = Tweet.isAuthorized({
        doc: Tweet.findOneById(id),
        mode: 'update',
        user
      });
      if (!authorized) throw new Error('Not authorized');
      await Tweet.updateById(id, input);
      return Tweet.findOneById(id);
    },

    removeTweet(root, { id }, { Tweet, user }) {
      const authorized = Tweet.isAuthorized({
        doc: Tweet.findOneById(id),
        mode: 'delete',
        user
      });
      if (!authorized) throw new Error('Not authorized');
      return Tweet.removeById(id);
    },
  },
  Subscription: {
    tweetCreated: tweet => tweet,
    tweetUpdated: tweet => tweet,
    tweetRemoved: id => id,
  },
};

export default resolvers;
