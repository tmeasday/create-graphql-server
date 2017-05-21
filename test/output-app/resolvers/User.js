const resolvers = {
  User: {
    id(user) {
      return user._id;
    },

    tweets(user, { minLikes, lastCreatedAt, limit }, { User }) {
      return User.tweets(user, { minLikes, lastCreatedAt, limit });
    },

    liked(user, { lastCreatedAt, limit }, { User }) {
      return User.liked(user, { lastCreatedAt, limit });
    },

    following(user, { lastCreatedAt, limit }, { User }) {
      return User.following(user, { lastCreatedAt, limit });
    },

    followers(user, { lastCreatedAt, limit }, { User }) {
      return User.followers(user, { lastCreatedAt, limit });
    },
  },
  Query: {
    users(root, { lastCreatedAt, limit }, { User, user }) {
      return User.authorized({
        doc: User.all({ lastCreatedAt, limit }), 
        mode: 'readMany', 
        user
      });
    },

    user(root, { id }, { User, user }) {
      return User.authorized({
        doc: User.findOneById(id), 
        mode: 'readOne', 
        user
      });
    },
  },
  Mutation: {
    async createUser(root, { input }, { User, user }) {
      const authorized = User.isAuthorized({
        doc: input,
        mode: 'create',
        user
      });
      if (!authorized) throw new Error('Not authorized');
      const id = await User.insert(input);
      return User.findOneById(id);
    },

    async updateUser(root, { id, input }, { User, user }) {
      const authorized = User.isAuthorized({
        doc: User.findOneById(id),
        mode: 'update',
        user
      });
      if (!authorized) throw new Error('Not authorized');
      await User.updateById(id, input);
      return User.findOneById(id);
    },

    removeUser(root, { id }, { User, user }) {
      const authorized = User.isAuthorized({
        doc: User.findOneById(id),
        mode: 'delete',
        user
      });
      if (!authorized) throw new Error('Not authorized');
      return User.removeById(id);
    },
  },
  Subscription: {
    userCreated: user => user,
    userUpdated: user => user,
    userRemoved: id => id,
  },
};

export default resolvers;
