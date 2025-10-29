// ============================================================================
// GHOST WRITER ASSISTANT - MAIN BACKGROUND SCRIPT
// ============================================================================

// Import all module files in the correct order
importScripts(
  'utils/constants.js',
  'utils/ui-helpers.js',
  'features/grammar-check.js',
  'features/text-rewriter.js',
  'features/landing-page-analyzer.js',
  'features/blog-generator.js'
);

// ============================================================================
// CONTEXT MENU SETUP
// ============================================================================

chrome.runtime.onInstalled.addListener(() => {
  const menuItems = [
    { id: 'checkGrammar', title: 'Ghost Writer: Check Grammar', contexts: ['selection'] },
    { id: 'rewriteText', title: 'Ghost Writer: Rewrite Text', contexts: ['selection'] },
    { id: 'checkGrammarPage', title: 'Ghost Writer: Check Grammar on Page', contexts: ['page'] },
  ];

  menuItems.forEach(item => chrome.contextMenus.create(item));
});

// ============================================================================
// CONTEXT MENU HANDLERS
// ============================================================================

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'checkGrammar' && info.selectionText) {
    await handleGrammarCheck(info, tab);
  } else if (info.menuItemId === 'rewriteText' && info.selectionText) {
    await handleRewriteText(info, tab);
  } else if (info.menuItemId === 'checkGrammarPage') {
    await handleGrammarCheckPage(tab);
  }
});

// ============================================================================
// KEYBOARD SHORTCUT HANDLER
// ============================================================================

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'grammar-check-replace') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // First, inject the constants and UI helpers
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['utils/constants.js', 'utils/ui-helpers.js']
    });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        // Add CSS animations if not already present
        if (!document.getElementById('ghostwriter-animations')) {
          const style = document.createElement('style');
          style.id = 'ghostwriter-animations';
          style.textContent = `
            @keyframes ghostwriter-fadein {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes ghostwriter-pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
          `;
          document.head.appendChild(style);
        }

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !selection.toString().trim()) {
          showNotification('Please select text first!', 'error', 2000);
          return;
        }

        const selectedText = selection.toString().trim();
        const range = selection.getRangeAt(0);
        const startContainer = range.startContainer;
        const startOffset = range.startOffset;
        const endContainer = range.endContainer;
        const endOffset = range.endOffset;

        const loadingDiv = createNotification('Checking grammar...', 'info');
        loadingDiv.id = 'ghostwriter-shortcut-loading';
        document.body.appendChild(loadingDiv);

        try {
          if (!self.Proofreader) {
            loadingDiv.textContent = 'Proofreader API not available';
            loadingDiv.style.backgroundColor = STYLES.colors.error;
            setTimeout(() => loadingDiv.remove(), 3000);
            return;
          }

          const proofreader = await self.Proofreader.create({
            expectedInputLanguages: ['en'],
          });

          const result = await proofreader.proofread(selectedText);
          const correctedText = cleanText(result?.correctedInput || '');
          const originalNormalized = normalizeText(selectedText);
          const correctedNormalized = normalizeText(correctedText);

          if (correctedText && correctedNormalized !== originalNormalized) {
            const newRange = document.createRange();
            try {
              newRange.setStart(startContainer, startOffset);
              newRange.setEnd(endContainer, endOffset);
              newRange.deleteContents();
              const newTextNode = document.createTextNode(correctedText);
              newRange.insertNode(newTextNode);

              selection.removeAllRanges();
              const selectRange = document.createRange();
              selectRange.selectNodeContents(newTextNode);
              selection.addRange(selectRange);
            } catch (rangeError) {
              if (startContainer.nodeType === Node.TEXT_NODE && startContainer === endContainer) {
                const textNode = startContainer;
                const originalContent = textNode.textContent;
                const before = originalContent.substring(0, startOffset);
                const after = originalContent.substring(endOffset);
                textNode.textContent = before + correctedText + after;
              } else {
                throw rangeError;
              }
            }

            loadingDiv.textContent = '✓ Grammar corrected!';
            loadingDiv.style.backgroundColor = STYLES.colors.success;
            setTimeout(() => loadingDiv.remove(), 2000);
          } else {
            loadingDiv.textContent = '✓ Grammar is perfect!';
            loadingDiv.style.backgroundColor = STYLES.colors.success;
            setTimeout(() => loadingDiv.remove(), 2000);
          }
        } catch (error) {
          console.error('Error checking grammar:', error);
          loadingDiv.textContent = `Error: ${error.message}`;
          loadingDiv.style.backgroundColor = STYLES.colors.error;
          setTimeout(() => loadingDiv.remove(), 3000);
        }
      }
    });
  }
});

// ============================================================================
// MESSAGE LISTENER FOR EXTENSION ACTIONS
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeLandingPage') {
    analyzeLandingPage(request.tabId);
  } else if (request.action === 'checkGrammarPage') {
    checkGrammarOnPage(request.tabId);
  } else if (request.action === 'generateBlog') {
    generateBlogArticle(request.tabId, request.blogTitle);
  }
});

// ============================================================================
// HELPER FUNCTION FOR GRAMMAR CHECK ON PAGE (via message)
// ============================================================================

async function checkGrammarOnPage(tabId) {
  await handleGrammarCheckPage({ id: tabId });
}

// ============================================================================
// UTILITY: Helper functions
// ============================================================================

// No longer needed - using file injection instead of eval()
