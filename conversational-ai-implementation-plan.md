# Conversational AI Recording System - Implementation Plan

## Overview
This document provides a detailed, chronologically ordered implementation plan for the conversational AI recording system using a "fake stop" strategy for continuous recording. Each task is granular and builds upon previous tasks.

## Key Strategy: Fake Stop Button
Instead of actually stopping the Pipe recording between segments, we'll override the stop button to only pause for AI processing while keeping the recording active. The recording only truly stops when the conversation is complete.

## Phase 1: Core Infrastructure Setup (Tasks 1-6)

### Task 1: Add Global Variables for Conversation State
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 5 minutes
**Priority:** Critical - Must be done first

Add after line 11 (after `var S3_BASE_URL`):
```javascript
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
```

### Task 2: Update Question Configuration Structure
**File:** `qualtrics-question-js.js`
**Time:** 15 minutes
**Dependencies:** Task 1

Add after line 35 (after `deepGramConfiguration`):

```javascript
// Question configuration for AI probing
var questionConfig = {
  questionText: "What are your current nutritional goals you're trying to achieve? Why?",
  probingInstructions: "Make sure to understand what motivates them to choose their goals. Explore both the practical and emotional reasons behind their choices.",
  probingAmount: "Moderate" // Options: "None", "Moderate", "Deep"
};

// OpenAI Configuration (temporary client-side)
var OPENAI_API_KEY = "sk-..."; // Replace with actual key
var OPENAI_MODEL = "gpt-4"; // Using gpt-4 for better JSON responses

// System prompts for each probing level
var probingSystemPrompts = {
  "None": "You should not ask any follow-up questions.",
  "Moderate": `You are an expert qualitative researcher. Ask 1-3 thoughtful follow-up questions to better understand the participant's response. 
  Focus on:
  - Clarifying vague statements
  - Exploring key motivations
  - Understanding context
  Stop when you have sufficient depth or reach 3 questions total.`,
  "Deep": `You are an expert qualitative researcher conducting an in-depth interview. Ask 3-5 probing follow-up questions to thoroughly explore the participant's response.
  Focus on:
  - Uncovering underlying motivations and emotions
  - Exploring contradictions or interesting points
  - Getting specific examples and stories
  - Understanding the full context and implications
  Continue until you have comprehensive understanding or reach 5 questions total.`
};

// Probing limits
var maxProbesByLevel = {
  "None": 0,
  "Moderate": 3,
  "Deep": 5
};
```

### Task 3: Create Conversation Manager Class
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 45 minutes
**Dependencies:** Tasks 1-2

Add after line 76 (after ElementController class closing brace):
```javascript
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
    this.conversationId = `${questionName}_${Date.now()}`;
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
    
    console.log(`📝 Segment ${segment.segmentId} recorded:`, segment);
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

  displayQuestion(question) {
    jQuery('#dynamic-question-title').text(question);
    jQuery('#dynamic-question-description').text('Click record when ready to respond.');
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
    
    // Now actually stop the recording
    this.recorderObject.stop();
  }

  showConversationComplete() {
    jQuery('#dynamic-question-title').text('Interview Complete!');
    jQuery('#dynamic-question-description').text('Thank you for your thoughtful responses. Finalizing your recording...');
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
```

### Task 4: Create AI Service Class
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 30 minutes
**Dependencies:** Tasks 1-3

Add immediately after ConversationManager class:

```javascript
// AI Service for OpenAI integration
class AIService {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async getFollowUpQuestion(conversationManager) {
    try {
      const systemPrompt = this.buildSystemPrompt(conversationManager.config, conversationManager.segments.length);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationManager.conversationThread
          ],
          temperature: 0.7,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      const aiResponseText = data.choices[0].message.content;
      
      // Parse the response
      const aiResponse = this.parseAIResponse(aiResponseText);
      
      console.log('🤖 AI Response:', aiResponse);
      return aiResponse;
      
    } catch (error) {
      console.error('❌ AI Service Error:', error);
      return { hasMoreQuestions: false, error: error.message };
    }
  }

  parseAIResponse(responseText) {
    // Check if response indicates completion
    const lowerResponse = responseText.toLowerCase();
    
    if (lowerResponse.includes('"hasmoreques') || lowerResponse.includes('"done"') || lowerResponse.includes('"isdone"')) {
      try {
        const parsed = JSON.parse(responseText);
        return {
          hasMoreQuestions: !parsed.isDone && !parsed.done && parsed.hasMoreQuestions !== false,
          question: parsed.nextQuestion || parsed.question || null,
          reasoning: parsed.reasoning || null
        };
      } catch (e) {
        // Fall through to text parsing
      }
    }
    
    // Otherwise, treat the response as the next question
    return {
      hasMoreQuestions: true,
      question: responseText.trim(),
      reasoning: null
    };
  }

  buildSystemPrompt(questionConfig, currentSegmentCount) {
    const systemPromptBase = window.probingSystemPrompts[questionConfig.probingAmount] || '';
    const maxQuestions = window.maxProbesByLevel[questionConfig.probingAmount] || 0;
    const remainingQuestions = maxQuestions - currentSegmentCount;
    
    return `${systemPromptBase}

