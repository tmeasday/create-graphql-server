import _ from 'lodash';
import DataLoader from 'dataloader';
import findByIds from 'mongo-find-by-ids';

export default class User {
  constructor(context) {
    this.ownerField = '_id'; // @authorize(ownerField: "_id")
    this.roleField = 'role'; // @authorize(roleField: "role")
    this.context = context;
    this.collection = context.db.collection('user');
    this.pubsub = context.pubsub;
    this.loader = new DataLoader(ids => findByIds(this.collection, ids));
  }

  // returns the owner of the current document @authorize(ownerField)
  owner(doc){
    return doc[this.ownerField] || null;
  }

  // returns the role of the current user @authorize(roleField)
  role(user){
    return user[this.roleField] || null;
  }

  // returns true, if the current user is authorized for the current mode and document
  isAuthorized({doc, mode, user}){
    const owner = this.owner(doc);
    const role = this.context.User.role(user);

    switch (mode) {

      case: 'create':
        // @authorize(create: ["admin"])
        return (!!role && role === 'admin');
        break;

      case: 'readOne':
        // @authorize(readOne: ["owner", "admin"])
        return (!!role && (user._id === owner || role === 'admin'));
        break;

      case: 'readMany':
        // @authorize(readMany: ["admin"])
        return (!!role && role === 'admin');
        break;

      case: 'update':
        // @authorize(update: ["owner", "admin"])
        return (!!role && (user._id === owner || role === 'admin'));
        break;

      case: 'delete':
        // @authorize(delete: ["owner", "admin"])
        return (!!role && (user._id === owner || role === 'admin'));
        break;

      default:
        return false;
        break;

    }
  }

  // returns only authorized documents
  authorized({doc, mode, user}){
    if (_.isArray(doc)){
      return _.filter(doc, d => this.isAuthorized({doc: d, mode, user}) );
    } else if (_.isObject(doc) && this.isAuthorized({doc, mode, user})) {
      return doc;
    } else {
      return null;
    }
  }

  findOneById(id) {
    return this.loader.load(id);
  }

  all({ lastCreatedAt = 0, limit = 10 }) {
    return this.collection.find({
      createdAt: { $gt: lastCreatedAt },
    }).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  tweets(user, { minLikes, lastCreatedAt = 0, limit = 10 }) {
    return this.context.Tweet.collection.find({
      authorId: user._id,
      createdAt: { $gt: lastCreatedAt },
    }).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  liked(user, { lastCreatedAt = 0, limit = 10 }) {
    return this.context.Tweet.collection.find({
      _id: { $in: user.likedIds || [] },
      createdAt: { $gt: lastCreatedAt },
    }).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  following(user, { lastCreatedAt = 0, limit = 10 }) {
    return this.context.User.collection.find({
      _id: { $in: user.followingIds || [] },
      createdAt: { $gt: lastCreatedAt },
    }).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  followers(user, { lastCreatedAt = 0, limit = 10 }) {
    return this.context.User.collection.find({
      followingIds: user._id,
      createdAt: { $gt: lastCreatedAt },
    }).sort({ createdAt: 1 }).limit(limit).toArray();
  }

  async insert(doc) {
    const docToInsert = Object.assign({}, doc, {
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const id = (await this.collection.insertOne(docToInsert)).insertedId;
    this.pubsub.publish('userInserted', await this.findOneById(id));
    return id;
  }

  async updateById(id, doc) {
    const ret = await this.collection.update({ _id: id }, {
      $set: Object.assign({}, doc, {
        updatedAt: Date.now(),
      }),
    });
    this.loader.clear(id);
    this.pubsub.publish('userUpdated', await this.findOneById(id));
    return ret;
  }

  async removeById(id) {
    const ret = this.collection.remove({ _id: id });
    this.loader.clear(id);
    this.pubsub.publish('userRemoved', id);
    return ret;
  }
}
