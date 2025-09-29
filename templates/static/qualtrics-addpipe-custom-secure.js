// ===============================================
// QUALTRICS MODULAR VIDEO RECORDER BUNDLE
// Generated: 2025-09-29T22:43:18.804Z
// Total modules: 13
// DO NOT EDIT - Generated from src/ directory
// ===============================================

// === utils.js (262 lines) ===
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


// === global-registry.js (252 lines) ===
// Global Registry - Centralized state and module management
// No template literals used - only string concatenation

var GlobalRegistry = (function() {

  var Utils = window.Utils; // Will be set after Utils loads

  // Module storage
  var modules = {};

  // State storage
  var state = {
    // Core state
    isRecording: false,
    isConversationActive: false,
    shouldActuallyStop: false,
    conversationStartTime: null,
    segmentStartTime: null,

    // UI state
    currentQuestion: '',
    isProcessingAI: false,

    // Error state
    hasError: false,
    errorMessage: '',

    // Performance metrics
    loadTime: 0,
    recordingCount: 0
  };

  // Configuration cache
  var config = null;

  // Global variables that need to be maintained for compatibility
  var globalVars = {
    isRecording: false,
    global_transcript: '',
    defaultThumbnail: 'https://d2kltgp8v5sml0.cloudfront.net/templates/svg/gallary.svg',
    streamTime: '',
    recorderObjectGlobal: null,
    isBackTOcamera: false,
    intervalID: null,
    ws: null,
    mediaRecorder: null,
    stream: null,
    S3_BASE_URL: 'https://s3.us-east-1.amazonaws.com/com.knit.pipe-recorder-videos/',
    mimetype: 'audio/webm', // Default mimetype for MediaRecorder

    // Conversation state variables
    isConversationActive: false,
    shouldActuallyStop: false,
    conversationManager: null,
    aiService: null,
    accumulatedTranscript: '',
    currentSegmentTranscript: '',
    fakeStopButtonActive: false,
    originalStopHandler: null,
    conversationStartTime: null,
    segmentStartTime: null
  };

  // Registry API
  var Registry = {

    // Module management
    register: function(name, module) {
      modules[name] = module;
      Utils.Logger.debug('GlobalRegistry', 'Registered module: ' + name);
    },

    get: function(name) {
      if (!modules[name]) {
        Utils.Logger.warn('GlobalRegistry', 'Module not found: ' + name);
        return null;
      }
      return modules[name];
    },

    has: function(name) {
      return modules[name] !== undefined;
    },

    getAllModules: function() {
      return Utils.Helpers.parseJSON(Utils.Helpers.stringifyJSON(modules));
    },

    // State management
    getState: function() {
      return Utils.Helpers.parseJSON(Utils.Helpers.stringifyJSON(state));
    },

    setState: function(key, value) {
      var oldValue = state[key];
      state[key] = value;

      // Update global variables for compatibility
      this.syncGlobalVars();

      Utils.Logger.debug('GlobalRegistry', 'State changed: ' + key + ' = ' + value + ' (was: ' + oldValue + ')');
    },

    updateState: function(updates) {
      var changes = [];
      for (var key in updates) {
        if (state[key] !== updates[key]) {
          changes.push(key + ': ' + state[key] + ' -> ' + updates[key]);
          state[key] = updates[key];
        }
      }

      if (changes.length > 0) {
        Utils.Logger.debug('GlobalRegistry', 'State updated: ' + changes.join(', '));
      }

      this.syncGlobalVars();
    },

    // Configuration management
    getConfig: function() {
      if (!config) {
        config = Utils.Config.load();
        Utils.Config.validate(config);
        Utils.Logger.info('GlobalRegistry', 'Configuration loaded and validated');
      }
      return config;
    },

    // Update mimetype for MediaRecorder compatibility
    updateMimetype: function() {
      if (typeof window.getMobileOperatingSystem === 'function') {
        window.getMobileOperatingSystem();
      }
    },

    // Global variable synchronization
    syncGlobalVars: function() {
      // Sync state to global variables for backward compatibility
      globalVars.isRecording = state.isRecording;
      globalVars.isConversationActive = state.isConversationActive;
      globalVars.shouldActuallyStop = state.shouldActuallyStop;
      globalVars.conversationStartTime = state.conversationStartTime;
      globalVars.segmentStartTime = state.segmentStartTime;

      // Copy to window object
      for (var key in globalVars) {
        window[key] = globalVars[key];
      }
    },

    // Initialization
    initialize: function() {
      Utils.Logger.info('GlobalRegistry', 'Initializing global registry');

      // Set start time
      state.loadTime = performance.now();

      // Load and validate configuration
      config = Utils.Config.load();
      Utils.Config.validate(config);

      // Mimetype is already initialized in qualtrics-question-js.js

      // Initialize global variables
      this.syncGlobalVars();

      Utils.Logger.info('GlobalRegistry', 'Global registry initialized successfully');
    },

    // Cleanup
    cleanup: function() {
      Utils.Logger.info('GlobalRegistry', 'Cleaning up global registry');

      // Clear modules
      modules = {};

      // Reset state
      state = {
        isRecording: false,
        isConversationActive: false,
        shouldActuallyStop: false,
        conversationStartTime: null,
        segmentStartTime: null,
        currentQuestion: '',
        isProcessingAI: false,
        hasError: false,
        errorMessage: '',
        loadTime: 0,
        recordingCount: 0
      };

      // Reset global variables
      globalVars = {
        isRecording: false,
        global_transcript: '',
        defaultThumbnail: 'https://d2kltgp8v5sml0.cloudfront.net/templates/svg/gallary.svg',
        streamTime: '',
        recorderObjectGlobal: null,
        isBackTOcamera: false,
        intervalID: null,
        ws: null,
        mediaRecorder: null,
        stream: null,
        S3_BASE_URL: 'https://s3.us-east-1.amazonaws.com/com.knit.pipe-recorder-videos/',
        mimetype: 'audio/webm', // Default mimetype for MediaRecorder
        isConversationActive: false,
        shouldActuallyStop: false,
        conversationManager: null,
        aiService: null,
        accumulatedTranscript: '',
        currentSegmentTranscript: '',
        fakeStopButtonActive: false,
        originalStopHandler: null,
        conversationStartTime: null,
        segmentStartTime: null
      };

      // Sync to window
      this.syncGlobalVars();

      Utils.Logger.info('GlobalRegistry', 'Global registry cleanup complete');
    },

    // Performance monitoring
    getPerformanceMetrics: function() {
      var now = performance.now();
      return {
        loadTime: state.loadTime,
        uptime: now - state.loadTime,
        recordingCount: state.recordingCount,
        memoryUsage: this.getMemoryUsage()
      };
    },

    getMemoryUsage: function() {
      if (performance.memory) {
        return {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        };
      }
      return null;
    }
  };

  // Export registry
  return Registry;

})();


// === state-manager.js (179 lines) ===
// State Manager - Single source of truth for application state
// No template literals used - only string concatenation

var StateManager = (function() {

  var Utils = window.Utils;
  var GlobalRegistry = window.GlobalRegistry;

  // State constants
  var STATES = {
    INITIALIZING: 'initializing',
    READY: 'ready',
    RECORDING: 'recording',
    PROCESSING: 'processing',
    CONVERSATION_ACTIVE: 'conversation_active',
    ERROR: 'error',
    COMPLETE: 'complete'
  };

  // Current state
  var currentState = STATES.INITIALIZING;

  // State history for debugging
  var stateHistory = [];

  // State Manager API
  var StateManager = {

    // Get current state
    getState: function() {
      return {
        current: currentState,
        history: stateHistory.slice(),
        timestamp: new Date().toISOString()
      };
    },

    // Get state constants
    getStates: function() {
      return STATES;
    },

    // Transition to new state
    transition: function(newState, data) {
      var oldState = currentState;
      currentState = newState;

      // Record transition
      stateHistory.push({
        from: oldState,
        to: newState,
        timestamp: new Date().toISOString(),
        data: data || null
      });

      // Keep only last 50 transitions to prevent memory leaks
      if (stateHistory.length > 50) {
        stateHistory = stateHistory.slice(-50);
      }

      Utils.Logger.info('StateManager', 'State transition: ' + oldState + ' -> ' + newState);

      // Update global registry
      GlobalRegistry.updateState(this.getStateFlags());

      // Trigger state change handlers
      this.notifyStateChange(oldState, newState, data);

      return true;
    },

    // Get state flags for global registry
    getStateFlags: function() {
      return {
        isRecording: currentState === STATES.RECORDING,
        isConversationActive: currentState === STATES.CONVERSATION_ACTIVE,
        shouldActuallyStop: currentState === STATES.COMPLETE,
        isProcessingAI: currentState === STATES.PROCESSING,
        hasError: currentState === STATES.ERROR
      };
    },

    // State change notification system
    notifyStateChange: function(oldState, newState, data) {
      // Notify modules that care about state changes
      var modules = GlobalRegistry.getAllModules();
      for (var moduleName in modules) {
        var module = modules[moduleName];
        if (module && typeof module.onStateChange === 'function') {
          try {
            module.onStateChange(oldState, newState, data);
          } catch (error) {
            Utils.Logger.error('StateManager', 'State change notification failed for ' + moduleName, error);
          }
        }
      }
    },

    // Convenience methods for common transitions
    setInitializing: function() {
      return this.transition(STATES.INITIALIZING);
    },

    setReady: function() {
      return this.transition(STATES.READY);
    },

    setRecording: function() {
      GlobalRegistry.setState('recordingCount', GlobalRegistry.getState().recordingCount + 1);
      return this.transition(STATES.RECORDING);
    },

    setProcessing: function() {
      return this.transition(STATES.PROCESSING);
    },

    setConversationActive: function() {
      GlobalRegistry.setState('conversationStartTime', performance.now());
      return this.transition(STATES.CONVERSATION_ACTIVE);
    },

    setError: function(errorMessage) {
      GlobalRegistry.setState('errorMessage', errorMessage);
      return this.transition(STATES.ERROR, { error: errorMessage });
    },

    setComplete: function() {
      return this.transition(STATES.COMPLETE);
    },

    // Check if in specific state
    isInState: function(state) {
      return currentState === state;
    },

    isRecording: function() {
      return currentState === STATES.RECORDING;
    },

    isProcessing: function() {
      return currentState === STATES.PROCESSING;
    },

    isConversationActive: function() {
      return currentState === STATES.CONVERSATION_ACTIVE;
    },

    hasError: function() {
      return currentState === STATES.ERROR;
    },

    // Reset state (for testing or recovery)
    reset: function() {
      currentState = STATES.INITIALIZING;
      stateHistory = [];
      Utils.Logger.info('StateManager', 'State reset to initial');
    },

    // Get performance metrics
    getMetrics: function() {
      var now = performance.now();
      var registryState = GlobalRegistry.getState();

      return {
        currentState: currentState,
        stateHistoryLength: stateHistory.length,
        uptime: now - registryState.loadTime,
        recordingCount: registryState.recordingCount,
        conversationDuration: registryState.conversationStartTime ?
          (now - registryState.conversationStartTime) / 1000 : 0
      };
    }
  };

  // Export StateManager
  return StateManager;

})();


// === event-handler.js (207 lines) ===
// Event Handler - Unified click event management and interception
// No template literals used - only string concatenation