Original Question: ${questionConfig.questionText}
Probing Instructions: ${questionConfig.probingInstructions}
Questions asked so far: ${currentSegmentCount}
Remaining questions allowed: ${remainingQuestions}

Based on the conversation:
1. If the user has thoroughly answered the original question AND satisfied the probing instructions, respond with: {"isDone": true}
2. If more information is needed AND you haven't reached the question limit, respond with: {"hasMoreQuestions": true, "question": "Your specific follow-up question here", "reasoning": "Brief explanation"}
3. If you've reached the maximum number of questions (${maxQuestions} total), respond with: {"isDone": true}

IMPORTANT: Be conversational and natural in your follow-up questions. Reference specific things the user said.`;
  }
}
```

### Task 5: Add CSS for Conversation States
**File:** `templates/qualtrics-addpipe-custom.css`
**Time:** 15 minutes
**Dependencies:** None

Add at the end of the file:

```css
/* Conversational AI States */
.ai-processing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.ai-thinking-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: var(--shadow-xl);
}

.ai-thinking-spinner {
  width: 48px;
  height: 48px;
  margin: 0 auto 1rem;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: hsl(var(--primary));
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Fake stop button styling */
.fake-stop-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  background: hsl(var(--destructive));
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 50;
}

.fake-stop-button:hover {
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: var(--shadow-lg);
}

.fake-stop-button svg {
  width: 24px;
  height: 24px;
  fill: white;
}

/* Hide native stop during conversation */
.conversation-active [id^="pipeRec-"] {
  opacity: 0 !important;
  pointer-events: none !important;
}

/* Question display styling */
#dynamic-question-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 0.5rem;
}

#dynamic-question-description {
  font-size: 1rem;
  color: hsl(var(--muted-foreground));
  margin-bottom: 1.5rem;
}
```

### Task 6: Update HTML Structure
**File:** `qualtrics-question-html.html`
**Time:** 10 minutes
**Dependencies:** Task 5

Insert after line 2 (after the initial div):

```html
<!-- Dynamic question display -->
<div class="conversation-question-container" style="margin-bottom: 1.5rem; display: none;">
  <h2 class="question-title" id="dynamic-question-title">Please record your video response</h2>
  <p class="question-description" id="dynamic-question-description">Click record when you're ready to begin.</p>
</div>
```

## Phase 2: Recording Flow Modifications (Tasks 7-15)

### Task 7: Initialize Conversation Components in loadPipe
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 20 minutes
**Dependencies:** Tasks 1-6

Modify the loadPipe function starting at line 96. Add after line 101 (after `elementController = new ElementController(question_name);`):

```javascript
  // Initialize conversation components if probing is enabled
  if (typeof questionConfig !== 'undefined' && questionConfig.probingAmount !== "None") {
    console.log('🎯 Initializing conversational AI components');
    
    // Show question container
    jQuery('.conversation-question-container').show();
    
    // Initialize conversation manager
    window.conversationManager = new ConversationManager(question_name, recorderObject, questionConfig);
    
    // Initialize AI service
    window.aiService = new AIService(OPENAI_API_KEY, OPENAI_MODEL);
    
    // Display initial question
    jQuery('#dynamic-question-title').text(questionConfig.questionText);
    jQuery('#dynamic-question-description').text('Click record when you\'re ready to begin.');
  } else {
    console.log('📝 Standard recording mode (no AI probing)');
  }
```

### Task 8: Create Fake Stop Button Override System
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 30 minutes
**Dependencies:** Tasks 1-7
**Critical:** This is the core of our strategy

Add after the AIService class (around line 240):

