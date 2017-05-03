#!/usr/bin/env node

/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';
import cpr from 'cpr';
import minimist from 'minimist';
import generate from '../generate';
import child_process from 'child_process';
import escapeStringRegexp from 'escape-string-regexp';
import md5 from 'md5';
import chalk from 'chalk';

const argv = minimist(process.argv.slice(2), {
  default: {
    'force-update': false,
  },
});
const commands = argv._;
const SKEL_DIR = path.join(__dirname, '..', 'skel');
const CHECKSUM_FILE = path.join(
  process.cwd(),
  '.create-graphql-server.checksums'
);

function usage() {
  console.log(
    'Generate a GraphQL Server environment, or add/update/remove GraphQL data types and generate code files and schemas.'
  );
  console.log('');
  console.log(
    'Usage:',
    chalk.bold.yellow(
      'create-graphql-server <command> <argument> <option>, where command is:'
    )
  );
  console.log('');
  console.log(' - create-graphql-server init project-dir');
  console.log(' - create-graphql-server add-type path/to/type.graphql');
  console.log(' - create-graphql-server add-type path');
  console.log(' - create-graphql-server remove-type path/to/type.graphql');
  console.log(' - create-graphql-server remove-type path');
  console.log(' - create-graphql-server remove-type typename');
  console.log('');
  console.log(chalk.yellow(' Commands:'));
  console.log('');
  console.log(
    ' init           initializes and generates a new graphql-server project environment'
  );
  console.log(
    ' add-type       adds your new Graphql data type to the graphql-server'
  );
  console.log(
    ' remove-type    removes a Graphql data type from the graphql-server (does not delete data in db)'
  );
  console.log('');
  console.log(chalk.yellow(' Argument:'));
  console.log('');
  console.log(
    ' file-path      path of your <type>.graphql file e.g.: ./input/User.graphql'
  );
  console.log('');
  console.log(chalk.yellow(' Options:'));
  console.log('');
  console.log(
    ' --force-update forces updates, overwriting code changes by any user since last run'
  );
  console.log('');
  process.exit(1);
}

function adjustTypeName(typeName){
  return typeName.charAt(0).toUpperCase() + typeName.slice(1).toLowerCase();
}

function getFileUpdateList(inputSchemaFile, mode) {
  let inputSchemaStr = '';
  // in add mode or if a graphql path/file name was provided, the input file must be there,
  if (mode === 'add' || inputSchemaFile.includes('.graphql') || inputSchemaFile.includes('/')) {
    if (! fs.existsSync(inputSchemaFile)) {
      console.error(
        chalk.bold.red('Error: Cannot read file', inputSchemaFile)
      );
      console.log('');
      process.exit(1);
    }
    // get information about the entity <type> out of its input file
    inputSchemaStr = fs.readFileSync(inputSchemaFile, 'utf8');
  } else {
    // expecting just the type name without path/file name
    // provide a dummy type file just with the type name
    inputSchemaStr = `type ${adjustTypeName(inputSchemaFile)} {}`;
  }

  // generate code therefore in memory first
  const {
    typeName,
    TypeName,
    outputSchemaStr,
    resolversStr,
    modelStr,
  } = generate(inputSchemaStr);

  // do validation checks
  // shouldn't be necessary, but...
  if (typeName === '' || TypeName === '') {
    console.error('Error: No valid <Type> found.');
    process.exit(0);
  }
  // there should be some generated code, not adding missing or empty code files
  if (
    !outputSchemaStr ||
    !resolversStr ||
    !modelStr ||
    outputSchemaStr === '' ||
    resolversStr === '' ||
    modelStr === ''
  ) {
    console.error('Error: Error while generating target Code.');
    process.exit(0);
  }

  // Bill-of-material for the changes to be applied
  // Add further enhancements to this array
  //
  // @Records:
  // One record represents one file <type> with its path, code and reference
  //
  // @Fields:
  // typePath: path and file name for the <type> file
  // typeString: generated code for the <type> file
  // indexPath: path and file name for the index file, which has to reference the <type> file
  // indexPattern: code pattern to be added to the index file, for referencing this <type> file
  return [
    {
      typePath: path.join('schema', `${TypeName}.graphql`),
      typeString: outputSchemaStr,
      indexPath: path.join('schema', 'index.js'),
      indexPattern: `\ntypeDefs.push(requireGraphQL('./${TypeName}.graphql'));\n`,
    },
    {
      typePath: path.join('resolvers', `${TypeName}.js`),
      typeString: resolversStr,
      indexPath: path.join('resolvers', 'index.js'),
      indexPattern: `\nimport ${typeName}Resolvers from './${TypeName}';\n` +
        `merge(resolvers, ${typeName}Resolvers);\n`,
    },
    {
      typePath: path.join('model', `${TypeName}.js`),
      typeString: modelStr,
      indexPath: path.join('model', 'index.js'),
      indexPattern: `\nimport ${TypeName} from './${TypeName}';\n` +
        `models.${TypeName} = ${TypeName};\n`,
    },
  ];
}

