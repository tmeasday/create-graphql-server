# create-graphql-server
This is a generated create-graphql-server app.

* Authentication: Identifies an user
* Authorization: Defines all actions a user is allowed to perform

## Implementing Authentication
The authentication is performed in those locations:
* ./server/index.js
* ./model/index.js
* ./server/authenticate.js

### ./server/index.js
In the server, the database is started, and the UserCollection is defined. That's who the server accesses the user documents in the database.

In ```js authenticate(app, UserCollection)``` the authentication is prepared and processed. Later if a user sends a 'graphql' request, the user is determined with ```js passport.authenticate(...)```. After that, the user is  whether an anonymous user or an authenticated user. You find the identified user in the object "me". Then the type models have to be initialized with the user "me" authorizations: ```js req.context = addModelsToContext({... me ...})```.

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
          formatError(e) { 
          	console.log(e);
          	return e;
          },
        };
      })(req, res, next);
    })(req, res, next);
  });
  ...
}
```

### ./model/index.js
If there is a User model generated, then we load it as the first model. It defines the model, which will be used in the other models as well, to perform the authorization checks.

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
Here the real identification of an user is performed. After a user requested a '/login' with user and password. The user's email is searched in the database. If it is there, it checks if the user's encrypted hash is equal to the encrypted password, if so, a user is identified and a JWT token is generated and transfered back to the requesting user. With all the next requests of that user, he sends an header like...
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
import { findByIds } from './authorize';

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

On field level you can control access also by the @authorize directive
e.g. updating the User with set role = "admin", shouldn't be allowed by for all users. So we need a way to restrict the create, read, update, delete operations also on field level if required.

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
* user-roles: "admin", "world" are created (user roles don't have own fields of type User or [User] in the document)
  This will check, if the logged in user has a role "admin". Or if there is a special role "world", which just means every known or unknown user, for "world" you don't have to be logged in.
  So each "admin" user will be able to create, read, update or delete the Tweet document.
  Everyone ("world") will be allowed to read all Tweets.
* document-roles: "author", "coauthors" are created (document roles have fields in the document)
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
  role: String @authRole("admin") 
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
* user-role: "admin", is created (user roles don't have own fields of type User or [User] in the document)
  It is a String field with: **role: String! @authRole("admin")**
  This will check, if the logged in user has a role "admin".
  So each "admin" user will be able to create, read, update or delete any User document.
* document-role: "this", is created (document roles have own fields in the document, but this is a special case for the field _id, which is not shown in the input type, but will be generated in the later schema file.)
  Only the user id of "this" meaning _id is allowed  to readOne, update, delete its single User document.

Use create-graphql-server cli to generate the according schema, resolver, model files with the create-graphql-server command line interface. After its generation, you will find the generated files in the sub folders: schema, resolvers, model folders. The generated model files will use the following functions to implement the authorization logic.

### <type> model.js
This is an example of a database model of type <type>.

```javascript
import DataLoader from 'dataloader';
import { queryForRoles, findByIds } from '../server/authorize';

export default class <Type> {
	constructor(context) {
      ...
	  let authQuery;
	  try {
	    const { me, User } = context;
	    authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User }, authlog('tweet findOneById', 'readOne', me));
	  } catch (err) { 
	    log.error(err.message);
	    authQuery = {_id: false}; // otherwise admin access
	  }
	  this.authorizedLoader = new DataLoader(ids => findByIds(this.collection, ids, authQuery));
	}
...
async findOneById(id, me, resolver) {
  try {
    return await this.authorizedLoader.load(id);
  } catch (err) { log.error(err.message); }
}

find({ lastCreatedAt = 0, limit = 10, baseQuery = { createdAt: { $gt: lastCreatedAt } } }, me, resolver) {
  try {
    const authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readMany', me));
    const finalQuery = {...baseQuery, ...authQuery};
    return this.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
  } catch (err){ log.error(err.message); }
}
...
}
```

### ./model/Tweet.js
generated model file for the above input type Tweet.graphql:
this.auth is generated by the @authorize directive. You can see, the directive argument "read" is used to express "readOne" and "readMany" at the same time. Instead you can use "readOne" and "readMany" for fine grained control on read operations, to allow access to just one record or many records.
```javascript
import log from '../server/logger';
import DataLoader from 'dataloader';
import { findByIds, queryForRoles, authlog, checkAuthDoc } from '../server/authorize';

