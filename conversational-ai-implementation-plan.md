# Conversational AI Recording System - Implementation Plan

## Overview
This document provides a detailed, chronologically ordered implementation plan for the conversational AI recording system. Each task is granular and builds upon previous tasks.

## Phase 1: Configuration Setup (Tasks 1-5)

### Task 1: Update Question Configuration Structure
**File:** `qualtrics-question-js.js`
**Time:** 15 minutes

Add question configuration object after line 22:
```javascript
// Question configuration for AI probing
var questionConfig = {
  questionText: "What are your current nutritional goals you're trying to achieve? Why?",
  probingInstructions: "Make sure to understand what motivates them to choose their goals.",
  probingAmount: "Moderate" // Options: "None", "Moderate", "Deep"
};

// OpenAI Configuration (temporary client-side)
var OPENAI_API_KEY = "sk-..."; // Replace with actual key
var OPENAI_MODEL = "gpt-4o";

// Probing level instructions
var probingLevelInstructions = {
  "None": "",
  "Moderate": "Ask 2-3 clarifying questions to better understand the participant's response. Focus on key points that need elaboration.",
  "Deep": "Conduct thorough probing with 4-5 follow-up questions. Explore underlying motivations, contexts, and nuances in the participant's responses."
};

// Probing limits
var maxProbesByLevel = {
  "None": 0,
  "Moderate": 3,
  "Deep": 5
};
```

### Task 2: Create Conversation Manager Class
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 30 minutes

Add after line 76 (after ElementController):
```javascript
// Conversation Manager for AI-driven interviews
class ConversationManager {
  constructor(questionConfig) {
    this.questionConfig = questionConfig;
    this.segments = [];
    this.conversationThread = [];
    this.currentProbeCount = 0;
    this.maxProbes = maxProbesByLevel[questionConfig.probingAmount] || 5;
    this.conversationStartTime = null;
    this.currentSegmentStartTime = null;
    this.isProcessingAI = false;
    this.conversationId = `${questionName}_${Date.now()}`;
  }

  startConversation() {
    this.conversationStartTime = Date.now();
    this.currentSegmentStartTime = 0;
    // Add initial question to thread
    this.conversationThread.push({
      role: "assistant",
      content: this.questionConfig.questionText
    });
  }

  markSegmentEnd(transcript) {
    const now = Date.now();
    const segmentEnd = (now - this.conversationStartTime) / 1000;
    
    const segment = {
      segmentId: this.segments.length + 1,
      aiQuestion: this.conversationThread[this.conversationThread.length - 1].content,
      startTime: this.currentSegmentStartTime,
      endTime: segmentEnd,
      duration: segmentEnd - this.currentSegmentStartTime,
      transcript: transcript,
      type: "user_response"
    };
    
    this.segments.push(segment);
    this.conversationThread.push({
      role: "user",
      content: transcript
    });
    
    console.log(`Segment ${segment.segmentId} recorded:`, segment);
    return segment;
  }

  markAIProcessingStart() {
    this.isProcessingAI = true;
    const now = Date.now();
    return (now - this.conversationStartTime) / 1000;
  }

  markAIProcessingEnd(nextQuestion) {
    this.isProcessingAI = false;
    const now = Date.now();
    this.currentSegmentStartTime = (now - this.conversationStartTime) / 1000;
    
    if (nextQuestion && nextQuestion !== "N/A") {
      this.conversationThread.push({
        role: "assistant",
        content: nextQuestion
      });
      this.currentProbeCount++;
    }
  }

  shouldContinueProbing() {
    return this.currentProbeCount < this.maxProbes;
  }

  getMetadata(fullVideoUrl) {
    const now = Date.now();
    const totalDuration = (now - this.conversationStartTime) / 1000;
    
    return {
      conversationId: this.conversationId,
      responseId: Qualtrics.SurveyEngine.getEmbeddedData('ResponseID') || 'preview',
      questionConfig: this.questionConfig,
      totalDuration: totalDuration,
      recordingStartTime: this.conversationStartTime,
      recordingEndTime: now,
      fullVideoUrl: fullVideoUrl,
      segments: this.segments,
      aiProcessingGaps: this.calculateProcessingGaps(),
      totalProbes: this.currentProbeCount,
      completionReason: this.currentProbeCount >= this.maxProbes ? "max_probes_reached" : "ai_satisfied",
      errors: []
    };
  }

  calculateProcessingGaps() {
    const gaps = [];
    for (let i = 0; i < this.segments.length - 1; i++) {
      gaps.push({
        startTime: this.segments[i].endTime,
        endTime: this.segments[i + 1].startTime,
        duration: this.segments[i + 1].startTime - this.segments[i].endTime,
        type: "ai_processing"
      });
    }
    return gaps;
  }
}

var conversationManager;
```

