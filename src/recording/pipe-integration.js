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
        Utils.Logger.info('PipeIntegration', 'Recording actually started');
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

        Utils.Logger.info('PipeIntegration', 'Allowing initial AddPipe recording (first time only)');
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
        Utils.Logger.info('PipeIntegration', 'Allowing real stop - no active conversation');

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
        Utils.Logger.info('PipeIntegration', 'Save OK triggered');

        // Build video URL
        var S3_BASE_URL = 'https://s3.us-east-1.amazonaws.com/com.knit.pipe-recorder-videos/';
        var videoUrl = S3_BASE_URL + streamName + '.mp4';

        // Handle conversation metadata
        var conversationManager = GlobalRegistry.get('conversationManager');
        if (conversationManager && conversationManager.segments.length > 0) {
          var metadata = conversationManager.getMetadata(videoUrl);

          // Output metadata to console
          Utils.Logger.info('PipeIntegration', 'Conversation metadata:');
          console.log('\n=== 📊 CONVERSATION METADATA ===');
          console.log(JSON.stringify(metadata, null, 2));
          console.log('=================================\n');

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
        recorderObject.stop();
        Utils.Logger.info('PipeIntegration', 'Recording stopped via Pipe SDK');
        return true;
      } catch (error) {
        Utils.Logger.error('PipeIntegration', 'Failed to stop recording', error);
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
