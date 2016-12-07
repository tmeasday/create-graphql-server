// We are in an intermediate step where we aren't actually generating files
// but we are generating code.

import { parse, print } from 'graphql';

import generateSchema from './schema';
import generateResolvers from './resolvers';
import generateModel from './model';
import { lcFirst } from './util/capitalization';

export default function generate(inputSchemaStr) {
  const inputSchema = parse(inputSchemaStr);

  const type = inputSchema.definitions[0];
  const TypeName = type.name.value;

  const outputSchema = generateSchema(inputSchema);
  const outputSchemaStr = print(outputSchema);
  const resolversStr = generateResolvers(inputSchema);
  const modelStr = generateModel(inputSchema);

  return {
    typeName: lcFirst(TypeName),
    TypeName,
    outputSchemaStr,
    resolversStr,
    modelStr,
  };
}
