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

      // Copy to window object (preserve existing global_transcript)
      for (var key in globalVars) {
        if (key === 'global_transcript') {
          // CRITICAL: Never overwrite global_transcript - it accumulates across segments
          if (!window.global_transcript) {
            window.global_transcript = globalVars[key];
          }
          // Keep existing transcript content
        } else {
          window[key] = globalVars[key];
        }
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
