# Conversational AI Recording System - Requirements Document

## Overview
This document outlines the requirements for implementing a conversational AI interview system within the Qualtrics video recording component. The system enables dynamic follow-up questions based on user responses, creating an intelligent interview experience.

## Core Concept
- **Single Continuous Recording**: One video file captures the entire conversation
- **AI-Driven Follow-ups**: OpenAI GPT-4o generates contextual follow-up questions
- **Timestamp-Based Segmentation**: Server-side processing extracts user response segments
- **Seamless User Experience**: No recording interruptions during AI processing

## System Architecture

### Client-Side Components
1. **Continuous Recording Manager**: Handles single recording session with pause/resume UI
2. **AI Integration Module**: Manages OpenAI API calls for follow-up questions
3. **Timestamp Tracker**: Records precise timing for each conversation segment
4. **Metadata Compiler**: Generates comprehensive JSON for server processing

### Data Flow
```
User Response → Transcription → AI Analysis → Follow-up Question → User Response
     ↓                                                                    ↓
Timestamp Mark                                                    Timestamp Mark
     ↓                                                                    ↓
                        Final Metadata JSON Output
```

## Detailed Requirements

### 1. Configuration Structure
Location: `qualtrics-question-js.js`

```javascript
const questionConfig = {
  questionText: "What are your current nutritional goals you're trying to achieve? Why?",
  probingInstructions: "Make sure to understand what motivates them to choose their goals.",
  probingAmount: "Moderate" // Options: "None", "Moderate", "Deep"
};

const OPENAI_API_KEY = "sk-..."; // Temporary client-side implementation
```

### 2. Probing Level Definitions

#### None
- No AI calls
- Single recording of initial response only
- Immediate completion after first answer

#### Moderate
- Maximum 2-3 follow-up questions
- Instruction: "Ask 2-3 clarifying questions to better understand the participant's response. Focus on key points that need elaboration."

#### Deep
- Maximum 4-5 follow-up questions
- Instruction: "Conduct thorough probing with 4-5 follow-up questions. Explore underlying motivations, contexts, and nuances in the participant's responses."

### 3. Recording Behavior

#### Start
- Display initial question from configuration
- Begin continuous recording on first "Record" click
- Initialize timestamp tracking

#### "Stop" (Actually Pause)
- Do NOT stop Pipe recording
- Mark segment end timestamp
- Close transcription WebSocket
- Show "AI is thinking..." UI
- Disable record button with loading indicator
- Pause timer display

#### AI Processing
- Send conversation thread to OpenAI
- Display follow-up question when received
- Re-enable record button for continuation
- If AI returns `{"isDone": true}`, proceed to final stop

#### Resume
- Mark new segment start timestamp
- Continue with same recording session
- Restart transcription for new segment

#### Final Stop
- Actually stop Pipe recording after AI completion
- Upload full video to S3 (normal process)
- Store URL in Qualtrics embedded data
- Output complete metadata JSON to console

### 4. AI Integration Details

#### API Configuration
- Model: GPT-4o
- Response format: JSON enforced
- Temperature: 0.7 (balanced creativity/consistency)
- Max tokens: 150 (for question generation)

#### System Prompt Template
```
You are an expert qualitative researcher conducting an interview.

Original Question: [questionText]
Probing Instructions: [probingInstructions]
Probing Level: [probingAmount] - [probingLevelInstructions]

Based on the conversation, generate a follow-up question or return {"isDone": true} if:
- The original question is thoroughly answered
- Probing instructions are satisfied
- Maximum probes reached

Respond ONLY in JSON format:
{"nextQuestion": "Your follow-up question here", "isDone": false}
OR
{"isDone": true}
```

#### Conversation Thread Format
```javascript
[
  { role: "assistant", content: "What are your nutritional goals?" },
  { role: "user", content: "I want to lose weight and eat healthier" },
  { role: "assistant", content: "What motivates you to lose weight?" },
  { role: "user", content: "I want to feel more energetic..." }
]
```

### 5. Metadata Output Structure
```javascript
{
  "conversationId": "VQ1_20231201_143022",
  "responseId": "R_xyz123",
  "questionConfig": {
    "questionText": "What are your current nutritional goals?",
    "probingInstructions": "Understand motivations",
    "probingAmount": "Moderate"
  },
  "totalDuration": 180.5,
  "recordingStartTime": 1701442222000,
  "recordingEndTime": 1701442402500,
  "fullVideoUrl": "https://s3.us-east-1.amazonaws.com/com.knit.pipe-recorder-videos/abc123.mp4",
  "segments": [
    {
      "segmentId": 1,
      "aiQuestion": "What are your current nutritional goals?",
      "startTime": 0,
      "endTime": 45.2,
      "duration": 45.2,
      "transcript": "I want to lose weight and eat healthier...",
      "type": "user_response"
    },
    {
      "segmentId": 2,
      "aiQuestion": "What motivates you to lose weight?",
      "startTime": 52.1,
      "endTime": 98.7,
      "duration": 46.6,
      "transcript": "I want to feel more energetic...",
      "type": "user_response"
    }
  ],
  "aiProcessingGaps": [
    {
      "startTime": 45.2,
      "endTime": 52.1,
      "duration": 6.9,
      "type": "ai_processing"
    }
  ],
  "totalProbes": 2,
  "completionReason": "ai_satisfied", // or "max_probes_reached"
  "errors": []
}
```

### 6. UI/UX Requirements

#### Question Display
- Dynamically update `.question-title` with current question
- Initial question shown before recording starts
- Smooth transitions between questions

#### Recording States
- **Recording**: Red dot indicator, active timer
- **AI Processing**: Disabled button with ellipsis (...), paused timer
- **Ready for Follow-up**: Enabled record button, question displayed

#### Timer Behavior
- Continuous count during recording
- Pause at segment end during AI processing
- Resume from paused time when recording continues
- Format: MM:SS

#### Navigation Warning
```javascript
window.addEventListener('beforeunload', (e) => {
  if (isConversationActive) {
    e.preventDefault();
    e.returnValue = 'Your interview is in progress. Are you sure you want to leave?';
  }
});
```

### 7. Error Handling

#### OpenAI API Failure
- Log error to console with details
- Continue to success modal without follow-up
- Include error in metadata JSON
- No user-facing error message

#### Transcription Failure
- Continue recording without transcript
- Mark segment as "no_transcript"
- Log warning to console

#### Maximum Probes Safety
- Hard limit of 5 probes regardless of configuration
- Auto-complete conversation at limit
- Log "max_probes_reached" in metadata

### 8. Constraints & Limitations

#### Technical
- Maximum conversation duration: 10 minutes
- Maximum file size: 500MB
- Probe limit: 5 follow-ups
- Response timeout: 30 seconds for AI

#### Business Logic
- One conversation per page load
- No resume after browser refresh
- No partial conversation saves
- English language only (initial version)

### 9. Success Criteria
- Continuous recording works without interruption
- AI generates relevant follow-up questions
- Metadata accurately reflects conversation structure
- No data loss during recording
- Smooth user experience throughout

### 10. Future Considerations (Not in Scope)
- Server-side video processing
- Real-time transcript display
- Multi-language support
- Conversation analytics
- Partial conversation recovery

## Acceptance Criteria
1. ✅ Single continuous video file uploaded to S3
2. ✅ Accurate timestamp metadata for all segments
3. ✅ AI follow-up questions based on responses
4. ✅ Proper probe counting and limits
5. ✅ Complete metadata JSON in console
6. ✅ No recording interruptions during conversation
7. ✅ Graceful error handling
8. ✅ Navigation protection during active conversation