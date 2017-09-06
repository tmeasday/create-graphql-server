// @flow
/* eslint-disable max-len */
import { 
  getRoles,
  isAuthorizeDirectiveDefined
} from 'create-graphql-server-authorization';

import { lcFirst, ucFirst } from './capitalization';
import generatePerField from './generatePerField';

import { 
  CREATE,
  USER_LITERAL,
  ROLE_FIELD_DEFAULT,
  SINGULAR,
  PAGINATED,
  MODEL,
  RESOLVER,
  SCHEMA
 } from './constants';

/**
 * gets context for later template compilation
 * reads schema and determines data context for code replacements
 * @public
 * @param {Object} inputSchema - schema of the type
 * @param {string} User - name of the user model for User model context
 * @param {string} codeType - to distinguish MODEL/RESOLVER runs
 * @return {Object} templateContext - data context for template compilation
 *
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
 * @property {object} schema - schema definition
 */

export default function getContext(
  inputSchema = {}, User = USER_LITERAL, codeType = MODEL) {
  // for field generation
  // prepare template context for later compilation
  const authorize = isAuthorizeDirectiveDefined(inputSchema);

  // read TypeName out of inputSchema
  const TypeName = inputSchema.definitions[0].name.value;
  const typeName = lcFirst(TypeName);
  const isUserType = TypeName === User;

  // getting the role definitions out of the @authorize directive
  const { userRoles, docRoles, roleFieldName } = getRoles(
    authorize,
    inputSchema
  );

  // get generated fields for resolvers and models
  const { singularFields, paginatedFields } = getFields(inputSchema, codeType);

  // prepare protectFields only on for the "User" type as an example
  // roleField shouldn't be empty
  // it checks, if the field is there
  // it takes the first found userRole into the protectFields as a suggestion
  // to the programmer, assuming this is the most important role,
  // with higher authorization (see in README.md)
  const firstUserRole = userRoles[CREATE][0] ? userRoles[CREATE][0] : ``;
  const roleField = roleFieldName
    ? `${roleFieldName}`
    : `${ROLE_FIELD_DEFAULT}`;

  // create proper strings for the roles, for template injection
  Object.keys(userRoles).forEach(mode => {
    userRoles[mode] = prepareString(userRoles[mode]);
  });
  Object.keys(userRoles).forEach(mode => {
    docRoles[mode] = prepareString(docRoles[mode]);
  });

  // this is the returned data context for the later template processing
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
 * prepares contexts for singular and paginated field associations
 * @param {Object} inputSchema - schema of the type
 * @param {string} codeType - to distinguish between MODEL/RESOLVER
 * @return {Object} fields - fields for associations
 * @property singularFields - fields for singular associations
 * @property paginatedFields - fields for paginated associations
 */

function getFields(inputSchema, codeType) {
  const type = inputSchema.definitions[0];

  // prepare singular and paginated field arrays for the field templates
  const singularFields = [];
  const paginatedFields = [];

  // generators for the different field association types:
  const generators = {

    // singular association @belongsTo
    belongsTo(replacements) {
      const field = buildFieldContext(SINGULAR, replacements, codeType);
      singularFields.push(field);
      return field;
    },

    // paginated association @belongsToMany
    belongsToMany(replacements) {
      const { typeName, fieldName } = replacements;
      const field = buildFieldContext(PAGINATED, {
        ...replacements,
        query: `_id: { $in: ${typeName}.${fieldName}Ids || [] }`
      }, codeType);
      paginatedFields.push(field);
      return field;
    },

    // paginated association @hasMany
    hasMany(replacements, { as }) {
      const { typeName } = replacements;
      const field = buildFieldContext(PAGINATED, {
        ...replacements,
        query: `${as || typeName}Id: ${typeName}._id`
      }, codeType);
      paginatedFields.push(field);
      return field;
    },

    // paginated association @hasAndBelongsToMany
    hasAndBelongsToMany(replacements, { as }) {
      const { typeName } = replacements;
      const field = buildFieldContext(PAGINATED, {
        ...replacements,
        query: `${as || typeName}Ids: ${typeName}._id`
      }, codeType);
      paginatedFields.push(field);
      return field;
    }
  };

  generatePerField(type, generators);

  return { singularFields, paginatedFields };
}

/**
 * builds a field's context
 *
 * @param {string} fieldtype - SINGULAR or PAGINATED field type
 * @param {object} context - context for the template partial
 *
 * @property {string} typeName - name of the type 
 * @property {string} fieldName - name of the field
 * @property {string} argsStr - arguments of the field
 * @property {string} ReturnTypeName - type to build association with
 * @property {string} query - query for the data access to the referenced type
 *
 * @param {string} codeType - to distinguish between MODEL/RESOLVER
 * @return {Object} field - field for an association
 *
 * @property {string} fieldType - SINGULAR or PAGINATED 
 * @property {string} fieldName - name of the field
 * @property {string} typeName - name of the type with first lower character
 * @property {string} TypeName -  name of the type with first upper character
 * @property {string} ReturnTypeName - name of the type to associate
 * @property {string} argsString - argument string for parameters
 * @property {string} argsFields - fields to pass on to the association
 * @property {string} query - which fields to query during association
 */

function buildFieldContext(fieldType, { 
  typeName, fieldName, argsStr, ReturnTypeName, query }, codeType) {
  // clone the string
  let argFields = (' ' + argsStr).slice(1);

  // populate some arguments with defaults
  const argsWithDefaultsStr = argsStr
    .replace('lastCreatedAt', 'lastCreatedAt = 0')
    .replace('limit', 'limit = 10');

  // prepares a fields string to pass on to the referenced type
  if (fieldType === PAGINATED && argFields !== '') {
    argFields = argFields.replace('{ ', '{ baseQuery, ');
  }

  // returns the build field context
  return {
    fieldType: fieldType || '',
    fieldName: fieldName || '',
    typeName: typeName || '',
    TypeName: ucFirst(typeName) || '',
    ReturnTypeName: ReturnTypeName || '',
    argsString: argsWithDefaultsStr || '',
    argsFields: argFields || '',
    query: query || ''
  };
}

/**
 * prepare roles for code generator
 * convert array to String value
 * replace " by '
 * @private
 * @param {array} role - name of role
 * @return {string} roleString - role string
 */

function prepareString(role) {
  return JSON.stringify(role).replace(/"/g, "'").replace(/,/g, ', ');
}
