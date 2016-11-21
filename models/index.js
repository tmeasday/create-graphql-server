// This file initializes all our model classes on the context in a fairly
// straightforward way:

import User from './User';

// etc
import Tweet from './Tweet';

export default function addModelsToContext(context) {
  const { db, pubSub } = context;
  return Object.assign({}, context, {
    User: new User({ db, pubSub }),
    // Tweet: new Tweet({ db, pubSub }),
  });
}
