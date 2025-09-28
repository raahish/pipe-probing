var isRecording = false;
var global_transcript = '';
var defaultThumbnail = 'https://d2kltgp8v5sml0.cloudfront.net/templates/svg/gallary.svg';
var streamTime = '';
var recorderObjectGlobal;
var isBackTOcamera = false;
var intervalID;
var ws;
var mediaRecorder;
var stream;
var S3_BASE_URL = 'https://s3.us-east-1.amazonaws.com/com.knit.pipe-recorder-videos/';

// Conversation state variables
var isConversationActive = false;
var shouldActuallyStop = false;
var conversationManager = null;
var aiService = null;
var accumulatedTranscript = ""; // Full conversation transcript
var currentSegmentTranscript = ""; // Current segment only
var fakeStopButtonActive = false;
var originalStopHandler = null;
var conversationStartTime = null;
var segmentStartTime = null;

// UI State Management
const UI_STATES = {
  INITIAL: 'initial',
  RECORDING: 'recording',
  RECORDED: 'recorded',
  READY_TO_RECORD: 'ready',
  PLAYING: 'playing'
};

// Element Controller for clean UI management
class ElementController {
  constructor(questionName) {
    this.questionName = questionName;
    this.elements = {
      recordButton: '#pipeRec-' + questionName,
      nativePlayButton: '#pipePlay-' + questionName,
      customPlayButton: '.play-custom-btn',
      timer: '.pipeTimer-custom',
      nativeTimer: '.pipeTimer',
      backButton: '.back-to-camera',
      menu: '#pipeMenu-' + questionName
    };
  }

  // Atomic operations - each does ONE thing clearly
  forceHideElement(selector) {
    jQuery(selector).attr('style', 'display: none !important; opacity: 0 !important;');
  }
  
  showElement(selector) {
    jQuery(selector).show().css('opacity', '1');
  }
  
  hideElement(selector) {
    jQuery(selector).hide();
  }
  
  removeElement(selector) {
    jQuery(selector).remove();
  }
  
  // High-level state operations
  setReadyToRecordState() {
    console.log('ElementController: Setting ready-to-record state');
    this.showElement(this.elements.recordButton);
    this.forceHideElement(this.elements.nativePlayButton); // Aggressive hiding
    this.removeElement(this.elements.customPlayButton);
    this.removeElement(this.elements.backButton);
    this.hideElement(this.elements.timer);
    this.hideElement(this.elements.nativeTimer);
    jQuery(this.elements.menu).removeClass('playback-state recording-state');
  }
  
  setReadyToRecordWithVideoState() {
    console.log('ElementController: Setting ready-to-record-with-video state');
    this.setReadyToRecordState(); // Start clean
    // Add custom play button for existing video
    jQuery(this.elements.menu).append(
      '<button class="play-custom-btn" id="time-span" onClick="playVideoCustom()" title="Preview existing recording"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5,3 19,12 5,21"/></svg><span style="font-size: 0.75rem; margin-top: 0.25rem;"></span></button>'
    );
  }
}

// Conversation Manager for AI-driven interviews
class ConversationManager {
  constructor(questionName, recorderObject, config) {
    this.questionName = questionName;
    this.recorderObject = recorderObject;
    this.config = config;
    this.segments = [];
    this.conversationThread = [];
    this.currentProbeCount = 0;
    this.maxProbes = window.maxProbesByLevel[config.probingAmount] || 0;
    this.conversationStartTime = null;
    this.currentSegmentStartTime = null;
    this.isProcessingAI = false;
    this.conversationActive = false;
    this.conversationId = questionName + '_' + Date.now();
    this.accumulatedTranscript = "";
    this.currentAIQuestion = config.questionText;
    this.timerPausedAt = null;
  }

  startConversation() {
    this.conversationActive = true;
    this.conversationStartTime = performance.now();
    this.currentSegmentStartTime = 0;
    
    // Add initial question to thread
    this.conversationThread.push({
      role: "assistant",
      content: this.config.questionText
    });
    
    // Display initial question in UI
    this.displayQuestion(this.config.questionText);
    
    console.log('🎬 Conversation started:', this.conversationId);
  }

  getCurrentSegmentTranscript() {
    // Return the transcript since the last segment ended
    const fullTranscript = window.global_transcript || '';
    const accumulatedLength = this.accumulatedTranscript.length;
    return fullTranscript.substring(accumulatedLength).trim();
  }

  markSegmentEnd() {
    const now = performance.now();
    const segmentEnd = (now - this.conversationStartTime) / 1000;
    const segmentTranscript = this.getCurrentSegmentTranscript();
    
    // Update accumulated transcript
    this.accumulatedTranscript = window.global_transcript || '';
    
    const segment = {
      segmentId: this.segments.length + 1,
      aiQuestion: this.currentAIQuestion,
      startTime: this.currentSegmentStartTime,
      endTime: segmentEnd,
      duration: segmentEnd - this.currentSegmentStartTime,
      transcript: segmentTranscript,
      type: "user_response"
    };
    
    this.segments.push(segment);
    this.conversationThread.push({
      role: "user",
      content: segmentTranscript
    });
    
    console.log('📝 Segment ' + segment.segmentId + ' recorded:', segment);
    return segment;
  }

  markAIProcessingStart() {
    this.isProcessingAI = true;
    const now = performance.now();
    const processingStartTime = (now - this.conversationStartTime) / 1000;
    
    // Pause timer display
    this.timerPausedAt = jQuery('.pipeTimer-custom').text();
    
    return processingStartTime;
  }

  markAIProcessingEnd(nextQuestion) {
    this.isProcessingAI = false;
    const now = performance.now();
    this.currentSegmentStartTime = (now - this.conversationStartTime) / 1000;
    
    if (nextQuestion && nextQuestion !== "DONE") {
      this.currentAIQuestion = nextQuestion;
      this.conversationThread.push({
        role: "assistant",
        content: nextQuestion
      });
      this.currentProbeCount++;
    }
  }

  shouldContinueProbing() {
    if (this.config.probingAmount === "None") return false;
    return this.currentProbeCount < this.maxProbes;
  }

  async endConversation() {
    this.conversationActive = false;
    window.shouldActuallyStop = true;
    
    console.log('🏁 Ending conversation, triggering real stop');
    
    // Show completion UI
    this.showConversationComplete();
    
    // Trigger the actual stop using the correct method
    if (this.recorderObject && this.recorderObject.btStopRecordingPressed) {
      this.recorderObject.btStopRecordingPressed();
    } else {
      console.error('❌ Recorder stop method not available');
    }
  }

  showConversationComplete() {
    jQuery('#dynamic-question-title').text('Interview Complete!');
    jQuery('#dynamic-question-description').text('Thank you for your thoughtful responses. Finalizing your recording...');
  }

  displayQuestion(question) {
    jQuery('#dynamic-question-title').text(question);
    jQuery('#dynamic-question-description').text('Click record when ready to respond.');
  }

