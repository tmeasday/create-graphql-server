import fs from 'fs';
import { parse, print } from 'recast';
import espree from 'espree';

function read(name) {
  return fs.readFileSync(`${__dirname}/templates/${name}.js`, 'utf8');
}

const templates = {
  base: read('base'),
  fieldOfType: read('fieldOfType'),
  paginatedField: read('paginatedField'),
};

function lcFirst(str) {
  return str[0].toLowerCase() + str.substring(1);
}

function ucFirst(str) {
  return str[0].toUpperCase() + str.substring(1);
}

// Take a template, replacing each replacement.
function templateToAst(template, replacements) {
  const source = Object.keys(replacements).reduce(
    (string, key) => string.replace(new RegExp(key, 'g'), replacements[key]),
    template
  );

  return parse(source, { parser: espree });
}

const generators = {
  base({ typeName, TypeName }) {
    return templateToAst(templates.base, { typeName, TypeName });
  },
  belongsTo({ typeName, fieldName, ReturnTypeName }) {
    return templateToAst(templates.fieldOfType, {
      typeName,
      fieldName,
      ModelName: ReturnTypeName,
      modelMethod: 'findOneById',
      modelArgument: `${typeName}.${fieldName}Id`,
    });
  },
  belongsToMany({ typeName, fieldName, ReturnTypeName }) {
    return templateToAst(templates.fieldOfType, {
      typeName,
      fieldName,
      ModelName: ReturnTypeName,
      modelMethod: 'findByIds',
      modelArgument: `${typeName}.${fieldName}Ids`,
    });
  },
  hasOne({ typeName, fieldName, ReturnTypeName }, { as }) {
    return templateToAst(templates.fieldOfType, {
      typeName,
      fieldName,
      ModelName: ReturnTypeName,
      modelMethod: `findOneBy${ucFirst(as)}Id`,
      modelArgument: `${typeName}.id`,
    });
  },
  hasMany({ typeName, fieldName, ReturnTypeName }, { as }) {
    return templateToAst(templates.paginatedField, {
      typeName,
      fieldName,
      ModelName: ReturnTypeName,
      modelMethod: `findBy${ucFirst(as)}Id`,
      modelArgument: `${typeName}.id`,
    });
  },
  hasAndBelongsToMany({ typeName, fieldName, ReturnTypeName }) {
    return templateToAst(templates.paginatedField, {
      typeName,
      fieldName,
      ModelName: ReturnTypeName,
      modelMethod: fieldName,
      modelArgument: typeName,
    });
  },
};

const SCALAR_TYPE_NAMES = ['Int', 'Float', 'String', 'ID'];

function getBaseType(type) {
  if (type.kind === 'ListType' || type.kind === 'NonNullType') {
    return getBaseType(type.type);
  }
  return type;
}

function argumentsToObject(argumentsAst) {
  const result = {};
  argumentsAst.forEach((argument) => {
    result[argument.name.value] = argument.value.value;
  });
  return result;
}

export default function generateResolvers(inputSchema) {
  const type = inputSchema.definitions[0];
  const TypeName = type.name.value;
  const typeName = lcFirst(TypeName);

  const ast = generators.base({ TypeName, typeName });

  // XXX: rather than hardcoding in array indices it would be less brittle to
  // walk the tree using https://github.com/benjamn/ast-types
  const typeResolversAst = ast.program.body[1] // export
    .declaration // variable declaration
    .declarations[0].init // object expression
    .properties[0].value; // object value

  function addResolverToAst(resolverFunctionAst) {
    const resolverProperty = resolverFunctionAst.program.body[0] // variable declaration
      .declarations[0].init // object expression
      .properties[0];

    typeResolversAst.properties.push(resolverProperty);
  }

  type.fields.forEach((field) => {
    const ReturnTypeName = getBaseType(field.type).name.value;
    // We don't need a resolver for scalar fields
    if (SCALAR_TYPE_NAMES.includes(ReturnTypeName)) {
      return;
    }

    // find the first directive on the field that has a generator
    const directive = field.directives.find(d => !!generators[d.name.value]);
    const fieldName = field.name.value;

    if (directive) {
      const generator = generators[directive.name.value];
      const options = argumentsToObject(directive.arguments);
      addResolverToAst(generator({ typeName, fieldName, ReturnTypeName }, options));
    } else {
      // XXX: chances are we'll want to change this but this works for now
      const isArrayField = field.type.kind === 'ListType';
      const generator = isArrayField ? generators.belongsToMany : generators.belongsTo;
      addResolverToAst(generator({ typeName, fieldName, ReturnTypeName }, { as: fieldName }));
    }
  });

  return print(ast, { trailingComma: true }).code;
}
