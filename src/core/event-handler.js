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

        // 🔍 SAFARI DEBUG: Comprehensive event analysis
        Utils.Logger.info('EventHandler', '🔍 SAFARI DEBUG - Event Details:');
        Utils.Logger.info('EventHandler', '  📱 Event type: ' + e.type);
        Utils.Logger.info('EventHandler', '  📱 Event phase: ' + e.eventPhase + ' (1=capture, 2=target, 3=bubble)');
        Utils.Logger.info('EventHandler', '  📱 Timestamp: ' + e.timeStamp);
        Utils.Logger.info('EventHandler', '  📱 IsTrusted: ' + e.isTrusted);
        Utils.Logger.info('EventHandler', '  📱 User agent: ' + navigator.userAgent.substring(0, 100));
        
        // Check if this is a touch-generated event
        var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        Utils.Logger.info('EventHandler', '  📱 Touch device detected: ' + isTouchDevice);
        Utils.Logger.info('EventHandler', '  📱 Max touch points: ' + (navigator.maxTouchPoints || 'unknown'));
        
        // Target element analysis
        var targetButton = EventHandler.findAddPipeButton(e.target);
        if (targetButton) {
          var computedStyle = window.getComputedStyle(targetButton);
          Utils.Logger.info('EventHandler', '🔍 SAFARI DEBUG - Button CSS State:');
          Utils.Logger.info('EventHandler', '  🎨 Display: ' + computedStyle.display);
          Utils.Logger.info('EventHandler', '  🎨 Pointer events: ' + computedStyle.pointerEvents);
          Utils.Logger.info('EventHandler', '  🎨 Z-index: ' + computedStyle.zIndex);
          Utils.Logger.info('EventHandler', '  🎨 Position: ' + computedStyle.position);
          Utils.Logger.info('EventHandler', '  🎨 Visibility: ' + computedStyle.visibility);
          Utils.Logger.info('EventHandler', '  🎨 Opacity: ' + computedStyle.opacity);
          Utils.Logger.info('EventHandler', '  🎨 Transform: ' + computedStyle.transform);
          
          // Button properties
          Utils.Logger.info('EventHandler', '🔍 SAFARI DEBUG - Button Properties:');
          Utils.Logger.info('EventHandler', '  🔘 ID: ' + targetButton.id);
          Utils.Logger.info('EventHandler', '  🔘 Title: "' + targetButton.title + '"');
          Utils.Logger.info('EventHandler', '  🔘 Disabled: ' + targetButton.disabled);
          Utils.Logger.info('EventHandler', '  🔘 Class list: ' + targetButton.className);
          Utils.Logger.info('EventHandler', '  🔘 Tab index: ' + targetButton.tabIndex);
          
          // Check for overlapping elements
          var rect = targetButton.getBoundingClientRect();
          var elementAtPoint = document.elementFromPoint(rect.left + rect.width/2, rect.top + rect.height/2);
          Utils.Logger.info('EventHandler', '  🎯 Element at center point: ' + (elementAtPoint ? elementAtPoint.id || elementAtPoint.tagName : 'null'));
          Utils.Logger.info('EventHandler', '  🎯 Is same element: ' + (elementAtPoint === targetButton));
        }

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
          var isCurrentlyRecording = (buttonTitle.toLowerCase() === 'stop');
          
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
      
      // 🔍 SAFARI DEBUG: Also listen for touch events to test Safari touch handling
      document.addEventListener('touchstart', function(e) {
        var isAddPipeButton = EventHandler.isAddPipeButton(e.target);
        if (isAddPipeButton) {
          Utils.Logger.info('EventHandler', '🔍 SAFARI DEBUG - TouchStart detected on AddPipe button');
          Utils.Logger.info('EventHandler', '  📱 Touch event target: ' + (e.target.id || e.target.tagName));
          Utils.Logger.info('EventHandler', '  📱 Touches length: ' + e.touches.length);
          Utils.Logger.info('EventHandler', '  📱 Changed touches: ' + e.changedTouches.length);
        }
      }, true);
      
      document.addEventListener('touchend', function(e) {
        var isAddPipeButton = EventHandler.isAddPipeButton(e.target);
        if (isAddPipeButton) {
          Utils.Logger.info('EventHandler', '🔍 SAFARI DEBUG - TouchEnd detected on AddPipe button');
          Utils.Logger.info('EventHandler', '  📱 Touch event target: ' + (e.target.id || e.target.tagName));
          Utils.Logger.info('EventHandler', '  📱 Changed touches: ' + e.changedTouches.length);
        }
      }, true);

      Utils.Logger.info('EventHandler', 'DOM capture phase handler attached - ready to intercept AddPipe');
      Utils.Logger.info('EventHandler', '🔍 SAFARI DEBUG - Touch event listeners also attached for debugging');
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