  getMetadata(fullVideoUrl) {
    const now = performance.now();
    const totalDuration = (now - this.conversationStartTime) / 1000;
    
    return {
      conversationId: this.conversationId,
      responseId: Qualtrics.SurveyEngine.getEmbeddedData('ResponseID') || 'preview',
      questionConfig: this.config,
      totalDuration: totalDuration,
      recordingStartTime: new Date(Date.now() - (now - this.conversationStartTime)).toISOString(),
      recordingEndTime: new Date().toISOString(),
      fullVideoUrl: fullVideoUrl,
      segments: this.segments,
      aiProcessingGaps: this.calculateProcessingGaps(),
      totalProbes: this.currentProbeCount,
      completionReason: this.currentProbeCount >= this.maxProbes ? "max_probes_reached" : "ai_satisfied",
      accumulatedTranscript: this.accumulatedTranscript,
      conversationThread: this.conversationThread,
      errors: []
    };
  }

  calculateProcessingGaps() {
    const gaps = [];
    for (let i = 0; i < this.segments.length - 1; i++) {
      gaps.push({
        gapId: i + 1,
        afterSegment: this.segments[i].segmentId,
        startTime: this.segments[i].endTime,
        endTime: this.segments[i + 1].startTime,
        duration: this.segments[i + 1].startTime - this.segments[i].endTime,
        type: "ai_processing"
      });
    }
    return gaps;
  }
}

// AI Service for OpenAI integration
class AIService {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model || 'gpt-4';
    this.maxRetries = 2;
    this.retryDelay = 1000; // 1 second
  }

  async getFollowUpQuestion(conversationManager) {
    let lastError = null;
    
    // Retry logic for API calls
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log('🤖 AI Service: Attempt ' + attempt + '/' + this.maxRetries);
        
        const systemPrompt = this.buildSystemPrompt(conversationManager.config, conversationManager.currentProbeCount);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + this.apiKey
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: "system", content: systemPrompt },
              ...conversationManager.conversationThread
            ],
            temperature: 0.7,
            max_tokens: 200,
            response_format: { type: "json_object" }
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error('OpenAI API error: ' + response.status + ' - ' + errorData);
        }

        const data = await response.json();
        const aiResponseText = data.choices[0].message.content;
        
        // Parse the response
        const aiResponse = this.parseAIResponse(aiResponseText);
        
        console.log('🤖 AI Response:', aiResponse);
        return aiResponse;
        
      } catch (error) {
        console.error('❌ AI Service Error (attempt ' + attempt + '):', error);
        lastError = error;
        
        // If not the last attempt, wait before retrying
        if (attempt < this.maxRetries) {
          console.log('⏳ Retrying in ' + this.retryDelay + 'ms...');
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
    
    // All attempts failed
    console.error('❌ All AI Service attempts failed:', lastError);
    return { 
      hasMoreQuestions: false, 
      error: lastError.message,
      shouldContinue: false 
    };
  }

  parseAIResponse(responseText) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(responseText);
      
      // Handle different response formats
      if (parsed.isDone === true || parsed.done === true) {
        return {
          hasMoreQuestions: false,
          question: null,
          reasoning: parsed.reasoning || "Interview complete",
          shouldContinue: false
        };
      }
      
      if (parsed.hasMoreQuestions === true && parsed.question) {
        return {
          hasMoreQuestions: true,
          question: parsed.question.trim(),
          reasoning: parsed.reasoning || null,
          shouldContinue: true
        };
      }
      
      // Fallback: if we have a question field, use it
      if (parsed.question) {
        return {
          hasMoreQuestions: true,
          question: parsed.question.trim(),
          reasoning: parsed.reasoning || null,
          shouldContinue: true
        };
      }
      
    } catch (jsonError) {
      console.warn('⚠️ Failed to parse AI response as JSON:', jsonError);
      
      // Fallback: treat as plain text question
      const cleanText = responseText.trim();
      if (cleanText.length > 0 && !this.isCompletionResponse(cleanText)) {
        return {
          hasMoreQuestions: true,
          question: cleanText,
          reasoning: "Parsed as plain text",
          shouldContinue: true
        };
      }
    }
    
    // Default: no more questions
    return {
      hasMoreQuestions: false,
      question: null,
      reasoning: "Could not parse response",
      shouldContinue: false
    };
  }

  isCompletionResponse(text) {
    const lowerText = text.toLowerCase();
    const completionKeywords = [
      'no more questions',
      'interview complete',
      'sufficient information',
      'thoroughly answered',
      'done',
      'finished',
      'complete'
    ];
    
    return completionKeywords.some(keyword => lowerText.includes(keyword));
  }

  buildSystemPrompt(questionConfig, currentProbeCount) {
    const systemPromptBase = window.probingSystemPrompts[questionConfig.probingAmount] || '';
    const maxQuestions = window.maxProbesByLevel[questionConfig.probingAmount] || 0;
    const remainingQuestions = maxQuestions - currentProbeCount;
    
    return systemPromptBase + '\n\n' +
      'Original Question: "' + questionConfig.questionText + '"\n' +
      'Probing Instructions: "' + questionConfig.probingInstructions + '"\n' +
      'Questions asked so far: ' + currentProbeCount + '\n' +
      'Maximum questions allowed: ' + maxQuestions + '\n' +
      'Remaining questions: ' + remainingQuestions + '\n\n' +
      'RESPONSE FORMAT: You must respond with valid JSON only. Use one of these formats:\n\n' +
      '1. To ask a follow-up question:\n' +
      '{\n' +
      '  "hasMoreQuestions": true,\n' +
      '  "question": "Your specific follow-up question here",\n' +
      '  "reasoning": "Brief explanation of why this question is needed"\n' +
      '}\n\n' +
      '2. To end the interview:\n' +
      '{\n' +
      '  "isDone": true,\n' +
      '  "reasoning": "Explanation of why the interview is complete"\n' +
      '}\n\n' +
      'DECISION CRITERIA:\n' +
      '- If the user has thoroughly answered the original question AND satisfied the probing instructions → End interview\n' +
      '- If you\'ve reached the maximum number of questions (' + maxQuestions + ') → End interview\n' +
      '- If more information is needed AND questions remain → Ask follow-up\n' +
      '- Be conversational and reference specific things the user said\n' +
      '- Focus on the probing instructions: "' + questionConfig.probingInstructions + '"\n\n' +
      'Remember: Respond with JSON only, no additional text.';
  }

  // Utility method to validate API key
  isConfigured() {
    return this.apiKey && this.apiKey !== 'sk-...' && this.apiKey.startsWith('sk-');
  }

  // Method to test API connectivity
  async testConnection() {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }
    
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': 'Bearer ' + this.apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error('API test failed: ' + response.status);
      }
      
      console.log('✅ OpenAI API connection successful');
      return true;
    } catch (error) {
      console.error('❌ OpenAI API connection failed:', error);
      throw error;
    }
  }
}