```javascript
// Fake Stop Button Management
function initializeFakeStopButton() {
  console.log('🔴 Initializing fake stop button system');
  
  // Store reference to original Pipe stop handler
  if (window.recorderObjectGlobal && window.recorderObjectGlobal.btStopRecordingPressed) {
    window.originalStopHandler = window.recorderObjectGlobal.btStopRecordingPressed;
  }
  
  // Create fake stop button
  const fakeStopBtn = jQuery(`
    <button class="fake-stop-button" id="fake-stop-${questionName}" style="display: none;">
      <svg viewBox="0 0 24 24">
        <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
      </svg>
    </button>
  `);
  
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
  
  // Override native record button clicks during conversation
  jQuery(document).on('click.conversation', '[id^="pipeRec-"]', function(e) {
    if (window.conversationManager && window.conversationManager.conversationActive && window.isRecording) {
      console.log('🚫 Intercepting native stop button click');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Trigger fake stop instead
      jQuery('#fake-stop-' + questionName).click();
      return false;
    }
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
```

### Task 9: Implement pauseForAIProcessing Function
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 25 minutes
**Dependencies:** Task 8

Add immediately after the fake stop button functions:

```javascript
// Pause recording for AI processing
async function pauseForAIProcessing() {
  console.log('⏸️ Pausing for AI processing');
  
  // Mark segment end
  const segment = window.conversationManager.markSegmentEnd();
  
  // Close transcription WebSocket
  if (window.ws && window.ws.readyState === WebSocket.OPEN) {
    window.ws.close();
  }
  
  // Clear recording interval
  if (window.intervalID) {
    clearInterval(window.intervalID);
  }
  
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
    const aiResponse = await window.aiService.getFollowUpQuestion(window.conversationManager);
    
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
    showNextQuestion(aiResponse.question);
    
  } catch (error) {
    console.error('❌ Error in AI processing:', error);
    await window.conversationManager.endConversation();
  }
}
```

### Task 10: Modify Record Button Handler
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 25 minutes
**Dependencies:** Tasks 1-9

Replace the entire btRecordPressed handler (starting at line 114):
```javascript
recorderObject.btRecordPressed = function (recorderId) {
  try {
    console.log('▶️ Record button pressed');
    
    // Handle conversation initialization
    if (window.conversationManager && !window.isConversationActive) {
      console.log('🎬 Starting conversation');
      window.conversationManager.startConversation();
      window.isConversationActive = true;
      
      // Initialize fake stop button system
      initializeFakeStopButton();
      
      // If no probing, mark for actual stop
      if (questionConfig.probingAmount === "None") {
        window.shouldActuallyStop = true;
      }
    }
    
    // Show fake stop button during recording
    if (window.conversationManager && window.isConversationActive) {
      toggleFakeStopButton(true);
    }
    
    // Standard recording setup
    startRecordingClicked();
    jQuery('#NextButton-custom').hide();
    isRecording = true;
    
    // Don't reset global transcript during conversation
    if (!window.isConversationActive) {
      global_transcript = '';
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
    
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimetype,
    });
    
    ws = new WebSocket(deepGramConfiguration.endPoint, ['token', deepGramConfiguration.token]);
    ws.onopen = () => {
      console.log('🎤 WebSocket opened');
      mediaRecorder.onstop = () => {
        console.log('onstop fired');
      };
      const timeslice = 1000;
      mediaRecorder.start(timeslice);
      
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0 && ws.readyState == 1) {
          console.log('Sent audio chunk: ', event.data);
          ws.send(event.data);
        }
      });
    };
    
    ws.onmessage = (msg) => {
      const { channel, is_final } = JSON.parse(msg.data);
      const transcript = channel.alternatives[0].transcript;
      if (transcript && is_final) {
        console.log('transcript >>>', transcript);
        global_transcript += transcript + ' ';
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('🔌 WebSocket closed');
    };
    
  } catch (err) {
    console.log(err.message);
  }
};
```

### Task 11: Modify Stop Button Handler
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 20 minutes
**Dependencies:** Tasks 1-10
**Critical:** This handles the real stop when needed

Replace the btStopRecordingPressed handler (starting at line 169):
```javascript
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
```

### Task 12: Create UI Helper Functions
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 30 minutes
**Dependencies:** Tasks 1-11

