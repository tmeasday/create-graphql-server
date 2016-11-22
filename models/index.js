// This file initializes all our model classes on the context in a fairly
// straightforward way:

import User from './User';
import Tweet from './Tweet';

export default function addModelsToContext(context) {
  const { db, pubsub } = context;
  return Object.assign({}, context, {
    User: new User({ db, pubsub }),
    Tweet: new Tweet({ db, pubsub }),
  });
}
