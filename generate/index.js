// We are in an intermediate step where we aren't actually generating files
// but we are generating code.

import readInput from './read';

import generateSchema from './schema';
import generateResolvers from './resolvers';
import generateModel from './model';

// XXX: read this in obviously
const TYPES = ['user', 'tweet'];

const schemas = {};
const resolvers = {};
const models = {};

TYPES.forEach((type) => {
  const inputSchema = readInput(`./input/${type}.graphql`);

  schemas[type] = generateSchema(inputSchema);
  resolvers[type] = generateResolvers(inputSchema);
  models[type] = generateModel(inputSchema);
});

// We should generate / eval this code
import { makeExecutableSchema } from 'graphql-tools';
import { print } from 'graphql';

Object.values(schemas).map(print).map(console.log.bind(console));
export const schema = makeExecutableSchema({
  typeDefs: Object.values(schemas).map(print).concat('type Query { user: User, tweet: Tweet }'),
  resolvers: {},
});

// We should generate / eval this code too
export function addModelsToContext(context) {
  const { db, pubsub } = context;

  const newContext = Object.assign({}, context);
  TYPES.forEach((type) => {
    newContext[type] = new models[type]({ db, pubsub });
  });
  return newContext;
}
