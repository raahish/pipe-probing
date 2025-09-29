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
        this.stop();
      }

      startTime = performance.now();
      isPaused = false;
      pausedTime = 0;

      intervalId = setInterval(function() {
        TimerManager.update();
      }, 1000);

      Utils.Logger.info('TimerManager', 'Timer started');
    },

    // Stop the timer
    stop: function() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      isPaused = false;
      pausedTime = 0;

      Utils.Logger.info('TimerManager', 'Timer stopped');
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
