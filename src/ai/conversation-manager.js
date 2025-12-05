// Conversation Manager - AI-driven interview flow management
// No template literals used - only string concatenation

var ConversationManager = (function() {

  var Utils = window.Utils;
  var GlobalRegistry = window.GlobalRegistry;
  var StateManager = window.StateManager;

  // Conversation Manager API
  var ConversationManager = {

    // Initialize conversation manager
    initialize: function(questionName, recorderObject, config) {
      this.questionName = questionName;
      this.recorderObject = recorderObject;
      this.config = config;
      this.segments = [];
      this.conversationThread = [];
      this.currentProbeCount = 0;
      this.maxProbes = this.getMaxProbes();
      this.conversationStartTime = null;
      this.currentSegmentStartTime = null;
      this.isProcessingAI = false;
      this.conversationActive = false;
      this.conversationId = questionName + '_' + Date.now();
      this.accumulatedTranscript = '';
      this.currentAIQuestion = config.questionText;
      this.timerPausedAt = null;

      Utils.Logger.info('ConversationManager', 'Conversation manager initialized for: ' + questionName);
    },

    // Get maximum probes based on configuration
    getMaxProbes: function() {
      var probingAmount = this.config.probingAmount;
      var maxProbesByLevel = {
        'None': 0,
        'Moderate': 3,
        'Deep': 5
      };

      return maxProbesByLevel[probingAmount] || 0;
    },

    // Start conversation
    startConversation: function() {
      Utils.Logger.info('ConversationManager', 'DECISION POINT: Starting conversation');

      // CRITICAL: Set conversation state in both places
      this.conversationActive = true;
      StateManager.setConversationActive();
      this.conversationStartTime = performance.now();
      this.currentSegmentStartTime = 0;

      Utils.Logger.info('ConversationManager', 'Conversation state activated for continuous recording');
      Utils.Logger.debug('ConversationManager', 'Max probes allowed: ' + this.maxProbes);

      // Add initial question to thread
      this.conversationThread.push({
        role: 'assistant',
        content: this.config.questionText
      });

      // Display initial question in UI
      this.displayQuestion(this.config.questionText);

      Utils.Logger.info('ConversationManager', 'Conversation started: ' + this.conversationId);
    },

    // Display question in UI
    displayQuestion: function(question) {
      var titleElement = Utils.DOM.select('#dynamic-question-title');
      var descElement = Utils.DOM.select('#dynamic-question-description');

      if (titleElement && titleElement.length > 0) {
        titleElement.fadeOut(200, function() {
          titleElement.text(question).fadeIn(200);
        });
      }

      if (descElement && descElement.length > 0) {
        descElement.text('Click record when ready to respond.');
      }

      Utils.Logger.debug('ConversationManager', 'Question displayed: ' + question);
    },

    // Get current segment transcript
    getCurrentSegmentTranscript: function() {
      var fullTranscript = window.global_transcript || '';
      var accumulatedLength = this.accumulatedTranscript.length;
      return fullTranscript.substring(accumulatedLength).trim();
    },

    // Mark segment end and create segment data
    markSegmentEnd: function() {
      Utils.Logger.info('ConversationManager', '📝 Marking segment end');
      
      var now = performance.now();
      var segmentEnd = (now - this.conversationStartTime) / 1000;
      
      // CRITICAL: Get current segment transcript BEFORE updating accumulated transcript
      var fullTranscript = window.global_transcript || '';
      var segmentTranscript = fullTranscript.substring(this.accumulatedTranscript.length).trim();
      
      Utils.Logger.info('ConversationManager', 'Segment transcript: "' + segmentTranscript + '"');

      var segment = {
        segmentId: this.segments.length + 1,
        aiQuestion: this.currentAIQuestion,
        startTime: this.currentSegmentStartTime,
        endTime: segmentEnd,
        duration: segmentEnd - this.currentSegmentStartTime,
        transcript: segmentTranscript,
        type: 'user_response'
      };

      this.segments.push(segment);
      this.conversationThread.push({
        role: 'user',
        content: segmentTranscript
      });

      // CRITICAL: Update accumulated transcript AFTER extracting segment transcript
      this.accumulatedTranscript = fullTranscript;

      Utils.Logger.info('ConversationManager', 'Segment ' + segment.segmentId + ' recorded - duration: ' + segment.duration.toFixed(1) + 's');
      return segment;
    },

    // Mark AI processing start
    markAIProcessingStart: function() {
      this.isProcessingAI = true;
      var now = performance.now();
      var processingStartTime = (now - this.conversationStartTime) / 1000;

      // Pause timer display
      var timerManager = GlobalRegistry.get('timerManager');
      if (timerManager) {
        timerManager.pause();
        this.timerPausedAt = Utils.DOM.select('.pipeTimer-custom').text();
      }

      Utils.Logger.info('ConversationManager', 'AI processing started');
      return processingStartTime;
    },

    // Mark AI processing end and show next question
    markAIProcessingEnd: function(nextQuestion) {
      this.isProcessingAI = false;
      var now = performance.now();
      this.currentSegmentStartTime = (now - this.conversationStartTime) / 1000;

      if (nextQuestion && nextQuestion !== 'DONE') {
        this.currentAIQuestion = nextQuestion;
        this.conversationThread.push({
          role: 'assistant',
          content: nextQuestion
        });
        this.currentProbeCount++;

        // Display next question
        this.displayQuestion(nextQuestion);
      }

      Utils.Logger.info('ConversationManager', 'AI processing ended, next question: ' + (nextQuestion || 'none'));
    },

    // Check if we should continue probing
    shouldContinueProbing: function() {
      if (this.config.probingAmount === 'None') return false;
      return this.currentProbeCount < this.maxProbes;
    },

    // End conversation
    endConversation: function() {
      Utils.Logger.info('ConversationManager', 'Ending conversation - segments: ' + this.segments.length + ', probes: ' + this.currentProbeCount + '/' + this.maxProbes);

      // CRITICAL: Stop transcription for final time
      var transcriptionService = GlobalRegistry.get('transcriptionService');
      if (transcriptionService) {
        transcriptionService.stop();
        Utils.Logger.info('ConversationManager', 'Final transcription stop - conversation ending');
      }

      // CRITICAL: Clear conversation state FIRST (both systems)
      Utils.Logger.info('ConversationManager', 'Clearing conversation active state');
      this.conversationActive = false;
      GlobalRegistry.setState('isConversationActive', false);
      
      // CRITICAL: Also clear StateManager conversation state so stop override allows the stop
      StateManager.transition(StateManager.getStates().COMPLETE);
      Utils.Logger.info('ConversationManager', 'StateManager conversation state cleared - stop will now be allowed');
      
      // CRITICAL: Hide AI processing UI first
      var elementController = GlobalRegistry.get('elementController');
      if (elementController) {
        elementController.hideProcessingState();
        Utils.Logger.info('ConversationManager', 'AI processing UI hidden - conversation complete');
      }
      
      // Show completion UI
      this.showConversationComplete();
      
      // NOW AddPipe stop will be allowed (conversation no longer active)
      Utils.Logger.info('ConversationManager', 'Triggering real AddPipe stop (continuous recording complete)');
      var pipeIntegration = GlobalRegistry.get('pipeIntegration');
      if (pipeIntegration && pipeIntegration.stopRecording) {
        pipeIntegration.stopRecording();
        Utils.Logger.info('ConversationManager', 'Real stop triggered successfully');
      } else {
        Utils.Logger.error('ConversationManager', 'Pipe integration not available for stop');
      }
    },

    // Show conversation complete UI
    showConversationComplete: function() {
      Utils.DOM.select('#dynamic-question-title').text('Interview Complete!');
      Utils.DOM.select('#dynamic-question-description').text('Thank you for your thoughtful responses. Finalizing your recording...');
    },

    // Pause recording for AI processing
    pauseForAIProcessing: function() {
      Utils.Logger.info('ConversationManager', 'Pausing for AI processing');

      // Check if we have a meaningful recording (at least 1 second)
      var currentDuration = this.segments.length === 0 ?
        (performance.now() - this.conversationStartTime) / 1000 :
        (performance.now() - this.conversationStartTime) / 1000 - this.currentSegmentStartTime;

      if (currentDuration < 1) {
        Utils.Logger.warn('ConversationManager', 'Recording too short, ignoring pause request');
        return;
      }

      // Step 1: Stop MediaRecorder only (keep WebSocket open for final transcripts)
      var transcriptionService = GlobalRegistry.get('transcriptionService');
      if (transcriptionService) {
        transcriptionService.stopRecording();
        Utils.Logger.info('ConversationManager', 'MediaRecorder stopped, waiting for final transcripts');
      }

      // Update UI to processing state immediately (so user sees feedback)
      var elementController = GlobalRegistry.get('elementController');
      if (elementController) {
        elementController.showProcessingState();
      }

      // Step 2: Wait 400ms for final transcripts from DeepGram, then continue
      var self = this;
      setTimeout(function() {
        Utils.Logger.info('ConversationManager', 'Transcript wait complete, proceeding with AI processing');

        // Now close WebSocket completely
        if (transcriptionService) {
          transcriptionService.stop();
          Utils.Logger.info('ConversationManager', 'Transcription stopped for AI processing');
        }

        // Mark segment end (now we have complete transcript)
        var segment = self.markSegmentEnd();

        // Mark AI processing start
        self.markAIProcessingStart();

        // Check if we should continue
        if (!self.shouldContinueProbing()) {
          Utils.Logger.info('ConversationManager', 'Max probes reached, ending conversation');
          self.endConversation();
          return;
        }

        // Get AI response
        self.processWithAI();
      }, 400);
    },

    // Process response with AI
    processWithAI: function() {
      Utils.Logger.info('ConversationManager', 'Processing with AI');

      try {
        var aiService = GlobalRegistry.get('aiService');
        if (!aiService) {
          throw new Error('AI service not available');
        }

        // Get AI response
        aiService.getFollowUpQuestion(this).then(function(aiResponse) {
          if (aiResponse.error) {
            Utils.Logger.error('ConversationManager', 'AI error, ending conversation', aiResponse.error);
            ConversationManager.endConversation();
            return;
          }

          if (!aiResponse.hasMoreQuestions) {
            Utils.Logger.info('ConversationManager', 'AI satisfied with responses, ending conversation');
            ConversationManager.endConversation();
            return;
          }

          // Mark AI processing end and show next question
          ConversationManager.markAIProcessingEnd(aiResponse.question);

          // Prepare for next segment
          ConversationManager.prepareForNextSegment();

          // Show the next question
          ConversationManager.showNextQuestion(aiResponse.question);

        }).catch(function(error) {
          Utils.Logger.error('ConversationManager', 'AI processing error', error);
          ConversationManager.endConversation();
        });

      } catch (error) {
        Utils.Logger.error('ConversationManager', 'Error in AI processing', error);
        this.endConversation();
      }
    },

    // Prepare for next segment
    prepareForNextSegment: function() {
      Utils.Logger.info('ConversationManager', 'Preparing for next recording segment');

      // Reset recording flags
      GlobalRegistry.setState('isRecording', false);

      // Clear any existing intervals
      var timerManager = GlobalRegistry.get('timerManager');
      if (timerManager) {
        timerManager.reset();
      }

      // Reset WebSocket and MediaRecorder references
      GlobalRegistry.setState('ws', null);
      GlobalRegistry.setState('mediaRecorder', null);

      // Ensure timer display shows paused time
      if (this.timerPausedAt) {
        Utils.DOM.select('.pipeTimer-custom').text(this.timerPausedAt);
      }

      Utils.Logger.info('ConversationManager', 'Ready for next segment');
    },

    // Show next question
    showNextQuestion: function(question) {
      Utils.Logger.info('ConversationManager', 'Showing next question: ' + question);

      // Hide AI processing UI
      var elementController = GlobalRegistry.get('elementController');
      if (elementController) {
        elementController.hideProcessingState();
      }

      // Update question display with fade effect
      var titleElement = Utils.DOM.select('#dynamic-question-title');
      if (titleElement && titleElement.length > 0) {
        titleElement.fadeOut(200, function() {
          titleElement.text(question).fadeIn(200);
        });
      }

      Utils.DOM.select('#dynamic-question-description').text('Click record when ready to respond.');

      // CRITICAL: Reset AddPipe button state to record mode and ensure visibility
      var pipeIntegration = GlobalRegistry.get('pipeIntegration');
      if (pipeIntegration) {
        try {
          var recordButton = Utils.DOM.select('#pipeRec-' + this.questionName);

          // Remove all state classes
          recordButton.removeClass('pipeRecStop pipeRecRec');

          // Set record button appearance using AddPipe's expected SVG
          var svgHtml = '<svg style="enable-background:new 0 0 16 16;" version="1.1" width="30" height="30" viewBox="0 0 100 100" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
            '<circle cx="50" cy="50" r="30" fill="red"></circle>' +
            '<circle cx="50" cy="50" r="40" stroke="black" stroke-width="8" fill="none"></circle>' +
            '</svg>';

          recordButton.html(svgHtml);

          // Force visibility and enable
          recordButton.css({
            'display': 'block',
            'visibility': 'visible',
            'opacity': '1',
            'pointer-events': 'auto'
          }).prop('disabled', false).show();

          // CRITICAL: Reset AddPipe's internal state and button attributes
          recordButton.attr('title', 'record');
          recordButton.removeClass('pipeBtn').addClass('pipeBtn');

          // Reset menu state
          var menu = Utils.DOM.select('#pipeMenu-' + this.questionName);
          if (menu && menu.length > 0) {
            menu.removeClass('recording-state ai-processing-state').addClass('ready-state');
          }

          Utils.Logger.info('ConversationManager', 'AddPipe button reset to record mode');
        } catch (e) {
          Utils.Logger.error('ConversationManager', 'Error resetting button state', e);
        }
      }
    },

    // Start new recording segment
    startNewSegment: function() {
      Utils.Logger.info('ConversationManager', 'Starting new recording segment');

      // Update UI to recording state
      var elementController = GlobalRegistry.get('elementController');
      if (elementController) {
        elementController.setRecordingState();
      }

      // Start timer
      var timerManager = GlobalRegistry.get('timerManager');
      if (timerManager) {
        timerManager.start();
      }

      // Start new transcription session
      var transcriptionService = GlobalRegistry.get('transcriptionService');
      if (transcriptionService) {
        transcriptionService.startNewSegment();
      }

      Utils.Logger.info('ConversationManager', 'New segment started');
    },

    // Get conversation metadata
    getMetadata: function(fullVideoUrl) {
      var now = performance.now();
      var totalDuration = (now - this.conversationStartTime) / 1000;

      return {
        conversationId: this.conversationId,
        responseId: (typeof Qualtrics !== 'undefined') ? Qualtrics.SurveyEngine.getEmbeddedData('ResponseID') : 'preview',
        questionConfig: this.config,
        totalDuration: totalDuration,
        recordingStartTime: new Date(Date.now() - (now - this.conversationStartTime)).toISOString(),
        recordingEndTime: new Date().toISOString(),
        fullVideoUrl: fullVideoUrl,
        segments: this.segments,
        aiProcessingGaps: this.calculateProcessingGaps(),
        totalProbes: this.currentProbeCount,
        completionReason: this.currentProbeCount >= this.maxProbes ? 'max_probes_reached' : 'ai_satisfied',
        accumulatedTranscript: this.accumulatedTranscript,
        conversationThread: this.conversationThread,
        errors: []
      };
    },

    // Calculate AI processing gaps
    calculateProcessingGaps: function() {
      var gaps = [];
      for (var i = 0; i < this.segments.length - 1; i++) {
        gaps.push({
          gapId: i + 1,
          afterSegment: this.segments[i].segmentId,
          startTime: this.segments[i].endTime,
          endTime: this.segments[i + 1].startTime,
          duration: this.segments[i + 1].startTime - this.segments[i].endTime,
          type: 'ai_processing'
        });
      }
      return gaps;
    },

    // Get conversation info for debugging
    getInfo: function() {
      return {
        conversationId: this.conversationId,
        active: this.conversationActive,
        segments: this.segments.length,
        currentProbeCount: this.currentProbeCount,
        maxProbes: this.maxProbes,
        currentQuestion: this.currentAIQuestion,
        isProcessing: this.isProcessingAI,
        transcriptLength: this.accumulatedTranscript.length
      };
    },

    // State change handler
    onStateChange: function(oldState, newState, data) {
      Utils.Logger.debug('ConversationManager', 'State change: ' + oldState + ' -> ' + newState);

      // Conversation manager is primarily event-driven
    },

    // Cleanup
    cleanup: function() {
      Utils.Logger.info('ConversationManager', 'Cleaning up conversation manager');

      this.conversationActive = false;
      this.segments = [];
      this.conversationThread = [];
      this.currentProbeCount = 0;
      this.isProcessingAI = false;

      Utils.Logger.info('ConversationManager', 'Conversation manager cleanup complete');
    }
  };

  // Export ConversationManager
  return ConversationManager;

})();
