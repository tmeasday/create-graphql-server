const models = {};

export default function addModelsToContext(context) {
  const newContext = Object.assign({}, context);
  
  // User model has to be first, to initialize the other models with correct authorizations
  if (models['User']){
    newContext['User'] = new models['User'](newContext);
  }

  Object.keys(models).forEach((key) => {
    if (key !== 'User') newContext[key] = new models[key](newContext);
  });
  return newContext;
}

import Tweet from './Tweet';
models.Tweet = Tweet;

import User from './User';
models.User = User;
