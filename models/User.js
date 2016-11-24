export default class User {
  constructor({ db, pubsub }) {
    this.collection = db.collection('user');
    this.pubsub = pubsub;
  }

  findOneById(id) {
    return this.collection.findOne({ id });
  }

  following(user, { lastCreatedAt = 0, limit = 10 }) {
    return this.collection.find({
      id: { $in: user.followingIds || [] },
      createdAt: { $gt: lastCreatedAt },
    }).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  followers(user, { lastCreatedAt = 0, limit = 10 }) {
    return this.collection.find({
      followingIds: user.id,
      createdAt: { $gt: lastCreatedAt },
    }).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  likers(tweet, { lastCreatedAt = 0, limit = 10 }) {
    return this.collection.find({
      likedIds: tweet.id,
      createdAt: { $gt: lastCreatedAt },
    }).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  async insert(doc) {
    const ret = await this.collection.insert(Object.assign({}, doc, {
      // XXX: proper id generation strategy
      id: await this.collection.find().count(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
    this.pubsub.publish('userInserted', doc);
    return ret;
  }

  async updateById(id, doc) {
    const ret = await this.collection.update({ id }, {
      $set: Object.assign({}, doc, {
        updatedAt: Date.now(),
      }),
    });
    this.pubsub.publish('userUpdated', await this.findOneById(id));
    return ret;
  }

  async removeById(id) {
    const ret = this.collection.remove({ id });
    this.pubsub.publish('userRemoved', id);
    return ret;
  }
}
