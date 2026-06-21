const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/proxy', async (req, res) => {
  const url = req.query.url || 'https://animeslayer.to/home';
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // إزالة الإعلانات
    await page.evaluate(() => {
      const selectors = ['#overlay', '#wrap', '#card', '#b1', '#b2', '.popup', '.ad', '.ads'];
      selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));
      document.querySelectorAll('div, section').forEach(el => {
        const s = window.getComputedStyle(el);
        if (s.position === 'fixed' && parseInt(s.zIndex) > 9999 && !el.querySelector('video, iframe')) el.remove();
      });
    });

    const html = await page.content();
    await browser.close();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.send(html.replace('<head>', `<head><base href="${url}">`));
  } catch (e) {
    res.status(500).send('Error: ' + e.message);
  }
});
app.listen(PORT, () => console.log('Proxy running'));
