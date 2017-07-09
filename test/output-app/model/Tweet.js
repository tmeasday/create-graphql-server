import log from '../server/logger';
import DataLoader from 'dataloader';
import { findByIds, queryForRoles, fieldContainsUserId } from '../server/authorize';

export default class Tweet {
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('tweet');
    this.pubsub = context.pubsub;
    this.loaders = (_user = {}, resolver = '') => ({
      readOne: new DataLoader(ids => new Promise( async (resolve, reject) => {
        try {
          const authQuery = queryForRoles(_user, ['admin', 'world'], ['authorId', 'coauthorsIds'], 'readOne', { User: this.context.User }, resolver);
          const result = await findByIds(this.collection, ids, authQuery);
          resolve(result);
        } catch (err) { reject(err); }
      })),
      // readMany: new DataLoader(ids => new Promise( async (resolve, reject) => {
      //   try { 
      //     const authQuery = queryForRoles(_user, ['admin', 'world'], ['authorId', 'coauthorsIds'], 'readMany', { User: this.context.User }, resolver);
      //     const result = await findByIds(this.collection, ids, authQuery);
      //     resolve(result);
      //   } catch (err) { reject(err); }
      // })),
    });
  }

  async getOneById(id, _user = {}, resolver = 'tweet getOneById') {
    try {
      const result = await this.loaders(_user, resolver).readOne.load(id);
      return result;
    } catch (err) { log.error(err.message); }
  }

  all({ lastCreatedAt = 0, limit = 10 }, _user, resolver = 'tweet all') {
    try {
      const baseQuery = { createdAt: { $gt: lastCreatedAt } };
      const authQuery = queryForRoles(_user, ['admin', 'world'], ['authorId', 'coauthorsIds'], 'readMany', { User: this.context.User }, resolver);
      const finalQuery = {...baseQuery, ...authQuery};
      return this.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err){ log.error(err.message); }
  }

  author(tweet, _user, resolver = 'tweet author') {
    return this.context.User.getOneById(tweet.authorId, _user, resolver);
  }

  createdBy(tweet, _user, resolver = 'tweet createdBy') {
    return this.context.User.getOneById(tweet.createdById, _user, resolver);
  }

  updatedBy(tweet, _user, resolver = 'tweet updatedBy') {
    return this.context.User.getOneById(tweet.updatedById, _user, resolver);
  }

  coauthors(tweet, { lastCreatedAt = 0, limit = 10 }, _user, resolver = 'tweet coauthors') {
    try {
      const baseQuery = {_id: { $in: tweet.coauthorsIds }, createdAt: { $gt: lastCreatedAt } };
      const authQuery = queryForRoles(_user, ['admin', 'world'], ['authorId', 'coauthorsIds'], 'readMany', { User: this.context.User }, resolver);
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err){ log.error(err.message); }
  }

  likers(tweet, { lastCreatedAt = 0, limit = 10 }, _user, resolver = 'tweet likers') {
    try {
      const baseQuery = {likedIds: tweet._id, createdAt: { $gt: lastCreatedAt } };
      const authQuery = queryForRoles(_user, ['admin', 'world'], ['authorId', 'coauthorsIds'], 'readMany', { User: this.context.User }, resolver);
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err){ log.error(err.message); }
  }

  async insert(doc, _user, resolver = 'insert tweet') {
    try {
      let insertedDoc = null;
      let docToInsert = Object.assign({}, doc, {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdById: (_user && _user._id) ? _user._id : 'unknown',
          updatedById: (_user && _user._id) ? _user._id : 'unknown',
      });

      const authQuery = queryForRoles(_user, ['admin'], ['authorId'], 'create', { User: this.context.User }, resolver);

      const docRoleFields = ['authorId'].map(key => ({ [key]: docToInsert[key] }) );
      if (Object.keys(authQuery).length > 0 && !fieldContainsUserId(docRoleFields, _user._id)) {
        throw new Error('Not authorized to insert tweet');
      }

      const id = (await this.collection.insertOne(docToInsert)).insertedId;
      if (!id) {
        log.error('insert tweet failed for docToInsert:', JSON.stringify(docToInsert, null, 2));
        throw new Error(`insert tweet not possible for  ${id}.`);
      }

      log.debug(`inserted tweet ${id}.`);
      insertedDoc = this.getOneById(id, _user, 'pubsub tweetInserted');
      this.pubsub.publish('tweetInserted', insertedDoc);
      return insertedDoc;

    } catch (err){ log.error(err.message); }
  }

  async updateById(id, doc, _user, resolver = 'update tweet') {
    try {
      let updatedDoc = null;
      const docBefore = await this.getOneById(id, _user, 'tweet getOneById in updateById for docBefore');
      let docToUpdate = {$set: Object.assign({}, doc, {
            updatedAt: Date.now(),
            updatedById: (_user && _user._id) ? _user._id : 'unknown',
      })};

      const baseQuery = {_id: id};
      const authQuery = queryForRoles(_user, ['admin'], ['authorId', 'coauthorsIds'], 'update', { User: this.context.User }, resolver);

      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.updateOne(finalQuery, docToUpdate);
      if (result.result.ok !== 1 || result.result.n !== 1){
        log.error(`update tweet failed finalQuery:`, JSON.stringify(finalQuery, null, 2));
        log.error('update tweet failed for docToUpdate:', JSON.stringify(docToUpdate, null, 2));
        throw new Error(`update tweet not possible for ${id}.`);
      }

      log.debug(`updated tweet ${id}.`);
      this.loaders().readOne.clear(id);
      // this.loaders().readMany.clear(id);

      updatedDoc = this.getOneById(id, _user, 'pubsub tweetUpdated');
      this.pubsub.publish('tweetUpdated', updatedDoc);
      return updatedDoc;

    } catch (err){ log.error(err.message); }
  }

  async removeById(id, _user, resolver = 'remove tweet') {
    try {
      const docBefore = this.getOneById(id, _user, 'tweet getOneById in removeById for docBefore');
      const baseQuery = {_id: id};
      const authQuery = queryForRoles(_user, ['admin'], ['authorId'], 'delete', { User: this.context.User }, resolver);
      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.remove(finalQuery);

      if (result.result.ok !== 1 || result.result.n !== 1){
        log.error(`remove tweet failed for finalQuery:`, JSON.stringify(finalQuery, null, 2));
        throw new Error(`remove tweet not possible for ${id}.`);
      }

      log.debug(`removed tweet ${id}.`);
      this.loaders().readOne.clear(id);
      // this.loaders().readMany.clear(id);

      this.pubsub.publish('tweetRemoved', id);
      return result;

    } catch (err){ log.error(err.message); }
  }
}
