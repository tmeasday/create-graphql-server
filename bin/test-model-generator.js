import { describe, it } from 'mocha';
import chai, { expect } from 'chai';
import chaiDiff from 'chai-diff';
import fs from 'fs';
import { print } from 'graphql';

import readInput from '../generate/read';
import generateSchema from '../generate/schema';
import generateResolvers from '../generate/resolvers';
import generateModel from '../generate/model';

const input = readInput(`${__dirname}/../test/input/User.graphql`);
const schema = generateSchema(input);
const resolverOutput = generateResolvers(input, schema); 
const modelOutput = generateModel(input, schema);

console.log(print(schema));
