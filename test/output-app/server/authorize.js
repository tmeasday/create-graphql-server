import _ from 'lodash';
import log from '../server/logger';

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
export function loggedIn(user) {
  if(user && user._id && user._id.toString() !== '') {
    return true;
  }
  return false;
}

// creates an authQuery object with additional query arguments, to implement authorization restrictions for mongodb access
export function queryForRoles(user = {}, userRoles = [], docRoles = [], mode = '', { User }, resolver = '') {

  // Build query for the case: The logged in user's role is authorized
  if (roleAuthorizedForDoc(user, userRoles, docRoles, mode, { User }, resolver)) {
    return {};  // empty authQuery means, do operation with no access restrictions
  }

  // Build query for the case: The user is listed in any document field
  const query = { $or: [] };
  if (loggedIn(user)){
    docRoles.forEach(docRole => query.$or.push( { [docRole]: user._id } ) );
    log.debug('authQuery:', JSON.stringify(query, null, 2));
    if (query.$or.length > 0) return query;
  }

  // Not Authorized
  throw new Error(`Authorization: Not authorized to ${mode} in ${resolver}.`); 
}

// returns true, if the user's role is authorized for a document
export function roleAuthorizedForDoc(user = {}, userRoles = [], docRoles = [], mode = '', { User }, resolver = ''){
  const role = User.authRole(user);

  if ( userRoles.includes('world') || role && role !== '' && role !== '<no-role>' && userRoles.length > 0 && userRoles.includes(role) ) {
    log.debug(`${resolver} ${mode} with user ${user.username ? user.username : '<no-user>'} is authorized`);
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
