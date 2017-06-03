import { CREATE, READ, READONE, READMANY, UPDATE, DELETE, DEBUG } from '../model/constants';

const resolvers = {
  Tweet: {
    id(tweet) {
      return tweet._id;
    },

    author(tweet, args, { Tweet }) {
      return Tweet.author(tweet);
    },

    createdBy(tweet, args, { Tweet }) {
      return Tweet.createdBy(tweet);
    },

    updatedBy(tweet, args, { Tweet }) {
      return Tweet.updatedBy(tweet);
    },

    coauthors(tweet, { lastCreatedAt, limit }, { Tweet }) {
      return Tweet.coauthors(tweet, { lastCreatedAt, limit });
    },

    likers(tweet, { lastCreatedAt, limit }, { Tweet }) {
      return Tweet.likers(tweet, { lastCreatedAt, limit });
    },
  },
  Query: {
    async tweets(root, { lastCreatedAt, limit }, { Tweet, user }) {
      try {
        const doc = await Tweet.all({ lastCreatedAt, limit });
        return Tweet.authorized({doc, mode: 'readMany', user});
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },

    async tweet(root, { id }, { Tweet, user }) {
      try {
        const doc = await Tweet.findOneById(id);
        return Tweet.authorized({doc, mode: 'readOne', user});
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },
  },
  Mutation: {
    async createTweet(root, { input }, { Tweet, user }) {
      try {
        const doc = Tweet.addUserToDoc({doc: input, mode: 'create', user});
        const authorized = Tweet.isAuthorized({doc, mode: 'create', user});
        if (!authorized) throw new Error('Tweet: mode: create not authorized');
        const id = await Tweet.insert(input);
        return Tweet.findOneById(id);
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },

    async updateTweet(root, { id, input }, { Tweet, user }) {
      try {
        const doc = await Tweet.findOneById(id);
        const authorized = Tweet.isAuthorized({doc, mode: 'update', user});
        if (!authorized) throw new Error('Tweet: mode: update not authorized');
        await Tweet.updateById(id, input);
        return Tweet.findOneById(id);
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },

    async removeTweet(root, { id }, { Tweet, user }) {
      try {
        const doc = await Tweet.findOneById(id);
        const authorized = Tweet.isAuthorized({doc, mode: 'delete', user});
        if (!authorized) throw new Error('Tweet: mode: delete not authorized');
        return Tweet.removeById(id);
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },
  },
  Subscription: {
    tweetCreated: tweet => tweet,
    tweetUpdated: tweet => tweet,
    tweetRemoved: id => id,
  },
};

export default resolvers;
