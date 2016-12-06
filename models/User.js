import DataLoader from 'dataloader';

export default class User {
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('user');
    this.pubsub = context.pubsub;
    this.loader = new DataLoader(ids =>
      // XXX: intersperse with nulls for missing values
      this.collection.find({ id: { $in: ids } }).toArray()
    );
  }

  findOneById(id) {
    return this.loader.load(id);
  }

  tweets(user, { lastCreatedAt = 0, limit = 10 }) {
    return this.context.Tweet.collection.find({
      authorId: user.id,
      createdAt: { $gt: lastCreatedAt },
    }).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  liked(user, { lastCreatedAt = 0, limit = 10 }) {
    return this.context.Tweet.collection.find({
      id: { $in: user.likedIds || [] },
      createdAt: { $gt: lastCreatedAt },
    }).sort({ createdAt: 1 }).limit(limit).toArray();
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

  async insert(doc) {
    // XXX: proper id generation strategy
    const id = (await this.collection.find().count()).toString();
    const docToInsert = Object.assign({}, doc, {
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await this.collection.insert(docToInsert);
    this.pubsub.publish('userInserted', docToInsert);
    return id;
  }

  async updateById(id, doc) {
    const ret = await this.collection.update({ id }, {
      $set: Object.assign({}, doc, {
        updatedAt: Date.now(),
      }),
    });
    this.loader.clear(id);
    this.pubsub.publish('userUpdated', await this.findOneById(id));
    return ret;
  }

  async removeById(id) {
    const ret = this.collection.remove({ id });
    this.loader.clear(id);
    this.pubsub.publish('userRemoved', id);
    return ret;
  }
}
