// We are in an intermediate step where we aren't actually generating files
// but we are generating code.

import fs from 'fs';

import readInput from './read';

import generateSchema from './schema';
import generateResolvers from './resolvers';
import generateModel from './model';
import { ucFirst } from './util/capitalization';


const inputDir = `${__dirname}/../input`;

// XXX: read this in obviously
const TYPES = fs.readdirSync(inputDir).map(f => f.split('.')[0]);

const schemasByType = {};
const resolversByType = {};
const modelsByType = {};

TYPES.forEach((type) => {
  const inputSchema = readInput(`${inputDir}/${type}.graphql`);

  schemasByType[type] = generateSchema(inputSchema);
  resolversByType[type] = generateResolvers(inputSchema, schemasByType[type]);
  modelsByType[type] = generateModel(inputSchema);
});

import { print } from 'graphql';
const schemas = Object.values(schemasByType).map(print);

// Code to run code in-memory. This is just a POC
import { runInThisContext } from 'vm';
import { transform } from 'babel-core';
import module from 'module';

const babelOptions = JSON.parse(fs.readFileSync(`${__dirname}/../.babelrc`));
function stringToExports(str) {
  const exports = {};
  const require = () => {};
  runInThisContext(module.wrap(transform(str, babelOptions).code))(exports, require);
  return exports;
}
const resolvers = Object.values(resolversByType).map(stringToExports)
  .map(e => e.resolvers);

Object.keys(modelsByType).forEach((key) => {
  modelsByType[key] = stringToExports(modelsByType[key]).default;
});

// Everything above here is what we would generate and write to disk
// Below here is just code to get it running

// We would also write resolvers/models out

// **********************************************************************
// We should generate / eval this code
import { makeExecutableSchema } from 'graphql-tools';

// We should make makeExecutableSchema/graphql-tools do this for us
const rootResolvers = {};
resolvers.forEach((resolverSet) => {
  Object.keys(resolverSet).forEach((key) => {
    rootResolvers[key] = Object.assign(rootResolvers[key] || {}, resolverSet[key]);
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
  resolvers: rootResolvers,
});

// We should generate / eval this code too
export function addModelsToContext(context) {
  const newContext = Object.assign({}, context);
  TYPES.forEach((type) => {
    newContext[ucFirst(type)] = new modelsByType[type](newContext);
  });
  return newContext;
}
