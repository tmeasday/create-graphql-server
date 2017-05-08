// We are in an intermediate step where we aren't actually generating files
// but we are generating code.

import { parse, print } from 'graphql';

import generateSchema from './schema';
import generateResolvers from './resolvers';
import generateModel from './model';
import generateAuthorization from './authorization';
import { lcFirst } from './util/capitalization';

export default function generate(inputSchemaStr, mode) {
  const inputSchema = parse(inputSchemaStr);

  const type = inputSchema.definitions[0];
  const TypeName = type.name.value;

  const outputSchema = generateSchema(inputSchema, mode);
  const outputSchemaStr = print(outputSchema);
  const resolversStr = generateResolvers(inputSchema, mode);
  const modelStr = generateModel(inputSchema, mode);
  const authorizationStr = generateAuthorization(inputSchema, mode);

  return {
    typeName: lcFirst(TypeName),
    TypeName,
    outputSchemaStr,
    resolversStr,
    modelStr,
    authorizationStr,
  };
}
