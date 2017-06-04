import log from '../server/logger';
import { CREATE, READ, READONE, READMANY, UPDATE, DELETE, DEBUG } from '../model/constants';

const resolvers = {
  User: {

    id(user) {
      return user._id;
    },

    async createdBy(user, args, { User, _user }) {
      const doc = await User.createdBy(user, _user);
      return doc;
    },

    async updatedBy(user, args, { User, _user }) {
      const doc = await User.updatedBy(user, _user);
      return doc;
    },

    async tweets(user, { minLikes, lastCreatedAt, limit }, { User, _user }) {
      return User.tweets(user, { minLikes, lastCreatedAt, limit });
      // const doc = User.tweets(user, { minLikes, lastCreatedAt, limit });
      // return Tweet.authorized({doc, mode: READMANY, user});
    },

    async liked(user, { lastCreatedAt, limit }, { User, Tweet, _user }) {
      return User.liked(user, { lastCreatedAt, limit });
      // const doc = User.liked(user, { lastCreatedAt, limit });
      // return Tweet.authorized({doc, mode: READMANY, user});
    },

    async following(user, { lastCreatedAt, limit }, { User, _user }) {
      const doc = await User.following(user, { lastCreatedAt, limit }, _user);
      return doc;
    },

    async followers(user, { lastCreatedAt, limit }, { User, _user }) {
      const doc = await User.followers(user, { lastCreatedAt, limit }, _user);
      return doc;
    },
  },
  Query: {
    async users(root, { lastCreatedAt, limit }, { User, _user }) {
      try {
        log.debug('---------------------');
        log.debug('User resolver "users"');
        const doc = await User.all({ lastCreatedAt, limit }, _user);
        // for any reason I don't understand the authorization has to remain here in Query
        return User.authorized({doc, mode: READMANY, user: _user, resolver: 'users'});
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },

    async user(root, { id }, { User, _user }) {
      try {
        log.debug('--------------------');
        log.debug('User resolver "user"');
        const doc = await User.findOneById(id, _user);
        // for any reason I don't understand the authorization has to remain here in Query
        return User.authorized({doc, mode: READONE, user: _user, resolver: 'user'});
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },
  },
  Mutation: {
    async createUser(root, { input }, { User, _user }) {
      try {
        log.debug('--------------------------');
        log.debug('User resolver "createUser"');
        const id = await User.insert(input, _user);
        const doc = await User.findOneById(id, _user); 
        return User.authorized({doc, mode: READONE, user: _user, resolver: 'createUser'});
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },

    async updateUser(root, { id, input }, { User, _user }) {
      try {
        log.debug('--------------------------');
        log.debug('User resolver "updateUser"');
        await User.updateById(id, input, _user);
        const doc = await User.findOneById(id, _user); 
        return User.authorized({doc, mode: READONE, user: _user, resolver: 'updateUser'});
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },

    async removeUser(root, { id }, { User, _user }) {
      try {
        log.debug('--------------------------');
        log.debug('User resolver "removeUser"');
        const response = await User.removeById(id, _user);
        return response;
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },
  },
  Subscription: {
    userCreated: user => user,
    userUpdated: user => user,
    userRemoved: id => id,
  },
};

export default resolvers;
