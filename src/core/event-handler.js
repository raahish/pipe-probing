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
        // Only intercept clicks on AddPipe record buttons
        if (!e.target || !e.target.id || !e.target.id.startsWith('pipeRec-')) {
          return; // Not our button, ignore
        }

        var questionName = GlobalRegistry.getConfig().questionName;
        var buttonId = e.target.id;

        Utils.Logger.debug('EventHandler', 'Capture phase click on: ' + buttonId);

        // Only intercept during active conversations
        if (!StateManager.isConversationActive()) {
          Utils.Logger.debug('EventHandler', 'No active conversation, allowing normal behavior');
          return; // No conversation active, allow normal behavior
        }

        var isRecording = StateManager.isRecording();
        var recorderState = null;

        try {
          var recorderObject = GlobalRegistry.get('pipeIntegration');
          if (recorderObject && recorderObject.getState) {
            recorderState = recorderObject.getState();
          }
        } catch (error) {
          Utils.Logger.warn('EventHandler', 'Could not get recorder state', error);
        }

        Utils.Logger.debug('EventHandler', 'State check - Recording: ' + isRecording + ', Recorder: ' + recorderState);

        // Determine click type and handle appropriately
        if (isRecording && recorderState === 'recording') {
          // STOP click - block AddPipe and do fake stop
          Utils.Logger.info('EventHandler', 'STOP click intercepted - blocking AddPipe');
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          this.handleStopClick();
          return false;

        } else if (!isRecording && buttonId.indexOf(questionName) !== -1) {
          // RECORD click for new segment - block AddPipe
          Utils.Logger.info('EventHandler', 'RECORD click intercepted - blocking AddPipe');
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          this.handleRecordClick();
          return false;

        } else {
          // First recording or legitimate action - allow AddPipe to handle
          Utils.Logger.debug('EventHandler', 'Allowing AddPipe to handle this click');
        }
      });

      // Attach in CAPTURE PHASE (executes before bubble phase handlers)
      document.addEventListener('click', capturePhaseHandler, true);

      Utils.Logger.info('EventHandler', 'Capture phase handler attached');
    },

    // Handle stop button click
    handleStopClick: function() {
      Utils.Logger.info('EventHandler', 'Processing STOP click');

      try {
        // Trigger pause for AI processing
        var conversationManager = GlobalRegistry.get('conversationManager');
        if (conversationManager && conversationManager.pauseForAIProcessing) {
          conversationManager.pauseForAIProcessing();
        } else {
          Utils.Logger.error('EventHandler', 'Conversation manager not available for pause');
        }
      } catch (error) {
        Utils.Logger.error('EventHandler', 'Stop click handling failed', error);
        StateManager.setError('Failed to process stop click: ' + error.message);
      }
    },

    // Handle record button click
    handleRecordClick: function() {
      Utils.Logger.info('EventHandler', 'Processing RECORD click');

      try {
        var conversationManager = GlobalRegistry.get('conversationManager');
        if (conversationManager) {
          // Start new recording segment
          conversationManager.startNewSegment();
        } else {
          Utils.Logger.error('EventHandler', 'Conversation manager not available for record');
        }
      } catch (error) {
        Utils.Logger.error('EventHandler', 'Record click handling failed', error);
        StateManager.setError('Failed to process record click: ' + error.message);
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
