// Secure DOM manipulation utilities
// Prevents XSS vulnerabilities by sanitizing content before insertion

class DOMUtils {
  constructor() {
    this.allowedTags = new Set([
      'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'em', 'b', 'i', 'u', 'br', 'hr',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'a', 'button'
    ]);
    
    this.allowedAttributes = new Set([
      'class', 'id', 'data-*', 'title', 'alt', 'src', 'href', 'target'
    ]);
  }

  // Safely set text content (always safe)
  setText(element, text) {
    if (!element) return;
    element.textContent = String(text || '');
    return element;
  }

  // Safely set HTML content with sanitization
  setHTML(element, htmlString) {
    if (!element) return;
    
    const sanitizedHTML = this.sanitizeHTML(htmlString);
    element.innerHTML = sanitizedHTML;
    return element;
  }

  // Create element safely with optional content
  createElement(tagName, options = {}) {
    const element = document.createElement(tagName);
    
    if (options.text) {
      this.setText(element, options.text);
    }
    
    if (options.html) {
      this.setHTML(element, options.html);
    }
    
    if (options.className) {
      element.className = options.className;
    }
    
    if (options.id) {
      element.id = options.id;
    }
    
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        if (this.isAllowedAttribute(key)) {
          element.setAttribute(key, String(value));
        }
      });
    }
    
    return element;
  }

  // Sanitize HTML content
  sanitizeHTML(htmlString) {
    if (!htmlString) return '';
    
    // Create a temporary div to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = htmlString;
    
    // Recursively sanitize all nodes
    this.sanitizeNode(temp);
    
    return temp.innerHTML;
  }

  // Recursively sanitize DOM nodes
  sanitizeNode(node) {
    if (!node) return;
    
    // Process child nodes first (bottom-up approach)
    const children = Array.from(node.childNodes);
    children.forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        this.sanitizeNode(child);
        
        // Check if tag is allowed
        if (!this.allowedTags.has(child.tagName.toLowerCase())) {
          // Replace with span or remove
          const replacement = document.createElement('span');
          replacement.textContent = child.textContent;
          child.parentNode.replaceChild(replacement, child);
          return;
        }
        
        // Sanitize attributes
        const attributes = Array.from(child.attributes);
        attributes.forEach(attr => {
          if (!this.isAllowedAttribute(attr.name)) {
            child.removeAttribute(attr.name);
          } else {
            // Sanitize attribute value
            child.setAttribute(attr.name, this.sanitizeAttributeValue(attr.value));
          }
        });
      }
    });
  }

  // Check if attribute is allowed
  isAllowedAttribute(attrName) {
    if (this.allowedAttributes.has(attrName)) return true;
    
    // Allow data-* attributes
    if (attrName.startsWith('data-')) return true;
    
    return false;
  }

  // Sanitize attribute values
  sanitizeAttributeValue(value) {
    if (!value) return '';
    
    // Remove javascript: and data: URLs
    const dangerous = /^(javascript:|data:|vbscript:|on\w+)/i;
    if (dangerous.test(value.trim())) {
      return '';
    }
    
    return value;
  }

  // Safe event listener attachment
  addEventListener(element, event, handler, options = {}) {
    if (!element || typeof handler !== 'function') return;
    
    element.addEventListener(event, handler, options);
    
    // Return cleanup function
    return () => element.removeEventListener(event, handler, options);
  }

  // Safely append child elements
  appendChild(parent, child) {
    if (!parent || !child) return;
    
    parent.appendChild(child);
    return parent;
  }

  // Safely remove element
  removeElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  // Create safe HTML template
  createTemplate(templateString, data = {}) {
    // Simple template replacement with sanitization
    let html = templateString;
    
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      const sanitizedValue = this.escapeHTML(String(value));
      html = html.replace(placeholder, sanitizedValue);
    });
    
    return this.sanitizeHTML(html);
  }

  // Escape HTML entities
  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Unescape HTML entities
  unescapeHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  // Validate and sanitize form data
  sanitizeFormData(formData) {
    const sanitized = {};
    
    Object.entries(formData).forEach(([key, value]) => {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeInput(value);
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }

  // Sanitize text input
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }

  // Create safe notification toast
  createToast(message, type = 'info', duration = 3000) {
    const toast = this.createElement('div', {
      className: `toast toast-${type}`,
      html: `
        <div class="toast-content">
          <div class="toast-message">${this.escapeHTML(message)}</div>
          <button class="toast-close" type="button">✕</button>
        </div>
      `
    });

    // Add to container
    let container = document.getElementById('toast-container');
    if (!container) {
      container = this.createElement('div', {
        id: 'toast-container',
        className: 'toast-container'
      });
      document.body.appendChild(container);
    }

    container.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
      this.removeElement(toast);
    }, duration);

    // Add close handler
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      this.addEventListener(closeBtn, 'click', () => {
        this.removeElement(toast);
      });
    }

    return toast;
  }

  // Safe modal creation
  createModal(title, content, options = {}) {
    const modal = this.createElement('div', {
      className: 'modal-overlay',
      html: `
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">${this.escapeHTML(title)}</h3>
            <button class="modal-close" type="button">✕</button>
          </div>
          <div class="modal-body">
            ${this.sanitizeHTML(content)}
          </div>
          <div class="modal-footer">
            ${options.showCancel !== false ? '<button class="btn btn-outline modal-cancel">Cancel</button>' : ''}
            ${options.confirmText ? `<button class="btn btn-primary modal-confirm">${this.escapeHTML(options.confirmText)}</button>` : ''}
          </div>
        </div>
      `
    });

    document.body.appendChild(modal);

    // Event handlers
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.modal-cancel');
    const confirmBtn = modal.querySelector('.modal-confirm');

    const closeModal = () => this.removeElement(modal);

    if (closeBtn) this.addEventListener(closeBtn, 'click', closeModal);
    if (cancelBtn) this.addEventListener(cancelBtn, 'click', closeModal);
    
    if (confirmBtn && options.onConfirm) {
      this.addEventListener(confirmBtn, 'click', () => {
        options.onConfirm();
        closeModal();
      });
    }

    // Close on overlay click
    this.addEventListener(modal, 'click', (e) => {
      if (e.target === modal) closeModal();
    });

    return modal;
  }
}

// Create global instance
window.domUtils = new DOMUtils();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOMUtils;
}