// We are in an intermediate step where we aren't actually generating files
// but we are generating code.

import readInput from './read';

import generateSchema from './schema';
import generateModel from './model';

const input = {
  user: readInput('./input/user.graphql'),
  tweet: readInput('./input/tweet.graphql'),
};


export const schema = generateSchema(input);

const User = generateModel(input.user);
const Tweet = generateModel(input.tweet);

export function addModelsToContext(context) {
  const { db, pubsub } = context;
  return Object.assign({}, context, {
    User: new User({ db, pubsub }),
    Tweet: new Tweet({ db, pubsub }),
  });
}
