import Model from './Model';

export default class Users extends Model {
  constructor({ db, pubsub }) {
    super({ name: 'user', db, pubsub });
  }

  findOneById(id) {
    return this.findOne({ id });
  }

  following(user, { offset: 0, limit: 10 }) {
    return this.find({ id: {$in: user.following } }, { offset, limit });
  }

  followers(user, { offset: 0, limit: 10 }) {
    return this.find({ following: user.id }, { offset, limit });
  }

  updateById(id, modifier) {
    return this.update({ id }, modifier);
  }

  removeById(id) {
    return this.remove({ id });
  }
}
