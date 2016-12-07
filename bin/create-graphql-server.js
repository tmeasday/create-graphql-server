#!/usr/bin/env babel-node

/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';
import cpr from 'cpr';
import minimist from 'minimist';
import generate from '../generate';

const argv = minimist(process.argv.slice(2));

const commands = argv._;

const SKEL_DIR = path.join(__dirname, '..', 'skel');

function usage() {
  console.log('Usage: create-graphql-app <command> <arg>, where command is:');
  console.log(' - create-graphql-app init project-dir');
  console.log(' - create-graphql-app add-type path/to/type.graphql');
  process.exit(1);
}

if (commands[0] === 'init') {
  const projectDir = commands[1];
  if (!projectDir) {
    usage();
  }

  // TODO - nice things like checking the directory doesn't exist

  cpr(SKEL_DIR, projectDir, { confirm: true, overwrite: true }, () => {
    console.log(`Created project in ${projectDir}`);
    process.exit(0);
  });
} else if (commands[0] === 'add-type') {
  const inputSchemaFile = commands[1];
  if (!inputSchemaFile) {
    usage();
  }

  const inputSchemaStr = fs.readFileSync(inputSchemaFile, 'utf8');
  const {
    typeName,
    TypeName,
    outputSchemaStr,
    resolversStr,
    modelStr,
  } = generate(inputSchemaStr);

  fs.writeFileSync(path.join('schema', `${typeName}.graphql`), outputSchemaStr);
  fs.writeFileSync(path.join('resolvers', `${typeName}.js`), resolversStr);
  fs.writeFileSync(path.join('model', `${TypeName}.js`), modelStr);

  // We also need to add the relevant code to the end of each index.js file
  // XXX: this is fairly hacky for now, we should at least check it's not there already
  fs.appendFileSync(path.join('schema', 'index.js'),
    `\ntypeDefs.push(requireGraphQL('./${typeName}.graphql'));\n`
  );

  fs.appendFileSync(path.join('resolvers', 'index.js'),
    `\nimport ${typeName}Resolvers from './${typeName}';\n` +
    `merge(resolvers, ${typeName}Resolvers);\n`
  );

  fs.appendFileSync(path.join('model', 'index.js'),
    `\nimport ${TypeName} from './${TypeName}';\n` +
    `models.${TypeName} = ${TypeName};\n`
  );

  process.exit(0);
} else {
  usage();
}