var EventHandler = (function() {

  var Utils = window.Utils;
  var GlobalRegistry = window.GlobalRegistry;
  var StateManager = window.StateManager;

  // Event handler storage
  var handlers = {};
  var capturePhaseHandler = null;

  // Event Handler API
  var EventHandler = {

    // Initialize event system
    initialize: function() {
      Utils.Logger.info('EventHandler', 'Initializing event handler system');

      // Set up capture phase handler for AddPipe button interception
      this.setupCapturePhaseHandler();

      Utils.Logger.info('EventHandler', 'Event handler system initialized');
    },

    // Set up capture phase handler (executes before AddPipe handlers)
    setupCapturePhaseHandler: function() {
      if (capturePhaseHandler) {
        document.removeEventListener('click', capturePhaseHandler, true);
      }

      capturePhaseHandler = Utils.ErrorBoundary('EventHandler', function(e) {
        // ROBUST AddPipe button detection - multiple strategies
        var isAddPipeButton = EventHandler.isAddPipeButton(e.target);
        
        if (!isAddPipeButton) {
          return; // Not an AddPipe button, ignore
        }

        Utils.Logger.info('EventHandler', 'CAPTURE PHASE: AddPipe button click detected');
        Utils.Logger.debug('EventHandler', 'Target element: ' + (e.target.id || e.target.className || e.target.tagName));
        Utils.Logger.debug('EventHandler', 'Conversation active: ' + StateManager.isConversationActive());

        // CRITICAL: Always intercept AddPipe buttons during conversations
        if (StateManager.isConversationActive()) {
          Utils.Logger.info('EventHandler', 'INTERCEPTING: Blocking AddPipe button during active conversation');
          
          // TRIPLE-STOP propagation for maximum effectiveness
          e.preventDefault();           // Prevent default action
          e.stopPropagation();         // Stop bubble phase
          e.stopImmediatePropagation(); // Stop ALL remaining handlers
          
          // IMPROVED: Determine click type using button title (most reliable)
          var targetButton = EventHandler.findAddPipeButton(e.target);
          var buttonTitle = targetButton ? targetButton.title : '';
          var isCurrentlyRecording = (buttonTitle === 'stop');
          
          // DEBUG: Log detection details
          Utils.Logger.info('EventHandler', '🔍 DETECTION DEBUG:');
          Utils.Logger.info('EventHandler', '  Button found: ' + !!targetButton);
          Utils.Logger.info('EventHandler', '  Button title: "' + buttonTitle + '"');
          Utils.Logger.info('EventHandler', '  Detected as: ' + (isCurrentlyRecording ? 'STOP' : 'RECORD') + ' click');
          
          // Additional debug info for validation
          if (targetButton) {
            Utils.Logger.debug('EventHandler', '  Button ID: ' + targetButton.id);
            Utils.Logger.debug('EventHandler', '  Button classes: ' + targetButton.className);
          }
          
          if (isCurrentlyRecording) {
            Utils.Logger.info('EventHandler', '✅ FAKE STOP: Handling stop click via conversation manager');
            EventHandler.handleInterceptedStopClick();
          } else {
            Utils.Logger.info('EventHandler', '✅ FAKE RECORD: Handling record click via conversation manager');
            EventHandler.handleInterceptedRecordClick();
          }
          
          return false; // Ensure no further processing
        }

        // No active conversation - allow AddPipe to handle normally
        Utils.Logger.debug('EventHandler', 'ALLOWING: No active conversation, AddPipe can handle normally');
      });

      // Attach in CAPTURE PHASE (executes before bubble phase handlers)
      document.addEventListener('click', capturePhaseHandler, true);

      Utils.Logger.info('EventHandler', 'DOM capture phase handler attached - ready to intercept AddPipe');
    },

    // Robust AddPipe button detection with multiple strategies
    isAddPipeButton: function(target) {
      return !!this.findAddPipeButton(target);
    },

    // Find the actual AddPipe button element (returns the button, not just boolean)
    findAddPipeButton: function(target) {
      if (!target) return null;
      
      // Strategy 1: Direct ID match
      if (target.id && target.id.includes('pipeRec-')) {
        Utils.Logger.debug('EventHandler', 'Button found via direct ID: ' + target.id);
        return target;
      }
      
      // Strategy 2: Parent element search (for child elements like SVG icons)
      var parentButton = target.closest('[id*="pipeRec-"]');
      if (parentButton) {
        Utils.Logger.debug('EventHandler', 'Button found via parent search: ' + parentButton.id);
        return parentButton;
      }
      
      // Strategy 3: Class-based detection
      if (target.classList && target.classList.contains('pipeBtn')) {
        Utils.Logger.debug('EventHandler', 'Button found via pipeBtn class');
        return target;
      }
      
      // Strategy 4: SVG icon clicks (common in AddPipe buttons)
      if (target.tagName === 'svg' || target.tagName === 'SVG') {
        var svgParent = target.closest('[id*="pipeRec-"], .pipeBtn');
        if (svgParent) {
          Utils.Logger.debug('EventHandler', 'Button found via SVG parent: ' + (svgParent.id || svgParent.className));
          return svgParent;
        }
      }
      
      return null;
    },

    // Handle intercepted stop click
    handleInterceptedStopClick: function() {
      Utils.Logger.info('EventHandler', 'Processing intercepted STOP click');
      
      try {
        var conversationManager = GlobalRegistry.get('conversationManager');
        if (conversationManager && conversationManager.pauseForAIProcessing) {
          conversationManager.pauseForAIProcessing();
          Utils.Logger.info('EventHandler', 'Successfully triggered fake stop via conversation manager');
        } else {
          Utils.Logger.error('EventHandler', 'Conversation manager not available for intercepted stop');
        }
      } catch (error) {
        Utils.Logger.error('EventHandler', 'Error handling intercepted stop click', error);
      }
    },

    // Handle intercepted record click  
    handleInterceptedRecordClick: function() {
      Utils.Logger.info('EventHandler', 'Processing intercepted RECORD click');
      
      try {
        var conversationManager = GlobalRegistry.get('conversationManager');
        if (conversationManager && conversationManager.startNewSegment) {
          conversationManager.startNewSegment();
          Utils.Logger.info('EventHandler', 'Successfully triggered fake record via conversation manager');
        } else {
          Utils.Logger.error('EventHandler', 'Conversation manager not available for intercepted record');
        }
      } catch (error) {
        Utils.Logger.error('EventHandler', 'Error handling intercepted record click', error);
      }
    },


    // Clean up event handlers
    cleanup: function() {
      Utils.Logger.info('EventHandler', 'Cleaning up event handlers');

      // Remove capture phase handler
      if (capturePhaseHandler) {
        document.removeEventListener('click', capturePhaseHandler, true);
        capturePhaseHandler = null;
      }

      // Clear handler storage
      handlers = {};

      Utils.Logger.info('EventHandler', 'Event handler cleanup complete');
    },

    // State change handler
    onStateChange: function(oldState, newState, data) {
      Utils.Logger.debug('EventHandler', 'State change: ' + oldState + ' -> ' + newState);

      // Re-setup handlers when conversation becomes active
      if (newState === StateManager.getStates().CONVERSATION_ACTIVE) {
        this.setupCapturePhaseHandler();
      }
    },

    // Get event handler info for debugging
    getHandlerInfo: function() {
      return {
        capturePhaseAttached: !!capturePhaseHandler,
        handlerCount: Object.keys(handlers).length,
        activeConversation: StateManager.isConversationActive()
      };
    }
  };

  // Export EventHandler
  return EventHandler;

})();


// === element-controller.js (527 lines) ===
// Element Controller - DOM element management and UI state control
// No template literals used - only string concatenation

var ElementController = (function() {

  var Utils = window.Utils;
  var GlobalRegistry = window.GlobalRegistry;
  var StateManager = window.StateManager;

  // Element Controller API
  var ElementController = {

    // Initialize with question name
    initialize: function(questionName) {
      this.questionName = questionName;
      this.selectors = this.buildSelectors();
      this.elements = this.getElements();

      Utils.Logger.info('ElementController', 'Initialized for question: ' + questionName);
    },

    // Build element selectors
    buildSelectors: function() {
      var qn = this.questionName;
      return {
        recordButton: '#pipeRec-' + qn,
        nativePlayButton: '#pipePlay-' + qn,
        customPlayButton: '.play-custom-btn',
        timer: '.pipeTimer-custom',
        nativeTimer: '.pipeTimer',
        backButton: '.back-to-camera',
        menu: '#pipeMenu-' + qn,
        videoContainer: '#' + qn,
        nextButton: '#NextButton-custom'
      };
    },

    // Get DOM elements safely
    getElements: function() {
      var elements = {};
      for (var selectorName in this.selectors) {
        var selector = this.selectors[selectorName];
        elements[selectorName] = Utils.DOM.select(selector);
      }
      return elements;
    },

    // Refresh element cache (for when DOM changes after initialization)
    refreshElements: function() {
      Utils.Logger.debug('ElementController', 'Refreshing element cache');
      this.elements = this.getElements();
      
      // Log what we found
      for (var selectorName in this.elements) {
        var element = this.elements[selectorName];
        var exists = element && element.length > 0;
        Utils.Logger.debug('ElementController', 'Element ' + selectorName + ': ' + (exists ? 'found' : 'not found'));
      }
      
      Utils.Logger.info('ElementController', 'Element cache refreshed');
    },

    // Element visibility management
    showElement: function(selectorName) {
      var element = this.elements[selectorName];
      if (element && element.length > 0) {
        element.show().css('opacity', '1');
        Utils.Logger.debug('ElementController', 'Showed element: ' + selectorName);
      }
    },

    hideElement: function(selectorName) {
      var element = this.elements[selectorName];
      if (element && element.length > 0) {
        element.hide();
        Utils.Logger.debug('ElementController', 'Hid element: ' + selectorName);
      }
    },

    removeElement: function(selectorName) {
      var element = this.elements[selectorName];
      if (element && element.length > 0) {
        element.remove();
        Utils.Logger.debug('ElementController', 'Removed element: ' + selectorName);
      }
    },

    // Force hide with aggressive styling
    forceHideElement: function(selectorName) {
      var element = this.elements[selectorName];
      if (element && element.length > 0) {
        element.attr('style', 'display: none !important; opacity: 0 !important;');
        Utils.Logger.debug('ElementController', 'Force hid element: ' + selectorName);
      }
    },

    // UI State Management Methods
    getCurrentState: function() {
      var menu = this.elements.menu;
      if (!menu || menu.length === 0) {
        return 'unknown';
      }

      if (menu.hasClass('recording-state')) {
        return 'recording';
      } else if (menu.hasClass('playback-state')) {
        return 'playback';
      } else if (menu.hasClass('ai-processing-state')) {
        return 'processing';
      } else {
        return 'ready';
      }
    },

    setReadyToRecordState: function() {
      Utils.Logger.info('ElementController', 'Setting ready-to-record state');

      this.showElement('recordButton');
      this.forceHideElement('nativePlayButton');
      this.removeElement('customPlayButton');
      this.removeElement('backButton');
      this.hideElement('timer');
      this.hideElement('nativeTimer');

      // Ensure we have fresh element references
      var menu = this.elements.menu;
      if (!menu || menu.length === 0) {
        Utils.Logger.warn('ElementController', 'Menu element not found, refreshing cache');
        this.refreshElements();
        menu = this.elements.menu;
      }

      if (menu && menu.length > 0) {
        menu.removeClass('playback-state recording-state ai-processing-state').addClass('ready-state');
        Utils.Logger.debug('ElementController', 'Added ready-state class to menu');
      }

      this.updateButtonState('record');
    },

    setReadyToRecordWithVideoState: function() {
      Utils.Logger.info('ElementController', 'Setting ready-to-record-with-video state');

      this.setReadyToRecordState();

      // Add custom play button for existing video
      var menu = this.elements.menu;
      if (menu && menu.length > 0) {
        var playButton = Utils.DOM.create('button', {
          'class': 'play-custom-btn',
          'id': 'time-span',
          'onclick': 'playVideoCustom()',
          'title': 'Preview existing recording'
        });

        var svg = Utils.DOM.create('svg', {
          'width': '16',
          'height': '16',
          'viewBox': '0 0 24 24',
          'fill': 'none',
          'stroke': 'currentColor',
          'stroke-width': '2',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        });

        var polygon = Utils.DOM.create('polygon', {
          'points': '5,3 19,12 5,21'
        });

        svg.append(polygon);
        playButton.append(svg);

        var span = Utils.DOM.create('span', {
          'style': 'font-size: 0.75rem; margin-top: 0.25rem;'
        });

        playButton.append(span);
        menu.append(playButton);
      }
    },

    setRecordingState: function() {
      Utils.Logger.info('ElementController', 'Setting recording state');

      // Ensure we have fresh element references
      var menu = this.elements.menu;
      if (!menu || menu.length === 0) {
        Utils.Logger.warn('ElementController', 'Menu element not found, refreshing cache');
        this.refreshElements();
        menu = this.elements.menu;
      }

      if (menu && menu.length > 0) {
        menu.removeClass('ready-state playback-state ai-processing-state').addClass('recording-state');
        Utils.Logger.debug('ElementController', 'Added recording-state class to menu');
      } else {
        Utils.Logger.error('ElementController', 'Still cannot find menu element after refresh');
      }

      this.updateButtonToStop();
    },

    setPlaybackState: function() {
      Utils.Logger.info('ElementController', 'Setting playback state');

      // Ensure we have fresh element references
      var menu = this.elements.menu;
      if (!menu || menu.length === 0) {
        Utils.Logger.warn('ElementController', 'Menu element not found, refreshing cache');
        this.refreshElements();
        menu = this.elements.menu;
      }

      if (menu && menu.length > 0) {
        menu.removeClass('recording-state ready-state ai-processing-state').addClass('playback-state');
        Utils.Logger.debug('ElementController', 'Added playback-state class to menu');
      }

      this.hideElement('recordButton');
      this.showElement('nativePlayButton');
    },

    // Button state management
    updateButtonState: function(state) {
      var button = this.elements.recordButton;
      if (!button || button.length === 0) return;

      if (state === 'record') {
        this.updateButtonToRecord();
      } else if (state === 'stop') {
        this.updateButtonToStop();
      }
    },

    updateButtonToRecord: function() {
      var button = this.elements.recordButton;
      if (!button || button.length === 0) return;

      // Remove all state classes
      button.removeClass('pipeRecStop pipeRecRec');

      // Set record button appearance
      var svgHtml = '<svg style="enable-background:new 0 0 16 16;" version="1.1" width="30" height="30" viewBox="0 0 100 100" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<circle cx="50" cy="50" r="30" fill="red"></circle>' +
        '<circle cx="50" cy="50" r="40" stroke="black" stroke-width="8" fill="none"></circle>' +
        '</svg>';

      button.html(svgHtml);
      button.attr('title', 'record');
      button.removeClass('pipeBtn').addClass('pipeBtn');

      // Force visibility
      button.css({
        'display': 'block',
        'visibility': 'visible',
        'opacity': '1',
        'pointer-events': 'auto'
      }).prop('disabled', false).show();

      Utils.Logger.debug('ElementController', 'Button updated to record state');
    },

    updateButtonToStop: function() {
      var button = this.elements.recordButton;
      if (!button || button.length === 0) return;

      // Change button appearance to stop
      button.removeClass('pipeRecRec').addClass('pipeRecStop');
      button.find('svg').remove();

      var stopSvgHtml = '<svg style="enable-background:new 0 0 16 16;" version="1.1" width="30" height="30" viewBox="0 0 100 100" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<rect x="25" y="25" width="50" height="50" fill="red"></rect>' +
        '</svg>';

      button.html(stopSvgHtml);
      button.attr('title', 'stop');

      Utils.Logger.debug('ElementController', 'Button updated to stop state');
    },

    // Timer management
    startTimer: function() {
      var menu = this.elements.menu;
      if (!menu || menu.length === 0) return;

      // Add timer if not exists
      if (Utils.DOM.select('.pipeTimer-custom').length === 0) {
        var timerDiv = Utils.DOM.create('div', {
          'class': 'pipeTimer-custom'
        }, '00:00');
        menu.append(timerDiv);
      }

      this.showElement('timer');
      Utils.Logger.debug('ElementController', 'Timer started');
    },

    updateTimer: function(timeString) {
      var timer = Utils.DOM.select('.pipeTimer-custom');
      if (timer && timer.length > 0) {
        timer.text(timeString);
      }
    },

    stopTimer: function() {
      this.hideElement('timer');
      Utils.Logger.debug('ElementController', 'Timer stopped');
    },

    // Question display management
    showQuestion: function(question) {
      var titleElement = Utils.DOM.select('#dynamic-question-title');
      var descElement = Utils.DOM.select('#dynamic-question-description');

      if (titleElement && titleElement.length > 0) {
        titleElement.fadeOut(200, function() {
          titleElement.text(question).fadeIn(200);
        });
      }

      if (descElement && descElement.length > 0) {
        descElement.text('Click record when ready to respond.');
      }

      Utils.Logger.debug('ElementController', 'Question updated: ' + question);
    },

    // Processing state management
    showProcessingState: function() {
      // Ensure we have fresh element references
      var menu = this.elements.menu;
      if (!menu || menu.length === 0) {
        Utils.Logger.warn('ElementController', 'Menu element not found, refreshing cache');
        this.refreshElements();
        menu = this.elements.menu;
      }
      
      if (!menu || menu.length === 0) {
        Utils.Logger.error('ElementController', 'Still cannot find menu element for processing state');
        return;
      }

      var overlay = Utils.DOM.create('div', {
        'class': 'ai-processing-overlay'
      });

      var content = Utils.DOM.create('div', {
        'class': 'ai-thinking-content'
      });

      var spinner = Utils.DOM.create('div', {
        'class': 'ai-thinking-spinner'
      });

      var title = Utils.DOM.create('h3', {}, 'AI is thinking...');
      var subtitle = Utils.DOM.create('p', {}, 'Analyzing your response and preparing a follow-up question');

      content.append(spinner);
      content.append(title);
      content.append(subtitle);
      overlay.append(content);
      menu.append(overlay);

      menu.addClass('ai-processing-state');

      var descElement = Utils.DOM.select('#dynamic-question-description');
      if (descElement && descElement.length > 0) {
        descElement.text('Please wait while AI processes your response...');
      }

      Utils.Logger.info('ElementController', 'Processing state shown');
    },

    hideProcessingState: function() {
      Utils.DOM.select('.ai-processing-overlay').fadeOut(300, function() {
        Utils.DOM.select(this).remove();
      });

      var menu = this.elements.menu;
      if (menu && menu.length > 0) {
        menu.removeClass('ai-processing-state');
      }

      Utils.Logger.info('ElementController', 'Processing state hidden');
    },

    // Modal management
    showPermissionsModal: function() {
      Utils.DOM.select('#permission').modal({
        escapeClose: false,
        clickClose: false,
        showClose: false
      });
    },

    showInstructionsModal: function() {
      Utils.DOM.select('#recordInstruction').modal();
    },

    showSuccessModal: function(metadata) {
      var title = Utils.DOM.select('#record-title');
      var image = Utils.DOM.select('#image-sucess');
      var result = Utils.DOM.select('#result');

      title.empty();
      image.empty();
      result.empty();

      if (metadata && metadata.segments && metadata.segments.length > 0) {
        // Conversation success
        title.append('Interview Completed Successfully!');

        var totalQuestions = metadata.segments.length;
        var duration = metadata.totalDuration;
        var minutes = Math.floor(duration / 60);
        var seconds = Math.round(duration % 60);

        var successMessage = 'Great job! You answered ' + totalQuestions + ' question' +
          (totalQuestions > 1 ? 's' : '') + ' in ' + minutes + ':' +
          (seconds < 10 ? '0' : '') + seconds + '. Thank you for your thoughtful responses!';

        result.addClass('success-feedback').append(successMessage);
      } else {
        // Regular recording success
        title.append('Perfect! Video Recorded Successfully');
        var regularMessage = 'Your video response has been recorded successfully! You can now continue to the next question.';
        result.addClass('success-feedback').append(regularMessage);
      }

      // Add success icon
      var successIcon = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: hsl(var(--success));"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>';
      image.append(successIcon);

      // Show modal buttons
      Utils.DOM.select('#modal-buttons').show();

      Utils.DOM.select('#error').modal({
        escapeClose: true,
        clickClose: true,
        showClose: true,
        onClose: function() {
          Utils.DOM.select('#modal-buttons').hide();
          ElementController.setReadyToRecordWithVideoState();
        }
      });

      Utils.Logger.info('ElementController', 'Success modal shown');
    },

    showErrorModal: function(errorMessage) {
      var title = Utils.DOM.select('#record-title');
      var image = Utils.DOM.select('#image-sucess');
      var result = Utils.DOM.select('#result');

      title.empty();
      image.empty();
      result.empty();

      title.append('Recording needs improvement');

      var errorIcon = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: hsl(var(--destructive));"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
      image.append(errorIcon);

      result.addClass('error-feedback');
      result.append('<li style="font-size:15px;padding-left:5px;">Your video didn\'t meet our requirements</li>');
      result.append('<li style="font-size:15px;padding-left:5px;">' + errorMessage + '</li>');

      var retryButton = '<button class="btn btn-destructive" onClick="modalRetake()" style="margin-top: 1rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>Try Again</button>';
      result.append(retryButton);

      Utils.DOM.select('#error').modal({
        escapeClose: false,
        clickClose: false,
        showClose: false
      });

      Utils.Logger.info('ElementController', 'Error modal shown');
    },

    // State change handler
    onStateChange: function(oldState, newState, data) {
      Utils.Logger.debug('ElementController', 'State change: ' + oldState + ' -> ' + newState);

      switch (newState) {
        case StateManager.getStates().READY:
          this.setReadyToRecordState();
          break;
        case StateManager.getStates().RECORDING:
          this.setRecordingState();
          this.startTimer();
          break;
        case StateManager.getStates().PROCESSING:
          this.showProcessingState();
          break;
        case StateManager.getStates().CONVERSATION_ACTIVE:
          // Handled by conversation manager
          break;
        case StateManager.getStates().COMPLETE:
          // Success modal handled by recording service
          break;
        case StateManager.getStates().ERROR:
          if (data && data.error) {
            this.showErrorModal(data.error);
          }
          break;
      }
    },

    // Cleanup
    cleanup: function() {
      Utils.Logger.info('ElementController', 'Cleaning up element controller');

      // Remove any dynamic elements
      this.removeElement('customPlayButton');
      this.removeElement('backButton');
      Utils.DOM.select('.ai-processing-overlay').remove();

      Utils.Logger.info('ElementController', 'Element controller cleanup complete');
    }
  };

  // Export ElementController
  return ElementController;

})();


