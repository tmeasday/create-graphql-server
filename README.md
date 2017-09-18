# Create GraphQL Server

*Create-graphql-server* is a scaffolding tool that lets you generate a new Mongo/Express/Node.js GraphQL server project from the command line. After generating the project you can also generate code to support your GraphQL schema directly from the schema files. Basic authentication support is included via Passport Local with JWTs. 

## Getting Started

### Installation

Install it once globally:
```bash
npm install -g create-graphql-server
```

### Creating a Server
To create a new server in the *my-new-server-dir* folder use the *init* command:
```bash
create-graphql-server init my-new-server-dir
cd my-new-server-dir
yarn install
```

### Starting the Server
In most development environments you can now fire up your new server using the packaged [prebuilt Mongo server](https://github.com/winfinit/mongodb-prebuilt):

```bash
yarn start
```

If [mongo-prebuilt](https://github.com/winfinit/mongodb-prebuilt) fails to start, or you'd rather use another [MongoDB installation](https://docs.mongodb.com/manual/installation/) for development, simply set the `MONGO_URL` environment variable when you start the server, as follows:

```bash
# On Windows:
SET MONGO_URL=mongodb://localhost:27017&&yarn start

# On Unix/OSX:
MONGO_URL=mongodb://localhost:27017 yarn start
```

If you set up a username, password or a different port for Mongo, or are accessing Mongo through a service such as [mLab](https://mlab.com/), correct the MONGO_URL above to reflect that.

## Running Queries

Your server is now up and running. To query it, point your browser at [http://localhost:3010/graphiql](http://localhost:3010/graphiql). There isn't anything to query yet however. 

## Adding Types: Overview
To add types, you can define them in GraphQL schema files, then generate code for them using the *add-type* command, as follows:
```bash
create-graphql-server add-type path/to/my-new-type.graphql
```
If you have a folder full of schema files, you can add them all at once by pointing *add-type* to a folder instead of an individual schema file:
```bash
create-graphql-server add-type path
```
Sample schema files are included in [`test/input`](https://github.com/tmeasday/create-graphql-server/tree/master/test/input). To see what a complete generated server looks like using them, check out [`test/output-app`](https://github.com/tmeasday/create-graphql-server/tree/master/test/output-app).

## Schemas

You create a GraphQL type for your schema by specifying the type as input, with some special code-generation controlling directives.

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

The above will generate a User type which is linked to other users and a tweet type via foriegn keys and which will have mutations to add, update and remove users, as well as some root queries to find a single user or all users.

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

## Updating types

To update types, just re-run add-type again:

```bash
create-graphql-server add-type path/to/input.graphql [--force-update]
```

This overwrites your old *type* specific files from the directories: schema, model, resolvers.

It recognizes, if you've changed any code file, which will be overwritten by the generator and stops and warns. If you are sure, you want to overwrite your changes, then just use the *--force-update* option.

## Removing types

To remove types, use the following command with the path to the GraphQL file, or as alternative, just enter the type name without path.

```bash
create-graphql-server remove-type path/to/input.graphql

create-graphql-server remove-type typename

create-graphql-server remove-type path
```

This command deletes your old *type* specific files from the directories: schema, model, resolvers. It also removes the code references out of the corresponding index files.

It recognizes, if you've changed any code file, which will be overwritten by the generator and stops and warns. If you are sure, you want to overwrite your changes, then just use the *force-update* option.

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

## Maintenance

As this is a code generator, and not a library, once you run the code, you are on your own :)

By which I mean, you should feel free to read the generated code, understand it, and modify it as you see fit. Any updates to CGS will just affect future apps that you generate.

If you'd like to see improvements, or find any bugs, by all means report them via the issues, and send PRs. But workarounds should be always be possible simply by patching the generated code.
