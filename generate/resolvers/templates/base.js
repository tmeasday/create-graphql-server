export { schema } from './typeName.graphql';

export const resolvers = {
  TypeName: {
  },
  Query: {
    typeName(root, { id }, { TypeName }) {
      return TypeName.findOneById(id);
    },
  },
  Mutation: {
    // async createTypeName(root, { input }, { TypeName }) {
    //   const id = await TypeName.insert(input);
    //   return TypeName.findOneById(id);
    // },
    // async updateTypeName(root, { id, input }, { TypeName }) {
    //   await TypeName.updateById(id, input);
    //   return TypeName.findOneById(id);
    // },
    // removeTypeName(root, { id }, { TypeName }) {
    //   return TypeName.removeById(id);
    // },
  },
  Subscription: {
    typeNameCreated: typeName => typeName,
    typeNameUpdated: typeName => typeName,
    typeNameRemoved: id => id,
  },
};
