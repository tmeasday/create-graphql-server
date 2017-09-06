// We are in an intermediate step where we aren't actually generating files
// but we are generating code.
import { parse, print } from 'graphql';
import { lcFirst } from './util/capitalization';
import generateModel from './model';
import generateResolvers from './resolvers';
import generateSchema from './schema';

export default function generate(inputSchemaStr) {
  const inputSchema = parse(inputSchemaStr);
  const type = inputSchema.definitions[0];
  const TypeName = type.name.value;
  const typeName = lcFirst(TypeName);
  const outputSchema = generateSchema(inputSchema);
  const outputSchemaStr = print(outputSchema);
  const resolversStr = generateResolvers(inputSchema);
  const modelStr = generateModel(inputSchema);
  
  return {
    typeName,
    TypeName,
    outputSchemaStr,
    resolversStr,
    modelStr,
  };
}
