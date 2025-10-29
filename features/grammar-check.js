// ============================================================================
// GRAMMAR CHECK FUNCTIONALITY
// ============================================================================

// ============================================================================
// GRAMMAR CHECK HANDLER (for selected text)
// ============================================================================

async function handleGrammarCheck(info, tab) {
  try {
    const proofreader = await Proofreader.create({
      includeCorrectionTypes: true,
      includeCorrectionExplanations: true,
    });

    const corrections = await proofreader.proofread(info.selectionText);

    // First, inject the constants and UI helpers
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['utils/constants.js', 'utils/ui-helpers.js']
    });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (corrections) => {
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

        const message = corrections?.correctedInput
          ? cleanText(corrections.correctedInput)
          : JSON.stringify(corrections, null, 2);

        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const contentDiv = document.createElement('pre');
        Object.assign(contentDiv.style, {
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        });
        contentDiv.textContent = message;

        createBubble({
          id: 'grammar-checker-result',
          element: range.startContainer.nodeType === Node.TEXT_NODE
            ? range.startContainer.parentElement
            : range.startContainer,
          content: contentDiv,
          buttons: [
            {
              text: 'Accept',
              type: 'success',
              onClick: () => {
                range.deleteContents();
                range.insertNode(document.createTextNode(message));
                document.getElementById('grammar-checker-result')?.remove();
              },
            },
            {
              text: 'Close',
              type: 'neutral',
              onClick: () => document.getElementById('grammar-checker-result')?.remove(),
            },
          ],
        });
      },
      args: [corrections],
    });
  } catch (error) {
    console.error('Error checking grammar:', error);
    showErrorScript(tab.id, error.message, 'Grammar check failed');
  }
}

// ============================================================================
// GRAMMAR CHECK PAGE HANDLER (for entire page)
// ============================================================================

async function handleGrammarCheckPage(tab) {
  if (!('Proofreader' in self)) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => alert('Proofreader API is not available. Please check your Chrome version and flags.'),
    });
    return;
  }

  // First, inject the constants and UI helpers
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['utils/constants.js', 'utils/ui-helpers.js']
  });

  // Then execute the main grammar check logic
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

      const loadingDiv = createNotification('Checking grammar...', 'warning');
      loadingDiv.id = 'ghostwriter-grammar-loading';
      document.body.appendChild(loadingDiv);

      try {
        const textElements = getTextElements();
        const elementsToProcess = textElements.slice(0, 20);

        if (!self.Proofreader) {
          loadingDiv.textContent = 'Proofreader API not available';
          setTimeout(() => loadingDiv.remove(), 3000);
          return;
        }

        const availability = await self.Proofreader.availability();
        if (availability !== 'readily') {
          loadingDiv.textContent = `Proofreader API status: ${availability}. Downloading...`;

          if (availability === 'after-download') {
            await self.Proofreader.create({
              expectedInputLanguages: ['en'],
              monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                  loadingDiv.textContent = `Downloading proofreader: ${Math.round(e.loaded * 100)}%`;
                });
              },
            });
          }
        }

        const proofreader = await self.Proofreader.create({
          expectedInputLanguages: ['en'],
        });

        let processed = 0;
        let errorsFound = 0;

        for (const item of elementsToProcess) {
          try {
            const proofreadResult = await proofreader.proofread(item.text);
            const originalNormalized = normalizeText(item.text);
            const correctedNormalized = normalizeText(proofreadResult?.correctedInput || '');

            if (proofreadResult?.correctedInput && correctedNormalized !== originalNormalized) {
              const correctedText = cleanText(proofreadResult.correctedInput);
              createBubble({
                element: item.element,
                title: '⚠️ Grammar Issues Found',
                titleColor: STYLES.colors.error,
                borderColor: STYLES.colors.error,
                content: correctedText,
                buttons: [
                  {
                    text: 'Fix',
                    type: 'success',
                    onClick: function() {
                      item.element.textContent = correctedText;
                      this.closest('[data-ghostwriter-bubble]').remove();
                    },
                  },
                  {
                    text: 'Ignore',
                    type: 'neutral',
                    onClick: function() {
                      this.closest('[data-ghostwriter-bubble]').remove();
                    },
                  },
                ],
              });
              errorsFound++;
            } else {
              createBubble({
                element: item.element,
                title: '✓ Perfect Grammar!',
                titleColor: STYLES.colors.success,
                borderColor: STYLES.colors.success,
                content: null,
                buttons: [
                  {
                    text: 'Dismiss',
                    type: 'neutral',
                    onClick: function() {
                      this.closest('[data-ghostwriter-bubble]').remove();
                    },
                  },
                ],
              });
            }

            processed++;
            loadingDiv.textContent = `Checked ${processed}/${elementsToProcess.length} elements...`;
          } catch (error) {
            console.error('Error checking grammar:', error);
          }
        }

        loadingDiv.textContent = `Grammar check complete! Found ${errorsFound} issues.`;
        loadingDiv.style.backgroundColor = errorsFound > 0 ? STYLES.colors.error : STYLES.colors.success;
        setTimeout(() => {
          loadingDiv.style.opacity = '0';
          loadingDiv.style.transition = 'opacity 0.5s';
          setTimeout(() => loadingDiv.remove(), 500);
        }, 2000);
      } catch (error) {
        console.error('Error:', error);
        showError(error.message, 'Grammar check failed');
        loadingDiv.remove();
      }
    }
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function showErrorScript(tabId, errorMessage, context) {
  // First, inject the constants and UI helpers
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['utils/constants.js', 'utils/ui-helpers.js']
  });

  chrome.scripting.executeScript({
    target: { tabId },
    func: (errorMessage, context) => {
      showError(errorMessage, context);
    },
    args: [errorMessage, context],
  });
}
