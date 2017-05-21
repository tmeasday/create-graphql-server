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
    async tweets(root, { lastCreatedAt, limit }, { Tweet, user }) {
      const doc = await Tweet.all({ lastCreatedAt, limit });
      return Tweet.authorized({doc, mode: 'readMany', user});
    },

    async tweet(root, { id }, { Tweet, user }) {
      const doc = await Tweet.findOneById(id);
      return Tweet.authorized({doc, mode: 'readOne', user});
    },
  },
  Mutation: {
    async createTweet(root, { input }, { Tweet, user }) {
      const doc = input;
      const authorized = Tweet.isAuthorized({doc, mode: 'create', user});
      if (!authorized) throw new Error('Tweet: mode: create not authorized');
      const id = await Tweet.insert(input);
      return Tweet.findOneById(id);
    },

    async updateTweet(root, { id, input }, { Tweet, user }) {
      const doc = await Tweet.findOneById(id);
      const authorized = Tweet.isAuthorized({doc, mode: 'update', user});
      if (!authorized) throw new Error('Tweet: mode: update not authorized');
      await Tweet.updateById(id, input);
      return Tweet.findOneById(id);
    },

    async removeTweet(root, { id }, { Tweet, user }) {
      const doc = await Tweet.findOneById(id);
      const authorized = Tweet.isAuthorized({doc, mode: 'delete', user});
      if (!authorized) throw new Error('Tweet: mode: delete not authorized');
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