// === timer-manager.js (183 lines) ===
// Timer Manager - Timer display and management
// No template literals used - only string concatenation

var TimerManager = (function() {

  var Utils = window.Utils;
  var GlobalRegistry = window.GlobalRegistry;
  var StateManager = window.StateManager;

  var intervalId = null;
  var startTime = 0;
  var pausedTime = 0;
  var isPaused = false;

  // Timer Manager API
  var TimerManager = {

    // Initialize timer
    initialize: function() {
      Utils.Logger.info('TimerManager', 'Timer manager initialized');
    },

    // Start the timer
    start: function() {
      if (intervalId) {
        Utils.Logger.debug('TimerManager', 'Stopping existing timer before starting new one');
        this.stop();
      }

      startTime = performance.now();
      isPaused = false;
      pausedTime = 0;

      intervalId = setInterval(function() {
        TimerManager.update();
      }, 1000);

      Utils.Logger.info('TimerManager', 'Timer started - startTime: ' + startTime + ', intervalId: ' + intervalId);
      Utils.Logger.debug('TimerManager', 'Timer state after start: ' + JSON.stringify(TimerManager.getState()));
    },

    // Stop the timer
    stop: function() {
      Utils.Logger.debug('TimerManager', 'Stop called - current intervalId: ' + intervalId);
      
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      isPaused = false;
      pausedTime = 0;

      Utils.Logger.info('TimerManager', 'Timer stopped');
      Utils.Logger.debug('TimerManager', 'Timer state after stop: ' + JSON.stringify(TimerManager.getState()));
    },

    // Pause the timer
    pause: function() {
      if (intervalId && !isPaused) {
        pausedTime = this.getCurrentTime();
        isPaused = true;
        Utils.Logger.info('TimerManager', 'Timer paused at: ' + pausedTime);
      }
    },

    // Resume the timer
    resume: function() {
      if (isPaused) {
        startTime = performance.now() - (pausedTime * 1000);
        isPaused = false;
        pausedTime = 0;
        Utils.Logger.info('TimerManager', 'Timer resumed');
      }
    },

    // Get current time in seconds
    getCurrentTime: function() {
      if (isPaused) {
        return pausedTime;
      }

      if (!startTime) {
        return 0;
      }

      return (performance.now() - startTime) / 1000;
    },

    // Update timer display
    update: function() {
      var currentTime = this.getCurrentTime();
      var timeString = Utils.Helpers.formatTime(currentTime);

      // Update element controller
      var elementController = GlobalRegistry.get('elementController');
      if (elementController) {
        elementController.updateTimer(timeString);
      }

      // Update global registry
      GlobalRegistry.setState('currentTime', currentTime);

      Utils.Logger.debug('TimerManager', 'Timer updated: ' + timeString);
    },

    // Reset timer
    reset: function() {
      this.stop();
      startTime = 0;
      pausedTime = 0;
      isPaused = false;

      // Clear display
      var elementController = GlobalRegistry.get('elementController');
      if (elementController) {
        elementController.updateTimer('00:00');
      }

      Utils.Logger.info('TimerManager', 'Timer reset');
    },

    // Check if timer is running
    isRunning: function() {
      var running = !!intervalId && !isPaused && startTime > 0;
      Utils.Logger.debug('TimerManager', 'isRunning check - intervalId: ' + !!intervalId + ', isPaused: ' + isPaused + ', startTime: ' + startTime + ', result: ' + running);
      return running;
    },

    // Get timer state for debugging
    getState: function() {
      return {
        isRunning: !!intervalId,
        isPaused: isPaused,
        currentTime: this.getCurrentTime(),
        startTime: startTime,
        pausedTime: pausedTime
      };
    },

    // State change handler
    onStateChange: function(oldState, newState, data) {
      Utils.Logger.debug('TimerManager', 'State change: ' + oldState + ' -> ' + newState);

      switch (newState) {
        case StateManager.getStates().RECORDING:
          this.start();
          break;

        case StateManager.getStates().PROCESSING:
          this.pause();
          break;

        case StateManager.getStates().CONVERSATION_ACTIVE:
          // Resume timer for new segment if we're in conversation
          if (StateManager.isConversationActive()) {
            this.resume();
          }
          break;

        case StateManager.getStates().READY:
        case StateManager.getStates().COMPLETE:
          this.stop();
          break;

        case StateManager.getStates().ERROR:
          this.stop();
          break;
      }
    },

    // Cleanup
    cleanup: function() {
      this.stop();
      Utils.Logger.info('TimerManager', 'Timer manager cleanup complete');
    }
  };

  // Export TimerManager
  return TimerManager;

})();


// === modal-manager.js (231 lines) ===
// Modal Manager - Modal dialog management and flow control
// No template literals used - only string concatenation

var ModalManager = (function() {

  var Utils = window.Utils;
  var GlobalRegistry = window.GlobalRegistry;
  var StateManager = window.StateManager;

  // Modal Manager API
  var ModalManager = {

    // Initialize modal manager
    initialize: function() {
      Utils.Logger.info('ModalManager', 'Modal manager initialized');
    },

    // Show permissions modal
    showPermissions: function() {
      Utils.Logger.info('ModalManager', 'Showing permissions modal');

      var permissionsModal = Utils.DOM.select('#permission');
      if (permissionsModal.length === 0) {
        Utils.Logger.error('ModalManager', 'Permissions modal not found');
        return;
      }

      permissionsModal.modal({
        escapeClose: false,
        clickClose: false,
        showClose: false
      });
    },

    // Show instructions modal
    showInstructions: function() {
      Utils.Logger.info('ModalManager', 'Showing instructions modal');

      var instructionsModal = Utils.DOM.select('#recordInstruction');
      if (instructionsModal.length === 0) {
        Utils.Logger.error('ModalManager', 'Instructions modal not found');
        return;
      }

      instructionsModal.modal();
    },

    // Show success modal
    showSuccess: function(metadata) {
      Utils.Logger.info('ModalManager', 'Showing success modal');

      var errorModal = Utils.DOM.select('#error');
      if (errorModal.length === 0) {
        Utils.Logger.error('ModalManager', 'Error modal not found for success display');
        return;
      }

      // Clear modal content
      Utils.DOM.select('#record-title').empty();
      Utils.DOM.select('#image-sucess').empty();
      Utils.DOM.select('#result').empty();

      // Set up success content
      if (metadata && metadata.segments && metadata.segments.length > 0) {
        // Conversation success
        this.setupConversationSuccess(metadata);
      } else {
        // Regular recording success
        this.setupRegularSuccess();
      }

      // Add success icon
      var successIcon = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: hsl(var(--success));"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>';
      Utils.DOM.select('#image-sucess').append(successIcon);

      // Show modal buttons
      Utils.DOM.select('#modal-buttons').show();

      // Show modal with close handler
      errorModal.modal({
        escapeClose: true,
        clickClose: true,
        showClose: true,
        onClose: function() {
          Utils.DOM.select('#modal-buttons').hide();
          var elementController = GlobalRegistry.get('elementController');
          if (elementController) {
            elementController.setReadyToRecordWithVideoState();
          }
        }
      });
    },

    // Set up conversation success modal
    setupConversationSuccess: function(metadata) {
      var title = Utils.DOM.select('#record-title');
      var result = Utils.DOM.select('#result');

      title.append('Interview Completed Successfully!');

      var totalQuestions = metadata.segments.length;
      var duration = metadata.totalDuration;
      var minutes = Math.floor(duration / 60);
      var seconds = Math.round(duration % 60);

      var successMessage = 'Great job! You answered ' + totalQuestions + ' question' +
        (totalQuestions > 1 ? 's' : '') + ' in ' + minutes + ':' +
        (seconds < 10 ? '0' : '') + seconds + '. Thank you for your thoughtful responses!';

      result.addClass('success-feedback').append(successMessage);

      Utils.Logger.info('ModalManager', 'Conversation success modal configured');
    },

    // Set up regular recording success modal
    setupRegularSuccess: function() {
      var title = Utils.DOM.select('#record-title');
      var result = Utils.DOM.select('#result');

      title.append('Perfect! Video Recorded Successfully');
      var regularMessage = 'Your video response has been recorded successfully! You can now continue to the next question.';
      result.addClass('success-feedback').append(regularMessage);

      Utils.Logger.info('ModalManager', 'Regular success modal configured');
    },

    // Show error modal
    showError: function(errorMessage) {
      Utils.Logger.info('ModalManager', 'Showing error modal');

      var errorModal = Utils.DOM.select('#error');
      if (errorModal.length === 0) {
        Utils.Logger.error('ModalManager', 'Error modal not found');
        return;
      }

      // Clear modal content
      Utils.DOM.select('#record-title').empty();
      Utils.DOM.select('#image-sucess').empty();
      Utils.DOM.select('#result').empty();

      // Set up error content
      Utils.DOM.select('#record-title').append('Recording needs improvement');

      var errorIcon = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: hsl(var(--destructive));"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
      Utils.DOM.select('#image-sucess').append(errorIcon);

      var result = Utils.DOM.select('#result');
      result.addClass('error-feedback');
      result.append('<li style="font-size:15px;padding-left:5px;">Your video didn\'t meet our requirements</li>');
      result.append('<li style="font-size:15px;padding-left:5px;">' + errorMessage + '</li>');

      var retryButton = '<button class="btn btn-destructive" onClick="modalRetake()" style="margin-top: 1rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>Try Again</button>';
      result.append(retryButton);

      errorModal.modal({
        escapeClose: false,
        clickClose: false,
        showClose: false
      });

      Utils.Logger.info('ModalManager', 'Error modal shown');
    },

    // Close all modals
    closeAll: function() {
      Utils.Logger.info('ModalManager', 'Closing all modals');

      // Close any open modals
      jQuery.modal.close();

      // Hide modal buttons
      Utils.DOM.select('#modal-buttons').hide();
    },

    // Handle modal retake action
    handleRetake: function() {
      Utils.Logger.info('ModalManager', 'Processing modal retake');

      // Prevent retake during conversation
      if (StateManager.isConversationActive()) {
        Utils.Logger.warn('ModalManager', 'Cannot retake during active conversation');
        return;
      }

      // Hide modal buttons before closing
      Utils.DOM.select('#modal-buttons').hide();

      // Close the modal
      jQuery.modal.close();

      // Use element controller to set proper state
      var elementController = GlobalRegistry.get('elementController');
      if (elementController) {
        elementController.setReadyToRecordWithVideoState();
      }
    },

    // Handle modal close action
    handleClose: function() {
      Utils.Logger.info('ModalManager', 'Processing modal close');

      // Prevent close during conversation
      if (StateManager.isConversationActive()) {
        Utils.Logger.warn('ModalManager', 'Cannot close modal during active conversation');
        return;
      }

      jQuery.modal.close();
    },

    // State change handler
    onStateChange: function(oldState, newState, data) {
      Utils.Logger.debug('ModalManager', 'State change: ' + oldState + ' -> ' + newState);

      // Modal management is primarily driven by explicit calls
      // rather than state changes, so most logic is handled elsewhere
    },

    // Cleanup
    cleanup: function() {
      this.closeAll();
      Utils.Logger.info('ModalManager', 'Modal manager cleanup complete');
    }
  };

  // Export ModalManager
  return ModalManager;

})();


