import { makeExecutableSchema } from 'graphql-tools';

import * as tweet from './tweet';
import * as user from './user';

// We should make makeExecutableSchema/graphql-tools do this for us
const resolvers = {};
[tweet.resolvers, user.resolvers].forEach((resolverSet) => {
  Object.keys(resolverSet).forEach((key) => {
    resolvers[key] = Object.assign(resolvers[key] || {}, resolverSet[key]);
  });
});

let rootSchema = '';
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
