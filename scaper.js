const puppeteer = require('puppeteer');

async function scrapeProduct(url) {
  const browser = await puppeteer.launch({
    headless: false, // run with full browser
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Pretend to be a real browser
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const [el] = await page.$x('//*[@id="landingImage"]');
  if (el) {
    const src = await el.getProperty('src');
    const srcTxt = await src.jsonValue();
    console.log({ srcTxt });
  } else {
    console.log('Image element not found.');
  }

  await browser.close();
}

scrapeProduct('https://www.amazon.com/Oregon-Trail-Nintendo-Switch/dp/B0D2PHP74H');
