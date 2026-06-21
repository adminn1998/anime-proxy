const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// الصفحة الرئيسية: تعرض iframe مع الوكيل
app.get('/', (req, res) => {
  const targetUrl = req.query.url || 'https://anime3rb.com/';
  const proxyUrl = `/proxy?url=${encodeURIComponent(targetUrl)}`;

  res.send(`
    <!DOCTYPE html>
    <html lang="ar">
    <head>
        <meta charset="UTF-8">
        <title>Anime - No Ads</title>
        <style>
            * { margin:0; padding:0; }
            body { background:#000; height:100vh; }
            iframe { width:100%; height:100%; border:none; }
        </style>
    </head>
    <body>
        <iframe src="${proxyUrl}" sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation"></iframe>
    </body>
    </html>
  `);
});

// وكيل يعالج الصفحة ويزيل الإعلانات
app.get('/proxy', async (req, res) => {
  const url = req.query.url || 'https://animeslayer.to/home';

  try {
    // جلب الصفحة كأننا متصفح حقيقي
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/'
      }
    });

    if (!response.ok) {
      return res.status(500).send('Failed to fetch page');
    }

    let html = await response.text();

    // حقن CSS قوي لإخفاء الإعلانات
    const adBlockCSS = `<style>
      #overlay, #overlay.on, #wrap, #card, #b1, #b2,
      .popup, .ad, .ads, .banner, .overlay, .modal,
      [class*="popup"], [id*="popup"], [class*="ad-"], [id*="ad-"],
      div[style*="position: fixed"][style*="z-index: 9999"],
      div[style*="position: fixed"][style*="z-index: 99999"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        position: absolute !important;
        top: -9999px !important;
        left: -9999px !important;
      }
    </style>`;

    // حقن JavaScript مانع
    const adBlockJS = `<script>
      (function() {
        // إزالة الإعلانات مباشرة
        function killAds() {
          var selectors = [
            '#overlay', '#wrap', '#card', '#b1', '#b2',
            '.popup', '.ad', '.ads', '.banner', '.advertisement',
            '[class*="popup"]', '[id*="popup"]',
            '[class*="ad-"]', '[id*="ad-"]',
            'div[style*="position: fixed"][style*="z-index: 9999"]',
            'div[style*="position: fixed"][style*="z-index: 99999"]'
          ];
          selectors.forEach(function(sel) {
            var els = document.querySelectorAll(sel);
            for (var i = 0; i < els.length; i++) els[i].remove();
          });
          // إزالة العناصر الثابتة الكبيرة
          var allDivs = document.querySelectorAll('div, section, aside');
          for (var j = 0; j < allDivs.length; j++) {
            var el = allDivs[j];
            var s = window.getComputedStyle(el);
            if (s.position === 'fixed' && parseInt(s.zIndex) > 9999 && !el.querySelector('video') && !el.querySelector('iframe')) {
              el.remove();
            }
          }
        }
        killAds();
        setInterval(killAds, 300);
        new MutationObserver(killAds).observe(document.documentElement, { childList: true, subtree: true });

        // منع النوافذ والتوجيه
        window.open = function() { return null; };
        Object.defineProperty(window, 'open', { value: function() { return null; }, writable: false });
        window.onbeforeunload = function() { return ''; };
        document.addEventListener('click', function(e) {
          var a = e.target.closest('a');
          if (a && a.target === '_blank' && !a.href.includes(location.hostname)) {
            e.preventDefault();
            e.stopPropagation();
          }
          var el = e.target;
          if (el.id === 'b2' || (el.textContent && el.textContent.includes('شاهد الآن'))) {
            e.preventDefault();
            e.stopPropagation();
            killAds();
            return false;
          }
        }, true);
      })();
    </script>`;

    // إضافة base لتثبيت المسارات
    html = html.replace('<head>', `<head><base href="${url}">`);
    // إضافة CSS وJS قبل </body>
    html = html.replace('</body>', adBlockCSS + adBlockJS + '</body>');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).send('Proxy error: ' + error.message);
  }
});

app.listen(PORT, () => console.log('Proxy running on port ' + PORT));