// Fake Stop Button Management
function initializeFakeStopButton() {
  console.log('🔴 Initializing fake stop button system');
  
  // Store reference to original Pipe stop handler
  if (window.recorderObjectGlobal && window.recorderObjectGlobal.btStopRecordingPressed) {
    window.originalStopHandler = window.recorderObjectGlobal.btStopRecordingPressed;
  }
  
  // Create fake stop button
  const fakeStopBtn = jQuery(
    '<button class="fake-stop-button" id="fake-stop-' + questionName + '" style="display: none;">' +
      '<svg viewBox="0 0 24 24">' +
        '<rect x="6" y="6" width="12" height="12" fill="currentColor"/>' +
      '</svg>' +
    '</button>'
  );
  
  // Add to pipe menu
  jQuery('#pipeMenu-' + questionName).append(fakeStopBtn);
  
  // Handle fake stop click
  fakeStopBtn.on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.conversationManager && window.conversationManager.conversationActive) {
      console.log('🛑 Fake stop clicked - pausing for AI');
      pauseForAIProcessing();
    }
  });
  
  // Override native stop button clicks during conversation
  jQuery(document).on('click.conversation', '[id^="pipeRec-"]', function(e) {
    console.log('🔍 Record button clicked - checking interception conditions');
    console.log('  - conversationManager exists:', !!window.conversationManager);
    console.log('  - conversationActive:', window.conversationManager?.conversationActive);
    console.log('  - isRecording:', window.isRecording);
    console.log('  - recorderState:', window.recorderObjectGlobal?.getState?.());
    
    // Only intercept if we're in an active conversation and currently recording
    if (window.conversationManager && 
        window.conversationManager.conversationActive && 
        window.isRecording && 
        window.recorderObjectGlobal &&
        window.recorderObjectGlobal.getState && 
        window.recorderObjectGlobal.getState() === 'recording') {
      console.log('🚫 Intercepting native stop button click');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Trigger fake stop instead
      pauseForAIProcessing();
      return false;
    }
    
    console.log('✅ Allowing normal button behavior');
  });
}

// Function to show/hide fake stop button
function toggleFakeStopButton(show) {
  const fakeBtn = jQuery('#fake-stop-' + questionName);
  const nativeBtn = jQuery('#pipeRec-' + questionName);
  
  if (show) {
    // Hide native, show fake
    nativeBtn.css({
      'opacity': '0',
      'pointer-events': 'none'
    });
    fakeBtn.show();
  } else {
    // Show native, hide fake
    nativeBtn.css({
      'opacity': '1',
      'pointer-events': 'auto'
    });
    fakeBtn.hide();
  }
}

// Pause recording for AI processing
async function pauseForAIProcessing() {
  console.log('⏸️ Pausing for AI processing');
  
  // Check if we have a meaningful recording (at least 1 second)
  const currentDuration = window.conversationManager.segments.length === 0 ? 
    (performance.now() - window.conversationManager.conversationStartTime) / 1000 :
    (performance.now() - window.conversationManager.conversationStartTime) / 1000 - window.conversationManager.currentSegmentStartTime;
    
  if (currentDuration < 1) {
    console.warn('⚠️ Recording too short, ignoring pause request');
    return;
  }
  
  // Mark segment end
  const segment = window.conversationManager.markSegmentEnd();
  
  // Close transcription WebSocket
  if (window.ws && window.ws.readyState === WebSocket.OPEN) {
    window.ws.close();
  }
  
  // Stop MediaRecorder
  if (window.mediaRecorder && window.mediaRecorder.state !== 'inactive') {
    window.mediaRecorder.stop();
  }
  
  // Clear recording interval
  if (window.intervalID) {
    clearInterval(window.intervalID);
  }
  
  // Reset recording state
  window.isRecording = false;
  
  // Hide fake stop button and reset its state
  toggleFakeStopButton(false);
  window.fakeStopButtonActive = false;
  
  // Update UI state
  showAIProcessingUI();
  
  // Mark AI processing start
  window.conversationManager.markAIProcessingStart();
  
  // Check if we should continue
  if (!window.conversationManager.shouldContinueProbing()) {
    console.log('📊 Max probes reached, ending conversation');
    await window.conversationManager.endConversation();
    return;
  }
  
  try {
    // Get AI response
    const aiResponse = await safeAICall(window.conversationManager);
    
    if (aiResponse.error) {
      console.error('❌ AI error, ending conversation:', aiResponse.error);
      await window.conversationManager.endConversation();
      return;
    }
    
    if (!aiResponse.hasMoreQuestions) {
      console.log('✅ AI satisfied with responses, ending conversation');
      await window.conversationManager.endConversation();
      return;
    }
    
    // Mark AI processing end and show next question
    window.conversationManager.markAIProcessingEnd(aiResponse.question);
    
    // Prepare for next segment
    prepareForNextSegment();
    
    // Show the next question
    showNextQuestion(aiResponse.question);
    
  } catch (error) {
    console.error('❌ Error in AI processing:', error);
    await window.conversationManager.endConversation();
  }
}

// UI Helper Functions for Conversational AI
function showAIProcessingUI() {
  console.log('🤔 Showing AI processing UI');
  
  // Add AI processing overlay
  const overlay = jQuery(
    '<div class="ai-processing-overlay">' +
      '<div class="ai-thinking-content">' +
        '<div class="ai-thinking-spinner"></div>' +
        '<h3>AI is thinking...</h3>' +
        '<p>Analyzing your response and preparing a follow-up question</p>' +
      '</div>' +
    '</div>'
  );
  
  jQuery('#pipeMenu-' + questionName).append(overlay);
  
  // Update state
  jQuery('#pipeMenu-' + questionName).addClass('ai-processing-state');
  
  // Update question description
  jQuery('#dynamic-question-description').text('Please wait while AI processes your response...');
}

function hideAIProcessingUI() {
  console.log('✨ Hiding AI processing UI');
  
  // Remove overlay
  jQuery('.ai-processing-overlay').fadeOut(300, function() {
    jQuery(this).remove();
  });
  
  // Update state
  jQuery('#pipeMenu-' + questionName).removeClass('ai-processing-state');
}

function showNextQuestion(question) {
  console.log('❓ Showing next question:', question);
  
  // Hide AI processing UI
  hideAIProcessingUI();
  
  // Update question display with fade effect
  jQuery('#dynamic-question-title').fadeOut(200, function() {
    jQuery(this).text(question).fadeIn(200);
  });
  
  jQuery('#dynamic-question-description').text('Click record when ready to respond.');
  
  // CRITICAL: Reset AddPipe button state to record mode and ensure visibility
  if (window.recorderObjectGlobal) {
    try {
      // Reset UI to record state with proper visibility
      const recordButton = jQuery('#pipeRec-' + questionName);
      
      // Remove all state classes
      recordButton.removeClass('pipeRecStop pipeRecRec');
      
      // Set record button appearance
      recordButton.html(
        '<svg viewBox="0 0 24 24" width="24" height="24">' +
        '<circle cx="12" cy="12" r="10" fill="currentColor"/>' +
        '</svg>'
      );
      
      // Force visibility and enable
      recordButton.css({
        'display': 'block',
        'visibility': 'visible',
        'opacity': '1',
        'pointer-events': 'auto'
      }).prop('disabled', false).show();
      
      // Reset menu state
      jQuery('#pipeMenu-' + questionName).removeClass('recording-state ai-processing-state').addClass('ready-state');
      
      // Ensure the button is in the DOM and visible
      setTimeout(() => {
        recordButton.show().css('display', 'block');
        console.log('🔍 Button visibility check:', recordButton.is(':visible'), recordButton.css('display'));
      }, 100);
      
      // CRITICAL FIX: Temporarily disable click interceptor for record mode
      jQuery(document).off('click.conversation');
      console.log('🔓 Disabled click interceptor - button ready for normal record behavior');
      
      console.log('✅ Reset AddPipe button to record mode with forced visibility');
    } catch (e) {
      console.error('❌ Error resetting button state:', e);
    }
  }
}

