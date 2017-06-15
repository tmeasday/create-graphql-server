import log from '../server/logger';
import DataLoader from 'dataloader';
import { findByIds, queryForRoles } from '../server/authorize';

export default class Tweet {
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('tweet');
    this.pubsub = context.pubsub;
    this.loader = new DataLoader((ids, authQuery = {}) => findByIds(this.collection, ids, authQuery));
    this.auth = {
      type: 'Tweet',
      userRoles: {
        create: ['admin'],
        read: ['admin', 'world'],
        readOne: ['admin', 'world'],
        readMany: ['admin', 'world'],
        update: ['admin'],
        delete: ['admin'],
      },
      docRoles: {
        create: ['authorId'],
        read: ['authorId', 'coauthorsIds'],
        readOne: ['authorId', 'coauthorsIds'],
        readMany: ['authorId', 'coauthorsIds'],
        update: ['authorId', 'coauthorsIds'],
        delete: ['authorId'],
      },
    }
  }

  findOneById(id) {
    return this.loader.load(id);
  }

  getOneById(id, _user = {}, resolver = 'getOneById') {
    const authQuery = queryForRoles(_user, this.auth, 'readOne', { User: this.context.User }, {_id: id}, resolver);
    return this.loader.load(id, authQuery);
  }

  all({ lastCreatedAt = 0, limit = 10 }, _user, resolver = 'all') {
    const baseQuery = { createdAt: { $gt: lastCreatedAt } };
    const authQuery = queryForRoles(_user, this.auth, 'readMany', { User: this.context.User }, {_id: 'all'}, resolver);
    const finalQuery = {...baseQuery, ...authQuery};
    return this.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  author(tweet, _user, resolver = 'author') {
    return this.context.User.getOneById(tweet.authorId, _user, resolver);
  }

  createdBy(tweet, _user, resolver = 'createdBy') {
    return this.context.User.getOneById(tweet.createdById, _user, resolver);
  }

  updatedBy(tweet, _user, resolver = 'updatedBy') {
    return this.context.User.getOneById(tweet.updatedById, _user, resolver);
  }

  coauthors(tweet, { lastCreatedAt = 0, limit = 10 }, _user, resolver = 'coauthors') {
    const baseQuery = {_id: { $in: tweet.coauthorsIds }, createdAt: { $gt: lastCreatedAt } };
    const authQuery = queryForRoles(_user, this.context.User.auth, 'readMany', { User: this.context.User }, {_id: 'all'}, resolver);
    const finalQuery = {...baseQuery, ...authQuery};
    return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  likers(tweet, { lastCreatedAt = 0, limit = 10 }, _user, resolver = 'likers') {
    const baseQuery = {likedIds: tweet._id, createdAt: { $gt: lastCreatedAt } };
    const authQuery = queryForRoles(_user, this.context.User.auth, 'readMany', { User: this.context.User }, {_id: 'all'}, resolver);
    const finalQuery = {...baseQuery, ...authQuery};
    return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  async insert(doc, _user, resolver = 'insert') {
    let docToInsert = Object.assign({}, doc, {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdById: (_user && _user._id) ? _user._id : 'unknown',
        updatedById: (_user && _user._id) ? _user._id : 'unknown',
    });

    const authQuery = queryForRoles(_user, this.auth, 'create', { User: this.context.User }, {_id: '<new>', ...docToInsert}, resolver);
    const id = (await this.collection.insertOne(docToInsert)).insertedId;
    
    if (id){
      log.debug(`inserted ${this.type} ${id}.`);
    } else {
      log.debug('insert failed for docToInsert:', JSON.stringify(docToInsert, null, 2));
      throw new Error(`insert not possible for ${this.type} ${id}.`);
    }

    this.pubsub.publish('tweetInserted', await this.getOneById(id, _user, 'pubsub tweetInserted'));
    return id;
  }

  async updateById(id, doc, _user, resolver = 'updateById') {
    // must get the record first, to capture all authorization relevant fields
    const docBefore = await this.getOneById(id, _user, 'getOneById in updateById for docBefore');
    let docToUpdate = {$set: Object.assign({}, doc, {
          updatedAt: Date.now(),
          updatedById: (_user && _user._id) ? _user._id : 'unknown',
    })};

    const baseQuery = {_id: id};
    const authQuery = queryForRoles(_user, this.auth, 'update', { User: this.context.User }, {...docBefore, ...docToUpdate}, resolver);
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
    this.pubsub.publish('tweetUpdated', await this.getOneById(id, _user, 'pubsub tweetUpdated'));
    return result;
  }

  async removeById(id, _user, resolver = 'removeById') {
    // must get the record first, to capture all authorization relevant fields
    const docBefore = await this.getOneById(id, _user, 'getOneById in removeById for docBefore');
    const baseQuery = {_id: id};
    const authQuery = queryForRoles(_user, this.auth, 'delete', { User: this.context.User }, {...docBefore}, resolver);
    const finalQuery = {...baseQuery, ...authQuery};
    const result = await this.collection.remove(finalQuery);

    if (result.result.ok === 1 && result.result.n === 1){
      log.info(`removed ${this.type} ${id}.`);
    } else {
      log.debug(`remove failed for finalQuery:`, JSON.stringify(finalQuery, null, 2));
      throw new Error(`remove not possible for ${this.type} ${id}.`);
    }

    this.loader.clear(id);
    this.pubsub.publish('tweetRemoved', id);
    return result;
  }
}
