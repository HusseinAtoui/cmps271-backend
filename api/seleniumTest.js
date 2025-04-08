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
    const testImagePath = path.join(__dirname, 'image5.jpg');
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

    // 8. Test scheduler functionality
    console.log('✅ Profile picture updated successfully!');
    await driver.findElement(By.id('toggleScheduler')).click();
    await driver.wait(until.elementIsVisible(await driver.findElement(By.id('scheduler'))), 5000);

    // Fill scheduler form
    await driver.findElement(By.id('name')).sendKeys('Hussein');
    await driver.findElement(By.id('email')).sendKeys('haa206@mail.aub.edu');
    const dateField = await driver.findElement(By.id('meetingDate'));
    await driver.executeScript(`
        // Set ISO format for input
        arguments[0].value = '2024-05-20T14:30';  // 20 May 2024 2:30 PM
        
        // Update displayed format if needed
        arguments[0].dispatchEvent(new Event('input'));
        arguments[0].dispatchEvent(new Event('change'));
    `, dateField);
    await driver.findElement(By.id('message')).sendKeys('Selenium test message');

    // Submit form
    await driver.findElement(By.css('#scheduleForm button[type="submit"]')).click();

    // Verify response
    await driver.wait(until.elementTextContains(
      await driver.findElement(By.id('responseMessage')),
      'successfully'
    ), 5000);
    const responseText = await driver.findElement(By.id('responseMessage')).getText();

    if (!responseText.includes('successfully')) {
      throw new Error(`Scheduler failed: ${responseText}`);
    }
    console.log('✅ Scheduler test passed!');

    const authToken = await driver.executeScript(
      "return localStorage.getItem('authToken');"
    );
    console.log('🔐 Auth Token:', authToken);

    // 3. Navigate to Submission Page with Auth Preservation
    await driver.get('https://husseinatoui.github.io/cmps271-frontend/submissionpage.html');


    await driver.executeScript(
      (token) => {
        localStorage.setItem('authToken', token);
        sessionStorage.setItem('authInitialized', 'true');
      },
      authToken
    );
    await driver.navigate().refresh();

    // 4. Form Submission Preparation
    await driver.wait(until.elementLocated(By.id('submissionForm')), 20000);

    // Add required hidden fields
    await driver.executeScript(`
      const addHiddenField = (name, value) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        document.getElementById('submissionForm').appendChild(input);
      };
      addHiddenField('date', new Date().toISOString());
      addHiddenField('tag', 'general');
    `);

    // 5. Fill Form Fields with Validation
    const fieldMappings = [
      { frontendId: 'submissionName', backendName: 'author', value: 'Test User' },
      { frontendId: 'submissionTitle', backendName: 'title', value: 'Automated Article' },
      { frontendId: 'bio', backendName: 'description', value: 'Test bio content' }
    ];

    for (const { frontendId, backendName, value } of fieldMappings) {
      const element = await driver.findElement(By.id(frontendId));
      await driver.wait(until.elementIsVisible(element), 5000);

      // Update field name to match backend
      await driver.executeScript(
        (el, name) => el.setAttribute('name', name),
        element,
        backendName
      );

      await element.clear();
      await element.sendKeys(value);
      console.log(`✅ Filled ${backendName} field`);
    }

    // 6. File Uploads with Verification
    const fileSpecs = [
      {
        inputId: 'document',
        path: path.resolve(__dirname, 'Sprint 1 Retrospective Report.pdf'),
        maxSizeKB: 1024,
        acceptTypes: ['.pdf', '.doc', '.docx']
      },
      {
        inputId: 'picture',
        path: path.resolve(__dirname, 'image5.jpg'),
        maxSizeKB: 512,
        acceptTypes: ['.jpg', '.jpeg', '.png']
      }
    ];

    for (const { inputId, path: filePath, maxSizeKB, acceptTypes } of fileSpecs) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing test file: ${filePath}`);
      }

      // Verify file type
      const fileExt = path.extname(filePath).toLowerCase();
      if (!acceptTypes.includes(fileExt)) {
        throw new Error(`Invalid file type ${fileExt} for ${inputId}`);
      }

      // Verify file size
      const stats = fs.statSync(filePath);
      const fileSizeKB = stats.size / 1024;
      if (fileSizeKB > maxSizeKB) {
        throw new Error(`File ${path.basename(filePath)} exceeds ${maxSizeKB}KB limit`);
      }

      // Upload file
      const input = await driver.findElement(By.id(inputId));
      await input.sendKeys(filePath);

      // Verify UI feedback
      const fileNameElement = await driver.findElement(By.id(`${inputId}Name`));
      await driver.wait(
        until.elementTextContains(fileNameElement, path.basename(filePath)),
        5000
      );
      console.log(`📁 Uploaded ${inputId} successfully`);
    }

    // 7. Submit and Monitor
    await driver.executeScript(`
      window._submissionComplete = false;
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        try {
          const response = await originalFetch(...args);
          window._submissionComplete = true;
          return response;
        } catch (error) {
          window._submissionError = error.message;
          throw error;
        }
      };
    `);

    const submitButton = await driver.findElement(
      By.css('#submissionForm button[type="submit"]')
    );
    await submitButton.click();

    // Wait for network completion
    await driver.wait(async () => {
      return await driver.executeScript(`
        return window._submissionComplete || window._submissionError;
      `);
    }, 30000);

    // 8. Handle Response
    const statusElement = await driver.wait(
      until.elementLocated(By.id('statusMessage')),
      20000
    );

    await driver.wait(async () => {
      const text = await statusElement.getText();
      return text.trim().length > 0;
    }, 25000);

    const statusMessage = await statusElement.getText();
    console.log('📄 Server Response:', statusMessage);

    if (!statusMessage.toLowerCase().includes('success')) {
      // Capture diagnostics
      const logs = await driver.manage().logs().get('browser');
      const networkError = await driver.executeScript(
        "return window._submissionError || 'No network error captured'"
      );

      throw new Error(`
        Submission failed!
        - Status: ${statusMessage}
        - Network Error: ${networkError}
        - Console Errors: ${logs.map(l => l.message).join('\n')}
      `);
    }


    onsole.log('🌐 Navigating to submissions page...');
    await driver.get('https://husseinatoui.github.io/cmps271-frontend/subpage.html');
    await driver.wait(until.urlContains('subpage'), 10000);

    // 10. Wait for articles to load
    const gridContainer = await driver.wait(
      until.elementLocated(By.css('.grid-container')),
      15000
    );

    // 11. Click "Continue reading" on first article
    const firstContinueButton = await driver.wait(
      until.elementLocated(By.css('.continue-reading')),
      20000
    );

    // Scroll into view and click
    await driver.executeScript("arguments[0].scrollIntoView(true)", firstContinueButton);
    await driver.wait(until.elementIsVisible(firstContinueButton), 5000);
    await firstContinueButton.click();

    // 12. Verify article page load
    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      return url.includes('Articles.html?id=');
    }, 15000);

    console.log('✅ Successfully opened article detail page');

    // Add to your existing response
    res.json({
      message: '✅ All tests passed successfully!',
      details: {
        login: true,
        profile_update: true,
        submission: true,
        article_navigation: true
      }
    });
























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