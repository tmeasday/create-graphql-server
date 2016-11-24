import { describe, it } from 'mocha';
import { assert } from 'chai';
import fetch from 'node-fetch';

const ENDPOINT = 'http://localhost:3000/graphql';

function sendQuery({ query }) {
  return fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  }).then((response) => {
    assert.equal(response.status, 200, response.statusText);
    return response.json();
  });
}

function sendQueryAndExpect(query, expectedResult) {
  return sendQuery({ query })
    .then((result) => {
      assert.isDefined(result.data);
      assert.deepEqual(result.data, expectedResult);
    });
}

describe('environment', () => {
  it('graphql server should be available', () => {
    const query = `{
      __schema {
        queryType { name }
      }
    }`;

    return sendQuery({ query, operationName: 'foo' })
      .then((result) => {
        assert.isDefined(result.data);
      });
  });
});

describe('queries', () => {
  function itQueries(name, query, expectedResult) {
    it(name, () => {
      sendQueryAndExpect(query, expectedResult);
    });
  }

  function itPaginates(rootField, rootFieldArg, fieldName, subfield, expectedItems) {
    it(`paginates ${fieldName}`, () => {
      function constructQuery(args = '') {
        return `{
          ${rootField}${rootFieldArg} {
            ${fieldName}${args} {
              ${subfield}
              createdAt
            }
          }
        }`;
      }
      function checkResult(result, offset, length) {
        assert.isDefined(result.data);
        const items = result.data[rootField][fieldName];
        assert.equal(items.length, length);
        for (let i = 0; i < length; i += 1) {
          assert.equal(items[i][subfield], expectedItems[i + offset][subfield]);
        }
        return items;
      }

      let lastCreatedAt;
      return sendQuery({ query: constructQuery() })
        .then((result) => {
          const items = checkResult(result, 0, expectedItems.length);
          lastCreatedAt = items[0].createdAt;
        })
        .then(() => sendQuery({ query: constructQuery('(limit: 1)') }))
        .then(result => checkResult(result, 0, 1))
        .then(() => sendQuery({
          query: constructQuery(`(lastCreatedAt: ${lastCreatedAt})`),
        }))
        .then(result => checkResult(result, 1, expectedItems.length - 1))
        .then(() => sendQuery({
          query: constructQuery(`(lastCreatedAt: ${lastCreatedAt}, limit: 1)`),
        }))
        .then(result =>
          checkResult(result, 1, Math.min(expectedItems.length - 1, 1))
        );
    });
  }

  describe('users', () => {
    itQueries('basic data',
      '{ user(id: 1) { id, username } }',
      { user: { id: '1', username: 'tmeasday' } }
    );

    itPaginates('user', '(id: 1)', 'followers', 'username',
      [{ username: 'stubailo' }]
    );

    itPaginates('user', '(id: 1)', 'following', 'username',
      [{ username: 'stubailo' }, { username: 'lacker' }]
    );

    itPaginates('user', '(id: 1)', 'tweets', 'id',
      [{ id: '0' }, { id: '1' }]
    );

    itPaginates('user', '(id: 1)', 'liked', 'id',
      [{ id: '2' }, { id: '3' }, { id: '4' }]
    );
  });

  describe('tweets', () => {
    itQueries('basic data',
      '{ tweet(id: 1) { id, body } }',
      { tweet: { id: '1', body: 'Good times bringing Apollo Optics to Rails over the last few months with @tmeasday @chollier @cjoudrey @rmosolgo and others!' } }
    );

    itQueries('author relation',
      '{ tweet(id: 1) { author { username } } }',
      { tweet: { author: { username: 'tmeasday' } } }
    );

    itPaginates('tweet', '(id: 3)', 'likers', 'username',
      [{ username: 'tmeasday' }, { username: 'lacker' }]
    );
  });
});
