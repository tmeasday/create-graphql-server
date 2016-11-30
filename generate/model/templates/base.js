export default class TypeName {
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('typeName');
    this.pubsub = context.pubsub;
  }

  findOneById(id) {
    return this.collection.findOne({ id });
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
    this.pubsub.publish('typeNameInserted', docToInsert);
    return id;
  }

  async updateById(id, doc) {
    const ret = await this.collection.update({ id }, {
      $set: Object.assign({}, doc, {
        updatedAt: Date.now(),
      }),
    });
    this.pubsub.publish('typeNameUpdated', await this.findOneById(id));
    return ret;
  }

  async removeById(id) {
    const ret = this.collection.remove({ id });
    this.pubsub.publish('typeNameRemoved', id);
    return ret;
  }
}