Add after the pauseForAIProcessing function (around line 350):
```javascript
// UI Helper Functions for Conversational AI
function showAIProcessingUI() {
  console.log('🤔 Showing AI processing UI');
  
  // Add AI processing overlay
  const overlay = jQuery(`
    <div class="ai-processing-overlay">
      <div class="ai-thinking-content">
        <div class="ai-thinking-spinner"></div>
        <h3>AI is thinking...</h3>
        <p>Analyzing your response and preparing a follow-up question</p>
      </div>
    </div>
  `);
  
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
  
  // Ensure record button is visible and enabled
  jQuery('#pipeRec-' + questionName).show().prop('disabled', false);
}

function updateTimerDisplay() {
  if (!window.conversationManager || !window.conversationManager.conversationStartTime) return;
  
  // Don't update if AI is processing
  if (window.conversationManager.isProcessingAI) return;
  
  const elapsed = (performance.now() - window.conversationManager.conversationStartTime) / 1000;
  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60);
  
  jQuery('.pipeTimer-custom').text(
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  );
}

// Modified startRecordingClicked to work with conversation
function startRecordingClicked() {
  console.log('🎙️ Recording started');
  
  // Only do retake cleanup if not in conversation
  if (!window.isConversationActive) {
    retake();
  }
  
  // Add timer if not exists
  if (jQuery('.pipeTimer-custom').length === 0) {
    jQuery('#pipeMenu-' + questionName).append('<div class="pipeTimer-custom">00:00</div>');
  }
  
  jQuery('.pipeTimer-custom').show();
  jQuery('#time-span').remove();
  
  // Use conversation-aware timer
  if (window.conversationManager) {
    window.intervalID = setInterval(updateTimerDisplay, 1000);
  } else {
    // Fallback to original timer
    window.intervalID = setInterval(function() {
      getTime(recorderObjectGlobal);
    }, 100);
  }
}
```

### Task 13: Modify Validation Logic for Conversations
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 15 minutes
**Dependencies:** Tasks 1-12

Modify the validateVideo function starting at line 491. Add at the beginning of the function:

```javascript
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
  
  // Rest of existing validation code...
```

### Task 14: Update Timer Display Logic
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 10 minutes
**Dependencies:** Tasks 1-13

Replace the getTime function (around line 582):

```javascript
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
```

### Task 15: Handle modalClose and modalRetake for Conversations
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 10 minutes
**Dependencies:** Tasks 1-14

Update modalClose function (around line 387):

```javascript
function modalClose() {
  console.log('Modal close >>>');
  
  // Prevent modal actions during conversation
  if (window.isConversationActive) {
    console.warn('⚠️ Cannot close modal during active conversation');
    return;
  }
  
  jQuery.modal.close();
  loadPipe(questionName, pipeParams, deepGramConfiguration);
}
```

And update modalRetake (around line 356):

```javascript
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
```

## Phase 3: Metadata and Completion (Tasks 16-20)

### Task 16: Modify onSaveOk Handler
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 20 minutes
**Dependencies:** Tasks 1-15

Replace the onSaveOk handler (starting at line 197):
```javascript
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
  const videoUrl = `${S3_BASE_URL}${streamName}.mp4`;
  
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
```

### Task 17: Update Success Modal for Conversation
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 15 minutes
**Dependencies:** Tasks 1-16

In validateVideo function, modify the success case (around line 541). Replace:
```javascript
jQuery('#record-title').append('Perfect! Video Recorded Successfully');
```

With:
```javascript
// Check if this was a conversation
if (window.conversationManager && window.conversationManager.segments.length > 0) {
  jQuery('#record-title').append('Interview Completed Successfully!');
  
  const totalQuestions = window.conversationManager.segments.length;
  const totalMinutes = Math.floor(window.conversationManager.segments[window.conversationManager.segments.length - 1].endTime / 60);
  const totalSeconds = Math.round(window.conversationManager.segments[window.conversationManager.segments.length - 1].endTime % 60);
  
  sucessModalDetails = `Great job! You answered ${totalQuestions} question${totalQuestions > 1 ? 's' : ''} in ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}. Thank you for your thoughtful responses!`;
} else {
  jQuery('#record-title').append('Perfect! Video Recorded Successfully');
  sucessModalDetails = 'Your video response has been recorded successfully! You can now continue to the next question.';
}
```

### Task 18: Clean Up After Conversation
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 15 minutes
**Dependencies:** Tasks 1-17

Add cleanup function after the UI helper functions:

