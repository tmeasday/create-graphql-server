import { Kind } from 'graphql';
import includes from 'lodash.includes';

export const SCALAR_TYPE_NAMES = ['Int', 'Float', 'String', 'Boolean', 'ID'];

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

export function buildName(name) {
  return { kind: 'Name', value: name };
}

export function buildTypeDefinition(name, fields, kind = 'ObjectTypeDefinition') {
  return {
    kind,
    name: buildName(name),
    interfaces: [],
    directives: [],
    fields,
  };
}

export function buildTypeExtension(type) {
  return {
    kind: Kind.TYPE_EXTENSION_DEFINITION,
    definition: type,
  };
}

export function buildTypeReference(name) {
  if (name[name.length - 1] === '!') {
    return {
      kind: 'NonNullType',
      type: buildTypeReference(name.substring(0, name.length - 1)),
    };
  }

  if (name[0] === '[' && name[name.length - 1] === ']') {
    return {
      kind: 'ListType',
      type: buildTypeReference(name.substring(1, name.length - 1)),
    };
  }

  return {
    kind: 'NamedType',
    name: buildName(name),
  };
}

export function buildField(name, args, typeName) {
  return {
    kind: 'FieldDefinition',
    name: buildName(name),
    arguments: args,
    type: buildTypeReference(typeName),
  };
}

export function buildArgument(name, type) {
  return {
    kind: 'InputValueDefinition',
    name: buildName(name),
    type: buildTypeReference(type),
    defaultValue: null,
    directives: [],
  };
}

export function addPaginationArguments(field) {
  field.arguments.push(buildArgument('lastCreatedAt', 'Float'));
  field.arguments.push(buildArgument('limit', 'Int'));
}

// Apply all the directives that modify the field's schema. At this stage
// this is simply the pagination directives, which add pagination arguments
// to the field.
export function applyCustomDirectives(field) {
  field.directives.forEach((directive) => {
    const directiveName = directive.name.value;
    const isPaginated = includes(['hasMany', 'hasAndBelongsToMany',
      'belongsToMany'], directiveName);
    if (isPaginated) {
      addPaginationArguments(field);
    }
  });
}

export function idArgument() {
  return buildArgument('id', 'ObjID!');
}
