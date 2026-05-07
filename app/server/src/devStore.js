const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const dbPath = process.env.DEV_DB_PATH || path.join(__dirname, '..', 'data', 'dev-db.json');

let loaded = false;
let state = { users: [], articles: [] };
let writeQueue = Promise.resolve();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function id() {
  return crypto.randomUUID();
}

async function load() {
  if (loaded) return;

  try {
    const raw = await fs.readFile(dbPath, 'utf8');
    const data = JSON.parse(raw);
    state = {
      users: Array.isArray(data.users) ? data.users : [],
      articles: Array.isArray(data.articles) ? data.articles : []
    };
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[dev-db] Could not read ${dbPath}: ${err.message}`);
    }
    state = { users: [], articles: [] };
  }

  loaded = true;
}

async function save() {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  const next = JSON.stringify(state, null, 2);
  writeQueue = writeQueue.then(() => fs.writeFile(dbPath, next));
  await writeQueue;
}

function hydrateUser(raw) {
  if (!raw) return null;
  const user = new UserDocument(clone(raw));
  user.loginCodeExpiresAt = raw.loginCodeExpiresAt ? new Date(raw.loginCodeExpiresAt) : null;
  user.loginCodeLastSentAt = raw.loginCodeLastSentAt ? new Date(raw.loginCodeLastSentAt) : null;
  return user;
}

function serializeUser(user) {
  const raw = clone(user);
  raw.loginCodeExpiresAt = user.loginCodeExpiresAt
    ? new Date(user.loginCodeExpiresAt).toISOString()
    : null;
  raw.loginCodeLastSentAt = user.loginCodeLastSentAt
    ? new Date(user.loginCodeLastSentAt).toISOString()
    : null;
  raw.updatedAt = new Date().toISOString();
  return raw;
}

class UserDocument {
  constructor(data) {
    Object.assign(this, data);
  }

  async save() {
    await load();
    const raw = serializeUser(this);
    const idx = state.users.findIndex((user) => user._id === this._id);
    if (idx === -1) state.users.push(raw);
    else state.users[idx] = raw;
    await save();
    return this;
  }
}

const User = {
  async findOne(filter = {}) {
    await load();

    if (filter.email) {
      const email = String(filter.email).trim().toLowerCase();
      return hydrateUser(state.users.find((user) => user.email === email));
    }

    if (filter._id) {
      return hydrateUser(state.users.find((user) => user._id === String(filter._id)));
    }

    return null;
  },

  async create(data) {
    await load();
    const now = new Date().toISOString();
    const user = new UserDocument({
      _id: id(),
      name: data.name || null,
      email: String(data.email).trim().toLowerCase(),
      password: data.password || null,
      loginCodeHash: null,
      loginCodeExpiresAt: null,
      loginCodeAttempts: 0,
      loginCodeLastSentAt: null,
      createdAt: now,
      updatedAt: now
    });
    state.users.push(serializeUser(user));
    await save();
    return user;
  }
};

function hydrateArticle(raw) {
  if (!raw) return null;
  return {
    ...clone(raw),
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date()
  };
}

function matchesArticle(filter, article) {
  if (filter.userId && String(article.userId) !== String(filter.userId)) return false;

  if (filter._id && String(article._id) !== String(filter._id)) return false;

  if (filter.text && filter.text.$regex) {
    const flags = filter.text.$options || '';
    const re = new RegExp(filter.text.$regex, flags);
    return re.test(article.text || '');
  }

  return true;
}

class ArticleQuery {
  constructor(filter) {
    this.filter = filter || {};
    this.sortSpec = null;
    this.limitCount = null;
  }

  sort(spec) {
    this.sortSpec = spec;
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  async lean() {
    await load();
    let rows = state.articles.filter((article) => matchesArticle(this.filter, article));

    if (this.sortSpec?.createdAt) {
      const dir = Number(this.sortSpec.createdAt);
      rows = rows.sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return dir < 0 ? tb - ta : ta - tb;
      });
    }

    if (typeof this.limitCount === 'number') {
      rows = rows.slice(0, this.limitCount);
    }

    return rows.map(clone);
  }
}

const Article = {
  async create(data) {
    await load();
    const now = new Date().toISOString();
    const article = {
      _id: id(),
      userId: String(data.userId),
      text: data.text,
      entities: Array.isArray(data.entities) ? data.entities : [],
      language: data.language || 'en',
      translatedText: data.translatedText,
      entitiesEnglish: Array.isArray(data.entitiesEnglish) ? data.entitiesEnglish : [],
      entityMappings: Array.isArray(data.entityMappings) ? data.entityMappings : [],
      createdAt: now
    };
    state.articles.push(clone(article));
    await save();
    return hydrateArticle(article);
  },

  find(filter = {}) {
    return new ArticleQuery(filter);
  },

  async findOneAndDelete(filter = {}) {
    await load();
    const idx = state.articles.findIndex((article) => matchesArticle(filter, article));
    if (idx === -1) return null;

    const [deleted] = state.articles.splice(idx, 1);
    await save();
    return hydrateArticle(deleted);
  }
};

module.exports = { Article, User };
