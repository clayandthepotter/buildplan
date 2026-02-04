const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * SkillLoader
 * Loads OpenClaw-style SKILL.md files from skills directory and exposes
 * skills by agent/domain. Each skill folder contains SKILL.md with YAML frontmatter.
 */
class SkillLoader {
  constructor(options = {}) {
    this.skillsRoot = options.skillsRoot || path.join(process.cwd(), 'skills');
    this.cache = new Map();
  }

  /**
   * Load all skills into memory (cached)
   */
  loadAll() {
    if (!fs.existsSync(this.skillsRoot)) {
      logger.warn(`[SkillLoader] Skills root not found: ${this.skillsRoot}`);
      return {};
    }

    const domains = fs.readdirSync(this.skillsRoot, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const result = {};

    for (const domain of domains) {
      const domainDir = path.join(this.skillsRoot, domain);
      const skillDirs = fs.readdirSync(domainDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      result[domain] = [];

      for (const sd of skillDirs) {
        const skillPath = path.join(domainDir, sd, 'SKILL.md');
        if (!fs.existsSync(skillPath)) continue;
        const raw = fs.readFileSync(skillPath, 'utf8');
        const { frontmatter, body } = this.parseFrontmatter(raw);
        result[domain].push({ ...frontmatter, body, path: skillPath });
      }
    }

    this.cache.set('all', result);
    logger.info(`[SkillLoader] Loaded skills for domains: ${Object.keys(result).join(', ')}`);
    return result;
  }

  getAll() {
    return this.cache.get('all') || this.loadAll();
  }

  /**
   * Parse YAML frontmatter from a markdown document
   */
  parseFrontmatter(md) {
    const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) return { frontmatter: {}, body: md };
    const yaml = m[1];
    const body = m[2].trim();
    const frontmatter = {};
    for (const line of yaml.split('\n')) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      frontmatter[key] = this.parseValue(value);
    }
    return { frontmatter, body };
  }

  parseValue(val) {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (!isNaN(Number(val))) return Number(val);
    if (val.startsWith('[') && val.endsWith(']')) {
      try { return JSON.parse(val.replace(/(['\"])?([a-zA-Z0-9_\- ]+)(['\"])?:/g, '"$2":')); } catch (_) {}
    }
    return val.replace(/^['\"]|['\"]$/g, '');
  }
}

module.exports = new SkillLoader();
