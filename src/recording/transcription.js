// Transcription Service - DeepGram WebSocket integration
// No template literals used - only string concatenation

var TranscriptionService = (function() {

  var Utils = window.Utils;
  var GlobalRegistry = window.GlobalRegistry;
  var StateManager = window.StateManager;

  var mediaRecorder = null;
  var websocket = null;
  var stream = null;
  var keepAliveInterval = null;
  var isInitialized = false;

  // Transcription Service API
  var TranscriptionService = {

    // Initialize transcription service
    initialize: function(config) {
      Utils.Logger.info('TranscriptionService', 'Initializing transcription service');

      if (!config || !config.token) {
        Utils.Logger.warn('TranscriptionService', 'DeepGram token not configured - transcription disabled');
        return false;
      }

      isInitialized = true;
      Utils.Logger.info('TranscriptionService', 'Transcription service initialized');
      return true;
    },

    // Start transcription for new segment
    startNewSegment: function() {
      Utils.Logger.info('TranscriptionService', 'Starting fresh transcription for new segment');
      
      // DEBUG: Check global transcript before stopping
      var transcriptBefore = window.global_transcript || '';
      Utils.Logger.info('TranscriptionService', '🔍 BEFORE STOP - global_transcript: "' + transcriptBefore + '" (length: ' + transcriptBefore.length + ')');

      // CRITICAL: Ensure clean state by stopping any existing transcription
      this.stop();
      
      // DEBUG: Check global transcript after stopping
      var transcriptAfter = window.global_transcript || '';
      Utils.Logger.info('TranscriptionService', '🔍 AFTER STOP - global_transcript: "' + transcriptAfter + '" (length: ' + transcriptAfter.length + ')');
      
      Utils.Logger.info('TranscriptionService', 'Previous transcription cleaned up');

      var config = GlobalRegistry.getConfig();

      // Get the video element and stream
      var questionName = config.questionName;
      var videoEl = document.getElementById('pipeVideoInput-' + questionName);

      if (!videoEl) {
        Utils.Logger.error('TranscriptionService', 'Video element not found: pipeVideoInput-' + questionName);
        return;
      }

      // Get stream from video element
      if (videoEl.srcObject !== undefined) {
        stream = videoEl.srcObject;
      } else if (videoEl.mozSrcObject !== undefined) {
        stream = videoEl.mozSrcObject;
      } else if (videoEl.src !== undefined) {
        stream = videoEl.src;
      } else {
        Utils.Logger.error('TranscriptionService', 'Could not get stream from video element');
        return;
      }

      Utils.Logger.info('TranscriptionService', 'Creating fresh MediaRecorder and WebSocket for segment');
      
      // DEBUG: Check global transcript before creating WebSocket
      var transcriptBeforeWS = window.global_transcript || '';
      Utils.Logger.info('TranscriptionService', '🔍 BEFORE WEBSOCKET - global_transcript: "' + transcriptBeforeWS + '" (length: ' + transcriptBeforeWS.length + ')');

      // Create MediaRecorder for audio transcription
      var audioStream = new MediaStream(stream.getAudioTracks());
      mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      // Set up MediaRecorder event handlers
      mediaRecorder.addEventListener('dataavailable', function(event) {
        if (event.data.size > 0 && websocket && websocket.readyState === WebSocket.OPEN) {
          Utils.Logger.debug('TranscriptionService', 'Sending audio chunk to DeepGram: ' + event.data.size + ' bytes');
          websocket.send(event.data);
        }
      });

      mediaRecorder.addEventListener('stop', function() {
        Utils.Logger.info('TranscriptionService', 'MediaRecorder stopped for segment');
      });

      mediaRecorder.addEventListener('error', function(event) {
        Utils.Logger.error('TranscriptionService', 'MediaRecorder error: ' + event.error);
      });

      // Create DeepGram WebSocket connection
      this.createWebSocket(config);

      // Start MediaRecorder when WebSocket is ready
      if (websocket) {
        websocket.onopen = function() {
          Utils.Logger.info('TranscriptionService', 'DeepGram WebSocket connected for segment');

          // Send keepalive message to prevent timeout
          keepAliveInterval = setInterval(function() {
            if (websocket && websocket.readyState === WebSocket.OPEN) {
              websocket.send(JSON.stringify({ type: 'KeepAlive' }));
              Utils.Logger.debug('TranscriptionService', 'Sent KeepAlive to DeepGram');
            } else {
              if (keepAliveInterval) {
                clearInterval(keepAliveInterval);
                keepAliveInterval = null;
              }
            }
          }, 8000); // Send every 8 seconds

          // Start MediaRecorder when WebSocket is ready
          var timeslice = 1000;
          mediaRecorder.start(timeslice);
          Utils.Logger.info('TranscriptionService', 'MediaRecorder started for segment');
        };
      }
    },

    // Create DeepGram WebSocket connection
    createWebSocket: function(config) {
      if (!config.deepgram.token) {
        Utils.Logger.warn('TranscriptionService', 'DeepGram token not configured');
        return null;
      }

      Utils.Logger.info('TranscriptionService', 'Creating DeepGram WebSocket connection');

      try {
        // Use protocol-based auth with modern API parameters
        websocket = new WebSocket(
          'wss://api.deepgram.com/v1/listen?model=nova-3&language=en-US&smart_format=true&interim_results=true',
          ['token', config.deepgram.token]
        );

        websocket.onmessage = function(msg) {
          try {
            var data = JSON.parse(msg.data);

            // Handle different response types
            if (data.type === 'Results') {
              var transcript = data.channel.alternatives[0].transcript;
              if (transcript) {
                if (data.is_final) {
                  Utils.Logger.info('TranscriptionService', 'Final transcript: ' + transcript);
                  window.global_transcript = (window.global_transcript || '') + transcript + ' ';
                } else {
                  Utils.Logger.debug('TranscriptionService', 'Interim transcript: ' + transcript);
                }
              }
            } else if (data.type === 'Metadata') {
              Utils.Logger.debug('TranscriptionService', 'DeepGram Metadata: ' + JSON.stringify(data));
            }
          } catch (error) {
            Utils.Logger.error('TranscriptionService', 'Error parsing DeepGram response', error);
          }
        };

        websocket.onerror = function(error) {
          Utils.Logger.error('TranscriptionService', 'DeepGram WebSocket error', error);
        };

        websocket.onclose = function(event) {
          Utils.Logger.info('TranscriptionService', 'DeepGram WebSocket closed: ' + event.code + ' ' + event.reason);

          // Clean up keepalive interval
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
          }
        };

        Utils.Logger.info('TranscriptionService', 'DeepGram WebSocket created successfully');
        return websocket;

      } catch (error) {
        Utils.Logger.error('TranscriptionService', 'Failed to create DeepGram WebSocket', error);
        websocket = null;
        return null;
      }
    },

    // Stop transcription
    stop: function() {
      Utils.Logger.info('TranscriptionService', 'Stopping transcription service');

      var stoppedComponents = [];

      // Stop MediaRecorder
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        stoppedComponents.push('MediaRecorder');
      }

      // Close WebSocket
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.close();
        stoppedComponents.push('WebSocket');
      }

      // Clear keepalive interval
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        stoppedComponents.push('KeepAlive');
      }

      // Reset references
      mediaRecorder = null;
      websocket = null;
      stream = null;

      Utils.Logger.info('TranscriptionService', 'Transcription stopped - cleaned up: ' + stoppedComponents.join(', '));
    },

    // Get current transcript
    getTranscript: function() {
      return window.global_transcript || '';
    },

    // Get transcription info for debugging
    getInfo: function() {
      return {
        initialized: isInitialized,
        hasMediaRecorder: !!mediaRecorder,
        mediaRecorderState: mediaRecorder ? mediaRecorder.state : 'none',
        hasWebSocket: !!websocket,
        webSocketState: websocket ? websocket.readyState : 'none',
        hasKeepAlive: !!keepAliveInterval,
        transcriptLength: this.getTranscript().length
      };
    },

    // State change handler (simplified - no longer managing transcription via state)
    onStateChange: function(oldState, newState, data) {
      Utils.Logger.debug('TranscriptionService', 'State change: ' + oldState + ' -> ' + newState);
      
      // Transcription is now managed explicitly by ConversationManager
      // No automatic start/stop based on state changes
      switch (newState) {
        case StateManager.getStates().COMPLETE:
          // Only stop on final completion
          this.stop();
          break;
      }
    },

    // Cleanup
    cleanup: function() {
      Utils.Logger.info('TranscriptionService', 'Cleaning up transcription service');
      this.stop();
      Utils.Logger.info('TranscriptionService', 'Transcription service cleanup complete');
    }
  };

  // Export TranscriptionService
  return TranscriptionService;

})();
