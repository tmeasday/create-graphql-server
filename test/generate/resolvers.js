import { describe, it } from 'mocha';
import { assert } from 'chai';

import readInput from '../../generate/read';
import generateSchema from '../../generate/schema';
import generateResolvers from '../../generate/resolvers';

function normalize(string) {
  return string
    .replace(/\s+/g, ' ')
    .trim();
}

describe('generateResolvers', () => {
  describe('with user test file', () => {
    const input = readInput('./input/user.graphql');

    it('generates correct JavaScript', () => {
      const schema = generateSchema(input);
      const output = generateResolvers(input, schema);

      const expected = normalize(`
        export { schema } from './user.graphql';

        export const resolvers = {
          User: {
            tweets(user, { lastCreatedAt, limit }, { User }) {
              return User.tweets(user, { lastCreatedAt, limit });
            },
            liked(user, { lastCreatedAt, limit }, { User }) {
              return User.liked(user, { lastCreatedAt, limit });
            },
            following(user, { lastCreatedAt, limit }, { User }) {
              return User.following(user, { lastCreatedAt, limit });
            },
            followers(user, { lastCreatedAt, limit }, { User }) {
              return User.followers(user, { lastCreatedAt, limit });
            },
          },
          Query: {
            user(root, { id }, { User }) {
              return User.findOneById(id);
            },
          },
          Mutation: {
            async createUser(root, { input }, { User }) {
              const id = await User.insert(input);
              return User.findOneById(id);
            },
            async updateUser(root, { id, input }, { User }) {
              await User.updateById(id, input);
              return User.findOneById(id);
            },
            removeUser(root, { id }, { User }) {
              return User.removeById(id);
            },
          },
          Subscription: {
            userCreated: user => user,
            userUpdated: user => user,
            userRemoved: id => id,
          },
        };
      `);

      assert.equal(normalize(output), expected);
    });
  });

  describe('with tweet test file', () => {
    const input = readInput('./input/tweet.graphql');

    it('generates correct JavaScript', () => {
      const schema = generateSchema(input);
      const output = generateResolvers(input, schema);

      const expected = normalize(`
        export { schema } from './tweet.graphql';

        export const resolvers = {
          Tweet: {
            author(tweet, args, { Tweet }) {
              return Tweet.author(tweet);
            },
            likers(tweet, { lastCreatedAt, limit }, { Tweet }) {
              return Tweet.likers(tweet, { lastCreatedAt, limit });
            },
          },
          Query: {
            tweet(root, { id }, { Tweet }) {
              return Tweet.findOneById(id);
            },
          },
          Mutation: {
            async createTweet(root, { input }, { Tweet }) {
              const id = await Tweet.insert(input);
              return Tweet.findOneById(id);
            },
            async updateTweet(root, { id, input }, { Tweet }) {
              await Tweet.updateById(id, input);
              return Tweet.findOneById(id);
            },
            removeTweet(root, { id }, { Tweet }) {
              return Tweet.removeById(id);
            },
          },
          Subscription: {
            tweetCreated: tweet => tweet,
            tweetUpdated: tweet => tweet,
            tweetRemoved: id => id,
          },
        };
      `);

      assert.equal(normalize(output), expected);
    });
  });
});
