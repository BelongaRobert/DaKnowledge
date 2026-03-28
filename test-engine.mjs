import { DaKnowledge } from './src/engine.js';

const dk = new DaKnowledge('./config.yaml');
await dk.init();

console.log('\n=== DaKnowledge Stats ===');
console.log(dk.getStats());

console.log('\n=== Trinity Documents ===');
console.log(dk.searchByTopic('trinity'));

console.log('\n=== Search "economic" ===');
console.log(dk.searchFullText('economic'));

console.log('\n=== Get Document ===');
const doc = dk.getDocument('topics/trinity/economic-immanent-distinction.md');
console.log(doc ? `Found: ${doc.title}` : 'Not found');