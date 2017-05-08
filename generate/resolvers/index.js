import fs from 'fs';
import { print } from 'recast';

import { templateToAst } from '../read';
import generatePerField from '../util/generatePerField';
import { lcFirst } from '../util/capitalization';

function read(name) {
  return fs.readFileSync(`${__dirname}/templates/${name}.js.template`, 'utf8');
}

const templates = {
  base: read('base'),
  user: read('base'),
  fieldOfType: read('fieldOfType'),
  paginatedField: read('paginatedField'),
};

function generateResolver(template) {
  return ({ TypeName, typeName, fieldName, argsStr }) => {
    return templateToAst(template, { typeName, TypeName, fieldName, argsStr });
  };
}

const generators = {
  base({ typeName, TypeName }, mode) {
    if (mode === 'add-user') {
      return templateToAst(templates.user, { typeName, TypeName });
    }
    return templateToAst(templates.base, { typeName, TypeName });
  },
  belongsTo: generateResolver(templates.fieldOfType),
  belongsToMany: generateResolver(templates.paginatedField),
  hasOne: generateResolver(templates.fieldOfType),
  hasMany: generateResolver(templates.paginatedField),
  hasAndBelongsToMany: generateResolver(templates.paginatedField),
};

export function generateResolversAst(inputSchema, mode) {
  const type = inputSchema.definitions[0];
  const TypeName = type.name.value;
  const typeName = lcFirst(TypeName);

  const ast = generators.base({ TypeName, typeName }, mode);

  // XXX: rather than hardcoding in array indices it would be less brittle to
  // walk the tree using https://github.com/benjamn/ast-types
  const typeResolversAst =
    ast.program.body[1].declarations[0].init.properties[0].value;
    // const // object expression // object value

  generatePerField(type, generators).forEach((resolverFunctionAst) => {
    const resolverProperty =
      resolverFunctionAst.program.body[0].declarations[0].init.properties[0];
      // variable declaration // object expression

    typeResolversAst.properties.push(resolverProperty);
  });

  return ast;
}

export default function generateResolvers(inputSchema, mode) {
  const ast = generateResolversAst(inputSchema, mode);
  return print(ast, { trailingComma: true }).code;
}
