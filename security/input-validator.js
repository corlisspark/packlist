// Input Validation and XSS Protection for PacksList
// Comprehensive client-side validation and sanitization

class InputValidator {
  constructor() {
    this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    this.urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    
    // XSS prevention patterns
    this.xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload=/gi,
      /onerror=/gi,
      /onclick=/gi,
      /onmouseover=/gi,
      /onfocus=/gi,
      /onblur=/gi
    ];
    
    // SQL injection patterns (for extra protection)
    this.sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|\/\*|\*\/|xp_|sp_)/gi,
      /(\bOR\b.*=.*|AND.*=.*)/gi
    ];
    
    // Content filtering for inappropriate content
    this.inappropriatePatterns = [
      // This would be expanded with actual content filtering
      /\b(spam|scam|fake|illegal)\b/gi
    ];
  }

  // Main validation method for all form inputs
  validateInput(input, type, options = {}) {
    const result = {
      isValid: true,
      sanitized: input,
      errors: []
    };

    if (!input && !options.required) {
      return result;
    }

    if (!input && options.required) {
      result.isValid = false;
      result.errors.push('This field is required');
      return result;
    }

    // Basic sanitization
    result.sanitized = this.sanitizeString(input.toString());

    // Type-specific validation
    switch (type) {
      case 'email':
        return this.validateEmail(result.sanitized, options);
      case 'password':
        return this.validatePassword(result.sanitized, options);
      case 'text':
        return this.validateText(result.sanitized, options);
      case 'textarea':
        return this.validateTextarea(result.sanitized, options);
      case 'number':
        return this.validateNumber(result.sanitized, options);
      case 'phone':
        return this.validatePhone(result.sanitized, options);
      case 'url':
        return this.validateUrl(result.sanitized, options);
      case 'price':
        return this.validatePrice(result.sanitized, options);
      case 'title':
        return this.validateTitle(result.sanitized, options);
      case 'description':
        return this.validateDescription(result.sanitized, options);
      default:
        return this.validateGeneric(result.sanitized, options);
    }
  }

  // Sanitize string to prevent XSS
  sanitizeString(str) {
    if (!str) return '';
    
    // Convert to string and trim
    let sanitized = String(str).trim();
    
    // HTML encode dangerous characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    return sanitized;
  }

  // Deep sanitization for content that may contain HTML
  sanitizeHtml(str) {
    if (!str) return '';
    
    let sanitized = this.sanitizeString(str);
    
    // Remove potentially dangerous patterns
    this.xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    this.sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    return sanitized;
  }

  // Email validation
  validateEmail(email, options = {}) {
    const result = { isValid: true, sanitized: email, errors: [] };
    
    if (!this.emailRegex.test(email)) {
      result.isValid = false;
      result.errors.push('Please enter a valid email address');
    }
    
    if (email.length > 254) {
      result.isValid = false;
      result.errors.push('Email address is too long');
    }
    
    return result;
  }

  // Password validation
  validatePassword(password, options = {}) {
    const result = { isValid: true, sanitized: password, errors: [] };
    const minLength = options.minLength || 6;
    const maxLength = options.maxLength || 128;
    
    if (password.length < minLength) {
      result.isValid = false;
      result.errors.push(`Password must be at least ${minLength} characters long`);
    }
    
    if (password.length > maxLength) {
      result.isValid = false;
      result.errors.push(`Password must be less than ${maxLength} characters long`);
    }
    
    if (options.requireUppercase && !/[A-Z]/.test(password)) {
      result.isValid = false;
      result.errors.push('Password must contain at least one uppercase letter');
    }
    
    if (options.requireLowercase && !/[a-z]/.test(password)) {
      result.isValid = false;
      result.errors.push('Password must contain at least one lowercase letter');
    }
    
    if (options.requireNumbers && !/\d/.test(password)) {
      result.isValid = false;
      result.errors.push('Password must contain at least one number');
    }
    
    if (options.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.isValid = false;
      result.errors.push('Password must contain at least one special character');
    }
    
    // Don't sanitize passwords (they should be hashed on server)
    result.sanitized = password;
    
    return result;
  }

  // Text input validation
  validateText(text, options = {}) {
    const result = { isValid: true, sanitized: this.sanitizeString(text), errors: [] };
    const minLength = options.minLength || 0;
    const maxLength = options.maxLength || 255;
    
    if (result.sanitized.length < minLength) {
      result.isValid = false;
      result.errors.push(`Must be at least ${minLength} characters long`);
    }
    
    if (result.sanitized.length > maxLength) {
      result.isValid = false;
      result.errors.push(`Must be less than ${maxLength} characters long`);
    }
    
    if (options.allowedChars && !new RegExp(options.allowedChars).test(result.sanitized)) {
      result.isValid = false;
      result.errors.push('Contains invalid characters');
    }
    
    return result;
  }

  // Textarea validation (longer text)
  validateTextarea(text, options = {}) {
    const result = { isValid: true, sanitized: this.sanitizeHtml(text), errors: [] };
    const minLength = options.minLength || 0;
    const maxLength = options.maxLength || 5000;
    
    if (result.sanitized.length < minLength) {
      result.isValid = false;
      result.errors.push(`Must be at least ${minLength} characters long`);
    }
    
    if (result.sanitized.length > maxLength) {
      result.isValid = false;
      result.errors.push(`Must be less than ${maxLength} characters long`);
    }
    
    // Check for inappropriate content
    if (this.containsInappropriateContent(result.sanitized)) {
      result.isValid = false;
      result.errors.push('Content contains inappropriate material');
    }
    
    return result;
  }

  // Number validation
  validateNumber(number, options = {}) {
    const result = { isValid: true, sanitized: number, errors: [] };
    const num = parseFloat(number);
    
    if (isNaN(num)) {
      result.isValid = false;
      result.errors.push('Must be a valid number');
      return result;
    }
    
    if (options.min !== undefined && num < options.min) {
      result.isValid = false;
      result.errors.push(`Must be at least ${options.min}`);
    }
    
    if (options.max !== undefined && num > options.max) {
      result.isValid = false;
      result.errors.push(`Must be no more than ${options.max}`);
    }
    
    if (options.integer && !Number.isInteger(num)) {
      result.isValid = false;
      result.errors.push('Must be a whole number');
    }
    
    result.sanitized = num;
    return result;
  }

  // Phone validation
  validatePhone(phone, options = {}) {
    const result = { isValid: true, sanitized: phone, errors: [] };
    
    // Remove all non-digit characters except +
    const cleanPhone = phone.replace(/[^\d\+]/g, '');
    result.sanitized = cleanPhone;
    
    if (!this.phoneRegex.test(cleanPhone)) {
      result.isValid = false;
      result.errors.push('Please enter a valid phone number');
    }
    
    return result;
  }

  // URL validation
  validateUrl(url, options = {}) {
    const result = { isValid: true, sanitized: url, errors: [] };
    
    if (!this.urlRegex.test(url)) {
      result.isValid = false;
      result.errors.push('Please enter a valid URL');
    }
    
    // Ensure HTTPS if required
    if (options.requireHttps && !url.startsWith('https://')) {
      result.isValid = false;
      result.errors.push('URL must use HTTPS');
    }
    
    return result;
  }

  // Price validation (specific for pack prices)
  validatePrice(price, options = {}) {
    const result = { isValid: true, sanitized: price, errors: [] };
    const num = parseFloat(price);
    
    if (isNaN(num)) {
      result.isValid = false;
      result.errors.push('Price must be a valid number');
      return result;
    }
    
    if (num < 0) {
      result.isValid = false;
      result.errors.push('Price cannot be negative');
    }
    
    if (num > 10000) {
      result.isValid = false;
      result.errors.push('Price seems unreasonably high');
    }
    
    // Round to 2 decimal places
    result.sanitized = Math.round(num * 100) / 100;
    
    return result;
  }

  // Title validation (for pack titles)
  validateTitle(title, options = {}) {
    const result = this.validateText(title, {
      minLength: 3,
      maxLength: 100,
      ...options
    });
    
    // Additional title-specific checks
    if (result.isValid && this.containsInappropriateContent(result.sanitized)) {
      result.isValid = false;
      result.errors.push('Title contains inappropriate content');
    }
    
    return result;
  }

  // Description validation (for pack descriptions)
  validateDescription(description, options = {}) {
    return this.validateTextarea(description, {
      minLength: 10,
      maxLength: 1000,
      ...options
    });
  }

  // Generic validation
  validateGeneric(input, options = {}) {
    return this.validateText(input, options);
  }

  // Check for inappropriate content
  containsInappropriateContent(text) {
    return this.inappropriatePatterns.some(pattern => pattern.test(text));
  }

  // Validate multiple fields at once
  validateForm(formData, validationRules) {
    const results = {};
    let isFormValid = true;
    
    for (const [fieldName, fieldValue] of Object.entries(formData)) {
      const rules = validationRules[fieldName] || {};
      const result = this.validateInput(fieldValue, rules.type || 'text', rules.options || {});
      
      results[fieldName] = result;
      
      if (!result.isValid) {
        isFormValid = false;
      }
    }
    
    return {
      isValid: isFormValid,
      fields: results,
      sanitizedData: Object.fromEntries(
        Object.entries(results).map(([key, result]) => [key, result.sanitized])
      )
    };
  }

  // Real-time validation for form fields
  setupRealTimeValidation(formElement, validationRules) {
    if (!formElement) return;
    
    const inputs = formElement.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      const fieldName = input.name || input.id;
      const rules = validationRules[fieldName];
      
      if (!rules) return;
      
      // Validate on blur
      input.addEventListener('blur', () => {
        this.validateAndDisplayErrors(input, rules);
      });
      
      // Validate on input for immediate feedback
      input.addEventListener('input', () => {
        // Debounce validation for performance
        clearTimeout(input.validationTimeout);
        input.validationTimeout = setTimeout(() => {
          this.validateAndDisplayErrors(input, rules);
        }, 300);
      });
    });
  }

  // Validate field and display errors in UI
  validateAndDisplayErrors(input, rules) {
    const result = this.validateInput(input.value, rules.type || 'text', rules.options || {});
    
    // Find or create error display element
    let errorElement = input.parentNode.querySelector('.validation-error');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'validation-error';
      input.parentNode.appendChild(errorElement);
    }
    
    // Update input styling
    if (result.isValid) {
      input.classList.remove('invalid');
      input.classList.add('valid');
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    } else {
      input.classList.remove('valid');
      input.classList.add('invalid');
      errorElement.textContent = result.errors[0]; // Show first error
      errorElement.style.display = 'block';
    }
    
    // Update sanitized value if needed
    if (result.sanitized !== input.value && result.isValid) {
      input.value = result.sanitized;
    }
    
    return result;
  }

  // Sanitize object recursively
  sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeString(obj);
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        sanitized[key] = value.map(item => this.sanitizeObject(item));
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = this.sanitizeString(value);
      }
    }
    
    return sanitized;
  }
}

// CSS for validation styling
const validationCSS = `
  .validation-error {
    color: #e74c3c;
    font-size: 12px;
    margin-top: 4px;
    display: none;
  }
  
  .invalid {
    border-color: #e74c3c !important;
    box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2) !important;
  }
  
  .valid {
    border-color: #27ae60 !important;
    box-shadow: 0 0 0 2px rgba(39, 174, 96, 0.2) !important;
  }
`;

// Inject CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = validationCSS;
  document.head.appendChild(style);
}

// Global instance
window.inputValidator = new InputValidator();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InputValidator;
}