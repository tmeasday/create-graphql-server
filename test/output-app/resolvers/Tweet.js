const resolvers = {
  Tweet: {
    id(tweet) {
      return tweet._id;
    },

    author(tweet, args, { Tweet, me }) {
      return Tweet.author(tweet, me, 'author');
    },

    createdBy(tweet, args, { Tweet, me }) {
      return Tweet.createdBy(tweet, me, 'createdBy');
    },

    updatedBy(tweet, args, { Tweet, me }) {
      return Tweet.updatedBy(tweet, me, 'updatedBy');
    },

    coauthors(tweet, { lastCreatedAt, limit }, { Tweet, me }) {
      return Tweet.coauthors(tweet, { lastCreatedAt, limit }, me, 'coauthors');
    },

    likers(tweet, { lastCreatedAt, limit }, { Tweet, me }) {
      return Tweet.likers(tweet, { lastCreatedAt, limit }, me, 'likers');
    },
  },
  Query: {
    tweets(root, { lastCreatedAt, limit }, { Tweet, me }) {
      return Tweet.all({ lastCreatedAt, limit }, me, 'tweets');
    },

    tweet(root, { id }, { Tweet, me }) {
      return Tweet.getOneById(id, me, 'tweet');  
    },
  },
  Mutation: {
    async createTweet(root, { input }, { Tweet, me }) {
      return await Tweet.insert(input, me);
    },

    async updateTweet(root, { id, input }, { Tweet, me }) {
      return await Tweet.updateById(id, input, me);
    },

    async removeTweet(root, { id }, { Tweet, me }) {
      return await Tweet.removeById(id, me, 'removeTweet');
    },
  },
  Subscription: {
    tweetCreated: tweet => tweet,
    tweetUpdated: tweet => tweet,
    tweetRemoved: id => id,
  },
};

export default resolvers;
