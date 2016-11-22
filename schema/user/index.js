export { schema } from './user.graphql';

export const resolvers = {
  User: {
    tweets(user, { lastCreatedAt, limit }, { Tweet }) {
      return Tweet.findByAuthorId(user.id, { lastCreatedAt, limit });
    },
    liked(user, { lastCreatedAt, limit }, { Tweet }) {
      return Tweet.liked(user, { lastCreatedAt, limit });
    },
    following(user, { lastCreatedAt, limit }, { User }) {
      return User.following(user, { lastCreatedAt, limit });
    },
    followers(user, { lastCreatedAt, limit }, { User }) {
      return User.followers(user, { lastCreatedAt, limit });
    },
  },
  Query: {
    user(root, { id }, { User }) {
      return User.findOneById(id);
    },
  },
  Mutation: {
    createUser(root, { username }, { User }) {
      const id = User.insert({ username });
      return User.findOneById(id);
    },
    async updateUser(root, { id, input }, { User }) {
      await User.updateById(id, input);
      return await User.findOneById(id);
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
