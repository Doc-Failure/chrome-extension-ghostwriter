document.getElementById('analyzeLanding').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.runtime.sendMessage({ action: 'analyzeLandingPage', tabId: tab.id });
  window.close();
});

document.getElementById('checkGrammar').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.runtime.sendMessage({ action: 'checkGrammarPage', tabId: tab.id });
  window.close();
});

document.getElementById('generateBlog').addEventListener('click', () => {
  const modal = document.getElementById('blogTitleModal');
  const input = document.getElementById('blogTitleInput');
  modal.style.display = 'flex';
  input.value = '';
  input.focus();
});

document.getElementById('cancelBlog').addEventListener('click', () => {
  document.getElementById('blogTitleModal').style.display = 'none';
});

document.getElementById('generateBlogBtn').addEventListener('click', async () => {
  const input = document.getElementById('blogTitleInput');
  const blogTitle = input.value.trim();

  if (blogTitle) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.runtime.sendMessage({
      action: 'generateBlog',
      tabId: tab.id,
      blogTitle: blogTitle
    });
    window.close();
  }
});

document.getElementById('blogTitleInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('generateBlogBtn').click();
  }
});
