const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authorizeRoles } = require('../middleware/authorize');
const axios = require('axios');
const FormData = require('form-data');
const Article = require('../models/Article');
const { verifyToken } = require('../middleware/authenticateUser');
require('dotenv').config();
const ImageKit = require('imagekit');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Optional: Limit file size to 5MB
});

// ✅ Allow both `image` and `document` fields
const uploadFields = upload.fields([
  { name: "image", maxCount: 2 },
  { name: "document", maxCount: 1 }
]);
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// ✅ Upload image to ImageKit
const uploadToImageKit = async (fileBuffer, fileName) => {
  try {
    const response = await imagekit.upload({
      file: fileBuffer,
      fileName: fileName || "event_image.jpg",
    });
    return response.url; // ✅ Return ImageKit URL
  } catch (err) {
    console.error("❌ ImageKit Upload Error:", err.message);
    throw new Error("Failed to upload image.");
  }
};

// Pre-load USE model once
let useModelPromise = use.load();

// Cosine similarity helper
function cosine(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
// ✅ Get all approved articles (pending = true)
router.get('/', async (req, res) => {
  try {
    const articles = await Article.find({ pending: true });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ✅ Get all non approved articles (pending = false)
router.get('/pending', verifyToken, async (req, res) => {
  try {
    const articles = await Article.find({ pending: false });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/add', verifyToken, uploadFields, async (req, res) => {
  console.log("Received form data:", req.body);
  console.log("Files:", req.files); 

  let imageUrl = "https://ik.imagekit.io/default.png";

  // ✅ Handle image upload
  if (req.files.image) {
    try {
      imageUrl = await uploadToImageKit(req.files.image[0].buffer, req.files.image[0].originalname);
      console.log("Uploaded image URL:", imageUrl);
    } catch (uploadErr) {
      console.error("Image upload failed:", uploadErr);
      return res.status(500).json({ error: "Image upload failed" });
    }
  } let summary = "";
  if (req.body.text) {
    try {
      const summaryResponse = await axios.post(
        'https://api.cohere.ai/generate',
        {
          model: 'command',
          prompt: `Summarize the following text in a short paragraph:\n\n${req.body.text}\n\nSummary:`,
          max_tokens: 100,
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Check for expected response structure from Cohere
      if (
        summaryResponse.data &&
        summaryResponse.data.generations &&
        Array.isArray(summaryResponse.data.generations) &&
        summaryResponse.data.generations.length > 0
      ) {
        summary = summaryResponse.data.generations[0].text.trim();
      } else if (summaryResponse.data.text) {
        summary = summaryResponse.data.text.trim();
      } else {
        console.error("Invalid summary response format:", summaryResponse.data);
        summary = req.body.description || "";
      }
    } catch (err) {
      console.error("Error generating summary:", err.response?.data || err);
      // Fall back to any provided description or empty string
      summary = req.body.description || "";
    }
  }


  try {
    const newArticle = new Article({
      title: req.body.title || "Untitled Article",
      image: imageUrl,
      description: summary || "Read more about this",
      date: req.body.date || Date.now(),
      text: req.body.text || "",
      userID: req.user.id,
      minToRead: req.body.minToRead || 1,
      tag: req.body.tag || "general",
      pending: false
    });

    const savedArticle = await newArticle.save();
    console.log("✅ Article created:", savedArticle);
    res.status(201).json(savedArticle);
  } catch (err) {
    console.error("❌ Error saving article:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get article by ID

// ✅ Approve an article (Set pending = true)
router.put('/approve/:id', verifyToken,authorizeRoles('admin'), async (req, res) => {
  try {
    const approvedArticle = await Article.findByIdAndUpdate(
      req.params.id,
      { pending: true },
      { new: true }
    )

    if (!approvedArticle) return res.status(404).json({ error: "Article not found" });
    res.json(approvedArticle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ✅ Delete an article by ID
router.delete('/delete/:id', verifyToken, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    await Article.findByIdAndDelete(req.params.id);
    res.json({ message: 'Article deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/author-stats', verifyToken, async (req, res) => {
  try {
    const authorId = req.user.id;

    // Get all articles by this author
    const articles = await Article.find({ userID: authorId })
      .select('title kudos comments createdAt')
      .lean(); // Convert to plain JS objects for better performance

    // Calculate totals and create arrays
    const likesArray = articles.map(article => article.kudos.length);
    const commentsArray = articles.map(article => article.comments.length);
    
    const stats = {
      totalArticles: articles.length,
      totalLikes: likesArray.reduce((sum, num) => sum + num, 0),
      totalComments: commentsArray.reduce((sum, num) => sum + num, 0),
      likesPerArticle: likesArray,
      commentsPerArticle: commentsArray
    };

    // Include full article details if needed
    const articleDetails = articles.map((article, index) => ({
      title: article.title,
      createdAt: article.createdAt,
      likes: likesArray[index],
      comments: commentsArray[index]
    }));
    console.log(stats);
    res.json({
      success: true,
      stats,
      articles: articleDetails
    });

  } catch (err) {
    console.error('Error fetching author stats:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve author statistics' 
    });
  }
});
// ✅ Get all approved articles by an author (pending = true) 
router.get('/author', verifyToken, async (req, res) => {
  try {

    const authorId = req.user.id;
    const articles = await Article.find({ userID: authorId });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ✅ Get all articles by an author 
router.get('/author/approved', verifyToken, async (req, res) => {
  try {
    const authorId = req.user.id;
    const articles = await Article.find({ userID: authorId , pending: true});

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ✅ Get all pending articles by an author (pending = false) 
router.get('/authorpending/:id', verifyToken, async (req, res) => {
  try {
    const authorId = req.params.id;
    const articles = await Article.find({ userID: authorId, pending: false });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Add a Comment to the Article
router.post('/comment-article', verifyToken, async (req, res) => {
  const { articleId, text } = req.body;

  if (!articleId || !text) {
    return res.status(400).json({ message: "Article ID and comment text are required" });
  }

  try {
    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    article.comments.push({
      text,
      postedBy: req.user.id, // Using authenticated user's ID
      created: Date.now()
    });

    await article.save();

    res.status(200).json({ message: "Comment added successfully", data: article });
  } catch (err) {
    res.status(500).json({ message: "Error adding comment", error: err.message });
  }
});

// ✅ Delete a Comment from an Article
router.delete('/delete-comment', verifyToken, verifyToken, async (req, res) => {
  const { articleId, commentId } = req.body;

  if (!articleId || !commentId) {
    return res.status(400).json({ message: "Article ID and comment ID are required" });
  }

  try {
    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    const comment = article.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to delete this comment" });
    }

    comment.deleteOne();

    await article.save();

    res.status(200).json({ message: "Comment deleted successfully", data: article });
  } catch (err) {
    res.status(500).json({ message: "Error deleting comment", error: err.message });
  }
});

// ✅ Add Kudos for the article but this one does nothing lowkey could remove it
router.post('/give-kudos', verifyToken, async (req, res) => {
  const { articleId } = req.body;

  if (!articleId) {
    return res.status(400).json({ message: "Article ID is required" });
  }

  try {

    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    if (!article.kudos.includes(req.user.userId)) {
      article.kudos.push(req.user.userId);
    } else {
      return res.status(400).json({ message: "You have already given kudos to this article" });
    }

    await article.save();

    await User.findByIdAndUpdate(req.user.userId, { $inc: { activity: 1 } });

    res.status(200).json({
      message: "Kudos given successfully",
      kudosCount: article.kudos.length
    });

  } catch (err) {
    res.status(500).json({ message: "Error giving kudos", error: err.message });
  }

});
// Add Like
router.post('/add-like', verifyToken, async (req, res) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.body.articleId,
      {
        $addToSet: { kudos: req.user.id },  
      },
      { new: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove Like
router.post('/remove-like', verifyToken, async (req, res) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.body.articleId,
      {
        $pull: { kudos: req.user.id },  
      },
      { new: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/tag/:tag', async (req, res) => {
  try {
    const tag = req.params.tag;
    const articles = await Article.find({ tag: { $regex: new RegExp("^" + tag + "$", "i") },pending: true });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like Status
router.get('/:id/like-status', verifyToken, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id).select('kudos');

    res.json({
      hasLiked: article.kudos.some(userId => userId.equals(req.user.id))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  
  console.log('Fetching article with ID:', req.params.id);
// Save an article for the authenticated user
router.post("/save-article", verifyToken, async (req, res) => {
  const { articleId } = req.body;
  const userId = req.user.userId;

  if (!articleId) {
    return res.status(400).json({ message: "Article ID is required." });
  }

  try {
    // Add the articleId to savedArticles using $addToSet to prevent duplicates
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { savedArticles: articleId } },
      { new: true }
    );

    res.json({
      message: "Article saved successfully.",
      savedArticles: user.savedArticles
    });
  } catch (error) {
    console.error("Error saving article:", error);
    res.status(500).json({ message: "Server error while saving article." });
  }
});

// Remove an article from the authenticated user’s saved list
router.post("/remove-saved-article", verifyToken, async (req, res) => {
  const { articleId } = req.body;
  const userId = req.user.userId;

  if (!articleId) {
    return res.status(400).json({ message: "Article ID is required." });
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { savedArticles: articleId } },
      { new: true }
    );

    res.json({
      message: "Article removed from saved articles.",
      savedArticles: user.savedArticles
    });
  } catch (error) {
    console.error("Error removing saved article:", error);
    res.status(500).json({ message: "Server error while removing article." });
  }
});




  try {
    const article = await Article.findById(req.params.id)
    .populate('userID', 'firstName lastName')
    .populate('comments.postedBy', 'firstName lastName profilePicture'); 
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(article);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Add recommendation route at bottom:
router.get('/recommend/:slug', async (req, res) => {
  const { slug } = req.params;
  const k = parseInt(req.query.k, 10) || 5;

  try {
    // 1. Fetch current article
    const current = await Article.findOne({ slug }).lean();
    if (!current || !current.vector || !current.vector.length) {
      return res.status(404).json({ error: 'Article not found or missing embedding' });
    }

    // 2. Optionally refresh embedding:
    // const model = await useModelPromise;
    // const [ newVec ] = await (await model.embed([`${current.title}. ${current.description || current.text.slice(0,200)}`])).array();
    // const queryVec = newVec;
    const queryVec = current.vector;

    // 3. Fetch candidate articles (exclude current)
    const candidates = await Article.find({
      vector: { $exists: true, $not: { $size: 0 } },
      slug:   { $ne: slug }
    }).lean();

    // 4. Compute scores
    const scored = candidates.map(doc => ({
      title: doc.title,
      slug:  doc.slug,
      score: cosine(doc.vector, queryVec)
    }));

    // 5. Sort & return top-k
    scored.sort((a, b) => b.score - a.score);
    const recs = scored.slice(0, k).map(({ title, slug }) => ({ title, slug }));

    return res.json({ recommendations: recs });
  } catch (err) {
    console.error('[recommend] error:', err);
    return res.status(500).json({ error: 'Failed to compute recommendations' });
  }
});

module.exports = router;
