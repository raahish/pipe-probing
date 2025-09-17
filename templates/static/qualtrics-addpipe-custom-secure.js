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
  console.log('Retake---');
  jQuery('#pipeDownload-' + questionName).hide();
  try {
    this.recorderObjectGlobal.pause();
  } catch (err) {}
  skipQuestionValidation();
  jQuery('#SkinContent #Buttons').hide();
  jQuery('.retake-button').remove();
  jQuery('.pipeTimer').hide();
  jQuery('.pipeTimer-custom').hide();
  jQuery('#pipeRec-' + questionName).show();
  jQuery('#pipePlay-' + questionName).attr('style', 'display: none;');
  jQuery('.back-to-camera').remove();
  jQuery('#time-span').remove();
  jQuery('#pipeMenu-' + questionName).append(
    '<button class="play-custom-btn" id="time-span" onClick="playVideoCustom()" title="Preview recording"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5,3 19,12 5,21"/></svg><span style="font-size: 0.75rem; margin-top: 0.25rem;">' + Math.round(streamTime) + 's</span></button>'
  );
  jQuery('#pipePlay-' + questionName + ' svg').attr('style', 'display:none !important');
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
      '<button class="play-custom-btn" id="time-span" onClick="playVideoCustom()" title="Preview recording"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5,3 19,12 5,21"/></svg><span style="font-size: 0.75rem; margin-top: 0.25rem;">' + Math.round(streamTime) + 's</span></button>'
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
  jQuery.modal.close();
  retake();
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
    
    // Set playback state for clean UI
    jQuery('#pipeMenu-' + questionName).removeClass('recording-state').addClass('playback-state');
    jQuery('#pipeMenu-' + questionName).append(
      '<button class="retake-button" onClick="retake()" title="Record again"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg></button>'
    );
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
    jQuery('#error').append(
      '<div style="display: flex; gap: 0.5rem; margin-top: 1.5rem; justify-content: center;"><button class="btn btn-secondary" onClick="modalRetake()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>Record Again</button><button class="btn btn-primary" onClick="nextQuestion()"><span>Continue</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9,18 15,12 9,6"/></svg></button></div>'
    );
    jQuery('#error').modal({
      escapeClose: true,
      clickClose: true,
      showClose: true,
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