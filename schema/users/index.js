export schema from 'user.graphql';

export const resolvers = {
  User: {
    tweets(user, args, ctx) {
      return ctx.connectors.Tweets.find({ ownerId: user.id });
    },
    liked(user, args, ctx) {
      return ctx.connectors.Tweets.find({ id: { $in: user.liked } });
    },
    followers(user, args, ctx) {
      return ctx.connectors.Users.find({ following: user.id });
    },
    followers(user, args, ctx) {
      return ctx.connectors.Users.find({ id: { $in: user.following } });
    },
  },
  Query: {
    user(_, args, ctx) {
      return ctx.connectors.Users.find({ id: args.id });
    },
  },
  Mutation: {
    createUser(_, args, ctx) {
      const id = ctx.connectors.Users.insert({ username: args.username });
      return resolvers.Query.user(_, { id }, ctx);
    },
    updateUser(_, args, ctx) {
      return ctx.connectors.Users.update({ id: args.id }, {
        $set: { username: args.username } }
      })).then(() => {
        return resolvers.Query.user(_, { id: args.id }, ctx);
      })
    },
    removeUser(_, args, ctx) {
      return ctx.connectors.Users.remove({ id: args.id });
    },
  },
  Subscription: {
    userCreated: (user) => user,
    userModified: (user) => user,
    userRemoved: (id) => id,
  }
}
