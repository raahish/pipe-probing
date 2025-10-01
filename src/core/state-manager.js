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

      // 🔍 SAFARI DEBUG: Log detailed state information
      if (newState === STATES.CONVERSATION_ACTIVE || newState === STATES.RECORDING) {
        Utils.Logger.info('StateManager', '🔍 SAFARI DEBUG - State Transition Details:');
        Utils.Logger.info('StateManager', '  📊 Old state: ' + oldState);
        Utils.Logger.info('StateManager', '  📊 New state: ' + newState);
        Utils.Logger.info('StateManager', '  📊 Is conversation active: ' + (newState === STATES.CONVERSATION_ACTIVE));
        Utils.Logger.info('StateManager', '  📊 Is recording: ' + (newState === STATES.RECORDING));
        Utils.Logger.info('StateManager', '  📊 Should actually stop: ' + (newState === STATES.COMPLETE));
        Utils.Logger.info('StateManager', '  📊 Timestamp: ' + new Date().toISOString());
      }

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
