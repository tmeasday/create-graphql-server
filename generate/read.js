import fs from 'fs';
import { parse } from 'graphql';

export default function readInput(path) {
  return parse(fs.readFileSync(path, 'utf8'));
}
