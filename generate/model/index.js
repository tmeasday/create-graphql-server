import { print } from 'recast';
import { templateToAst } from '../util/read';
import getCode from '../util/getCode';
import { MODEL } from '../util/constants';
import { modulePath } from 'create-graphql-server-authorization';

export default function generateModel(inputSchema) {

  const templateCode = getCode(MODEL, {
    inputSchema,
    basePath: [__dirname, 'templates'],
    authPath: [modulePath, 'templates', 'model', 'auth']
  });

  // validate syntax of generated template code
  const replacements = {};
  const ast = templateToAst(templateCode, replacements);
  return print(ast, { trailingComma: true }).code;
}
