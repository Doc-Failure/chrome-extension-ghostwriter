// ============================================================================
// BLOG ARTICLE GENERATOR FUNCTIONALITY
// ============================================================================

// ============================================================================
// BLOG ARTICLE GENERATOR
// ============================================================================

async function generateBlogArticle(tabId, blogTitle) {
  if (!('Writer' in self)) {
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => alert('Writer API is not available. Please check your Chrome version and flags.'),
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
      func: async (title) => {

        const loadingDiv = createNotification('Initializing Writer API...', 'info');
        loadingDiv.id = 'ghostwriter-blog-loading';
        document.body.appendChild(loadingDiv);

        try {
          if (!self.Writer) {
            loadingDiv.textContent = 'Writer API not available';
            loadingDiv.style.backgroundColor = STYLES.colors.error;
            setTimeout(() => loadingDiv.remove(), 3000);
            return;
          }

          const availability = await self.Writer.availability();

          if (availability === 'unavailable') {
            loadingDiv.textContent = 'Writer API is unavailable';
            loadingDiv.style.backgroundColor = STYLES.colors.error;
            setTimeout(() => loadingDiv.remove(), 3000);
            return;
          }

          const writerOptions = {
            sharedContext: 'You are a professional blog writer. Create engaging, informative, and well-structured blog articles with clear sections and compelling content.',
            tone: 'neutral',
            format: 'markdown',
            length: 'long',
            expectedInputLanguages: ['en'],
            expectedContextLanguages: ['en'],
            outputLanguage: 'en',
          };

          let writer;
          if (availability === 'available') {
            loadingDiv.textContent = 'Creating writer...';
            writer = await self.Writer.create(writerOptions);
          } else {
            loadingDiv.textContent = 'Downloading model...';
            writer = await self.Writer.create({
              ...writerOptions,
              monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                  loadingDiv.textContent = `Downloading: ${Math.round(e.loaded * 100)}%`;
                });
              },
            });
          }

          loadingDiv.textContent = 'Writing article...';

          const prompt = `Write a comprehensive blog article with the title: "${title}".

Include:
- An engaging introduction that hooks the reader
- 3-5 main sections with clear subheadings
- Detailed explanations with practical examples
- Actionable insights and takeaways
- A strong conclusion that summarizes key points
- Use markdown formatting (## for main sections, ### for subsections)`;

          let blogContent = '';
          const stream = writer.writeStreaming(prompt);

          for await (const chunk of stream) {
            blogContent += chunk;
            loadingDiv.textContent = `Writing... (${blogContent.length} chars)`;
          }

          loadingDiv.remove();

          // Create blog container
          const blogContainer = document.createElement('div');
          blogContainer.id = 'ghostwriter-blog-container';
          Object.assign(blogContainer.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80%',
            maxWidth: '800px',
            maxHeight: '90vh',
            backgroundColor: 'white',
            border: `2px solid ${STYLES.colors.primary}`,
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            zIndex: '10000',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'sans-serif',
          });

          // Header
          const header = document.createElement('div');
          Object.assign(header.style, {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          });

          const headerTitle = document.createElement('div');
          headerTitle.style.fontSize = '18px';
          headerTitle.style.fontWeight = 'bold';
          headerTitle.textContent = '📝 Generated Blog Article';
          header.appendChild(headerTitle);

          const closeButton = createButton('✕', 'neutral', () => blogContainer.remove());
          Object.assign(closeButton.style, {
            background: 'rgba(255,255,255,0.2)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            flex: 'none',
          });
          header.appendChild(closeButton);
          blogContainer.appendChild(header);

          // Content area
          const contentArea = document.createElement('div');
          Object.assign(contentArea.style, {
            padding: '30px',
            overflow: 'auto',
            flex: '1',
            lineHeight: '1.6',
            color: '#333',
          });

          const formattedContent = document.createElement('div');
          const lines = blogContent.split('\n');
          let currentHTML = '';

          lines.forEach(line => {
            line = line.trim();
            if (line.startsWith('###')) {
              currentHTML += `<h3 style="color: ${STYLES.colors.primary}; margin-top: 24px; margin-bottom: 12px; font-size: 18px;">${line.replace(/^###\s*/, '')}</h3>`;
            } else if (line.startsWith('##')) {
              currentHTML += `<h2 style="color: ${STYLES.colors.primary}; margin-top: 28px; margin-bottom: 14px; font-size: 22px;">${line.replace(/^##\s*/, '')}</h2>`;
            } else if (line.startsWith('#')) {
              currentHTML += `<h1 style="color: ${STYLES.colors.primary}; margin-top: 32px; margin-bottom: 16px; font-size: 26px;">${line.replace(/^#\s*/, '')}</h1>`;
            } else if (line === '') {
              currentHTML += '<br>';
            } else {
              currentHTML += `<p style="margin-bottom: 12px;">${line}</p>`;
            }
          });

          formattedContent.innerHTML = currentHTML;
          contentArea.appendChild(formattedContent);
          blogContainer.appendChild(contentArea);

          // Footer
          const footer = document.createElement('div');
          Object.assign(footer.style, {
            padding: '16px 20px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            backgroundColor: '#f9f9f9',
          });

          const copyButton = createButton('Copy to Clipboard', 'primary', () => {
            navigator.clipboard.writeText(blogContent).then(() => {
              copyButton.textContent = '✓ Copied!';
              setTimeout(() => {
                copyButton.textContent = 'Copy to Clipboard';
              }, 2000);
            });
          });
          Object.assign(copyButton.style, { padding: '10px 20px', fontSize: '14px', flex: 'none' });
          footer.appendChild(copyButton);

          const downloadButton = createButton('Download as TXT', 'success', () => {
            const blob = new Blob([blogContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          });
          Object.assign(downloadButton.style, { padding: '10px 20px', fontSize: '14px', flex: 'none' });
          footer.appendChild(downloadButton);

          blogContainer.appendChild(footer);
          document.body.appendChild(blogContainer);

        } catch (error) {
          console.error('Error generating blog:', error);
          loadingDiv.textContent = `Error: ${error.message}`;
          loadingDiv.style.backgroundColor = STYLES.colors.error;
          setTimeout(() => loadingDiv.remove(), 5000);
        }
      },
      args: [blogTitle],
    });
  } catch (error) {
    console.error('Error generating blog article:', error);
    chrome.scripting.executeScript({
      target: { tabId },
      func: (errorMessage) => alert(`An error occurred: ${errorMessage}`),
      args: [error.message],
    });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// No longer needed - using file injection instead of eval()
