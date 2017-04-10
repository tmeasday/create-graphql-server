/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';
import cpr from 'cpr';
import minimist from 'minimist';
import generate from '../generate';
import child_process from 'child_process';

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

  // JWT key for encrypting tokens
  const key = process.env.JWT_KEY || Math.random().toString();

  // TODO - nice things like checking the directory doesn't exist
  cpr(SKEL_DIR, projectDir, { confirm: true, overwrite: true }, () => {
    const command = `find  * -type f  -exec sed -i '' -e 's/~name~/${projectDir}/' -e 's/~key~/${key}/' {} \\;`;
    child_process.exec(command, { cwd: `./${projectDir}` }, () => {
      console.log(`Created project in ${projectDir}`);
      process.exit(0);
    });
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

  fs.writeFileSync(path.join('schema', `${TypeName}.graphql`), outputSchemaStr);
  fs.writeFileSync(path.join('resolvers', `${TypeName}.js`), resolversStr);
  fs.writeFileSync(path.join('model', `${TypeName}.js`), modelStr);

  // We also need to add the relevant code to the end of each index.js file
  // XXX: this is fairly hacky for now, we should at least check it's not there already
  fs.appendFileSync(
    path.join('schema', 'index.js'),
    `\ntypeDefs.push(requireGraphQL('./${TypeName}.graphql'));\n`,
  );

  fs.appendFileSync(
    path.join('resolvers', 'index.js'),
    `\nimport ${typeName}Resolvers from './${TypeName}';\n` +
      `merge(resolvers, ${typeName}Resolvers);\n`,
  );

  fs.appendFileSync(
    path.join('model', 'index.js'),
    `\nimport ${TypeName} from './${TypeName}';\n` +
      `models.${TypeName} = ${TypeName};\n`,
  );

  process.exit(0);
} else {
  usage();
}
