// @flow
import Handlebars from 'handlebars';
import { getContext } from './getContext';
import { getPartials } from './getPartials';
import { getName } from './getName';
import {
  ENCODING,
  USER_LITERAL,
  TEMPLATE_EXTENSION,
  TEMPLATES_DIR,
  TEMPLATES_MODEL_DIR,
  TEMPLATES_COMMON_DIR,
  TEMPLATES_DEFAULT_DIR,
  TEMPLATES_AUTH_DIR,
  TEMPLATES_DEFAULT_TEMPLATE
} from './constants';

/**
 * get generated code from template partials
 * @public
 * @param {Object} config - configuration object
 * @property {object} inputSchema - schema of the type 
 * @property {string} userType - the user type
 * @property {string} defaultTemplate - name of the start template
 * @property {array} basePath - path to the base templates directory
 * @property {string} baseExtension - file extension '.template'
 * @property {string} baseEncoding - base file encoding 'utf8'
 * @property {string} baseCommonDir - commonly used template partials
 * @property {string} baseDefaultDir - default directory for templates
 * @property {function} baseGetNameFunc - calculate the name of a partial
 * @property {array} authPath - path to the authorization templates directory
 * @property {string} authExtension - auth file encoding 'utf8'
 * @property {string} authEncoding - auth file encoding
 * @property {string} authCommonDir - commonly used auth template partials
 * @property {string} authDefaultDir - default directory for auth templates
 * @property {function} authGetNameFunc - calculate tne name of a partial
 * @return {string} code - generated code for a model
 */

export function getCode({
  userType = USER_LITERAL,
  inputSchema = {},
  defaultTemplate = TEMPLATES_DEFAULT_TEMPLATE,
  basePath = [TEMPLATES_DIR, TEMPLATES_MODEL_DIR, TEMPLATES_DEFAULT_DIR],
  baseExtension = TEMPLATE_EXTENSION,
  baseEncoding = ENCODING,
  baseCommonDir = TEMPLATES_COMMON_DIR,
  baseDefaultDir = TEMPLATES_DEFAULT_DIR,
  baseGetNameFunc = getName,
  authPath = [TEMPLATES_DIR, TEMPLATES_MODEL_DIR, TEMPLATES_AUTH_DIR],
  authExtension = TEMPLATE_EXTENSION,
  authEncoding = ENCODING,
  authCommonDir = TEMPLATES_COMMON_DIR,
  authDefaultDir = TEMPLATES_DEFAULT_DIR,
  authGetNameFunc = getName
}) {
    // partials dictionary for template resolution
    const partials = {};

    function compile(templates) {
      templates.forEach(partial => {
        partials[partial.name] = Handlebars.compile(partial.source);
        Handlebars.registerPartial(partial.name, partials[partial.name]);
      });
    }

    Handlebars.registerHelper('foreach', function(arr, options) {
      if (options.inverse && !arr.length) {
        return options.inverse(this);
      }
      return arr
        .map(function(item, index) {
          item.$index = index;
          item.$first = index === 0;
          item.$last = index === arr.length - 1;
          item.$notFirst = index !== 0;
          item.$notLast = index !== arr.length - 1;
          return options.fn(item);
        })
        .join('');
    });

    // getting data context
    const context = getContext(inputSchema, userType);
    const typeName = context.typeName;

    // getting common partial templates
    const baseCommonPartials = getPartials({
      basePath,
      directoryPath: [baseCommonDir],
      extension: baseExtension,
      encoding: baseEncoding,
      getNameFunc: baseGetNameFunc
    });

    // getting type specific partial templates
    let baseTypePartials = getPartials({
      basePath,
      directoryPath: [typeName],
      extension: baseExtension,
      encoding: baseEncoding,
      getNameFunc: baseGetNameFunc
    });

    // set the start template
    let startTemplate = typeName;

    // fallback to default partial templates
    if (baseTypePartials.length === 0) {
      baseTypePartials = getPartials({
        basePath,
        directoryPath: [baseDefaultDir],
        extension: baseExtension,
        encoding: baseEncoding,
        getNameFunc: baseGetNameFunc
      });
      // reset start template to the default template, as type template not exists
      startTemplate = defaultTemplate;
    }

    // getting auth common partial templates
    const authCommonPartials = getPartials({
      basePath: authPath,
      directoryPath: [authCommonDir],
      extension: authExtension,
      encoding: authEncoding,
      getNameFunc: authGetNameFunc
    });

    // getting auth type specific partial templates
    let authTypePartials = getPartials({
      basePath: authPath,
      directoryPath: [typeName],
      extension: authExtension,
      encoding: authEncoding,
      getNameFunc: authGetNameFunc
    });

    // fallback to auth default partial templates
    if (authTypePartials.length === 0) {
      authTypePartials = getPartials({
        basePath: authPath,
        directoryPath: [authDefaultDir],
        extension: authExtension,
        encoding: authEncoding,
        getNameFunc: authGetNameFunc
      });
    }

    // compile all base partials
    compile(baseCommonPartials);
    compile(baseTypePartials);

    // compile all auth partials
    compile(authCommonPartials);
    compile(authTypePartials);

    // run start template with data context
    const code = partials[startTemplate](context);

    // return the final model code
    return code;
  }
  