export default class Tweet {
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('tweet');
    this.pubsub = context.pubsub;
    let authQuery;
    try {
      const { me, User } = context;
      authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User }, authlog('tweet findOneById', 'readOne', me));
    } catch (err) { 
      log.error(err.message);
      authQuery = {_id: false}; // otherwise admin access
    }
    this.authorizedLoader = new DataLoader(ids => findByIds(this.collection, ids, authQuery));
  }

  async findOneById(id, me, resolver) {
    try {
      return await this.authorizedLoader.load(id);
    } catch (err) { log.error(err.message); }
  }

  find({ lastCreatedAt = 0, limit = 10, baseQuery = { createdAt: { $gt: lastCreatedAt } } }, me, resolver) {
    try {
      const authQuery = queryForRoles(me, ['admin', 'world'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'readMany', me));
      const finalQuery = {...baseQuery, ...authQuery};
      return this.collection.find(finalQuery).sort({ createdAt: 1 }).limit(limit).toArray();
    } catch (err){ log.error(err.message); }
  }

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
    const baseQuery = {_id: { $in: tweet.coauthorsIds }, createdAt: { $gt: lastCreatedAt } };
    return this.context.User.find({ lastCreatedAt, limit, baseQuery }, me, resolver);
  }

  likers(tweet, { lastCreatedAt = 0, limit = 10 }, me, resolver) {
    const baseQuery = {likedIds: tweet._id, createdAt: { $gt: lastCreatedAt } };
    return this.context.User.find({ lastCreatedAt, limit, baseQuery }, me, resolver);
  }

  async insert(doc, me, resolver) {
    try {
      let docToInsert = Object.assign({}, doc, {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdById: (me && me._id) ? me._id : 'unknown',
          updatedById: (me && me._id) ? me._id : 'unknown',
      });
      log.debug(JSON.stringify(docToInsert, null, 2));
      // const authQuery = queryForRoles(me, ['admin'], ['authorId'], { User: this.context.User }, authlog(resolver, 'create', me));
      checkAuthDoc(docToInsert, me, ['admin'], ['authorId'], { User: this.context.User }, authlog(resolver, 'create', me));
      const id = (await this.collection.insertOne(docToInsert)).insertedId;
      if (!id) {
        throw new Error(`insert tweet not possible.`);
      }
      log.debug(`inserted tweet ${id}.`);
      const insertedDoc = this.findOneById(id, me, 'pubsub tweetInserted');
      this.pubsub.publish('tweetInserted', insertedDoc);
      return insertedDoc;
    } catch (err){ log.error(err.message); }
  }

  async updateById(id, doc, me, resolver) {
    try {
      let docToUpdate = {$set: Object.assign({}, doc, {
            updatedAt: Date.now(),
            updatedById: (me && me._id) ? me._id : 'unknown',
      })};
      const baseQuery = {_id: id};
      const authQuery = queryForRoles(me, ['admin'], ['authorId', 'coauthorsIds'], { User: this.context.User }, authlog(resolver, 'update', me));
      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.updateOne(finalQuery, docToUpdate);
      if (result.result.ok !== 1 || result.result.n !== 1){
        throw new Error(`update tweet not possible for ${id}.`);
      }
      log.debug(`updated tweet ${id}.`);
      this.authorizedLoader.clear(id);
      const updatedDoc = this.findOneById(id, me, 'pubsub tweetUpdated');
      this.pubsub.publish('tweetUpdated', updatedDoc);
      return updatedDoc;
    } catch (err){ log.error(err.message); }
  }

  async removeById(id, me, resolver) {
    try {
      const baseQuery = {_id: id};
      const authQuery = queryForRoles(me, ['admin'], ['authorId'], { User: this.context.User }, authlog(resolver, 'delete', me));
      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.remove(finalQuery);
      if (result.result.ok !== 1 || result.result.n !== 1){
        throw new Error(`remove tweet not possible for ${id}.`);
      }
      log.debug(`removed tweet ${id}.`);
      this.authorizedLoader.clear(id);
      this.pubsub.publish('tweetRemoved', id);
      return result;
    } catch (err){ log.error(err.message); }
  }
}

