import fetch from 'node-fetch';
import { assert } from 'chai';

const ENDPOINT = 'http://localhost:3000/graphql';

export function sendQuery({ query }) {
  return fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  }).then((response) => {
    assert.equal(response.status, 200, response.statusText);
    return response.json();
  });
}

export function sendQueryAndExpect(query, expectedResult) {
  return sendQuery({ query })
    .then((result) => {
      assert.isDefined(result.data);
      assert.deepEqual(result.data, expectedResult);
    });
}
