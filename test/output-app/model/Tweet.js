import log from '../server/logger';
import DataLoader from 'dataloader';
import { findByIds, queryForRoles, fieldForRoles, fieldContainsUserId, authorizedFields, authlog } from '../server/authorize';

export default class Tweet {
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('tweet');
    this.pubsub = context.pubsub;
    const { me, User } = context;
    let authQuery;
    try {
      authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User }, authlog('tweet findOneLoader', 'readOne', me));
    } catch (err) { 
      log.error(err.message);
      authQuery = {_id: false};
    }
    this.unauthorizedLoader = new DataLoader(ids => findByIds(this.collection, ids));
    this.authorizedLoader = new DataLoader(ids => findByIds(this.collection, ids, authQuery));
  }

  // used from server calls, without authorization checks, NOT for use in resolvers
  async findOneById(id, me = {}, resolver = 'tweet findOneById') {
    try {
      return await this.unauthorizedLoader.load(id);
    } catch (err) { log.error(err.message); }
  }

  // used for api calls, with authorization checks, for use in resolvers
  async getOneById(id, me = {}, resolver = 'tweet getOneById') {
    try {
      const result = await this.authorizedLoader.load(id);
      return result;
    } catch (err) { log.error(err.message); }
  }

  all({ lastCreatedAt = 0, limit = 10 }, me, resolver = 'tweet all') {
    try {
      const baseQuery = { createdAt: { $gt: lastCreatedAt } };
      const authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err){ log.error(err.message); }
  }

  author(tweet, me, resolver = 'tweet author') {
    return this.context.User.getOneById(tweet.authorId, me, resolver);
  }

  createdBy(tweet, me, resolver = 'tweet createdBy') {
    return this.context.User.getOneById(tweet.createdById, me, resolver);
  }

  updatedBy(tweet, me, resolver = 'tweet updatedBy') {
    return this.context.User.getOneById(tweet.updatedById, me, resolver);
  }

  coauthors(tweet, { lastCreatedAt = 0, limit = 10 }, me, resolver = 'tweet coauthors') {
    try {
      const baseQuery = {_id: { $in: tweet.coauthorsIds }, createdAt: { $gt: lastCreatedAt } };
      const authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err){ log.error(err.message); }
  }

  likers(tweet, { lastCreatedAt = 0, limit = 10 }, me, resolver = 'tweet likers') {
    try {
      const baseQuery = {likedIds: tweet._id, createdAt: { $gt: lastCreatedAt } };
      const authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err){ log.error(err.message); }
  }

  async insert(doc, me, resolver = 'insert tweet') {
    try {
      let insertedDoc = null;
      let docToInsert = Object.assign({}, doc, {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdById: (me && me._id) ? me._id : 'unknown',
          updatedById: (me && me._id) ? me._id : 'unknown',
      });

      const authQuery = queryForRoles(me, ['admin'], ['authorId'], { User: this.context.User }, authlog(resolver, 'create', me));

      const docRoleFields = ['authorId'].map(key => ({ [key]: docToInsert[key] }) );
      if (Object.keys(authQuery).length > 0 && !fieldContainsUserId(docRoleFields, me._id)) {
        throw new Error('Not authorized to insert tweet');
      }

      const id = (await this.collection.insertOne(docToInsert)).insertedId;
      if (!id) {
        log.error('insert tweet failed for docToInsert:', JSON.stringify(docToInsert, null, 2));
        throw new Error(`insert tweet not possible for  ${id}.`);
      }

      log.debug(`inserted tweet ${id}.`);
      insertedDoc = this.getOneById(id, me, 'pubsub tweetInserted');
      this.pubsub.publish('tweetInserted', insertedDoc);
      return insertedDoc;

    } catch (err){ log.error(err.message); }
  }

  async updateById(id, doc, me, resolver = 'update tweet') {
    try {
      let updatedDoc = null;
      const docBefore = await this.getOneById(id, me, 'tweet getOneById in updateById for docBefore');
      let docToUpdate = {$set: Object.assign({}, doc, {
            updatedAt: Date.now(),
            updatedById: (me && me._id) ? me._id : 'unknown',
      })};

      const baseQuery = {_id: id};
      const authQuery = queryForRoles(me, ['admin'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'update', me));

      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.updateOne(finalQuery, docToUpdate);
      if (result.result.ok !== 1 || result.result.n !== 1){
        log.error(`update tweet failed finalQuery:`, JSON.stringify(finalQuery, null, 2));
        log.error('update tweet failed for docToUpdate:', JSON.stringify(docToUpdate, null, 2));
        throw new Error(`update tweet not possible for ${id}.`);
      }

      log.debug(`updated tweet ${id}.`);
      this.unauthorizedLoader.clear(id);
      this.authorizedLoader.clear(id);

      updatedDoc = this.getOneById(id, me, 'pubsub tweetUpdated');
      this.pubsub.publish('tweetUpdated', updatedDoc);
      return updatedDoc;

    } catch (err){ log.error(err.message); }
  }

  async removeById(id, me, resolver = 'remove tweet') {
    try {
      const docBefore = this.getOneById(id, me, 'tweet getOneById in removeById for docBefore');
      const baseQuery = {_id: id};
      const authQuery = queryForRoles(me, ['admin'], ['authorId'], { User: this.context.User }, authlog(resolver, 'delete', me));
      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.remove(finalQuery);

      if (result.result.ok !== 1 || result.result.n !== 1){
        log.error(`remove tweet failed for finalQuery:`, JSON.stringify(finalQuery, null, 2));
        throw new Error(`remove tweet not possible for ${id}.`);
      }

      log.debug(`removed tweet ${id}.`);
      this.unauthorizedLoader.clear(id);
      this.authorizedLoader.clear(id);

      this.pubsub.publish('tweetRemoved', id);
      return result;

    } catch (err){ log.error(err.message); }
  }
}
