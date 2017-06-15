import log from '../server/logger';
import DataLoader from 'dataloader';
import { auth, findByIds, queryForRoles } from '../authorizations';

export default class User {
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('user');
    this.pubsub = context.pubsub;
    this.loader = new DataLoader((ids, authQuery = {}) => findByIds(this.collection, ids, authQuery));
    this.type = 'User';
  }

  authRole(user){
    return (user && user.role) ? user.role : '<no-role>';
  }

  findOneById(id) {
    return this.loader.load(id);
  }

  getOneById(id, _user = {}, resolver = '') {
    const authQuery = queryForRoles(_user, auth, this.type, 'readOne', { User: this.context.User }, {_id: id}, resolver);
    return this.loader.load(id, authQuery);
  }

  all({ lastCreatedAt = 0, limit = 10 }, _user, resolver = '') {
    const baseQuery = { createdAt: { $gt: lastCreatedAt } };
    const authQuery = queryForRoles(_user, auth, this.type, 'readMany', { User: this.context.User }, {_id: 'all'}, resolver);
    const finalQuery = {...baseQuery, ...authQuery};
    return this.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  tweets(user, { minLikes, lastCreatedAt = 0, limit = 10 }, _user, resolver = 'tweets') {
    const baseQuery = {
      authorId: user._id,
      createdAt: { $gt: lastCreatedAt },
    };
    const authQuery = queryForRoles(_user, auth, this.type, 'readMany', { User: this.context.User }, {_id: 'all'}, resolver);
    const finalQuery = {...baseQuery, ...authQuery};
    return this.context.Tweet.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  liked(user, { lastCreatedAt = 0, limit = 10 }, _user, resolver = 'liked') {
    const baseQuery = {
      _id: { $in: user.likedIds },
      createdAt: { $gt: lastCreatedAt },
    };
    const authQuery = queryForRoles(_user, auth, this.type, 'readMany', { User: this.context.User }, {_id: 'all'}, resolver);
    const finalQuery = {...baseQuery, ...authQuery};
    return this.context.Tweet.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  following(user, { lastCreatedAt = 0, limit = 10 }, _user, resolver = 'following') {
    const baseQuery = {
      _id: { $in: user.followingIds || [] },
      createdAt: { $gt: lastCreatedAt },
    };
    const authQuery = queryForRoles(_user, auth, this.context.User.type, 'readMany', { User: this.context.User }, {_id: 'all'}, resolver);
    const finalQuery = {...baseQuery, ...authQuery};
    return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  followers(user, { lastCreatedAt = 0, limit = 10 }, _user, resolver = 'followers') {
    const baseQuery = {
      followingIds: user._id,
      createdAt: { $gt: lastCreatedAt },
    };
    const authQuery = queryForRoles(_user, auth, this.context.User.type, 'readMany', { User: this.context.User }, {_id: 'all'}, resolver);
    const finalQuery = {...baseQuery, ...authQuery};
    return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  createdBy(user, _user) {
    return this.context.User.getOneById(user.createdById, _user, 'createdBy');
  }

  updatedBy(user, _user) {
    return this.context.User.getOneById(user.updatedById, _user, 'updatedBy');
  }

  async insert(doc, _user) {
    let docToInsert = Object.assign({}, doc, {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdById: (_user && _user._id) ? _user._id : 'unknown',
      updatedById: (_user && _user._id) ? _user._id : 'unknown',
    });

    const authQuery = queryForRoles(_user, auth, this.type, 'create', { User: this.context.User }, {_id: '<new>', ...docToInsert}, 'insert');
    const id = (await this.collection.insertOne(docToInsert)).insertedId;

    if (id){
      log.debug(`inserted ${this.type} ${id}.`);
    } else {
      log.debug('insert failed for docToInsert:', JSON.stringify(docToInsert, null, 2));
      throw new Error(`insert not possible for ${this.type} ${id}.`);
    }

    this.pubsub.publish('userInserted', await this.getOneById(id, _user, 'pubsub userInserted'));
    return id;
  }

  async updateById(id, doc, _user) {
    // must get the record first, to capture all authorization relevant fields
    const docBefore = await this.getOneById(id, _user, 'getOneById in updateById for docBefore');
    let docToUpdate = {$set: Object.assign({}, doc, {
          updatedAt: Date.now(),
          updatedById: (_user && _user._id) ? _user._id : 'unknown',
    })};

    const baseQuery = {_id: id};
    const authQuery = queryForRoles(_user, auth, this.type, 'update', { User: this.context.User }, {...docBefore, ...docToUpdate}, 'updateById');
    const finalQuery = {...baseQuery, ...authQuery};
    const result = await this.collection.updateOne(finalQuery, docToUpdate);
    
    if (result.result.ok === 1 && result.result.n === 1){
      log.debug(`updated ${this.type} ${id}.`);
    } else {
      log.debug(`update failed finalQuery:`, JSON.stringify(finalQuery, null, 2));
      log.debug('update failed for docToUpdate:', JSON.stringify(docToUpdate, null, 2));
      throw new Error(`update not possible for ${this.type} ${id}.`);
    }

    this.loader.clear(id);
    this.pubsub.publish('userUpdated', await this.getOneById(id, _user, 'pubsub userUpdated'));
    return result;
  }

  async removeById(id, _user) {
    // must get the record first, to capture all authorization relevant fields
    const docBefore = await this.getOneById(id, _user, 'getOneById in removeById for docBefore');
    const baseQuery = {_id: id};
    const authQuery = queryForRoles(_user, auth, this.type, 'delete', { User: this.context.User }, {...docBefore}, 'removeById');
    const finalQuery = {...baseQuery, ...authQuery};
    const result = await this.collection.remove(finalQuery);

    if (result.result.ok === 1 && result.result.n === 1){
      log.info(`removed ${this.type} ${id}.`);
    } else {
      log.debug(`remove failed for finalQuery:`, JSON.stringify(finalQuery, null, 2));
      throw new Error(`remove not possible for ${this.type} ${id}.`);
    }

    this.loader.clear(id);
    this.pubsub.publish('userRemoved', id);
    return result;
  }
}
