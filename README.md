# CGA output

This is a in-memory version of the `create-graphql-server` tool.

In this version, you create a set of input schemas in the `input/` directory, then start the server with `npm start`. It will then generate all the code it would write out, and eval it and start serving.

To see what the generated code would actually look like, see the `output` branch.


## Creating types

This example is a super simple Twitter clone, with users and tweets, but if you want to experiment, you can add and remove types and fields as you wish.

For example, in `user.graphql`:

```graphql
type User {
  username: String!
  bio: String

  tweets: [Tweet!] @hasMany(as: "author")
  liked: [Tweet!] @belongsToMany

  following: [User!] @belongsToMany
  followers: [User!] @hasAndBelongsToMany(as: "following")
}
```

The directives used control the code generation (see below).

### Relations

If types reference each other, you should use an association directive to explain to the generator how the reference should be stored in mongo:

#### Singleton fields

If the field references a single (nullable or otherwise) instance of another type, it will be either:

- `@belongsTo` - the foreign key is stored on this type as `${fieldName}Id` [this is the default]
- `@hasOne` - the foreign key is stored on the referenced type as `{typeName}Id`. Provide the `"as": X` argument if the name is different. [NOTE: this is not yet fully implemented].

#### Paginated fields

If the field references an array (again w/ or w/o nullability) of another type, it will be either:

- `@belongsToMany` - there is a list of foreign keys stored on this type as `${fieldName}Ids` [this is the default]
- `@hasMany` - the foreign key is on the referenced type as `{typeName}Id`. Provide the `"as": X` argument if the name is different. (this is the reverse of `@belongsTo` in a 1-many situation).
- `@hasAndBelongsToMany` - the foreign key on the referenced type as `{typeName}Ids`. Provide the `"as": X` argument if the name is different. (this is the reverse of `@belongsToMany` in a many-many situation).

## Development

### Running end-to-end tests

You can run a set of end-to-end tests of the user/tweet app with `npm run end-to-end-test`. This will seed the database, and run against a running server.

You need to start the standard server with `npm start`, then run `npm run end-to-end-test`.

### Running code generation tests

You can run some basic code generation tests with `npm test`.

### Creating seed database

If you need to change the fixtures for the test db

Start the server, then run
```bash
mongoexport --host 127.0.0.1:3002 --db database --collection user > seeds/user.json
mongoexport --host 127.0.0.1:3002 --db database --collection tweet > seeds/tweet.json
```
