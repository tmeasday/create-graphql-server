import { describe, it } from 'mocha';
import { assert } from 'chai';

import { sendQuery } from './sendQuery';

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