```javascript
// Clean up conversation state
function cleanupConversation() {
  console.log('🧹 Cleaning up conversation state');
  
  // Reset global flags
  window.isConversationActive = false;
  window.shouldActuallyStop = false;
  window.fakeStopButtonActive = false;
  
  // Remove fake stop button
  jQuery('#fake-stop-' + questionName).remove();
  
  // Remove event listeners
  jQuery(document).off('click.conversation');
  
  // Reset UI
  jQuery('#pipeMenu-' + questionName).removeClass('ai-processing-state conversation-active');
  toggleFakeStopButton(false);
  
  // Clear timers
  if (window.intervalID) {
    clearInterval(window.intervalID);
  }
}
```

Then update the onVideoUploadSuccess handler (around line 217) to call cleanup:

```javascript
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
  
  // Rest of existing code...
  const transcript_array = global_transcript.split(' ');
  jQuery('#' + recorderId).attr('style', 'height:120px !important');
  jQuery('#NextButton-custom').show();
};
```

### Task 19: Add Error Handling
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 20 minutes
**Dependencies:** Tasks 1-18

Add error handling utilities after the cleanup function:

```javascript
// Error handling for conversation
function handleConversationError(error, context) {
  console.error(`❌ Conversation error in ${context}:`, error);
  
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
```

Then update pauseForAIProcessing to use safeAICall:

```javascript
// In pauseForAIProcessing, replace:
// const aiResponse = await window.aiService.getFollowUpQuestion(window.conversationManager);
// With:
const aiResponse = await safeAICall(window.conversationManager);
```

### Task 20: Handle Edge Cases
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 20 minutes
**Dependencies:** All previous tasks

Add edge case handlers after error handling:

```javascript
// Handle browser navigation during conversation
window.addEventListener('beforeunload', function(e) {
  if (window.isConversationActive) {
    e.preventDefault();
    e.returnValue = 'Your interview is in progress. Are you sure you want to leave?';
    
    // Save state for potential recovery
    if (window.conversationManager) {
      const state = {
        segments: window.conversationManager.segments,
        transcript: window.global_transcript,
        timestamp: Date.now()
      };
      sessionStorage.setItem('conversation_recovery_' + questionName, JSON.stringify(state));
    }
    
    return e.returnValue;
  }
});

// Handle maximum duration
function checkMaximumDuration() {
  if (!window.conversationManager || !window.conversationManager.conversationStartTime) return;
  
  const elapsed = (performance.now() - window.conversationManager.conversationStartTime) / 1000;
  const maxDuration = 600; // 10 minutes
  
  if (elapsed >= maxDuration) {
    console.warn('⏰ Maximum conversation duration reached');
    window.conversationManager.endConversation();
  }
}

// Check duration periodically during conversation
if (window.conversationManager) {
  setInterval(checkMaximumDuration, 10000); // Every 10 seconds
}

// Handle recorder object not ready
function waitForRecorder(callback, maxAttempts = 20) {
  let attempts = 0;
  const checkInterval = setInterval(() => {
    attempts++;
    if (window.recorderObjectGlobal && window.recorderObjectGlobal.btStopRecordingPressed) {
      clearInterval(checkInterval);
      callback();
    } else if (attempts >= maxAttempts) {
      clearInterval(checkInterval);
      console.error('❌ Recorder object not ready after maximum attempts');
      handleConversationError(new Error('Recorder initialization timeout'), 'recording');
    }
  }, 500);
}
```

## Phase 4: Testing and Refinement (Tasks 21-25)

### Task 21: Create Test Configurations
**File:** `qualtrics-question-js.js`
**Time:** 10 minutes
**Dependencies:** Basic setup complete

Add after the questionConfig (around line 45):
```javascript
// ===== TEST CONFIGURATIONS =====
// Uncomment one configuration for testing

// TEST 1: No probing (single response)
/*
var questionConfig = {
  questionText: "Please state your name and current role.",
  probingInstructions: "Get basic identification only.",
  probingAmount: "None"
};
*/

// TEST 2: Moderate probing (2-3 follow-ups)
/*
var questionConfig = {
  questionText: "What are your career goals for the next 5 years?",
  probingInstructions: "Understand their specific goals, motivations, and planned steps to achieve them.",
  probingAmount: "Moderate"
};
*/

// TEST 3: Deep probing (4-5 follow-ups)
/*
var questionConfig = {
  questionText: "Tell me about a time when you faced a significant challenge at work.",
  probingInstructions: "Explore the situation, their actions, emotions, learnings, and how it changed their approach.",
  probingAmount: "Deep"
};
*/

// TEST 4: Error testing (invalid API key)
/*
var OPENAI_API_KEY = "sk-invalid-key-for-testing";
*/
```

