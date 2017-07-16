# create-graphql-server
This is a generated create-graphql-server app.

* Authentication: Identifies an user
* Authorization: Defines all actions a user is allowed to perform

## Implementing Authentication
The authentication is performed in those locations:
* ./server/index.js
<<<<<<< HEAD
* ./server/authenticate.js
* ./model/index.js

### ./server/index.js
In the server, the database is started, and the UserCollection is defined. That's where the server accesses the user documents in the database.

In ```js authenticate(app, UserCollection)``` the authentication is prepared and processed. Later, if a user sends a 'graphql' request, the user is determined with ```js passport.authenticate(...)```. After that, the user is whether an anonymous user or an authenticated user. You find the identified user in the object "me". Then the type models have to be initialized with the user "me" authorizations: ```js req.context = addModelsToContext({... me ...})```.
=======
* ./model/index.js
* ./server/authenticate.js

### ./server/index.js
In the server, the database is started, and the UserCollection is defined. That's who the server accesses the user documents in the database.

In ```js authenticate(app, UserCollection)``` the authentication is prepared and processed. Later if a user sends a 'graphql' request, the user is determined with ```js passport.authenticate(...)```. After that, the user is  whether an anonymous user or an authenticated user. You find the identified user in the object "me". Then the type models have to be initialized with the user "me" authorizations: ```js req.context = addModelsToContext({... me ...})```.
>>>>>>> new authorization version from 2017-07-17

```javascript
...
async function startServer() {
  log.info('Logger started');

  const db = await MongoClient.connect(MONGO_URL);
  const UserCollection = db.collection('user');

  const app = express().use('*', cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(morgan("dev", { "stream": stream }));

  authenticate(app, UserCollection);

  app.use('/graphql', (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, me) => {
      req.context = addModelsToContext({ db, pubsub, me, UserCollection });
      graphqlExpress(() => {
        // Get the query, the same way express-graphql does it
        // https://github.com/graphql/express-graphql/blob/3fa6e68582d6d933d37fa9e841da5d2aa39261cd/src/index.js#L257
        const {variables, operationName} = req.body;
        const {_id, username, role} = me;
        const query = req.query.query || req.body.query;
        log.debug('-'.repeat(80));
        log.debug(`Request:\nUser: "${(username) ? username: '<no-user>'}", role: "${(role) ? role : '<no-role>'}", id: "${(_id) ? _id : '<no-id>'}",\nOperation: "${operationName ? operationName : '<no-name>'}", variables: "${variables ? JSON.stringify(variables) : '<no-variables>'}",\nQuery:\n${print(parse(query))}`);
        if (query && query.length > 4000) {
          // None of our app's queries are this long
          // Probably indicates someone trying to send an overly expensive query
          log.error('Query too large.');
          throw new Error('Query too large.');
        }
        return {
          schema,
          context: Object.assign({ me }, req.context),
          debug: true,
<<<<<<< HEAD
          formatError(e) { 
            console.log(e);
            return e;
          },
=======
          // formatError(e) { console.log(e) },
>>>>>>> new authorization version from 2017-07-17
        };
      })(req, res, next);
    })(req, res, next);
  });
  ...
}
```

<<<<<<< HEAD
By-the-way: The server/index.js is able to access the User collection directly by the following two lines. This is used in the server/authenticate.js during authenticate.
```js
... 
const UserCollection = db.collection('user');
...
authenticate(app, UserCollection);
...
```

### ./model/index.js
If there is a User model generated, then we load it as the first model. It defines the model, which will be used in the other models as well, to perform the authorization checks. 
=======
### ./model/index.js
If there is a User model generated, then we load it as the first model. It defines the model, which will be used in the other models as well, to perform the authorization checks.
>>>>>>> new authorization version from 2017-07-17

```javascript
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
```

### ./server/authenticate.js
<<<<<<< HEAD
Here, the real identification of an user is performed. After a user requested a '/login' url with user and password. The user's email is searched in the database. If it is there, it checks if the user's encrypted hash is equal to the encrypted password. If so, a user is identified and a JWT token is generated and transfered back to the requesting user. This JWT token is usually stored in the client's browsers local storage and added to the next call in the Authorization header. With all the next requests of that user, he sends an header like...
=======
Here the real identification of an user is performed. After a user requested a '/login' with user and password. The user's email is searched in the database. If it is there, it checks if the user's encrypted hash is equal to the encrypted password, if so, a user is identified and a JWT token is generated and transfered back to the requesting user. With all the next requests of that user, he sends an header like...
>>>>>>> new authorization version from 2017-07-17
```javacript
authorization JWT calculated.JWT.token
```
This JWT token is decrypted with an internal secret KEY to get the user id. This user is then read from the cache/database within userFromPayload and returned to the request as the user object "me", which is then used in all "/graphql" calls.

```javascript
import passport from 'passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import jwt from 'jwt-simple';
import { ObjectId } from 'mongodb';
import nodeify from 'nodeify';
import bcrypt from 'bcrypt';
import DataLoader from 'dataloader';
<<<<<<< HEAD
import { findByIds } from 'create-graphql-server-authorization';
=======
import { findByIds } from './authorize';
>>>>>>> new authorization version from 2017-07-17

const KEY = 'test-key';
let Loader;

async function userFromPayload(request, jwtPayload) {
  if (!jwtPayload.userId) {
    throw new Error('No userId in JWT');
  }
  return await Loader.load(ObjectId(jwtPayload.userId));
}

passport.use(new Strategy({
  jwtFromRequest: ExtractJwt.fromAuthHeader(),
  secretOrKey: KEY,
  passReqToCallback: true,
}, (request, jwtPayload, done) => {
  nodeify(userFromPayload(request, jwtPayload), done);
}));

export default function addPassport(app, User) {
  Loader = new DataLoader(ids => findByIds(User, ids));
  
  app.use(passport.initialize());

  app.post('/login', async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new Error('Username or password not set on request');
      }

      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.hash))) {
        throw new Error('User not found matching email/password combination');
      }

      const payload = {
        userId: user._id.toString(),
      };

      const token = jwt.encode(payload, KEY);
      res.json({ token });
    } catch (e) {
      next(e);
    }
  });
}
```

## Implementing Authorizations
Use the @authorize directive in a \<type\>.graphql input file, to define which authorizations should be generated by create-graphql-server. You can define user-roles and document-roles to control authorizations.

* user-roles: e.g. User.role = "admin", all admins are allowed to do create, read, update, delete,...
* document-roles: e.g. Tweet.authorId = User._id, only authors are allowed to create, update, delete a document

Use the following syntax for the Tweet.graphql input file::
```javascript
type Tweet 

@authorize(
  admin: ["create", "read", "update", "delete"], 
  author: ["create", "read", "update", "delete"], 
  coauthors: ["read", "update"],
  world: ["read"]
)

{
  author: User! @unmodifiable @belongsTo @authRole("author")
  coauthors: [User] @belongsTo @authRole("coauthors")
  body: String!

  likers: [User!] @hasAndBelongsToMany(as: "liked")
}
```

