/* eslint-disable prettier */
/* eslint comma-dangle: [2, "only-multiline"] */
const resolvers = {
  Tweet: {
    id(tweet) {
      return tweet._id;
    },

    author(tweet, args, { Tweet, me }) {
      return Tweet.author(tweet, me, 'tweet author');
    },

    coauthors(tweet, args, { Tweet, me }) {
      return Tweet.coauthors(tweet, args, me, 'tweet coauthors');
    },

    likers(tweet, args, { Tweet, me }) {
      return Tweet.likers(tweet, args, me, 'tweet likers');
    },

    createdBy(tweet, args, { Tweet, me }) {
      return Tweet.createdBy(tweet, me, 'tweet createdBy');
    },

    updatedBy(tweet, args, { Tweet, me }) {
      return Tweet.updatedBy(tweet, me, 'tweet updatedBy');
    }
  },
  Query: {
    tweets(root, { lastCreatedAt, limit }, { Tweet, me }) {
      return Tweet.find({ lastCreatedAt, limit }, me, 'tweets');
    },

    tweet(root, { id }, { Tweet, me }) {
      return Tweet.findOneById(id, me, 'tweet');
    }
  },
  Mutation: {
    async createTweet(root, { input }, { Tweet, me }) {
      return await Tweet.insert(input, me, 'createTweet');
    },

    async updateTweet(root, { id, input }, { Tweet, me }) {
      return await Tweet.updateById(id, input, me, 'updateTweet');
    },

    async removeTweet(root, { id }, { Tweet, me }) {
      return await Tweet.removeById(id, me, 'removeTweet');
    }
  },
  Subscription: {
    tweetCreated: tweet => tweet,
    tweetUpdated: tweet => tweet,
    tweetRemoved: id => id
  }
};

export default resolvers;
