#!/usr/bin/env babel-node --inspect
/* eslint-disable no-console */

var exec = require('child_process').exec;
import fs from 'fs';
import path from 'path';
import os from 'os';
import minimist from 'minimist';
import { parse, print } from 'graphql';
import readInput from '../generate/read';
import { getCode } from '../generate/getCode';
import generateSchema from '../generate/schema';
import { generateResolver, generateModel } from '../generate';

const argv = minimist(process.argv.slice(2));
const commands = argv._;
const file = commands[0] || path.join('test', 'input', 'User.graphql');

const inputSchema = readInput(file);
const outputSchema = generateSchema(inputSchema);
const outputSchemaStr = print(outputSchema);
const modelCode = generateModel(inputSchema);
const resolverCode = generateResolver(inputSchema);

console.log('\n\INPUT:\n\n', file);
console.log('\n\nSCHEMA:\n\n', outputSchemaStr);
console.log('\n\MODEL:\n\n', modelCode);
console.log('\n\RESOLVER:\n\n', resolverCode, '\n\n');

writeFile(file, print(inputSchema), '.input');
writeFile(file, outputSchemaStr, '.graphql');
writeFile(file, modelCode, '.model.js');
writeFile(file, resolverCode, '.resolver.js');

process.exit(0);

function writeFile(file, data, type) {
  const tmpdir = os.tmpdir();
  const filename = path.basename(file, '.graphql');
  const newPath = path.join(tmpdir, filename + type);
  console.log('writing to and open in sublime editor...', newPath);
  fs.writeFileSync(newPath, data, 'utf8');
  exec(`subl ${newPath}`);
}