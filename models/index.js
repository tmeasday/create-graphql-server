// This file initializes all our model classes on the context in a fairly
// straightforward way:

import User from './User';

// etc
import Tweet from './Tweet';

export function updateContext(context) {
  const { db, pubSub } = context;
  context.User = new User({ db, pubSub });
  context.Tweet = new Tweet({ db, pubSub });
}
