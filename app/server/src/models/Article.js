const mongoose = require('mongoose');

if (process.env.USE_DEV_FILE_DB === 'true') {
  module.exports = require('../devStore').Article;
  return;
}

const entitySchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    label: { type: String, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true }
  },
  { _id: false }
);

const entityMappingSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    label: { type: String, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    englishText: { type: String },
    englishStart: { type: Number },
    englishEnd: { type: Number },
    englishTokenIndices: { type: [Number], default: [] },
    hindiTokenIndices: { type: [Number], default: [] }
  },
  { _id: false }
);

const articleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true },
    entities: { type: [entitySchema], default: [] },

    // Optional metadata for non-English workflows (e.g., Hindi -> English -> NER -> alignment)
    language: { type: String, default: 'en' },
    translatedText: { type: String },
    entitiesEnglish: { type: [entitySchema], default: [] },
    entityMappings: { type: [entityMappingSchema], default: [] }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('Article', articleSchema);
