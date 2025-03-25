const express = require('express');
const Sentiment = require('sentiment');
const Article = require('../models/Article'); // Adjust the path as needed
const verifyToken  = require('../middleware/authenticateUser');

const router = express.Router();
const sentiment = new Sentiment();

// POST route to add a comment to an article with sentiment analysis
router.post('/comment-article', verifyToken, async (req, res) => {
  const { articleId, text } = req.body;

  // Validate required fields
  if (!articleId || !text) {
    return res.status(400).json({ message: "Article ID and comment text are required" });
  }

  // Analyze the sentiment of the comment text
  const result = sentiment.analyze(text);
  console.log("Sentiment analysis result:", result);

  // Define your threshold. Here, we reject comments with a negative score.
  if (result.score < 0) {
    return res.status(400).json({ message: "Your comment appears too negative and was not accepted." });
  }

  try {
    // Find the article to which the comment is being added
    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    // Add the comment
    article.comments.push({
      text,
      postedBy: req.user.id, // Uses the authenticated user's ID
      created: Date.now()
    });

    await article.save();

    res.status(200).json({ message: "Comment added successfully", data: article });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ message: "Error adding comment", error: err.message });
  }
});

// DELETE route to remove a comment from an article (unchanged)
router.delete('/delete-comment', verifyToken, async (req, res) => {
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

    // Ensure the requesting user is the comment's author
    if (comment.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to delete this comment" });
    }

    comment.deleteOne();
    await article.save();

    res.status(200).json({ message: "Comment deleted successfully", data: article });
  } catch (err) {
    console.error("Error deleting comment:", err);
    res.status(500).json({ message: "Error deleting comment", error: err.message });
  }
});

module.exports = router;
