import log from '../server/logger';
import DataLoader from 'dataloader';
import { findByIds, queryForRoles, fieldForRoles, fieldContainsUserId, authorizedFields, authlog } from '../server/authorize';

export default class User {
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('user');
    this.pubsub = context.pubsub;
    const { me } = context;
    this.authRole = User.authRole; // otherwise not accessible in queryForRoles
    let authQuery;
    try {
      authQuery = queryForRoles(me, ['admin'], ['_id'], { User }, authlog('user findOneLoader', 'readOne', me));
    } catch (err) { 
      log.error(err.message);
      authQuery = {_id: false};
    }
    this.unauthorizedLoader = new DataLoader(ids => findByIds(this.collection, ids));
    this.authorizedLoader = new DataLoader(ids => findByIds(this.collection, ids, authQuery));
  }

  // returns the role of the user
  static authRole(user){
    return (user && user.role) ? user.role : null;
  }

  // used from server calls, without authorization checks, NOT for use in resolvers
  async findOneById(id, me = {}, resolver = 'user findOneById') {
    try {
      return await this.unauthorizedLoader.load(id);
    } catch (err) { log.error(err.message); }
  }

  // used for api calls, with authorization checks, for use in resolvers
  async getOneById(id, me = {}, resolver = 'user getOneById') {
    try {
      const result = await this.authorizedLoader.load(id);
      // role: @authorize(admin: ["create", "read", "update", "delete"], this: ["readOne"]) 
      //                  =====             ======                       ====    =======
      return authorizedFields(result, 'role', me, ['admin'], ['_id'], { User: this.context.User }, authlog(resolver + 'field "role"', 'readOne', me));
    } catch (err) { log.error(err.message); }
  }

  all({ lastCreatedAt = 0, limit = 10 }, me, resolver = 'user all') {
    try { 
      const baseQuery = { createdAt: { $gt: lastCreatedAt } };
      const authQuery = queryForRoles(me, ['admin'], [], { User: this.context.User }, authlog(resolver, 'readMany', me));
      // role: @authorize(admin: ["create", "read", "update", "delete"], this: ["readOne"]) 
      //                  =====             ======                      
      let authFields = {};
      authFields = fieldForRoles(authFields, 'role', me, ['admin'], [], { User: this.context.User }, authlog(resolver + 'field "role"', 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.collection.find(finalQuery).sort({ createdAt: 1 }).project(authFields).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  tweets(user, { minLikes, lastCreatedAt = 0, limit = 10 }, me, resolver = 'user tweets') {
    try {
      const baseQuery = {
        authorId: user._id,
        createdAt: { $gt: lastCreatedAt },
      };
      const authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.Tweet.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  liked(user, { lastCreatedAt = 0, limit = 10 }, me, resolver = 'user liked') {
    try {
      const baseQuery = {
        _id: { $in: user.likedIds },
        createdAt: { $gt: lastCreatedAt },
      };
      const authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.Tweet.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  following(user, { lastCreatedAt = 0, limit = 10 }, me, resolver = 'user following') {
    try {
      const baseQuery = {
        _id: { $in: user.followingIds || [] },
        createdAt: { $gt: lastCreatedAt },
      };
      const authQuery = queryForRoles(me, ['admin'], [], { User: this.context.User }, authlog(resolver, 'readMany', me));
      // role: @authorize(admin: ["create", "read", "update", "delete"], this: ["readOne"]) 
      //                                    ======
      let authFields = {};
      authFields = fieldForRoles(authFields, 'role', me, ['admin'], [], { User: this.context.User }, authlog(resolver + 'field "role"', 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).project(authFields).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  followers(user, { lastCreatedAt = 0, limit = 10 }, me, resolver = 'user followers') {
    try {
      const baseQuery = {
        followingIds: user._id,
        createdAt: { $gt: lastCreatedAt },
      };
      const authQuery = queryForRoles(me, ['admin'], [], { User: this.context.User }, authlog(resolver, 'readMany', me));
      // role: @authorize(admin: ["create", "read", "update", "delete"], this: ["readOne"]) 
      //                                    ======
      let authFields = {};
      authFields = fieldForRoles(authFields, 'role', me, ['admin'], [], { User: this.context.User }, authlog(resolver + 'field "role"', 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).project(authFields).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  createdBy(user, me, resolver = 'user createdBy') {
    return this.context.User.getOneById(user.createdById, me, resolver);
  }

  updatedBy(user, me, resolver = 'user updatedBy') {
    return this.context.User.getOneById(user.updatedById, me, resolver);
  }

  async insert(doc, me, resolver = 'insert user') {
    try {
      let insertedDoc = null;
      let docToInsert = Object.assign({}, doc, {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdById: (me && me._id) ? me._id : 'unknown',
        updatedById: (me && me._id) ? me._id : 'unknown',
      });

      const authQuery = queryForRoles(me, ['admin'], [], { User: this.context.User }, authlog(resolver, 'create', me));
      // role: @authorize(admin: ["create", "read", "update", "delete"], this: ["readOne"]) 
      //                  =====    ======
      docToInsert = authorizedFields(docToInsert, 'role', me, ['admin'], [], { User: this.context.User }, authlog(resolver + 'field "role"', 'create', me));
      
      const id = (await this.collection.insertOne(docToInsert)).insertedId;
      if (!id) {
        log.error('insert user failed for:', JSON.stringify(docToInsert, null, 2));
        throw new Error(`insert user not possible for user ${id}.`);
      }

      log.debug(`inserted user ${id}.`);
      insertedDoc = this.getOneById(id, me, 'pubsub userInserted');
      this.pubsub.publish('userInserted', insertedDoc);
      return insertedDoc;

    } catch (err) { log.error(err.message); }
  }

  async updateById(id, doc, me, resolver = 'update user') {
    try {
      let updatedDoc = null;
      const docBefore = await this.findOneById(id, me, 'user findOneById in updateById for docBefore');
      let docToUpdate = {$set: Object.assign({}, doc, {
            updatedAt: Date.now(),
            updatedById: (me && me._id) ? me._id : 'unknown',
      })};

      const baseQuery = {_id: id};
      const authQuery = queryForRoles(me, ['admin'], ['_id'], { User: this.context.User }, authlog(resolver, 'update', me));
      // role: @authorize(admin: ["create", "read", "update", "delete"], this: ["readOne"]) 
      //                  =====                      ======
      docToUpdate.$set = authorizedFields(docToUpdate.$set, 'role', me, ['admin'], [], { User: this.context.User }, authlog(resolver + 'field "role"', 'update', me));

      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.updateOne(finalQuery, docToUpdate);
      if (result.result.ok !== 1){
        log.error(`update user failed finalQuery:`, JSON.stringify(finalQuery, null, 2));
        log.error('update user failed for docToUpdate:', JSON.stringify(docToUpdate, null, 2));
        throw new Error(`update user not possible for ${id}.`);
      }

      log.debug(`updated user ${id}.`);
      this.unauthorizedLoader.clear(id);
      this.authorizedLoader.clear(id);

      updatedDoc = this.getOneById(id, me, 'pubsub userUpdated')
      this.pubsub.publish('userUpdated', updatedDoc);
      return updatedDoc;

    } catch (err) { log.error(err.message); }
  }

  async removeById(id, me, resolver = 'remove user') {
    try {
      const docBefore = await this.findOneById(id, me, 'user findOneById in removeById for docBefore');
      const baseQuery = {_id: id};
      const authQuery = queryForRoles(me, ['admin'], ['_id'], { User: this.context.User }, authlog(resolver, 'delete', me));
      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.remove(finalQuery);
      if (result.result.ok !== 1 || result.result.n !== 1){
        log.error(`remove user failed for finalQuery:`, JSON.stringify(finalQuery, null, 2));
        throw new Error(`remove user not possible for ${id}.`);
      }

      log.debug(`removed user ${id}.`);
      this.unauthorizedLoader.clear(id);
      this.authorizedLoader.clear(id);

      this.pubsub.publish('userRemoved', id);
      return result;

    } catch (err) { log.error(err.message); }
  }
}
