import _ from 'lodash';
import log from '../server/logger';

// enhanced version of tmeasday's findByIds plus authQuery handling
export function findByIds(collection, ids = [], authQuery = {}) {
 const baseQuery = { _id: { $in: ids } };
 const finalQuery = {...baseQuery, ...authQuery};
   return collection.find(finalQuery)
   .toArray()
   .then((docs) => {
     const idMap = {};
     docs.forEach((d) => { idMap[d._id] = d; });
     return ids.map(id => idMap[id]);
   });
}

// returns true, if user is logged in
export function loggedIn(user) {
  if(user && user._id && user._id.toString() !== '') {
    return true;
  }
  return false;
}

// creates an authQuery object with additional query arguments, to implement authorization restrictions for mongodb access
export function queryForRoles(user = {}, auth = {}, mode = '', { User }, doc = {}, resolver = '') {

  // Build query for the case: The logged in user's role is authorized
  if (roleAuthorizedForDoc(user, auth, mode, { User }, doc, resolver)) {
    return {};  // empty authQuery means, do operation with no access restrictions
  }

  // Build query for the case: The user is listed in any document field
  const query = { $or: [] };
  if (userAuthorizedForDoc(user, auth, mode, { User }, doc, resolver)){
    const docRoles =  auth.docRoles[mode] || [];
    docRoles.forEach(docRole => query.$or.push( { [docRole]: user._id } ) );
    log.debug('authQuery:', JSON.stringify(query, null, 2));
    return query;
  }

  // Not Authorized
  throw new Error(`Authorization: Not authorized to ${mode} ${auth.type} ${doc._id ? doc._id : ''}.`); 
}

// returns true, if the user's role is authorized for a document
export function roleAuthorizedForDoc(user = {}, auth = {}, mode = '', { User }, doc = {}, resolver = ''){
  const userRoles = auth.userRoles[mode] || [];
  const role = User.authRole(user);
  const fields = auth.fields || [];

  if ( userRoles.includes('world') || role && role !== '' && role !== '<no-role>' && userRoles.length > 0 && userRoles.includes(role) ) {
    let fieldsAuthorized = true;

    // check all fields with @authorize directives, if any of them is not allowed for the role
    fields.forEach(field => {
      // if this field is in the document, 
      if (doc[field.name]) {
        const fieldUserRoles = field.userRoles[mode] || [];
        //check if the user role doesn't allow this field
        if ( fieldUserRoles.length === 0 || ! ( fieldUserRoles.includes(role) || fieldUserRoles.includes('world') ) ){
          fieldsAuthorized = false;
        }
      } 
    });

    // only if all fields of the document are allowed for the role
    if (fieldsAuthorized){
      log.debug(`${resolver} ${mode} with user ${user.username ? user.username : '<no-user>'} for ${auth.type} and ${doc._id ? doc._id : ''}`);
      return true;
    }
    
  }

  return false;
}

// returns true, if the user is authorized by a document role
export function userAuthorizedForDoc(user = {}, auth = {}, mode = '', { User }, doc = {}, resolver = ''){
  const docRoles =  auth.docRoles[mode] || [];
  const fields = auth.fields || [];
  let userId;
  let authorized = false;

  // document role checks work only with logged in user
  if (!loggedIn(user)) return false;
  userId = user._id.toString();

  // check if any docRole leads to an authorization
  docRoles.forEach(docRole => {
    const docRoleField = doc[docRole];
    let fieldsAuthorized = true;
    // check if the field for the docRole check is in the document, if not, it cannot be checked
    if (docRoleField){
      // check if user is authorized for doc
      if (fieldContainsUserId(docRoleField, userId)){

        // check if user is authorized for the doc's fields
        fields.forEach(field => {
          const fieldDocRoles = field.docRoles[mode] || [];
          // check if restricted field is in the current document, and if the current docRole is not in the docRole of the field
          if (mode !== 'update' && doc[field.name] && !fieldDocRoles.includes(docRole)){
            fieldsAuthorized = false;
          }
          // check if doc contains a $set object, and this contains any of the fields, 
          // and if the current docRole is not in the docRole of the field
          if (mode === 'update' && doc.$set && doc.$set[field.name] && !fieldDocRoles.includes(docRole)){
            fieldsAuthorized = false;
          }
        });

        // only if the same role is authorized for the document and all fields, it is allowed
        if (fieldsAuthorized){
          log.debug(`${resolver} ${mode} with user ${(user.username) ? user.username : '<no-username>'} for ${auth.type} and docRole ${docRole} for doc with id: ${doc._id ? doc._id : ''}`);
          authorized = true;
          return true;
        }

      }
    }
  });

  return authorized;
}

// returns true, if a field of type array/object/string contains the userId
export function fieldContainsUserId(docRoleField, userId) {
  let userIdFound = false;

  // handle an array of userIds
  if (_.isArray(docRoleField)){
    docRoleField.forEach(field => {
      if (field.toString() === userId){
        userIdFound = true;
      }
    });
  }

  // handle a field with one userId, must be an object, if it is an ObjectId('<id>')
  if (_.isObject(docRoleField) && docRoleField.toString() === userId){
    userIdFound = true;
  }

  // handle a field with just an userId String
  if (_.isString(docRoleField) && docRoleField.toString() === userId){
    userIdFound = true;
  }

  return userIdFound;
}
