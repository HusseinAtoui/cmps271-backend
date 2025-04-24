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
    console.log('✅ Profile picture updated successfully!');

    // test event admin 
    // Click Admin button
    const adminButton = await driver.wait(
      until.elementLocated(By.id('Adminpages')),
      5000
    );
    await adminButton.click();

    // Wait for admin section to appear
    const adminSection = await driver.wait(
      until.elementLocated(By.id('adminsection')),
      5000
    );
    await driver.wait(until.elementIsVisible(adminSection), 5000);

    // Click Events Admin link
    const eventsAdminLink = await driver.wait(
      until.elementLocated(By.id('eventsAdmin')),
      5000
    );
    await eventsAdminLink.click();

    // Wait for events admin page to load
    await driver.wait(until.urlContains('adminEvents'), 10000);
    console.log('✅ Navigated to Events Admin page');

    // 8. Test Events Admin Functionality

    console.log('🗓️ Testing Event Admin...');

    // Ensure we're on the admin events page
    await driver.wait(until.urlContains('adminEvents'), 10000);

    // Generate unique event name
    const eventName = `Test Event ${Date.now()}`;


    // Fill event form
    console.log('📝 Filling event form...');
    await driver.wait(until.elementLocated(By.id('title')), 5000).sendKeys(eventName);
    await driver.findElement(By.id('description')).sendKeys('Automated test event description');

    // Set future date (next week)
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const formattedDate = nextWeek.toISOString().split('T')[0];
    await driver.executeScript(`
            arguments[0].value = '${formattedDate}';
          `, await driver.findElement(By.id('date')));

    // Upload image
    await driver.findElement(By.id('image')).sendKeys(testImagePath);
    await driver.sleep(1000); // Allow upload processing

    // Submit form
    console.log('🚀 Submitting event...');
    await driver.findElement(By.css('#eventForm button[type="submit"]')).click();

    // Handle success alert
    await driver.wait(until.alertIsPresent(), 5000);
    const eventAlert = await driver.switchTo().alert();
    const alertText = await eventAlert.getText();
    await eventAlert.accept();

    if (!alertText.includes('successfully')) {
      throw new Error(`Event creation failed: ${alertText}`);
    }
    console.log('✅ Event created successfully!');

    console.log('🔍 Verifying event in list...');

    await driver.wait(async () => {
      const eventList = await driver.findElement(By.id('eventList')); // re-fetch fresh reference
      const events = await eventList.findElements(By.css('.event-item'));
    
      const titles = await Promise.all(
        events.map(async e => {
          const heading = await e.findElement(By.css('h3'));
          return heading.getText();
        })
      );
    
      return titles.includes(eventName);
    }, 15000);
    

    console.log('✅ Event appears in list!');

    const authToken = await driver.executeScript(
      "return localStorage.getItem('authToken');"
    );
    console.log('🔐 Auth Token:', authToken);

    // Return to profile page after admin tests
    await driver.get('https://husseinatoui.github.io/cmps271-frontend/profilepage.html');
    await driver.wait(until.urlContains('profilepage'), 10000);


    // 8. Test scheduler functionality
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

    console.log('🌐 Navigating to submissions page...'); // Fixed here

    await driver.get('https://husseinatoui.github.io/cmps271-frontend/subpage.html');
    await driver.wait(until.urlContains('subpage'), 10000);

    // 5. Interact with Last Article
    const continueButtons = await driver.wait(
      until.elementsLocated(By.css('.continue-reading')),
      20000
    );

    if (continueButtons.length === 0) {
      throw new Error('No articles found on submissions page');
    }

    const lastArticleButton = continueButtons[continueButtons.length - 1];
    await driver.executeScript(
      "arguments[0].scrollIntoView(true)",
      lastArticleButton
    );
    await lastArticleButton.click();

    // Verify article page load
    await driver.wait(until.urlContains('Articles.html?id='), 15000);
    console.log('✅ Successfully opened last article');
    // 6. Stay on article page with interaction
    console.log('📖 Reading article...');

    // Add this after opening the article page in your existing test
    console.log('📄 Interacting with article page...');

    // Wait for article content to load using your actual HTML structure
    const articleSection = await driver.wait(
      until.elementLocated(By.id('article-section')),
      15000
    );

    // Verify title exists
    const articleTitle = await driver.wait(
      until.elementLocated(By.css('#article-section h1.title')),
      20000
    );
    console.log('📰 Article Title:', await articleTitle.getText());

    // Stay on page for reading
    await driver.sleep(3000);

    // 6. Add comment test
    console.log('💬 Testing comment submission...');
    try {
      // Scroll to comment section
      const commentSection = await driver.findElement(By.css('.feedback'));
      await driver.executeScript("arguments[0].scrollIntoView(true)", commentSection);

      // Fill comment
      const commentField = await driver.wait(
        until.elementLocated(By.id('comment')),
        5000
      );
      await commentField.sendKeys('This is a positive test comment from automated testing');

      // Click comment button
      const commentButton = await driver.findElement(By.id('comment-btn'));
      await commentButton.click();

      // Handle sentiment analysis alert
      try {
        await driver.wait(until.alertIsPresent(), 3000);
        const alert = await driver.switchTo().alert();
        const alertText = await alert.getText();
        await alert.accept();

        if (alertText.includes('negative sentiment')) {
          console.log('⚠️ Negative comment blocked as expected');
          // Retry with positive comment
          await commentField.sendKeys(' This is a wonderful article!');
          await commentButton.click();
        }
      } catch (alertError) {
        console.log('No sentiment alert detected');
      }

      // Verify comment appears
      const commentsContainer = await driver.wait(
        until.elementLocated(By.id('profile-contain')),
        10000
      );

      await driver.wait(
        until.elementLocated(By.css('.profile-other-feedback')),
        15000
      );

      console.log('✅ Comment submitted successfully');

    } catch (error) {
      console.error('❌ Comment submission failed:', error);
      throw error;
    }

    // Final delay to observe results
    await driver.sleep(5000);
    console.log('⏲️ Finished article interaction');

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