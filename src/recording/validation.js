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
        var config = GlobalRegistry.getConfig();
        Qualtrics.SurveyEngine.setEmbeddedData(config.videoURL, videoUrl);
        Utils.Logger.info('Validation', 'Video URL saved to Qualtrics embedded data: ' + config.videoURL);
      }

      // Check if this was a conversation
      if (conversationManager && conversationManager.segments.length > 0) {
        // For conversations, Next button will be shown by ElementController.setConversationCompleteState()
        Utils.Logger.info('Validation', 'Conversation detected - Next button will be handled by ElementController');
      } else {
        // For regular recordings, show Next button immediately
        Utils.DOM.select('#NextButton-custom').show();
        Utils.Logger.info('Validation', 'Regular recording - showing Next button immediately');
      }

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
