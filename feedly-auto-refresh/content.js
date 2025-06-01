console.log('Feedly Auto Refresh: Content script loaded.');

const UNREAD_COUNT_SELECTOR = '.MarkAsReadButton__unread-count';
const ORIGINAL_FAVICON_HREF = getOriginalFaviconHref();
const rNumber = /^\d+$/;
let currentUnreadCount = 0;

const startTimer = (() => {
  let timer = null;
  const start = interval => {
    console.log('Feedly Auto Refresh: Starting timer with interval', interval, 'minutes.');
    if (timer) {
      clearInterval(timer);
    }
    timer = setInterval(async () => {
      console.log('Feedly Auto Refresh: Timer triggered. Attempting to click refresh button.');
      updateUnreadCountAndTitle(await getRemoteUnreadCount());
    }, interval * 60 * 1000);
  };
  return start;
})();
startTimer(30);

chrome.runtime.sendMessage({ type: 'FEEDLY_AUTO_REFRESH_REQUEST_INTERVAL' }, async response => {
  console.log('Feedly Auto Refresh: Initial request response received.', response);
  const interval = Number(response?.value);
  if (isNaN(interval) || interval <= 0) return;
  startTimer(interval);
  updateUnreadCountAndTitle(await getRemoteUnreadCount());
});

chrome.runtime.onMessage.addListener(async event => {
  if (event.type === 'FEEDLY_AUTO_REFRESH_INTERVAL_UPDATED') {
    console.log('Feedly Auto Refresh: Interval updated.');
    startTimer(Number(event.value));
    updateUnreadCountAndTitle(await getRemoteUnreadCount());
  }
});

const font = new FontFace(
  'Product Sans',
  'url(https://fonts.cdnfonts.com/s/14955/ProductSans-Light.woff)',
);
font.load().then(() => {
  console.log('Feedly Auto Refresh: Product Sans font loaded successfully.');
  updateUnreadCountAndTitle(getDomUnreadCount(), true);
});
document.fonts.add(font);

new MutationObserver(() => {
  updateUnreadCountAndTitle(getDomUnreadCount());
}).observe(document.body, {
  childList: true,
  subtree: true,
});

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

function getOriginalFaviconHref() {
  return document.querySelector("link[rel~='icon']")?.href ?? 'https://feedly.com/favicon.ico';
}

function getFeedlyToken() {
  const { feedlyToken, feedlyExpirationTime } = JSON.parse(localStorage['feedly.session']);
  if (Date.now() > feedlyExpirationTime) {
    return null;
  }
  return feedlyToken;
}

async function getRemoteUnreadCount() {
  const token = getFeedlyToken();
  if (!token) {
    console.warn('Feedly Auto Refresh: No valid JWT token found. Skipping refresh.');
    return -1;
  }

  const json = await fetch(`https://api.feedly.com/v3/markers/counts`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    method: 'GET',
    mode: 'cors',
  }).then(res => res.json());
  const count = Math.max(...json.unreadcounts.map(item => item.count));
  console.log('Feedly Auto Refresh: Remote unread count fetched successfully:', count);
  return count;
}

function getDomUnreadCount() {
  const text = document.querySelector(UNREAD_COUNT_SELECTOR)?.textContent;
  if (rNumber.test(text)) {
    return Number(text);
  }
  return 0;
}

function updateFavicon(unreadCount) {
  drawFavicon(Math.min(unreadCount, 999), applyFavicon);
}

function applyFavicon(href) {
  document.querySelectorAll('link').forEach(link => {
    if (link.getAttribute('rel')?.includes('icon')) {
      link.remove();
    }
  });
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = href;
  document.head.appendChild(link);
}

function updateTitle(unreadCount) {
  const trimmedTitle = document.title.replace(/^\(\d+\)\s/, '').trim();
  if (unreadCount > 0) {
    document.title = `(${unreadCount}) ${trimmedTitle}`;
  } else {
    document.title = trimmedTitle;
  }
}

function updateUnreadCountAndTitle(newUnreadCount, force) {
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