// === pipe-integration.js (450 lines) ===
// Pipe Integration - AddPipe SDK wrapper and integration
// No template literals used - only string concatenation

var PipeIntegration = (function() {

  var Utils = window.Utils;
  var GlobalRegistry = window.GlobalRegistry;
  var StateManager = window.StateManager;

  var recorderObject = null;
  var questionName = null;
  var pipeParams = null;
  var isInitialized = false;

  // Pipe Integration API
  var PipeIntegration = {

    // Initialize Pipe SDK
    initialize: function(qName, params) {
      return new Promise(function(resolve, reject) {
        Utils.Logger.info('PipeIntegration', 'Initializing Pipe SDK for: ' + qName);

        questionName = qName;
        pipeParams = params;

        // Check if PipeSDK is available
        if (typeof PipeSDK === 'undefined') {
          Utils.Logger.error('PipeIntegration', 'PipeSDK not loaded');
          reject(new Error('PipeSDK not available'));
          return;
        }

        // Insert Pipe recorder
        PipeSDK.insert(qName, params, function(recorder) {
          recorderObject = recorder;
          isInitialized = true;

          Utils.Logger.info('PipeIntegration', 'Pipe SDK initialized successfully');

          // Refresh ElementController cache now that AddPipe created DOM elements
          var elementController = GlobalRegistry.get('elementController');
          if (elementController && elementController.refreshElements) {
            elementController.refreshElements();
            Utils.Logger.info('PipeIntegration', 'ElementController cache refreshed after AddPipe load');
          }

          // Set up event handlers
          PipeIntegration.setupEventHandlers();

          resolve(recorder);
        });
      });
    },

    // Set up event handlers for Pipe SDK
    setupEventHandlers: function() {
      if (!recorderObject) {
        Utils.Logger.error('PipeIntegration', 'Cannot setup handlers - recorder not initialized');
        return;
      }

      Utils.Logger.info('PipeIntegration', 'Setting up Pipe SDK event handlers');

      // Handler for when recorder is ready to record
      recorderObject.onReadyToRecord = function(recorderId, recorderType) {
        Utils.Logger.info('PipeIntegration', 'Recorder ready to record');
        Utils.DOM.select('.pipeTimer').hide();
      };

      // Handler for when recording actually starts
      recorderObject.onRecordingStarted = function(recorderId) {
        Utils.Logger.info('PipeIntegration', '🔴 ADDPIPE RECORDING STARTED');
        Utils.Logger.info('PipeIntegration', '📹 Recording Details:');
        Utils.Logger.info('PipeIntegration', '  • Recorder ID: ' + recorderId);
        Utils.Logger.info('PipeIntegration', '  • Start Time: ' + new Date().toISOString());
        Utils.Logger.info('PipeIntegration', '  • This is the CONTINUOUS recording that will capture the entire conversation');
        
        StateManager.setRecording();
        
        // Start conversation and transcription for initial recording
        if (!StateManager.isConversationActive()) {
          Utils.Logger.info('PipeIntegration', 'Starting conversation and transcription for initial recording');
          
          var conversationManager = GlobalRegistry.get('conversationManager');
          if (conversationManager) {
            conversationManager.startConversation();
            StateManager.setConversationActive();
            Utils.Logger.info('PipeIntegration', 'Conversation started');
          }
          
          var transcriptionService = GlobalRegistry.get('transcriptionService');
          if (transcriptionService) {
            transcriptionService.startNewSegment();
            Utils.Logger.info('PipeIntegration', 'Transcription started for initial recording');
          }
        }
      };

      // Handler for record button pressed
      recorderObject.btRecordPressed = function(recorderId) {
        Utils.Logger.warn('PipeIntegration', 'AddPipe btRecordPressed executed despite DOM interception!');
        Utils.Logger.debug('PipeIntegration', 'This should rarely happen - DOM interception should block most clicks');
        
        if (StateManager.isConversationActive()) {
          Utils.Logger.error('PipeIntegration', 'LEAK: Record button reached AddPipe during active conversation');
          // DOM interception failed - don't allow AddPipe to proceed
          return;
        }

        Utils.Logger.info('PipeIntegration', '🎬 ADDPIPE RECORDING: Allowing initial AddPipe recording start (first time only)');
      };

      // Handler for stop recording button pressed - simplified (DOM interception handles most cases)
      recorderObject.btStopRecordingPressed = function(recorderId) {
        Utils.Logger.warn('PipeIntegration', 'AddPipe btStopRecordingPressed executed despite DOM interception!');
        Utils.Logger.debug('PipeIntegration', 'This should rarely happen - DOM interception should block most clicks');
        
        if (StateManager.isConversationActive()) {
          Utils.Logger.error('PipeIntegration', 'LEAK: Stop button reached AddPipe during active conversation');
          // DOM interception failed - don't allow AddPipe to proceed
          return;
        }

        // No active conversation - allow real stop
        Utils.Logger.info('PipeIntegration', '⏹️ ADDPIPE RECORDING STOPPED');
        Utils.Logger.info('PipeIntegration', '📹 Final Recording Details:');
        Utils.Logger.info('PipeIntegration', '  • Recorder ID: ' + recorderId);
        Utils.Logger.info('PipeIntegration', '  • Stop Time: ' + new Date().toISOString());
        Utils.Logger.info('PipeIntegration', '  • This was the CONTINUOUS recording for the entire conversation');
        Utils.Logger.info('PipeIntegration', '  • Recording will now be processed and uploaded to S3');

        // Clear recording timer
        var timerManager = GlobalRegistry.get('timerManager');
        if (timerManager) {
          timerManager.stop();
        }

        // Close WebSocket
        var transcriptionService = GlobalRegistry.get('transcriptionService');
        if (transcriptionService) {
          transcriptionService.stop();
        }

        // Call original stopped video handler
        if (typeof stoppedVideo === 'function') {
          stoppedVideo();
        }

        StateManager.setComplete();
      };

      // CRITICAL: Store original AddPipe stop method to prevent it during conversations
      var originalPipeStop = recorderObject.stop;
      recorderObject.stop = function() {
        Utils.Logger.info('PipeIntegration', 'DECISION POINT: AddPipe.stop() called internally');
        Utils.Logger.debug('PipeIntegration', 'Conversation active: ' + StateManager.isConversationActive());
        
        // NEW: Simplified - block ALL stops during conversation
        if (StateManager.isConversationActive()) {
          Utils.Logger.info('PipeIntegration', 'BLOCKED: AddPipe.stop() during active conversation');
          Utils.Logger.debug('PipeIntegration', 'Conversation must end before allowing real stop');
          return; // Always block, no exceptions
        }
        
        Utils.Logger.info('PipeIntegration', 'ALLOWED: AddPipe.stop() - no active conversation');
        return originalPipeStop.apply(this, arguments);
      };

      // Handler for playback complete event
      recorderObject.onPlaybackComplete = function(recorderId, recorderObject) {
        if (typeof playBackPauseEvent === 'function') {
          playBackPauseEvent(recorderId, recorderObject);
        }
      };

      // Handler for pause button pressed
      recorderObject.btPausePressed = function(recorderId) {
        if (typeof playBackPauseEvent === 'function') {
          playBackPauseEvent(recorderId, recorderObject);
        }
        if (typeof showGallary === 'function') {
          showGallary();
        }
      };

      // Handler for save ok event
      recorderObject.onSaveOk = function(
        recorderId,
        streamName,
        streamDuration,
        cameraName,
        micName,
        audioCodec,
        videoCodec,
        fileType,
        videoId,
        audioOnly,
        location
      ) {
        Utils.Logger.info('PipeIntegration', '💾 ADDPIPE RECORDING SAVED SUCCESSFULLY!');
        Utils.Logger.info('PipeIntegration', '🎯 Final Video Details:');
        Utils.Logger.info('PipeIntegration', '  • Stream Name: ' + streamName);
        Utils.Logger.info('PipeIntegration', '  • Duration: ' + streamDuration + ' seconds');
        Utils.Logger.info('PipeIntegration', '  • Camera: ' + cameraName);
        Utils.Logger.info('PipeIntegration', '  • Microphone: ' + micName);
        Utils.Logger.info('PipeIntegration', '  • Audio Codec: ' + audioCodec);
        Utils.Logger.info('PipeIntegration', '  • Video Codec: ' + videoCodec);
        Utils.Logger.info('PipeIntegration', '  • File Type: ' + fileType);
        Utils.Logger.info('PipeIntegration', '  • Video ID: ' + videoId);
        Utils.Logger.info('PipeIntegration', '  • Audio Only: ' + audioOnly);
        Utils.Logger.info('PipeIntegration', '  • Location: ' + location);

        // Build video URL
        var S3_BASE_URL = 'https://s3.us-east-1.amazonaws.com/com.knit.pipe-recorder-videos/';
        var videoUrl = S3_BASE_URL + streamName + '.mp4';
        
        Utils.Logger.info('PipeIntegration', '🔗 FINAL VIDEO URL: ' + videoUrl);
        Utils.Logger.info('PipeIntegration', '📋 This URL will be saved to Qualtrics embedded data as VQ1_pipe_url');

        // Handle conversation metadata
        var conversationManager = GlobalRegistry.get('conversationManager');
        if (conversationManager && conversationManager.segments.length > 0) {
          var metadata = conversationManager.getMetadata(videoUrl);

          // Output comprehensive metadata to console
          Utils.Logger.info('PipeIntegration', '📊 COMPLETE CONVERSATION METADATA GENERATED');
          console.log('\n' + '='.repeat(80));
          console.log('🎬 COMPLETE CONVERSATION METADATA');
          console.log('='.repeat(80));
          console.log('📹 Video URL: ' + videoUrl);
          console.log('⏱️  Total Duration: ' + (metadata.totalDuration || 0) + ' seconds');
          console.log('🗣️  Total Segments: ' + (metadata.segments ? metadata.segments.length : 0));
          console.log('🤖 Total AI Probes: ' + (metadata.totalProbes || 0));
          console.log('📝 Completion Reason: ' + (metadata.completionReason || 'unknown'));
          console.log('🕐 Recording Start: ' + (metadata.recordingStartTime || 'unknown'));
          console.log('🕐 Recording End: ' + (metadata.recordingEndTime || 'unknown'));
          console.log('-'.repeat(80));
          console.log('📋 FULL METADATA JSON:');
          console.log(JSON.stringify(metadata, null, 2));
          console.log('='.repeat(80) + '\n');

          // Store metadata in sessionStorage for recovery
          sessionStorage.setItem('conversation_metadata_' + questionName, JSON.stringify(metadata));

          // Update Qualtrics embedded data with metadata
          if (typeof Qualtrics !== 'undefined') {
            Qualtrics.SurveyEngine.setEmbeddedData('conversation_metadata', JSON.stringify(metadata));
            Qualtrics.SurveyEngine.setEmbeddedData('conversation_segments', metadata.segments.length);
            Qualtrics.SurveyEngine.setEmbeddedData('conversation_duration', Math.round(metadata.totalDuration));
          }
        }

        // Continue with validation
        var transcript_array = (window.global_transcript || '').split(' ');
        if (typeof validateVideo === 'function') {
          validateVideo(recorderObject, transcript_array, location, streamName);
        }
      };

      // Handler for video upload success event
      recorderObject.onVideoUploadSuccess = function(
        recorderId,
        filename,
        filetype,
        videoId,
        audioOnly,
        location
      ) {
        Utils.Logger.info('PipeIntegration', 'Video upload success');

        // Clean up conversation if active
        var conversationManager = GlobalRegistry.get('conversationManager');
        if (conversationManager) {
          conversationManager.cleanup();
        }

        var transcript_array = (window.global_transcript || '').split(' ');
        Utils.DOM.select('#' + recorderId).attr('style', 'height:120px !important');
        Utils.DOM.select('#NextButton-custom').show();
      };

      // Handler for play button pressed
      recorderObject.btPlayPressed = function(recorderId) {
        if (typeof playVideoEvent === 'function') {
          playVideoEvent();
        }
      };

      Utils.Logger.info('PipeIntegration', 'Pipe SDK event handlers configured');
    },

    // Get recorder state
    getState: function() {
      if (!recorderObject || !recorderObject.getState) {
        return null;
      }
      return recorderObject.getState();
    },

    // Get stream time
    getStreamTime: function() {
      if (!recorderObject || !recorderObject.getStreamTime) {
        return 0;
      }
      return recorderObject.getStreamTime();
    },

    // Start recording
    startRecording: function() {
      if (!recorderObject || !recorderObject.start) {
        Utils.Logger.error('PipeIntegration', 'Cannot start recording - recorder not ready');
        return false;
      }

      try {
        recorderObject.start();
        Utils.Logger.info('PipeIntegration', 'Recording started via Pipe SDK');
        return true;
      } catch (error) {
        Utils.Logger.error('PipeIntegration', 'Failed to start recording', error);
        return false;
      }
    },

    // Stop recording
    stopRecording: function() {
      if (!recorderObject || !recorderObject.stop) {
        Utils.Logger.error('PipeIntegration', 'Cannot stop recording - recorder not ready');
        return false;
      }

      try {
        Utils.Logger.info('PipeIntegration', '🛑 TRIGGERING FINAL ADDPIPE STOP');
        Utils.Logger.info('PipeIntegration', '  • This will stop the continuous recording');
        Utils.Logger.info('PipeIntegration', '  • Video will be processed and uploaded to S3');
        Utils.Logger.info('PipeIntegration', '  • onSaveOk will be called when upload completes');
        
        recorderObject.stop();
        Utils.Logger.info('PipeIntegration', '✅ Final AddPipe stop triggered successfully');
        return true;
      } catch (error) {
        Utils.Logger.error('PipeIntegration', '❌ Failed to trigger final AddPipe stop', error);
        return false;
      }
    },

    // Play video
    playVideo: function() {
      if (!recorderObject || !recorderObject.playVideo) {
        Utils.Logger.error('PipeIntegration', 'Cannot play video - recorder not ready');
        return false;
      }

      try {
        recorderObject.playVideo();
        Utils.Logger.info('PipeIntegration', 'Video playback started');
        return true;
      } catch (error) {
        Utils.Logger.error('PipeIntegration', 'Failed to play video', error);
        return false;
      }
    },

    // Get recorder info for debugging
    getInfo: function() {
      return {
        initialized: isInitialized,
        questionName: questionName,
        hasRecorder: !!recorderObject,
        recorderState: this.getState(),
        streamTime: this.getStreamTime()
      };
    },

    // State change handler
    onStateChange: function(oldState, newState, data) {
      Utils.Logger.debug('PipeIntegration', 'State change: ' + oldState + ' -> ' + newState);

      // Handle state-specific actions
      switch (newState) {
        case StateManager.getStates().READY:
          // Recorder should be ready, hide any loading indicators
          Utils.DOM.select('.pipeTimer').hide();
          break;

        case StateManager.getStates().RECORDING:
          // Recording started - ensure UI is updated
          var elementController = GlobalRegistry.get('elementController');
          if (elementController) {
            elementController.setRecordingState();
          }
          break;

        case StateManager.getStates().COMPLETE:
          // Recording completed - show success modal
          var metadata = null;
          var conversationManager = GlobalRegistry.get('conversationManager');
          if (conversationManager) {
            metadata = conversationManager.getMetadata();
          }

          var modalManager = GlobalRegistry.get('modalManager');
          if (modalManager) {
            modalManager.showSuccess(metadata);
          }
          break;
      }
    },

    // Cleanup
    cleanup: function() {
      Utils.Logger.info('PipeIntegration', 'Cleaning up Pipe integration');

      if (recorderObject) {
        try {
          // Stop any ongoing recording
          if (recorderObject.getState && recorderObject.getState() === 'recording') {
            recorderObject.stop();
          }

          // Clean up event handlers
          if (recorderObject.onReadyToRecord) recorderObject.onReadyToRecord = null;
          if (recorderObject.onRecordingStarted) recorderObject.onRecordingStarted = null;
          if (recorderObject.btRecordPressed) recorderObject.btRecordPressed = null;
          if (recorderObject.btStopRecordingPressed) recorderObject.btStopRecordingPressed = null;
          if (recorderObject.onSaveOk) recorderObject.onSaveOk = null;
          if (recorderObject.onVideoUploadSuccess) recorderObject.onVideoUploadSuccess = null;
          if (recorderObject.btPlayPressed) recorderObject.btPlayPressed = null;

          // Restore original stop method
          if (recorderObject.stop) {
            recorderObject.stop = null;
          }
        } catch (error) {
          Utils.Logger.warn('PipeIntegration', 'Error during Pipe cleanup', error);
        }
      }

      recorderObject = null;
      isInitialized = false;

      Utils.Logger.info('PipeIntegration', 'Pipe integration cleanup complete');
    }
  };

  // Export PipeIntegration
  return PipeIntegration;

})();


