import { describe, it } from 'mocha';
import { assert } from 'chai';
import fetch from 'node-fetch';

const ENDPOINT = 'http://localhost:3000/graphql';

function sendQuery({ query }) {
  return fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
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
      .then((response) => {
        assert.equal(response.status, 200);
        return response.json();
      })
      .then((result) => {
        assert.isDefined(result.data);
      });
  });
});
