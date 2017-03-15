import assert from 'assert';
import cloneDeep from 'lodash.clonedeep';

import {
  buildField,
  buildTypeExtension,
  buildTypeDefinition,
  buildArgument,
  addPaginationArguments,
  applyCustomDirectives,
  idArgument,
} from '../util/graphql';

/* eslint-disable no-param-reassign */

const SCALAR_TYPE_NAMES = ['Int', 'Float', 'String', 'ID'];

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
    let unmodifiable = false;
    field.directives.forEach((directive) => {
      if (directive.name.value === 'unmodifiable') {
        unmodifiable = true;
      }
      applyCustomDirectives(field);
    });

    // XXX: Not sure if this the correct logic but it makes my tests pass
    // TODO: check for @unmodifiable
    let possibleInputType = field.type;
    let inputTypeModifier = '';
    if (possibleInputType.kind === 'NonNullType') {
      possibleInputType = possibleInputType.type;
      inputTypeModifier = '!';
    }

    if (possibleInputType.kind === 'NamedType') {
      let inputField;
      if (SCALAR_TYPE_NAMES.includes(possibleInputType.name.value)) {
        inputField = field;
      } else {
        inputField = buildField(`${field.name.value}Id`, [], `ObjID${inputTypeModifier}`);
      }

      createInputFields.push(inputField);
      if (!unmodifiable) {
        updateInputFields.push(inputField);
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

  return outputSchema;
}