// === transcription.js (257 lines) ===
// Transcription Service - DeepGram WebSocket integration
// No template literals used - only string concatenation

var TranscriptionService = (function() {

  var Utils = window.Utils;
  var GlobalRegistry = window.GlobalRegistry;
  var StateManager = window.StateManager;

  var mediaRecorder = null;
  var websocket = null;
  var stream = null;
  var keepAliveInterval = null;
  var isInitialized = false;

  // Transcription Service API
  var TranscriptionService = {

    // Initialize transcription service
    initialize: function(config) {
      Utils.Logger.info('TranscriptionService', 'Initializing transcription service');

      if (!config || !config.token) {
        Utils.Logger.warn('TranscriptionService', 'DeepGram token not configured - transcription disabled');
        return false;
      }

      isInitialized = true;
      Utils.Logger.info('TranscriptionService', 'Transcription service initialized');
      return true;
    },

    // Start transcription for new segment
    startNewSegment: function() {
      Utils.Logger.info('TranscriptionService', 'Starting fresh transcription for new segment');

      // CRITICAL: Ensure clean state by stopping any existing transcription
      this.stop();
      Utils.Logger.info('TranscriptionService', 'Previous transcription cleaned up');

      var config = GlobalRegistry.getConfig();

      // Get the video element and stream
      var questionName = config.questionName;
      var videoEl = document.getElementById('pipeVideoInput-' + questionName);

      if (!videoEl) {
        Utils.Logger.error('TranscriptionService', 'Video element not found: pipeVideoInput-' + questionName);
        return;
      }

      // Get stream from video element
      if (videoEl.srcObject !== undefined) {
        stream = videoEl.srcObject;
      } else if (videoEl.mozSrcObject !== undefined) {
        stream = videoEl.mozSrcObject;
      } else if (videoEl.src !== undefined) {
        stream = videoEl.src;
      } else {
        Utils.Logger.error('TranscriptionService', 'Could not get stream from video element');
        return;
      }

      Utils.Logger.info('TranscriptionService', 'Creating fresh MediaRecorder and WebSocket for segment');

      // Create MediaRecorder for audio transcription
      var audioStream = new MediaStream(stream.getAudioTracks());
      mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      // Set up MediaRecorder event handlers
      mediaRecorder.addEventListener('dataavailable', function(event) {
        if (event.data.size > 0 && websocket && websocket.readyState === WebSocket.OPEN) {
          Utils.Logger.debug('TranscriptionService', 'Sending audio chunk to DeepGram: ' + event.data.size + ' bytes');
          websocket.send(event.data);
        }
      });

      mediaRecorder.addEventListener('stop', function() {
        Utils.Logger.info('TranscriptionService', 'MediaRecorder stopped for segment');
      });

      mediaRecorder.addEventListener('error', function(event) {
        Utils.Logger.error('TranscriptionService', 'MediaRecorder error: ' + event.error);
      });

      // Create DeepGram WebSocket connection
      this.createWebSocket(config);

      // Start MediaRecorder when WebSocket is ready
      if (websocket) {
        websocket.onopen = function() {
          Utils.Logger.info('TranscriptionService', 'DeepGram WebSocket connected for segment');

          // Send keepalive message to prevent timeout
          keepAliveInterval = setInterval(function() {
            if (websocket && websocket.readyState === WebSocket.OPEN) {
              websocket.send(JSON.stringify({ type: 'KeepAlive' }));
              Utils.Logger.debug('TranscriptionService', 'Sent KeepAlive to DeepGram');
            } else {
              if (keepAliveInterval) {
                clearInterval(keepAliveInterval);
                keepAliveInterval = null;
              }
            }
          }, 8000); // Send every 8 seconds

          // Start MediaRecorder when WebSocket is ready
          var timeslice = 1000;
          mediaRecorder.start(timeslice);
          Utils.Logger.info('TranscriptionService', 'MediaRecorder started for segment');
        };
      }
    },

    // Create DeepGram WebSocket connection
    createWebSocket: function(config) {
      if (!config.deepgram.token) {
        Utils.Logger.warn('TranscriptionService', 'DeepGram token not configured');
        return null;
      }

      Utils.Logger.info('TranscriptionService', 'Creating DeepGram WebSocket connection');

      try {
        // Use protocol-based auth with modern API parameters
        websocket = new WebSocket(
          'wss://api.deepgram.com/v1/listen?model=nova-3&language=en-US&smart_format=true&interim_results=true',
          ['token', config.deepgram.token]
        );

        websocket.onmessage = function(msg) {
          try {
            var data = JSON.parse(msg.data);

            // Handle different response types
            if (data.type === 'Results') {
              var transcript = data.channel.alternatives[0].transcript;
              if (transcript) {
                if (data.is_final) {
                  Utils.Logger.info('TranscriptionService', 'Final transcript: ' + transcript);
                  window.global_transcript = (window.global_transcript || '') + transcript + ' ';
                } else {
                  Utils.Logger.debug('TranscriptionService', 'Interim transcript: ' + transcript);
                }
              }
            } else if (data.type === 'Metadata') {
              Utils.Logger.debug('TranscriptionService', 'DeepGram Metadata: ' + JSON.stringify(data));
            }
          } catch (error) {
            Utils.Logger.error('TranscriptionService', 'Error parsing DeepGram response', error);
          }
        };

        websocket.onerror = function(error) {
          Utils.Logger.error('TranscriptionService', 'DeepGram WebSocket error', error);
        };

        websocket.onclose = function(event) {
          Utils.Logger.info('TranscriptionService', 'DeepGram WebSocket closed: ' + event.code + ' ' + event.reason);

          // Clean up keepalive interval
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
          }
        };

        Utils.Logger.info('TranscriptionService', 'DeepGram WebSocket created successfully');
        return websocket;

      } catch (error) {
        Utils.Logger.error('TranscriptionService', 'Failed to create DeepGram WebSocket', error);
        websocket = null;
        return null;
      }
    },

    // Stop transcription
    stop: function() {
      Utils.Logger.info('TranscriptionService', 'Stopping transcription service');

      var stoppedComponents = [];

      // Stop MediaRecorder
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        stoppedComponents.push('MediaRecorder');
      }

      // Close WebSocket
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.close();
        stoppedComponents.push('WebSocket');
      }

      // Clear keepalive interval
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        stoppedComponents.push('KeepAlive');
      }

      // Reset references
      mediaRecorder = null;
      websocket = null;
      stream = null;

      Utils.Logger.info('TranscriptionService', 'Transcription stopped - cleaned up: ' + stoppedComponents.join(', '));
    },

    // Get current transcript
    getTranscript: function() {
      return window.global_transcript || '';
    },

    // Get transcription info for debugging
    getInfo: function() {
      return {
        initialized: isInitialized,
        hasMediaRecorder: !!mediaRecorder,
        mediaRecorderState: mediaRecorder ? mediaRecorder.state : 'none',
        hasWebSocket: !!websocket,
        webSocketState: websocket ? websocket.readyState : 'none',
        hasKeepAlive: !!keepAliveInterval,
        transcriptLength: this.getTranscript().length
      };
    },

    // State change handler (simplified - no longer managing transcription via state)
    onStateChange: function(oldState, newState, data) {
      Utils.Logger.debug('TranscriptionService', 'State change: ' + oldState + ' -> ' + newState);
      
      // Transcription is now managed explicitly by ConversationManager
      // No automatic start/stop based on state changes
      switch (newState) {
        case StateManager.getStates().COMPLETE:
          // Only stop on final completion
          this.stop();
          break;
      }
    },

    // Cleanup
    cleanup: function() {
      Utils.Logger.info('TranscriptionService', 'Cleaning up transcription service');
      this.stop();
      Utils.Logger.info('TranscriptionService', 'Transcription service cleanup complete');
    }
  };

  // Export TranscriptionService
  return TranscriptionService;

})();


// === validation.js (208 lines) ===
// Validation - Video/audio validation and error handling
// No template literals used - only string concatenation

