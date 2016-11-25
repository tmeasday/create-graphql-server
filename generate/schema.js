import { makeExecutableSchema } from 'graphql-tools';
import { print } from 'graphql';

export default function generateSchema(rawSchema) {
  return makeExecutableSchema({
    typeDefs: Object.values(rawSchema).map(print).concat('type Query { user: User, tweet: Tweet }'),
    resolvers: {},
  });
}
