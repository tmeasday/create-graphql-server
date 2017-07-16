import _ from 'lodash';
import log from '../server/logger';

// central logger for authorization checks
export function authlog(resolver = '', mode = '', me = {}) {
  const makeMessage = (message) => `Authorize ${mode} "${resolver}" with user "${me.username ? me.username : '<no-user>'}" ${message}`;
  return {
    debug: (message) => log.debug(makeMessage(message)),
    error: (message) => {throw new Error(makeMessage(message))},
  };
}

// returns the record, cached if already read, checks authorization if set
// enhancement of tmeasday'findByIds
export function findByIds(collection, ids = [], authQuery) {
 const baseQuery = { _id: { $in: ids } };
 const finalQuery = {...baseQuery, ...authQuery};
 return collection.find(finalQuery).toArray().then(docs => {
   const idMap = {};
   docs.forEach(d => { idMap[d._id] = d; });
   return ids.map(id => idMap[id]);
 });
}

// returns true, if user is logged in
export function loggedIn(me) {
  if(me && me._id && me._id.toString() !== '') {
    return true;
  }
  return false;
}

// returns true, if authorized to get field
// returns false, if NOT authorized to get field
export function fieldAuthorized(me = {}, userRoles = [], docRoles = [], { User }, logger){
  // The logged in user's role is authorized for the field
  if (roleAuthorizedForDoc(me, userRoles, docRoles, { User }, logger)) {
    return true;  
  }
  // The user might be listed in any document field
  if (loggedIn(me) && docRoles.length > 0){
    return true;
  }
  return false;
}

// returns a projection query of fields not to be shown, e.g. { role: 0 }
export function fieldForRoles(projection, field, me = {}, userRoles = [], docRoles = [], { User }, logger){
  const role = User.authRole(me);
  // The logged in user's role is authorized for the field
  if (roleAuthorizedForDoc(me, userRoles, docRoles, { User }, logger)) {
    return projection;  
  }
  // The user is listed in any document field
  if (loggedIn(me) && docRoles.length > 0){
    return projection;
  }
  const authFields = Object.assign({}, { [field]: 0 }, projection);
  logger.debug(`and role "${role ? role : '<no-role>'}" not authorized to access field "${field}".`)
  return authFields;
}

// imports a result (which is document or an array of documents), and returns the result,
// but it removes the field without authorization from documents,
// e.g. field "role" is removed from all result documents, if the user/role is not allowed to access it
export function authorizedFields(result, field, me, userRoles = [], docRoles = [], { User }, logger){
  const role = User.authRole(me) || '<no-role>';

  // if any userRole authorizes field
  if (roleAuthorizedForDoc(me, userRoles, docRoles, { User }, logger)) {
    return result;  
  }

  // if any docRole authorizes field
  // The user is listed in any document field
  if (loggedIn(me) && docRoles.length > 0){

    // if the result was an array of documents, check each doc and field
    if (_.isArray(result)){
      const authorizedResult = [];
      // check all documents in the result array
      result.every(doc => {
        let fieldAuthorized = false;
        // check all docRoles if any of them authorizes field
        docRoles.every(docRole => {
          // if one docRole authorizes the field, then fieldAuthorized = true
          if (doc[docRole] && fieldContainsUserId(doc[docRole], me._id)){
            fieldAuthorized = true;
          }
        });
        if (!fieldAuthorized && doc[field]){
          delete doc[field];
          logger.debug(`with role "${role}" field "${field}" removed from document id "${doc._id}". No authorization.`);
        }
        authorizedResult.push(doc);
      });
      return authorizedResult;
    }

    // if the result was a document
    if (_.isObject(result)){
      // check with all docRoles
      let fieldAuthorized = false;
      docRoles.every(docRole => {
        // if one docRole authorizes the field, then fieldAuthorized = true
        if (result[docRole] && fieldContainsUserId(result[docRole], me._id)){
          fieldAuthorized = true;
        }
      });
      if (!fieldAuthorized && result[field]){
        delete result[field];
        logger.debug(`with role "${role}" field "${field}" removed from document id "${result._id}". No authorization.`);
      }
      return result;
    }

  }

  // not authorized to access field
  if (result[field]){
    delete result[field];
    logger.debug(`with role "${role}" field "${field}" removed from document id "${result._id}". No authorization.`);
  }
  return result;
}

// creates an authQuery object with additional query arguments, to implement authorization restrictions for mongodb access
export function queryForRoles(me = {}, userRoles = [], docRoles = [], { User }, logger) {
  const role = User.authRole(me);

  // Build query for the case: The logged in user's role is authorized
  if (roleAuthorizedForDoc(me, userRoles, docRoles, { User }, logger)) {
    return {};  // empty authQuery means, do operation with no access restrictions
  }

  // Build query for the case: The user is listed in any document field
  const query = { $or: [] };
  if (loggedIn(me)){
    docRoles.forEach(docRole => query.$or.push( { [docRole]: me._id } ) );
    logger.debug(`and role: "${role ? role : '<no-role>'}" with \nauthQuery: ${JSON.stringify(query, null, 2)}`);
    if (query.$or.length > 0) return query;
  }

  // Not Authorized
  const message = `and role: "${role}" is not authorized.`;
  logger.error(message);
}

// returns true, if the user's role is authorized for a document
export function roleAuthorizedForDoc(me = {}, userRoles = [], docRoles = [], { User }, logger){
  const role = User.authRole(me);

  if ( userRoles.includes('world') || role && userRoles.length > 0 && userRoles.includes(role) ) {
    logger.debug(`and role "${role ? role : '<no-role>'}" is authorized`);
    return true;
  }

  return false;
}

// returns true, if a field of type array/object/string contains the userId
export function fieldContainsUserId(docRoleField, userId) {
  let found = false;

  // empty userId is not a valid userId
  if (userId.toString() === '') return false;

  // handle a simple id field
  if (docRoleField.toString() === userId.toString()){
    return true;
  }

  // handle an array
  if (_.isArray(docRoleField)){
    docRoleField.every(field => {
       if (fieldContainsUserId(field, userId)) {
        found = true;
        return true;
       }
    });
    if (found) return true;
  }

  // handle an object
  if (_.isObject(docRoleField)){
    Object.keys(docRoleField).every(field => {

      // handle a field
      if (docRoleField[field] && docRoleField[field].toString() === userId.toString()){
        found = true;
        return true;
      }

      // handle an array
      if (_.isArray(docRoleField[field])){
        docRoleField[field].every(innerField  => {
           if (fieldContainsUserId(innerField, userId)) {
            found = true;
            return true;
           }
        })
        if (found) return true;
      }

      // handle an object 
      if (_.isObject(docRoleField[field])){
        Object.keys(docRoleField[field]).every(innerField => {
           if (fieldContainsUserId(docRoleField[field][innerField], userId)) {
            found = true;
            return true;
           }
        });
        if (found) return true;
      }

    });

  }
  return found;
}
