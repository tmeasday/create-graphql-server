 import { print } from 'recast';
 import getCode from '../util/getCode';
 import { templateToAst } from '../util/read';
 import { RESOLVER } from '../util/constants';
 import { modulePath } from 'create-graphql-server-authorization';

export default function generateResolver(inputSchema) {

  const templateCode = getCode(RESOLVER, {
    inputSchema,
    basePath: [__dirname, 'templates'],
    authPath: [modulePath, 'templates','resolver', 'auth']
  });

  // validate syntax of generated template code
  const replacements = {};
  const ast = templateToAst(templateCode, replacements);
  return print(ast, { trailingComma: true }).code;
}
