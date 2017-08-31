// @flow
/* eslint-disable max-len */
/* eslint-disable flowtype/no-weak-types */

// kinds from graphql language
export {
  NAME,
  ARGUMENT,
  NAMED_TYPE,
  LIST_TYPE,
  NON_NULL_TYPE,
  FIELD_DEFINITION,
  DIRECTIVE,
  LIST,
  STRING
} from 'graphql/language/kinds';

// files encoding
export const ENCODING = 'utf8';

// templates naming
export const TEMPLATE_EXTENSION = '.template';
export const TEMPLATES_DIR = 'templates';
export const TEMPLATES_MODEL_DIR = 'model';
export const TEMPLATES_RESOLVER_DIR = 'resolver';
export const TEMPLATES_AUTH_DIR = 'auth';
export const TEMPLATES_COMMON_DIR = 'common';
export const TEMPLATES_DEFAULT_DIR = 'default';
export const TEMPLATES_DEFAULT_TEMPLATE = 'default';

export const SINGULAR = 'singular';
export const PAGINATED = 'paginated';

// test directories
export const SRC_DIR = 'src';
export const TEST_DIR = '__tests__';
export const TEST_GQL_DATA = 'data';
export const TEST_CODE = 'code';
export const TEST_MODEL = 'model';
export const TEST_RESOLVER = 'resolver';
export const TEST_GQL_EXTENSION = '.graphql';
export const TEST_EXPECTED_CODE = 'expected';
export const TEST_GENERATED_CODE = 'generated';
export const TEST_MODEL_EXTENSION = '.js';
export const TEST_MODEL_EXTENSION2 = 'model';
export const TEST_RESOLVER_EXTENSION = '.js';
export const TEST_RESOLVER_EXTENSION2 = 'resolver';

// name of the @authorize directive, which triggers authorization logic
export const AUTHORIZE_DIRECTIVE = 'authorize';

// authorization modes
export const CREATE = 'create';
export const READ = 'read'; // 'read' means both, 'readOne' and 'readMany'
export const READ_ONE = 'readOne';
export const READ_MANY = 'readMany';
export const UPDATE = 'update';
export const DELETE = 'delete';

// valid input modes from @authorize directive
export const MODES = [CREATE, READ, READ_ONE, READ_MANY, UPDATE, DELETE];

// valid output mode for code generator
export const CODE_MODES = [CREATE, READ_ONE, READ_MANY, UPDATE, DELETE];

// for the role definitions
export const AUTH_ROLE = 'authRole';
export const USER_ROLE = 'userRole';
export const DOC_ROLE = 'docRole';
export const FOR = 'for';
export const USER_MODEL = 'user';
export const STRING_LITERAL = 'String';
export const STRING_LIST = '[String]';
export const USER_LITERAL = 'User';
export const USER_LIST = '[User]';
export const ROLE_FIELD_DEFAULT = 'role';

// handling of id
export const ID_FIELD = '_id';
export const ID_SINGULAR = 'Id';
export const ID_PLURAL = 'Ids';

// special roles
export const THIS = 'this';
export const WORLD = 'world';
export const NO_ROLE = '<no-role>';
export const NO_USER = '<no-user>';

// loglevel, maximum logfile size, maximum number of logfiles
export const LOG_LEVEL = 'debug';
export const LOG_MAX_FILES = 5;
export const LOG_MAX_SIZE = 5;
