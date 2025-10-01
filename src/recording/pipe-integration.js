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
        
        // 🔍 SAFARI DEBUG: Log AddPipe internal state
        Utils.Logger.info('PipeIntegration', '🔍 SAFARI DEBUG - AddPipe State on Recording Start:');
        Utils.Logger.info('PipeIntegration', '  🎬 Recorder state: ' + (recorderObject.getState ? recorderObject.getState() : 'getState not available'));
        Utils.Logger.info('PipeIntegration', '  🎬 Recorder object exists: ' + !!recorderObject);
        
        // Check button state after AddPipe starts
        var config = GlobalRegistry.getConfig();
        var buttonElement = document.getElementById('pipeRec-' + config.questionName);
        if (buttonElement) {
          Utils.Logger.info('PipeIntegration', '  🔘 Button title after start: "' + buttonElement.title + '"');
          Utils.Logger.info('PipeIntegration', '  🔘 Button disabled after start: ' + buttonElement.disabled);
          var buttonStyle = window.getComputedStyle(buttonElement);
          Utils.Logger.info('PipeIntegration', '  🔘 Button pointer-events after start: ' + buttonStyle.pointerEvents);
        }
        
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

      // CRITICAL: Store original AddPipe stopVideo method to prevent it during conversations
      var originalStopVideo = recorderObject.stopVideo;
      recorderObject.stopVideo = function() {
        Utils.Logger.info('PipeIntegration', 'DECISION POINT: AddPipe.stopVideo() called internally');
        Utils.Logger.debug('PipeIntegration', 'Conversation active: ' + StateManager.isConversationActive());
        
        // NEW: Simplified - block ALL stops during conversation
        if (StateManager.isConversationActive()) {
          Utils.Logger.info('PipeIntegration', 'BLOCKED: AddPipe.stopVideo() during active conversation');
          Utils.Logger.debug('PipeIntegration', 'Conversation must end before allowing real stop');
          return; // Always block, no exceptions
        }
        
        Utils.Logger.info('PipeIntegration', 'ALLOWED: AddPipe.stopVideo() - no active conversation');
        
        // CRITICAL: Check if original stopVideo method exists before calling
        if (originalStopVideo && typeof originalStopVideo === 'function') {
          Utils.Logger.debug('PipeIntegration', 'Calling original AddPipe stopVideo method');
          return originalStopVideo.apply(this, arguments);
        } else {
          Utils.Logger.warn('PipeIntegration', 'Original AddPipe stop method not available, using DOM fallback');
          
          // Fallback: Trigger stop via DOM button click to bypass the override
          var config = GlobalRegistry.getConfig();
          var questionName = config.questionName;
          var stopButton = document.getElementById('pipeRec-' + questionName);
          
          if (stopButton && stopButton.title === 'stop') {
            Utils.Logger.info('PipeIntegration', 'Triggering AddPipe stop via DOM button click');
            
            // Temporarily clear conversation state to allow the click
            var wasActive = StateManager.isConversationActive();
            if (wasActive) {
              StateManager.transition(StateManager.getStates().COMPLETE);
              Utils.Logger.debug('PipeIntegration', 'Temporarily cleared conversation state for stop');
            }
            
            // Click the button to trigger AddPipe's native stop
            stopButton.click();
            
            Utils.Logger.info('PipeIntegration', 'DOM button click triggered');
            return true;
          } else {
            Utils.Logger.error('PipeIntegration', 'Stop button not found or not in stop state');
            Utils.Logger.error('PipeIntegration', 'Button exists: ' + !!stopButton);
            if (stopButton) {
              Utils.Logger.error('PipeIntegration', 'Button title: "' + stopButton.title + '"');
            }
            return false;
          }
        }
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
      if (!recorderObject || !recorderObject.stopVideo) {
        Utils.Logger.error('PipeIntegration', 'Cannot stop recording - recorder not ready or stopVideo method not available');
        Utils.Logger.debug('PipeIntegration', 'Recorder exists: ' + !!recorderObject);
        if (recorderObject) {
          Utils.Logger.debug('PipeIntegration', 'stopVideo method exists: ' + !!recorderObject.stopVideo);
        }
        return false;
      }

      try {
        Utils.Logger.info('PipeIntegration', '🛑 TRIGGERING FINAL ADDPIPE STOP (using official stopVideo API)');
        Utils.Logger.info('PipeIntegration', '  • This will stop the continuous recording');
        Utils.Logger.info('PipeIntegration', '  • Video will be processed and uploaded to S3');
        Utils.Logger.info('PipeIntegration', '  • onSaveOk will be called when upload completes');
        
        recorderObject.stopVideo();
        Utils.Logger.info('PipeIntegration', '✅ Final AddPipe stopVideo triggered successfully');
        return true;
      } catch (error) {
        Utils.Logger.error('PipeIntegration', '❌ Failed to trigger final AddPipe stopVideo', error);
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
          // Stop any ongoing recording using official Pipe API
          if (recorderObject.getState && recorderObject.getState() === 'recording') {
            Utils.Logger.info('PipeIntegration', 'Stopping ongoing recording during cleanup using official stopVideo API');
            recorderObject.stopVideo();
          }

          // Clean up event handlers
          if (recorderObject.onReadyToRecord) recorderObject.onReadyToRecord = null;
          if (recorderObject.onRecordingStarted) recorderObject.onRecordingStarted = null;
          if (recorderObject.btRecordPressed) recorderObject.btRecordPressed = null;
          if (recorderObject.btStopRecordingPressed) recorderObject.btStopRecordingPressed = null;
          if (recorderObject.onSaveOk) recorderObject.onSaveOk = null;
          if (recorderObject.onVideoUploadSuccess) recorderObject.onVideoUploadSuccess = null;
          if (recorderObject.btPlayPressed) recorderObject.btPlayPressed = null;

          // Restore original stopVideo method
          if (recorderObject.stopVideo) {
            recorderObject.stopVideo = null;
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
