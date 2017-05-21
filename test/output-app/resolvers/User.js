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
    async users(root, { lastCreatedAt, limit }, { User, user }) {
      const doc = await User.all({ lastCreatedAt, limit });
      return User.authorized({doc, mode: 'readMany', user});
    },

    async user(root, { id }, { User, user }) {
      const doc = await User.findOneById(id); 
      return User.authorized({doc, mode: 'readOne', user});
    },
  },
  Mutation: {
    async createUser(root, { input }, { User, user }) {
      const doc = input;
      const authorized = User.isAuthorized({doc, mode: 'create', user});
      if (!authorized) throw new Error('User: mode: create not authorized');
      const id = await User.insert(input);
      return User.findOneById(id);
    },

    async updateUser(root, { id, input }, { User, user }) {
      const doc = await User.findOneById(id);
      const authorized = User.isAuthorized({doc, mode: 'update', user});
      if (!authorized) throw new Error('User: mode: update not authorized');
      await User.updateById(id, input);
      return User.findOneById(id);
    },

    async removeUser(root, { id }, { User, user }) {
      const doc = await User.findOneById(id);
      const authorized = User.isAuthorized({doc, mode: 'delete', user});
      if (!authorized) throw new Error('User: mode: delete not authorized');
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
