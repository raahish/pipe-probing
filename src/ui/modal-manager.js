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
          Utils.Logger.info('ModalManager', '🔴 DEBUG: showError modal onClose callback fired');
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
      Utils.Logger.info('ModalManager', '🔴 DEBUG: resetToRecordingReady calling setReadyToRecordWithVideoState');
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
