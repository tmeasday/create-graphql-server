import DataLoader from 'dataloader';
import { findByIds, queryForRoles, getLogFilename, logger, authlog, checkAuthDoc, protectFields } from 'create-graphql-server-authorization';
const log = logger(getLogFilename());

export default class User {
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('user');
    this.pubsub = context.pubsub;
    this.authRole = User.authRole;
    try {
      const { me } = context;
      const authQuery = queryForRoles(me, ['admin'], ['_id'], { User }, authlog('user findOneById', 'readOne', me));
      this.authorizedLoader = new DataLoader(ids => findByIds(this.collection, ids, authQuery));
    } catch (err) { log.error(err.message); }
  }

  static authRole(user){
    return (user && user.role) ? user.role : null;
  }

  async findOneById(id, me, resolver) {
    try {
      return await this.authorizedLoader.load(id);
    } catch (err) { log.error(err.message); }
  }

  find({ lastCreatedAt = 0, limit = 10, baseQuery = { createdAt: { $gt: lastCreatedAt } } }, me, resolver) {
    try {
      const authQuery = queryForRoles(me, ['admin'], ['_id'], { User: this.context.User }, authlog(resolver, 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  tweets(user, { minLikes, lastCreatedAt = 0, limit = 10 }, me, resolver) {
    const baseQuery = { authorId: user._id, createdAt: { $gt: lastCreatedAt } };
    return this.context.Tweet.find({ lastCreatedAt, limit, baseQuery }, me, resolver);
  }

  liked(user, { lastCreatedAt = 0, limit = 10 }, me, resolver) {
    const baseQuery = { _id: { $in: user.likedIds || [] }, createdAt: { $gt: lastCreatedAt } };
    return this.context.Tweet.find({ lastCreatedAt, limit, baseQuery }, me, resolver);
  }

  following(user, { lastCreatedAt = 0, limit = 10 }, me, resolver) {
    const baseQuery = { _id: { $in: user.followingIds || [] }, createdAt: { $gt: lastCreatedAt } };
    return this.context.User.find({ lastCreatedAt, limit, baseQuery }, me, resolver);
  }

  followers(user, { lastCreatedAt = 0, limit = 10 }, me, resolver) {
    const baseQuery = { followingIds: user._id, createdAt: { $gt: lastCreatedAt } };
    return this.context.User.find({ lastCreatedAt, limit, baseQuery }, me, resolver);
  }

  createdBy(user, me, resolver) {
    return this.context.User.findOneById(user.createdById, me, resolver);
  }

  updatedBy(user, me, resolver) {
    return this.context.User.findOneById(user.updatedById, me, resolver);
  }

  async insert(doc, me, resolver) {
    try {
      let docToInsert = Object.assign({}, doc, {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdById: (me && me._id) ? me._id : 'unknown',
        updatedById: (me && me._id) ? me._id : 'unknown',
      });
      checkAuthDoc(docToInsert, me, ['admin'], ['_id'], { User: this.context.User }, authlog(resolver, 'create', me));
      docToInsert = protectFields(me, ['admin'], ['role'], docToInsert, { User: this.context.User });
      const id = (await this.collection.insertOne(docToInsert)).insertedId;
      if (!id) {
        throw new Error(`insert user not possible.`);
      }
      log.debug(`inserted user ${id}.`);
      const insertedDoc = this.findOneById(id, me, 'pubsub userInserted');
      this.pubsub.publish('userInserted', insertedDoc);
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
      const authQuery = queryForRoles(me, ['admin'], ['_id'], { User: this.context.User }, authlog(resolver, 'update', me));
      const finalQuery = {...baseQuery, ...authQuery};
      docToUpdate.$set = protectFields(me, ['admin'], ['role'], docToUpdate.$set, { User: this.context.User });
      const result = await this.collection.updateOne(finalQuery, docToUpdate);
      if (result.result.ok !== 1 || result.result.n !== 1){
        throw new Error(`update user not possible for ${id}.`);
      }
      log.debug(`updated user ${id}.`);
      this.authorizedLoader.clear(id);
      const updatedDoc = this.findOneById(id, me, 'pubsub userUpdated')
      this.pubsub.publish('userUpdated', updatedDoc);
      return updatedDoc;
    } catch (err) { log.error(err.message); }
  }

  async removeById(id, me, resolver) {
    try {
      const baseQuery = {_id: id};
      const authQuery = queryForRoles(me, ['admin'], ['_id'], { User: this.context.User }, authlog(resolver, 'delete', me));
      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.remove(finalQuery);
      if (result.result.ok !== 1 || result.result.n !== 1){
        throw new Error(`remove user not possible for ${id}.`);
      }
      log.debug(`removed user ${id}.`);
      this.authorizedLoader.clear(id);
      this.pubsub.publish('userRemoved', id);
      return result;
    } catch (err) { log.error(err.message); }
  }
}
