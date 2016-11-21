export { schema } from './user.graphql';

export const resolvers = {
  User: {
    tweets(user, { offset, limit }, { Tweet }) {
      return Tweet.findByOwner(user.id, { offset, limit });
    },
    liked(user, { offset, limit }, { Tweet }) {
      return Tweet.liked(user, { offset, limit });
    },
    following(user, { offset, limit }, { User }) {
      return User.following(user, { offset, limit });
    },
    followers(user, { offset, limit }, { User }) {
      return User.followers(user, { offset, limit });
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
