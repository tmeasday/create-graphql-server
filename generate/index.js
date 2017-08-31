// We are in an intermediate step where we aren't actually generating files
// but we are generating code.

import { parse, print } from 'graphql';
import generateSchema from './schema';
import { getCode } from './getCode';

import { lcFirst } from './util/capitalization';

export default function generate(inputSchemaStr) {
  const inputSchema = parse(inputSchemaStr);
  const type = inputSchema.definitions[0];
  const TypeName = type.name.value;
  const outputSchema = generateSchema(inputSchema);
  const outputSchemaStr = print(outputSchema);
  const resolversStr = generateResolver(inputSchema);
  const modelStr = generateModel(inputSchema);

  return {
    typeName: lcFirst(TypeName),
    TypeName,
    outputSchemaStr,
    resolversStr,
    modelStr,
  };
}

export function generateModel(inputSchema) {
  return getCode({
    inputSchema,
    basePath: ['generate', 'templates', 'model'],
    authPath: ['node_modules', 'create-graphql-server-authorization', 'templates', 'model', 'auth']
  });
}

export function generateResolver(inputSchema) {
  return getCode({
    inputSchema,
    basePath: ['generate', 'templates', 'resolver'],
    authPath: ['node_modules', 'create-graphql-server-authorization', 'templates','resolver', 'auth']
  });
}
