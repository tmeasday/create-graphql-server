# Create GraphQL Server

This is a simple scaffolding tool for GraphQL apps, built on MongoDB.

It consists of two commands:

```bash
create-graphql-server init project-dir
```

Create the basic skeleton of a GraphQL server project. If you `yarn install` inside `project-dir`, you should be able to `npm start` it, and then browse to http://localhost:3010/graphiql to start running queries.

There isn't anything to query yet however!

To add some types, simply run:

```bash
create-graphql-server add-type path/to/input.graphql
```

Where `path/to/input.graphql` is an input GraphQL schema (see below).

To see what a complete generated server looks like, see the `test/output-app` folder. It has been generated from the `test/input` schema inputs.


## Creating types

This example is a super simple Twitter clone, with users and tweets, but if you want to experiment, you can add and remove types and fields as you wish.

For example, in `User.graphql`:

```graphql
type User {
  email: String!
  bio: String

  tweets: [Tweet!] @hasMany(as: "author")
  liked: [Tweet!] @belongsToMany

  following: [User!] @belongsToMany
  followers: [User!] @hasAndBelongsToMany(as: "following")
}
```

The directives used control the code generation (see below).

### Directives

- `@unmodifiable` - the field will not appear in the update mutation
- `@enum` - the field's type is an enum, and can be set directly (not just by `Id`).

### Relations

If types reference each other, you should use an association directive to explain to the generator how the reference should be stored in mongo:

#### Singleton fields

If the field references a single (nullable or otherwise) instance of another type, it will be either:

- `@belongsTo` - the foreign key is stored on this type as `${fieldName}Id` [this is the default]
- `@hasOne` - the foreign key is stored on the referenced type as `${typeName}Id`. Provide the `"as": X` argument if the name is different. [NOTE: this is not yet fully implemented].

#### Paginated fields

If the field references an array (again w/ or w/o nullability) of another type, it will be either:

- `@belongsToMany` - there is a list of foreign keys stored on this type as `${fieldName}Ids` [this is the default]
- `@hasMany` - the foreign key is on the referenced type as `${typeName}Id`. Provide the `"as": X` argument if the name is different. (this is the reverse of `@belongsTo` in a 1-many situation).
- `@hasAndBelongsToMany` - the foreign key on the referenced type as `${typeName}Ids`. Provide the `"as": X` argument if the name is different. (this is the reverse of `@belongsToMany` in a many-many situation).

## Authentication

CGS sets up a basic passport-based JWT authentication system for your app.

**NOTE**: you should ensure users connect to your server through SSL.

To use it, ensure you have a GraphQL type called `User` in your schema, with a field `email`, by which users will be looked up. When creating users, ensure that a bcrypted `hash` database field is set. For instance, if you created your users in this way:

```graphql
type User {
  email: String!
  bio: String
}
```

You could update the generated `CreateUserInput` input object to take a `password` field:

```graphql
input CreateUserInput {
  email: String!
  password: String! # <- you need to add this line to the generated output
  bio: String
}
```

And then update the generated `User` model to hash that password and store it:

```js
import bcrypt from 'bcrypt';
// Set this as appropriate
const SALT_ROUNDS = 10;

class User {
  async insert(doc) {
    // We don't want to store passwords plaintext!
    const { password, ...rest } = doc;
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const docToInsert = Object.assign({}, rest, {
      hash,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // This code is unchanged.
    const id = (await this.collection.insertOne(docToInsert)).insertedId;
    this.pubsub.publish('userInserted', await this.findOneById(id));
    return id;
  }
}
```

### Client side code

To create users, simply call your generated `createUser` mutation (you may want to add authorization to the resolver, feel free to modify it).

To login on the client, you make a RESTful request to `/login` on the server, passing `email` and `password` in JSON. You'll get a JWT token back, which you should attach to the `Authorization` header of all GraphQL requests.

Here's some code to do just that:

```js
const KEY = 'authToken';
let token = localStorage.getItem(KEY);

const networkInterface = createNetworkInterface(/* as usual */);
networkInterface.use([
  {
    applyMiddleware(req, next) {
      req.options.headers = {
        authorization: token ? `JWT ${token}` : null,
        ...req.options.headers,
      };
      next();
    },
  },
]);

// Create your client as usual and pass to a provider
const client = /*...*/

// Call this function from your login form, or wherever.
const login = async function(serverUrl, email, password) {
  const response = await fetch(`${serverUrl}/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  token = data.token;
  localStorage.setItem(KEY, token);
}
```

## Development

### Running code generation tests

You can run some basic code generation tests with `npm test`.

### Testing full app code generation

A simple test to check that using the `test/input` input files with the CGS scripts generates `test/output-app` can be run with `npm run output-app-generation-test`.

### Running end-to-end tests

You can run a set of end-to-end tests of the user/tweet app (which lives in `test/output-app`) with `npm run end-to-end-test`. This will seed the database, and run against a running server.

The test files are in `test/output-app-end-to-end`.

You need to start the standard server with `cd test/output-app; npm start`, then run `npm run end-to-end-test`.


### Creating seed database

If you need to change the fixtures for the test db

Start the server, then run
```bash
mongoexport --host 127.0.0.1:3002 --db database --collection user > seeds/User.json
mongoexport --host 127.0.0.1:3002 --db database --collection tweet > seeds/Tweet.json
```
