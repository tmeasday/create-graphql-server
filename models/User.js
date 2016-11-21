export default class User {
  constructor({ db, pubsub }) {
    this.collection = db.collection('user');
    this.pubsub = pubsub;
  }

  findOneById(id) {
    return this.collection.findOne({ id });
  }

  following(user, { lastCreatedAt, limit = 10 }) {
    return this.collection.find({
      id: { $in: user.following },
      createdAt: { $gt: lastCreatedAt },
    }, { limit }).toArray();
  }

  followers(user, { lastCreatedAt, limit = 10 }) {
    return this.collection.find({
      following: user.id,
      createdAt: { $gt: lastCreatedAt },
    }, { limit }).toArray();
  }

  liked(tweet, { lastCreatedAt, limit = 10 }) {
    return this.collection.find({
      likedIds: tweet.id,
      createdAt: { $gt: lastCreatedAt },
    }, { limit }).toArray();
  }

  async insert(doc) {
    const ret = await this.collection.insert(doc);
    this.pubsub.publish('userInserted', doc);
    return ret;
  }

  async updateById(id, modifier) {
    const ret = await this.collection.update({ id }, modifier);
    this.pubsub.publish('userUpdated', await this.findOneById(id));
    return ret;
  }

  async removeById(id) {
    const ret = this.collection.remove({ id });
    this.pubsub.publish('userRemoved', id);
    return ret;
  }
}
