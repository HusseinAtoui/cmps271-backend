const axios = require('axios');
const { setTimeout } = require('timers/promises');
const Article = require('../models/Article');

// Configuration
const SIMILARITY_THRESHOLD = 0.15;
const TOP_K = 5;
const COHERE_BATCH_SIZE = 96; // Cohere's maximum batch size for embed-english-v3.0
const COHERE_RETRY_DELAY = 1000;
const MAX_RETRIES = 3;

/**
 * Efficient similarity calculation using pre-normalized vectors
 */
function dotProduct(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Batch embedding with smart retry logic
 */
async function encodeBatchForEmbedding(texts, retryCount = 0) {
  try {
    const response = await axios.post(
      'https://api.cohere.ai/embed',
      {
        texts,
        model: 'embed-english-v3.0',
        input_type: 'search_document',
        truncate: 'END'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (!response.data.embeddings || response.data.embeddings.length !== texts.length) {
      throw new Error('Mismatched batch embedding response');
    }

    return response.data.embeddings;

  } catch (err) {
    if (retryCount < MAX_RETRIES && err.response?.status !== 400) {
      await setTimeout(COHERE_RETRY_DELAY * (retryCount + 1));
      return encodeBatchForEmbedding(texts, retryCount + 1);
    }
    console.error(`❌ Batch embedding failed after ${MAX_RETRIES} retries:`, err.message);
    throw err;
  }
}

/**
 * Optimized batch vectorization with progress tracking
 */
async function vectorizeArticles() {
  try {
    const cursor = Article.find({
      $or: [
        { vector: { $exists: false } },
        { vectorUpdatedAt: { $lt: new Date(Date.now() - 7 * 86400000) } } // Re-embed weekly
      ]
    }).cursor();
    
    let processed = 0;
    let successCount = 0;
    let batch = [];

    for await (const article of cursor) {
      const content = `${article.title || ''} ${article.tag || ''} ${article.text || ''}`.trim();
      if (content.length < 10) continue;

      batch.push({ article, content });
      
      if (batch.length >= COHERE_BATCH_SIZE) {
        await processBatch(batch);
        successCount += batch.length;
        batch = [];
      }
      
      if (++processed % 100 === 0) {
        console.log(`🔄 Processed ${processed} articles (${successCount} updated)`);
      }
    }

    if (batch.length > 0) {
      await processBatch(batch);
      successCount += batch.length;
    }

    console.log(`✅ Vectorization complete: ${successCount} articles updated`);

  } catch (err) {
    console.error('❌ Vectorization pipeline failed:', err);
    throw err;
  }
}

async function processBatch(batch) {
  try {
    const texts = batch.map(item => item.content);
    const embeddings = await encodeBatchForEmbedding(texts);
    
    const bulkOps = batch.map((item, index) => ({
      updateOne: {
        filter: { _id: item.article._id },
        update: {
          $set: { 
            vector: embeddings[index],
            vectorUpdatedAt: new Date()
          }
        }
      }
    }));

    await Article.bulkWrite(bulkOps, { ordered: false });
  } catch (err) {
    console.error('❌ Batch processing failed:', err.message);
  }
}

/**
 * Scalable recommendation engine with early filtering
 */
async function getRecommendations(articleId) {
  try {
    const sourceArticle = await Article.findById(articleId).lean();
    if (!sourceArticle?.vector) return [];

    // Stage 1: Fast pre-filtering using MongoDB projections
    const candidates = await Article.aggregate([
      { $match: { 
        _id: { $ne: sourceArticle._id },
        pending: false,
        vector: { $exists: true }
      }},
      { $project: {
        _id: 1,
        title: 1,
        tag: 1,
        image: 1,
        similarity: {
          $let: {
            vars: {
              dp: { $dotProduct: [sourceArticle.vector, '$vector'] }
            },
            in: { $cond: [{ $gte: ['$$dp', SIMILARITY_THRESHOLD] }, '$$dp', null] }
          }
        }
      }},
      { $match: { similarity: { $ne: null } } },
      { $sort: { similarity: -1 } },
      { $limit: TOP_K * 10 } // Wider initial net
    ]);

    // Stage 2: Client-side diversity filtering
    const seenTags = new Set();
    return candidates
      .filter(candidate => {
        const tag = candidate.tag || 'untagged';
        const keep = !seenTags.has(tag);
        if (keep) seenTags.add(tag);
        return keep;
      })
      .slice(0, TOP_K)
      .map(candidate => ({
        _id: candidate._id,
        title: candidate.title,
        image: candidate.image,
        similarity: candidate.similarity
      }));

  } catch (err) {
    console.error('❌ Recommendation pipeline failed:', err);
    return [];
  }
}

module.exports = {
  vectorizeArticles,
  getRecommendations
};