import log from '../server/logger';
import DataLoader from 'dataloader';
import { findByIds, queryForRoles, fieldContainsUserId } from '../server/authorize';

export default class User {
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('user');
    this.pubsub = context.pubsub;
    this._user = {};
    this.loaders = (_user = {}, resolver = '') => ({
      readOneWithoutAuth: new DataLoader(ids => new Promise( async (resolve, reject) => {
        try {
          const result = await findByIds(this.collection, ids, {});
          resolve(result);
        } catch (err) { reject(err); }
      })),
      readOne: new DataLoader(ids => new Promise( async (resolve, reject) => {
        try {
          const authQuery = queryForRoles(_user, ['admin'], ['_id'], 'readOne', { User: this.context.User }, resolver);
          const result = await findByIds(this.collection, ids, authQuery);
          resolve(result);
        } catch (err) { reject(err); }
      })),
      // readMany: new DataLoader(ids => new Promise( async (resolve, reject) => {
      //   try { 
      //     const authQuery = queryForRoles(_user, ['admin'], [], 'readMany', { User: this.context.User }, resolver);
      //     const result = await findByIds(this.collection, ids, authQuery);
      //     resolve(result);
      //   } catch (err) { reject(err); }
      // })),
    });
  }

  authRole(user){
    return (user && user.role) ? user.role : '<no-role>';
  }

  // used from server calls, without authorization checks, NOT for use in resolvers
  async findOneById(id, _user = {}, resolver = 'user findOneById') {
    try {
      const result = await this.loaders(_user, resolver).readOneWithoutAuth.load(id);
      return result;
    } catch (err) { log.error(err.message); }
  }

  // used for api calls, with authorization checks, for use in resolvers
  async getOneById(id, _user = {}, resolver = 'user getOneById') {
    try {
      const result = await this.loaders(_user, resolver).readOne.load(id);
      return result;
    } catch (err) { log.error(err.message); }
  }

  all({ lastCreatedAt = 0, limit = 10 }, _user, resolver = 'user all') {
    try { 
      const baseQuery = { createdAt: { $gt: lastCreatedAt } };
      const authQuery = queryForRoles(_user, ['admin'], [], 'readMany', { User: this.context.User }, resolver);
      const restrictedFields = (Object.keys(authQuery).length === 0) ? {} : { role: 0 };
      const finalQuery = {...baseQuery, ...authQuery};
      return this.collection.find(finalQuery).sort({ createdAt: 1 }).project(restrictedFields).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  tweets(user, { minLikes, lastCreatedAt = 0, limit = 10 }, _user, resolver = 'user tweets') {
    try {
      const baseQuery = {
        authorId: user._id,
        createdAt: { $gt: lastCreatedAt },
      };
      const authQuery = queryForRoles(_user, ['admin', 'world'], ['authorId', 'coauthorsIds'], 'readMany', { User: this.context.User }, resolver);
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.Tweet.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  liked(user, { lastCreatedAt = 0, limit = 10 }, _user, resolver = 'user liked') {
    try {
      const baseQuery = {
        _id: { $in: user.likedIds },
        createdAt: { $gt: lastCreatedAt },
      };
      const authQuery = queryForRoles(_user, ['admin', 'world'], ['authorId', 'coauthorsIds'], 'readMany', { User: this.context.User }, resolver);
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.Tweet.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  following(user, { lastCreatedAt = 0, limit = 10 }, _user, resolver = 'user following') {
    try {
      const baseQuery = {
        _id: { $in: user.followingIds || [] },
        createdAt: { $gt: lastCreatedAt },
      };
      const authQuery = queryForRoles(_user, ['admin'], [], 'readMany', { User: this.context.User }, resolver);
      const restrictedFields = (Object.keys(authQuery).length === 0) ? {} : { role: 0 };
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).project(restrictedFields).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  followers(user, { lastCreatedAt = 0, limit = 10 }, _user, resolver = 'user followers') {
    try {
      const baseQuery = {
        followingIds: user._id,
        createdAt: { $gt: lastCreatedAt },
      };
      const authQuery = queryForRoles(_user, ['admin'], [], 'readMany', { User: this.context.User }, resolver);
      const restrictedFields = (Object.keys(authQuery).length === 0) ? {} : { role: 0 };
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).project(restrictedFields).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  createdBy(user, _user, resolver = 'user createdBy') {
    return this.context.User.getOneById(user.createdById, _user, resolver);
  }

  updatedBy(user, _user, resolver = 'user updatedBy') {
    return this.context.User.getOneById(user.updatedById, _user, resolver);
  }

  async insert(doc, _user, resolver = 'insert user') {
    try {
      let insertedDoc = null;
      let docToInsert = Object.assign({}, doc, {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdById: (_user && _user._id) ? _user._id : 'unknown',
        updatedById: (_user && _user._id) ? _user._id : 'unknown',
      });

      const authQuery = queryForRoles(_user, ['admin'], [], 'create', { User: this.context.User }, resolver);

      const docRoleFields = [].map(key => ({ [key]: docToInsert[key] }) );
      if (Object.keys(authQuery).length > 0 && !fieldContainsUserId(docRoleFields, _user._id)) {
        throw new Error('Not authorized to insert user');
      }
      
      const id = (await this.collection.insertOne(docToInsert)).insertedId;
      if (!id) {
        log.error('insert user failed for:', JSON.stringify(docToInsert, null, 2));
        throw new Error(`insert user not possible for user ${id}.`);
      }

      log.debug(`inserted user ${id}.`);
      insertedDoc = this.getOneById(id, _user, 'pubsub userInserted');
      this.pubsub.publish('userInserted', insertedDoc);
      return insertedDoc;

    } catch (err) { log.error(err.message); }
  }

  async updateById(id, doc, _user, resolver = 'update user') {
    try {
      let updatedDoc = null;
      const docBefore = await this.findOneById(id, _user, 'user findOneById in updateById for docBefore');
      let docToUpdate = {$set: Object.assign({}, doc, {
            updatedAt: Date.now(),
            updatedById: (_user && _user._id) ? _user._id : 'unknown',
      })};

      const baseQuery = {_id: id};
      const authQuery = queryForRoles(_user, ['admin'], ['_id'], 'update', { User: this.context.User }, resolver);

      if (doc['role'] && Object.keys(authQuery).length > 0) {
        throw new Error('Not authorized to update field "role"');
      }

      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.updateOne(finalQuery, docToUpdate);
      if (result.result.ok !== 1){
        log.error(`update user failed finalQuery:`, JSON.stringify(finalQuery, null, 2));
        log.error('update user failed for docToUpdate:', JSON.stringify(docToUpdate, null, 2));
        throw new Error(`update user not possible for ${id}.`);
      }

      log.debug(`updated user ${id}.`);
      this.loaders().readOneWithoutAuth.clear(id);
      this.loaders().readOne.clear(id);
      // this.loaders().readMany.clear(id);

      updatedDoc = this.getOneById(id, _user, 'pubsub userUpdated')
      this.pubsub.publish('userUpdated', updatedDoc);
      return updatedDoc;

    } catch (err) { log.error(err.message); }
  }

  async removeById(id, _user, resolver = 'remove user') {
    try {
      const docBefore = await this.findOneById(id, _user, 'user findOneById in removeById for docBefore');
      const baseQuery = {_id: id};
      const authQuery = queryForRoles(_user, ['admin'], ['_id'], 'delete', { User: this.context.User }, resolver);
      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.remove(finalQuery);
      if (result.result.ok !== 1 || result.result.n !== 1){
        log.error(`remove user failed for finalQuery:`, JSON.stringify(finalQuery, null, 2));
        throw new Error(`remove user not possible for ${id}.`);
      }

      log.debug(`removed user ${id}.`);
      this.loaders().readOneWithoutAuth.clear(id);
      this.loaders().readOne.clear(id);
      // this.loaders().readMany.clear(id);

      this.pubsub.publish('userRemoved', id);
      return result;

    } catch (err) { log.error(err.message); }
  }
}
