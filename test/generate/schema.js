import { describe, it } from 'mocha';
import chai, { expect } from 'chai';
import chaiDiff from 'chai-diff';
import fs from 'fs';
import { print } from 'graphql';

import readInput from '../../generate/read';
import generateSchema from '../../generate/schema';

describe('generateSchema', () => {
  chai.use(chaiDiff);

  describe('with user test file', () => {
    const input = readInput(`${__dirname}/../input/User.graphql`);

    it('generates correct Schema', () => {
      const schema = generateSchema(input);
      const output = print(schema);

      const expected = fs.readFileSync(`${__dirname}/../output-app/schema/User.graphql`, 'utf8');

      expect(output).not.to.be.differentFrom(expected, { relaxedSpace: true });
    });
  });

  describe('with tweet test file', () => {
    const input = readInput(`${__dirname}/../input/Tweet.graphql`);

    it('generates correct Schema', () => {
      const schema = generateSchema(input);
      const output = print(schema);

      const expected = fs.readFileSync(`${__dirname}/../output-app/schema/Tweet.graphql`, 'utf8');

      expect(output).not.to.be.differentFrom(expected, { relaxedSpace: true });
    });
  });
});
