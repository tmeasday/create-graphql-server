// @flow
import path from 'path';

/**
 * It defines the name of a found partial template 
 * by its directory hierarchy level and its file name.
 * These names are used to identify and distinguish partial names
 * @private
 * @param {array} directoryPath - partials directory name parts
 * @param {string} filename - file name of the partial template
 * @param {string} extension - file extension
 * @return {string} name - name of the partial
 * 
 * @example
 * partial template names:    found in directory hierarchy:
 * name = hello               {basePath}/hello.template
 * name = auth_hello          {basePath}/auth/hello.template
 * name = auth_special_hello  {basePath}/auth/special/hello.template
 */

export default function getName(directoryPath, filename, extension) {
  const dirClone = [...directoryPath];
  let prefix = '';
  if (dirClone.length > 1) {
    dirClone.shift();
    prefix = dirClone.reduce((str, dir) => str.concat(dir, '_'), '');
  }
  return prefix.concat(path.basename(filename, extension));
}
