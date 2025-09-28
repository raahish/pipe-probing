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
      recordButton: `#pipeRec-${questionName}`,
      nativePlayButton: `#pipePlay-${questionName}`,
      customPlayButton: '.play-custom-btn',
      timer: '.pipeTimer-custom',
      nativeTimer: '.pipeTimer',
      backButton: '.back-to-camera',
      menu: `#pipeMenu-${questionName}`
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
  jQuery('#pipeDownload-' + questionName).hide();
  PipeSDK.insert(question_name, pipeParams, function (recorderObject) {
    /**
     * Handler for when recorder is ready to record.
     */
    recorderObject.onReadyToRecord = async function (recorderId, recorderType) {
      jQuery('.pipeTimer').hide();
    };

    /**
     * Handler for record button pressed.
     */
    recorderObject.btRecordPressed = function (recorderId) {
      try {
        console.log('btRecordPressed >>> ');
        startRecordingClicked();
        jQuery('#NextButton-custom').hide();
        isRecording = true;
        global_transcript = '';
        const videoEl = document.getElementById('pipeVideoInput-' + question_name);
        mediaRecorder = new MediaRecorder(videoEl.srcObject, {
          mimeType: pipeParams.mimeType,
        });
        ws = new WebSocket(deepGramConfiguration.endPoint, ['token', deepGramConfiguration.token]);
        console.log('WebSocket >>> ');
        ws.onopen = function (ev) {
          console.log(ev);
          mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data.size > 0 && ws.readyState == 1) {
              console.log('Sent ', event.data);
              ws.send(event.data);
            } 
            if (ws.readyState == 3 && mediaRecorder.state != 'inactive') {
              mediaRecorder.stop();
            }
          });
          if (mediaRecorder.state != 'recording') {
            mediaRecorder.start(1000);
          }
          ws.onclose = function (ev) {
            console.log(ev);
          };
          ws.onerror = function (ev) {
            console.log(ev);
          };
        };
        intervalID = setInterval(getTime, 1000, recorderObject);
        ws.onmessage = function (message) {
          const received = JSON.parse(message.data);
          console.log('Received ', received);
          const transcript = received.channel.alternatives[0].transcript;
          if (transcript && received.is_final) {
            console.log('transcript >>>', transcript);
            global_transcript += transcript + ' ';
          }
        };
        ws.onerror = function (ev) {
          console.log(ev);
        };
      } catch (err) {
        console.log(err.message);
      }
    };

    /**
     * Handler for stop recording button pressed.
     */
    recorderObject.btStopRecordingPressed = function (recorderId) {
      clearInterval(intervalID);

      var args = Array.prototype.slice.call(arguments);
      console.log('btStopRecordingPressed(' + args.join(', ') + ')');
      isRecording = false;
      ws.close();
      stoppedVideo();
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
  jQuery('#modal-buttons').hide();
  jQuery.modal.close();
  // Use the new element controller for consistent state
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
  jQuery.modal.close();
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
    const URL = `${S3_BASE_URL}${streamName}.mp4`;
    updateEmbeddedData(URL);
    jQuery('#NextButton-custom').show();
    jQuery('#next-button-modal').remove();
    jQuery('.retake-button').remove();
    jQuery('#record-title').append('Perfect! Video Recorded Successfully');
    
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
    sucessModalDetails = 'Your video response has been recorded successfully! You can now continue to the next question.';
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
  jQuery('.pipeTimer-custom').empty().append('00:00');
  var totalSeconds = Math.round(recorderObject.getStreamTime());
  var timerValue = arrengeTimeString(parseInt(totalSeconds / 60)) + ':' + arrengeTimeString(totalSeconds % 60);
  jQuery('.pipeTimer-custom').empty().append(timerValue);
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