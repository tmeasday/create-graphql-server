// @flow
/* eslint-disable max-len */

import { getRoles, isAuthorizeDirectiveDefined } from 'create-graphql-server-authorization';
import { lcFirst, ucFirst } from './util/capitalization';
import generatePerField from './util/generatePerField';
import { prep } from './util/prep';

import { 
  CREATE,
  USER_LITERAL,
  ROLE_FIELD_DEFAULT,
  SINGULAR,
  PAGINATED
 } from './constants';

/**
 * get context for later template compilation
 * reads schema and determines data context for code replacements
 * @public
 * @param {Object} inputSchema - schema of the type
 * @param {string} User - name of the user model for User model context
 * @return {Object} templateContext - data context for template compilation
 * @property {boolean} authorize - if authorization logic is there
 * @property {boolean} isUserType- if it is the User type
 * @property {string} typeName - name of the type with starting lower case
 * @property {string} TypeName - name of the type with starting upper case
 * @property {string} User - name of the user model
 * @property {Object} userRoles - authorizations matrix for userRole
 * @property {Object} docRoles - authorization matrix for docRole
 * @property {string} firstUserRole - the role for protectFields
 * @property {string} roleField - field name where the userRole is stored
 * @property {array} singularFields - fields array
 * @property {array} paginatedFields - fields array
 */

export function getContext(inputSchema = {}, User = USER_LITERAL) {
  // for field generation
  // prepare template context for later compilation
  const authorize = isAuthorizeDirectiveDefined(inputSchema);

  // read TypeName out of inputSchema
  const TypeName = inputSchema.definitions[0].name.value;
  const typeName = lcFirst(TypeName);
  const isUserType = TypeName === User;
  const { userRoles, docRoles, roleFieldName } = getRoles(
    authorize,
    inputSchema
  );

  // get generated fields
  const { singularFields, paginatedFields } = getFields(inputSchema);

  // protectFields only on the user type
  // roleField shouldn't be empty out, otherwise syntax errors occurs
  // it checks, if the field is really there
  // take the first userRole into the protectFields as a suggestion
  // to the programmer, assuming this is the most important role,
  // with higher authorization (see in README.md)

  const firstUserRole = userRoles[CREATE][0] ? userRoles[CREATE][0] : ``;
  const roleField = roleFieldName
    ? `${roleFieldName}`
    : `${ROLE_FIELD_DEFAULT}`;

  Object.keys(userRoles).forEach(mode => {
    userRoles[mode] = prep(userRoles[mode]);
  });

  Object.keys(userRoles).forEach(mode => {
    docRoles[mode] = prep(docRoles[mode]);
  });

  return {
    authorize,
    isUserType,
    typeName,
    TypeName,
    User,
    userRoles,
    docRoles,
    firstUserRole,
    roleField,
    singularFields,
    paginatedFields
  };
}

/**
 * get fields contexts for singular and paginated associations
 * @param {Object} inputSchema - schema of the type
 * @return {Object} fields - fields for associations
 * @property singularFields - fields for singular associations
 * @property paginatedFields - fields for paginated associations
 */

function getFields(inputSchema) {
  // field generator logic
  const type = inputSchema.definitions[0];
  const singularFields = [];
  const paginatedFields = [];

  const generators = {
    belongsTo(replacements) {
      const field = getFieldContext(SINGULAR, replacements);
      singularFields.push(field);
      return field;
    },
    belongsToMany(replacements) {
      const { typeName, fieldName } = replacements;
      const field = getFieldContext(PAGINATED, {
        ...replacements,
        query: `_id: { $in: ${typeName}.${fieldName}Ids || [] }`
      });
      paginatedFields.push(field);
      return field;
    },
    hasMany(replacements, { as }) {
      const { typeName } = replacements;
      const field = getFieldContext(PAGINATED, {
        ...replacements,
        query: `${as || typeName}Id: ${typeName}._id`
      });
      paginatedFields.push(field);
      return field;
    },
    hasAndBelongsToMany(replacements, { as }) {
      const { typeName } = replacements;
      const field = getFieldContext(PAGINATED, {
        ...replacements,
        query: `${as || typeName}Ids: ${typeName}._id`
      });
      paginatedFields.push(field);
      return field;
    }
  };

  generatePerField(type, generators);

  return { singularFields, paginatedFields };
}

/**
 * gets context of one field
 * @param {string} fieldtype - SINGULAR or PAGINATED
 * @param {object} context - context for the template partial
 * @property {string} typeName - name of the type 
 * @property {string} fieldName - name of the field
 * @property {string} argsStr - arguments of the field
 * @property {string} ReturnTypeName - type to reference
 * @property {string} query - query for the data access
 * @return {Object} field - field for an association
 * @property {string} fieldType - SINGULAR or PAGINATED 
 * @property {string} fieldName - name of the field
 * @property {string} typeName - name of the type with first lower character
 * @property {string} TypeName -  name of the type with first upper character
 * @property {string} ReturnTypeName - name of the type to associate
 * @property {string} argsString - argument string for parameters
 * @property {string} argsFields - fields to pass on to the association
 * @property {string} query - which fields to query during association
 */

function getFieldContext(
  fieldType,
  { typeName, fieldName, argsStr, ReturnTypeName, query }
) {
  let argFields = (' ' + argsStr).slice(1);
  const argsWithDefaultsStr = argsStr
    .replace('lastCreatedAt', 'lastCreatedAt = 0')
    .replace('limit', 'limit = 10');
  if (fieldType === PAGINATED && argFields !== '') {
    argFields = argFields.replace('{ ', '{ baseQuery, ');
  }
  const field = {
    fieldType: fieldType || '',
    fieldName: fieldName || '',
    typeName: typeName || '',
    TypeName: ucFirst(typeName) || '',
    ReturnTypeName: ReturnTypeName || '',
    argsString: argsWithDefaultsStr || '',
    argsFields: argFields || '',
    query: query || ''
  };
  return field;
}

