const SCALAR_TYPE_NAMES = ['Int', 'Float', 'String', 'ID'];

function getBaseType(type) {
  if (type.kind === 'ListType' || type.kind === 'NonNullType') {
    return getBaseType(type.type);
  }
  return type;
}

export default function generateResolvers(inputSchema, outputSchema) {
  const resolvers = {};

  inputSchema.definitions.forEach((definition) => {
    if (definition.kind === 'ObjectTypeDefinition') {
      resolvers[definition.name.value] = {};
      definition.fields.forEach((field) => {
        if (SCALAR_TYPE_NAMES.includes(getBaseType(field.type).name.value)) {
          return;
        }
        resolvers[definition.name.value][field.name.value] = () => {
          console.log(`${definition.name.value}${field.name.value}`);

          if (field.type.kind === 'ListType') {
            return [{}, {}];
          }
          return {};
        };
      });
    }
  });

  return resolvers;
}
