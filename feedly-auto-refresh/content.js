try {
  console.log('Feedly Auto Refresh: Content script loaded.');

  const PATH_DS = [
    'M13.54 3.637c-3.49-1.55-7.614-.355-9.681 2.81a.75.75 0 1 0 1.256.82c1.663-2.546 4.996-3.511 7.816-2.26 2.812 1.25 4.254 4.321 3.391 7.21-.864 2.894-3.782 4.732-6.848 4.304-3.062-.428-5.332-2.986-5.332-5.997a.75.75 0 0 0-1.5 0c0 3.765 2.827 6.952 6.625 7.482 3.794.53 7.415-1.75 8.493-5.36 1.08-3.616-.723-7.456-4.22-9.01',
    'M4.464 1.917a.75.75 0 0 0-.743.648l-.007.102v4.19c0 .38.282.694.649.743l.101.007H8.75a.75.75 0 0 0 .102-1.493l-.102-.007H5.215v-3.44a.75.75 0 0 0-.649-.743z',
  ];
  const UNREAD_COUNT_SELECTOR = '.MarkAsReadButton__unread-count';
  const FAVICON_SELECTOR = "link[rel~='icon']";
  const ORIGINAL_FAVICON_HREF = getOriginalFaviconHref();
  const rNumber = /^\d+$/;
  let currentUnreadCount = 0;

  function getOriginalFaviconHref() {
    return document.querySelector(FAVICON_SELECTOR)?.href;
  }

  function clickRefreshButton() {
    const refreshButton = document
      .querySelector(PATH_DS.map(d => `[d="${d}"]`).join(', '))
      ?.closest('button');
    if (refreshButton) {
      console.log('Feedly Auto Refresh: Refresh button found. Clicking.', refreshButton);
      refreshButton.click();
    } else {
      console.warn('Feedly Auto Refresh: Refresh button not found. Auto-refresh may not work.');
    }
  }

  const startTimer = (() => {
    let timer = -1;
    const start = interval => {
      console.log('Feedly Auto Refresh: Starting timer with interval', interval, 'minutes.');
      clearInterval(timer);
      timer = setInterval(() => {
        console.log('Feedly Auto Refresh: Timer triggered. Attempting to click refresh button.');
        clickRefreshButton();
      }, interval * 60 * 1000);
    };
    start(30);
    return start;
  })();

  chrome.runtime.sendMessage({ type: 'FEEDLY_AUTO_REFRESH_REQUEST_INTERVAL' }, response => {
    console.log('Feedly Auto Refresh: Initial interval request response received.');
    if (response && response.value) {
      const interval = Number(response.value);
      startTimer(interval);
    }
  });

  chrome.runtime.onMessage.addListener(event => {
    if (event.type === 'FEEDLY_AUTO_REFRESH_INTERVAL_UPDATED') {
      console.log('Feedly Auto Refresh: Interval updated.');
      startTimer(Number(event.value));
    }
  });

  const font = new FontFace(
    'Product Sans',
    'url(https://fonts.cdnfonts.com/s/14955/ProductSans-Light.woff)',
  );
  font.load().then(() => {
    console.log('Feedly Auto Refresh: Product Sans font loaded successfully.');
    updateUnreadCountAndTitle(true);
  });
  document.fonts.add(font);

  new MutationObserver(() => {
    updateUnreadCountAndTitle();
  }).observe(document.body, {
    childList: true,
    subtree: true,
  });

  function getUnreadCount() {
    const text = document.querySelector(UNREAD_COUNT_SELECTOR)?.textContent;
    if (rNumber.test(text)) {
      return Number(text);
    }
    return 0;
  }

  function drawFavicon(unreadCount, callback) {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = ORIGINAL_FAVICON_HREF;

    const roundedRectPath = (x, y, width, height, radius) => {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + width, y, x + width, y + height, r);
      ctx.arcTo(x + width, y + height, x, y + height, r);
      ctx.arcTo(x, y + height, x, y, r);
      ctx.arcTo(x, y, x + width, y, r);
      ctx.closePath();
    };

    img.onload = () => {
      console.log('Feedly Auto Refresh: Original favicon image loaded successfully.');
      ctx.drawImage(img, 0, 0, size, size);
      ctx.font = "20px 'Product Sans',Roboto,Helvetica,sans-serif";
      const padding = 1;
      const width = ctx.measureText(`${unreadCount}`).width + padding * 2;
      const height = 18;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      roundedRectPath(size - width, size - height, width, height, 4);
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'right';
      ctx.fillText(`${unreadCount}`, size - padding, size + 3);
      callback(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      console.error('Feedly Auto Refresh: Error loading original favicon image.');
    };
  }

  function updateFavicon(unreadCount) {
    const link = document.querySelector(FAVICON_SELECTOR);
    if (!link) {
      console.warn('Feedly Auto Refresh: Favicon link element not found.');
      return;
    }

    drawFavicon(unreadCount, newFaviconHref => {
      link.href = newFaviconHref;
    });
  }

  function updateTitle(unreadCount) {
    const trimmedTitle = document.title.replace(/^\(\d+\)\s/, '').trim();
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${trimmedTitle}`;
    } else {
      document.title = trimmedTitle;
    }
  }

  function updateUnreadCountAndTitle(force) {
    const newUnreadCount = getUnreadCount();

    if (newUnreadCount !== currentUnreadCount || force) {
      console.log(
        force
          ? 'Feedly Auto Refresh: Forcing update of unread count and title.'
          : `Feedly Auto Refresh: Unread count changed from ${currentUnreadCount} to ${newUnreadCount}.`,
      );
      currentUnreadCount = newUnreadCount;
      updateFavicon(currentUnreadCount);
      updateTitle(currentUnreadCount);
    }
  }
} catch (error) {
  console.error('Feedly Auto Refresh: Error in content script:', error);
}
