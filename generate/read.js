import fs from 'fs';
import { parse } from 'graphql';
import { parse as recastParse } from 'recast';
import * as babylon from 'babylon';

export default function readInput(path) {
  return parse(fs.readFileSync(path, 'utf8'));
}

const babylonParser = {
  parse(code) {
    return babylon.parse(code, { 
      sourceType: 'module',
        plugins: [
          'objectRestSpread'
        ]
    });
  },
};

// Take a template, replacing each replacement.
export function templateToAst(template, replacements) {
  const source = Object.keys(replacements).reduce(
    (string, key) => string.replace(new RegExp(key, 'g'), replacements[key]),
    template
  );

  return recastParse(source, { parser: babylonParser });
}
