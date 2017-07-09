const resolvers = {
  Tweet: {
    id(tweet) {
      return tweet._id;
    },

    author(tweet, args, { Tweet, _user }) {
      return Tweet.author(tweet, _user, 'author');
    },

    createdBy(tweet, args, { Tweet, _user }) {
      return Tweet.createdBy(tweet, _user, 'createdBy');
    },

    updatedBy(tweet, args, { Tweet, _user }) {
      return Tweet.updatedBy(tweet, _user, 'updatedBy');
    },

    coauthors(tweet, { lastCreatedAt, limit }, { Tweet, _user }) {
      return Tweet.coauthors(tweet, { lastCreatedAt, limit }, _user, 'coauthors');
    },

    likers(tweet, { lastCreatedAt, limit }, { Tweet, _user }) {
      return Tweet.likers(tweet, { lastCreatedAt, limit }, _user, 'likers');
    },
  },
  Query: {
    tweets(root, { lastCreatedAt, limit }, { Tweet, _user }) {
      return Tweet.all({ lastCreatedAt, limit }, _user, 'tweets');
    },

    tweet(root, { id }, { Tweet, _user }) {
      return Tweet.getOneById(id, _user, 'tweet');  
    },
  },
  Mutation: {
    async createTweet(root, { input }, { Tweet, _user }) {
      return await Tweet.insert(input, _user);
    },

    async updateTweet(root, { id, input }, { Tweet, _user }) {
      return await Tweet.updateById(id, input, _user);
    },

    async removeTweet(root, { id }, { Tweet, _user }) {
      return await Tweet.removeById(id, _user, 'removeTweet');
    },
  },
  Subscription: {
    tweetCreated: tweet => tweet,
    tweetUpdated: tweet => tweet,
    tweetRemoved: id => id,
  },
};

export default resolvers;