function getEscapeRegex(pattern) {
  // Prepare Regular Expression to find and replace code patterns
  // Special characters in the code string have to be escaped, to get the regex working properly
  // First with common escape patterns by the included npm module,
  // Additionally escape ./ and \n, which weren't escaped by the npm module unfortunately
  const re = new RegExp(
    escapeStringRegexp(pattern) // use common escape patterns
      .replace(/\.\//g, '.\\/') // escape: ./  to   \.\/ (which was in path)
      .replace(/\n/g, '\\n'), // escape: \n  to:  \\n
    'gmi'
  );
  return re;
}

function getFileHash(fileContent) {
  return md5(fileContent);
}

function readFileHashFile() {
  // read file with all file hashes from last add-type/update-type/remove-type runs
  let checksums = {};
  if (fs.existsSync(CHECKSUM_FILE)) {
    checksums = JSON.parse(fs.readFileSync(CHECKSUM_FILE, 'utf8'));
  }
  return checksums;
}

function removeFileHash(file) {
  // MD5_file_Hash_JSON = [ { 'User.graphql': 'md5abscdsadfasf234322'} ]
  let checksums = [];
  // Existing Hash File: Read and update file, remove the entry with <file>
  if (file && file !== '' && fs.existsSync(CHECKSUM_FILE)) {
    checksums = JSON.parse(fs.readFileSync(CHECKSUM_FILE, 'utf8'));
    delete checksums[file];
    fs.writeFileSync(CHECKSUM_FILE, JSON.stringify(checksums));
  }
}

function writeFileHashFile(file, content) {
  // MD5_file_Hash_JSON = { 'User.graphql': 'md5abscdsadfasf234322'}
  let checksums = {};
  // Existing Hash File: Read and update file
  if (
    file &&
    file !== '' &&
    content &&
    content !== '' &&
    fs.existsSync(CHECKSUM_FILE)
  ) {
    checksums = JSON.parse(fs.readFileSync(CHECKSUM_FILE, 'utf8'));
    checksums[file] = getFileHash(content);
    fs.writeFileSync(CHECKSUM_FILE, JSON.stringify(checksums));
    // Not yet existing Hash File: create file
  } else if (file && file !== '' && content && content !== '') {
    checksums[file] = getFileHash(content);
    fs.writeFileSync(CHECKSUM_FILE, JSON.stringify(checksums));
  }
}

function hasFileChanged(file, checksums) {
  // file has changed => true,
  // file not changed => false
  // file not found   => false
  // If file is provided and existing,
  // and also an old entry in the file is existing,
  // then compare old and new hash
  if (file && file !== '' && checksums[file] && fs.existsSync(file)) {
    const oldFileHash = checksums[file];
    const newFileHash = getFileHash(fs.readFileSync(file, 'utf8'));
    if (oldFileHash !== newFileHash) {
      return true;
    }
  }
  return false;
}

function checkForFileChanges(fileUpdateList, forceUpdate) {
  // Get all old file hashes first
  const checksums = readFileHashFile();
  let anyFileHasChanged = false;
  let thisFileHasChanged = false;
  if (checksums) {
    fileUpdateList.map((file) => {
      // Check if <type> file has changed
      thisFileHasChanged = hasFileChanged(file.typePath, checksums);
      if (thisFileHasChanged) {
        console.log(
          chalk.bold.red('Caution: File has changed:', file.typePath)
        );
        anyFileHasChanged = anyFileHasChanged || thisFileHasChanged;
      }
      // Check if index file has changed
      thisFileHasChanged = hasFileChanged(file.indexPath, checksums);
      if (thisFileHasChanged) {
        console.log(
          chalk.bold.red('Caution: File has changed:', file.indexPath)
        );
        anyFileHasChanged = anyFileHasChanged || thisFileHasChanged;
      }
      return file;
    });
    // if any file has changed, stop
    if (anyFileHasChanged && !forceUpdate) {
      console.error(
        chalk.bold.red('Stopping without change for safety reasons.')
      );
      console.error(
        chalk.green('Please check you are not overwriting your changes.')
      );
      console.error(
        chalk.green(
          'You can still overwrite by using the --force-update option.'
        )
      );
      console.error(' ');
      process.exit(0);
      // if any file has changed, but user chose force-update, then continue with changing files...
    } else if (anyFileHasChanged && forceUpdate) {
      console.log(
        chalk.bold.yellow(
          'Overwriting files --force-update option was chosen...'
        )
      );
    }
  }
}

function checkFileContainsPattern(file, pattern) {
  // only checks, if the file contains a search pattern
  if (pattern && file && fs.existsSync(file)) {
    const inputFile = fs.readFileSync(file, 'utf8');
    const re = getEscapeRegex(pattern);
    const found = inputFile.match(re);
    if (found === null) {
      return false; // pattern not found
    }
    return true; // pattern found
  }
  console.error(
    'Error: checkFileContainsPattern() requires an existing file:',
    file,
    ' and a pattern:',
    pattern
  );
  process.exit(0);
  return false;
}

function removePatternFromFile(file, pattern) {
  // Remove <type> related code patterns from file
  // which were added earlier by "add-type" to e.g. index.js file
  if (file && pattern && fs.existsSync(file)) {
    const inputFile = fs.readFileSync(file, 'utf8');
    const re = getEscapeRegex(pattern);
    const targetFile = inputFile.replace(re, '');
    fs.writeFileSync(file, targetFile);
    writeFileHashFile(file, targetFile);
    console.log(chalk.green('File updated:', file));
  }
}

function removePatternFromFiles(fileUpdateList) {
  fileUpdateList.map((file) => {
    removePatternFromFile(file.indexPath, file.indexPattern);
    return file;
  });
}

function removeFile(file) {
  // deletes the file on existence
  if (file && file !== '' && fs.existsSync(file)) {
    fs.unlinkSync(file);
    removeFileHash(file);
    console.log(chalk.green('File removed:', file));
  }
}

function removeTypeFiles(fileUpdateList) {
  fileUpdateList.map((file) => {
    removeFile(file.typePath);
    return file;
  });
}

function createTypeFile(file, content) {
  // creates the <type> file with its generated code
  if (file && content && file !== '') {
    fs.writeFileSync(file, content);
    writeFileHashFile(file, content);
    console.log(chalk.green('File generated:', file));
  }
}

function createTypeFiles(fileUpdateList) {
  fileUpdateList.map((file) => {
    createTypeFile(file.typePath, file.typeString);
    return file;
  });
}

function addPatternToFile(file, pattern) {
  // appends the code pattern to the index file, for referencing the <type> file
  if (checkFileContainsPattern(file, pattern)) {
    // file contains pattern already, do nothing
    console.log(
      chalk.green('Skipping file:', file, 'code pattern already in file.')
    );
  } else if (fs.existsSync(file)) {
    fs.appendFileSync(file, pattern);
    const content = fs.readFileSync(file, 'utf8');
    writeFileHashFile(file, content);
    console.log(
      chalk.green('File enhanced: ', file, 'with required reference.')
    );
  } else {
    console.error(
      chalk.bold.red(
        'ERROR: File to be enhanced: ',
        file,
        'with required reference, does not exist.'
      )
    );
  }
}

function addPatternToFiles(fileUpdateList) {
  fileUpdateList.map((file) => {
    addPatternToFile(file.indexPath, file.indexPattern);
    return file;
  });
}

function getFilesRecursively(folder, filetype) {
  // getting all files of a path and of a specific filetype recursively
  let list = [], stats,
    files = fs.readdirSync(folder);

  files.forEach(file => {
    stats = fs.lstatSync(path.join(folder, file));
    if(stats.isDirectory()) {
      list = list.concat(getFilesRecursively(path.join(folder, file), filetype));
    } else if (file.includes(filetype)) {
      console.log('found:', path.join(folder, file)); 
      list.push(path.join(folder, file)); 
    }
  });

  return list;
}

// MAIN FUNCTIONS

function addType(inputSchemaFile, options) {
  // generates a new data type with all its files and <type> references
  console.log(chalk.bold.blue('Running add-type'));
  const fileUpdateList = getFileUpdateList(inputSchemaFile, 'add');
  checkForFileChanges(fileUpdateList, options['force-update']);
  createTypeFiles(fileUpdateList);
  addPatternToFiles(fileUpdateList);
  console.log(chalk.bold.blue('Finished successfully add-type'));
  console.log('');
}

function removeType(inputSchemaFile, options) {
  // removes the generated files and references only
  console.log(chalk.bold.blue('Running remove-type'));
  const fileUpdateList = getFileUpdateList(inputSchemaFile, 'remove');
  checkForFileChanges(fileUpdateList, options['force-update']);
  removePatternFromFiles(fileUpdateList);
  removeTypeFiles(fileUpdateList);
  console.log(chalk.bold.blue('Finished successfully remove-type'));
  console.log('');
}

// CHECK AND REACT ON USER INPUTS
console.log('');
console.log(chalk.bold.blue('CREATE-GRAPHQL-SERVER'));
console.log('');

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
  if (fs.existsSync(inputSchemaFile) && fs.lstatSync(inputSchemaFile).isDirectory()) {
    //directory name entered
    const files = getFilesRecursively(inputSchemaFile, '.graphql');
    files.forEach(file => {
      addType(file, argv);
    });
  } else {
    // single file entered
    addType(inputSchemaFile, argv);
  }
  process.exit(0);
} else if (commands[0] === 'remove-type') {
  const inputSchemaFile = commands[1];
  if (!inputSchemaFile) {
    usage();
  }
  if (fs.existsSync(inputSchemaFile) && fs.lstatSync(inputSchemaFile).isDirectory()) {
    // directory name entered
    const files = getFilesRecursively(inputSchemaFile, '.graphql');
    files.forEach(file => {
      removeType(file, argv);
    });
  } else {
    // single file or type
    removeType(inputSchemaFile, argv);
  }
  process.exit(0);
} else {
  usage();
}
