import { merge } from 'lodash';
import { makeExecutableSchema } from 'graphql-tools';

import * as tweets from './tweets';
import * as users from './users';

const executableSchema = makeExecutableSchema({
  typeDefs: [tweets.schema, users.schema],
  resolvers: [tweets.resolvers, users.resolvers],
});

export default executableSchema;
