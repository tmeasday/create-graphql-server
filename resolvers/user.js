export { schema } from '../schema/user.graphql';

export const resolvers = {
  User: {
    id(user) {
      return user._id;
    },
    tweets(user, { lastCreatedAt, limit }, { User }) {
      return User.tweets(user, { lastCreatedAt, limit });
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
    users(root, { lastCreatedAt, limit }, { User }) {
      return User.all({ lastCreatedAt, limit });
    },
    user(root, { id }, { User }) {
      return User.findOneById(id);
    },
  },
  Mutation: {
    async createUser(root, { input }, { User }) {
      const id = await User.insert(input);
      return User.findOneById(id);
    },
    async updateUser(root, { id, input }, { User }) {
      await User.updateById(id, input);
      return User.findOneById(id);
    },
    removeUser(root, { id }, { User }) {
      return User.removeById(id);
    },
  },
  Subscription: {
    userCreated: user => user,
    userUpdated: user => user,
    userRemoved: id => id,
  },
};
