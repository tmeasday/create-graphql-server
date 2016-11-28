export default function generateResolvers(inputSchema, outputSchema) {
  const resolvers = {};

  outputSchema.definitions.forEach((definition) => {
    if (definition.kind === 'ObjectTypeDefinition') {
      resolvers[definition.name.value] = {};
      definition.fields.forEach((field) => {
        resolvers[definition.name.value][field.name.value] = () => {
          return {};
        };
      });
    }
  });

  return resolvers;
}