### Task 3: Add Global Variables for Conversation State
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 5 minutes

Add after line 11:
```javascript
var isConversationActive = false;
var shouldActuallyStop = false;
var aiProcessingTimer = null;
```

### Task 4: Create AI Service Module
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 20 minutes

Add after ConversationManager class:
```javascript
// AI Service for OpenAI integration
class AIService {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async getFollowUpQuestion(conversationThread, questionConfig) {
    try {
      const systemPrompt = this.buildSystemPrompt(questionConfig);
      
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
            ...conversationThread
          ],
          temperature: 0.7,
          max_tokens: 150,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = JSON.parse(data.choices[0].message.content);
      
      console.log('AI Response:', aiResponse);
      return aiResponse;
      
    } catch (error) {
      console.error('AI Service Error:', error);
      return { isDone: true, error: error.message };
    }
  }

  buildSystemPrompt(questionConfig) {
    const probingInstructions = probingLevelInstructions[questionConfig.probingAmount] || "";
    
    return `You are an expert qualitative researcher conducting an interview.

Original Question: ${questionConfig.questionText}
Probing Instructions: ${questionConfig.probingInstructions}
Probing Level: ${questionConfig.probingAmount} - ${probingInstructions}

Based on the conversation, generate a follow-up question or return {"isDone": true} if:
- The original question is thoroughly answered
- Probing instructions are satisfied
- Maximum probes reached

Respond ONLY in JSON format:
{"nextQuestion": "Your follow-up question here", "isDone": false}
OR
{"isDone": true}`;
  }
}

var aiService;
```

### Task 5: Update HTML to Show Dynamic Question
**File:** `qualtrics-question-html.html`
**Time:** 10 minutes

Replace lines 3-4:
```html
<h2 class="question-title" id="dynamic-question-title">Please record your video response</h2>
<p class="question-description" id="dynamic-question-description">Take your time to provide a thoughtful response. You'll be guided through the process step by step.</p>
```

## Phase 2: Recording Flow Modifications (Tasks 6-10)

### Task 6: Modify loadPipe Function
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 15 minutes

Update loadPipe function (line 96) to initialize conversation components:
```javascript
const loadPipe = async function (question_name, pipeParams, deepGramConfiguration) {
  skipQuestionValidation();
  console.log('questionName::', questionName);
  
  // Initialize element controller for clean UI management
  elementController = new ElementController(question_name);
  
  // Initialize conversation manager and AI service
  conversationManager = new ConversationManager(questionConfig);
  aiService = new AIService(OPENAI_API_KEY, OPENAI_MODEL);
  
  // Display initial question
  jQuery('#dynamic-question-title').text(questionConfig.questionText);
  jQuery('#dynamic-question-description').text('Click record when you\'re ready to begin.');
  
  jQuery('#pipeDownload-' + questionName).hide();
  // ... rest of existing code
```

### Task 7: Modify Record Button Handler
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 20 minutes

Replace btRecordPressed handler (line 114):
```javascript
recorderObject.btRecordPressed = function (recorderId) {
  try {
    console.log('btRecordPressed >>> ');
    
    // Initialize conversation on first record
    if (!isConversationActive) {
      conversationManager.startConversation();
      isConversationActive = true;
      
      // Set up navigation warning
      window.addEventListener('beforeunload', handleNavigationWarning);
    }
    
    startRecordingClicked();
    jQuery('#NextButton-custom').hide();
    isRecording = true;
    
    // Reset transcript for this segment
    global_transcript = '';
    
    // ... rest of existing WebSocket code
    
  } catch (err) {
    console.log(err.message);
  }
};
```

### Task 8: Modify Stop Button Handler
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 30 minutes

