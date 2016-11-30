const SCALAR_TYPE_NAMES = ['Int', 'Float', 'String', 'ID'];

export function getBaseType(type) {
  if (type.kind === 'ListType' || type.kind === 'NonNullType') {
    return getBaseType(type.type);
  }
  return type;
}

export function argumentsToObject(argumentsAst) {
  const result = {};
  argumentsAst.forEach((argument) => {
    result[argument.name.value] = argument.value.value;
  });
  return result;
}

export function isScalarField(field) {
  return SCALAR_TYPE_NAMES.includes(getBaseType(field.type).name.value);
}
