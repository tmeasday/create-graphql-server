import fetch from 'node-fetch';
import { assert } from 'chai';
import jwt from '../output-app/node_modules/jwt-simple';

const ENDPOINT = 'http://localhost:3000/graphql';

// For testing different user authorizations, set users to:
export const unknownUser = ''; // not signed in
export const defaultUser = '583291a1638566b3c5a92ca2'; // role = 'user'
export const roleUser = '583291a1638566b3c5a92ca0'; // role = 'editor'
export const adminUser = '583291a1638566b3c5a92ca1';  // role = 'admin'

export function getToken(userId, KEY='test-key'){
  const payload = { userId };
  const token = (userId && userId !== '') ? `JWT ${jwt.encode(payload, KEY)}` : null; 
  return token;
}

export function sendQuery({ query, userId }) {
  const token = getToken(userId);
  return fetch(ENDPOINT, {
    method: 'POST',
    headers: { 
      'content-type': 'application/json',
      'authorization': token,
    },
    body: JSON.stringify({ query }),
  }).then((response) => {
    assert.equal(response.status, 200, response.statusText);
    return response.json();
  });
}

export function sendQueryAndExpect(query, expectedResult, userId) {
  return sendQuery({ query, userId })
    .then((result) => {
      assert.isDefined(result.data);
      assert.deepEqual(result.data, expectedResult);
    });
}
