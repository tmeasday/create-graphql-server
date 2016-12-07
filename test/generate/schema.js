import { describe, it } from 'mocha';
import chai, { expect } from 'chai';
import chaiDiff from 'chai-diff';
import fs from 'fs';
import { print } from 'graphql';

import readInput from '../../generate/read';
import generateSchema from '../../generate/schema';

describe('generateResolvers', () => {
  chai.use(chaiDiff);

  describe('with user test file', () => {
    const input = readInput(`${__dirname}/../input/user.graphql`);

    it('generates correct JavaScript', () => {
      const schema = generateSchema(input);
      const output = print(schema);

      const expected = fs.readFileSync(`${__dirname}/../output-app/schema/user.graphql`, 'utf8');

      expect(output).not.to.be.differentFrom(expected, { relaxedSpace: true });
    });
  });

  describe('with tweet test file', () => {
    const input = readInput(`${__dirname}/../input/tweet.graphql`);

    it('generates correct JavaScript', () => {
      const schema = generateSchema(input);
      const output = print(schema);

      const expected = fs.readFileSync(`${__dirname}/../output-app/schema/tweet.graphql`, 'utf8');

      expect(output).not.to.be.differentFrom(expected, { relaxedSpace: true });
    });
  });
});
