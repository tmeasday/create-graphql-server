export schema from 'user.graphql';

export const resolvers = {
  User: {
    Tweet(user, { offset, limit }, { Tweet }) {
      return Tweet.findByOwner(user.id, { offset, limit });
    },
    liked(user, { offset, limit }, { Tweet }) {
      return Tweet.liked(liked, { offset, limit });
    },
    followers(user, { offset, limit }, { User }) {
      return User.following(user, { offset, limit });
    },
    followers(user, { offset, limit }, { User }) {
      return User.followers(user, { offset, limit });
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
      await User.updateById(id, { $set: input });
      return await User.findOneById(id);
    },
    removeUser(root, { id }, { User }) {
      return User.removeById(id);
    },
  },
  Subscription: {
    userCreated: (user) => user,
    userModified: (user) => user,
    userRemoved: (id) => id,
  }
}
