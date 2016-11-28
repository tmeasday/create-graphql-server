// We are in an intermediate step where we aren't actually generating files
// but we are generating code.

import readInput from './read';

import generateSchema from './schema';
import generateResolvers from './resolvers';
import generateModel from './model';

// XXX: read this in obviously
const TYPES = ['user', 'tweet'];

const schemasByType = {};
const resolversByType = {};
const modelsByType = {};

TYPES.forEach((type) => {
  const inputSchema = readInput(`./input/${type}.graphql`);

  schemasByType[type] = generateSchema(inputSchema);
  resolversByType[type] = generateResolvers(inputSchema, schemasByType[type]);
  modelsByType[type] = generateModel(inputSchema);
});


// We would write this out to a file using `print`
import { print } from 'graphql';
const schemas = Object.values(schemasByType).map(print);

// We would also write resolvers/models out

// **********************************************************************
// We should generate / eval this code
import { makeExecutableSchema } from 'graphql-tools';

// We should make makeExecutableSchema/graphql-tools do this for us
const resolvers = {};
Object.values(resolversByType).forEach((resolverSet) => {
  Object.keys(resolverSet).forEach((key) => {
    resolvers[key] = Object.assign(resolvers[key] || {}, resolverSet[key]);
  });
});

let rootSchema = '';
// XXX: this is a total hack, better to use graphql-tools for this bit
['Query', 'Mutation', 'Subscription'].forEach((rootField) => {
  const parts = [];
  const re = new RegExp(`type ${rootField}[\\s\\n]*{([^}]*)}`);
  schemas.forEach((subschema) => {
    const match = re.exec(subschema);
    if (match) {
      parts.push(match[1].trim());
    }
  });
  rootSchema += `type ${rootField} { ${parts.join('\n')} }\n\n`;
});

export const schema = makeExecutableSchema({
  // XXX: a hack here, the root types in `rootSchema` will override the
  // constitutent parts defined in the sub-schemas
  typeDefs: schemas.concat(rootSchema),
  resolvers,
});

// We should generate / eval this code too
export function addModelsToContext(context) {
  const { db, pubsub } = context;

  const newContext = Object.assign({}, context);
  TYPES.forEach((type) => {
    newContext[type] = new modelsByType[type]({ db, pubsub });
  });
  return newContext;
}
