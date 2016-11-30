// This file initializes all our model classes on the context in a fairly
// straightforward way:

import User from './User';
import Tweet from './Tweet';

export default function addModelsToContext(context) {
  const newContext = Object.assign({}, context);
  newContext.User = new User(newContext);
  newContext.Tweet = new Tweet(newContext);
  return newContext;
}
