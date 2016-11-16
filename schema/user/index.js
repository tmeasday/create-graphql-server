export schema from 'user.graphql';

export const resolvers = {
  User: {
    tweets(user, { offset, limit }, { Tweets }) {
      return Tweets.findByOwner(user.id, { offset, limit });
    },
    liked(user, { offset, limit }, { Tweets }) {
      return Tweets.liked(liked, { offset, limit });
    },
    followers(user, { offset, limit }, { Users }) {
      return Users.following(user, { offset, limit });
    },
    followers(user, { offset, limit }, { Users }) {
      return Users.followers(user, { offset, limit });
    },
  },
  Query: {
    user(root, { id }, { Users }) {
      return Users.findOneById(id);
    },
  },
  Mutation: {
    createUser(root, { username }, { Users }) {
      const id = Users.insert({ username });
      return Users.findOneById(id);
    },
    updateUser(root, { id, input }, { Users }) {
      return Users.updateById(id, { $set: input })
        .then(() => {
          return Users.findOneById(id);
        });
    },
    removeUser(root, { id }, { Users }) {
      return Users.removeById(id);
    },
  },
  Subscription: {
    userCreated: (user) => user,
    userModified: (user) => user,
    userRemoved: (id) => id,
  }
}
