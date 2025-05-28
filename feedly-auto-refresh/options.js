document.addEventListener('DOMContentLoaded', () => {
  const intervalSelect = document.getElementById('refreshInterval');
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');

  function loadOptions() {
    chrome.storage.local.get('refreshInterval', data => {
      if (data.refreshInterval) {
        intervalSelect.value = data.refreshInterval;
      } else {
        intervalSelect.value = '30';
      }
    });
  }

  function saveOptions() {
    const selectedInterval = intervalSelect.value;
    chrome.storage.local.set({ refreshInterval: selectedInterval }, () => {
      statusDiv.textContent = 'Settings saved!';
      statusDiv.style.color = 'green';
      console.log('Feedly Auto Refresh: Interval saved:', selectedInterval);
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 2000);
    });
  }

  saveButton.addEventListener('click', saveOptions);
  loadOptions();
});