function updateTimerDisplay() {
  if (!window.conversationManager || !window.conversationManager.conversationStartTime) return;
  
  // Don't update if AI is processing
  if (window.conversationManager.isProcessingAI) {
    // Keep showing the paused time
    if (window.conversationManager.timerPausedAt) {
      jQuery('.pipeTimer-custom').text(window.conversationManager.timerPausedAt);
    }
    return;
  }
  
  const elapsed = (performance.now() - window.conversationManager.conversationStartTime) / 1000;
  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60);
  
  const timeString = (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  jQuery('.pipeTimer-custom').text(timeString);
}

// Modified startRecordingClicked to work with conversation
function startRecordingClicked() {
  console.log('🎙️ Recording started');
  
  // Only do retake cleanup if not in conversation or if we have segments (not first recording)
  if (!window.isConversationActive || (window.conversationManager && window.conversationManager.segments.length > 0)) {
    retake();
  }
  
  // Add timer if not exists
  if (jQuery('.pipeTimer-custom').length === 0) {
    jQuery('#pipeMenu-' + questionName).append('<div class="pipeTimer-custom">00:00</div>');
  }
  
  jQuery('.pipeTimer-custom').show();
  jQuery('#time-span').remove();
  
  // Use conversation-aware timer
  if (window.conversationManager && window.isConversationActive) {
    window.intervalID = setInterval(updateTimerDisplay, 1000);
  } else {
    // Fallback to original timer
    window.intervalID = setInterval(function() {
      getTime(recorderObjectGlobal);
    }, 100);
  }
}

// Start recording UI for conversation segments (without triggering AddPipe record)
function startRecordingUIForSegment() {
  console.log('🎬 Starting UI for new segment');
  
  // Update UI to recording state
  jQuery('#pipeMenu-' + questionName).removeClass('ready-state').addClass('recording-state');
  
  // Change button appearance to stop
  jQuery('#pipeRec-' + questionName).removeClass('pipeRecRec').addClass('pipeRecStop');
  jQuery('#pipeRec-' + questionName + ' svg').remove();
  jQuery('#pipeRec-' + questionName).html(
    '<svg viewBox="0 0 24 24" width="24" height="24">' +
    '<rect x="6" y="6" width="12" height="12" fill="currentColor"/>' +
    '</svg>'
  );
  
  // Show timer
  jQuery('.pipeTimer-custom').show();
  
  // Resume timer
  window.intervalID = setInterval(updateTimerDisplay, 1000);
  
  // Mark as recording
  window.isRecording = true;
  
  // Re-enable fake stop button
  if (!window.fakeStopButtonActive) {
    toggleFakeStopButton(true);
    window.fakeStopButtonActive = true;
  }
  
  // CRITICAL FIX: Re-enable click interceptor now that we're recording
  jQuery(document).on('click.conversation', '[id^="pipeRec-"]', function(e) {
    console.log('🔍 Record button clicked - checking interception conditions');
    console.log('  - conversationManager exists:', !!window.conversationManager);
    console.log('  - conversationActive:', window.conversationManager?.conversationActive);
    console.log('  - isRecording:', window.isRecording);
    console.log('  - recorderState:', window.recorderObjectGlobal?.getState?.());
    
    // Only intercept if we're in an active conversation and currently recording
    if (window.conversationManager && 
        window.conversationManager.conversationActive && 
        window.isRecording && 
        window.recorderObjectGlobal &&
        window.recorderObjectGlobal.getState && 
        window.recorderObjectGlobal.getState() === 'recording') {
      console.log('🚫 Intercepting native stop button click');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Trigger fake stop instead
      pauseForAIProcessing();
      return false;
    }
    
    console.log('✅ Allowing normal button behavior');
  });
  console.log('🔒 Re-enabled click interceptor - ready to intercept stop clicks');
  
  // Start new transcription session
  startTranscriptionForSegment();
}

// Clean up conversation state
function cleanupConversation() {
  console.log('🧹 Cleaning up conversation state');
  
  // Reset global flags
  window.isConversationActive = false;
  window.shouldActuallyStop = false;
  window.fakeStopButtonActive = false;
  
  // Remove fake stop button
  jQuery('#fake-stop-' + questionName).remove();
  
  // Remove ALL conversation event listeners
  jQuery(document).off('click.conversation');
  jQuery('#fake-stop-' + questionName).off('click');
  
  // Reset UI
  jQuery('#pipeMenu-' + questionName).removeClass('ai-processing-state conversation-active recording-state');
  toggleFakeStopButton(false);
  
  // Clear timers
  if (window.intervalID) {
    clearInterval(window.intervalID);
    window.intervalID = null;
  }
  
  // Close any open WebSocket
  if (window.ws && window.ws.readyState === WebSocket.OPEN) {
    window.ws.close();
  }
  
  // Stop any active MediaRecorder
  if (window.mediaRecorder && window.mediaRecorder.state !== 'inactive') {
    window.mediaRecorder.stop();
  }
  
  // Reset references
  window.ws = null;
  window.mediaRecorder = null;
  
  // Clear conversation manager references
  window.conversationManager = null;
  window.aiService = null;
  
  console.log('✅ Conversation cleanup complete');
}

// Error handling for conversation
function handleConversationError(error, context) {
  console.error('❌ Conversation error in ' + context + ':', error);
  
  // Log to conversation metadata
  if (window.conversationManager) {
    window.conversationManager.metadata.errors.push({
      context: context,
      error: error.message || error,
      timestamp: new Date().toISOString()
    });
  }
  
  // Show user-friendly error
  const errorMessages = {
    'ai_processing': 'AI service is temporarily unavailable. Completing your recording...',
    'websocket': 'Transcription service interrupted. Your video is still being recorded.',
    'recording': 'Recording error occurred. Please try again.',
    'validation': 'Unable to validate recording. Please try again.'
  };
  
  const message = errorMessages[context] || 'An error occurred. Completing your recording...';
  
  // Update UI
  jQuery('#dynamic-question-description').text(message);
  
  // Force end conversation if critical error
  if (context === 'ai_processing' || context === 'recording') {
    setTimeout(async () => {
      if (window.conversationManager && window.conversationManager.conversationActive) {
        await window.conversationManager.endConversation();
      }
    }, 2000);
  }
}

// Wrap AI calls with error handling
async function safeAICall(conversationManager) {
  try {
    return await window.aiService.getFollowUpQuestion(conversationManager);
  } catch (error) {
    handleConversationError(error, 'ai_processing');
    return { hasMoreQuestions: false, error: error.message };
  }
}

// Prepare recorder for next segment without stopping the video
function prepareForNextSegment() {
  console.log('🔄 Preparing for next recording segment');
  
  // Reset recording flags
  window.isRecording = false;
  
  // Clear any existing intervals
  if (window.intervalID) {
    clearInterval(window.intervalID);
    window.intervalID = null;
  }
  
  // Reset WebSocket and MediaRecorder references
  window.ws = null;
  window.mediaRecorder = null;
  
  // Ensure timer display shows paused time
  if (window.conversationManager && window.conversationManager.timerPausedAt) {
    jQuery('.pipeTimer-custom').text(window.conversationManager.timerPausedAt);
  }
  
  console.log('✅ Ready for next segment');
}

