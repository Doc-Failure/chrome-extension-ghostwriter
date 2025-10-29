// ============================================================================
// TEXT REWRITER FUNCTIONALITY
// ============================================================================

// ============================================================================
// REWRITE TEXT HANDLER
// ============================================================================

async function handleRewriteText(info, tab) {
  try {
    if (!('Rewriter' in self)) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => alert('Rewriter API is not available. Please check your Chrome version and flags.'),
      });
      return;
    }

    const rewriter = await Rewriter.create({
      context: 'You are an expert landing page copywriter and conversion optimization specialist. Your goal is to improve text to maximize conversions, engagement, and user action. Focus on: 1) Clear value propositions that address pain points, 2) Compelling headlines that grab attention, 3) Benefit-driven copy over feature lists, 4) Strong calls-to-action that create urgency, 5) Social proof and credibility indicators, 6) Emotional triggers that resonate with the target audience. Maintain the original tone and length while making the copy more persuasive and conversion-focused.',
      tone: 'as-is',
      length: 'as-is',
    });

    const rewrittenText = await rewriter.rewrite(info.selectionText);

    // First, inject the constants and UI helpers
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['utils/constants.js', 'utils/ui-helpers.js']
    });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (rewrittenText) => {
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
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const contentDiv = document.createElement('pre');
        Object.assign(contentDiv.style, {
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        });
        contentDiv.textContent = rewrittenText;

        createBubble({
          id: 'rewriter-result',
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
                range.insertNode(document.createTextNode(rewrittenText));
                document.getElementById('rewriter-result')?.remove();
              },
            },
            {
              text: 'Close',
              type: 'neutral',
              onClick: () => document.getElementById('rewriter-result')?.remove(),
            },
          ],
        });
      },
      args: [rewrittenText],
    });
  } catch (error) {
    console.error('Error rewriting text:', error);
    showErrorScript(tab.id, error.message, 'Text rewrite failed');
  }
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

