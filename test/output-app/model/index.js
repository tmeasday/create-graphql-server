// import Authorize from '../server/authorize';
const models = {};

export default function addModelsToContext(context) {
  const newContext = Object.assign({}, context);
  // newContext['Authorize'] = new Authorize(newContext);
  Object.keys(models).forEach((key) => {
    newContext[key] = new models[key](newContext);
  });
  return newContext;
}

import Tweet from './Tweet';
models.Tweet = Tweet;

import User from './User';
models.User = User;
