const ALARM_NAME = 'feedly-refresh-alarm';

async function createAlarm() {
  const { refreshInterval } = await chrome.storage.local.get('refreshInterval');
  const interval = Number(refreshInterval) || 5;
  chrome.alarms.clear(ALARM_NAME, wasCleared => {
    if (wasCleared) {
      console.log('Feedly Auto Refresh: Alarm cleared.');
    } else {
      console.log('Feedly Auto Refresh: No alarm to clear or error clearing alarm.');
    }
    console.log(`Feedly Auto Refresh: Alarm created with interval: ${interval} minutes.`);
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: 0.1,
      periodInMinutes: interval,
    });
  });
}

function clearAlarm() {}

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name === ALARM_NAME) {
    console.log('Feedly Auto Refresh: Alarm triggered. Sending refresh message.');
    const tabs = await chrome.tabs.query({ url: '*://feedly.com/*' });
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'FEEDLY_REFRESH_REQUEST' }, () => {
          console.log('Feedly Auto Refresh: Refresh request sent to tab', tab.title);
        });
      }
    });
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.refreshInterval) {
    console.log('Feedly Auto Refresh: Refresh interval changed. Recreating alarm.');
    clearAlarm();
    createAlarm();
  }
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Feedly Auto Refresh: Extension started up. Creating alarm.');
  createAlarm();
});

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    console.log(
      'Feedly Auto Refresh: Extension installed. Setting default interval and creating alarm.',
    );
    chrome.storage.local.set({ refreshInterval: '30' });
    createAlarm();
  } else if (details.reason === 'update') {
    console.log('Feedly Auto Refresh: Extension updated. Recreating alarm.');
    createAlarm();
  }
});
