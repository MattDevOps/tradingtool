/**
 * Test ThinkOrSwim detection
 */
import { readFileSync } from 'fs';
import { isThinkOrSwimStatement } from '../lib/thinkorswim-parser';

const csvText = readFileSync('sample-thinkorswim-statement.csv', 'utf-8');
const isTOS = isThinkOrSwimStatement(csvText);

console.log('Detection result:', isTOS);
console.log('First 500 chars:', csvText.substring(0, 500));
