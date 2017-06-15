import { describe, it } from 'mocha';
import { assert } from 'chai';
import { sendQuery, sendQueryAndExpect, roleUser, adminUser } from './sendQuery';

let newUser;
let otherUser;
let tweetId;
let tweetId2;
let tweetIdOthers;

function makeUserInput(user) {
  if (user.role) 
    return `{
      username: "${user.username}",
      bio: "${user.bio}",
      role: "${user.role}"
    }`;
  else
    return `{
      username: "${user.username}",
      bio: "${user.bio}"
    }`;
}

function makeTweetInput(tweet, userId) {
  if (tweet.author) {
    return `{
      authorId: "${userId ? userId : tweet.author.id}",
      coauthorsIds: ${tweet.coauthorsIds ? JSON.stringify(tweet.coauthorsIds) : JSON.stringify([])},
      body: "${tweet.body}"
    }`;
  }
  return `{
    body: "${tweet.body}"
  }`;
}

describe('test-3: user with role "admin"', () => {

  before(function(done) {
      const expectedUser = {
        username: 'tobkle',
        bio: 'someone',
        role: 'admin'
      };
      // console.log('before:', makeUserInput(expectedUser));
      // console.log('userId', adminUser);
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
        // console.log('after:', result);
        assert.isNotNull(result.data);
        assert.isNotNull(result.data.createUser);
        assert.isNotNull(result.data.createUser.id);
        assert.equal(result.data.createUser.role, 'admin');
        newUser = result.data.createUser.id;
        done();
      })
      .catch((error) => {
        console.log('ERROR: BEFORE', error);
        done();
      })
  });
  
  describe('on type "user" (part 1)...', () => {

    it('admin user created new user "tobkle" with role "admin" for the next tests...', () => {
      assert.isNotNull(newUser);
    });

    it('admin user created new "other" user with role "editor"', () => {
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
        assert.isNotNull(result.data.createUser);
        assert.isNotNull(result.data.createUser.id);
        otherUser = result.data.createUser.id;
      });
    });

    it('can read other users', () => {
      return sendQueryAndExpect(`
        { user(id: "${otherUser}") { username, bio, role } }
      `, { 
          user: {
                  username: 'zol',
                  bio: 'Maker of apps, product and engineering. Climber. Cyclist. Enthusiast. Product lead',
                  role: 'editor'
          }
       },
      newUser)
    });

    it('can read himself', () => {
      return sendQueryAndExpect(`
        { user(id: "${newUser}") { username, role } }
      `, { 
          user: {
            username: 'tobkle',
            role: 'admin'
          }
       },
      newUser)
    });

    it('can update other users', () => {
        const modifiedUser = {
          username: 'zoltan',
          bio: 'Maker of things, I guess',
          role: 'editor'
        };
        return sendQueryAndExpect(`
          mutation {
            updateUser(id: "${otherUser}", input: ${makeUserInput(modifiedUser)}) {
              username
              bio
              role
            }
          }
        `, { updateUser: modifiedUser },
        newUser)
    });

    it('can update himself', () => {
        const modifiedUser = {
          username: 'tobkle',
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
            updateUser: modifiedUser
         },
        newUser)
    });

    it('can update role of other user to "admin"', () => {
        const modifiedUser = {
          username: 'zoltan',
          bio: 'now an admin',
          role: 'admin'
        };
        return sendQueryAndExpect(`
          mutation {
            updateUser(id: "${otherUser}", input: ${makeUserInput(modifiedUser)}) {
              username
              bio
              role
            }
          }
        `, { 
            updateUser: modifiedUser
         },
        newUser)
    });

    it('can update his role from "admin" to "editor"', () => {
        const modifiedUser = {
          username: 'tobkle',
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
            updateUser: modifiedUser
         },
        newUser)
    });

    it('can not update own role while being "editor"', () => {
        const modifiedUser = {
          username: 'tobkle',
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
            updateUser: null
         },
        newUser)
    });

    it('other user with role "admin" can update role for user "tobkle" back to "admin"', () => {
        const modifiedUser = {
          username: 'tobkle',
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
            updateUser: modifiedUser
         },
        otherUser)
    });

    it('can delete other users', () => {
        return sendQueryAndExpect(`
          mutation {
            removeUser(id: "${otherUser}")
          }
        `, { 
            removeUser: true
         },
        newUser)
    });

  });

  describe('on type "tweet"...', () => {

    let expectedTweet = {
      author: { id: newUser },
      //coauthors: [],
      body: 'This is a test tweet of user tobkle',
    };

    const expectedTweetOtherAuthor = {
      author: { id: adminUser },
      //coauthors: [],
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
      .catch((error) => {
        console.log(error);
        done();
      })
    });

    it('can create tweet for himself', () => {
      assert.isNotNull(tweetId);
    });

    it('can create tweet for other author', () => {
      sendQuery({ query: `
        mutation {
          createTweet(input: ${makeTweetInput(expectedTweetOtherAuthor, adminUser)}) {
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
        tweetIdOthers = result.data.createTweet.id;
      })
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
          `{ tweet(id: "583676d3618530145474e352") { author { id } body } }`,
          { tweet: expectedTweetOtherAuthor },
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

    it('can update other users tweet', () => {
      return sendQueryAndExpect(`
          mutation {
            updateTweet(id: "${tweetIdOthers}", input: ${makeTweetInput(modifiedTweet)}) {
              body
            }
          }
        `, 
        { updateTweet: modifiedTweet },
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

    it('can remove other users tweet', () => {
      return sendQueryAndExpect(
          `mutation { removeTweet(id: "${tweetIdOthers}") }`,
          { removeTweet: true },
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