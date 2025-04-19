#!/usr/bin/env node
// scripts/embed_all.js
// Backfill embeddings for all existing articles using TensorFlow.js Universal Sentence Encoder

require('dotenv').config();
const mongoose = require('mongoose');
const tf = require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');
const Article = require('../models/Article');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const model = await use.load();
  const articles = await Article.find({});

  for (let doc of articles) {
    const text  = `${doc.title}. ${doc.description || doc.text.slice(0, 200)}`;
    const embeddings = await model.embed([text]);
    const arr = (await embeddings.array())[0];
    doc.vector = arr;
    await doc.save();
    console.log(`Embedded article ${doc._id}`);
  }

  console.log('All done.');
  process.exit(0);
})();