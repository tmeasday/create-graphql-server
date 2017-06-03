import { CREATE, READ, READONE, READMANY, UPDATE, DELETE, DEBUG } from '../model/constants';

const resolvers = {
  User: {
    id(user) {
      return user._id;
    },

    createdBy(user, args, { User }) {
      //return User.createdBy(user);
      const doc = User.createdBy(user);
      return User.authorized({doc, mode: READONE, user});
    },

    updatedBy(user, args, { User }) {
      //return User.updatedBy(user);
      const doc = User.updatedBy(user);
      return User.authorized({doc, mode: READONE, user});
    },

    tweets(user, { minLikes, lastCreatedAt, limit }, { User }) {
      return User.tweets(user, { minLikes, lastCreatedAt, limit });
      // const doc = User.tweets(user, { minLikes, lastCreatedAt, limit });
      // return Tweet.authorized({doc, mode: READMANY, user});
    },

    liked(user, { lastCreatedAt, limit }, { User, Tweet }) {
      return User.liked(user, { lastCreatedAt, limit });
      // const doc = User.liked(user, { lastCreatedAt, limit });
      // return Tweet.authorized({doc, mode: READMANY, user});
    },

    following(user, { lastCreatedAt, limit }, { User }) {
      return User.following(user, { lastCreatedAt, limit });
      // const doc = User.following(user, { lastCreatedAt, limit });
      // return User.authorized({doc, mode: READMANY, user});
    },

    followers(user, { lastCreatedAt, limit }, { User }) {
      return User.followers(user, { lastCreatedAt, limit });
      // const doc = User.followers(user, { lastCreatedAt, limit });
      // return User.authorized({doc, mode: READMANY, user});
    },
  },
  Query: {
    async users(root, { lastCreatedAt, limit }, { User, user }) {
      try {
        const doc = await User.all({ lastCreatedAt, limit, user });
        return User.authorized({doc, mode: READMANY, user});
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },

    async user(root, { id }, { User, user }) {
      try {
        console.log('user', JSON.stringify(user, null, 2));
        const doc = await User.findOneById(id, user); 
        return User.authorized({doc, mode: READONE, user});
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },
  },
  Mutation: {
    async createUser(root, { input }, { User, user }) {
      try {
        const id = await User.insert(input, user);
        const doc = await User.findOneById(id, user); 
        return User.authorized({doc, mode: READONE, user});
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },

    async updateUser(root, { id, input }, { User, user }) {
      try {
        await User.updateById(id, input, user);
        const doc = await User.findOneById(id, user); 
        return User.authorized({doc, mode: READONE, user});
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },

    async removeUser(root, { id }, { User, user }) {
      try {
        return User.removeById(id, user);
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
