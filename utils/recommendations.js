// utils/recommendations.js
const natural = require('natural');
const Article = require('../models/Article');

// Global vocabulary (shared across all articles)
let globalVocabulary = [];

// Step 1: Vectorize all articles
async function vectorizeArticles() {
  try {
    const articles = await Article.find({ pending: true }).select('text');
    const tfidf = new natural.TfIdf();

    articles.forEach(article => tfidf.addDocument(article.text));

    // Build vocabulary
    const vocabSet = new Set();
    for (let i = 0; i < articles.length; i++) {
      const terms = tfidf.listTerms(i);
      terms.forEach(term => vocabSet.add(term.term));
    }
    globalVocabulary = Array.from(vocabSet);

    // Vectorize and save each article
    for (let i = 0; i < articles.length; i++) {
      const vector = globalVocabulary.map(term => tfidf.tfidf(term, i));
      articles[i].vector = vector;
      await articles[i].save();
    }

    console.log("✅ TF-IDF vectorization complete.");
  } catch (err) {
    console.error("❌ Error vectorizing articles:", err);
  }
}

// Step 2: Cosine similarity function
function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] ** 2;
    normB += vecB[i] ** 2;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Step 3: Get top 5 recommendations
async function getRecommendations(articleId) {
  try {
    const target = await Article.findById(articleId);
    if (!target || !target.vector) throw new Error("Target article not vectorized");

    const articles = await Article.find({ _id: { $ne: articleId }, pending: true }).select('title vector');

    const scores = articles.map(article => ({
      article,
      similarity: cosineSimilarity(target.vector, article.vector)
    }));

    scores.sort((a, b) => b.similarity - a.similarity);
    return scores.slice(0, 5).map(item => item.article);
  } catch (err) {
    console.error("❌ Error getting recommendations:", err);
    throw err;
  }
}

module.exports = { vectorizeArticles, getRecommendations };
