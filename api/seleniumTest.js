const { Builder, By, until } = require('selenium-webdriver');
const path = require('path');

// Base URL for your local server on port 3000
const BASE_URL = 'http://localhost:3000';

/**
 * Log in to the application.
 * Assumes a UI form at /login with fields named "email" and "password".
 */
async function login(driver, email, password) {
  await driver.get(`${BASE_URL}/login`);
  const emailField = await driver.wait(until.elementLocated(By.name('email')), 10000);
  await emailField.sendKeys(email);
  
  const passwordField = await driver.findElement(By.name('password'));
  await passwordField.sendKeys(password);
  
  // Adjust this XPath if your button is different
  const loginButton = await driver.findElement(By.xpath("//button[@type='submit']"));
  await loginButton.click();
  console.log('Logged in successfully');
}

/**
 * Submit an article.
 * Assumes a UI page (e.g., /articles/submit) with fields:
 * - title (name="title")
 * - text (name="text")
 * - optional file input for image (name="image")
 */
async function submitArticle(driver, title, text, imagePath = null) {
  await driver.get(`${BASE_URL}/articles/submit`);
  const titleField = await driver.wait(until.elementLocated(By.name('title')), 10000);
  await titleField.sendKeys(title);
  
  const textField = await driver.findElement(By.name('text'));
  await textField.sendKeys(text);
  
  if (imagePath) {
    const imageInput = await driver.findElement(By.name('image'));
    // Ensure the file path is absolute
    await imageInput.sendKeys(path.resolve(imagePath));
  }
  
  // Adjust the submit button XPath to match your form
  const submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));
  await submitButton.click();
  console.log('Article submitted');
}

/**
 * Add a comment to an article.
 * Assumes a UI page for article details at /articles/:id with:
 * - a field for comment text (name="text")
 * - a button labeled "Add Comment"
 */
async function commentOnArticle(driver, articleId, commentText) {
  await driver.get(`${BASE_URL}/articles/${articleId}`);
  const commentField = await driver.wait(until.elementLocated(By.name('text')), 10000);
  await commentField.sendKeys(commentText);
  
  const commentButton = await driver.findElement(By.xpath("//button[contains(text(),'Add Comment')]"));
  await commentButton.click();
  console.log('Comment added');
}

/**
 * Delete an article.
 * Assumes the article details page includes a "Delete" button and a confirmation step.
 */
async function deleteArticle(driver, articleId) {
  await driver.get(`${BASE_URL}/articles/${articleId}`);
  const deleteButton = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(),'Delete')]")), 10000);
  await deleteButton.click();
  
  // Wait for and click the confirmation button if applicable
  const confirmButton = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(),'Confirm')]")), 10000);
  await confirmButton.click();
  console.log('Article deleted');
}

/**
 * Log out.
 * Assumes a UI page at /logout with a logout button.
 */
async function logout(driver) {
  await driver.get(`${BASE_URL}/logout`);
  const logoutButton = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(),'Logout')]")), 10000);
  await logoutButton.click();
  console.log('Logged out');
}

/**
 * Main test flow.
 * This script logs in, submits an article, adds a comment, and logs out.
 */
(async function main() {
  // Initialize Chrome WebDriver (make sure chromedriver is installed)
  let driver = await new Builder().forBrowser('chrome').build();
  try {
    // 1. Log in
    await login(driver, 'testuser@example.com', 'password123');
    await driver.sleep(2000); // brief pause

    // 2. Submit an article.
    // Ensure that the UI page exists and the field names match.
    await submitArticle(driver, 
      'Selenium Test Article', 
      'This is a test article submitted via Selenium.', 
      'path/to/your/image.jpg' // change or pass null if not testing image upload
    );
    await driver.sleep(2000);

    // 3. Comment on an article.
    // You need to supply a valid article ID; this could be captured dynamically.
    const articleId = 'REPLACE_WITH_ACTUAL_ARTICLE_ID';
    await commentOnArticle(driver, articleId, 'This is a test comment.');
    await driver.sleep(2000);

    // 4. Optionally, delete the article.
    // Uncomment to test deletion:
    // await deleteArticle(driver, articleId);
    // await driver.sleep(2000);

    // 5. Log out.
    await logout(driver);
    await driver.sleep(2000);
  } catch (error) {
    console.error('Error during Selenium test:', error);
  } finally {
    await driver.quit();
  }
})();
