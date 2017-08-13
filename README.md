# Create GraphQL Server

This is a simple scaffolding tool for GraphQL apps, built on MongoDB.

It consists of different commands:

```bash
create-graphql-server init project-dir 
```

Create the basic skeleton of a GraphQL server project. If you `yarn install` inside `project-dir`, you should be able to `npm start` it, and then browse to http://localhost:3010/graphiql to start running queries.

There isn't anything to query yet however!

To add some types, simply run one of the following alternatives:

```bash
create-graphql-server add-type path/to/input.graphql
OR:
create-graphql-server add-type path
```

Where `path/to/input.graphql` is an input GraphQL schema (see below). Or:
Where `path` will add all `type.graphql` files in the given directory path recursively.

To see what a complete generated server looks like, see the `test/output-app` folder. It has been generated from the `test/input` schema inputs.

## Creating types

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

## Authorization

create-graphql-server can also handle authorizations. There are two ways to control authorizations:
* Authorization by User-Roles
* Authorization by Document-Roles

**User-Roles** are stored in the User type. They group a number of users together, having all the same authorizations, defined with their role they play. Use it to define a user as a "super-administrator", "administrator", "publisher", "editor" or a "default-user". You are free to define your own names and numbers of User-Roles.

**Document-Roles** are stored in document fields which are referencing a User._id. They are there, to define fine grained authorizations for individual documents based on single user level. Use it to define an "owner", "creator", author" or "coauthor" of a document. Define the authorization they are allowed to do with this specific document. Here, the userId will be stored in the corresponding document field instead. If a user wants the specific authorization, it is tested, if this userId is stored in the document, if so, he gains access, if not, it is not allowed.

You can combine both models to define your authorization logic.

Add authorization logic by using a simple @authorize directive within your type definition. Use the following syntax:
```javascript
type ...
@authorize(
  <role1>: [<list of authorizations>]
  <role2>: [<list of authorizations>]
  <role3>: [<list of authorizations>]
)
...
<fieldname1>: String @authRole("<role1>")   // User-Role: Stores the Role name in the User type
<fieldname2>: User @authRole("<role2>")     // Document-Role: Stores Single UserId
<fieldname3>: [User] @authRole("<role3>")   // Document-Role: Stores Multiple UserIds
...
```

A \<role\> can be any name, you want to use for, to describe the authorizations of a group of users. A user can be assigned this \<role\> in a user type of any \<fieldname\>. You have to mark the relevant field name with the directive @authRole("\<role\>").

A list of authorizations can be:
* create: role is authorized to create a record of this type.
* read: role is authorized to readOne and readMany of this type.
	* readOne: role is authorized to only readOne of this type.
	* readMany: role is authorized to readMany of this type.
* update: role is authorized to update a record of this type.
* delete: role is authorized to delete a record of this type.

You can add any number of roles within a @authorize directive.

There is one pre-defined User-Role called "world". The world role includes all users, signed-in and not signed-in anonymous users. Use this role to define an authorization-list valid for all users.

#### Example on type User
```javascript
type User

@authorize(
  admin: ["create", "read", "update", "delete"]  // User-Role
  this: ["read", "update", "delete"]             // Document-Role
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

#### Example on type Tweet

```javascript
type Tweet 

@authorize(
  admin: ["create", "read", "update", "delete"],   // User-Role
  world: ["read"]                                  // User-Role
  author: ["create", "read", "update", "delete"],  // Document-Role
  coauthors: ["read", "update"],                   // Document-Role
)

{
  author: User! @unmodifiable @belongsTo @authRole("author")
  coauthors: [User] @belongsTo @authRole("coauthors")
  body: String!

  likers: [User!] @hasAndBelongsToMany(as: "liked")
}
```

If you add these types with the create-graphql-server command-line-interface:
```bash
create-graphql-server add-type path/to/input.graphql 
```

It will add automatically the authorization code in the model/\<type\>.js files. Have a look into the generated code or in the test application: "test/output-app/model/User.js".

You can manually change the code to protect also single fields of a type. Do it by the usage of this function:
```javascript
//                              userRole secretField document
docToInsert = protectFields(me, ['admin'], ['role'], docToInsert, { User: this.context.User });
```
By this, only a User (me) with role "admin" is allowed to access the field "docToInsert.role". For any other user, this field is removed from the docToInsert during the protectFields run.

## Client side code

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
