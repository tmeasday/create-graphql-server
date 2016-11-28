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

        input CreateUserInput {
          username: String!
          bio: String
        }

        input UpdateUserInput {
          username: String!
          bio: String
        }

        type Mutation {
          createUser(input: CreateUserInput!): User
          updateUser(id: ID!, input: UpdateUserInput!): User
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

  describe('with tweet test file', () => {
    const input = readInput('./input/tweet.graphql');

    it('generates correct graphql', () => {
      const schema = generateSchema(input);
      const output = normalize(print(schema));

      const expected = normalize(`
        type Tweet {
          id: ID!
          author: User!
          body: String!

          likers(lastCreatedAt: Float, limit: Int): [User!]

          createdAt: Float!
          updatedAt: Float!
        }

        # We are "re-opening" the root types to add these fields
        type Query {
          tweet(id: ID!): Tweet
        }

        input CreateTweetInput {
          authorId: ID!
          body: String!
        }

        input UpdateTweetInput {
          # XXX: should this be required?
          body: String!
        }

        type Mutation {
          createTweet(input: CreateTweetInput!): Tweet
          updateTweet(id: ID!, input: UpdateTweetInput!): Tweet
          removeTweet(id: ID!): Boolean
        }

        type Subscription {
          tweetCreated: Tweet
          tweetUpdated: Tweet
          tweetRemoved: ID
        }
      `);

      assert.equal(output, expected);
    });
  });
});
