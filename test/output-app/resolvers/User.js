 const resolvers = {
  User: {
    id(user) {
      return user._id;
    },

    createdBy(user, args, { User, _user }) {
      return User.createdBy(user, _user);
    },

    updatedBy(user, args, { User, _user }) {
      return User.updatedBy(user, _user);
    },

    tweets(user, { minLikes, lastCreatedAt, limit }, { User, _user }) {
      return User.tweets(user, { minLikes, lastCreatedAt, limit }, _user);
    },

    liked(user, { lastCreatedAt, limit }, { User, _user }) {
      return User.liked(user, { lastCreatedAt, limit }, _user);
    },

    following(user, { lastCreatedAt, limit }, { User, _user }) {
      return User.following(user, { lastCreatedAt, limit }, _user);
    },

    followers(user, { lastCreatedAt, limit }, { User, _user }) {
      return User.followers(user, { lastCreatedAt, limit }, _user);
    },
  },
  Query: {
    users(root, { lastCreatedAt, limit }, { User, _user }) {
      return User.getAll({ lastCreatedAt, limit }, _user, 'users');
    },

    user(root, { id }, { User, _user }) {
      return User.getById(id, _user, 'user');
    },
  },
  Mutation: {
    async createUser(root, { input }, { User, _user }) {
      try {
        const id = await User.insert(input, _user);
        return User.getById(id, _user, 'createUser');
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },

    async updateUser(root, { id, input }, { User, _user }) {
      try {
        await User.updateById(id, input, _user);
        return User.getById(id, _user, 'updateUser');
      } catch(error) {
        console.log('ERROR:', error.message);
      }
    },

    async removeUser(root, { id }, { User, _user }) {
      try {
        return await User.removeById(id, _user);
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
