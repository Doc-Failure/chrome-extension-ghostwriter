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
    borderBottom: `10px solid ${color}`,
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

function showNotification(message, type = 'info', duration = 3000) {
  const notification = createNotification(message, type);
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => notification.remove(), 500);
  }, duration);

  return notification;
}

function showError(errorMessage, context = 'Operation failed') {
  let message = `${context}. `;

  if (errorMessage.includes('API')) {
    message += 'The AI service is temporarily unavailable. Please try again in a few moments.';
  } else if (errorMessage.includes('network')) {
    message += 'Network connection issue. Please check your internet connection.';
  } else if (errorMessage.includes('Rewriter') || errorMessage.includes('Proofreader')) {
    message += 'The API is not available. Please check your Chrome version and enable the required flags.';
  } else {
    message += 'Please try again or contact support if the issue persists.';
  }

  const errorDiv = createNotification(message, 'error');
  errorDiv.style.maxWidth = '350px';
  document.body.appendChild(errorDiv);

  setTimeout(() => {
    errorDiv.style.opacity = '0';
    errorDiv.style.transition = 'opacity 0.5s';
    setTimeout(() => errorDiv.remove(), 500);
  }, 5000);
}

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

  bubble.style.top = `${top}px`;
  bubble.style.left = `${left}px`;
}

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

  if (element) {
    const originalOutline = element.style.outline;
    const originalBackground = element.style.backgroundColor;
    const originalPosition = element.style.position;
    const originalZIndex = element.style.zIndex;

    element.style.outline = `3px solid ${borderColor}`;
    element.style.outlineOffset = '2px';
    element.style.backgroundColor = borderColor === STYLES.colors.error
      ? 'rgba(231, 76, 60, 0.1)'
      : borderColor === STYLES.colors.success
      ? 'rgba(46, 204, 113, 0.1)'
      : 'rgba(102, 126, 234, 0.1)';
    element.style.position = 'relative';
    element.style.zIndex = '9998';
    element.style.animation = 'ghostwriter-pulse 2s ease-in-out infinite';

    element.setAttribute('data-ghostwriter-highlighted', 'true');
    element.setAttribute('data-ghostwriter-original-outline', originalOutline);
    element.setAttribute('data-ghostwriter-original-bg', originalBackground);
    element.setAttribute('data-ghostwriter-original-position', originalPosition);
    element.setAttribute('data-ghostwriter-original-zindex', originalZIndex);

    const rect = element.getBoundingClientRect();
    const isVisible = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );

    if (!isVisible) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  const bubble = document.createElement('div');
  if (id) bubble.id = id;
  bubble.setAttribute('data-ghostwriter-bubble', 'true');
  bubble.className = 'ghostwriter-bubble';

  if (element) {
    bubble.setAttribute('data-ghostwriter-target-element', 'stored');
    bubble._targetElement = element;
  }

  Object.assign(bubble.style, {
    position: 'absolute',
    backgroundColor: STYLES.colors.background,
    color: STYLES.colors.text,
    border: `2px solid ${borderColor}`,
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

  const originalRemove = bubble.remove.bind(bubble);
  bubble.remove = function() {
    removeElementHighlight(this._targetElement);
    originalRemove();
  };

  document.body.appendChild(bubble);
  return bubble;
}

function removeElementHighlight(element) {
  if (!element || !element.getAttribute('data-ghostwriter-highlighted')) {
    return;
  }

  const originalOutline = element.getAttribute('data-ghostwriter-original-outline');
  const originalBg = element.getAttribute('data-ghostwriter-original-bg');
  const originalPosition = element.getAttribute('data-ghostwriter-original-position');
  const originalZIndex = element.getAttribute('data-ghostwriter-original-zindex');

  element.style.outline = originalOutline || '';
  element.style.backgroundColor = originalBg || '';
  element.style.position = originalPosition || '';
  element.style.zIndex = originalZIndex || '';
  element.style.animation = '';
  element.style.outlineOffset = '';

  element.removeAttribute('data-ghostwriter-highlighted');
  element.removeAttribute('data-ghostwriter-original-outline');
  element.removeAttribute('data-ghostwriter-original-bg');
  element.removeAttribute('data-ghostwriter-original-position');
  element.removeAttribute('data-ghostwriter-original-zindex');
}

function cleanText(text) {
  if (!text) return text;
  return text.replace(/PROOFREAD_TEXT\s*/gi, '').trim();
}

function normalizeText(text) {
  return text.trim().replace(/\.+$/, '');
}

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
