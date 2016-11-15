// Should we put this much in a library? Or a boilerplate file somewhere?
class Model {
  constructor({ name, db, pubsub }) {
    this.collection = db.collection("#{name}s");
    this.pubsub = pubsub;
  }

  insert(object) {
    return this.collection.insert(object)
      .then(id => {
        pubsub.publish('#{name}Inserted', object);
        return id;
      });
  }

  findOne(selector, options = {}) {
    return this.collection.findOne(selector, options);
  }

  find(selector, options = {}) {
    return this.collection.find(selector, options);
  }

  update(selector, modifier) {
    return this.collection.update(selector, modifier)
      .then(() => {
        this.findOne(selector)
          .then(user => pubsub.publish('#{name}Updated', user));
      });
  }

  remove(selector, options) {
    return this.collection.remove(selector, options)
      .then(() => {
        // XXX: we need the id
        pubsub.publish('#{name}Removed', id);
      });
  }
}