```

### ./model/User.js
generated model file for the above input type User.graphql:
this.auth is generated by the @authorize directive. Here also with field authorizations.

```javascript
import log from '../server/logger';
import DataLoader from 'dataloader';
import { findByIds, queryForRoles, authlog, checkAuthDoc, protectFields } from '../server/authorize';

export default class User {
  constructor(context) {
    this.context = context;
    this.collection = context.db.collection('user');
    this.pubsub = context.pubsub;
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
  }

  static authRole(user){
    return (user && user.role) ? user.role : null;
  }

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
      docToInsert = this.protectFields(me, ['admin'], ['role'], docToInsert, { User: this.context.User });
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
      docToUpdate.$set = this.protectFields(me, ['admin'], ['role'], docToUpdate.$set, { User: this.context.User });
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
      const baseQuery = {_id: id};
      const authQuery = queryForRoles(me, ['admin'], ['_id'], { User: this.context.User }, authlog(resolver, 'delete', me));
      const finalQuery = {...baseQuery, ...authQuery};
      const result = await this.collection.remove(finalQuery);
      if (result.result.ok !== 1 || result.result.n !== 1){
        throw new Error(`remove user not possible for ${id}.`);
      }
      log.debug(`removed user ${id}.`);
      this.authorizedLoader.clear(id);
      this.pubsub.publish('userRemoved', id);
      return result;
    } catch (err) { log.error(err.message); }
  }
}
```

### function authlog
A logging function that understands "resolvers", "modes" and "users". Simple wrapper around whatever logging function we use.

```javascript
// central logger for authorization checks
export function authlog(resolver = '', mode = '', me = {}) {
  const makeMessage = (message) => `Authorize ${mode} "${resolver}" with user "${me.username ? me.username : '<no-user>'}" ${message}`;
  return {
    debug: (message) => log.debug(makeMessage(message)),
    error: (message) => {throw new Error(makeMessage(message))},
  };
}
```

### function findByIds
This is an extended version of [mongo-find-by-ids](https://github.com/tmeasday/mongo-find-by-ids).
The enhancement is only to provide an additional authQuery object, to extend the query to meet additional authorizations.
```javascript
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
}
```

### function protectFields
Use function protectFields to protect single fields from access. Provide signed in user in "me", the authorized User roles for the protected field(s) - meaning the user who is allowed to access the field -, provide an array with protected fields, and the current document object, which is to be checked for protected fields and the User model context.

```javascript
// returns whether the authorized record, or the record without not authorized field(s)
export function protectFields(me, authorizedUserRoles, protectedFields, inputObject, { User }){
  const result = Object.assign({}, inputObject);
  const role = User.authRole(me);
  // if user is not allowed to access specific fields, remove field from object...
  if (!authorizedUserRoles.includes(role)){
    protectedFields.every(protectedField => {
      if (result[protectedField]) delete result[protectedField];
    });
  }
  return result;
}
```

### function checkAuthDoc
Use function checkAuthDoc to check and get back the document. Especially used in insert operations, to figure out, if the toBeInsertedDoc is valid to be added by this userRole, docRole and action.

```javascript
export function checkAuthDoc(doc, me, userRoles, docRoles, { User }, logger){
  const role = User.authRole(me);

  // check if userRole entitles current user for this action
  if (userRoleAuthorized(me, userRoles, { User }, logger)) {
    logger.debug(`and role: "${role}" is authorized by userRole.`);
    return doc;
  }

  // check if docRole entitles current user for this document and action
  let authorized = false;
  docRoles.every(field => {
    if (fieldContainsUserId(doc[field], me._id)){
      authorized = true;
    }
  })
  if (authorized) {
    logger.debug(`and role: "${role}" is authorized by docRole.`);
    return doc;
  }

  // Not Authorized
  logger.error(`and role: "${role}" is not authorized.`);
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

### function queryForRoles
Use function queryForRoles to generate an authQuery object.

It expects the following arguments:
```javascript
// creates an authQuery object with additional query arguments, to implement authorization restrictions for mongodb access
export function queryForRoles(me = {}, userRoles = [], docRoles = [], { User }, logger) {
  const role = User.authRole(me);

  // Build query for the case: The logged in user's role is authorized
  if (userRoleAuthorized(me, userRoles, { User }, logger)) {
    return {};  // empty authQuery means, do operation with no access restrictions
  }

  // Build query for the case: The user is listed in any document field
  const query = { $or: [] };
  if (loggedIn(me)){
    docRoles.forEach(docRole => query.$or.push( { [docRole]: me._id } ) );
    logger.debug(`and role: "${role ? role : '<no-role>'}" with \nauthQuery: ${JSON.stringify(query, null, 2)}`);
    if (query.$or.length > 0) return query;
  }

  // Not Authorized
  const message = `and role: "${role}" is not authorized.`;
  logger.error(message);
}
```

It expects the following arguments with the meanings:
* **user:** this is the logged in user object out of the resolver's context
* **userRoles:** an array with userRoles, which was generated by the @authorize directives in the <type>.graphql file
* **docRoles:** an array with docRoles, which was generated by the @authorize directives in the <type>.graphql file
* **User:** User context to access the User model 
* **logger:** logging function e.g. authlog(resolver, mode, me)
	* **mode:** this is the current mode of operation:
		* **create:** insert a record to the database
		* **read:** read a record or many records from the database
			* **readOne:** read only a single record from the database
			* **readMany:** read many records from the the database
		* **update:** update a record in the database
		* **delete:** remove a record from the database
	* **resolver:** this is a string with the resolver's name, optional, only for easier debugging
	* **me:** the user object, who is executing the request, and who is checked for authorization

### function userRoleAuthorized
This helper function is used by queryForRoles, and decides, if a user gains the authorization by its role.
For example: If a user has a field "role" in his user document and it contains the value "admin". So it checks if a user's role is admin, and allows all operations for admins.
```javascript
// returns true, if the user's role is authorized for a document
export function userRoleAuthorized(me = {}, userRoles = [], { User }, logger){
  const role = User.authRole(me);

  if ( userRoles.includes('world') || role && userRoles.length > 0 && userRoles.includes(role) ) {
    logger.debug(`and role "${role ? role : '<no-role>'}" is authorized`);
    return true;
  }

  return false;
}
```

### function fieldContainsUserId
This helper function is used in the models and checks, if the provided field of types: array, object or string contains the userId.
```javascript
// returns true, if a field of type array/object/string contains the userId
export function fieldContainsUserId(docRoleField, userId) {
  let found = false;

  // empty userId is not a valid userId
  if (userId.toString() === '') return false;

  // handle a simple id field
  if (docRoleField.toString() === userId.toString()){
    return true;
  }

  // handle an array
  if (_.isArray(docRoleField)){
    docRoleField.every(field => {
       if (fieldContainsUserId(field, userId)) {
        found = true;
        return true;
       }
    });
    if (found) return true;
  }

  // handle an object
  if (_.isObject(docRoleField)){
    Object.keys(docRoleField).every(field => {

      // handle a field
      if (docRoleField[field] && docRoleField[field].toString() === userId.toString()){
        found = true;
        return true;
      }

      // handle an array
      if (_.isArray(docRoleField[field])){
        docRoleField[field].every(innerField  => {
           if (fieldContainsUserId(innerField, userId)) {
            found = true;
            return true;
           }
        })
        if (found) return true;
      }

      // handle an object 
      if (_.isObject(docRoleField[field])){
        Object.keys(docRoleField[field]).every(innerField => {
           if (fieldContainsUserId(docRoleField[field][innerField], userId)) {
            found = true;
            return true;
           }
        });
        if (found) return true;
      }

    });

  }
  return found;
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
      },
    },
    Query: {
      tweets(root, { lastCreatedAt, limit }, { Tweet, me }) {
        return Tweet.find({ lastCreatedAt, limit }, me, 'tweets');
      },

      tweet(root, { id }, { Tweet, me }) {
        return Tweet.findOneById(id, me, 'tweet');  
      },
    },
    Mutation: {
      async createTweet(root, { input }, { Tweet, me }) {
        return await Tweet.insert(input, me, 'createTweet');
      },

      async updateTweet(root, { id, input }, { Tweet, me }) {
        return await Tweet.updateById(id, input, me, 'updateTweet');
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

