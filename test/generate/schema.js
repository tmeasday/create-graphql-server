import { describe, it } from 'mocha';
import { assert } from 'chai';
import { print } from 'graphql';

import readInput from '../../generate/read';
import generateSchema from '../../generate/schema';

function normalize(string) {
  return string
    .replace(/#.*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('generateSchema', () => {
  describe('with user test file', () => {
    const input = readInput('./input/user.graphql');

    it('generates correct graphql', () => {
      const schema = generateSchema(input);
      const output = normalize(print(schema));

      const expected = normalize(`
        type User {
          id: ID!
          username: String!
          bio: String

          tweets(lastCreatedAt: Float, limit: Int): [Tweet!]
          liked(lastCreatedAt: Float, limit: Int): [Tweet!]

          following(lastCreatedAt: Float, limit: Int): [User!]
          followers(lastCreatedAt: Float, limit: Int): [User!]

          createdAt: Float!
          updatedAt: Float!
        }

        type Query {
          user(id: ID!): User
        }

        input UserInput {
          username: String!
          bio: String
        }

        type Mutation {
          createUser(input: UserInput!): User
          updateUser(id: ID!, input: UserInput!): User
          removeUser(id: ID!): Boolean
        }

        type Subscription {
          userCreated: User
          userUpdated: User
          userRemoved: ID
        }
      `);

      assert.equal(output, expected);
    });
  });
});
