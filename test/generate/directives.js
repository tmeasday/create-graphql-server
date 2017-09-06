import { describe, it } from 'mocha';
import { expect } from 'chai';
import { parse, Kind } from 'graphql';

import generateSchema from '../../generate/schema';
import { generateResolversAst } from '../../generate/resolvers';
import { generateModelAst } from '../../generate/model';

describe('directives', () => {
  describe('@enum', () => {
    const input = parse(`type Test {
      status: TestStatus @enum
    }`);
    
    it('leaves the typename unchanged in the schema', () => {
      const schema = generateSchema(input);

      function checkStatusField(type) {
        const statusField = type.fields.find(f => f.name.value === 'status');
        expect(statusField.type.name.value).to.equal('TestStatus');
      }

      const testType = schema.definitions[0];
      checkStatusField(testType);

      const createInputType = schema.definitions.find(defn =>
        defn.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION
          && defn.name.value === 'CreateTestInput');
      checkStatusField(createInputType);

      const updateInputType = schema.definitions.find(defn =>
        defn.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION
          && defn.name.value === 'UpdateTestInput');
      checkStatusField(updateInputType);
    });

    it('does not generate a resolver', () => {
      const ast = generateResolversAst(input);
      let keys = [];
      // less offensive, otherwise, we have to change it after each
      // change in the templates
      ast.program.body.forEach(body => {
        if (body.declarations &&
            body.declarations.length > 0) {

            body.declarations.forEach(declaration => {
              if (declaration.init &&
                  declaration.init.properties &&
                  declaration.init.properties.length > 0){

                const Test = declaration.init.properties.find(p => p.key.name === 'Test');
                if (Test && Test.value && Test.value.properties && Test.value.properties.length > 0) {
                  keys = keys.concat(Test.value.properties.map(p => p.key.name));
                }
              }
            });
        }
      });
      expect(keys).to.not.include('status');
    });

    it('does not generate a model function', () => {
      const ast = generateModelAst(input);
      let keys = [];
      // less offensive, otherwise, we have to change it after each
      // change in the templates
      ast.program.body.forEach(body =>{
        if (body.declaration &&
           body.declaration.body &&
           body.declaration.body.body &&
           body.declaration.body.body.length > 0) {
        keys = keys.concat(body.declaration.body.body.map(p => p.key.name));
        }
      });
      expect(keys).to.not.include('status');
    });
  });
});
