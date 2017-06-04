import { describe, it } from 'mocha';
import { assert } from 'chai';
import { sendQuery, sendQueryAndExpect, roleUser, adminUser } from './sendQuery';

let newUser;
let tweetId;
const tweetIdOthers = '583676d3618530145474e352';

function makeUserInput(user) {
  return `{
    username: "${user.username}",
    bio: "${user.bio}",
    role: "${user.role}"
  }`;
}

function makeTweetInput(tweet, userId) {
  if (tweet.author) {
    return `{
      authorId: "${userId ? userId : tweet.author.id}",
      body: "${tweet.body}"
    }`;
  }
  return `{
    body: "${tweet.body}"
  }`;
}

describe('test-6: user with role "editor"', () => {

  before(function(done) {
      const expectedUser = {
        username: 'tobkle',
        bio: 'someone',
        role: 'editor'
      };
      sendQuery({query: `
              mutation {
                createUser(input: ${makeUserInput(expectedUser)}) {
                  id
                  role
                }
              }
            `, 
            userId: adminUser
      })
      .then(result => {
        assert.isNotNull(result.data);
        assert.isNotNull(result.data.createUser);
        assert.isNotNull(result.data.createUser.id);
        assert.equal(result.data.createUser.role, 'editor');
        newUser = result.data.createUser.id;
        done();
      })
  });
  
  describe('on type "user" (part 1)...', () => {

    it('admin user created new user "tobkle" with role "editor" for the next tests...', () => {
      assert.isNotNull(newUser);
    });

    it('can not create users', () => {
      const expectedUser = {
        username: 'zol',
        bio: 'Maker of apps, product and engineering. Climber. Cyclist. Enthusiast. Product lead',
        role: 'editor'
      };
      return sendQuery({query: `
        mutation {
          createUser(input: ${makeUserInput(expectedUser)}) {
            id
          }
        }
      `, 
      userId: newUser
      })
      .then((result) => {
        assert.isNotNull(result.data);
        assert.isNull(result.data.createUser);
      })
    });

    it('can not read other users', () => {
      return sendQueryAndExpect(`
        { user(id: "${adminUser}") { username, bio, role } }
      `, { 
          user: null
       },
      newUser)
    });

    it('can read himself', () => {
      return sendQueryAndExpect(`
        { user(id: "${newUser}") { username, role } }
      `, { 
          user: {
            username: 'tobkle',
            role: 'editor'
          }
       },
      newUser)
    });

    it('can not update other users', () => {
        const modifiedUser = {
          username: 'zoltan',
          bio: 'Maker of things, I guess',
          role: 'admin'
        };
        return sendQueryAndExpect(`
          mutation {
            updateUser(id: "${adminUser}", input: ${makeUserInput(modifiedUser)}) {
              username
              bio
              role
            }
          }
        `, { updateUser: null },
        newUser)
    });

    it('can update himself', () => {
        const modifiedUser = {
          username: 'tmeasday',
          bio: 'Maker of things, I guess',
          role: 'editor'
        };
        return sendQueryAndExpect(`
          mutation {
            updateUser(id: "${newUser}", input: ${makeUserInput(modifiedUser)}) {
              username
              bio
              role
            }
          }
        `, { 
            updateUser: {
              username: 'tmeasday',
              bio: 'Maker of things, I guess',
              role: 'editor'
            }
         },
        newUser)
    });

    it('can not update his role', () => {
        const modifiedUser = {
          username: 'tmeasday',
          bio: 'Maker of things, I guess',
          role: 'admin'
        };
        return sendQueryAndExpect(`
          mutation {
            updateUser(id: "${newUser}", input: ${makeUserInput(modifiedUser)}) {
              username
              bio
              role
            }
          }
        `, { 
            updateUser: {
              username: 'tmeasday',
              bio: 'Maker of things, I guess',
              role: 'editor'
            }
         },
        newUser)
    });

    it('can not delete other users', () => {
        return sendQueryAndExpect(`
          mutation {
            removeUser(id: "${adminUser}")
          }
        `, { 
            removeUser: null
         },
        newUser)
    });

  });

  describe('on type "tweet"...', () => {

    let expectedTweet = {
      author: { id: newUser },
      body: 'This is a test tweet of user tobkle',
    };

    const expectedTweetOtherAuthor = {
      author: { id: adminUser },
      body: 'We put our hearts into this talk about a #GraphQL-first workflow and how it helped us build apps fast:',
    };

    const expectedTweetOtherAuthorNoAuthor = {
      author: null,
      body: 'We put our hearts into this talk about a #GraphQL-first workflow and how it helped us build apps fast:',
    };

    const modifiedTweet = {
      body: 'This is a modified test tweet',
    };

    before(function (done) {
      expectedTweet.author.id = newUser;
      sendQuery({ query: `
        mutation {
          createTweet(input: ${makeTweetInput(expectedTweet, newUser)}) {
            id
          }
        }
      `, 
      userId: newUser
      })
      .then((result) => {
        assert.isNotNull(result.data);
        assert.isNotNull(result.data.createTweet);
        assert.isNotNull(result.data.createTweet.id);
        tweetId = result.data.createTweet.id;
        done();
      })
    });

    it('can create tweet for himself', () => {
      assert.isNotNull(tweetId);
    });

    it('can not create tweet for other author', () => {
      return sendQueryAndExpect(`
        mutation {
          createTweet(input: ${makeTweetInput(expectedTweetOtherAuthor, adminUser)}) {
            id
          }
        }
        `, 
        { createTweet: null },
        newUser);
    });

    it('can read own tweet', () => {
      expectedTweet.author.id = newUser;
      return sendQueryAndExpect(
          `{ tweet(id: "${tweetId}") { author { id } body } }`,
          { tweet: expectedTweet },
          newUser)
    });

    it('can read others tweet', () => {
      return sendQueryAndExpect(
          `{ tweet(id: "${tweetIdOthers}") { author { id } body } }`,
          { tweet: expectedTweetOtherAuthorNoAuthor },
          newUser)
    });

    it('can update own tweet', () => {
      return sendQueryAndExpect(`
          mutation {
            updateTweet(id: "${tweetId}", input: ${makeTweetInput(modifiedTweet, newUser)}) {
              body
            }
          }
        `, 
        { updateTweet: modifiedTweet },
        newUser)
    });

    it('can not update others tweet', () => {
      return sendQueryAndExpect(`
          mutation {
            updateTweet(id: "${tweetIdOthers}", input: ${makeTweetInput(modifiedTweet)}) {
              body
            }
          }
        `, 
        { updateTweet: null },
        newUser)
    });

    it('can read updated tweet correctly', () => {
      return sendQueryAndExpect(
        `{ tweet(id: "${tweetId}") { body } }`,
        { tweet: modifiedTweet },
        newUser)
    });

    it('can remove own tweet', () => {
      return sendQueryAndExpect(
          `mutation { removeTweet(id: "${tweetId}") }`,
          { removeTweet: true },
          newUser)
    });

    it('can not remove other users tweet', () => {
      return sendQueryAndExpect(
          `mutation { removeTweet(id: "${tweetIdOthers}") }`,
          { removeTweet: null },
          newUser)
    });

    it('can not read removed tweet anymore', () => {
      return sendQueryAndExpect(
          `{ tweet(id: "${tweetId}") { body } }`,
          { tweet: null },
          newUser)
    });

  });

  describe('on type "user" (part 2)...', () => {

    it('can delete himself', () => {
        return sendQueryAndExpect(`
          mutation {
            removeUser(id: "${newUser}")
          }
        `, { 
            removeUser: true
         },
        newUser)
    });

    it('user "tobkle" is deleted', () => {
        return sendQueryAndExpect(`
          { user(id: "${newUser}") { username, bio, role } }
        `, { 
            user: null
         },
        newUser)
    });

  });

});