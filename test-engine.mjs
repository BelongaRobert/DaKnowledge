import { DaKnowledge } from './src/engine.js';

const dk = new DaKnowledge('./config.yaml');
await dk.init();

const stats = dk.getStats();
console.log('\n=== DaKnowledge Stats ===');
console.log(stats);

if (stats.totalDocuments < 20) {
  throw new Error(`Expected the published site to be indexed, got ${stats.totalDocuments} documents`);
}

if (!dk.config.topics.find((topic) => topic.id === 'prayer')) {
  throw new Error('Ontology is missing prayer');
}

if (dk.config.scripture.canon !== 'catholic') {
  throw new Error('Canon must be catholic');
}

console.log('\n=== Trinity Documents ===');
const trinity = dk.searchByTopic('trinity');
console.log(trinity);
if (!trinity.length) {
  throw new Error('No trinity documents indexed');
}

console.log('\n=== Search "economic" ===');
const economic = dk.searchFullText('economic');
console.log(economic.slice(0, 3));
if (!economic.length) {
  throw new Error('Full-text search missed "economic"');
}

console.log('\n=== Get Document ===');
const doc = dk.getDocument('topics/trinity/economic-immanent-distinction.md');
console.log(doc ? `Found: ${doc.title}` : 'Not found');
if (!doc) {
  throw new Error('Research draft was not indexed');
}

const sitePage = dk.getDocument('site/christology/hypostatic-union.md');
if (!sitePage) {
  throw new Error('Published Christology page was not indexed');
}

const mary = dk.getDocument('site/mariology/theotokos.md');
if (!mary) {
  throw new Error('Mariology was not indexed');
}

const citations = dk.getDocument('site/scripture/citation-index.md');
if (!citations) {
  throw new Error('Scripture index was not generated');
}

console.log('Engine checks passed.');
