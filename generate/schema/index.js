import assert from 'assert';
import cloneDeep from 'lodash.clonedeep';
import includes from 'lodash.includes';

import {
  buildField,
  buildTypeExtension,
  buildTypeDefinition,
  buildArgument,
  addPaginationArguments,
  applyCustomDirectives,
  idArgument,
  isScalarField,
  SCALAR_TYPE_NAMES,
} from '../util/graphql';

import { lcFirst } from '../util/capitalization';
import { adjustSchemaForAuthorization } from 'create-graphql-server-authorization';

/* eslint-disable no-param-reassign */

function getType(field){
  if (field && 
      field.type && 
      field.type.kind &&
      (field.type.kind === 'Name' ||
       field.type.kind === 'NamedType') &&
      field.type.name &&
      field.type.name.value)
    return field.type.name.value;
  else if (field && 
      field.type && 
      field.type.kind &&
      field.type.kind === 'NonNullType' &&
      field.type.type &&
      field.type.type.kind &&
      (field.type.type.kind === 'Name' ||
      field.type.type.kind === 'NamedType') &&
      field.type.type.name &&
      field.type.type.name.value
  )
    return field.type.type.name.value;
  return '';
}

export default function generateSchema(inputSchema) {
  // Check that the input looks like we expect -- a single ObjectType definition
  assert(inputSchema.kind === 'Document');
  assert(inputSchema.definitions.length === 1);

  const outputSchema = cloneDeep(inputSchema);

  const type = outputSchema.definitions[0];
  const TypeName = type.name.value;
  const typeName = lcFirst(TypeName);

  const createInputFields = [];
  const updateInputFields = [];

  type.fields.forEach((field) => {
    const directivesByName = {};
    field.directives.forEach((directive) => {
      directivesByName[directive.name.value] = directive;
    });
    applyCustomDirectives(field);

    // XXX: Not sure if this the correct logic but it makes my tests pass
    // TODO: check for @unmodifiable
    let possibleInputType = field.type;
    let inputTypeModifier = '';
    if (possibleInputType.kind === 'NonNullType') {
      possibleInputType = possibleInputType.type;
      inputTypeModifier = '!';
    }

    if (possibleInputType.kind === 'NamedType') {
      const isScalarField = includes(SCALAR_TYPE_NAMES, possibleInputType.name.value);
      let inputFieldCreate = '';
      let inputFieldUpdate = '';
      if (isScalarField || !!directivesByName.enum) {
        inputFieldCreate = field;
        inputFieldUpdate = buildField(`${field.name.value}`, [], `${getType(field)}`);
      } else {
        inputFieldCreate = buildField(`${field.name.value}Id`, [], `ObjID${inputTypeModifier}`);
        inputFieldUpdate = buildField(`${field.name.value}Id`, [], `ObjID`);
      }

      createInputFields.push(inputFieldCreate);
      if (!directivesByName.unmodifiable) {
        updateInputFields.push(inputFieldUpdate);
      }
    }

    if (possibleInputType.kind === 'ListType') {

      if (possibleInputType.type.kind === 'NonNullType') {
        possibleInputType = possibleInputType.type;
        inputTypeModifier = '!';
      }

      if (possibleInputType.type.kind === 'NamedType') {
        possibleInputType = possibleInputType.type;
      }

      const isScalarField = includes(SCALAR_TYPE_NAMES, possibleInputType.name.value);
      let inputFieldCreate = '';
      let inputFieldUpdate = '';
      if (isScalarField || !!directivesByName.enum) {
        inputFieldCreate = `[${field}]`;
        inputFieldUpdate = `[${field}]`;
      } else {
        inputFieldCreate = buildField(`${field.name.value}Ids`, [], `[ObjID${inputTypeModifier}]`);
        inputFieldUpdate = buildField(`${field.name.value}Ids`, [], `[ObjID]`);
      }

      createInputFields.push(inputFieldCreate);
      if (!directivesByName.unmodifiable) {
        updateInputFields.push(inputFieldUpdate);
      }
    }

    field.directives = [];
  });

  type.fields.unshift(buildField('id', [], 'ObjID!'));

  // adjustments to types from authorization
  const adjustments = adjustSchemaForAuthorization(typeName, inputSchema);
  adjustments && adjustments.forEach(field => {
    const fieldSetup = buildField(field.name, [], field.type);
    switch (field.mode){
      case 'create':
        createInputFields.push(fieldSetup);
        break;
      case 'update':
        updateInputFields.push(fieldSetup);
        break;
      case 'read':
        type.fields.push(fieldSetup);
        break;
    }
  });

  const queryOneField = buildField(TypeName.toLowerCase(), [idArgument()], TypeName);
  const queryAllField = buildField(`${TypeName.toLowerCase()}s`, [], `[${TypeName}!]`);
  addPaginationArguments(queryAllField);
  outputSchema.definitions.push(
    buildTypeExtension(buildTypeDefinition('Query', [queryAllField, queryOneField]))
  );

  const createInputTypeName = `Create${TypeName}Input`;
  outputSchema.definitions.push(
    buildTypeDefinition(createInputTypeName, createInputFields, 'InputObjectTypeDefinition')
  );

  const updateInputTypeName = `Update${TypeName}Input`;
  outputSchema.definitions.push(
    buildTypeDefinition(updateInputTypeName, updateInputFields, 'InputObjectTypeDefinition')
  );

  // Create update input type if readonly fields

  outputSchema.definitions.push(buildTypeExtension(
    buildTypeDefinition('Mutation', [
      buildField(`create${TypeName}`, [
        buildArgument('input', `${createInputTypeName}!`),
      ], TypeName),

      buildField(`update${TypeName}`, [
        idArgument(),
        buildArgument('input', `${updateInputTypeName}!`),
      ], TypeName),

      buildField(`remove${TypeName}`, [idArgument()], 'Boolean'),
    ])
  ));

  outputSchema.definitions.push(buildTypeExtension(
    buildTypeDefinition('Subscription', [
      buildField(`${TypeName.toLowerCase()}Created`, [], TypeName),
      buildField(`${TypeName.toLowerCase()}Updated`, [], TypeName),
      buildField(`${TypeName.toLowerCase()}Removed`, [], 'ObjID'),
    ])
  ));

  return outputSchema;
}
