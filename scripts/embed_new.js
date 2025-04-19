#!/usr/bin/env node
// scripts/embed_new.js
// Embed only articles missing a vector

require('dotenv').config();
const mongoose = require('mongoose');
const tf = require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');
const Article = require('../models/Article');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const model = await use.load();
  const cursor = Article.find({ vector: { $size: 0 } }).cursor();

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const text  = `${doc.title}. ${doc.description || doc.text.slice(0, 200)}`;
    const embeddings = await model.embed([text]);
    const arr = (await embeddings.array())[0];
    doc.vector = arr;
    await doc.save();
    console.log(`Embedded new article ${doc._id}`);
  }

  console.log('New embeddings done.');
  process.exit(0);
})();