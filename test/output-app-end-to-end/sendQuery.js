import fetch from 'node-fetch';
import { assert } from 'chai';

const ENDPOINT = 'http://localhost:3000/graphql';

export function sendQuery({ query }) {
  return fetch(ENDPOINT, {
    method: 'POST',
    headers: { 
      'content-type': 'application/json',
      'authorization': 'JWT eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI1ODMyOTFhMTYzODU2NmIzYzVhOTJjYTEifQ.QaJYP81K7kgB8FVw6bOK7XSZYI6_gn9GCOlDToQcu0Q',
    },
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
