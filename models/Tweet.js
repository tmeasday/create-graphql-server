import DataLoader from 'dataloader';

export default class Tweet {
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('tweet');
    this.pubsub = context.pubsub;
    this.loader = new DataLoader(ids =>
      // XXX: intersperse with nulls for missing values
      this.collection.find({ id: { $in: ids } }).toArray()
    );
  }

  findOneById(id) {
    return this.loader.load(id);
  }

  author(tweet) {
    return this.context.User.findOneById(tweet.authorId);
  }

  likers(tweet, { lastCreatedAt = 0, limit = 10 }) {
    return this.context.User.collection.find({
      likedIds: tweet.id,
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
    this.loader.clear(id);
    this.pubsub.publish('tweetUpdated', await this.findOneById(id));
    return ret;
  }

  async removeById(id) {
    const ret = this.collection.remove({ id });
    this.loader.clear(id);
    this.pubsub.publish('tweetRemoved', id);
    return ret;
  }
}
