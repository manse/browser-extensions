const postRefreshInterval = async interval => {
  const tabs = await chrome.tabs.query({ url: '*://feedly.com/*' });
  tabs.forEach(tab => {
    if (tab.id) {
      chrome.tabs.sendMessage(
        tab.id,
        { type: 'FEEDLY_AUTO_REFRESH_INTERVAL_UPDATED', value: interval },
        () => {
          console.log('Feedly Auto Refresh: Refresh request sent to tab', tab.title);
        },
      );
    }
  });
};

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'FEEDLY_AUTO_REFRESH_REQUEST_INTERVAL') {
    chrome.storage.local.get('refreshInterval', data => {
      const interval = data.refreshInterval || '30';
      console.log('Feedly Auto Refresh: Response to interval request:', interval);
      sendResponse({ value: interval });
    });
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.refreshInterval) {
    const newInterval = changes.refreshInterval.newValue;
    console.log('Feedly Auto Refresh: Refresh interval changed to', newInterval, 'minutes.');
    postRefreshInterval(newInterval);
  }
});

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    console.log(
      'Feedly Auto Refresh: Extension installed. Setting default interval and creating alarm.',
    );
    chrome.storage.local.set({ refreshInterval: '30' });
  }
});
