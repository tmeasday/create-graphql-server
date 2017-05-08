import assert from 'assert';

export default function generateAuthorization(inputSchema, mode) {
  // Check that the input looks like we expect -- a single ObjectType definition
  assert(inputSchema.kind === 'Document');
  assert(inputSchema.definitions.length === 1);

  let ObjectTypeDefinition = inputSchema.definitions.filter((node) => {
    return node.kind === 'ObjectTypeDefinition';
  });
  if (ObjectTypeDefinition.length > 1) {
    throw new Error(
      'generateAuthorization: only one type definition per file allowed'
    ); }
  if (ObjectTypeDefinition.length < 1) {
    throw new Error('generateAuthorization: no type definition found in file');
  }
  ObjectTypeDefinition = ObjectTypeDefinition[0];

  let defaultAuthorization = {
    name: ObjectTypeDefinition.name.value || 'nameNotFound',
    field: {
      ownerField: 'ownerId',
      roleField: 'role',
    },
    rules: [
      {
        mode: 'create',
        roles: ['owner'],
        removeFields: [],
      },
      {
        mode: 'read',
        roles: ['owner'],
        removeFields: [],
      },
      {
        mode: 'update',
        roles: ['owner', 'admin'],
        removeFields: [],
      },
      {
        mode: 'delete',
        roles: ['owner', 'admin'],
        removeFields: [],
      },
    ],
  };

  const defaultUserAuthorization = {
    name: ObjectTypeDefinition.name.value || 'nameNotFound',
    isUser: true,
    defaultUserRole: 'user',
    firstUserRole: 'admin',
    adminUserRole: 'admin',
    field: {
      ownerField: 'id',
      roleField: 'role',
    },
    rules: [
      {
        mode: 'create',
        roles: ['world'],
        removeFields: ['role'],
      },
      {
        mode: 'read',
        roles: ['world'],
        removeFields: [],
      },
      {
        mode: 'update',
        roles: ['owner'],
        removeFields: ['role'],
      },
      {
        mode: 'update',
        roles: ['admin'],
        removeFields: [],
      },
      {
        mode: 'delete',
        roles: ['owner', 'admin'],
        removeFields: [],
      },
    ],
  };

  let authorization = {};

  if (mode === 'add-user') {
    defaultAuthorization = defaultUserAuthorization;
  }
  authorization = Object.assign({}, defaultAuthorization);
  authorization.rules = [];

  // Reading Directives out of type file if available
  if (ObjectTypeDefinition.directives) {
    ObjectTypeDefinition.directives.forEach((directive) => {
      if (
        directive.kind &&
        directive.kind === 'Directive' &&
        directive.name &&
        directive.name.kind &&
        directive.name.kind === 'Name' &&
        directive.name.value &&
        directive.name.value === 'authorize' &&
        directive.arguments &&
        directive.arguments.length > 0
      ) {
        // Directive "@authorized" found in type definition with arguments
        directive.arguments.forEach((argument) => {
          // handle the different arguments now

          // RULES create/read/update/delete
          if (
            argument.kind &&
            argument.kind === 'Argument' &&
            argument.name &&
            argument.name.kind &&
            argument.name.kind === 'Name' &&
            argument.name.value &&
            (argument.name.value === 'create' ||
              argument.name.value === 'read' ||
              argument.name.value === 'update' ||
              argument.name.value === 'delete') &&
            argument.value
          ) {
            if (argument.value.kind && argument.value.kind === 'ListValue') {
              // it is a List
              const roles = [];
              argument.value.values.forEach((value) => {
                if (
                  value.kind &&
                  value.kind === 'StringValue' &&
                  value.value !== ''
                ) {
                  roles.push(value.value);
                }
              }); // each value
              authorization.rules.push({
                mode: argument.name.value,
                roles,
                removeFields: [],
              });
            } // ListValue

            if (
              argument.value.kind &&
              argument.value.kind === 'StringValue' &&
              argument.value.value !== ''
            ) {
              // it is a List
              authorization.rules.push({
                mode: argument.name.value,
                roles: [argument.value.value],
                removeFields: [],
              });
            } // StringValue
          } // create/read/update/delete

          // FIELD ownerField, roleField
          if (
            argument.kind &&
            argument.kind === 'Argument' &&
            argument.name &&
            argument.name.kind &&
            argument.name.kind === 'Name' &&
            argument.name.value &&
            (argument.name.value === 'ownerField' ||
              argument.name.value === 'roleField') &&
            argument.value
          ) {
            if (
              argument.value.kind &&
              argument.value.kind === 'StringValue' &&
              argument.value.value !== ''
            ) {
              // it is a List
              authorization.field[argument.name.value] = argument.value.value;
            } // StringValue
          } // ownerField / roleField

          // FIELDS:
          // defaultUserRole: 'user',
          // firstUserRole: 'admin',
          // adminUserRole: 'admin',
          if (
            argument.kind &&
            argument.kind === 'Argument' &&
            argument.name &&
            argument.name.kind &&
            argument.name.kind === 'Name' &&
            argument.name.value &&
            (argument.name.value === 'defaultUserRole' ||
              argument.name.value === 'firstUserRole' ||
              argument.name.value === 'adminUserRole') &&
            argument.value
          ) {
            if (
              argument.value.kind &&
              argument.value.kind === 'StringValue' &&
              argument.value.value !== ''
            ) {
              // it is a List
              authorization[argument.name.value] = argument.value.value;
            } // StringValue
          } // defaultUserRole, firstUserRole, adminUserRole
        }); // forEach(argument)
      } // directive authorize
    }); // forEach directive
  } // directive there

  // Check if Directives were available:
  if (authorization.rules.length === 0) {
    authorization.rules = defaultAuthorization.rules;
  }

  return `export default ${JSON.stringify(authorization, null, 2)};`;
}
