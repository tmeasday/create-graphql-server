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
      return User.findOneById(parseInt(id, 10));
    },
  },
  Mutation: {
    createUser(root, { username }, { User }) {
      const id = User.insert({ username });
      return User.findOneById(parseInt(id, 10));
    },
    async updateUser(root, { id, input }, { User }) {
      await User.updateById(parseInt(id, 10), { $set: input });
      return await User.findOneById(id);
    },
    removeUser(root, { id }, { User }) {
      return User.removeById(parseInt(id, 10));
    },
  },
  Subscription: {
    userCreated: user => user,
    userUpdated: user => user,
    userRemoved: id => id,
  },
};
