// @flow

import path from 'path';

/**
 * get the name of the partial template according to default naming convention
 * defines the name of the partial template in its directory structure
 * prepare name prefix: take just partial name on root template directory
 * on deeper directory structures, prefix directory name to partial name
 * @private
 * @param {array} directoryPath - partials directory name parts
 * @param {string} filename - file name of the partial template
 * @param {string} extension - file extension
 * @return {string} name - name of the partial
 * 
 * @example
 * name = hello               {base}/hello.template
 * name = auth_hello          {base}/auth/hello.template
 * name = auth_special_hello  {base}/auth/special/hello.template
 */

export function getName(directoryPath, filename, extension) {
  const dirClone = [...directoryPath];
  let prefix = '';
  if (dirClone.length > 1) {
    dirClone.shift();
    prefix = dirClone.reduce((str, dir) => str.concat(dir, '_'), '');
  }
  return prefix.concat(path.basename(filename, extension));
}
