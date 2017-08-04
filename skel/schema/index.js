import fs from 'fs';

/* requireGraphQL for Webpack

const req = require.context('./', true, /\.graphql$/);
function requireGraphQL(name) {
	return req(name);
}
*/

function requireGraphQL(name) {
	const filename = require.resolve(name);
	return fs.readFileSync(filename, 'utf8');
}

const typeDefs = [
	`
  scalar ObjID
  type Query {
    # A placeholder, please ignore
    __placeholder: Int
  }
  type Mutation {
    # A placeholder, please ignore
    __placeholder: Int
  }
  type Subscription {
    # A placeholder, please ignore
    __placeholder: Int
  }
`
];

export default typeDefs;