// Start transcription for a new conversation segment
function startTranscriptionForSegment() {
  console.log('🎤 Starting transcription for new segment');
  
  // Get the video element and stream
  const videoEl = document.getElementById('pipeVideoInput-' + questionName);
  getMobileOperatingSystem();
  
  if (videoEl.srcObject !== undefined) {
    stream = videoEl.srcObject;
  } else if (videoEl.mozSrcObject !== undefined) {
    stream = videoEl.mozSrcObject;
  } else if (videoEl.src !== undefined) {
    stream = videoEl.src;
  } else {
    console.log('❌ Could not get stream from video element');
    return;
  }
  
  // Stop any existing MediaRecorder first
  if (window.mediaRecorder && window.mediaRecorder.state !== 'inactive') {
    console.log('🛑 Stopping existing MediaRecorder before creating new one');
    window.mediaRecorder.stop();
  }
  
  // Create MediaRecorder for audio transcription
  const audioStream = new MediaStream(stream.getAudioTracks());
  window.mediaRecorder = new MediaRecorder(audioStream, {
    mimeType: 'audio/webm;codecs=opus',
  });
  
  // Create DeepGram WebSocket connection
  if (deepGramConfiguration.token && deepGramConfiguration.token !== 'YOUR_DEEPGRAM_API_KEY_HERE') {
    console.log('🔗 Reconnecting to DeepGram for segment...');
    
    try {
      window.ws = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-3&language=en-US&smart_format=true&interim_results=true', 
        ['token', deepGramConfiguration.token]
      );
      console.log('✅ DeepGram WebSocket created for segment');
    } catch (error) {
      console.error('❌ Failed to create DeepGram WebSocket:', error);
      window.ws = null;
    }
  }
  
  if (window.ws) {
    window.ws.onopen = () => {
      console.log('🎤 DeepGram WebSocket connected for segment');
      
      // Send keepalive message to prevent timeout
      const keepAliveInterval = setInterval(() => {
        if (window.ws && window.ws.readyState === WebSocket.OPEN) {
          window.ws.send(JSON.stringify({ type: 'KeepAlive' }));
          console.log('💓 Sent KeepAlive to DeepGram');
        } else {
          clearInterval(keepAliveInterval);
        }
      }, 8000); // Send every 8 seconds
      
      // Store interval reference for cleanup
      window.ws.keepAliveInterval = keepAliveInterval;
      
      // Check MediaRecorder state before starting
      if (window.mediaRecorder.state === 'inactive') {
        const timeslice = 1000;
        
        window.mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0 && window.ws && window.ws.readyState === WebSocket.OPEN) {
            console.log('📤 Sending audio chunk to DeepGram:', event.data.size, 'bytes');
            window.ws.send(event.data);
          }
        });
        
        window.mediaRecorder.addEventListener('stop', () => {
          console.log('🎙️ MediaRecorder stopped for segment');
        });
        
        window.mediaRecorder.addEventListener('error', (event) => {
          console.log('❌ MediaRecorder error:', event.error);
        });
        
        window.mediaRecorder.start(timeslice);
        console.log('✅ MediaRecorder started for segment');
      } else {
        console.warn('⚠️ MediaRecorder not in inactive state:', window.mediaRecorder.state);
      }
    };
    
    window.ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        
        if (data.type === 'Results') {
          const transcript = data.channel.alternatives[0].transcript;
          if (transcript) {
            if (data.is_final) {
              console.log('✅ Final transcript:', transcript);
              global_transcript += transcript + ' ';
            } else {
              console.log('⏳ Interim transcript:', transcript);
            }
          }
        } else if (data.type === 'Metadata') {
          console.log('📊 DeepGram Metadata:', data);
        }
      } catch (error) {
        console.error('❌ Error parsing DeepGram response:', error, msg.data);
      }
    };
    
    window.ws.onerror = (error) => {
      console.error('❌ DeepGram WebSocket error:', error);
    };
    
    window.ws.onclose = (event) => {
      console.log('🔌 DeepGram WebSocket closed for segment:', event.code, event.reason);
      
      // Clean up keepalive interval
      if (window.ws && window.ws.keepAliveInterval) {
        clearInterval(window.ws.keepAliveInterval);
        console.log('🧹 Cleaned up KeepAlive interval');
      }
    };
  } else {
    // Start MediaRecorder without DeepGram (only if inactive)
    if (window.mediaRecorder.state === 'inactive') {
      const timeslice = 1000;
      window.mediaRecorder.start(timeslice);
      
      window.mediaRecorder.onstop = () => {
        console.log('🛑 MediaRecorder stopped (no transcription)');
      };
    }
  }
}

var elementController;

/**
 * Skips question validation based on validationDetails.
 */
function skipQuestionValidation() {
  console.log('Validate Video::', validationDetails);
  if (validationDetails.hasOwnProperty('required') && validationDetails.required) {
    jQuery('#NextButton-custom').hide();
  } else {
    jQuery('#NextButton-custom').show();
  }
}

/**
 * Loads Pipe recorder and sets up event handlers.
 * @param {string} question_name
 * @param {object} pipeParams
 * @param {object} deepGramConfiguration
 */
