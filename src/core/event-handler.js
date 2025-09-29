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
          
          // Determine if this is a record or stop click
          var isRecording = StateManager.isRecording();
          Utils.Logger.debug('EventHandler', 'Current recording state: ' + isRecording);
          
          if (isRecording) {
            Utils.Logger.info('EventHandler', 'FAKE STOP: Handling stop click via conversation manager');
            EventHandler.handleInterceptedStopClick();
          } else {
            Utils.Logger.info('EventHandler', 'FAKE RECORD: Handling record click via conversation manager');
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
      if (!target) return false;
      
      // Strategy 1: Direct ID match
      if (target.id && target.id.includes('pipeRec-')) {
        Utils.Logger.debug('EventHandler', 'Button detected via direct ID: ' + target.id);
        return true;
      }
      
      // Strategy 2: Parent element search (for child elements like SVG icons)
      var parentButton = target.closest('[id*="pipeRec-"]');
      if (parentButton) {
        Utils.Logger.debug('EventHandler', 'Button detected via parent search: ' + parentButton.id);
        return true;
      }
      
      // Strategy 3: Class-based detection
      if (target.classList && target.classList.contains('pipeBtn')) {
        Utils.Logger.debug('EventHandler', 'Button detected via pipeBtn class');
        return true;
      }
      
      // Strategy 4: SVG icon clicks (common in AddPipe buttons)
      if (target.tagName === 'svg' || target.tagName === 'SVG') {
        var svgParent = target.closest('[id*="pipeRec-"], .pipeBtn');
        if (svgParent) {
          Utils.Logger.debug('EventHandler', 'Button detected via SVG parent: ' + (svgParent.id || svgParent.className));
          return true;
        }
      }
      
      return false;
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