### Task 22: Add Debug Mode
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 15 minutes
**Dependencies:** All core functionality

Add at the top of the file after global variables:

```javascript
// Debug mode for detailed logging
const DEBUG_MODE = true; // Set to false for production

function debugLog(category, message, data = null) {
  if (!DEBUG_MODE) return;
  
  const timestamp = new Date().toISOString();
  const prefix = {
    'conversation': '🎬',
    'ai': '🤖',
    'recording': '🎙️',
    'ui': '🎨',
    'error': '❌',
    'metadata': '📊'
  }[category] || '📝';
  
  console.log(`[${timestamp}] ${prefix} ${category.toUpperCase()}: ${message}`);
  if (data) {
    console.log(data);
  }
}

// Add debug panel for testing
if (DEBUG_MODE) {
  jQuery(document).ready(function() {
    const debugPanel = jQuery(`
      <div id="conversation-debug" style="position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; font-size: 12px; z-index: 10000; max-width: 300px;">
        <strong>Debug Info</strong><br>
        <div id="debug-content"></div>
      </div>
    `);
    jQuery('body').append(debugPanel);
  });
  
  // Update debug panel periodically
  setInterval(() => {
    if (window.conversationManager) {
      jQuery('#debug-content').html(`
        Active: ${window.isConversationActive}<br>
        Segments: ${window.conversationManager.segments.length}<br>
        Probes: ${window.conversationManager.currentProbeCount}/${window.conversationManager.maxProbes}<br>
        Recording: ${window.isRecording}<br>
        AI Processing: ${window.conversationManager.isProcessingAI}
      `);
    }
  }, 1000);
}
```

### Task 23: Implement State Recovery
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 20 minutes
**Dependencies:** Core conversation system

Add recovery system in loadPipe function, after conversation initialization:

```javascript
// In loadPipe, after conversationManager initialization:
// Check for recovery data
const recoveryData = sessionStorage.getItem('conversation_recovery_' + question_name);
if (recoveryData) {
  try {
    const parsed = JSON.parse(recoveryData);
    const timeSinceLastSave = Date.now() - parsed.timestamp;
    
    // Only offer recovery if less than 5 minutes old
    if (timeSinceLastSave < 300000) {
      if (confirm('It looks like you had an interview in progress. Would you like to continue where you left off?')) {
        console.log('🔄 Attempting conversation recovery');
        // Recovery would require server-side support to continue recording
        // For now, we'll just log the metadata
        console.log('Previous segments:', parsed.segments);
        console.log('Previous transcript:', parsed.transcript);
        alert('Recovery feature requires server support. Please start a new recording.');
      }
    }
    
    // Clear old recovery data
    sessionStorage.removeItem('conversation_recovery_' + question_name);
  } catch (e) {
    console.error('Failed to parse recovery data:', e);
  }
}

// Auto-save conversation state
if (window.conversationManager) {
  setInterval(() => {
    if (window.isConversationActive && window.conversationManager) {
      const state = {
        conversationId: window.conversationManager.conversationId,
        segments: window.conversationManager.segments,
        transcript: window.global_transcript,
        currentQuestion: window.conversationManager.currentAIQuestion,
        timestamp: Date.now()
      };
      sessionStorage.setItem('conversation_state_' + questionName, JSON.stringify(state));
      debugLog('metadata', 'Auto-saved conversation state');
    }
  }, 5000); // Every 5 seconds
}
```

### Task 24: Add Mobile-Specific Handling
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 15 minutes
**Dependencies:** Core system complete

Add mobile detection enhancements after getMobileOperatingSystem function:

```javascript
// Enhanced mobile detection for conversation UI
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Adjust UI for mobile conversations
function optimizeForMobile() {
  if (!isMobileDevice()) return;
  
  debugLog('ui', 'Optimizing for mobile device');
  
  // Adjust font sizes
  jQuery('#dynamic-question-title').css('font-size', '1.2rem');
  jQuery('#dynamic-question-description').css('font-size', '0.9rem');
  
  // Make buttons larger for touch
  jQuery('.fake-stop-button').css({
    'width': '80px',
    'height': '80px'
  });
  
  // Adjust AI processing overlay for mobile
  jQuery('.ai-thinking-content').css({
    'padding': '1rem',
    'max-width': '90%'
  });
}

// Call in loadPipe
if (window.conversationManager) {
  optimizeForMobile();
}
```