const loadPipe = async function (question_name, pipeParams, deepGramConfiguration) {
  skipQuestionValidation();
  console.log('questionName::', questionName);
  
  // Initialize element controller for clean UI management
  elementController = new ElementController(question_name);
  
  // Initialize conversation components if probing is enabled
  if (typeof questionConfig !== 'undefined') {
    console.log('🎯 Initializing conversational AI components');
    
    // Always show question container and display the question
    jQuery('.conversation-question-container').show();
    jQuery('#dynamic-question-title').text(questionConfig.questionText);
    jQuery('#dynamic-question-description').text('Click record when you\'re ready to begin.');
    
    if (questionConfig.probingAmount === "None") {
      console.log('📝 No AI probing configured - single response only');
    }
  } else {
    console.log('📝 Standard recording mode (no question config)');
  }
  
  jQuery('#pipeDownload-' + questionName).hide();
    PipeSDK.insert(question_name, pipeParams, function (recorderObject) {
    // Store global reference
    window.recorderObjectGlobal = recorderObject;
    
    // Initialize conversation manager and AI service after recorder is ready
    if (typeof questionConfig !== 'undefined' && questionConfig.probingAmount !== "None") {
      window.conversationManager = new ConversationManager(question_name, recorderObject, questionConfig);
      window.aiService = new AIService(OPENAI_API_KEY, OPENAI_MODEL);
      console.log('🤖 Conversation components initialized with recorder object');
    }
    /**
     * Handler for when recorder is ready to record.
     */
    recorderObject.onReadyToRecord = async function (recorderId, recorderType) {
      jQuery('.pipeTimer').hide();
    };
    
    /**
     * Handler for when recording actually starts
     */
    recorderObject.onRecordingStarted = function (recorderId) {
      console.log('🔴 Recording actually started');
      
      // Set recording flag
      window.isRecording = true;
      
      // Now initialize fake stop button for conversation
      if (window.conversationManager && window.isConversationActive && !window.fakeStopButtonActive) {
        initializeFakeStopButton();
        toggleFakeStopButton(true);
        window.fakeStopButtonActive = true;
      }
    };

    /**
     * Handler for record button pressed.
     */
    recorderObject.btRecordPressed = function (recorderId) {
      try {
        console.log('▶️ Record button pressed');
        
        // Check if this is a conversation segment restart
        if (window.conversationManager && window.isConversationActive && window.conversationManager.segments.length > 0) {
          console.log('🔄 Starting new conversation segment');
          
          // Resume timer from paused state
          if (window.conversationManager.timerPausedAt) {
            console.log('⏱️ Resuming timer from:', window.conversationManager.timerPausedAt);
          }
          
          // Don't call the native btRecordPressed - we're already recording
          // Instead, just set up the UI and transcription
          startRecordingUIForSegment();
          
          // CRITICAL: Return early to prevent AddPipe from starting a new recording
          return;
          
        } else {
          // First recording - handle conversation initialization
          if (window.conversationManager && !window.isConversationActive) {
            console.log('🎬 Starting conversation');
            window.conversationManager.startConversation();
            window.isConversationActive = true;
            
            // Don't initialize fake stop button here - wait until recording actually starts
            
            // If no probing, mark for actual stop
            if (questionConfig.probingAmount === "None") {
              window.shouldActuallyStop = true;
            }
          }
          
          // Standard recording setup
          startRecordingClicked();
          jQuery('#NextButton-custom').hide();
          // Don't set isRecording here - wait for actual recording to start
          
          // Don't reset global transcript during conversation
          if (!window.isConversationActive) {
            global_transcript = '';
          }
        }
        
        // Existing WebSocket setup code...
        const videoEl = document.getElementById('pipeVideoInput-' + question_name);
        getMobileOperatingSystem();
        if (videoEl.srcObject !== undefined) {
          stream = videoEl.srcObject;
        } else if (videoEl.mozSrcObject !== undefined) {
          stream = videoEl.mozSrcObject;
        } else if (videoEl.src !== undefined) {
          stream = videoEl.src;
        } else {
          console.log('something went wrong');
        }
        
        // Create MediaRecorder for audio transcription (extract audio from video stream)
        const audioStream = new MediaStream(stream.getAudioTracks());
        mediaRecorder = new MediaRecorder(audioStream, {
          mimeType: 'audio/webm;codecs=opus', // Audio-only format for DeepGram
        });
        
        // Create DeepGram WebSocket connection using working method from test
        if (deepGramConfiguration.token && deepGramConfiguration.token !== 'YOUR_DEEPGRAM_API_KEY_HERE') {
          console.log('🔗 Connecting to DeepGram with working authentication...');
          
          try {
            // Use protocol-based auth with modern API parameters (same as working test)
            ws = new WebSocket(
              'wss://api.deepgram.com/v1/listen?model=nova-3&language=en-US&smart_format=true&interim_results=true', 
              ['token', deepGramConfiguration.token]
            );
            console.log('✅ DeepGram WebSocket created with protocol-based auth');
          } catch (error) {
            console.error('❌ Failed to create DeepGram WebSocket:', error);
            ws = null;
          }
        } else {
          console.warn('⚠️ DeepGram token not configured - transcription disabled');
          console.log('💡 Add your DeepGram API key to enable real-time transcription');
        }
        
        if (ws) {
          ws.onopen = () => {
            console.log('🎤 DeepGram WebSocket connected');
            
            // Send keepalive message to prevent timeout
            const keepAliveInterval = setInterval(() => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'KeepAlive' }));
                console.log('💓 Sent KeepAlive to DeepGram');
              } else {
                clearInterval(keepAliveInterval);
              }
            }, 8000); // Send every 8 seconds
            
            // Store interval reference for cleanup
            ws.keepAliveInterval = keepAliveInterval;
            
            // Start MediaRecorder when WebSocket is ready (same as working test)
            const timeslice = 1000;
            
            mediaRecorder.addEventListener('dataavailable', (event) => {
              if (event.data.size > 0 && ws && ws.readyState === WebSocket.OPEN) {
                console.log('📤 Sending audio chunk to DeepGram:', event.data.size, 'bytes');
                ws.send(event.data);
              }
            });
            
            mediaRecorder.addEventListener('stop', () => {
              console.log('🎙️ MediaRecorder stopped');
            });
            
            mediaRecorder.addEventListener('error', (event) => {
              console.log('❌ MediaRecorder error:', event.error);
            });
            
            mediaRecorder.start(timeslice);
          };
        } else {
          // Start MediaRecorder without DeepGram
          const timeslice = 1000;
          mediaRecorder.start(timeslice);
          
          mediaRecorder.onstop = () => {
            console.log('🛑 MediaRecorder stopped (no transcription)');
          };
        }
        
        if (ws) {
          ws.onmessage = (msg) => {
            try {
              const data = JSON.parse(msg.data);
              
              // Handle different response types (same as working test)
              if (data.type === 'Results') {
                const transcript = data.channel.alternatives[0].transcript;
                if (transcript) {
                  if (data.is_final) {
                    console.log('✅ Final transcript:', transcript);
                    global_transcript += transcript + ' ';
                  } else {
                    console.log('⏳ Interim transcript:', transcript);
                  }
                }
              } else if (data.type === 'Metadata') {
                console.log('📊 DeepGram Metadata:', data);
              }
            } catch (error) {
              console.error('❌ Error parsing DeepGram response:', error, msg.data);
            }
          };
          
          ws.onerror = (error) => {
            console.error('❌ DeepGram WebSocket error:', error);
            console.log('🔍 Check your DeepGram token and connection');
          };
          
          ws.onclose = (event) => {
            console.log('🔌 DeepGram WebSocket closed:', event.code, event.reason);
            
            // Clean up keepalive interval
            if (ws && ws.keepAliveInterval) {
              clearInterval(ws.keepAliveInterval);
              console.log('🧹 Cleaned up KeepAlive interval');
            }
          };
        }
        
      } catch (err) {
        console.log(err.message);
      }
    };

    /**
     * Handler for stop recording button pressed.
     */
    recorderObject.btStopRecordingPressed = function (recorderId) {
      console.log('⏹️ Stop button pressed');
      
      // Clear recording timer
      if (window.intervalID) {
        clearInterval(window.intervalID);
      }
      
      // Close WebSocket
      isRecording = false;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      
      // Hide fake stop button
      if (window.conversationManager && window.isConversationActive) {
        toggleFakeStopButton(false);
      }
      
      // Check if this is the real stop
      if (window.shouldActuallyStop || !window.conversationManager || !window.isConversationActive) {
        console.log('🏁 Actual stop - recording complete');
        stoppedVideo();
        window.isConversationActive = false;
        
        // Clean up event listeners
        jQuery(document).off('click.conversation');
        return;
      }
      
      // This shouldn't happen - fake stop should have intercepted
      console.warn('⚠️ Unexpected stop during conversation');
    };

    /**
     * Handler for playback complete event.
     */
    recorderObject.onPlaybackComplete = function (recorderId, recorderObject) {
      playBackPauseEvent(recorderId, recorderObject);
    };

    /**
     * Handler for pause button pressed.
     */
    recorderObject.btPausePressed = function (recorderId) {
      playBackPauseEvent(recorderId, recorderObject);
      showGallary();
    };

    /**
     * Handler for save ok event.
     */
    recorderObject.onSaveOk = function (
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
      console.log('💾 onSaveOk triggered');
      
      // Build video URL
      const videoUrl = S3_BASE_URL + streamName + '.mp4';
      
      // Handle conversation metadata
      if (window.conversationManager && window.conversationManager.segments.length > 0) {
        const metadata = window.conversationManager.getMetadata(videoUrl);
        
        // Output metadata to console
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
      const transcript_array = global_transcript.split(' ');
      validateVideo(recorderObject, transcript_array, location, streamName);
    };

    /**
     * Handler for video upload success event.
     */
    recorderObject.onVideoUploadSuccess = function (
      recorderId,
      filename,
      filetype,
      videoId,
      audioOnly,
      location
    ) {
      var args = Array.prototype.slice.call(arguments);
      console.log('onVideoUploadSuccess(' + args.join(', ') + ')');
      
      // Clean up conversation if active
      if (window.conversationManager) {
        cleanupConversation();
      }
      
      console.log(
        'setEmbeddedDataToQuestion >>>>>> >>>>> >>>>onVideoUploadSuccess',
        recorderId,
        filename,
        filetype,
        videoId,
        location,
        recorderObject
      );
      const transcript_array = global_transcript.split(' ');
      jQuery('#' + recorderId).attr('style', 'height:120px !important');
      jQuery('#NextButton-custom').show();
    };

    /**
     * Handler for play button pressed.
     */
    recorderObject.btPlayPressed = function (recorderId) {
      playVideoEvent();
    };
  });
};


