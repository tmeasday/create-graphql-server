 import _ from 'lodash';
 import log from './logger';

/**
 * @class Authorize
 * adding Authorize to the context
 **/
export default class Authorize {
  constructor(context){
    this.context = context;
  }

  /**
   * Returns an array of records, indexed by ids
   * @params {object} collection
   * @params {array} ids
   * @params {object} authQuery
   * @return {boolean} loggedIn
   **/
  findByIdsWithAuth(collection, ids, authQuery) {
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

  /**
   * Returns true, if user is loggedIn
   * @params {object} user
   * @return {boolean} loggedIn
   **/
  loggedIn(user) {
    if(user && user._id && user._id.toString() !== '') {
      return true;
    }
    return false;
  }

  // for compatibility reasons old document authorizer...
  authorized({doc, mode, user, resolver}){
    log.debug(`user "${(user && user.username) ? user.username : '<no-user>'}" authorized to ${mode} ${resolver} with doc "${(doc && doc._id) ? doc._id : '<no-doc>'}"`);
    return doc;
  }

  authorizedFields({doc, mode, user, resolver}){
    return doc;
  }

  /**
   * Returns a query object for the selection
   * sets default values in the interface
   * @params {object} user, the signed in or unknown user
   * @params {array} userRoles, the role of the user, default '<no-role>'
   * @params {array} docRoles, the document owner fields of type: User
   * @params {object} context, access to the User model methods
   * @return {object} query-selection-object
   **/
  //queryForRoles(user, userRoles, docRoles, { User }) {
  queryForRoles(user, userRoles = [], docRoles = [], { User }) {
    
    // Authorized by userRoles
    const role = User.authRole(user);
    if (userRoles.includes(role)) {
      return {};
    }

    // Authorized by docRoles
    const query = { $or: [] };
    if (docRoles.length > 0){
      docRoles.forEach(docRole => query.$or.push( { [docRole]: user._id } ));
      return query;
    }

    // Not Authorized
    return false;
  }

  userForDoc(_user, docRoles, doc){
    const newDoc = Object.assign({}, doc);
    let authorized = false;
    docRoles.forEach(docRole => {
      // user logged in and
      // role field in doc exists and
      // includes the current user
      // includes works for String and Array
      if (
           this.loggedIn(_user) && newDoc[docRole] &&
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

}
