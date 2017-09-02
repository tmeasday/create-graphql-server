#!/usr/bin/env babel-node --inspect
/* eslint-disable no-console */
var exec = require('child_process').exec;
import fs from 'fs';
import path from 'path';
import os from 'os';
import minimist from 'minimist';
import generate from '../generate';

const argv = minimist(process.argv.slice(2));
const commands = argv._;
const file = commands[0] || path.join('test', 'input', 'User.graphql');
const targetDir = commands[1] || os.tmpdir();
debugger;
const inputSchemaStr = fs.readFileSync(file, 'utf8');
const {
  typeName,
  TypeName,
  outputSchemaStr,
  resolversStr,
  modelStr,
} = generate(inputSchemaStr);

console.log('\n\INPUT:\n\n', inputSchemaStr);
console.log('\n\nSCHEMA:\n\n', outputSchemaStr);
console.log('\n\MODEL:\n\n', modelStr);
console.log('\n\RESOLVER:\n\n', resolversStr, '\n\n');
writeFile(file, inputSchemaStr, '.input');
writeFile(file, outputSchemaStr, '.graphql');
writeFile(file, modelStr, '.model.js');
writeFile(file, resolversStr, '.resolver.js');

process.exit(0);

function writeFile(file, data, type) {
  const newPath = path.join(targetDir, path.basename(file, '.graphql') + type);
  console.log('writing to file and opening file in sublime editor...', newPath);
  fs.writeFileSync(newPath, data, 'utf8');
  exec(`subl ${newPath}`);
}