var Validation = (function() {

  var Utils = window.Utils;
  var GlobalRegistry = window.GlobalRegistry;
  var StateManager = window.StateManager;

  // Validation API
  var Validation = {

    // Validate video recording
    validateVideo: function(recorderObject, transcript_array, location, streamName) {
      Utils.Logger.info('Validation', 'Validating video recording');

      // Skip validation during active conversation
      if (StateManager.isConversationActive() && !GlobalRegistry.getState().shouldActuallyStop) {
        Utils.Logger.info('Validation', 'Skipping validation - conversation in progress');
        return;
      }

      var config = GlobalRegistry.getConfig();
      var validationDetails = config.validationDetails;

      // Check conversation minimum duration if applicable
      var conversationManager = GlobalRegistry.get('conversationManager');
      if (conversationManager && conversationManager.segments.length > 0) {
        var totalDuration = conversationManager.segments[conversationManager.segments.length - 1].endTime;
        if (totalDuration < validationDetails.min_streamtime) {
          Utils.Logger.warn('Validation', 'Conversation shorter than minimum duration');
          // Continue with validation to show error
        }
      }

      var isError = false;
      var errorMessages = [];

      // Validate minimum duration
      if (validationDetails.hasOwnProperty('min_streamtime')) {
        var streamTime = recorderObject.getStreamTime();
        if (streamTime < validationDetails.min_streamtime) {
          isError = true;
          errorMessages.push('Record a ' + validationDetails.min_streamtime + ' sec or longer video');
        }
      }

      if (isError) {
        this.showValidationError(errorMessages);
      } else {
        this.showValidationSuccess(streamName, conversationManager);
      }
    },

    // Show validation error
    showValidationError: function(errorMessages) {
      Utils.Logger.info('Validation', 'Showing validation error');

      var title = Utils.DOM.select('#record-title');
      var image = Utils.DOM.select('#image-sucess');
      var result = Utils.DOM.select('#result');

      title.empty();
      image.empty();
      result.empty();

      title.append('Recording needs improvement');

      var errorIcon = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: hsl(var(--destructive));"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
      image.append(errorIcon);

      result.addClass('error-feedback');
      result.append('<li style="font-size:15px;padding-left:5px;">Your video didn\'t meet our requirements</li>');

      // Add error messages
      for (var i = 0; i < errorMessages.length; i++) {
        result.append('<li style="font-size:15px;padding-left:5px;">' + errorMessages[i] + '</li>');
      }

      var retryButton = '<button class="btn btn-destructive" onClick="modalRetake()" style="margin-top: 1rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>Try Again</button>';
      result.append(retryButton);

      Utils.DOM.select('#error').modal({
        escapeClose: false,
        clickClose: false,
        showClose: false
      });

      Utils.Logger.info('Validation', 'Validation error modal shown');
    },

    // Show validation success
    showValidationSuccess: function(streamName, conversationManager) {
      Utils.Logger.info('Validation', 'Showing validation success');

      var title = Utils.DOM.select('#record-title');
      var image = Utils.DOM.select('#image-sucess');
      var result = Utils.DOM.select('#result');

      title.empty();
      image.empty();
      result.empty();

      var S3_BASE_URL = 'https://s3.us-east-1.amazonaws.com/com.knit.pipe-recorder-videos/';
      var videoUrl = S3_BASE_URL + streamName + '.mp4';

      // Update Qualtrics embedded data
      if (typeof Qualtrics !== 'undefined') {
        Qualtrics.SurveyEngine.setEmbeddedData('VQ1_pipe_url', videoUrl);
      }

      Utils.DOM.select('#NextButton-custom').show();

      // Check if this was a conversation
      if (conversationManager && conversationManager.segments.length > 0) {
        title.append('Interview Completed Successfully!');

        var totalQuestions = conversationManager.segments.length;
        var duration = conversationManager.getMetadata().totalDuration;
        var minutes = Math.floor(duration / 60);
        var seconds = Math.round(duration % 60);

        var successMessage = 'Great job! You answered ' + totalQuestions + ' question' +
          (totalQuestions > 1 ? 's' : '') + ' in ' + minutes + ':' +
          (seconds < 10 ? '0' : '') + seconds + '. Thank you for your thoughtful responses!';

        result.addClass('success-feedback').append(successMessage);
      } else {
        title.append('Perfect! Video Recorded Successfully');
        var regularMessage = 'Your video response has been recorded successfully! You can now continue to the next question.';
        result.addClass('success-feedback').append(regularMessage);
      }

      // Add success icon
      var successIcon = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: hsl(var(--success));"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>';
      image.append(successIcon);

      // Set playback state for clean UI
      var elementController = GlobalRegistry.get('elementController');
      if (elementController) {
        elementController.setPlaybackState();
      }

      // Only add play button on the right for playback
      var menu = Utils.DOM.select('#pipeMenu-' + GlobalRegistry.getConfig().questionName);
      if (menu && menu.length > 0) {
        var playButton = '<button class="play-custom-btn" id="time-span" onClick="playVideoCustom()" title="Preview recording"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5,3 19,12 5,21"/></svg></button>';
        menu.append(playButton);
      }

      // Show modal buttons
      Utils.DOM.select('#modal-buttons').show();

      Utils.DOM.select('#error').modal({
        escapeClose: true,
        clickClose: true,
        showClose: true,
        onClose: function() {
          Utils.DOM.select('#modal-buttons').hide();
          if (elementController) {
            elementController.setReadyToRecordWithVideoState();
          }
        }
      });

      Utils.Logger.info('Validation', 'Validation success modal shown');
    },

    // Skip validation (for testing)
    skipValidation: function() {
      Utils.Logger.info('Validation', 'Skipping validation');

      var config = GlobalRegistry.getConfig();
      if (config.validationDetails.hasOwnProperty('required') && config.validationDetails.required) {
        Utils.DOM.select('#NextButton-custom').hide();
      } else {
        Utils.DOM.select('#NextButton-custom').show();
      }
    },

    // Get validation info for debugging
    getInfo: function() {
      var config = GlobalRegistry.getConfig();
      return {
        minStreamTime: config.validationDetails.min_streamtime,
        required: config.validationDetails.required,
        hasConversation: !!GlobalRegistry.get('conversationManager')
      };
    },

    // State change handler
    onStateChange: function(oldState, newState, data) {
      Utils.Logger.debug('Validation', 'State change: ' + oldState + ' -> ' + newState);

      // Validation is primarily event-driven, not state-driven
    },

    // Cleanup
    cleanup: function() {
      Utils.Logger.info('Validation', 'Validation cleanup complete');
    }
  };

  // Export Validation
  return Validation;

})();


// === conversation-manager.js (489 lines) ===
// Conversation Manager - AI-driven interview flow management
// No template literals used - only string concatenation

