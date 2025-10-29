// ============================================================================
// LANDING PAGE ANALYZER FUNCTIONALITY
// ============================================================================

// ============================================================================
// LANDING PAGE ANALYZER
// ============================================================================

async function analyzeLandingPage(tabId) {
  if (!('Rewriter' in self)) {
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => alert('Rewriter API is not available. Please check your Chrome version and flags.'),
    });
    return;
  }

  try {
    // First, inject the constants and UI helpers
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['utils/constants.js', 'utils/ui-helpers.js']
    });

    chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {

        // Add animations
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

        const loadingDiv = createNotification('Analyzing landing page...', 'neutral');
        loadingDiv.id = 'ghostwriter-loading';
        document.body.appendChild(loadingDiv);

        function getPriorityScore(element, tag, text, rect) {
          let score = 0;
          const tagScores = { H1: 100, H2: 80, H3: 60, BUTTON: 90, A: 70, H4: 40, H5: 40, H6: 40, P: 30, LI: 20 };
          score += tagScores[tag] || 10;

          const viewportHeight = window.innerHeight;
          if (rect.top < viewportHeight * 0.5) score += 50;
          else if (rect.top < viewportHeight) score += 30;

          const lowerText = text.toLowerCase();
          const keywords = [
            { words: ['free', 'trial', 'demo'], points: 40 },
            { words: ['buy', 'purchase', 'order'], points: 35 },
            { words: ['sign up', 'register', 'join'], points: 35 },
            { words: ['download', 'get started', 'learn more'], points: 30 },
            { words: ['price', 'cost', '$'], points: 25 },
            { words: ['why', 'benefit', 'advantage'], points: 20 },
          ];

          keywords.forEach(({ words, points }) => {
            if (words.some(word => lowerText.includes(word))) score += points;
          });

          if (text.length > 20 && text.length < 200) score += 15;
          else if (text.length > 200 && text.length < 500) score += 10;

          const computedStyle = window.getComputedStyle(element);
          if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0') {
            score += 20;
          }

          return score;
        }

        function getTextElementsWithPriority() {
          const elements = getTextElements(10);
          return elements.map(item => {
            const priorityScore = getPriorityScore(item.element, item.tag, item.text, item.rect);
            return {
              ...item,
              priorityScore,
              isAboveFold: item.rect.top < window.innerHeight * 0.5,
            };
          }).sort((a, b) => b.priorityScore - a.priorityScore);
        }

        function getRewriterConfig(element, tag, text, isAboveFold) {
          let context = 'You are an expert landing page copywriter and conversion optimization specialist. ';

          const contextMap = {
            H1: 'This is the main headline. Make it compelling, clear, and benefit-focused. Focus on the primary value proposition and emotional trigger.',
            H2: 'This is a subheading. Make it support the main headline and guide users toward action.',
            BUTTON: 'This is a call-to-action button. Make it action-oriented, urgent, and compelling. Use power words and create urgency.',
            A: element.href ? 'This is a link. Make it clear what users will get when they click. Focus on benefits and outcomes.' : '',
            P: 'This is body text. Make it persuasive, benefit-driven, and easy to scan.',
            LI: 'This is a list item. Make it benefit-focused and specific. Use action words and quantifiable results.',
          };

          context += contextMap[tag] || (tag.match(/H[3-6]/) ? 'This is a section heading. Make it scannable and benefit-focused.' : 'This is general text. Make it more compelling and conversion-focused.');

          if (isAboveFold) {
            context += ' This content is above the fold, so it needs to immediately grab attention and communicate value.';
          }

          context += ' Maintain the original tone and length while making the copy more persuasive and conversion-focused.';

          return { context, tone: 'as-is', length: 'as-is' };
        }

        const textElements = getTextElementsWithPriority();
        const elementsToProcess = textElements.slice(0, 15);
        const batchSize = 3;
        let processed = 0;
        let improvedCount = 0;

        for (let i = 0; i < elementsToProcess.length; i += batchSize) {
          const batch = elementsToProcess.slice(i, i + batchSize);

          const batchPromises = batch.map(async (item) => {
            try {
              const config = getRewriterConfig(item.element, item.tag, item.text, item.isAboveFold);
              const rewriter = await self.Rewriter.create(config);
              const improvedText = await rewriter.rewrite(item.text);

              const isSignificantImprovement = improvedText &&
                improvedText.trim() !== item.text.trim() &&
                improvedText.length > item.text.length * 0.5 &&
                improvedText.length < item.text.length * 2;

              if (isSignificantImprovement) {
                createBubble({
                  element: item.element,
                  title: '✨ Ghost Writer Suggestion',
                  titleColor: STYLES.colors.accent,
                  borderColor: '#000',
                  content: improvedText,
                  buttons: [
                    {
                      text: 'Accept',
                      type: 'success',
                      onClick: function() {
                        item.element.textContent = improvedText;
                        this.closest('[data-ghostwriter-bubble]').remove();
                        chrome.storage.local.get(['ghostwriter_analytics'], (result) => {
                          const analytics = result.ghostwriter_analytics || { accepted: 0, rejected: 0, total: 0 };
                          analytics.accepted++;
                          analytics.total++;
                          chrome.storage.local.set({ ghostwriter_analytics: analytics });
                        });
                      },
                    },
                    {
                      text: 'Reject',
                      type: 'error',
                      onClick: function() {
                        this.closest('[data-ghostwriter-bubble]').remove();
                        chrome.storage.local.get(['ghostwriter_analytics'], (result) => {
                          const analytics = result.ghostwriter_analytics || { accepted: 0, rejected: 0, total: 0 };
                          analytics.rejected++;
                          analytics.total++;
                          chrome.storage.local.set({ ghostwriter_analytics: analytics });
                        });
                      },
                    },
                  ],
                });
                return { success: true, improved: true };
              } else {
                createBubble({
                  element: item.element,
                  title: '✓ Perfect! No improvements needed.',
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
                return { success: true, improved: false };
              }
            } catch (error) {
              console.error('Error processing element:', error);
              return { success: false, error: error.message };
            }
          });

          const results = await Promise.all(batchPromises);
          processed += results.filter(r => r.success).length;
          improvedCount += results.filter(r => r.success && r.improved).length;

          loadingDiv.textContent = `Analyzed ${processed}/${elementsToProcess.length} elements...`;

          if (i + batchSize < elementsToProcess.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        loadingDiv.textContent = `Analysis complete! Found ${improvedCount} suggestions out of ${processed} elements analyzed.`;

        chrome.storage.local.get(['ghostwriter_analytics'], (result) => {
          if (result.ghostwriter_analytics) {
            const analytics = result.ghostwriter_analytics;
            const acceptanceRate = analytics.total > 0 ? Math.round((analytics.accepted / analytics.total) * 100) : 0;
            loadingDiv.textContent += ` (${acceptanceRate}% acceptance rate)`;
          }
        });

        setTimeout(() => {
          loadingDiv.style.opacity = '0';
          loadingDiv.style.transition = 'opacity 0.5s';
          setTimeout(() => loadingDiv.remove(), 500);
        }, 3000);
      }
    });
  } catch (error) {
    console.error('Error analyzing landing page:', error);
    showErrorScript(tabId, error.message, 'Landing page analysis failed');
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

// Remove the old getHelperCode function - no longer needed
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

  const createNotificationCode = `
    function createNotification(message, type = 'info') {
      const colorMap = {
        info: STYLES.colors.primary,
        success: STYLES.colors.success,
        error: STYLES.colors.error,
        warning: STYLES.colors.warning,
        neutral: '#333',
      };

      const div = document.createElement('div');
      div.textContent = message;
      Object.assign(div.style, {
        ...STYLES.notification,
        backgroundColor: colorMap[type] || colorMap.info,
        color: 'white',
      });

      return div;
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

  const getTextElementsCode = `
    function getTextElements(minLength = 5) {
      const elements = [];
      const textTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'A', 'LI', 'BUTTON', 'DIV'];

      textTags.forEach(tag => {
        const tagElements = document.querySelectorAll(tag);
        tagElements.forEach(el => {
          const hasTextChildren = Array.from(el.children).some(child => {
            const childText = child.textContent.trim();
            return childText.length > 0 && textTags.includes(child.tagName);
          });

          if (hasTextChildren) return;

          const text = el.textContent.trim();
          if (text.length > minLength &&
              !el.querySelector('[data-ghostwriter-bubble]') &&
              !el.closest('[data-ghostwriter-bubble]')) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              elements.push({ element: el, text, rect, tag });
            }
          }
        });
      });

      return elements;
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

  return STYLES_STRING + createPointerCode + createButtonCode + createNotificationCode +
         positionBubbleCode + createBubbleCode + getTextElementsCode + showErrorCode;
}
*/
