import { describe, it } from 'mocha';
import chai, { expect } from 'chai';
import chaiDiff from 'chai-diff';
import fs from 'fs';

import readInput from '../../generate/read';
import generateSchema from '../../generate/schema';
import generateResolvers from '../../generate/resolvers';

describe('generateResolvers', () => {
  chai.use(chaiDiff);

  describe('with user test file', () => {
    const input = readInput(`${__dirname}/../input/user.graphql`);

    it('generates correct JavaScript', () => {
      const schema = generateSchema(input);
      const output = generateResolvers(input, schema);

      const expected = fs.readFileSync(`${__dirname}/../output-app/resolvers/user.js`, 'utf8');

      expect(output).not.to.be.differentFrom(expected, { relaxedSpace: true });
    });
  });

  describe('with tweet test file', () => {
    const input = readInput(`${__dirname}/../input/tweet.graphql`);

    it('generates correct JavaScript', () => {
      const schema = generateSchema(input);
      const output = generateResolvers(input, schema);

      const expected = fs.readFileSync(`${__dirname}/../output-app/resolvers/tweet.js`, 'utf8');

      expect(output).not.to.be.differentFrom(expected, { relaxedSpace: true });
    });
  });
});