var ConversationManager = (function() {

  var Utils = window.Utils;
  var GlobalRegistry = window.GlobalRegistry;
  var StateManager = window.StateManager;

  // Conversation Manager API
  var ConversationManager = {

    // Initialize conversation manager
    initialize: function(questionName, recorderObject, config) {
      this.questionName = questionName;
      this.recorderObject = recorderObject;
      this.config = config;
      this.segments = [];
      this.conversationThread = [];
      this.currentProbeCount = 0;
      this.maxProbes = this.getMaxProbes();
      this.conversationStartTime = null;
      this.currentSegmentStartTime = null;
      this.isProcessingAI = false;
      this.conversationActive = false;
      this.conversationId = questionName + '_' + Date.now();
      this.accumulatedTranscript = '';
      this.currentAIQuestion = config.questionText;
      this.timerPausedAt = null;

      Utils.Logger.info('ConversationManager', 'Conversation manager initialized for: ' + questionName);
    },

    // Get maximum probes based on configuration
    getMaxProbes: function() {
      var probingAmount = this.config.probingAmount;
      var maxProbesByLevel = {
        'None': 0,
        'Moderate': 3,
        'Deep': 5
      };

      return maxProbesByLevel[probingAmount] || 0;
    },

    // Start conversation
    startConversation: function() {
      Utils.Logger.info('ConversationManager', 'DECISION POINT: Starting conversation');

      // CRITICAL: Set conversation state in both places
      this.conversationActive = true;
      StateManager.setConversationActive();
      this.conversationStartTime = performance.now();
      this.currentSegmentStartTime = 0;

      Utils.Logger.info('ConversationManager', 'Conversation state activated for continuous recording');
      Utils.Logger.debug('ConversationManager', 'Max probes allowed: ' + this.maxProbes);

      // Add initial question to thread
      this.conversationThread.push({
        role: 'assistant',
        content: this.config.questionText
      });

      // Display initial question in UI
      this.displayQuestion(this.config.questionText);

      Utils.Logger.info('ConversationManager', 'Conversation started: ' + this.conversationId);
    },

    // Display question in UI
    displayQuestion: function(question) {
      var titleElement = Utils.DOM.select('#dynamic-question-title');
      var descElement = Utils.DOM.select('#dynamic-question-description');

      if (titleElement && titleElement.length > 0) {
        titleElement.fadeOut(200, function() {
          titleElement.text(question).fadeIn(200);
        });
      }

      if (descElement && descElement.length > 0) {
        descElement.text('Click record when ready to respond.');
      }

      Utils.Logger.debug('ConversationManager', 'Question displayed: ' + question);
    },

    // Get current segment transcript
    getCurrentSegmentTranscript: function() {
      var fullTranscript = window.global_transcript || '';
      var accumulatedLength = this.accumulatedTranscript.length;
      return fullTranscript.substring(accumulatedLength).trim();
    },

    // Mark segment end and create segment data
    markSegmentEnd: function() {
      var now = performance.now();
      var segmentEnd = (now - this.conversationStartTime) / 1000;
      var segmentTranscript = this.getCurrentSegmentTranscript();

      // Update accumulated transcript
      this.accumulatedTranscript = window.global_transcript || '';

      var segment = {
        segmentId: this.segments.length + 1,
        aiQuestion: this.currentAIQuestion,
        startTime: this.currentSegmentStartTime,
        endTime: segmentEnd,
        duration: segmentEnd - this.currentSegmentStartTime,
        transcript: segmentTranscript,
        type: 'user_response'
      };

      this.segments.push(segment);
      this.conversationThread.push({
        role: 'user',
        content: segmentTranscript
      });

      Utils.Logger.info('ConversationManager', 'Segment ' + segment.segmentId + ' recorded:', segment);
      return segment;
    },

    // Mark AI processing start
    markAIProcessingStart: function() {
      this.isProcessingAI = true;
      var now = performance.now();
      var processingStartTime = (now - this.conversationStartTime) / 1000;

      // Pause timer display
      var timerManager = GlobalRegistry.get('timerManager');
      if (timerManager) {
        timerManager.pause();
        this.timerPausedAt = Utils.DOM.select('.pipeTimer-custom').text();
      }

      Utils.Logger.info('ConversationManager', 'AI processing started');
      return processingStartTime;
    },

    // Mark AI processing end and show next question
    markAIProcessingEnd: function(nextQuestion) {
      this.isProcessingAI = false;
      var now = performance.now();
      this.currentSegmentStartTime = (now - this.conversationStartTime) / 1000;

      if (nextQuestion && nextQuestion !== 'DONE') {
        this.currentAIQuestion = nextQuestion;
        this.conversationThread.push({
          role: 'assistant',
          content: nextQuestion
        });
        this.currentProbeCount++;

        // Display next question
        this.displayQuestion(nextQuestion);
      }

      Utils.Logger.info('ConversationManager', 'AI processing ended, next question: ' + (nextQuestion || 'none'));
    },

    // Check if we should continue probing
    shouldContinueProbing: function() {
      if (this.config.probingAmount === 'None') return false;
      return this.currentProbeCount < this.maxProbes;
    },

    // End conversation
    endConversation: function() {
      Utils.Logger.info('ConversationManager', 'DECISION POINT: Ending conversation');
      Utils.Logger.debug('ConversationManager', 'Current segments: ' + this.segments.length);
      Utils.Logger.debug('ConversationManager', 'Current probe count: ' + this.currentProbeCount + '/' + this.maxProbes);

      // CRITICAL: Stop transcription for final time
      var transcriptionService = GlobalRegistry.get('transcriptionService');
      if (transcriptionService) {
        transcriptionService.stop();
        Utils.Logger.info('ConversationManager', 'Final transcription stop - conversation ending');
      }

      // CRITICAL: Clear conversation state FIRST (both systems)
      Utils.Logger.info('ConversationManager', 'Clearing conversation active state');
      this.conversationActive = false;
      GlobalRegistry.setState('isConversationActive', false);
      
      // CRITICAL: Also clear StateManager conversation state so stop override allows the stop
      StateManager.transition(StateManager.getStates().COMPLETE);
      Utils.Logger.info('ConversationManager', 'StateManager conversation state cleared - stop will now be allowed');
      
      // Show completion UI
      this.showConversationComplete();
      
      // NOW AddPipe stop will be allowed (conversation no longer active)
      Utils.Logger.info('ConversationManager', 'Triggering real AddPipe stop (continuous recording complete)');
      var pipeIntegration = GlobalRegistry.get('pipeIntegration');
      if (pipeIntegration && pipeIntegration.stopRecording) {
        pipeIntegration.stopRecording();
        Utils.Logger.info('ConversationManager', 'Real stop triggered successfully');
      } else {
        Utils.Logger.error('ConversationManager', 'Pipe integration not available for stop');
      }
    },

    // Show conversation complete UI
    showConversationComplete: function() {
      Utils.DOM.select('#dynamic-question-title').text('Interview Complete!');
      Utils.DOM.select('#dynamic-question-description').text('Thank you for your thoughtful responses. Finalizing your recording...');
    },

    // Pause recording for AI processing
    pauseForAIProcessing: function() {
      Utils.Logger.info('ConversationManager', 'Pausing for AI processing');

      // Check if we have a meaningful recording (at least 1 second)
      var currentDuration = this.segments.length === 0 ?
        (performance.now() - this.conversationStartTime) / 1000 :
        (performance.now() - this.conversationStartTime) / 1000 - this.currentSegmentStartTime;

      if (currentDuration < 1) {
        Utils.Logger.warn('ConversationManager', 'Recording too short, ignoring pause request');
        return;
      }

      // CRITICAL: Stop transcription for this segment
      var transcriptionService = GlobalRegistry.get('transcriptionService');
      if (transcriptionService) {
        transcriptionService.stop();
        Utils.Logger.info('ConversationManager', 'Transcription stopped for AI processing');
      }

      // Mark segment end
      var segment = this.markSegmentEnd();

      // Update UI to processing state
      var elementController = GlobalRegistry.get('elementController');
      if (elementController) {
        elementController.showProcessingState();
      }

      // Mark AI processing start
      this.markAIProcessingStart();

      // Check if we should continue
      if (!this.shouldContinueProbing()) {
        Utils.Logger.info('ConversationManager', 'Max probes reached, ending conversation');
        this.endConversation();
        return;
      }

      // Get AI response
      this.processWithAI();
    },

    // Process response with AI
    processWithAI: function() {
      Utils.Logger.info('ConversationManager', 'Processing with AI');

      try {
        var aiService = GlobalRegistry.get('aiService');
        if (!aiService) {
          throw new Error('AI service not available');
        }

        // Get AI response
        aiService.getFollowUpQuestion(this).then(function(aiResponse) {
          if (aiResponse.error) {
            Utils.Logger.error('ConversationManager', 'AI error, ending conversation', aiResponse.error);
            ConversationManager.endConversation();
            return;
          }

          if (!aiResponse.hasMoreQuestions) {
            Utils.Logger.info('ConversationManager', 'AI satisfied with responses, ending conversation');
            ConversationManager.endConversation();
            return;
          }

          // Mark AI processing end and show next question
          ConversationManager.markAIProcessingEnd(aiResponse.question);

          // Prepare for next segment
          ConversationManager.prepareForNextSegment();

          // Show the next question
          ConversationManager.showNextQuestion(aiResponse.question);

        }).catch(function(error) {
          Utils.Logger.error('ConversationManager', 'AI processing error', error);
          ConversationManager.endConversation();
        });

      } catch (error) {
        Utils.Logger.error('ConversationManager', 'Error in AI processing', error);
        this.endConversation();
      }
    },

    // Prepare for next segment
    prepareForNextSegment: function() {
      Utils.Logger.info('ConversationManager', 'Preparing for next recording segment');

      // Reset recording flags
      GlobalRegistry.setState('isRecording', false);

      // Clear any existing intervals
      var timerManager = GlobalRegistry.get('timerManager');
      if (timerManager) {
        timerManager.reset();
      }

      // Reset WebSocket and MediaRecorder references
      GlobalRegistry.setState('ws', null);
      GlobalRegistry.setState('mediaRecorder', null);

      // Ensure timer display shows paused time
      if (this.timerPausedAt) {
        Utils.DOM.select('.pipeTimer-custom').text(this.timerPausedAt);
      }

      Utils.Logger.info('ConversationManager', 'Ready for next segment');
    },

    // Show next question
    showNextQuestion: function(question) {
      Utils.Logger.info('ConversationManager', 'Showing next question: ' + question);

      // Hide AI processing UI
      var elementController = GlobalRegistry.get('elementController');
      if (elementController) {
        elementController.hideProcessingState();
      }

      // Update question display with fade effect
      var titleElement = Utils.DOM.select('#dynamic-question-title');
      if (titleElement && titleElement.length > 0) {
        titleElement.fadeOut(200, function() {
          titleElement.text(question).fadeIn(200);
        });
      }

      Utils.DOM.select('#dynamic-question-description').text('Click record when ready to respond.');

      // CRITICAL: Reset AddPipe button state to record mode and ensure visibility
      var pipeIntegration = GlobalRegistry.get('pipeIntegration');
      if (pipeIntegration) {
        try {
          var recordButton = Utils.DOM.select('#pipeRec-' + this.questionName);

          // Remove all state classes
          recordButton.removeClass('pipeRecStop pipeRecRec');

          // Set record button appearance using AddPipe's expected SVG
          var svgHtml = '<svg style="enable-background:new 0 0 16 16;" version="1.1" width="30" height="30" viewBox="0 0 100 100" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
            '<circle cx="50" cy="50" r="30" fill="red"></circle>' +
            '<circle cx="50" cy="50" r="40" stroke="black" stroke-width="8" fill="none"></circle>' +
            '</svg>';

          recordButton.html(svgHtml);

          // Force visibility and enable
          recordButton.css({
            'display': 'block',
            'visibility': 'visible',
            'opacity': '1',
            'pointer-events': 'auto'
          }).prop('disabled', false).show();

          // CRITICAL: Reset AddPipe's internal state and button attributes
          recordButton.attr('title', 'record');
          recordButton.removeClass('pipeBtn').addClass('pipeBtn');

          // Reset menu state
          var menu = Utils.DOM.select('#pipeMenu-' + this.questionName);
          if (menu && menu.length > 0) {
            menu.removeClass('recording-state ai-processing-state').addClass('ready-state');
          }

          Utils.Logger.info('ConversationManager', 'AddPipe button reset to record mode');
        } catch (e) {
          Utils.Logger.error('ConversationManager', 'Error resetting button state', e);
        }
      }
    },

    // Start new recording segment
    startNewSegment: function() {
      Utils.Logger.info('ConversationManager', 'Starting new recording segment');

      // Update UI to recording state
      var elementController = GlobalRegistry.get('elementController');
      if (elementController) {
        elementController.setRecordingState();
      }

      // Start timer
      var timerManager = GlobalRegistry.get('timerManager');
      if (timerManager) {
        timerManager.start();
      }

      // Start new transcription session
      var transcriptionService = GlobalRegistry.get('transcriptionService');
      if (transcriptionService) {
        transcriptionService.startNewSegment();
      }

      Utils.Logger.info('ConversationManager', 'New segment started');
    },

    // Get conversation metadata
    getMetadata: function(fullVideoUrl) {
      var now = performance.now();
      var totalDuration = (now - this.conversationStartTime) / 1000;

      return {
        conversationId: this.conversationId,
        responseId: (typeof Qualtrics !== 'undefined') ? Qualtrics.SurveyEngine.getEmbeddedData('ResponseID') : 'preview',
        questionConfig: this.config,
        totalDuration: totalDuration,
        recordingStartTime: new Date(Date.now() - (now - this.conversationStartTime)).toISOString(),
        recordingEndTime: new Date().toISOString(),
        fullVideoUrl: fullVideoUrl,
        segments: this.segments,
        aiProcessingGaps: this.calculateProcessingGaps(),
        totalProbes: this.currentProbeCount,
        completionReason: this.currentProbeCount >= this.maxProbes ? 'max_probes_reached' : 'ai_satisfied',
        accumulatedTranscript: this.accumulatedTranscript,
        conversationThread: this.conversationThread,
        errors: []
      };
    },

    // Calculate AI processing gaps
    calculateProcessingGaps: function() {
      var gaps = [];
      for (var i = 0; i < this.segments.length - 1; i++) {
        gaps.push({
          gapId: i + 1,
          afterSegment: this.segments[i].segmentId,
          startTime: this.segments[i].endTime,
          endTime: this.segments[i + 1].startTime,
          duration: this.segments[i + 1].startTime - this.segments[i].endTime,
          type: 'ai_processing'
        });
      }
      return gaps;
    },

    // Get conversation info for debugging
    getInfo: function() {
      return {
        conversationId: this.conversationId,
        active: this.conversationActive,
        segments: this.segments.length,
        currentProbeCount: this.currentProbeCount,
        maxProbes: this.maxProbes,
        currentQuestion: this.currentAIQuestion,
        isProcessing: this.isProcessingAI,
        transcriptLength: this.accumulatedTranscript.length
      };
    },

    // State change handler
    onStateChange: function(oldState, newState, data) {
      Utils.Logger.debug('ConversationManager', 'State change: ' + oldState + ' -> ' + newState);

      // Conversation manager is primarily event-driven
    },

    // Cleanup
    cleanup: function() {
      Utils.Logger.info('ConversationManager', 'Cleaning up conversation manager');

      this.conversationActive = false;
      this.segments = [];
      this.conversationThread = [];
      this.currentProbeCount = 0;
      this.isProcessingAI = false;

      Utils.Logger.info('ConversationManager', 'Conversation manager cleanup complete');
    }
  };

  // Export ConversationManager
  return ConversationManager;

})();


// === ai-service.js (284 lines) ===
// AI Service - OpenAI integration for conversation management
// No template literals used - only string concatenation

var AIService = (function() {

  var Utils = window.Utils;
  var GlobalRegistry = window.GlobalRegistry;

  // AI Service API
  var AIService = {

    // Initialize AI service
    initialize: function(apiKey, model) {
      this.apiKey = apiKey;
      this.model = model || 'gpt-4o';
      this.maxRetries = 2;
      this.retryDelay = 1000; // 1 second

      Utils.Logger.info('AIService', 'AI service initialized with model: ' + this.model);
    },

    // Get follow-up question from AI
    getFollowUpQuestion: function(conversationManager) {
      var self = this;
      var lastError = null;

      Utils.Logger.info('AIService', 'Getting follow-up question from AI');

      // Retry logic for API calls
      return new Promise(function(resolve, reject) {
        var attempt = 0;

        function tryRequest() {
          attempt++;
          Utils.Logger.info('AIService', 'Attempt ' + attempt + '/' + self.maxRetries);

          try {
            var systemPrompt = self.buildSystemPrompt(conversationManager.config, conversationManager.currentProbeCount);

            fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + self.apiKey
              },
              body: JSON.stringify({
                model: self.model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  ...conversationManager.conversationThread
                ],
                temperature: 0.7,
                max_tokens: 200,
                response_format: { type: 'json_object' }
              })
            })
            .then(function(response) {
              if (!response.ok) {
                return response.text().then(function(errorData) {
                  throw new Error('OpenAI API error: ' + response.status + ' - ' + errorData);
                });
              }
              return response.json();
            })
            .then(function(data) {
              var aiResponseText = data.choices[0].message.content;

              // Parse the response
              var aiResponse = self.parseAIResponse(aiResponseText);

              Utils.Logger.info('AIService', 'AI response received:', aiResponse);
              resolve(aiResponse);
            })
            .catch(function(error) {
              Utils.Logger.error('AIService', 'API request failed (attempt ' + attempt + ')', error);
              lastError = error;

              // If not the last attempt, wait before retrying
              if (attempt < self.maxRetries) {
                Utils.Logger.info('AIService', 'Retrying in ' + self.retryDelay + 'ms...');
                setTimeout(tryRequest, self.retryDelay);
              } else {
                // All attempts failed
                Utils.Logger.error('AIService', 'All AI service attempts failed', lastError);
                resolve({
                  hasMoreQuestions: false,
                  error: lastError.message,
                  shouldContinue: false
                });
              }
            });
          } catch (error) {
            Utils.Logger.error('AIService', 'Request setup failed', error);
            lastError = error;

            if (attempt < self.maxRetries) {
              setTimeout(tryRequest, self.retryDelay);
            } else {
              resolve({
                hasMoreQuestions: false,
                error: lastError.message,
                shouldContinue: false
              });
            }
          }
        }

        tryRequest();
      });
    },

    // Parse AI response
    parseAIResponse: function(responseText) {
      try {
        // Try to parse as JSON first
        var parsed = JSON.parse(responseText);

        // Handle different response formats
        if (parsed.isDone === true || parsed.done === true) {
          return {
            hasMoreQuestions: false,
            question: null,
            reasoning: parsed.reasoning || 'Interview complete',
            shouldContinue: false
          };
        }

        if (parsed.hasMoreQuestions === true && parsed.question) {
          return {
            hasMoreQuestions: true,
            question: parsed.question.trim(),
            reasoning: parsed.reasoning || null,
            shouldContinue: true
          };
        }

        // Fallback: if we have a question field, use it
        if (parsed.question) {
          return {
            hasMoreQuestions: true,
            question: parsed.question.trim(),
            reasoning: parsed.reasoning || null,
            shouldContinue: true
          };
        }

      } catch (jsonError) {
        Utils.Logger.warn('AIService', 'Failed to parse AI response as JSON', jsonError);

        // Fallback: treat as plain text question
        var cleanText = responseText.trim();
        if (cleanText.length > 0 && !this.isCompletionResponse(cleanText)) {
          return {
            hasMoreQuestions: true,
            question: cleanText,
            reasoning: 'Parsed as plain text',
            shouldContinue: true
          };
        }
      }

      // Default: no more questions
      return {
        hasMoreQuestions: false,
        question: null,
        reasoning: 'Could not parse response',
        shouldContinue: false
      };
    },

    // Check if response indicates completion
    isCompletionResponse: function(text) {
      var lowerText = text.toLowerCase();
      var completionKeywords = [
        'no more questions',
        'interview complete',
        'sufficient information',
        'thoroughly answered',
        'done',
        'finished',
        'complete'
      ];

      return completionKeywords.some(function(keyword) {
        return lowerText.includes(keyword);
      });
    },

    // Build system prompt
    buildSystemPrompt: function(questionConfig, currentProbeCount) {
      var systemPromptBase = window.probingSystemPrompts[questionConfig.probingAmount] || '';
      var maxQuestions = window.maxProbesByLevel[questionConfig.probingAmount] || 0;
      var remainingQuestions = maxQuestions - currentProbeCount;

      return systemPromptBase + '\n\n' +
        'Original Question: "' + questionConfig.questionText + '"\n' +
        'Probing Instructions: "' + questionConfig.probingInstructions + '"\n' +
        'Questions asked so far: ' + currentProbeCount + '\n' +
        'Maximum questions allowed: ' + maxQuestions + '\n' +
        'Remaining questions: ' + remainingQuestions + '\n\n' +
        'RESPONSE FORMAT: You must respond with valid JSON only. Use one of these formats:\n\n' +
        '1. To ask a follow-up question:\n' +
        '{\n' +
        '  "hasMoreQuestions": true,\n' +
        '  "question": "Your specific follow-up question here",\n' +
        '  "reasoning": "Brief explanation of why this question is needed"\n' +
        '}\n\n' +
        '2. To end the interview:\n' +
        '{\n' +
        '  "isDone": true,\n' +
        '  "reasoning": "Explanation of why the interview is complete"\n' +
        '}\n\n' +
        'DECISION CRITERIA:\n' +
        '- If the user has thoroughly answered the original question AND satisfied the probing instructions → End interview\n' +
        '- If you\'ve reached the maximum number of questions (' + maxQuestions + ') → End interview\n' +
        '- If more information is needed AND questions remain → Ask follow-up\n' +
        '- Be conversational and reference specific things the user said\n' +
        '- Focus on the probing instructions: "' + questionConfig.probingInstructions + '"\n\n' +
        'Remember: Respond with JSON only, no additional text.';
    },

    // Test API connectivity
    testConnection: function() {
      var self = this;

      return new Promise(function(resolve, reject) {
        if (!self.isConfigured()) {
          reject(new Error('OpenAI API key not configured'));
          return;
        }

        fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': 'Bearer ' + self.apiKey
          }
        })
        .then(function(response) {
          if (!response.ok) {
            throw new Error('API test failed: ' + response.status);
          }
          Utils.Logger.info('AIService', 'OpenAI API connection successful');
          resolve(true);
        })
        .catch(function(error) {
          Utils.Logger.error('AIService', 'OpenAI API connection failed', error);
          reject(error);
        });
      });
    },

    // Check if service is configured
    isConfigured: function() {
      return this.apiKey && this.apiKey !== 'sk-...' && this.apiKey.startsWith('sk-');
    },

    // Get AI service info for debugging
    getInfo: function() {
      return {
        configured: this.isConfigured(),
        model: this.model,
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
        apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 7) + '...' : 'none'
      };
    },

    // State change handler
    onStateChange: function(oldState, newState, data) {
      Utils.Logger.debug('AIService', 'State change: ' + oldState + ' -> ' + newState);

      // AI service is primarily event-driven
    },

    // Cleanup
    cleanup: function() {
      Utils.Logger.info('AIService', 'AI service cleanup complete');
    }
  };

  // Export AIService
  return AIService;

})();


