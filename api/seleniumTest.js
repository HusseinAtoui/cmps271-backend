const express = require('express');
const { Builder, By, until } = require('selenium-webdriver');
require('chromedriver');

const router = express.Router();

router.get('/run', async (req, res) => {
  let driver;
  try {
    driver = await new Builder().forBrowser('chrome').build();

    // 1. Open login page
    await driver.get('https://husseinatoui.github.io/cmps271-frontend/loginPage.html');
    await driver.sleep(3000); // let it render

    // 2. Fill login form
    await driver.wait(until.elementLocated(By.id('email')), 10000);
    await driver.findElement(By.id('email')).sendKeys('bareajoudi@gmail.com');
    await driver.findElement(By.id('password')).sendKeys('Mohamadj1@234');

    // 3. Click login
    await driver.findElement(By.css('.login-btn2')).click();

    // 4. Wait for and handle alert
    await driver.wait(until.alertIsPresent(), 10000);
    let alert = await driver.switchTo().alert();
    console.log("⚠️ Alert text:", await alert.getText());
    await alert.accept(); // Close the "Login successful!" alert

    // 5. Wait for redirect to profilepage.html
    await driver.wait(until.urlContains('profilepage'), 10000);

    console.log('✅ Login successful!');




    // 6. Test changing bio
    // Click settings button
    await driver.findElement(By.id('settings-image')).click();
    
    // Wait for settings menu to be visible
    const settingsDiv = await driver.findElement(By.id('settings-div'));
    await driver.wait(until.elementIsVisible(settingsDiv), 5000);
    
    // Click "Change Bio" button
    await driver.wait(until.elementLocated(By.id('changeBioBtn')), 5000);
    await driver.findElement(By.id('changeBioBtn')).click();
    
    // Wait for bio section to be visible
    const bioSection = await driver.findElement(By.id('bioSection'));
    await driver.wait(until.elementIsVisible(bioSection), 5000);
    await driver.findElement(By.id('bioInput')).clear();
    await driver.findElement(By.id('bioInput')).sendKeys('New bio from Selenium test');
    await driver.findElement(By.id('saveBioBtn')).click();
    
    // Wait for success alert
    await driver.wait(until.alertIsPresent(), 5000);
    const bioAlert = await driver.switchTo().alert();
    const bioAlertText = await bioAlert.getText();
    console.log('Bio alert text:', bioAlertText);
    await bioAlert.accept();

    if (bioAlertText.includes('Bio updated successfully')) {
      console.log('✅ Bio updated successfully!');
    } else {
      throw new Error(`Bio update failed. Alert text: ${bioAlertText}`);
    }

   
    // 3. Test profile picture change (new code)
    // Open profile picture section
    await driver.findElement(By.id('changePicBtn')).click();
    const picSection = await driver.findElement(By.id('picSection'));
    await driver.wait(until.elementIsVisible(picSection), 5000);

    // Upload test image (replace with your image path)
    const testImagePath = path.resolve(__dirname, 'test-image.jpg');
    await driver.findElement(By.id('picInput')).sendKeys(testImagePath);

    // Save changes
    await driver.findElement(By.id('savePicBtn')).click();

    // Verify success alert
    await driver.wait(until.alertIsPresent(), 5000);
    const picAlert = await driver.switchTo().alert();
    const picAlertText = await picAlert.getText();
    await picAlert.accept();

    if (!picAlertText.includes('Profile picture updated successfully')) {
      throw new Error(`Profile picture update failed. Alert text: ${picAlertText}`);
    }

    console.log('✅ All tests passed!');
    res.json({ message: '✅ Login, bio change, and profile picture update tests passed!' });

  } catch (error) {
    console.error('❌ Error during login test:', error);
    res.status(500).json({ error: 'Error during login test.' });
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
  
});

module.exports = router;
