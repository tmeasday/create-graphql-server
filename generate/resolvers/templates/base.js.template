const resolvers = {
  TypeName: {
    id(typeName) {
      return typeName._id;
    },
  },
  Query: {
    typeNames(root, { lastCreatedAt, limit }, { TypeName }) {
      return TypeName.all({ lastCreatedAt, limit });
    },

    typeName(root, { id }, { TypeName }) {
      return TypeName.findOneById(id);
    },
  },
  Mutation: {
    async createTypeName(root, { input }, { TypeName }) {
      const id = await TypeName.insert(input);
      return TypeName.findOneById(id);
    },

    async updateTypeName(root, { id, input }, { TypeName }) {
      await TypeName.updateById(id, input);
      return TypeName.findOneById(id);
    },

    removeTypeName(root, { id }, { TypeName }) {
      return TypeName.removeById(id);
    },
  },
  Subscription: {
    typeNameCreated: typeName => typeName,
    typeNameUpdated: typeName => typeName,
    typeNameRemoved: id => id,
  },
};

export default resolvers;
