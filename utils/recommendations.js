// utils/recommendations.js — NLP-Based Recommendation System (Philosophy Optimized)

const axios = require('axios');
const cosineSimilarity = require('cosine-similarity');
const Article = require('../models/Article');

const SIMILARITY_THRESHOLD = 0.15;
const TOP_K = 5;

/**
 * Generates semantic embedding for a given article using Cohere NLP API
 * Includes title, tag, and text to maximize contextual richness
 */
async function encodeTextForEmbedding(text) {
  try {
    const response = await axios.post(
      'https://api.cohere.ai/embed',
      {
        texts: [text],
        model: 'embed-english-v3.0',
        input_type: 'search_document'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.embeddings[0];
  } catch (err) {
    console.error('❌ NLP Embedding failed:', err.message);
    return Array(1024).fill(0);  // fallback: zero vector
  }
}

/**
 * NLP Vectorization of all articles — regenerates vectors from title+tag+text
 */
async function vectorizeArticles() {
  try {
    const articles = await Article.find().select('_id title tag text');
    for (const article of articles) {
      const content = `${article.title || ''} ${article.tag || ''} ${article.text || ''}`;
      const vector = await encodeTextForEmbedding(content);
      await Article.findByIdAndUpdate(article._id, { vector });
    }
    console.log('✅ All articles re-vectorized using NLP embeddings');
  } catch (err) {
    console.error('❌ Vectorization error:', err);
  }
}

/**
 * Get top-K most similar articles using cosine similarity of semantic vectors
 */
async function getRecommendations(articleId) {
  try {
    const article = await Article.findById(articleId);
    if (!article || !article.vector) return [];

    const candidates = await Article.find({
      _id: { $ne: articleId },
      pending: true
    }).select('_id title image vector');

    const recommendations = candidates.map(candidate => {
      const maxLength = Math.max(article.vector.length, candidate.vector.length);
      const paddedA = article.vector.concat(Array(maxLength - article.vector.length).fill(0));
      const paddedB = candidate.vector.concat(Array(maxLength - candidate.vector.length).fill(0));
      const similarity = cosineSimilarity(paddedA, paddedB);
      return { ...candidate.toObject(), similarity };
    });

    return recommendations
      .filter(r => r.similarity >= SIMILARITY_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, TOP_K);

  } catch (err) {
    console.error('❌ Recommendation error:', err);
    return [];
  }
}

module.exports = {
  vectorizeArticles,
  getRecommendations
};
