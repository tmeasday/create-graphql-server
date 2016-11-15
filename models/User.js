import Model from './Model';

export default class Users extends Model {
  constructor({ db, pubsub }) {
    this._collection = db.collection("user");
    this._pubsub = pubsub;
  }

  findOneById(id) {
    return this._collection.findOne({ id });
  }

  following(user, { lastCreatedAt, limit: 10 }) {
    return this._collection.find({ id: {$in: user.following }, createdAt: { $gt: lastCreatedAt } }, { limit });
  }

  followers(user, { lastCreatedAt, limit: 10 }) {
    return this._collection.find({ following: user.id, createdAt: { $gt: lastCreatedAt } }, { limit });
  }

  async insert(doc) {
    const ret = await this._collection.insert(doc);
    this._pubsub.publish('userInserted', doc);
    return ret;
  }

  async updateById(id, modifier) {
    const ret = await this._collection.update({ id }, modifier)
    this._pubsub.publish('userUpdated', await this.findOneById(id));
    return ret;
  }

  async removeById(id) {
    const ret = this._collection.remove({ id });
    this._pubsub.publish('userRemoved', id);
    return ret;
  }
}
