import log from '../server/logger';
import { CREATE, READ, READONE, READMANY, UPDATE, DELETE, DEBUG } from '../model/constants';

const resolvers = {
  Tweet: {

    id(tweet) {
      return tweet._id;
    },

    async author(tweet, args, { Tweet, _user }) {
      const doc = await Tweet.author(tweet, _user);
      return doc;
    },

    async createdBy(tweet, args, { Tweet, _user }) {
      const doc = await Tweet.createdBy(tweet, _user);
      return doc;
    },

    async updatedBy(tweet, args, { Tweet, _user }) {
      const doc = await Tweet.updatedBy(tweet, _user);
      return doc;
    },

    async coauthors(tweet, { lastCreatedAt, limit }, { Tweet, _user }) {
      const doc = await Tweet.coauthors(tweet, { lastCreatedAt, limit }, _user);
      return doc;
    },

    async likers(tweet, { lastCreatedAt, limit }, { Tweet, _user }) {
      const doc = await Tweet.likers(tweet, { lastCreatedAt, limit }, _user);
      return doc;
    },
  },
  Query: {
    async tweets(root, { lastCreatedAt, limit }, { Tweet, _user }) {
      try {
        log.debug('---------------------');
        log.debug('Tweet resolver "tweets"');
        const doc = await Tweet.all({ lastCreatedAt, limit }, _user);
        return Tweet.authorized({doc, mode: READMANY, user: _user, resolver: 'tweets'});
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },

    async tweet(root, { id }, { Tweet, _user }) {
      try {
        log.debug('---------------------');
        log.debug('Tweet resolver "tweet"');
        const doc = await Tweet.findOneById(id, _user);
        return Tweet.authorized({doc, mode: READONE, user: _user, resolver: 'tweet'});
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },
  },
  Mutation: {
    async createTweet(root, { input }, { Tweet, _user }) {
      try {
        log.debug('---------------------------');
        log.debug('Tweet resolver "createTweet"');
        const id = await Tweet.insert(input, _user);
        const doc = await Tweet.findOneById(id, _user); 
        return Tweet.authorized({doc, mode: READONE, user: _user, resolver: 'createTweet'});
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },

    async updateTweet(root, { id, input }, { Tweet, _user }) {
      try {
        log.debug('---------------------------');
        log.debug('Tweet resolver "updateTweet"');
        await Tweet.updateById(id, input, _user);
        const doc = await Tweet.findOneById(id, _user); 
        return Tweet.authorized({doc, mode: READONE, user: _user, resolver: 'updateTweet'});
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },

    async removeTweet(root, { id }, { Tweet, _user }) {
      try {
        log.debug('---------------------------');
        log.debug('Tweet resolver "removeTweet"');
        const response = await Tweet.removeById(id, _user);
        return response;
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
