// Core Utilities Module - Foundation for all other modules
// No template literals used - only string concatenation

var Utils = (function() {

  // Structured logging system
  var Logger = {
    levels: { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 },
    currentLevel: 2, // INFO level in production

    log: function(level, module, message, data) {
      if (level > this.currentLevel) return;

      var prefix = '[' + module + ']';
      var timestamp = new Date().toISOString();
      var logMessage = timestamp + ' ' + prefix + ' ' + message;

      if (data !== null && data !== undefined) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
      }
    },

    error: function(module, message, error) {
      this.log(0, module, '❌ ' + message, error);
    },

    warn: function(module, message) {
      this.log(1, module, '⚠️ ' + message);
    },

    info: function(module, message) {
      this.log(2, module, 'ℹ️ ' + message);
    },

    debug: function(module, message, data) {
      this.log(3, module, '🔍 ' + message, data);
    }
  };

  // Error boundary wrapper
  function ErrorBoundary(moduleName, fn) {
    return function() {
      try {
        var args = Array.prototype.slice.call(arguments);
        var result = fn.apply(this, args);
        Logger.debug(moduleName, 'Function executed successfully');
        return result;
      } catch (error) {
        Logger.error(moduleName, 'Function failed', error);

        // Attempt recovery if handler available
        if (this && this.handleError) {
          try {
            return this.handleError(error);
          } catch (recoveryError) {
            Logger.error(moduleName, 'Error recovery failed', recoveryError);
          }
        }

        throw error;
      }
    };
  }

  // Safe async wrapper
  function safeAsync(moduleName, asyncFn) {
    return async function() {
      try {
        var args = Array.prototype.slice.call(arguments);
        var result = await asyncFn.apply(this, args);
        Logger.debug(moduleName, 'Async function executed successfully');
        return result;
      } catch (error) {
        Logger.error(moduleName, 'Async function failed', error);

        // Attempt recovery if handler available
        if (this && this.handleError) {
          try {
            return await this.handleError(error);
          } catch (recoveryError) {
            Logger.error(moduleName, 'Async error recovery failed', recoveryError);
          }
        }

        throw error;
      }
    };
  }

  // DOM utility functions
  var DOM = {
    // Safe element selection
    select: function(selector) {
      try {
        return jQuery(selector);
      } catch (error) {
        Logger.error('DOM', 'Element selection failed: ' + selector, error);
        return jQuery();
      }
    },

    // Safe element creation
    create: function(tagName, attributes, content) {
      try {
        var element = jQuery('<' + tagName + '>');

        if (attributes) {
          element.attr(attributes);
        }

        if (content) {
          element.html(content);
        }

        return element;
      } catch (error) {
        Logger.error('DOM', 'Element creation failed', error);
        return jQuery();
      }
    },

    // Safe event binding
    on: function(element, event, handler) {
      try {
        if (element && element.length > 0) {
          element.on(event, handler);
        }
      } catch (error) {
        Logger.error('DOM', 'Event binding failed', error);
      }
    },

    // Safe event unbinding
    off: function(element, event) {
      try {
        if (element && element.length > 0) {
          element.off(event);
        }
      } catch (error) {
        Logger.error('DOM', 'Event unbinding failed', error);
      }
    }
  };

  // Configuration utilities
  var Config = {
    // Load configuration from global variables
    load: function() {
      return {
        questionName: window.questionName || 'VQ1',
        videoURL: window.videoURL || 'VQ1_pipe_url',
        deepgram: window.deepGramConfiguration || {},
        openai: {
          apiKey: window.OPENAI_API_KEY || '',
          model: window.OPENAI_MODEL || 'gpt-4o'
        },
        questionConfig: window.questionConfig || {},
        pipeParams: window.pipeParams || {},
        validationDetails: window.validationDetails || {}
      };
    },

    // Validate configuration
    validate: function(config) {
      var errors = [];

      if (!config.questionName) {
        errors.push('Question name is required');
      }

      if (!config.openai.apiKey) {
        errors.push('OpenAI API key is required');
      }

      if (!config.pipeParams.accountHash) {
        errors.push('Pipe account hash is required');
      }

      if (errors.length > 0) {
        throw new Error('Configuration errors: ' + errors.join(', '));
      }

      return true;
    }
  };

  // Utility functions
  var Helpers = {
    // Safe JSON operations
    parseJSON: function(str) {
      try {
        return JSON.parse(str);
      } catch (error) {
        Logger.error('Utils', 'JSON parse failed', error);
        return null;
      }
    },

    stringifyJSON: function(obj) {
      try {
        return JSON.stringify(obj);
      } catch (error) {
        Logger.error('Utils', 'JSON stringify failed', error);
        return '{}';
      }
    },

    // Debounce function for performance
    debounce: function(func, wait) {
      var timeout;
      return function() {
        var context = this;
        var args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
          func.apply(context, args);
        }, wait);
      };
    },

    // Format time as MM:SS
    formatTime: function(seconds) {
      var mins = Math.floor(seconds / 60);
      var secs = Math.floor(seconds % 60);
      return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
    },

    // Generate unique IDs
    generateId: function(prefix) {
      return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
  };

  // Performance monitoring
  var Performance = {
    startTime: performance.now(),

    mark: function(name) {
      var duration = performance.now() - this.startTime;
      Logger.debug('Performance', 'Mark: ' + name + ' at ' + duration.toFixed(2) + 'ms');
    },

    measure: function(name, startMark, endMark) {
      var duration = performance.now() - this.startTime;
      Logger.info('Performance', 'Measure: ' + name + ' took ' + duration.toFixed(2) + 'ms');
    }
  };

  // Export public API
  return {
    Logger: Logger,
    ErrorBoundary: ErrorBoundary,
    safeAsync: safeAsync,
    DOM: DOM,
    Config: Config,
    Helpers: Helpers,
    Performance: Performance
  };

})();
