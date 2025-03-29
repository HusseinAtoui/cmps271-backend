const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function runSeleniumTest() {
  // Create a new WebDriver instance for Chrome.
  // Configure Chrome options (uncomment the headless mode if needed)
  const options = new chrome.Options();
  // options.addArguments('headless');

  let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  try {
    // Navigate to the server's home page
    await driver.get('http://localhost:3000');

    // Wait until the title of the page matches the expected text
    await driver.wait(until.titleIs('Welcome to the Selenium Test Server'), 5000);

    // Retrieve the page title
    let title = await driver.getTitle();

    // Return the result
    return `Page title is: ${title}`;
  } catch (error) {
    throw error;
  } finally {
    // Ensure the browser is closed regardless of test success/failure
    await driver.quit();
  }
}

module.exports = { runSeleniumTest };
