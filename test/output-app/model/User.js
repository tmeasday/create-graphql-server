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
    return (doc && doc[this.ownerField]) ? doc[this.ownerField].toString() : null;
  }

  // returns the role of the current user @authorize(roleField)
  role(user){
    return (user && user[this.roleField]) ? user[this.roleField] : null;
  }

  // returns true, if the current user is authorized for the current mode and document
  isAuthorized({doc, mode, user, debug = true}){
    let authResult = false;
    const ownerId = this.owner(doc);
    const userId = (user && user._id) ? user._id.toString() : '';
    const role = this.context.User.role(user);

    switch (mode) {
      case 'create':
        // @authorize(create: ["admin"])
        authResult = (!!role && role === 'admin');
        break;
      case 'readOne':
        // @authorize(readOne: ["owner", "admin"])
        authResult = (!!role && (userId === ownerId || role === 'admin'));
        break;
      case 'readMany':
        // @authorize(readMany: ["admin"])
        authResult = (!!role && role === 'admin');
        break;
      case 'update':
        // @authorize(update: ["owner", "admin"])
        authResult = (!!role && (userId == ownerId || role === 'admin'));
        break;
      case 'delete':
        // @authorize(delete: ["owner", "admin"])
        authResult = (!!role && (userId === ownerId || role === 'admin'));
        break;
    }

    (debug) ? console.log('User:', userId, 'Owner:', ownerId, 'Role:', role, 'Mode:', mode, "===>", 'Authorized:', authResult) : null;
    return authResult;
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

  // returns document without role field
  // @authorize(updateRole: ["admin"])
  allowedFields(input, user){
    if (user.role === 'admin'){
      return input;
    }
    if (input[this.roleField]){
      delete input[this.roleField];
    }
    return input;
  }

  async findOneById(id) {
    const doc = await this.loader.load(id);
    return doc;
  }

  async all({ lastCreatedAt = 0, limit = 10 }) {
    const docs = await this.collection.find({
      createdAt: { $gt: lastCreatedAt },
    }).sort({ createdAt: 1 }).limit(limit).toArray();
    return docs;
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
