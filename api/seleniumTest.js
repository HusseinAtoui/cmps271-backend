const express = require('express');
const { Builder, By, until } = require('selenium-webdriver');
const path = require('path');
const fs = require('fs');
require('chromedriver');

const router = express.Router();

router.get('/run', async (req, res) => {
  let driver;
  try {
    driver = await new Builder().forBrowser('chrome').build();

    // 1. Open login page
    await driver.get('https://husseinatoui.github.io/cmps271-frontend/loginPage.html');
    await driver.sleep(3000);

    // 2. Fill login form
    await driver.wait(until.elementLocated(By.id('email')), 10000);
    await driver.findElement(By.id('email')).sendKeys('bareajoudi@gmail.com');
    await driver.findElement(By.id('password')).sendKeys('Mohamadj1@234');

    // 3. Click login
    await driver.findElement(By.css('.login-btn2')).click();

    // 4. Handle login alert
    await driver.wait(until.alertIsPresent(), 10000);
    let alert = await driver.switchTo().alert();
    console.log("⚠️ Alert text:", await alert.getText());
    await alert.accept();

    // 5. Verify profile page
    await driver.wait(until.urlContains('profilepage'), 10000);
    console.log('✅ Login successful!');

    // 6. Test bio change
    await driver.findElement(By.id('settings-image')).click();
    const settingsDiv = await driver.findElement(By.id('settings-div'));
    await driver.wait(until.elementIsVisible(settingsDiv), 5000);
  
    await driver.findElement(By.id('changeBioBtn')).click();
    const bioSection = await driver.findElement(By.id('bioSection'));
    await driver.wait(until.elementIsVisible(bioSection), 5000);
    
    await driver.findElement(By.id('bioInput')).clear();
    await driver.findElement(By.id('bioInput')).sendKeys('New bio from Selenium test');
    await driver.findElement(By.id('saveBioBtn')).click();
    
    await driver.wait(until.alertIsPresent(), 5000);
    const bioAlert = await driver.switchTo().alert();
    const bioAlertText = await bioAlert.getText();
    await bioAlert.accept();
    console.log('Bio alert text:', bioAlertText);

    if (!bioAlertText.includes('Bio updated successfully')) {
      throw new Error(`Bio update failed: ${bioAlertText}`);
    }
    console.log('✅ Bio updated successfully!');

    // 7. Test profile picture change
    await driver.findElement(By.id('changePicBtn')).click();
    const picSection = await driver.findElement(By.id('picSection'));
    await driver.wait(until.elementIsVisible(picSection), 5000);

    // Verify test image exists
    const testImagePath = path.join(__dirname, 'api', 'image5.jpg');
    if (!fs.existsSync(testImagePath)) {
      throw new Error(`Test image not found at: ${testImagePath}`);
    }

    await driver.findElement(By.id('picInput')).sendKeys(testImagePath);
    await driver.sleep(1000); // Allow file upload time
    
    await driver.findElement(By.id('savePicBtn')).click();
    await driver.wait(until.alertIsPresent(), 5000);
    const picAlert = await driver.switchTo().alert();
    const picAlertText = await picAlert.getText();
    await picAlert.accept();

    if (!picAlertText.includes('Profile picture updated successfully')) {
      throw new Error(`Profile update failed: ${picAlertText}`);
    }
    console.log('✅ Profile picture updated successfully!');

    res.json({ message: '✅ All tests passed successfully!' });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
});

module.exports = router;