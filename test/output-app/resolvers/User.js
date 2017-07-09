 const resolvers = {
  User: {
    id(user) {
      return user._id;
    },

    createdBy(user, args, { User, _user }) {
      return User.createdBy(user, _user, 'createdBy');
    },

    updatedBy(user, args, { User, _user }) {
      return User.updatedBy(user, _user, 'updatedBy');
    },

    tweets(user, { minLikes, lastCreatedAt, limit }, { User, _user }) {
      return User.tweets(user, { minLikes, lastCreatedAt, limit }, _user, 'tweets');
    },

    liked(user, { lastCreatedAt, limit }, { User, _user }) {
      return User.liked(user, { lastCreatedAt, limit }, _user, 'liked');
    },

    following(user, { lastCreatedAt, limit }, { User, _user }) {
      return User.following(user, { lastCreatedAt, limit }, _user, 'following');
    },

    followers(user, { lastCreatedAt, limit }, { User, _user }) {
      return User.followers(user, { lastCreatedAt, limit }, _user, 'followers');
    },
  },
  Query: {
    users(root, { lastCreatedAt, limit }, { User, _user }) {
      return User.all({ lastCreatedAt, limit }, _user, 'users');
    },

    user(root, { id }, { User, _user }) {
      return User.getOneById(id, _user, 'user');
    },
  },
  Mutation: {
    async createUser(root, { input }, { User, _user }) {
      return await User.insert(input, _user);
    },

    async updateUser(root, { id, input }, { User, _user }) {
      return await User.updateById(id, input, _user);
    },

    async removeUser(root, { id }, { User, _user }) {
      return await User.removeById(id, _user, 'removeUser');
    },
  },
  Subscription: {
    userCreated: user => user,
    userUpdated: user => user,
    userRemoved: id => id,
  },
};

export default resolvers;