// No longer needed - using file injection instead of eval()
/*
function getHelperCode() {
  // Import the helper functions as strings to inject into pages
  const STYLES_STRING = `const STYLES = ${JSON.stringify(STYLES)};`;

  const createPointerCode = `
    function createPointer(color, position = '50%') {
      const outer = document.createElement('div');
      Object.assign(outer.style, {
        position: 'absolute',
        top: '-10px',
        left: position,
        transform: 'translateX(-50%)',
        width: '0',
        height: '0',
        borderLeft: '10px solid transparent',
        borderRight: '10px solid transparent',
        borderBottom: \`10px solid \${color}\`,
      });

      const inner = document.createElement('div');
      Object.assign(inner.style, {
        position: 'absolute',
        top: '2px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '0',
        height: '0',
        borderLeft: '10px solid transparent',
        borderRight: '10px solid transparent',
        borderBottom: '10px solid white',
      });

      return { outer, inner };
    }
  `;

  const createButtonCode = `
    function createButton(text, type = 'primary', onClick) {
      const button = document.createElement('button');
      button.textContent = text;

      const colorMap = {
        primary: { bg: STYLES.colors.primary, hover: STYLES.colors.primaryHover || '#5568d3' },
        success: { bg: STYLES.colors.success, hover: STYLES.colors.successHover },
        error: { bg: STYLES.colors.error, hover: STYLES.colors.errorHover },
        neutral: { bg: STYLES.colors.neutral, hover: STYLES.colors.neutralHover },
      };

      const colors = colorMap[type] || colorMap.primary;

      Object.assign(button.style, {
        ...STYLES.button,
        backgroundColor: colors.bg,
        color: 'white',
        flex: '1',
      });

      button.onmouseover = () => button.style.backgroundColor = colors.hover;
      button.onmouseout = () => button.style.backgroundColor = colors.bg;
      button.onclick = onClick;

      return button;
    }
  `;

  const positionBubbleCode = `
    function positionBubble(bubble, element) {
      const rect = element.getBoundingClientRect();
      const bubbleWidth = parseInt(STYLES.bubble.maxWidth) || 400;
      const viewportWidth = window.innerWidth;

      let top = window.scrollY + rect.bottom + 10;
      let left = window.scrollX + rect.left;

      if (left + bubbleWidth > viewportWidth) {
        left = Math.max(10, viewportWidth - bubbleWidth - 10);
      }

      if (left < 10) {
        left = 10;
      }

      bubble.style.top = \`\${top}px\`;
      bubble.style.left = \`\${left}px\`;
    }
  `;

  const createBubbleCode = `
    function createBubble(options = {}) {
      const {
        id,
        element,
        title,
        content,
        borderColor = STYLES.colors.border,
        titleColor = STYLES.colors.accent,
        buttons = [],
        showPointer = true,
      } = options;

      if (id) {
        const existing = document.getElementById(id);
        if (existing) existing.remove();
      }

      const bubble = document.createElement('div');
      if (id) bubble.id = id;
      bubble.setAttribute('data-ghostwriter-bubble', 'true');
      bubble.className = 'ghostwriter-bubble';

      Object.assign(bubble.style, {
        position: 'absolute',
        backgroundColor: STYLES.colors.background,
        color: STYLES.colors.text,
        border: \`2px solid \${borderColor}\`,
        borderRadius: STYLES.bubble.borderRadius,
        padding: STYLES.bubble.padding,
        paddingTop: STYLES.bubble.paddingTop,
        maxWidth: STYLES.bubble.maxWidth,
        maxHeight: STYLES.bubble.maxHeight,
        overflow: 'auto',
        fontFamily: 'sans-serif',
        fontSize: STYLES.bubble.fontSize,
        lineHeight: STYLES.bubble.lineHeight,
        boxShadow: STYLES.bubble.boxShadow,
        zIndex: '9999',
        boxSizing: 'border-box',
        animation: 'ghostwriter-fadein 0.3s',
      });

      if (element) {
        positionBubble(bubble, element);
      } else {
        bubble.style.top = '100px';
        bubble.style.left = '100px';
      }

      if (showPointer) {
        const pointers = createPointer(borderColor);
        bubble.appendChild(pointers.outer);
        bubble.appendChild(pointers.inner);
      }

      if (title) {
        const titleDiv = document.createElement('div');
        titleDiv.textContent = title;
        Object.assign(titleDiv.style, {
          fontWeight: 'bold',
          marginBottom: '8px',
          fontSize: '11px',
          textTransform: 'uppercase',
          color: titleColor,
        });
        bubble.appendChild(titleDiv);
      }

      if (content) {
        const contentDiv = document.createElement('div');
        if (typeof content === 'string') {
          contentDiv.textContent = content;
        } else {
          contentDiv.appendChild(content);
        }
        Object.assign(contentDiv.style, {
          marginBottom: '10px',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
        });
        bubble.appendChild(contentDiv);
      }

      if (buttons.length > 0) {
        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
          display: 'flex',
          gap: '8px',
          marginTop: '10px',
        });

        buttons.forEach(btn => {
          const button = createButton(btn.text, btn.type, btn.onClick);
          buttonContainer.appendChild(button);
        });

        bubble.appendChild(buttonContainer);
      }

      document.body.appendChild(bubble);
      return bubble;
    }
  `;

  const showErrorCode = `
    function showError(errorMessage, context = 'Operation failed') {
      let message = \`\${context}. \`;

      if (errorMessage.includes('API')) {
        message += 'The AI service is temporarily unavailable. Please try again in a few moments.';
      } else if (errorMessage.includes('network')) {
        message += 'Network connection issue. Please check your internet connection.';
      } else if (errorMessage.includes('Rewriter') || errorMessage.includes('Proofreader')) {
        message += 'The API is not available. Please check your Chrome version and enable the required flags.';
      } else {
        message += 'Please try again or contact support if the issue persists.';
      }

      const colorMap = {
        info: STYLES.colors.primary,
        success: STYLES.colors.success,
        error: STYLES.colors.error,
        warning: STYLES.colors.warning,
        neutral: '#333',
      };

      const errorDiv = document.createElement('div');
      errorDiv.textContent = message;
      Object.assign(errorDiv.style, {
        ...STYLES.notification,
        backgroundColor: colorMap.error,
        color: 'white',
        maxWidth: '350px',
      });
      document.body.appendChild(errorDiv);

      setTimeout(() => {
        errorDiv.style.opacity = '0';
        errorDiv.style.transition = 'opacity 0.5s';
        setTimeout(() => errorDiv.remove(), 500);
      }, 5000);
    }
  `;

  return STYLES_STRING + createPointerCode + createButtonCode + positionBubbleCode +
         createBubbleCode + showErrorCode;
}
*/