/**
 * Handles retake logic and UI reset.
 */
function retake() {
  console.log('Retake--- (legacy function, delegating to new system)');
  jQuery('#pipeDownload-' + questionName).hide();
  try {
    this.recorderObjectGlobal.pause();
  } catch (err) {}
  skipQuestionValidation();
  jQuery('#SkinContent #Buttons').hide();
  
  // Delegate to the new element controller for consistent state management
  if (elementController) {
    elementController.setReadyToRecordWithVideoState();
  } else {
    console.warn('ElementController not initialized, falling back to legacy behavior');
    // Fallback to old behavior if elementController not available
    jQuery('.retake-button').remove();
    jQuery('.play-custom-btn').remove();
    jQuery('.pipeTimer').hide();
    jQuery('.pipeTimer-custom').hide();
    jQuery('.back-to-camera').remove();
    jQuery('#time-span').remove();
    jQuery('#pipeMenu-' + questionName).removeClass('playback-state recording-state');
    jQuery('#pipeRec-' + questionName).show();
    jQuery('#pipePlay-' + questionName).attr('style', 'display: none !important; opacity: 0 !important;');
    jQuery('#pipeMenu-' + questionName).append(
      '<button class="play-custom-btn" id="time-span" onClick="playVideoCustom()" title="Preview existing recording"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5,3 19,12 5,21"/></svg><span style="font-size: 0.75rem; margin-top: 0.25rem;"></span></button>'
    );
  }
}

/**
 * Shows the video gallery UI.
 */
function showGallary() {
  console.log('Show Gallary--');
  jQuery('#pipeDownload-' + questionName).hide();
  jQuery('#time-span').remove();
  jQuery('.pipeTimer-custom').hide();
  jQuery('.pipeTimer').show();
  if (isBackTOcamera) {
    jQuery('#pipeMenu-' + questionName).append(
      '<button class="play-custom-btn" id="time-span" onClick="playVideoCustom()" title="Preview recording"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5,3 19,12 5,21"/></svg><span style="font-size: 0.75rem; margin-top: 0.25rem;"></span></button>'
    );
    jQuery('#pipePlay-' + questionName + ' svg').attr('style', 'opacity:0 !important');
  } else {
    jQuery('#pipePlay-' + questionName + ' svg').attr('style', 'opacity:1 !important');
  }
  isBackTOcamera = false;
}

/**
 * Plays the custom video.
 */
function playVideoCustom() {
  console.log('playVideoCustom--');
  jQuery('.pipeTimer-custom').hide();
  jQuery('.pipeTimer').attr('style', 'display: block !important;');
  jQuery('.pipeTimer').show();
  jQuery('#time-span').remove();
  recorderObjectGlobal.playVideo();
}

/**
 * Handles UI when video is stopped.
 */
function stoppedVideo() {
  jQuery('#pipePlay-' + questionName).show();
  jQuery('#pipePlay-' + questionName + ' svg').attr('style', 'opacity:0 !important');
}

/**
 * Handles play video event and UI update.
 */
function playVideoEvent() {
  isBackTOcamera = false;
  jQuery('#time-span').remove();
  jQuery('#pipePlay-' + questionName + ' svg').attr('style', 'opacity:1 !important');
  jQuery('#pipeMenu-' + questionName).append(
    '<button class="back-to-camera" onClick="backToCamera()" title="Return to camera view"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span style="font-size: 0.75rem; margin-top: 0.25rem;">Camera</span></button>'
  );
  jQuery('.pipeTimer').show();
  jQuery('#pipeRec-' + questionName).hide();
  jQuery('#pipePlay-' + questionName).attr('style', 'display: block;right: auto;');
}

/**
 * Handles back to camera event and UI reset.
 */
function backToCamera() {
  jQuery('.time-span').remove();
  jQuery('.pipeTimer').attr('style', 'display: none !important; ');
  jQuery('.pipeTimer-custom').empty().append('00:00');
  jQuery('.pipeTimer-custom').show();
  jQuery('.pipeTimer').hide();
  isBackTOcamera = true;
  this.recorderObjectGlobal.pause();
  retake();
}

/**
 * Handles modal retake event.
 */
function modalRetake() {
  console.log('Modal Retake - user clicked Record Again button');
  
  // Prevent retake during conversation
  if (window.isConversationActive) {
    console.warn('⚠️ Cannot retake during active conversation');
    return;
  }
  
  // Hide modal buttons before closing
  jQuery('#modal-buttons').hide();
  
  // Close the modal
  jQuery.modal.close();
  
  // Use element controller to set proper state
  elementController.setReadyToRecordWithVideoState();
}

/**
 * Moves to the next question.
 */
function nextQuestion() {
  jQuery.modal.close();
  document.querySelector('.NextButton').click();
}

/**
 * Handles playback pause event.
 * @param {string} recorderId
 * @param {object} recorderObject
 */
function playBackPauseEvent(recorderId, recorderObject) {
  jQuery('#pipePlay-' + questionName + ' svg').attr('style', 'opacity:1 !important');
}

/**
 * Closes the modal.
 */
function modalClose() {
  console.log('Modal close >>>');
  
  // Prevent modal actions during conversation
  if (window.isConversationActive) {
    console.warn('⚠️ Cannot close modal during active conversation');
    return;
  }
  
  jQuery.modal.close();
  // Don't reinitialize pipe - it's already loaded
  // loadPipe(questionName, pipeParams, deepGramConfiguration);
}

/**
 * Handles start recording click event and UI update.
 */
function startRecordingClicked() {
  retake();
  jQuery('#pipeMenu-' + questionName).append(
    '<div class="pipeTimer-custom">00:00</div>'
  );
  jQuery('.pipeTimer-custom').show();
  jQuery('#time-span').remove();
}


/**
 * Requests camera and audio access (video and audio).
 */
function getCamAccess() {
  console.log('getCamAccess >>> Grant Acess');
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        jQuery.modal.close();
        jQuery('#recordInstruction').modal();
        loadPipe(questionName, pipeParams, deepGramConfiguration);
        // Clean CSS-only styling - remove conflicting inline styles
      })
      .catch((err) => {
        console.log('u got an error:' + err);
        fetch('https://api.ipify.org?format=json')
          .then((response) => response.json())
          .then((responseData) => {
            handleAPiCallForDeviceError(responseData.ip, err.toString());
          })
          .catch((error) => {
            handleAPiCallForDeviceError(null, error.toString());
            console.error('Error fetching IP address:', error);
          });
      });
  } else {
    jQuery.modal.close();
    jQuery('#recordInstruction').modal();
    loadPipe(questionName, pipeParams, deepGramConfiguration);
    // Clean CSS-only styling - remove conflicting inline styles
  }
}

