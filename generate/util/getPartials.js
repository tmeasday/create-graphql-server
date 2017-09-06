// @flow
import fs from 'fs';
import path from 'path';
import getName from './getName';
import { TEMPLATE_EXTENSION, ENCODING } from './constants';

/**
 * reads all available partials of a template directory
 * into a partial template registry
 * @public
 * @param {Object} configPartial - configuration object
 * @property {array} basePath - base directory to start reading
 * @property {array} directoryPath - partials directory name parts
 * @property {array} extension - extension name for template files '.template'
 * @property {array} encoding - encoding of template files 'utf8'
 * @property {Function} getNameFunc - optional, 
 * otherwise getDefaultName function is used
 * @return {array} partials - repository with all partials
 *
 * @example
 *  partials = [
 *    {
 *      "name": "hello",
 *      "path": "templates/default/hello.template",
 *      "source": "console.log('Hello World')"
 *    }
 *  ]
 */

export default function getPartials({
  basePath = [],
  directoryPath = [],
  extension = TEMPLATE_EXTENSION,
  encoding = ENCODING,
  getNameFunc = getName
}) {
  // collect all found partials in this partials array
  let partials = [];

  // prepare directory name
  const partialsDirectory = path.join(...basePath, ...directoryPath);

  // checks if name is an existing directory
  if (!fs.existsSync(partialsDirectory) ||
    !fs.statSync(partialsDirectory).isDirectory() ) {
    return partials;
  }

  // for easier reading as function: process directory tree recursively
  function filter_and_recursion_processing(file) {
    const filePath = path.join(...basePath, ...directoryPath, file);

    if (path.extname(file) === extension) {
      // partial file is found, passing through filter, process it later
      return file;

    } else if (fs.statSync(filePath).isDirectory()) {
      // directory found, do recursion and get processed partials back
      partials = partials.concat(
        getPartials({
          basePath,
          directoryPath: [...directoryPath, file],
          extension,
          encoding,
          getNameFunc
        })
      );
    }

    return false;
  }

  // for easier reading as function: process a partial template
  function partial_processing(file) {
    const partial = {};

    partial.name = getNameFunc(directoryPath, file, extension);
    partial.path = path.join(...basePath, ...directoryPath, file);
    partial.source = fs.readFileSync(partial.path, encoding);
    
    partials.push(partial);
  }

  // read directory tree, filter for '.template' files, sort them, process them
  fs
    .readdirSync(partialsDirectory)
    .filter(filter_and_recursion_processing)
    .sort()
    .forEach(partial_processing);

  return partials;
}
