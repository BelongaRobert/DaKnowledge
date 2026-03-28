# DaKnowledge 📚

Research-focused theological knowledge base for systematic study of the Trinity and related doctrines.

## Structure

```
daknowledge/
├── config.yaml          # Topic ontology and settings
├── data/
│   ├── topics/         # Theological topics
│   │   ├── trinity/
│   │   ├── christology/
│   │   ├── pneumatology/
│   │   ├── ecclesiology/
│   │   ├── soteriology/
│   │   ├── scripture/
│   │   └── theology-proper/
│   ├── sources/        # Historical sources
│   │   ├── church-fathers/
│   │   ├── reformers/
│   │   └── modern-scholars/
│   └── doctrine/       # Systematic summaries
├── src/
│   └── engine.js       # Core knowledge engine
└── scripts/
    └── build-index.js  # Index builder
```

## Document Format

All documents use YAML frontmatter + Markdown:

```yaml
---
title: "Document Title"
topic: trinity
tags:
  - tag1
  - tag2
sources:
  - "Author - Title"
scripture:
  - "John 1:1-14"
date: 2026-03-27
---

Content here...
```

## Usage

```javascript
import { DaKnowledge } from './src/engine.js';

const dk = new DaKnowledge('./config.yaml');
await dk.init();

// Search
const results = dk.searchByTopic('trinity');
const scriptureRefs = dk.searchByScripture('John 1:1');
const docs = dk.searchByTag('economic-trinity');

// Create document
await dk.createDocument(
  'topics/trinity/new-doc.md',
  { title: 'New Doc', topic: 'trinity', tags: ['tag1'] },
  'Content here...'
);
```

## Topics

- **Trinity**: Economic/Immanent Trinity, Persons, Processions
- **Christology**: Hypostatic Union, Two Natures, Person of Christ
- **Pneumatology**: Person and Work of the Holy Spirit
- **Ecclesiology**: Nature of the Church, Sacraments
- **Soteriology**: Justification, Sanctification, Atonement
- **Theology Proper**: Attributes of God, Divine Names
- **Scripture**: Canon, Inspiration, Hermeneutics

## License

MIT