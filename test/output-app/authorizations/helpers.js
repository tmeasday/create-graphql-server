import _ from 'lodash';
import log from '../server/logger';

export function findByIds(collection, ids, authQuery) {
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

export function loggedIn(user) {
  if(user && user._id && user._id.toString() !== '') {
    return true;
  }
  return false;
}

export function queryForRoles(user, userRoles = [], docRoles = [], { User }) {
  // Authorized by userRoles
  const role = User.authRole(user);
  if (userRoles.includes(role) || userRoles.includes('world')) {
    return {};
  }
  // Authorized by docRoles
  const query = { $or: [] };
  if (docRoles.length > 0 && user && user._id){
    docRoles.forEach(docRole => query.$or.push( { [docRole]: user._id } ) );
    return query;
  }
  // Not Authorized
  return false;
}

export function userAuthorizedForDoc(_user, docRoles, doc){
  const newDoc = Object.assign({}, doc);
  let authorized = false;
  docRoles.forEach(docRole => {
    // user logged in and
    // role field in doc exists and
    // includes the current user
    // includes works for String and Array
    if (
         loggedIn(_user) && newDoc[docRole] &&
         ( 
           ( _.isArray(newDoc[docRole]) && newDoc[docRole].includes(_user._id.toString()) ) ||
           ( _.isObject(newDoc[docRole]) && newDoc[docRole].toString().includes(_user._id.toString()) )
         ) 
       ){
        authorized = true;
    }
  })
  return authorized;
}
