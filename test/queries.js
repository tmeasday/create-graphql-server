import { describe, it } from 'mocha';
import { assert } from 'chai';

import { sendQuery, sendQueryAndExpect } from './sendQuery';

describe('queries', () => {
  function itQueries(name, query, expectedResult) {
    it(name, () => {
      sendQueryAndExpect(query, expectedResult);
    });
  }

  function itPaginates({ rootField, rootFieldArg, field, subfield }, expectedItems) {
    it(`paginates ${field}`, () => {
      function constructQuery(args = '') {
        const subQuery = `
          ${field}${args} {
            ${subfield}
            createdAt
          }
        `;
        if (!rootField) {
          return `{ ${subQuery} }`;
        }
        return `{
          ${rootField}${rootFieldArg} {
            ${subQuery}
          }
        }`;
      }
      function checkResult(result, offset, length) {
        assert.isDefined(result.data);
        const items = rootField ? result.data[rootField][field] : result.data[field];
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
      '{ user(id: 0) { id, username, bio } }',
      { user: {
        id: '0',
        username: 'tmeasday',
        bio: 'I build things with @percolatestudio. Author of @discovermeteor. Exploring how to improve user experience through technology, design and performance.',
      } }
    );

    itPaginates({
      field: 'users',
      subfield: 'username',
    }, [{ username: 'tmeasday' }, { username: 'stubailo' }, { username: 'lacker' }]);

    itPaginates({
      rootField: 'user',
      rootFieldArg: '(id: 0)',
      field: 'followers',
      subfield: 'username',
    }, [{ username: 'stubailo' }]);

    itPaginates({
      rootField: 'user',
      rootFieldArg: '(id: 0)',
      field: 'following',
      subfield: 'username',
    }, [{ username: 'stubailo' }, { username: 'lacker' }]);

    itPaginates({
      rootField: 'user',
      rootFieldArg: '(id: 0)',
      field: 'tweets',
      subfield: 'id',
    }, [{ id: '0' }, { id: '1' }]);

    itPaginates({
      rootField: 'user',
      rootFieldArg: '(id: 0)',
      field: 'liked',
      subfield: 'id',
    }, [{ id: '2' }, { id: '3' }, { id: '4' }]);
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

    itPaginates({
      field: 'tweets',
      subfield: 'id',
    }, [{ id: '0' }, { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }]);

    itPaginates({
      rootField: 'tweet',
      rootFieldArg: '(id: 3)',
      field: 'likers',
      subfield: 'username',
    }, [{ username: 'tmeasday' }, { username: 'lacker' }]);
  });
});
