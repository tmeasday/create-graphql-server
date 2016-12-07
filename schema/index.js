import fs from 'fs';

function requireGraphQL(name) {
  const filename = require.resolve(name);
  return fs.readFileSync(filename, 'utf8');
}

const typeDefs = [
  'scalar ObjID'
];

export default typeDefs;

typeDefs.push(requireGraphQL('./tweet.graphql'));
typeDefs.push(requireGraphQL('./user.graphql'));
