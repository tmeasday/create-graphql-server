/* eslint-disable prettier */
/* eslint comma-dangle: [2, "only-multiline"] */
const resolvers = {
  User: {
    id(user) {
      return user._id;
    },

    tweets(user, args, { User, me }) {
      return User.tweets(user, args, me, 'user tweets');
    },

    liked(user, args, { User, me }) {
      return User.liked(user, args, me, 'user liked');
    },

    following(user, args, { User, me }) {
      return User.following(user, args, me, 'user following');
    },

    followers(user, args, { User, me }) {
      return User.followers(user, args, me, 'user followers');
    },

    createdBy(user, args, { User, me }) {
      return User.createdBy(user, me, 'user createdBy');
    },

    updatedBy(user, args, { User, me }) {
      return User.updatedBy(user, me, 'user updatedBy');
    }
  },
  Query: {
    users(root, { lastCreatedAt, limit }, { User, me }) {
      return User.find({ lastCreatedAt, limit }, me, 'users');
    },

    user(root, { id }, { User, me }) {
      return User.findOneById(id, me, 'user');
    }
  },
  Mutation: {
    async createUser(root, { input }, { User, me }) {
      return await User.insert(input, me, 'createUser');
    },

    async updateUser(root, { id, input }, { User, me }) {
      return await User.updateById(id, input, me, 'updateUser');
    },

    async removeUser(root, { id }, { User, me }) {
      return await User.removeById(id, me, 'removeUser');
    }
  },
  Subscription: {
    userCreated: user => user,
    userUpdated: user => user,
    userRemoved: id => id
  }
};

export default resolvers;