This has the following meaning:
* user-roles: "admin", "world" are created. (user-roles don't have own fields of type User or [User] in the document).
  Thus it will check, if the logged in user has a role "admin". Or if there is a special role "world", which just means every known or unknown user is allowed. For "world" authorization you don't have to be logged in.
  So each "admin" user will be able to create, read, update or delete the Tweet document.
  Everyone ("world") will be allowed to read all Tweets.
* document-roles: "author", "coauthors" are created. (Document-roles have a corresponding field in the document.)
  Look for the fields with the directive @authRole("...")
  Only the author of a Tweet is allowed to create, read, update, delete its single Tweet.
  Only a coauthor of a Tweet is allowed to read and update a Tweet, but he is not allowed to create a Tweet for a different author, and also not to delete a tweet of a different user.

and for the User.graphql input file:
```javascript
type User

@authorize(
  admin: ["create", "read", "update", "delete"]
  this: ["read", "update", "delete"]
)

{
<<<<<<< HEAD
  role: String @authRole("admin") 
=======
  role: String @authRole("admin") @authorize(admin: ["create", "read", "update", "delete"], this: ["readOne"])

>>>>>>> new authorization version from 2017-07-17
  username: String!

  bio: String
  notify: Boolean

  tweets(minLikes: Int): [Tweet!] @hasMany(as: "author")
  liked: [Tweet!] @belongsToMany

  following: [User!] @belongsToMany
  followers: [User!] @hasAndBelongsToMany(as: "following")
}
```

This has the following meaning:
* user-role: "admin", is created. (user roles don't have own fields of type User or [User] in the document)
  It is a String field with: **role: String! @authRole("admin")**
  This will check, if the logged in user has a role "admin".
  So each "admin" user will be able to create, read, update or delete any User document.
* document-role: "this", is created (document roles have own fields in the document, but this is a special case for the field _id, which is not shown in the input type, but will be generated in the later schema file.)
  Only the user id of "this" meaning _id is allowed  to readOne, update, delete its single User document.

<<<<<<< HEAD
Use create-graphql-server command to generate the according schema, resolver, model files with the create-graphql-server command line interface. After its generation, you will find the generated files in the sub folders: schema, resolvers, model. The generated model files will use the following functions to implement the authorization logic.
=======
Here we use also the @authorize directive on field level for the field role:
```javascript
...
role: String @authRole("admin") @authorize(admin: ["create", "read", "update", "delete"], this: ["readOne"])
...
```
This adds additional authorization checks on the field level just for this field "role".
Every time this field "role" appears in any document, it will be checked, if the user is authorized to do the operation on this document containing this field. If the field is not in the document, it skips the field check.

In this case it checks:
* if the user-role "admin" is the authorized user, then it allows him to create, read, update, delete operations also on the document, if it contains the field "role"
* if the document-role "this" (=owner of the document user._id_ = doc._id_) to do the operations "readOne" on the User document, but it doesn't allow him to upgrade/update his own User.role.

Use create-graphql-server cli to generate the according schema, resolver, model files with the create-graphql-server command line interface. After its generation, you will find the generated files in the sub folders: schema, resolvers, model folders. The generated model files will use the following functions to implement the authorization logic.
>>>>>>> new authorization version from 2017-07-17

### <type> model.js
This is an example of a database model of type <type>.

```javascript
import DataLoader from 'dataloader';
import { findByIds, queryForRoles, getLogFilename, logger, authlog, checkAuthDoc } from 'create-graphql-server-authorization';
const log = logger(getLogFilename());

export default class <Type> {
<<<<<<< HEAD
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('<type>');
    this.pubsub = context.pubsub;
    let authQuery;
    try {
      const { me, User } = context;
      authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User }, authlog('<type> findOneById', 'readOne', me));
    } catch (err) { 
      log.error(err.message);
      authQuery = {_id: false}; // otherwise admin access
    }
    this.authorizedLoader = new DataLoader(ids => findByIds(this.collection, ids, authQuery));
=======
  constructor(context){
<<<<<<< HEAD
<<<<<<< HEAD
	...
	this.unauthorizedLoader = new DataLoader(ids => findByIds(this.collection, ids));
	const { user: me, User } = context;
	const authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], 'readOne', { User }, 'findOneLoader');
	this.authorizedLoader = new DataLoader(ids => findByIds(this.collection, ids, authQuery));
	...
>>>>>>> handle conflicts
  }

  async findOneById(id, me, resolver) {
    try {
      return await this.authorizedLoader.load(id);
    } catch (err) { log.error(err.message); }
  }

  find({ lastCreatedAt = 0, limit = 10, baseQuery = {} }, me, resolver) {
    try {
      const authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery, createdAt: { $gt: lastCreatedAt }};
      return this.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err){ log.error(err.message); }
  }
=======
=======
>>>>>>> merge correction
  ...
  const { me, User } = context;
  let authQuery;
  try {
    authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User }, authlog('tweet findOneLoader', 'readOne', me));
  } catch (err) { 
    log.error(err.message);
    authQuery = {_id: false};
  }
  this.unauthorizedLoader = new DataLoader(ids => findByIds(this.collection, ids));
  this.authorizedLoader = new DataLoader(ids => findByIds(this.collection, ids, authQuery));
    ...
  }
...
// used from server calls, without authorization checks, NOT for use in resolvers
async findOneById(id, me = {}, resolver = 'tweet findOneById') {
  try {
    return await this.unauthorizedLoader.load(id);
  } catch (err) { log.error(err.message); }
}

// used for api calls, with authorization checks, for use in resolvers
async getOneById(id, me = {}, resolver = 'tweet getOneById') {
  try {
    const result = await this.authorizedLoader.load(id);
    return result;
  } catch (err) { log.error(err.message); }
}

all({ lastCreatedAt = 0, limit = 10 }, me, resolver = 'tweet all') {
  try {
    const baseQuery = { createdAt: { $gt: lastCreatedAt } };
    const authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readMany', me));
    const finalQuery = {...baseQuery, ...authQuery};
    return this.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
  } catch (err){ log.error(err.message); }
}
>>>>>>> new authorization version from 2017-07-17
...
}
```

### ./model/Tweet.js
generated model file for the above input type Tweet.graphql considering the @authorize directive. You can see, the directive argument "read" is used to express "readOne" and "readMany" at the same time. Instead you can use "readOne" and "readMany" for fine grained control on read operations, to allow access to just one record or many records.
```javascript
<<<<<<< HEAD
import DataLoader from 'dataloader';
import { findByIds, queryForRoles, getLogFilename, logger, authlog, checkAuthDoc } from 'create-graphql-server-authorization';
const log = logger(getLogFilename());
=======
iimport log from '../server/logger';
import DataLoader from 'dataloader';
import { findByIds, queryForRoles, fieldForRoles, fieldContainsUserId, authorizedFields, authlog } from '../server/authorize';
>>>>>>> new authorization version from 2017-07-17

export default class Tweet {
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('tweet');
    this.pubsub = context.pubsub;
<<<<<<< HEAD
<<<<<<< HEAD
    let authQuery;
    try {
      const { me, User } = context;
      authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User }, authlog('tweet findOneById', 'readOne', me));
    } catch (err) { 
      log.error(err.message);
      authQuery = {_id: false}; // otherwise admin access
    }
    this.authorizedLoader = new DataLoader(ids => findByIds(this.collection, ids, authQuery));
=======
    this.loaders = (_user = {}, resolver = '') => ({
      readOne: new DataLoader(ids => new Promise( async (resolve, reject) => {
        try {
          const authQuery = queryForRoles(_user, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readOne', _user));
          const result = await findByIds(this.collection, ids, authQuery);
          resolve(result);
        } catch (err) { reject(err); }
      })),
    });
>>>>>>> applied changes
  }

  async findOneById(id, me, resolver) {
    try {
      return await this.authorizedLoader.load(id);
    } catch (err) { log.error(err.message); }
  }

  find({ lastCreatedAt = 0, limit = 10, baseQuery = {} }, me, resolver) {
    try {
      const authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery, createdAt: { $gt: lastCreatedAt }};
=======
    const { me, User } = context;
    let authQuery;
    try {
      authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User }, authlog('tweet findOneLoader', 'readOne', me));
    } catch (err) { 
      log.error(err.message);
      authQuery = {_id: false};
    }
    this.unauthorizedLoader = new DataLoader(ids => findByIds(this.collection, ids));
    this.authorizedLoader = new DataLoader(ids => findByIds(this.collection, ids, authQuery));
  }

  // used from server calls, without authorization checks, NOT for use in resolvers
  async findOneById(id, me = {}, resolver = 'tweet findOneById') {
    try {
      return await this.unauthorizedLoader.load(id);
    } catch (err) { log.error(err.message); }
  }

  // used for api calls, with authorization checks, for use in resolvers
  async getOneById(id, me = {}, resolver = 'tweet getOneById') {
    try {
      const result = await this.authorizedLoader.load(id);
      return result;
    } catch (err) { log.error(err.message); }
  }

  all({ lastCreatedAt = 0, limit = 10 }, me, resolver = 'tweet all') {
    try {
      const baseQuery = { createdAt: { $gt: lastCreatedAt } };
      const authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
>>>>>>> new authorization version from 2017-07-17
      return this.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err){ log.error(err.message); }
  }

<<<<<<< HEAD
  createdBy(tweet, me, resolver) {
    return this.context.User.findOneById(tweet.createdById, me, resolver);
  }

  updatedBy(tweet, me, resolver) {
    return this.context.User.findOneById(tweet.updatedById, me, resolver);
  }

  author(tweet, me, resolver) {
    return this.context.User.findOneById(tweet.authorId, me, resolver);
  }

  coauthors(tweet, { lastCreatedAt = 0, limit = 10 }, me, resolver) {
    const baseQuery = {_id: { $in: tweet.coauthorsIds } };
    return this.context.User.find({ lastCreatedAt, limit, baseQuery }, me, resolver);
  }

  likers(tweet, { lastCreatedAt = 0, limit = 10 }, me, resolver) {
    const baseQuery = {likedIds: tweet._id, createdAt: { $gt: lastCreatedAt } };
    return this.context.User.find({ lastCreatedAt, limit, baseQuery }, me, resolver);
  }

  async insert(doc, me, resolver) {
    try {

=======
  author(tweet, me, resolver = 'tweet author') {
    return this.context.User.getOneById(tweet.authorId, me, resolver);
  }

  createdBy(tweet, me, resolver = 'tweet createdBy') {
    return this.context.User.getOneById(tweet.createdById, me, resolver);
  }

  updatedBy(tweet, me, resolver = 'tweet updatedBy') {
    return this.context.User.getOneById(tweet.updatedById, me, resolver);
  }

  coauthors(tweet, { lastCreatedAt = 0, limit = 10 }, me, resolver = 'tweet coauthors') {
    try {
      const baseQuery = {_id: { $in: tweet.coauthorsIds }, createdAt: { $gt: lastCreatedAt } };
      const authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err){ log.error(err.message); }
  }

  likers(tweet, { lastCreatedAt = 0, limit = 10 }, me, resolver = 'tweet likers') {
    try {
      const baseQuery = {likedIds: tweet._id, createdAt: { $gt: lastCreatedAt } };
      const authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err){ log.error(err.message); }
  }

  async insert(doc, me, resolver = 'insert tweet') {
    try {
      let insertedDoc = null;
>>>>>>> new authorization version from 2017-07-17
      let docToInsert = Object.assign({}, doc, {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdById: (me && me._id) ? me._id : 'unknown',
          updatedById: (me && me._id) ? me._id : 'unknown',
      });
<<<<<<< HEAD
      log.debug(JSON.stringify(docToInsert, null, 2));

      checkAuthDoc(docToInsert, me, ['admin'], ['authorId'], { User: this.context.User }, authlog(resolver, 'create', me));
      const id = (await this.collection.insertOne(docToInsert)).insertedId;
      if (!id) {
        throw new Error(`insert tweet not possible.`);
      }

      log.debug(`inserted tweet ${id}.`);
      const insertedDoc = this.findOneById(id, me, 'pubsub tweetInserted');
=======

      const authQuery = queryForRoles(me, ['admin'], ['authorId'], { User: this.context.User }, authlog(resolver, 'create', me));

      const docRoleFields = ['authorId'].map(key => ({ [key]: docToInsert[key] }) );
      if (Object.keys(authQuery).length > 0 && !fieldContainsUserId(docRoleFields, me._id)) {
        throw new Error('Not authorized to insert tweet');
      }

      const id = (await this.collection.insertOne(docToInsert)).insertedId;
      if (!id) {
        log.error('insert tweet failed for docToInsert:', JSON.stringify(docToInsert, null, 2));
        throw new Error(`insert tweet not possible for  ${id}.`);
      }

      log.debug(`inserted tweet ${id}.`);
      insertedDoc = this.getOneById(id, me, 'pubsub tweetInserted');
>>>>>>> new authorization version from 2017-07-17
      this.pubsub.publish('tweetInserted', insertedDoc);
      return insertedDoc;

    } catch (err){ log.error(err.message); }
  }

<<<<<<< HEAD
  async updateById(id, doc, me, resolver) {
    try {

=======
  async updateById(id, doc, me, resolver = 'update tweet') {
    try {
      let updatedDoc = null;
      const docBefore = await this.getOneById(id, me, 'tweet getOneById in updateById for docBefore');
>>>>>>> new authorization version from 2017-07-17
      let docToUpdate = {$set: Object.assign({}, doc, {
            updatedAt: Date.now(),
            updatedById: (me && me._id) ? me._id : 'unknown',
      })};

      const baseQuery = {_id: id};
      const authQuery = queryForRoles(me, ['admin'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'update', me));
<<<<<<< HEAD
      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.updateOne(finalQuery, docToUpdate);
      if (result.result.ok !== 1 || result.result.n !== 1){
=======

      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.updateOne(finalQuery, docToUpdate);
      if (result.result.ok !== 1 || result.result.n !== 1){
        log.error(`update tweet failed finalQuery:`, JSON.stringify(finalQuery, null, 2));
        log.error('update tweet failed for docToUpdate:', JSON.stringify(docToUpdate, null, 2));
>>>>>>> new authorization version from 2017-07-17
        throw new Error(`update tweet not possible for ${id}.`);
      }

      log.debug(`updated tweet ${id}.`);
<<<<<<< HEAD
      this.authorizedLoader.clear(id);
      const updatedDoc = this.findOneById(id, me, 'pubsub tweetUpdated');
=======
      this.unauthorizedLoader.clear(id);
      this.authorizedLoader.clear(id);

      updatedDoc = this.getOneById(id, me, 'pubsub tweetUpdated');
>>>>>>> new authorization version from 2017-07-17
      this.pubsub.publish('tweetUpdated', updatedDoc);
      return updatedDoc;

    } catch (err){ log.error(err.message); }
  }

<<<<<<< HEAD
  async removeById(id, me, resolver) {
    try {

=======
  async removeById(id, me, resolver = 'remove tweet') {
    try {
      const docBefore = this.getOneById(id, me, 'tweet getOneById in removeById for docBefore');
>>>>>>> new authorization version from 2017-07-17
      const baseQuery = {_id: id};
      const authQuery = queryForRoles(me, ['admin'], ['authorId'], { User: this.context.User }, authlog(resolver, 'delete', me));
      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.remove(finalQuery);
<<<<<<< HEAD
      if (result.result.ok !== 1 || result.result.n !== 1){
=======

      if (result.result.ok !== 1 || result.result.n !== 1){
        log.error(`remove tweet failed for finalQuery:`, JSON.stringify(finalQuery, null, 2));
>>>>>>> new authorization version from 2017-07-17
        throw new Error(`remove tweet not possible for ${id}.`);
      }

      log.debug(`removed tweet ${id}.`);
<<<<<<< HEAD
      this.authorizedLoader.clear(id);
      this.pubsub.publish('tweetRemoved', id);
      return result;
      
=======
      this.unauthorizedLoader.clear(id);
      this.authorizedLoader.clear(id);

      this.pubsub.publish('tweetRemoved', id);
      return result;

>>>>>>> new authorization version from 2017-07-17
    } catch (err){ log.error(err.message); }
  }
}
```

### ./model/User.js
<<<<<<< HEAD
generated model file for the above input type User.graphql considering the @authorize directive.
=======
generated model file for the above input type User.graphql:
this.auth is generated by the @authorize directive. Here also with field authorizations.

>>>>>>> new authorization version from 2017-07-17
```javascript
import DataLoader from 'dataloader';
<<<<<<< HEAD
import { findByIds, queryForRoles, getLogFilename, logger, authlog, checkAuthDoc, protectFields } from 'create-graphql-server-authorization';
const log = logger(getLogFilename());
=======
import { findByIds, queryForRoles, fieldForRoles, fieldContainsUserId, authorizedFields, authlog } from '../server/authorize';
>>>>>>> new authorization version from 2017-07-17

export default class User {
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('user');
    this.pubsub = context.pubsub;
<<<<<<< HEAD
<<<<<<< HEAD
    this.authRole = User.authRole;
    let authQuery;
    try {
      const { me } = context;
      authQuery = queryForRoles(me, ['admin'], ['_id'], { User }, authlog('user findOneById', 'readOne', me));
    } catch (err) { 
      log.error(err.message);
      authQuery = {_id: false}; // otherwise admin access
    }
    this.authorizedLoader = new DataLoader(ids => findByIds(this.collection, ids, authQuery));
=======
    this._user = {};
    this.loaders = (_user = {}, resolver = '') => ({
      readOneWithoutAuth: new DataLoader(ids => new Promise( async (resolve, reject) => {
        try {
          const result = await findByIds(this.collection, ids, {});
          resolve(result);
        } catch (err) { reject(err); }
      })),
      readOne: new DataLoader(ids => new Promise( async (resolve, reject) => {
        try {
          const authQuery = queryForRoles(_user, ['admin'], ['_id'], { User: this.context.User }, authlog(resolver, 'readOne', _user));
          const result = await findByIds(this.collection, ids, authQuery);
          resolve(result);
        } catch (err) { reject(err); }
      })),
    });
>>>>>>> applied changes
  }

=======
    const { me } = context;
    this.authRole = User.authRole; // otherwise not accessible in queryForRoles
    let authQuery;
    try {
      authQuery = queryForRoles(me, ['admin'], ['_id'], { User }, authlog('user findOneLoader', 'readOne', me));
    } catch (err) { 
      log.error(err.message);
      authQuery = {_id: false};
    }
    this.unauthorizedLoader = new DataLoader(ids => findByIds(this.collection, ids));
    this.authorizedLoader = new DataLoader(ids => findByIds(this.collection, ids, authQuery));
  }

  // returns the role of the user
>>>>>>> new authorization version from 2017-07-17
  static authRole(user){
    return (user && user.role) ? user.role : null;
  }

<<<<<<< HEAD
  async findOneById(id, me, resolver) {
    try {
      return await this.authorizedLoader.load(id);
    } catch (err) { log.error(err.message); }
  }

  find({ lastCreatedAt = 0, limit = 10, baseQuery = { createdAt: { $gt: lastCreatedAt } } }, me, resolver) {
    try {
      const authQuery = queryForRoles(me, ['admin'], ['_id'], { User: this.context.User }, authlog(resolver, 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  tweets(user, { minLikes, lastCreatedAt = 0, limit = 10 }, me, resolver) {
    const baseQuery = { authorId: user._id, createdAt: { $gt: lastCreatedAt } };
    return this.context.Tweet.find({ lastCreatedAt, limit, baseQuery }, me, resolver);
  }

  liked(user, { lastCreatedAt = 0, limit = 10 }, me, resolver) {
    const baseQuery = { _id: { $in: user.likedIds || [] }, createdAt: { $gt: lastCreatedAt } };
    return this.context.Tweet.find({ lastCreatedAt, limit, baseQuery }, me, resolver);
  }

  following(user, { lastCreatedAt = 0, limit = 10 }, me, resolver) {
    const baseQuery = { _id: { $in: user.followingIds || [] }, createdAt: { $gt: lastCreatedAt } };
    return this.context.User.find({ lastCreatedAt, limit, baseQuery }, me, resolver);
  }

  followers(user, { lastCreatedAt = 0, limit = 10 }, me, resolver) {
    const baseQuery = { followingIds: user._id, createdAt: { $gt: lastCreatedAt } };
    return this.context.User.find({ lastCreatedAt, limit, baseQuery }, me, resolver);
  }

  createdBy(user, me, resolver) {
    return this.context.User.findOneById(user.createdById, me, resolver);
  }

  updatedBy(user, me, resolver) {
    return this.context.User.findOneById(user.updatedById, me, resolver);
  }

  async insert(doc, me, resolver) {
    try {
      let docToInsert = Object.assign({}, doc, {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdById: (me && me._id) ? me._id : 'unknown',
        updatedById: (me && me._id) ? me._id : 'unknown',
      });
      checkAuthDoc(docToInsert, me, ['admin'], ['_id'], { User: this.context.User }, authlog(resolver, 'create', me));
      docToInsert = protectFields(me, ['admin'], ['role'], docToInsert, { User: this.context.User });
      const id = (await this.collection.insertOne(docToInsert)).insertedId;
      if (!id) {
        throw new Error(`insert user not possible.`);
      }
      log.debug(`inserted user ${id}.`);
      const insertedDoc = this.findOneById(id, me, 'pubsub userInserted');
      this.pubsub.publish('userInserted', insertedDoc);
      return insertedDoc;
    } catch (err) { log.error(err.message); }
  }

  async updateById(id, doc, me, resolver) {
    try {
      let docToUpdate = {$set: Object.assign({}, doc, {
            updatedAt: Date.now(),
            updatedById: (me && me._id) ? me._id : 'unknown',
      })};
      const baseQuery = {_id: id};
      const authQuery = queryForRoles(me, ['admin'], ['_id'], { User: this.context.User }, authlog(resolver, 'update', me));
      const finalQuery = {...baseQuery, ...authQuery};
      docToUpdate.$set = protectFields(me, ['admin'], ['role'], docToUpdate.$set, { User: this.context.User });
      const result = await this.collection.updateOne(finalQuery, docToUpdate);
      if (result.result.ok !== 1 || result.result.n !== 1){
        throw new Error(`update user not possible for ${id}.`);
      }
      log.debug(`updated user ${id}.`);
      this.authorizedLoader.clear(id);
      const updatedDoc = this.findOneById(id, me, 'pubsub userUpdated')
      this.pubsub.publish('userUpdated', updatedDoc);
      return updatedDoc;
    } catch (err) { log.error(err.message); }
  }

  async removeById(id, me, resolver) {
    try {
=======
  // used from server calls, without authorization checks, NOT for use in resolvers
  async findOneById(id, me = {}, resolver = 'user findOneById') {
    try {
      return await this.unauthorizedLoader.load(id);
    } catch (err) { log.error(err.message); }
  }

  // used for api calls, with authorization checks, for use in resolvers
  async getOneById(id, me = {}, resolver = 'user getOneById') {
    try {
      const result = await this.authorizedLoader.load(id);
      // role: @authorize(admin: ["create", "read", "update", "delete"], this: ["readOne"]) 
      //                  =====             ======                       ====    =======
      return authorizedFields(result, 'role', me, ['admin'], ['_id'], { User: this.context.User }, authlog(resolver + 'field "role"', 'readOne', me));
    } catch (err) { log.error(err.message); }
  }

  all({ lastCreatedAt = 0, limit = 10 }, me, resolver = 'user all') {
    try { 
      const baseQuery = { createdAt: { $gt: lastCreatedAt } };
      const authQuery = queryForRoles(me, ['admin'], [], { User: this.context.User }, authlog(resolver, 'readMany', me));
      // role: @authorize(admin: ["create", "read", "update", "delete"], this: ["readOne"]) 
      //                  =====             ======                      
      let authFields = {};
      authFields = fieldForRoles(authFields, 'role', me, ['admin'], [], { User: this.context.User }, authlog(resolver + 'field "role"', 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.collection.find(finalQuery).sort({ createdAt: 1 }).project(authFields).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  tweets(user, { minLikes, lastCreatedAt = 0, limit = 10 }, me, resolver = 'user tweets') {
    try {
      const baseQuery = {
        authorId: user._id,
        createdAt: { $gt: lastCreatedAt },
      };
      const authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.Tweet.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  liked(user, { lastCreatedAt = 0, limit = 10 }, me, resolver = 'user liked') {
    try {
      const baseQuery = {
        _id: { $in: user.likedIds },
        createdAt: { $gt: lastCreatedAt },
      };
      const authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.Tweet.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  following(user, { lastCreatedAt = 0, limit = 10 }, me, resolver = 'user following') {
    try {
      const baseQuery = {
        _id: { $in: user.followingIds || [] },
        createdAt: { $gt: lastCreatedAt },
      };
      const authQuery = queryForRoles(me, ['admin'], [], { User: this.context.User }, authlog(resolver, 'readMany', me));
      // role: @authorize(admin: ["create", "read", "update", "delete"], this: ["readOne"]) 
      //                                    ======
      let authFields = {};
      authFields = fieldForRoles(authFields, 'role', me, ['admin'], [], { User: this.context.User }, authlog(resolver + 'field "role"', 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).project(authFields).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  followers(user, { lastCreatedAt = 0, limit = 10 }, me, resolver = 'user followers') {
    try {
      const baseQuery = {
        followingIds: user._id,
        createdAt: { $gt: lastCreatedAt },
      };
      const authQuery = queryForRoles(me, ['admin'], [], { User: this.context.User }, authlog(resolver, 'readMany', me));
      // role: @authorize(admin: ["create", "read", "update", "delete"], this: ["readOne"]) 
      //                                    ======
      let authFields = {};
      authFields = fieldForRoles(authFields, 'role', me, ['admin'], [], { User: this.context.User }, authlog(resolver + 'field "role"', 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.context.User.collection.find(finalQuery).sort({ createdAt: 1 }).project(authFields).limit(limit).toArray();
    } catch (err) { log.error(err.message); }
  }

  createdBy(user, me, resolver = 'user createdBy') {
    return this.context.User.getOneById(user.createdById, me, resolver);
  }

  updatedBy(user, me, resolver = 'user updatedBy') {
    return this.context.User.getOneById(user.updatedById, me, resolver);
  }

  async insert(doc, me, resolver = 'insert user') {
    try {
      let insertedDoc = null;
      let docToInsert = Object.assign({}, doc, {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdById: (me && me._id) ? me._id : 'unknown',
        updatedById: (me && me._id) ? me._id : 'unknown',
      });

      const authQuery = queryForRoles(me, ['admin'], [], { User: this.context.User }, authlog(resolver, 'create', me));
      // role: @authorize(admin: ["create", "read", "update", "delete"], this: ["readOne"]) 
      //                  =====    ======
      docToInsert = authorizedFields(docToInsert, 'role', me, ['admin'], [], { User: this.context.User }, authlog(resolver + 'field "role"', 'create', me));
      
      const id = (await this.collection.insertOne(docToInsert)).insertedId;
      if (!id) {
        log.error('insert user failed for:', JSON.stringify(docToInsert, null, 2));
        throw new Error(`insert user not possible for user ${id}.`);
      }

      log.debug(`inserted user ${id}.`);
      insertedDoc = this.getOneById(id, me, 'pubsub userInserted');
      this.pubsub.publish('userInserted', insertedDoc);
      return insertedDoc;

    } catch (err) { log.error(err.message); }
  }

  async updateById(id, doc, me, resolver = 'update user') {
    try {
      let updatedDoc = null;
      const docBefore = await this.findOneById(id, me, 'user findOneById in updateById for docBefore');
      let docToUpdate = {$set: Object.assign({}, doc, {
            updatedAt: Date.now(),
            updatedById: (me && me._id) ? me._id : 'unknown',
      })};

      const baseQuery = {_id: id};
      const authQuery = queryForRoles(me, ['admin'], ['_id'], { User: this.context.User }, authlog(resolver, 'update', me));
      // role: @authorize(admin: ["create", "read", "update", "delete"], this: ["readOne"]) 
      //                  =====                      ======
      docToUpdate.$set = authorizedFields(docToUpdate.$set, 'role', me, ['admin'], [], { User: this.context.User }, authlog(resolver + 'field "role"', 'update', me));

      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.updateOne(finalQuery, docToUpdate);
      if (result.result.ok !== 1){
        log.error(`update user failed finalQuery:`, JSON.stringify(finalQuery, null, 2));
        log.error('update user failed for docToUpdate:', JSON.stringify(docToUpdate, null, 2));
        throw new Error(`update user not possible for ${id}.`);
      }

      log.debug(`updated user ${id}.`);
      this.unauthorizedLoader.clear(id);
      this.authorizedLoader.clear(id);

      updatedDoc = this.getOneById(id, me, 'pubsub userUpdated')
      this.pubsub.publish('userUpdated', updatedDoc);
      return updatedDoc;

    } catch (err) { log.error(err.message); }
  }

  async removeById(id, me, resolver = 'remove user') {
    try {
      const docBefore = await this.findOneById(id, me, 'user findOneById in removeById for docBefore');
>>>>>>> new authorization version from 2017-07-17
      const baseQuery = {_id: id};
      const authQuery = queryForRoles(me, ['admin'], ['_id'], { User: this.context.User }, authlog(resolver, 'delete', me));
      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.remove(finalQuery);
      if (result.result.ok !== 1 || result.result.n !== 1){
<<<<<<< HEAD
        throw new Error(`remove user not possible for ${id}.`);
      }
      log.debug(`removed user ${id}.`);
      this.authorizedLoader.clear(id);
      this.pubsub.publish('userRemoved', id);
      return result;
=======
        log.error(`remove user failed for finalQuery:`, JSON.stringify(finalQuery, null, 2));
        throw new Error(`remove user not possible for ${id}.`);
      }

      log.debug(`removed user ${id}.`);
      this.unauthorizedLoader.clear(id);
      this.authorizedLoader.clear(id);

      this.pubsub.publish('userRemoved', id);
      return result;

>>>>>>> new authorization version from 2017-07-17
    } catch (err) { log.error(err.message); }
  }
}
```

<<<<<<< HEAD
As you can see in both model header lines, we are using a specialized npm package "create-graphql-server-authorization". 

## create-graphql-server-authorization
Install it with:
```bash
npm install create-graphql-server-authorization
```
[Github: create-graphql-server-authorization](https://github.com/tobkle/create-graphql-server-authorization)

This uses the following functions from that module:

=======
>>>>>>> new authorization version from 2017-07-17
### function authlog
A logging function that understands "resolvers", "modes" and "users". Simple wrapper around whatever logging function we use.

```javascript
<<<<<<< HEAD
/*
 * Central logger for authorization checks
 * @param {string} resolver
 * @param {string} mode
 * @param {object} me
 * @return {
 *    debug {function},
 *    error {function} 
 * }
 */
function authlog(resolver = "", mode = "", me = {}) {
  const logFilename = getLogFilename();
  const log = logger(logFilename);

  const makeMessage = message =>
    `Authorize ${mode} "${resolver}" with user "${me.username
      ? me.username
      : "<no-user>"}" ${message}`;

  return {
    debug: message => {
      const resultMessage = makeMessage(message);
      log.debug(resultMessage);
      return resultMessage;
    },
    error: message => {
      const resultMessage = makeMessage(message);
      log.error(resultMessage);
      throw new Error(makeMessage(message));
    }
=======
// central logger for authorization checks
export function authlog(resolver = '', mode = '', me = {}) {
  const makeMessage = (message) => `Authorize ${mode} "${resolver}" with user "${me.username ? me.username : '<no-user>'}" ${message}`;
  return {
    debug: (message) => log.debug(makeMessage(message)),
    error: (message) => {throw new Error(makeMessage(message))},
>>>>>>> new authorization version from 2017-07-17
  };
}
```

### function findByIds
This is an extended version of [mongo-find-by-ids](https://github.com/tmeasday/mongo-find-by-ids).
The enhancement is only to provide an additional authQuery object, to extend the query to meet additional authorizations.
```javascript
<<<<<<< HEAD
/*
 * find a record by id (cached with dataloader)
 * returns the record, cached if already read, checks authorization if set
 * enhancement of tmeasday'findByIds
 * @param {string, array} docRoleField
 * @param {object} userId
 * @return {boolean} foundUserId
 */
function findByIds(collection, ids = [], authQuery) {
  const baseQuery = { _id: { $in: ids } };
  const finalQuery = { ...baseQuery, ...authQuery };
  return collection.find(finalQuery).toArray().then(docs => {
    const idMap = {};
    docs.forEach(d => {
      idMap[d._id] = d;
    });
    return ids.map(id => idMap[id]);
  });
}

module.exports = findByIds;
```

### function protectFields
Use function protectFields to protect single fields from access. Provide signed in user in "me", the authorized User roles for the protected field(s) - meaning the user who is allowed to access the field -, provide an array with protected fields, and the current document object, which is to be checked for protected fields and the User model context.

```javascript
/*
 * Protects a field based on authorizations
 * @param {object} me
 * @param {array} authorizedUserRoles
 * @param {array} protectedFields
 * @param {object} inputObject
 * @param {object} User
 * @return {object} result
 */
function protectFields(
  me = {},
  authorizedUserRoles = [],
  protectedFields = [],
  inputObject = {},
  { User } = { User: dummyUserContext }
) {
  // pure function
  const result = Object.assign({}, inputObject);

  // getting role of current User
  const role = User.authRole(me);

  // if user is not allowed to access specific fields, remove field from object...
  if (!authorizedUserRoles.includes(role)) {
    protectedFields.forEach(protectedField => {
      if (result[protectedField]) delete result[protectedField];
    });
  }

  return result;
}
```

### function checkAuthDoc
Use function checkAuthDoc to check and get back the document. Especially used in insert operations, to figure out, if the toBeInsertedDoc is valid to be added by this userRole, docRole and action.

```javascript
/*
 * Returns an authorized document
 * @param {object} doc
 * @param {object} me
 * @param {array} userRoles
 * @param {array} docRoles
 * @param {object} User
 * @param {function} logger
 * @return {object} doc
 */

function checkAuthDoc(
  doc = {},
  me = {},
  userRoles = [],
  docRoles = [],
  { User },
  logger = defaultLogger
) {
  let resultDoc = Object.assign({}, doc);

  // get the User's role
  const role = User.authRole(me);

  // check if userRole entitles current user for this action
  if (userRoleAuthorized(me, userRoles, { User }, logger)) {
    logger.debug(`and role: "${role}" is authorized by userRole.`);
    return resultDoc;
  }

  // check if docRole entitles current user for this document and action
  let authorized = false;
  docRoles.every(field => {
    if (
      resultDoc[field] &&
      me._id &&
      fieldContainsUserId(resultDoc[field], me._id)
    ) {
      authorized = true;
    }
  });
  if (authorized) {
    logger.debug(`and role: "${role}" is authorized by docRole.`);
    return resultDoc;
  }

  // Not Authorized, throw exception in logger.error
  logger.error(`and role: "${role}" is not authorized.`);
}
```


### function loggedIn
Use function loggedIn, to check if a user is logged in.

```javascript
/*
 * Checks if an user is logged in
 * @param {object} me
 * @return {boolean} loggedIn
 */

function loggedIn(me) {
  if (me && me._id && me._id.toString() !== "") {
    return true;
  }
  return false;
=======
// returns the record, cached if already read, checks authorization if set
// enhancement of tmeasday'findByIds
export function findByIds(collection, ids = [], authQuery) {
 const baseQuery = { _id: { $in: ids } };
 const finalQuery = {...baseQuery, ...authQuery};
 return collection.find(finalQuery).toArray().then(docs => {
   const idMap = {};
   docs.forEach(d => { idMap[d._id] = d; });
   return ids.map(id => idMap[id]);
 });
>>>>>>> new authorization version from 2017-07-17
}
```

### function loggedIn
Use function loggedIn, to check if a user is logged in.

```javascript
// returns true, if user is logged in
export function loggedIn(me) {
  if(me && me._id && me._id.toString() !== '') {
    return true;
  }
  return false;
}
```

### function fieldAuthorized
User function fieldAuthorized, to check, if a user is allowed to access a specific field e.g. field "role" in the User model.

```javascript
// returns true, if authorized to get field
// returns false, if NOT authorized to get field
export function fieldAuthorized(me = {}, userRoles = [], docRoles = [], { User }, logger){
  // The logged in user's role is authorized for the field
  if (roleAuthorizedForDoc(me, userRoles, docRoles, { User }, logger)) {
    return true;  
  }
  // The user might be listed in any document field
  if (loggedIn(me) && docRoles.length > 0){
    return true;
  }
  return false;
}
```

### function fieldForRoles
Use function fieldForRoles to prepare an authField object, which can be used in db calls, to get only those fields, the user is allowed to access. Use it like...

```javascript 
const authField = fieldForRoles(...)
this.collection.find(finalQuery).sort({ createdAt: 1 }).project(authFields).limit(limit).toArray();
```


```javascript
// returns a projection query of fields not to be shown, e.g. { role: 0 }
export function fieldForRoles(projection, field, me = {}, userRoles = [], docRoles = [], { User }, logger){
  const role = User.authRole(me);
  // The logged in user's role is authorized for the field
  if (roleAuthorizedForDoc(me, userRoles, docRoles, { User }, logger)) {
    return projection;  
  }
  // The user is listed in any document field
  if (loggedIn(me) && docRoles.length > 0){
    return projection;
  }
  const authFields = Object.assign({}, { [field]: 0 }, projection);
  logger.debug(`and role "${role ? role : '<no-role>'}" not authorized to access field "${field}".`)
  return authFields;
}
```

### function authorizedFields
Use function authorizedFields, to filter documents, to contain only the fields, which the user is allowed to access. E.g. pass in a result variable, which can be whether an array of documents or a document. It returns the documents without the field "role", if the user is not allowed to access the field role.

```javascript
// imports a result (which is document or an array of documents), and returns the result,
// but it removes the field without authorization from documents,
// e.g. field "role" is removed from all result documents, if the user/role is not allowed to access it
export function authorizedFields(result, field, me, userRoles = [], docRoles = [], { User }, logger){
  const role = User.authRole(me) || '<no-role>';

  // if any userRole authorizes field
  if (roleAuthorizedForDoc(me, userRoles, docRoles, { User }, logger)) {
    return result;  
  }

  // if any docRole authorizes field
  // The user is listed in any document field
  if (loggedIn(me) && docRoles.length > 0){

    // if the result was an array of documents, check each doc and field
    if (_.isArray(result)){
      const authorizedResult = [];
      // check all documents in the result array
      result.every(doc => {
        let fieldAuthorized = false;
        // check all docRoles if any of them authorizes field
        docRoles.every(docRole => {
          // if one docRole authorizes the field, then fieldAuthorized = true
          if (doc[docRole] && fieldContainsUserId(doc[docRole], me._id)){
            fieldAuthorized = true;
          }
        });
        if (!fieldAuthorized && doc[field]){
          delete doc[field];
          logger.debug(`with role "${role}" field "${field}" removed from document id "${doc._id}". No authorization.`);
        }
        authorizedResult.push(doc);
      });
      return authorizedResult;
    }

    // if the result was a document
    if (_.isObject(result)){
      // check with all docRoles
      let fieldAuthorized = false;
      docRoles.every(docRole => {
        // if one docRole authorizes the field, then fieldAuthorized = true
        if (result[docRole] && fieldContainsUserId(result[docRole], me._id)){
          fieldAuthorized = true;
        }
      });
      if (!fieldAuthorized && result[field]){
        delete result[field];
        logger.debug(`with role "${role}" field "${field}" removed from document id "${result._id}". No authorization.`);
      }
      return result;
    }

  }

  // not authorized to access field
  if (result[field]){
    delete result[field];
    logger.debug(`with role "${role}" field "${field}" removed from document id "${result._id}". No authorization.`);
  }
  return result;
}
```

### function queryForRoles
Use function queryForRoles to generate an authQuery object.

It expects the following arguments:
```javascript
<<<<<<< HEAD
/*
 * Prepare a query object for mongodb operations with authorization queries
 * creates an authQuery object with additional query arguments, to implement authorization restrictions for mongodb access
 * @param {object} me
 * @param {array} userRoles
 * @param {array} docRoles
 * @param {object} inputObject
 * @param {object} User
 * @param {object} logger
 * @return {object, exception} queryObject
 *
 * @example: const authQuery = queryForRoles(me, userRoles, docRoles, { User }, authlog(resolver, mode, me ) ); 
 */
function queryForRoles(
  me = {},
  userRoles = [],
  docRoles = [],
  { User } = { User: dummyUserContext },
  logger = defaultLogger
) {
  // on insufficient authorization data, it cannot be authorized, throws exception
  if (!User || !User.authRole || !me || (!userRoles && !docRoles))
    logger.error(` is not authorized, due to authorization data.`);

  // get current User's role
  const role = User.authRole(me);

  // Build query for the case: The logged in user's role is authorized
  if (userRoleAuthorized(me, userRoles, { User }, logger)) {
    return {}; // empty authQuery means, do operation with no access restrictions
=======
// creates an authQuery object with additional query arguments, to implement authorization restrictions for mongodb access
export function queryForRoles(me = {}, userRoles = [], docRoles = [], { User }, logger) {
  const role = User.authRole(me);

  // Build query for the case: The logged in user's role is authorized
  if (roleAuthorizedForDoc(me, userRoles, docRoles, { User }, logger)) {
    return {};  // empty authQuery means, do operation with no access restrictions
>>>>>>> new authorization version from 2017-07-17
  }

  // Build query for the case: The user is listed in any document field
  const query = { $or: [] };
<<<<<<< HEAD
  // makes only sense, if user is logged in - otherwise no userId
  if (loggedIn(me)) {
    // prepare selection criterias as "authQuery" object
    // for later mongodb "find(...baseQuery,  ...authQuery)"
    //                               ...  AND ...{ field1 OR field2}
    // which will be also considered during the database access
    // as an "$or: [ { field1: userId}, { field2: userId} ]"
    // with all document roles as fields for the later selection.
    // At least one of those fields must match the userId,
    // otherwise, whether no data found or not authorized to access data
    docRoles.forEach(docRole => query.$or.push({ [docRole]: me._id }));
    // return this authQuery only, if there was at least 1 field added
    // otherwise it will result in an unlimited access
    if (query.$or.length > 0) {
      // for easier debugging write into the authorzation logs
      logger.debug(
        `and role: "${role ? role : "<no-role>"}" with 
        authQuery: ${JSON.stringify(query, null, 2)}`
      );
      // return the query as authQuery for later selection
      return query;
    }
  }

  // Not Authorized - throw exception in logger.error
=======
  if (loggedIn(me)){
    docRoles.forEach(docRole => query.$or.push( { [docRole]: me._id } ) );
    logger.debug(`and role: "${role ? role : '<no-role>'}" with \nauthQuery: ${JSON.stringify(query, null, 2)}`);
    if (query.$or.length > 0) return query;
  }

  // Not Authorized
>>>>>>> new authorization version from 2017-07-17
  const message = `and role: "${role}" is not authorized.`;
  logger.error(message);
}
```

It expects the following arguments with the meanings:
* **me:** this is the logged in user object out of the resolver's context
* **userRoles:** an array with userRoles, which was generated by the @authorize directives in the <type>.graphql file
* **docRoles:** an array with docRoles, which was generated by the @authorize directives in the <type>.graphql file
* **User:** User context to access the User model 
<<<<<<< HEAD
* **logger:** logging function e.g. ```js authlog(resolver, mode, me) ```
	* **resolver:** this is a string with the resolver's name, optional, only for easier debugging
=======
* **logger:** logging function e.g. authlog(resolver, mode, me)
>>>>>>> new authorization version from 2017-07-17
	* **mode:** this is the current mode of operation:
		* **create:** insert a record to the database
		* **read:** read a record or many records from the database
			* **readOne:** read only a single record from the database
			* **readMany:** read many records from the the database
		* **update:** update a record in the database
		* **delete:** remove a record from the database
<<<<<<< HEAD
	* **me:** the user object, who is executing the request, and who is checked for authorization

### function userRoleAuthorized
This helper function is used by queryForRoles, and decides, if a user gains the authorization by its role.
For example: If a user has a field "role" in his user document and it contains the value "admin". So it checks if a user's role is admin, and allows all operations for admins.
```javascript
/*
 * Is a user's role authorized for a document
 * @param {object} me
 * @param {array} userRoles
 * @param {object} User
 * @param {object} logger
 * @return {boolean} authorized
 */

// returns true, if the user's role is authorized for a document
function userRoleAuthorized(
  me = {},
  userRoles = [],
  { User } = { User: dummyUserContext },
  logger = defaultLogger
) {
  // on insufficient authorization data, it cannot be authorized
  if (!User || !User.authRole || !me || !userRoles) return false;

  // get current User's role
  const role = User.authRole(me);

  // determine, if the given userRoles authorize the current User by its role
  if (
    // userRole: "world" should authorize everyone - known and unknown users
    userRoles.includes("world") ||
    // or there must be a userRole given, and current user must have a role
    // and the current user's role must be in the given userRoles
    (role && role !== "" && userRoles.length > 0 && userRoles.includes(role))
  ) {
    // => authorized
    logger.debug(`and role "${role ? role : "<no-role>"}" is authorized`);
=======
	* **resolver:** this is a string with the resolver's name, optional, only for easier debugging
	* **me:** the user object, who is executing the request, and who is checked for authorization

### function roleAuthorizedForDoc
This helper function is used by queryForRoles, and decides, if a user gains the authorization by its role.
For example: If a user has a field "role" in his user document and it contains the value "admin". So it checks if a user's role is admin, and allows all operations for admins.
```javascript
// returns true, if the user's role is authorized for a document
export function roleAuthorizedForDoc(me = {}, userRoles = [], docRoles = [], { User }, logger){
  const role = User.authRole(me);

  if ( userRoles.includes('world') || role && userRoles.length > 0 && userRoles.includes(role) ) {
    logger.debug(`and role "${role ? role : '<no-role>'}" is authorized`);
>>>>>>> new authorization version from 2017-07-17
    return true;
  }

  // => not authorized
  return false;
}
```

### function fieldContainsUserId
This helper function is used in the models and checks, if the provided field of types: array, object or string contains the userId.
```javascript
/*
 * checks, if a field contains a user's id
 * returns true, if a field of type array/object/string contains the userId
 * @param {string, object, array} docRoleField
 * @param {string, object} userId
 * @return {boolean} foundUserId
 */
function fieldContainsUserId(docRoleField, compressedUserId) {
  let found = false;

  // empty docRoleField is not a valid docRoleField
  if (!docRoleField || docRoleField === "" || docRoleField.length === 0)
    return false;

  // empty (compressed) userId is not a valid userId
  if (
    !compressedUserId ||
    compressedUserId === "" ||
    compressedUserId.toString() === ""
  )
    return false;

  // extract userId, if it is a mongoID field
  const userId = extractUserId(compressedUserId);

  // empty (uncompressed) userId is not a valid userId
  if (!userId || userId === "") return false;

  // docRoleField of type Array
  if (_.isArray(docRoleField)) {
    docRoleField.forEach(field => {
      if (fieldContainsUserId(field, userId)) {
        found = true;
      }
    });
    if (found) return true;
    return false;
  }

  // docRoleField of type Object
  if (_.isObject(docRoleField)) {
    // For each field in the object
    Object.keys(docRoleField).forEach(field => {
      if (
        fieldContainsUserId(docRoleField[field], userId) ||
        fieldContainsUserId(field, userId)
      ) {
        found = true;
      }
    });
    if (found) return true;
    return false;
  }
<<<<<<< HEAD

  // docRoleField of type field
  if (docRoleField.toString() === userId.toString()) {
    return true;
  }

  return false;
=======
  return found;
>>>>>>> new authorization version from 2017-07-17
}
```

### ./resolver/User.js
In the resolver interfaces, there are different objects:
* the root object "tweet", contains the document fields
* the args object "args", contains arguments from the graphql query/mutation
* the context object "Tweet", contains the access to the database model of the Tweet collection
* the context object "me", contains the current logged in user -if logged in-, which is provided from the server's passport implementation
* the last argument in the resolver function is the resolver's name, which is optional and only to enhance the logging in debugging mode by additional information. If you have to analyze authorization outcomes, this helps a lot to figure out, which resolvers authorization rule fired.

```javascript
<<<<<<< HEAD
    const resolvers = {
     User: {
       id(user) {
         return user._id;
       },

       createdBy(user, args, { User, me }) {
         return User.createdBy(user, me, 'user createdBy');
       },

       updatedBy(user, args, { User, me }) {
         return User.updatedBy(user, me, 'user updatedBy');
       },

       tweets(user, { minLikes, lastCreatedAt, limit }, { User, me }) {
         return User.tweets(user, { minLikes, lastCreatedAt, limit }, me, 'user tweets');
       },

       liked(user, { lastCreatedAt, limit }, { User, me }) {
         return User.liked(user, { lastCreatedAt, limit }, me, 'user liked');
       },

       following(user, { lastCreatedAt, limit }, { User, me }) {
         return User.following(user, { lastCreatedAt, limit }, me, 'user following');
       },

       followers(user, { lastCreatedAt, limit }, { User, me }) {
         return User.followers(user, { lastCreatedAt, limit }, me, 'user followers');
       },
     },
     Query: {
       users(root, { lastCreatedAt, limit }, { User, me }) {
         return User.find({ lastCreatedAt, limit }, me, 'users');
       },

       user(root, { id }, { User, me }) {
         return User.findOneById(id, me, 'user');
       },
     },
     Mutation: {
       async createUser(root, { input }, { User, me }) {
         return await User.insert(input, me, 'createUser');
       },

       async updateUser(root, { id, input }, { User, me }) {
         return await User.updateById(id, input, me, 'updateUser');
       },

       async removeUser(root, { id }, { User, me }) {
         return await User.removeById(id, me, 'removeUser');
       },
     },
     Subscription: {
       userCreated: user => user,
       userUpdated: user => user,
       userRemoved: id => id,
     },
   };

   export default resolvers;
=======
  const resolvers = {
   User: {
     id(user) {
       return user._id;
     },

     createdBy(user, args, { User, me }) {
       return User.createdBy(user, me, 'createdBy');
     },

     updatedBy(user, args, { User, me }) {
       return User.updatedBy(user, me, 'updatedBy');
     },

     tweets(user, { minLikes, lastCreatedAt, limit }, { User, me }) {
       return User.tweets(user, { minLikes, lastCreatedAt, limit }, me, 'tweets');
     },

     liked(user, { lastCreatedAt, limit }, { User, me }) {
       return User.liked(user, { lastCreatedAt, limit }, me, 'liked');
     },

     following(user, { lastCreatedAt, limit }, { User, me }) {
       return User.following(user, { lastCreatedAt, limit }, me, 'following');
     },

     followers(user, { lastCreatedAt, limit }, { User, me }) {
       return User.followers(user, { lastCreatedAt, limit }, me, 'followers');
     },
   },
   Query: {
     users(root, { lastCreatedAt, limit }, { User, me }) {
       return User.all({ lastCreatedAt, limit }, me, 'users');
     },

     user(root, { id }, { User, me }) {
       return User.getOneById(id, me, 'user');
     },
   },
   Mutation: {
     async createUser(root, { input }, { User, me }) {
       return await User.insert(input, me);
     },

     async updateUser(root, { id, input }, { User, me }) {
       return await User.updateById(id, input, me);
     },

     async removeUser(root, { id }, { User, me }) {
       return await User.removeById(id, me, 'removeUser');
     },
   },
   Subscription: {
     userCreated: user => user,
     userUpdated: user => user,
     userRemoved: id => id,
   },
 };

 export default resolvers;
>>>>>>> new authorization version from 2017-07-17
```

### ./resolver/Tweet.js
In the resolver interfaces, there are different objects:
* the root object "tweet", contains the document fields
* the args object "args", contains arguments from the graphql query/mutation
* the context object "Tweet", contains the access to the database model of the Tweet collection
* the context object "me", contains the current logged in user -if logged in-, which is provided from the server's passport implementation
* the last argument in the resolver function is the resolver's name, which is optional and only to enhance the logging in debugging mode by additional information. If you have to analyze authorization outcomes, this helps a lot to figure out, which resolvers authorization rule fired.

```javascript
  const resolvers = {
    Tweet: {
      id(tweet) {
        return tweet._id;
      },

      author(tweet, args, { Tweet, me }) {
<<<<<<< HEAD
        return Tweet.author(tweet, me, 'tweet author');
      },

      createdBy(tweet, args, { Tweet, me }) {
        return Tweet.createdBy(tweet, me, 'tweet createdBy');
      },

      updatedBy(tweet, args, { Tweet, me }) {
        return Tweet.updatedBy(tweet, me, 'tweet updatedBy');
      },

      coauthors(tweet, { lastCreatedAt, limit }, { Tweet, me }) {
        return Tweet.coauthors(tweet, { lastCreatedAt, limit }, me, 'tweet coauthors');
      },

      likers(tweet, { lastCreatedAt, limit }, { Tweet, me }) {
        return Tweet.likers(tweet, { lastCreatedAt, limit }, me, 'tweet likers');
=======
        return Tweet.author(tweet, me, 'author');
      },

      createdBy(tweet, args, { Tweet, me }) {
        return Tweet.createdBy(tweet, me, 'createdBy');
      },

      updatedBy(tweet, args, { Tweet, me }) {
        return Tweet.updatedBy(tweet, me, 'updatedBy');
      },

      coauthors(tweet, { lastCreatedAt, limit }, { Tweet, me }) {
        return Tweet.coauthors(tweet, { lastCreatedAt, limit }, me, 'coauthors');
      },

      likers(tweet, { lastCreatedAt, limit }, { Tweet, me }) {
        return Tweet.likers(tweet, { lastCreatedAt, limit }, me, 'likers');
>>>>>>> new authorization version from 2017-07-17
      },
    },
    Query: {
      tweets(root, { lastCreatedAt, limit }, { Tweet, me }) {
<<<<<<< HEAD
        return Tweet.find({ lastCreatedAt, limit }, me, 'tweets');
      },

      tweet(root, { id }, { Tweet, me }) {
        return Tweet.findOneById(id, me, 'tweet');  
=======
        return Tweet.all({ lastCreatedAt, limit }, me, 'tweets');
      },

      tweet(root, { id }, { Tweet, me }) {
        return Tweet.getOneById(id, me, 'tweet');  
>>>>>>> new authorization version from 2017-07-17
      },
    },
    Mutation: {
      async createTweet(root, { input }, { Tweet, me }) {
<<<<<<< HEAD
        return await Tweet.insert(input, me, 'createTweet');
      },

      async updateTweet(root, { id, input }, { Tweet, me }) {
        return await Tweet.updateById(id, input, me, 'updateTweet');
=======
        return await Tweet.insert(input, me);
      },

      async updateTweet(root, { id, input }, { Tweet, me }) {
        return await Tweet.updateById(id, input, me);
>>>>>>> new authorization version from 2017-07-17
      },

      async removeTweet(root, { id }, { Tweet, me }) {
        return await Tweet.removeById(id, me, 'removeTweet');
      },
    },
    Subscription: {
      tweetCreated: tweet => tweet,
      tweetUpdated: tweet => tweet,
      tweetRemoved: id => id,
    },
  };

  export default resolvers;
```

### Testing
If you run within the project root at least one time, it generates the database and adds the seed tweet and user documents once during each run.
```bash
yarn end-to-end-test
```
It executes many pre-defined tests with different user-roles and document-roles. May be you want to add additional tests to enhance the security of the logic.

If you want to test with the http://localhost:3000/graphiql frontend, best download the following app:
```bash
brew cask install graphiql
```
...and have a look into the file **./test/output-app-end-to-end/scripts/JWTs.txt**, or generate this file by running:
```bash
cd ./test/output-app-end-to-end/scripts
babel-node ./generateJWT.js > JWTs.txt
```
This generates JWT tokens for the different test users from the ./test/seeds/User.json. Copy the wanted JWT token of the different users, and start the GraphiQL app with the following entries:

* GraphQL endpoint: ```http://localhost:3000/graphql```
* Method: ```POST```
* Edit HTTP headers:
  * Header name: ```authorization```
  * Header value: ```JWT the-copied-token``` 

...and write and execute your queries/mutations in the GraphiQL window.

If you use different user's JWT tokens, you can simulate the different user roles such as "admin", "editor" and "user" manually.
