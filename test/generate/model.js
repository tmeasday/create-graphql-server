import { describe, it } from 'mocha';
import chai, { expect } from 'chai';
import chaiDiff from 'chai-diff';
import fs from 'fs';

import { readString } from '../../generate/util/read';
import generate from '../../generate';

describe('generateModel', () => {
  chai.use(chaiDiff);

  describe('with user test file', () => {
    const input = readString(`${__dirname}/../input/User.graphql`);

    it('generates correct JavaScript', () => {
      const {
        typeName,
        TypeName,
        outputSchemaStr,
        resolversStr,
        modelStr,
      } = generate(input);
      
      const expected = fs.readFileSync(`${__dirname}/../output-app/model/User.js`, 'utf8');

      expect(modelStr).not.to.be.differentFrom(expected, { relaxedSpace: true });
    });
  });

  describe('with tweet test file', () => {
    const input = readString(`${__dirname}/../input/Tweet.graphql`);

    it('generates correct JavaScript', () => {
      const {
        typeName,
        TypeName,
        outputSchemaStr,
        resolversStr,
        modelStr,
      } = generate(input);

      const expected = fs.readFileSync(`${__dirname}/../output-app/model/Tweet.js`, 'utf8');

      expect(modelStr).not.to.be.differentFrom(expected, { relaxedSpace: true });
    });
  });
});
