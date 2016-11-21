export default class Tweet {
  constructor({ db, pubsub }) {
    this.collection = db.collection('tweet');
    this.pubsub = pubsub;
  }

  findOneById(id) {
    return this.collection.findOne({ id });
  }

  findByAuthorId(authorId, { lastCreatedAt, limit = 10 }) {
    return this.collection.find({
      authorId,
      createdAt: { $gt: lastCreatedAt },
    }, { limit }).toArray();
  }

  liked(user, { lastCreatedAt, limit = 10 }) {
    return this.collection.find({
      id: user.likedIds,
      createdAt: { $gt: lastCreatedAt },
    }, { limit }).toArray();
  }

  async insert(doc) {
    const ret = await this.collection.insert(doc);
    this.pubsub.publish('tweetInserted', doc);
    return ret;
  }

  async updateById(id, modifier) {
    const ret = await this.collection.update({ id }, modifier);
    this.pubsub.publish('tweetUpdated', await this.findOneById(id));
    return ret;
  }

  async removeById(id) {
    const ret = this.collection.remove({ id });
    this.pubsub.publish('tweetRemoved', id);
    return ret;
  }
}