// === main.js (409 lines) ===
// Main Application Orchestrator - Coordinates all modules
// No template literals used - only string concatenation

var VideoRecorderApp = (function() {

  var Utils = window.Utils;
  var GlobalRegistry = window.GlobalRegistry;
  var StateManager = window.StateManager;

  // Application state
  var isInitialized = false;
  var initializationPromise = null;

  // Main Application API
  var VideoRecorderApp = {

    // Initialize the entire application
    initialize: function() {
      if (isInitialized) {
        Utils.Logger.warn('VideoRecorderApp', 'Application already initialized');
        return Promise.resolve();
      }

      if (initializationPromise) {
        return initializationPromise;
      }

      initializationPromise = this._initializeAsync();
      return initializationPromise;
    },

    // Internal initialization
    _initializeAsync: function() {
      return new Promise(function(resolve, reject) {
        Utils.Logger.info('VideoRecorderApp', 'Starting application initialization');

        try {
          // Step 1: Initialize global registry
          GlobalRegistry.initialize();
          Utils.Logger.info('VideoRecorderApp', 'Global registry initialized');

          // Step 2: Initialize core modules
          VideoRecorderApp._initializeCoreModules();
          Utils.Logger.info('VideoRecorderApp', 'Core modules initialized');

          // Step 3: Initialize UI modules
          VideoRecorderApp._initializeUIModules();
          Utils.Logger.info('VideoRecorderApp', 'UI modules initialized');

          // Step 4: Initialize recording services
          VideoRecorderApp._initializeRecordingServices();
          Utils.Logger.info('VideoRecorderApp', 'Recording services initialized');

          // Step 5: Initialize AI services
          VideoRecorderApp._initializeAIServices();
          Utils.Logger.info('VideoRecorderApp', 'AI services initialized');

          // Step 6: Set up main application flow
          VideoRecorderApp._setupApplicationFlow();
          Utils.Logger.info('VideoRecorderApp', 'Application flow configured');

          isInitialized = true;
          Utils.Logger.info('VideoRecorderApp', 'Application initialization complete');

          resolve();

        } catch (error) {
          Utils.Logger.error('VideoRecorderApp', 'Initialization failed', error);
          reject(error);
        }
      });
    },

    // Initialize core modules
    _initializeCoreModules: function() {
      Utils.Logger.info('VideoRecorderApp', 'Initializing core modules');

      // Register state manager (no initialization needed)
      GlobalRegistry.register('stateManager', StateManager);

      // Initialize event handler
      var eventHandler = window.EventHandler;
      eventHandler.initialize();
      GlobalRegistry.register('eventHandler', eventHandler);

      Utils.Logger.info('VideoRecorderApp', 'Core modules registered');
    },

    // Initialize UI modules
    _initializeUIModules: function() {
      Utils.Logger.info('VideoRecorderApp', 'Initializing UI modules');

      var config = GlobalRegistry.getConfig();
      var questionName = config.questionName;

      // Initialize element controller
      var elementController = window.ElementController;
      elementController.initialize(questionName);
      GlobalRegistry.register('elementController', elementController);

      // Initialize timer manager
      var timerManager = window.TimerManager;
      timerManager.initialize();
      GlobalRegistry.register('timerManager', timerManager);

      // Initialize modal manager
      var modalManager = window.ModalManager;
      modalManager.initialize();
      GlobalRegistry.register('modalManager', modalManager);

      Utils.Logger.info('VideoRecorderApp', 'UI modules registered');
    },

    // Initialize recording services
    _initializeRecordingServices: function() {
      Utils.Logger.info('VideoRecorderApp', 'Initializing recording services');

      var config = GlobalRegistry.getConfig();

      // Initialize Pipe integration
      var pipeIntegration = window.PipeIntegration;
      pipeIntegration.initialize(config.questionName, config.pipeParams)
        .then(function() {
          GlobalRegistry.register('pipeIntegration', pipeIntegration);
          Utils.Logger.info('VideoRecorderApp', 'Pipe integration registered');
        })
        .catch(function(error) {
          Utils.Logger.error('VideoRecorderApp', 'Pipe integration initialization failed', error);
        });

      // Initialize transcription service
      var transcriptionService = window.TranscriptionService;
      transcriptionService.initialize(config.deepgram);
      GlobalRegistry.register('transcriptionService', transcriptionService);

      // Initialize validation
      var validation = window.Validation;
      GlobalRegistry.register('validation', validation);

      Utils.Logger.info('VideoRecorderApp', 'Recording services registered');
    },

    // Initialize AI services
    _initializeAIServices: function() {
      Utils.Logger.info('VideoRecorderApp', 'Initializing AI services');

      var config = GlobalRegistry.getConfig();

      // Initialize conversation manager
      var conversationManager = window.ConversationManager;
      conversationManager.initialize(config.questionName, null, config.questionConfig);
      GlobalRegistry.register('conversationManager', conversationManager);

      // Initialize AI service
      var aiService = window.AIService;
      aiService.initialize(config.openai.apiKey, config.openai.model);
      GlobalRegistry.register('aiService', aiService);

      Utils.Logger.info('VideoRecorderApp', 'AI services registered');
    },

    // Set up main application flow
    _setupApplicationFlow: function() {
      Utils.Logger.info('VideoRecorderApp', 'Setting up application flow');

      // Set up global functions for backward compatibility
      this._setupGlobalFunctions();

      // Set up permissions and instructions flow
      this._setupModalFlow();

      Utils.Logger.info('VideoRecorderApp', 'Application flow configured');
    },

    // Set up global functions for compatibility
    _setupGlobalFunctions: function() {
      var self = this;

      // Global functions that need to be available
      window.getCamAccess = function() {
        Utils.Logger.info('VideoRecorderApp', 'Camera access requested');

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
            .then(function(stream) {
              Utils.Logger.info('VideoRecorderApp', 'Camera access granted');

              // Close permissions modal and show instructions
              var modalManager = GlobalRegistry.get('modalManager');
              if (modalManager) {
                jQuery.modal.close();
                modalManager.showInstructions();
              }

              // Start the main application
              self.start();
            })
            .catch(function(err) {
              Utils.Logger.error('VideoRecorderApp', 'Camera access denied', err);
              // Still proceed to instructions
              var modalManager = GlobalRegistry.get('modalManager');
              if (modalManager) {
                jQuery.modal.close();
                modalManager.showInstructions();
              }
              self.start();
            });
        } else {
          Utils.Logger.warn('VideoRecorderApp', 'MediaDevices not available');
          var modalManager = GlobalRegistry.get('modalManager');
          if (modalManager) {
            jQuery.modal.close();
            modalManager.showInstructions();
          }
          self.start();
        }
      };

      window.modalClose = function() {
        Utils.Logger.info('VideoRecorderApp', 'Modal close triggered');
        var modalManager = GlobalRegistry.get('modalManager');
        if (modalManager) {
          modalManager.handleClose();
        }
        
        // Display the initial question from config
        var config = GlobalRegistry.getConfig();
        if (config.questionConfig && config.questionConfig.questionText) {
          Utils.Logger.info('VideoRecorderApp', 'Displaying initial question from config');
          
          var titleElement = Utils.DOM.select('#dynamic-question-title');
          var descElement = Utils.DOM.select('#dynamic-question-description');
          
          if (titleElement && titleElement.length > 0) {
            titleElement.text(config.questionConfig.questionText);
            Utils.Logger.debug('VideoRecorderApp', 'Question title updated: ' + config.questionConfig.questionText);
          }
          
          if (descElement && descElement.length > 0) {
            descElement.text('Click record when ready to respond.');
          }
        } else {
          Utils.Logger.warn('VideoRecorderApp', 'No question config found or questionText missing');
        }
      };

      window.modalRetake = function() {
        Utils.Logger.info('VideoRecorderApp', 'Modal retake triggered');
        var modalManager = GlobalRegistry.get('modalManager');
        if (modalManager) {
          modalManager.handleRetake();
        }
      };

      window.nextQuestion = function() {
        Utils.Logger.info('VideoRecorderApp', 'Next question triggered');
        jQuery.modal.close();
        if (typeof document.querySelector('.NextButton') !== 'undefined') {
          document.querySelector('.NextButton').click();
        }
      };

      // Mobile OS detection - now handled in qualtrics-question-js.js
      // The function is already defined and initialized there

      // Legacy functions for compatibility
      window.playVideoCustom = function() {
        var pipeIntegration = GlobalRegistry.get('pipeIntegration');
        if (pipeIntegration) {
          pipeIntegration.playVideo();
        }
      };

      window.playVideoEvent = function() {
        var pipeIntegration = GlobalRegistry.get('pipeIntegration');
        if (pipeIntegration) {
          pipeIntegration.playVideo();
        }
      };

      window.stoppedVideo = function() {
        var elementController = GlobalRegistry.get('elementController');
        if (elementController) {
          elementController.setPlaybackState();
        }
      };

      window.showGallary = function() {
        Utils.Logger.info('VideoRecorderApp', 'Gallery view requested');
        // Gallery functionality would be implemented here if needed
      };

      window.backToCamera = function() {
        Utils.Logger.info('VideoRecorderApp', 'Back to camera requested');
        var elementController = GlobalRegistry.get('elementController');
        if (elementController) {
          elementController.setReadyToRecordWithVideoState();
        }
      };

      Utils.Logger.info('VideoRecorderApp', 'Global functions configured');
    },

    // Set up modal flow
    _setupModalFlow: function() {
      // Set up permissions modal on page load
      jQuery(function() {
        Utils.Logger.info('VideoRecorderApp', 'Setting up initial modal flow');

        jQuery('#SkinContent #Buttons').hide();
        jQuery('#NextButton-custom').hide();

        var modalManager = GlobalRegistry.get('modalManager');
        if (modalManager) {
          modalManager.showPermissions();
        }
      });

      Utils.Logger.info('VideoRecorderApp', 'Modal flow configured');
    },

    // Start the main application
    start: function() {
      Utils.Logger.info('VideoRecorderApp', 'Starting main application');

      // Initialize the application if not already done
      return this.initialize().then(function() {
        Utils.Logger.info('VideoRecorderApp', 'Application started successfully');
      }).catch(function(error) {
        Utils.Logger.error('VideoRecorderApp', 'Application start failed', error);
        StateManager.setError('Application initialization failed: ' + error.message);
      });
    },

    // Get application status
    getStatus: function() {
      var registryState = GlobalRegistry.getState();
      var stateManagerState = StateManager.getState();
      var performanceMetrics = GlobalRegistry.getPerformanceMetrics();

      return {
        initialized: isInitialized,
        currentState: stateManagerState.current,
        modulesRegistered: Object.keys(GlobalRegistry.getAllModules()).length,
        performance: performanceMetrics,
        config: GlobalRegistry.getConfig(),
        errors: registryState.hasError ? registryState.errorMessage : null
      };
    },

    // Cleanup application
    cleanup: function() {
      Utils.Logger.info('VideoRecorderApp', 'Cleaning up application');

      // Cleanup all modules
      var modules = GlobalRegistry.getAllModules();
      for (var moduleName in modules) {
        var module = modules[moduleName];
        if (module && typeof module.cleanup === 'function') {
          try {
            module.cleanup();
          } catch (error) {
            Utils.Logger.error('VideoRecorderApp', 'Cleanup failed for ' + moduleName, error);
          }
        }
      }

      // Cleanup global registry
      GlobalRegistry.cleanup();

      isInitialized = false;
      initializationPromise = null;

      Utils.Logger.info('VideoRecorderApp', 'Application cleanup complete');
    },

    // Debug information
    debug: function() {
      var status = this.getStatus();
      var modules = GlobalRegistry.getAllModules();

      var debugInfo = {
        status: status,
        modules: {}
      };

      for (var moduleName in modules) {
        var module = modules[moduleName];
        if (module && typeof module.getInfo === 'function') {
          debugInfo.modules[moduleName] = module.getInfo();
        }
      }

      Utils.Logger.info('VideoRecorderApp', 'Debug information:');
      console.log(JSON.stringify(debugInfo, null, 2));

      return debugInfo;
    }
  };

  // Export VideoRecorderApp
  return VideoRecorderApp;

})();

// Auto-initialize the application when the script loads
VideoRecorderApp.initialize();


