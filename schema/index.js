import { merge } from 'lodash';
import { makeExecutableSchema } from 'graphql-tools';

import * as tweet from './tweet';
import * as user from './user';

const executableSchema = makeExecutableSchema({
  typeDefs: [tweet.schema, user.schema],
  resolvers: [tweet.resolvers, user.resolvers],
});

export default executableSchema;
