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
      return sendQuery({ query })
        .then((result) => {
          assert.isDefined(result.data);
          assert.deepEqual(result.data, expectedResult);
        });
    });
  }

  describe('users', () => {
    itQueries('basic data',
      '{ user(id: 1) { id, username } }',
      { user: { id: '1', username: 'tmeasday' } }
    );

    itQueries('relations',
      '{ user(id: 1) { followers { username } following { username } } }',
      { user: {
        followers: [{ username: 'stubailo' }],
        following: [{ username: 'stubailo' }, { username: 'lacker' }],
      } }
    );

    // itQueries('user tweets')
    // itQueries('basic pagination')
    // itQueries('pagination w/ startDate')
  });
});
