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
      bySource: new Map()
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
      scriptureReferences: this.index.byScripture.size
    };
  }
}

export { DaKnowledge };