/**
 * Handles API call for device error logging.
 * @param {string|null} IpAddress
 * @param {string} errorMessage
 */
function handleAPiCallForDeviceError(IpAddress, errorMessage) {
  const url = 'https://api.goknit.com/api/v1/stg/piperecorder/error';
  const data = {
    question_id: questionName,
    url: window.location.href,
    metadata: {
      IpAddress: IpAddress,
      errorMessage: errorMessage,
    },
  };
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  };
  fetch(url, options)
    .then((response) => {
      console.log('Response:', response);
    })
    .catch((error) => {
      console.error('Error', error);
    });
}


/**
 * Detects mobile operating system and sets mimetype.
 */
function getMobileOperatingSystem() {
  var userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  if (/windows phone/i.test(userAgent)) {
    mimetype = 'audio/webm';
  } else if (/android/i.test(userAgent)) {
    mimetype = 'audio/webm';
  } else if (/iPad|iPhone|iPod/.test(userAgent)) {
    mimetype = 'audio/mp4';
  } else {
    mimetype = 'audio/webm';
  }
}

/**
 * Validates the recorded video and updates the UI accordingly.
 * @param {object} recorderObject
 * @param {Array} transcript_array
 * @param {string} location
 * @param {string} streamName
 */
function validateVideo(recorderObject, transcript_array, location, streamName) {
  console.log('ValidateVideo >>>> ', recorderObject);
  
  // Skip validation during active conversation
  if (window.conversationManager && window.isConversationActive && !window.shouldActuallyStop) {
    console.log('⏭️ Skipping validation - conversation in progress');
    return;
  }
  
  // Check conversation minimum duration if applicable
  if (window.conversationManager && window.conversationManager.segments.length > 0) {
    const totalDuration = window.conversationManager.segments[window.conversationManager.segments.length - 1].endTime;
    if (totalDuration < validationDetails.min_streamtime) {
      console.warn('⚠️ Conversation shorter than minimum duration');
      // Continue with validation to show error
    }
  }
  
  var sucessModalDetails = '';

  jQuery('#record-title').empty();
  jQuery('#image-sucess').empty();
  jQuery('#result').empty();

  var isError = false;
  this.recorderObjectGlobal = recorderObject;
  if (validationDetails.hasOwnProperty('min_streamtime')) {
    if (recorderObject.getStreamTime() < validationDetails.min_streamtime) {
      isError = true;
      sucessModalDetails +=
        '<li > <img src="https://d2kltgp8v5sml0.cloudfront.net/templates/svg/false.svg" style="margin-right:5px;">Record a  <span>' + validationDetails.min_streamtime + ' sec or longer </span> video</li>';
    } else {
      sucessModalDetails +=
        '<li > <img src="https://d2kltgp8v5sml0.cloudfront.net/templates/svg/true.svg" style="margin-right:5px;">Record a  <span>' + validationDetails.min_streamtime + ' sec or longer </span> video</li>';
    }
  }

  jQuery('#time-span').remove();
  streamTime = recorderObject.getStreamTime();
  if (isError) {
    jQuery('#next-button-modal').remove();
    jQuery('#SkinContent #Buttons').hide();
    jQuery('.retake-previous').remove();

    jQuery('#record-title').append('Recording needs improvement');
    jQuery('#image-sucess').append(
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: hsl(var(--destructive));"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    );
    jQuery('#result').addClass('error-feedback');
    jQuery('#result').append("<li style='font-size:15px;padding-left:5px;'>Your video didn't meet our requirements</li>");
    jQuery('#result').append(sucessModalDetails);
    jQuery('#result').append(
      '<button class="btn btn-destructive" onClick="modalRetake()" style="margin-top: 1rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>Try Again</button>'
    );
    jQuery('#error').modal({
      escapeClose: false,
      clickClose: false,
      showClose: false,
    });
  } else {
    console.log('streamName::', streamName);
    const URL = S3_BASE_URL + streamName + '.mp4';
    updateEmbeddedData(URL);
    jQuery('#NextButton-custom').show();
    jQuery('#next-button-modal').remove();
    jQuery('.retake-button').remove();
    // Check if this was a conversation
    if (window.conversationManager && window.conversationManager.segments.length > 0) {
      jQuery('#record-title').append('Interview Completed Successfully!');
      
      const totalQuestions = window.conversationManager.segments.length;
      const totalMinutes = Math.floor(window.conversationManager.segments[window.conversationManager.segments.length - 1].endTime / 60);
      const totalSeconds = Math.round(window.conversationManager.segments[window.conversationManager.segments.length - 1].endTime % 60);
      
      sucessModalDetails = 'Great job! You answered ' + totalQuestions + ' question' + (totalQuestions > 1 ? 's' : '') + ' in ' + totalMinutes + ':' + (totalSeconds < 10 ? '0' : '') + totalSeconds + '. Thank you for your thoughtful responses!';
    } else {
      jQuery('#record-title').append('Perfect! Video Recorded Successfully');
      sucessModalDetails = 'Your video response has been recorded successfully! You can now continue to the next question.';
    }
    
    // Set playback state for clean UI - simplified layout: Record center + Play right
    jQuery('#pipeMenu-' + questionName).removeClass('recording-state').addClass('playback-state');
    
    // Hide record button in playback state (will be shown again after retake)
    jQuery('#pipeRec-' + questionName).hide();
    
    // Only add play button on the right for playback
    jQuery('#pipeMenu-' + questionName).append(
      '<button class="play-custom-btn" id="time-span" onClick="playVideoCustom()" title="Preview recording"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5,3 19,12 5,21"/></svg></button>'
    );
    jQuery('#image-sucess').append(
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: hsl(var(--success));"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>'
    );
    jQuery('#result').addClass('success-feedback');
    jQuery('#result').append(sucessModalDetails);
    jQuery('.retake-previous').remove();
    
    // Show the static modal buttons (no more dynamic injection!)
    jQuery('#modal-buttons').show();
    
    jQuery('#error').modal({
      escapeClose: true,
      clickClose: true,
      showClose: true,
      // Ensure modal close triggers the same layout as "Record Again"
      onClose: function() {
        // Hide modal buttons and set up consistent state
        jQuery('#modal-buttons').hide();
        elementController.setReadyToRecordWithVideoState();
      }
    });
  }
}

/**
 * Updates the timer UI with the current stream time.
 * @param {object} recorderObject
 */
function getTime(recorderObject) {
  // Use conversation timer if active
  if (window.conversationManager && window.isConversationActive) {
    updateTimerDisplay();
    return;
  }
  
  // Original timer logic for non-conversation recordings
  if (!recorderObject) return;
  
  var totalSeconds = Math.round(recorderObject.getStreamTime());
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds % 60;
  
  if (seconds < 10) {
    seconds = '0' + seconds;
  }
  if (minutes < 10) {
    minutes = '0' + minutes;
  }
  
  jQuery('.pipeTimer-custom').text(minutes + ':' + seconds);
}

/**
 * Pads a time value with leading zero if needed.
 * @param {number} val
 * @returns {string}
 */
function arrengeTimeString(val) {
  var valString = val + '';
  if (valString.length < 2) {
    return '0' + valString;
  } else {
    return valString;
  }
}