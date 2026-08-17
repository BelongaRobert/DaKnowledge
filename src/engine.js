import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import matter from 'gray-matter';
import { load as loadYaml } from 'js-yaml';

/**
 * DaKnowledge Core Engine
 * Manages documents, search, and scripture indexing
 */

class DaKnowledge {
  constructor(configPath) {
    this.basePath = dirname(configPath);
    this.config = null;
    this.documents = new Map();
    this.index = {
      byTopic: new Map(),
      byTag: new Map(),
      byScripture: new Map(),
      bySource: new Map(),
      byCcc: new Map()
    };
  }

  async init() {
    console.log('📚 DaKnowledge Initializing...');
    
    // Load config
    const configData = await readFile(
      join(this.basePath, 'config.yaml'), 
      'utf-8'
    );
    this.config = loadYaml(configData);
    
    console.log(`✅ Loaded ontology: ${this.config.topics.length} topics`);
    
    // Build index
    await this.buildIndex();
    
    console.log(`📊 Indexed ${this.documents.size} documents`);
    console.log('🚀 DaKnowledge ready');
  }

  async buildIndex() {
    await this.scanDirectory(join(this.basePath, 'data'));
    await this.scanDirectory(join(this.basePath, 'website', 'docs'), 'site');
  }

  async scanDirectory(dirPath, relativePath = '') {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        const relPath = join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, relPath);
        } else if (entry.isFile() && extname(entry.name) === '.md') {
          await this.indexDocument(fullPath, relPath);
        }
      }
    } catch (err) {
      // Directory might not exist yet
    }
  }

  async indexDocument(fullPath, relativePath) {
    try {
      const content = await readFile(fullPath, 'utf-8');
      const parsed = matter(content);
      
      const doc = {
        path: relativePath,
        fullPath: fullPath,
        title: parsed.data.title || basename(relativePath, '.md'),
        topic: parsed.data.topic || this.inferTopic(relativePath),
        tags: parsed.data.tags || [],
        sources: parsed.data.sources || [],
        scripture: parsed.data.scripture?.length
          ? parsed.data.scripture
          : this.extractScripture(parsed.content),
        ccc: parsed.data.ccc?.length
          ? parsed.data.ccc.map(String)
          : this.extractCcc(parsed.content),
        date: parsed.data.date || new Date().toISOString(),
        content: parsed.content,
        excerpt: this.generateExcerpt(parsed.content)
      };
      
      this.documents.set(relativePath, doc);
      
      // Index by topic
      if (doc.topic) {
        if (!this.index.byTopic.has(doc.topic)) {
          this.index.byTopic.set(doc.topic, []);
        }
        this.index.byTopic.get(doc.topic).push(relativePath);
      }
      
      // Index by tags
      for (const tag of doc.tags) {
        if (!this.index.byTag.has(tag)) {
          this.index.byTag.set(tag, []);
        }
        this.index.byTag.get(tag).push(relativePath);
      }
      
      // Index by scripture
      for (const ref of doc.scripture) {
        if (!this.index.byScripture.has(ref)) {
          this.index.byScripture.set(ref, []);
        }
        this.index.byScripture.get(ref).push(relativePath);
      }

      for (const source of doc.sources) {
        if (!this.index.bySource.has(source)) {
          this.index.bySource.set(source, []);
        }
        this.index.bySource.get(source).push(relativePath);
      }

      for (const n of doc.ccc) {
        if (!this.index.byCcc.has(n)) {
          this.index.byCcc.set(n, []);
        }
        this.index.byCcc.get(n).push(relativePath);
      }
      
    } catch (err) {
      console.error(`Failed to index ${relativePath}:`, err.message);
    }
  }

  inferTopic(relativePath) {
    const parts = relativePath.split('/');
    if (parts[0] === 'topics' && parts[1]) {
      return parts[1];
    }
    if (parts[0] === 'site' && parts[1] && !parts[1].endsWith('.md')) {
      return parts[1];
    }
    return 'uncategorized';
  }

  extractScripture(content) {
    const refs = new Set();
    const pattern = /\b(?:[1-3]\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+\d+:\d+(?:-\d+)?/g;
    const matches = content.match(pattern) || [];
    for (const match of matches) {
      refs.add(match.replace(/\s+/g, ' ').trim());
    }
    return [...refs];
  }

  extractCcc(content) {
    const nums = new Set();
    const pattern = /\b(?:CCC|Catechism)\s+(\d{1,4})(?:-\d{1,4})?/gi;
    let match;
    while ((match = pattern.exec(content))) {
      nums.add(match[1]);
    }
    return [...nums];
  }

  generateExcerpt(content, maxLength = 200) {
    const plainText = content
      .replace(/#+ /g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*|__/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
  }

  // Search methods
  searchByTopic(topic) {
    return this.index.byTopic.get(topic) || [];
  }

  searchByTag(tag) {
    return this.index.byTag.get(tag) || [];
  }

  searchByScripture(reference) {
    return this.index.byScripture.get(reference) || [];
  }

  summarizePaths(paths) {
    return paths.map((path) => {
      const doc = this.getDocument(path);
      return doc
        ? {
            path: doc.path,
            title: doc.title,
            excerpt: doc.excerpt,
            topic: doc.topic,
          }
        : { path };
    });
  }

  normalizeScripture(reference) {
    return String(reference || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  lookupScripture(reference) {
    const needle = this.normalizeScripture(reference);
    if (!needle) return [];
    const pathSet = new Set();
    for (const [key, paths] of this.index.byScripture) {
      const norm = this.normalizeScripture(key);
      if (norm === needle || norm.includes(needle) || needle.includes(norm)) {
        for (const path of paths) pathSet.add(path);
      }
    }
    if (pathSet.size === 0) {
      for (const hit of this.searchFullText(reference).slice(0, 8)) {
        pathSet.add(hit.path);
      }
    }
    return this.summarizePaths([...pathSet]);
  }

  lookupCcc(number) {
    const key = String(number || '')
      .replace(/^[^\d]+/, '')
      .trim();
    if (!key) return [];
    const paths = this.index.byCcc.get(key) || [];
    return this.summarizePaths(paths);
  }

  firstSentences(text, count = 2) {
    const plain = String(text || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!plain) return '';
    const parts = plain.split(/(?<=[.!?])\s+/).filter(Boolean);
    return parts.slice(0, count).join(' ');
  }

  synthesize(query, { limit = 4 } = {}) {
    const hits = this.searchFullText(query).slice(0, limit);
    const citations = {
      paths: [],
      scripture: [],
      ccc: [],
      sources: [],
    };
    const answerParts = [];

    for (const hit of hits) {
      const doc = this.getDocument(hit.path);
      if (!doc) continue;
      citations.paths.push({
        path: doc.path,
        title: doc.title,
        topic: doc.topic,
      });
      for (const ref of doc.scripture.slice(0, 4)) {
        if (!citations.scripture.includes(ref)) citations.scripture.push(ref);
      }
      for (const n of doc.ccc || []) {
        if (!citations.ccc.includes(n)) citations.ccc.push(n);
      }
      for (const source of doc.sources.slice(0, 3)) {
        if (!citations.sources.includes(source)) citations.sources.push(source);
      }
      const snippet = this.firstSentences(doc.excerpt || doc.content, 2);
      if (snippet) answerParts.push(snippet);
    }

    const answer = answerParts.join(' ').slice(0, 700);
    return {
      query,
      answer: answer || 'No indexed teaching matched that query.',
      citations,
    };
  }

  searchFullText(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [path, doc] of this.documents) {
      if (doc.title.toLowerCase().includes(lowerQuery) ||
          doc.content.toLowerCase().includes(lowerQuery) ||
          doc.excerpt.toLowerCase().includes(lowerQuery)) {
        results.push({
          path,
          title: doc.title,
          excerpt: doc.excerpt,
          score: this.calculateScore(doc, lowerQuery)
        });
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }

  calculateScore(doc, query) {
    let score = 0;
    if (doc.title.toLowerCase().includes(query)) score += 10;
    if (doc.excerpt.toLowerCase().includes(query)) score += 5;
    const contentMatches = (doc.content.toLowerCase().match(new RegExp(query, 'g')) || []).length;
    score += contentMatches;
    return score;
  }

  async createDocument(path, frontmatter, content) {
    const fullPath = join(this.basePath, 'data', path);
    await mkdir(dirname(fullPath), { recursive: true });
    
    const yamlFrontmatter = Object.entries(frontmatter)
      .map(([k, v]) => {
        if (Array.isArray(v)) {
          return `${k}:\n${v.map(item => `  - ${item}`).join('\n')}`;
        }
        return `${k}: ${v}`;
      })
      .join('\n');
    
    const docContent = `---\n${yamlFrontmatter}\n---\n\n${content}`;
    await writeFile(fullPath, docContent);
    
    // Re-index
    await this.indexDocument(fullPath, path);
    
    return { path, fullPath };
  }

  getDocument(path) {
    return this.documents.get(path);
  }

  getStats() {
    return {
      totalDocuments: this.documents.size,
      topics: this.index.byTopic.size,
      tags: this.index.byTag.size,
      scriptureReferences: this.index.byScripture.size,
      cccReferences: this.index.byCcc.size
    };
  }
}

export { DaKnowledge };