Replace btStopRecordingPressed handler (line 169):
```javascript
recorderObject.btStopRecordingPressed = async function (recorderId) {
  clearInterval(intervalID);
  
  var args = Array.prototype.slice.call(arguments);
  console.log('btStopRecordingPressed(' + args.join(', ') + ')');
  
  // Close transcription WebSocket
  isRecording = false;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  
  // Check if this should be the final stop
  if (shouldActuallyStop || questionConfig.probingAmount === "None") {
    // Actually stop recording
    console.log('Final stop - ending conversation');
    stoppedVideo();
    isConversationActive = false;
    window.removeEventListener('beforeunload', handleNavigationWarning);
    return;
  }
  
  // Otherwise, just pause for AI processing
  console.log('Pausing for AI processing');
  
  // Mark segment end
  const segment = conversationManager.markSegmentEnd(global_transcript);
  const aiStartTime = conversationManager.markAIProcessingStart();
  
  // Update UI for AI processing
  showAIProcessingUI();
  
  // Check if we should continue probing
  if (!conversationManager.shouldContinueProbing()) {
    console.log('Max probes reached, completing conversation');
    shouldActuallyStop = true;
    completeConversation();
    return;
  }
  
  // Get AI follow-up question
  const aiResponse = await aiService.getFollowUpQuestion(
    conversationManager.conversationThread,
    questionConfig
  );
  
  conversationManager.markAIProcessingEnd(aiResponse.nextQuestion);
  
  if (aiResponse.isDone || aiResponse.error) {
    console.log('AI indicates completion or error:', aiResponse);
    shouldActuallyStop = true;
    completeConversation();
  } else {
    // Show next question and prepare for recording
    showNextQuestion(aiResponse.nextQuestion);
  }
};
```

### Task 9: Create UI Helper Functions
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 25 minutes

Add after AIService class:
```javascript
// UI Helper Functions
function showAIProcessingUI() {
  // Disable record button
  jQuery('#pipeRec-' + questionName).prop('disabled', true);
  
  // Change button icon to ellipsis
  const recordBtn = jQuery('#pipeRec-' + questionName);
  recordBtn.find('svg').replaceWith(`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="1"/>
      <circle cx="19" cy="12" r="1"/>
      <circle cx="5" cy="12" r="1"/>
    </svg>
  `);
  
  // Pause timer display
  const currentTime = jQuery('.pipeTimer-custom').text();
  clearInterval(intervalID);
  
  // Show AI thinking message
  jQuery('#dynamic-question-description').text('AI is analyzing your response...');
}

function showNextQuestion(question) {
  // Update question display
  jQuery('#dynamic-question-title').text(question);
  jQuery('#dynamic-question-description').text('Click record when ready to continue.');
  
  // Re-enable record button
  jQuery('#pipeRec-' + questionName).prop('disabled', false);
  
  // Restore record icon
  const recordBtn = jQuery('#pipeRec-' + questionName);
  recordBtn.find('svg').replaceWith(`
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
    </svg>
  `);
}

function completeConversation() {
  // Show completion UI
  showAIProcessingUI();
  jQuery('#dynamic-question-description').text('Finalizing your interview...');
  
  // Trigger actual recording stop
  setTimeout(() => {
    recorderObject.stop();
  }, 500);
}

function handleNavigationWarning(e) {
  if (isConversationActive) {
    e.preventDefault();
    e.returnValue = 'Your interview is in progress. Are you sure you want to leave?';
    return e.returnValue;
  }
}
```

### Task 10: Update Timer Display Logic
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 15 minutes

Modify getTime function (around line 580):
```javascript
function getTime(recorderObject) {
  if (!recorderObject || conversationManager.isProcessingAI) {
    return; // Don't update timer during AI processing
  }
  
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

## Phase 3: Metadata and Completion (Tasks 11-15)

### Task 11: Modify onSaveOk Handler
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 15 minutes

Update onSaveOk to capture metadata (line 197):
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
  // Only process metadata if conversation is complete
  if (!shouldActuallyStop) {
    return;
  }
  
  const videoUrl = `${S3_BASE_URL}${streamName}.mp4`;
  const metadata = conversationManager.getMetadata(videoUrl);
  
  // Output metadata to console
  console.log('=== CONVERSATION METADATA ===');
  console.log(JSON.stringify(metadata, null, 2));
  console.log('=============================');
  
  // Continue with existing validation
  const transcript_array = global_transcript.split(' ');
  validateVideo(recorderObject, transcript_array, location, streamName);
};
```

### Task 12: Update Success Modal for Conversation
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 10 minutes

Modify validateVideo success case (around line 541):
```javascript
jQuery('#record-title').append('Interview Completed Successfully!');

// Add conversation summary
const totalQuestions = conversationManager.segments.length;
const totalDuration = Math.round(conversationManager.segments[conversationManager.segments.length - 1].endTime);
sucessModalDetails = `Your interview included ${totalQuestions} responses over ${totalDuration} seconds. Thank you for your thoughtful answers!`;
```

### Task 13: Handle "None" Probing Level
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 10 minutes

