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

export function checkAuthDoc(doc, me, userRoles, docRoles, { User }, logger){
  const role = User.authRole(me);

  // check if userRole entitles current user for this action
  if (userRoleAuthorized(me, userRoles, { User }, logger)) {
    logger.debug(`and role: "${role}" is authorized by userRole.`);
    return doc;
  }

  // check if docRole entitles current user for this document and action
  let authorized = false;
  docRoles.every(field => {
    if (fieldContainsUserId(doc[field], me._id)){
      authorized = true;
    }
  })
  if (authorized) {
    logger.debug(`and role: "${role}" is authorized by docRole.`);
    return doc;
  }

  // Not Authorized
  logger.error(`and role: "${role}" is not authorized.`);
}

// returns true, if user is logged in
export function loggedIn(me) {
  if(me && me._id && me._id.toString() !== '') {
    return true;
  }
  return false;
}

// creates an authQuery object with additional query arguments, to implement authorization restrictions for mongodb access
export function queryForRoles(me = {}, userRoles = [], docRoles = [], { User }, logger) {
  const role = User.authRole(me);

  // Build query for the case: The logged in user's role is authorized
  if (userRoleAuthorized(me, userRoles, { User }, logger)) {
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
export function userRoleAuthorized(me = {}, userRoles = [], { User }, logger){
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
