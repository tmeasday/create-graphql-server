export default class Tweet {
  constructor({ db, pubsub }) {
    this.collection = db.collection('tweet');
    this.pubsub = pubsub;
  }

  findOneById(id) {
    return this.collection.findOne({ id });
  }

  findByAuthorId(authorId, { lastCreatedAt = 0, limit = 10 }) {
    return this.collection.find({
      authorId,
      createdAt: { $gt: lastCreatedAt },
    }).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  liked(user, { lastCreatedAt = 0, limit = 10 }) {
    return this.collection.find({
      id: { $in: user.likedIds },
      createdAt: { $gt: lastCreatedAt },
    }).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  async insert(doc) {
    // XXX: proper id generation strategy
    const id = (await this.collection.find().count()).toString();
    const docToInsert = Object.assign({}, doc, {
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await this.collection.insert(docToInsert);
    this.pubsub.publish('tweetInserted', docToInsert);
    return id;
  }

  async updateById(id, doc) {
    const ret = await this.collection.update({ id }, {
      $set: Object.assign({}, doc, {
        updatedAt: Date.now(),
      }),
    });
    this.pubsub.publish('tweetUpdated', await this.findOneById(id));
    return ret;
  }

  async removeById(id) {
    const ret = this.collection.remove({ id });
    this.pubsub.publish('tweetRemoved', id);
    return ret;
  }
}