### Task 25: Comprehensive Testing Checklist
**Time:** 45 minutes
**Dependencies:** All implementation complete

### Core Functionality Tests:
1. ✅ **No Probing Mode**
   - Single recording completes normally
   - No AI calls made
   - Standard validation applies

2. ✅ **Moderate Probing (2-3 questions)**
   - Initial question displays
   - Fake stop button works
   - AI generates relevant follow-ups
   - Stops at 3 total questions

3. ✅ **Deep Probing (4-5 questions)**
   - Extended conversation flows
   - All segments recorded
   - Metadata captures all segments

### Technical Tests:
4. ✅ **Continuous Recording**
   - Video never actually stops until end
   - No intermediate uploads
   - Single S3 file created

5. ✅ **Metadata Output**
   - Console shows complete JSON
   - All timestamps accurate
   - Segment boundaries correct
   - AI processing gaps recorded

6. ✅ **Timer Behavior**
   - Continues during AI processing
   - Shows total conversation time
   - No resets between segments

### Error Scenarios:
7. ✅ **AI API Failure**
   - Graceful fallback
   - Conversation ends cleanly
   - Error logged in metadata

8. ✅ **WebSocket Failure**
   - Recording continues
   - Warning shown
   - Video still saved

9. ✅ **Browser Navigation**
   - Warning shown
   - State saved to sessionStorage
   - Recovery offered on return

### UI/UX Tests:
10. ✅ **Mobile Devices**
    - Touch events work
    - UI scales properly
    - Buttons accessible

11. ✅ **State Transitions**
    - Recording → AI Processing → Ready
    - No flashing or jumps
    - Clear visual feedback

12. ✅ **Modal Behavior**
    - Can't close during conversation
    - Success shows conversation summary
    - Record Again disabled during conversation

## Summary

Total Implementation Time: ~8 hours (increased due to fake stop button complexity)

### Key Implementation Strategy
The "fake stop button" approach allows continuous recording while appearing to stop/start for each question. This creates a single video file containing the entire conversation, with metadata marking segment boundaries for server-side processing.

### Deliverables Checklist
- [ ] Global state variables for conversation management
- [ ] Question configuration with probing levels
- [ ] ConversationManager class with segment tracking
- [ ] AIService class for OpenAI integration
- [ ] Fake stop button system overriding native behavior
- [ ] UI helpers for AI processing states
- [ ] CSS for conversation-specific states
- [ ] Modified validation for conversation mode
- [ ] Complete metadata output with timestamps
- [ ] Error handling and recovery systems
- [ ] Debug mode for testing
- [ ] Mobile optimizations

### Critical Success Factors
1. **Fake Stop Button**: Must intercept ALL stop attempts during conversation
2. **Timer Management**: Must show continuous time across segments
3. **State Management**: Clear transitions between recording/AI/ready states
4. **Error Resilience**: Graceful handling of AI/network failures
5. **Metadata Accuracy**: Precise timestamps for video processing

### Post-Implementation Tasks
1. **Required**:
   - Replace OpenAI API key with actual key
   - Test all three probing levels thoroughly
   - Verify fake stop button in all browsers
   - Confirm single video file upload to S3
   - Test metadata JSON structure

2. **Recommended**:
   - Set up server endpoint for video processing
   - Implement progress webhook for Qualtrics
   - Add conversation analytics
   - Create admin dashboard for reviewing conversations

3. **Optional**:
   - Add real-time transcript display
   - Implement conversation pause/resume
   - Add participant feedback collection
   - Create conversation export tools

### Testing Priority
1. Core flow with moderate probing (most common use case)
2. Error scenarios (API failures, network issues)
3. Edge cases (max duration, browser refresh)
4. Mobile devices (iOS and Android)
5. Different browsers (Chrome, Safari, Firefox)

### Known Limitations
1. Recovery requires server support (not implemented)
2. OpenAI API key is client-side (security concern)
3. Maximum conversation duration is hardcoded (10 minutes)
4. No real-time transcript display to user
5. Can't edit/undo responses within conversation