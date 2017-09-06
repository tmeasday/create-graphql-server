import assert from 'assert';
import cloneDeep from 'lodash.clonedeep';
import includes from 'lodash.includes';

import {
  enhanceSchemaForAuthorization
} from 'create-graphql-server-authorization';

import {
  buildField,
  buildTypeExtension,
  buildTypeDefinition,
  buildArgument,
  addPaginationArguments,
  applyCustomDirectives,
  idArgument,
  SCALAR_TYPE_NAMES,
  getBaseType
} from '../util/graphql';

/* eslint-disable no-param-reassign */

export default function generateSchema(inputSchema) {
  // Check that the input looks like we expect -- a single ObjectType definition
  assert(inputSchema.kind === 'Document');
  assert(inputSchema.definitions.length === 1);

  const outputSchema = cloneDeep(inputSchema);

  const type = outputSchema.definitions[0];
  const typeName = type.name.value;

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

    // Simple Fields
    if (possibleInputType.kind === 'NamedType') {
      const isScalarField = includes(SCALAR_TYPE_NAMES, possibleInputType.name.value);
      let CreateInputField = '';
      let UpdateInputField = '';
      if (isScalarField || !!directivesByName.enum) {
        // take field as it was entered
        CreateInputField = field;
        // on updates, on NonNullable entered fields, the user should be able to decide, if he wants to update
        UpdateInputField = buildField(`${field.name.value}`, [], `${getBaseType(field.type).name.value}`);
      } else {
        CreateInputField = buildField(`${field.name.value}Id`, [], `ObjID${inputTypeModifier}`);
        // same here, otherwise we always have to update fields, even if we don't want to update them
        UpdateInputField = buildField(`${field.name.value}Id`, [], `ObjID`);
      }

      createInputFields.push(CreateInputField);
      if (!directivesByName.unmodifiable) {
        updateInputFields.push(UpdateInputField);
      }
    }

    // Fields containing List of values
    if (possibleInputType.kind === 'ListType') {

      if (possibleInputType.type.kind === 'NonNullType') {
        possibleInputType = possibleInputType.type;
        inputTypeModifier = '!';
      }

      if (possibleInputType.type.kind === 'NamedType') {
        possibleInputType = possibleInputType.type;
      }

      const isScalarField = includes(SCALAR_TYPE_NAMES, possibleInputType.name.value);
      let CreateInputField = '';
      let UpdateInputField = '';
      if (isScalarField || !!directivesByName.enum) {
        CreateInputField = `[${field}]`;
        UpdateInputField = `[${field}]`;
      } else {
        CreateInputField = buildField(`${field.name.value}Ids`, [], `[ObjID${inputTypeModifier}]`);
        UpdateInputField = buildField(`${field.name.value}Ids`, [], `[ObjID]`);
      }

      createInputFields.push(CreateInputField);
      if (!directivesByName.unmodifiable) {
        updateInputFields.push(UpdateInputField);
      }
    }

    field.directives = [];
  });

  type.fields.unshift(buildField('id', [], 'ObjID!'));
  type.fields.push(buildField('createdAt', [], 'Float!'));
  type.fields.push(buildField('updatedAt', [], 'Float!'));

  const queryOneField = buildField(typeName.toLowerCase(), [idArgument()], typeName);
  const queryAllField = buildField(`${typeName.toLowerCase()}s`, [], `[${typeName}!]`);
  addPaginationArguments(queryAllField);
  outputSchema.definitions.push(
    buildTypeExtension(buildTypeDefinition('Query', [queryAllField, queryOneField]))
  );

  const createInputTypeName = `Create${typeName}Input`;
  outputSchema.definitions.push(
    buildTypeDefinition(createInputTypeName, createInputFields, 'InputObjectTypeDefinition')
  );

  const updateInputTypeName = `Update${typeName}Input`;
  outputSchema.definitions.push(
    buildTypeDefinition(updateInputTypeName, updateInputFields, 'InputObjectTypeDefinition')
  );

  // Create update input type if readonly fields

  outputSchema.definitions.push(buildTypeExtension(
    buildTypeDefinition('Mutation', [
      buildField(`create${typeName}`, [
        buildArgument('input', `${createInputTypeName}!`),
      ], typeName),

      buildField(`update${typeName}`, [
        idArgument(),
        buildArgument('input', `${updateInputTypeName}!`),
      ], typeName),

      buildField(`remove${typeName}`, [idArgument()], 'Boolean'),
    ])
  ));

  outputSchema.definitions.push(buildTypeExtension(
    buildTypeDefinition('Subscription', [
      buildField(`${typeName.toLowerCase()}Created`, [], typeName),
      buildField(`${typeName.toLowerCase()}Updated`, [], typeName),
      buildField(`${typeName.toLowerCase()}Removed`, [], 'ObjID'),
    ])
  ));

  // enhance with Authorization
  const outputSchemaWithAuth = enhanceSchemaForAuthorization(outputSchema);

  return outputSchemaWithAuth;
}