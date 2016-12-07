import { makeExecutableSchema } from 'graphql-tools';
import { ObjectId } from 'mongodb';
import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';

import * as tweet from '../resolvers/tweet';
import * as user from '../resolvers/user';

// We should make makeExecutableSchema/graphql-tools do this for us
const resolvers = {};
[tweet.resolvers, user.resolvers].forEach((resolverSet) => {
  Object.keys(resolverSet).forEach((key) => {
    resolvers[key] = Object.assign(resolvers[key] || {}, resolverSet[key]);
  });
});

resolvers.ObjID = new GraphQLScalarType({
  name: 'ObjID',
  description: 'Id representation, based on Mongo Object Ids',
  parseValue(value) {
    return ObjectId(value);
  },
  serialize(value) {
    return value.toString();
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return ObjectId(ast.value);
    }
    return null;
  },
});

let rootSchema = `
  scalar ObjID
`;
// XXX: this is a total hack, better to use graphql-tools for this bit
['Query', 'Mutation', 'Subscription'].forEach((rootField) => {
  const parts = [];
  const re = new RegExp(`type ${rootField}[\\s\\n]*{([^}]*)}`);
  [tweet.schema, user.schema].forEach((subschema) => {
    const match = re.exec(subschema);
    if (match) {
      parts.push(match[1].trim());
    }
  });
  rootSchema += `type ${rootField} { ${parts.join('\n')} }\n\n`;
});

const executableSchema = makeExecutableSchema({
  // XXX: a hack here, the root types in `rootSchema` will override the
  // constitutent parts defined in the sub-schemas
  typeDefs: [tweet.schema, user.schema, rootSchema],
  resolvers,
});

export default executableSchema;
