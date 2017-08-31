import fs from 'fs';
import { print } from 'recast';

import { templateToAst } from '../read';
import { lcFirst } from '../util/capitalization';
import generatePerField from '../util/generatePerField';
import { generateAuthorizationCode } from 'create-graphql-server-authorization';

function read(name) {
  return fs.readFileSync(`${__dirname}/templates/${name}.js.template`, 'utf8');
}

const templates = {
  base: read('base'),
  singularAssociation: read('singularAssociation'),
  paginatedAssociation: read('paginatedAssociation'),
};

function buildAst(template, {
  typeName,
  fieldName,
  argsStr,
  ReturnTypeName,
  query,
}) {
  const argsWithDefaultsStr = argsStr
    .replace('lastCreatedAt', 'lastCreatedAt = 0')
    .replace('limit', 'limit = 10');
  return templateToAst(template, {
    typeName,
    fieldName,
    argsStr: argsWithDefaultsStr,
    ReturnTypeName,
    query,
  });
}

const generators = {
  base(replacements) {
    return templateToAst(templates.base, replacements)
  },
  belongsTo(replacements) {
    return buildAst(templates.singularAssociation, replacements);
  },
  belongsToMany(replacements) {
    const { typeName, fieldName } = replacements;
    return buildAst(templates.paginatedAssociation, {
      ...replacements,
      query: `_id: { $in: ${typeName}.${fieldName}Ids || [] }`,
    });
  },
  // TODO: write test and implement
  // hasOne({ typeName, fieldName, ReturnTypeName }, { as }) {
  //   return templateToAst(templates.singularAssociation, {
  //     typeName,
  //     fieldName,
  //     ReturnTypeName,
  //   });
  // },
  hasMany(replacements, { as }) {
    const { typeName } = replacements;
    return buildAst(templates.paginatedAssociation, {
      ...replacements,
      query: `${as || typeName}Id: ${typeName}._id`,
    });
  },
  hasAndBelongsToMany(replacements, { as }) {
    const { typeName } = replacements;
    return buildAst(templates.paginatedAssociation, {
      ...replacements,
      query: `${as || typeName}Ids: ${typeName}._id`,
    });
  },
};

function getClassMethods(program){
  let classMethodsAst;

  program.body.forEach(Node => {

    if (Node.type === 'ExportDefaultDeclaration' &&
        Node.declaration.type === 'ClassDeclaration' &&
        Node.declaration.body.type === 'ClassBody'){
      classMethodsAst = Node.declaration.body.body;
    }

  });

  return classMethodsAst;
}

function getResolverClassMethod(program){
  let classMethodsAst;

  program.body.forEach(Node => {

    if (Node.type === 'ClassDeclaration' &&
        Node.body.type === 'ClassBody' &&
        Node.body.body[0].type === 'ClassMethod'){
      classMethodsAst = Node.body.body[0];
    }

  });

  return classMethodsAst;
}

export function generateModelAst(inputSchema) {
  const type = inputSchema.definitions[0];
  const TypeName = type.name.value;
  const typeName = lcFirst(TypeName);

  const ast = generators.base({ 
    TypeName,
    typeName,
    ...generateAuthorizationCode( typeName, inputSchema )
  });

  // XXX: rather than hardcoding in array indices it would be less brittle to
  // walk the tree using https://github.com/benjamn/ast-types
  // find: 'ExportDefaultDeclaration'
  const classMethodsAst = getClassMethods(ast.program);

  const findOneMethod = classMethodsAst.find(m => m.key.name === 'find');
  let nextIndex = classMethodsAst.indexOf(findOneMethod) + 1;

  generatePerField(type, generators).forEach((resolverFunctionAst) => {
    const classMethodAst = getResolverClassMethod(resolverFunctionAst.program);
    classMethodsAst.splice(nextIndex, 0, classMethodAst);
    nextIndex += 1;
  });

  return ast;
}

export default function generateModel(inputSchema) {
  const ast = generateModelAst(inputSchema);
  return print(ast, { trailingComma: true }).code;
}