Add check in btRecordPressed:
```javascript
// Inside btRecordPressed, after conversation initialization
if (questionConfig.probingAmount === "None") {
  console.log('No probing configured - single response only');
  shouldActuallyStop = true;
}
```

### Task 14: Add CSS for AI Processing State
**File:** `templates/qualtrics-addpipe-custom.css`
**Time:** 10 minutes

Add at end of file:
```css
/* AI Processing State */
[id^="pipeRec-"]:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

[id^="pipeRec-"]:disabled:hover {
  transform: none;
  box-shadow: var(--shadow-sm);
}

.ai-processing-indicator {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
```

### Task 15: Add Error Recovery
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 15 minutes

Update AI error handling in btStopRecordingPressed:
```javascript
// Inside btStopRecordingPressed, after AI call
if (aiResponse.error) {
  console.error('AI Error, completing conversation:', aiResponse.error);
  conversationManager.metadata.errors.push({
    type: 'ai_error',
    message: aiResponse.error,
    timestamp: Date.now()
  });
  shouldActuallyStop = true;
  completeConversation();
  return;
}
```

## Phase 4: Testing and Refinement (Tasks 16-20)

### Task 16: Create Test Configuration
**File:** `qualtrics-question-js.js`
**Time:** 5 minutes

Add test configurations:
```javascript
// Test configurations (comment/uncomment as needed)
// TEST 1: No probing
// var questionConfig = {
//   questionText: "What is your name?",
//   probingInstructions: "Just get their name",
//   probingAmount: "None"
// };

// TEST 2: Moderate probing
// var questionConfig = {
//   questionText: "What are your career goals?",
//   probingInstructions: "Understand their motivations and timeline",
//   probingAmount: "Moderate"
// };

// TEST 3: Deep probing
// var questionConfig = {
//   questionText: "Tell me about a challenging experience",
//   probingInstructions: "Explore emotions, learnings, and impact",
//   probingAmount: "Deep"
// };
```

### Task 17: Add Debug Logging
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 10 minutes

Add debug function:
```javascript
function debugLog(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(data);
  }
}
```

Replace console.log calls with debugLog throughout.

### Task 18: Implement Conversation State Recovery
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 15 minutes

Add state persistence:
```javascript
// Save conversation state periodically
function saveConversationState() {
  if (!conversationManager) return;
  
  const state = {
    conversationId: conversationManager.conversationId,
    segments: conversationManager.segments,
    thread: conversationManager.conversationThread,
    probeCount: conversationManager.currentProbeCount
  };
  
  sessionStorage.setItem('conversationState', JSON.stringify(state));
}

// Call after each segment
setInterval(saveConversationState, 5000); // Every 5 seconds
```

### Task 19: Add Visual Feedback for Recording State
**File:** `templates/static/qualtrics-addpipe-custom-secure.js`
**Time:** 10 minutes

Enhance UI state management:
```javascript
function updateRecordingStateUI(state) {
  const menuElement = jQuery('#pipeMenu-' + questionName);
  
  switch(state) {
    case 'recording':
      menuElement.addClass('conversation-recording');
      break;
    case 'ai-processing':
      menuElement.addClass('conversation-ai-processing');
      break;
    case 'ready':
      menuElement.removeClass('conversation-recording conversation-ai-processing');
      break;
  }
}
```

### Task 20: Final Integration Testing
**Time:** 30 minutes

1. Test with `probingAmount: "None"` - Verify single recording
2. Test with `probingAmount: "Moderate"` - Verify 2-3 follow-ups
3. Test with `probingAmount: "Deep"` - Verify 4-5 follow-ups
4. Test AI failure scenario - Verify graceful completion
5. Test navigation warning - Verify prevention works
6. Test metadata output - Verify JSON structure
7. Test timer behavior - Verify pause during AI
8. Test S3 upload - Verify single video file

## Summary

Total Implementation Time: ~5.5 hours

### Deliverables Checklist
- [ ] Updated `qualtrics-question-js.js` with configuration
- [ ] Modified `qualtrics-addpipe-custom-secure.js` with conversation logic
- [ ] Updated `qualtrics-question-html.html` with dynamic question display
- [ ] Added CSS for AI processing states
- [ ] Functional continuous recording with AI follow-ups
- [ ] Complete metadata JSON output in console
- [ ] Error handling and recovery
- [ ] Navigation protection
- [ ] Comprehensive logging

### Post-Implementation Tasks
1. Replace OpenAI API key with actual key
2. Test in Qualtrics preview mode
3. Verify S3 upload permissions
4. Monitor console for metadata output
5. Document any environment-specific adjustments needed