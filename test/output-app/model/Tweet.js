import DataLoader from 'dataloader';
import { findByIds, queryForRoles, getLogFilename, logger, authlog, checkAuthDoc, protectFields } from 'create-graphql-server-authorization';
const log = logger(getLogFilename());

export default class Tweet {
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('tweet');
    this.pubsub = context.pubsub;
    const that = this;
    try {
      const { me, User } = context;
      const authQuery = queryForRoles(me, ['admin','world'], ['authorId','coauthorsIds'], { User }, authlog('tweet findOneById', 'readOne', me));
      that.authorizedLoader = new DataLoader(ids => findByIds(this.collection, ids, authQuery));
    } catch (err) { log.error(err.message); }
  }

  async findOneById(id, me, resolver) {
    try {
      if (!this.authorizedLoader) return null;
      return await this.authorizedLoader.load(id);
    } catch (err) { log.error(err.message); }
  }

  find({ lastCreatedAt = 0, limit = 10, baseQuery = {} }, me, resolver) {
    try {
      const authQuery = queryForRoles(me, ['admin','world'], ['authorId','coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery, createdAt: { $gt: lastCreatedAt } };
      return this.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  author(tweet, me, resolver) {
    return this.context.User.findOneById(tweet.authorId, me, resolver);
  }

  coauthors(tweet, { lastCreatedAt = 0, limit = 10 }, me, resolver) {
    const baseQuery = { _id: { $in: tweet.coauthorsIds || [] } };
    return this.context.User.find({ lastCreatedAt, limit, baseQuery }, me, resolver);
  }

  likers(tweet, { lastCreatedAt = 0, limit = 10 }, me, resolver) {
    const baseQuery = { likedIds: tweet._id };
    return this.context.User.find({ lastCreatedAt, limit, baseQuery }, me, resolver);
  }

  createdBy(tweet, me, resolver) {
    return this.context.User.findOneById(tweet.createdById, me, resolver);
  }

  updatedBy(tweet, me, resolver) {
    return this.context.User.findOneById(tweet.updatedById, me, resolver);
  }

  async insert(doc, me, resolver) {
    try {
      let docToInsert = Object.assign({}, doc, {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdById: (me && me._id) ? me._id : 'unknown',
        updatedById: (me && me._id) ? me._id : 'unknown',
      });
      checkAuthDoc(docToInsert, me, ['admin'], ['authorId'], { User: this.context.User }, authlog(resolver, 'create', me));
      const id = (await this.collection.insertOne(docToInsert)).insertedId;
      if (!id) {
        throw new Error(`insert tweet not possible.`);
      }
      log.debug(`inserted tweet ${id}.`);
      const insertedDoc = this.findOneById(id, me, 'pubsub tweetInserted');
      this.pubsub.publish('tweetInserted', insertedDoc);
      return insertedDoc;
    } catch (err) { log.error(err.message); }
  }

  async updateById(id, doc, me, resolver) {
    try {
      let docToUpdate = {$set: Object.assign({}, doc, {
            updatedAt: Date.now(),
            updatedById: (me && me._id) ? me._id : 'unknown',
      })};
      const baseQuery = {_id: id};
      const authQuery = queryForRoles(me, ['admin'], ['authorId','coauthorsIds'], { User: this.context.User }, authlog(resolver, 'update', me));
      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.updateOne(finalQuery, docToUpdate);
      if (result.result.ok !== 1 || result.result.n !== 1){
        throw new Error(`update tweet not possible for ${id}.`);
      }
      log.debug(`updated tweet ${id}.`);
      this.authorizedLoader.clear(id);
      const updatedDoc = this.findOneById(id, me, 'pubsub tweetUpdated');
      this.pubsub.publish('tweetUpdated', updatedDoc);
      return updatedDoc;
    } catch (err) { log.error(err.message); }
  }

  async removeById(id, me, resolver) {
    try {
      const baseQuery = {_id: id};
      const authQuery = queryForRoles(me, ['admin'], ['authorId'], { User: this.context.User }, authlog(resolver, 'delete', me));
      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.remove(finalQuery);
      if (result.result.ok !== 1 || result.result.n !== 1){
        throw new Error(`remove tweet not possible for ${id}.`);
      }
      log.debug(`removed tweet ${id}.`);
      this.authorizedLoader.clear(id);
      this.pubsub.publish('tweetRemoved', id);
      return result;
    } catch (err) { log.error(err.message); }
  }
}
