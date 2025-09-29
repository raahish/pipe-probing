// Element Controller - DOM element management and UI state control
// No template literals used - only string concatenation

var ElementController = (function() {

  var Utils = window.Utils;
  var GlobalRegistry = window.GlobalRegistry;
  var StateManager = window.StateManager;

  // Element Controller API
  var ElementController = {

    // Initialize with question name
    initialize: function(questionName) {
      this.questionName = questionName;
      this.selectors = this.buildSelectors();
      this.elements = this.getElements();

      Utils.Logger.info('ElementController', 'Initialized for question: ' + questionName);
    },

    // Build element selectors
    buildSelectors: function() {
      var qn = this.questionName;
      return {
        recordButton: '#pipeRec-' + qn,
        nativePlayButton: '#pipePlay-' + qn,
        customPlayButton: '.play-custom-btn',
        timer: '.pipeTimer-custom',
        nativeTimer: '.pipeTimer',
        backButton: '.back-to-camera',
        menu: '#pipeMenu-' + qn,
        videoContainer: '#' + qn,
        nextButton: '#NextButton-custom'
      };
    },

    // Get DOM elements safely
    getElements: function() {
      var elements = {};
      for (var selectorName in this.selectors) {
        var selector = this.selectors[selectorName];
        elements[selectorName] = Utils.DOM.select(selector);
      }
      return elements;
    },

    // Refresh element cache (for when DOM changes after initialization)
    refreshElements: function() {
      Utils.Logger.debug('ElementController', 'Refreshing element cache');
      this.elements = this.getElements();
      
      // Log what we found
      for (var selectorName in this.elements) {
        var element = this.elements[selectorName];
        var exists = element && element.length > 0;
        Utils.Logger.debug('ElementController', 'Element ' + selectorName + ': ' + (exists ? 'found' : 'not found'));
      }
      
      Utils.Logger.info('ElementController', 'Element cache refreshed');
    },

    // Element visibility management
    showElement: function(selectorName) {
      var element = this.elements[selectorName];
      if (element && element.length > 0) {
        element.show().css('opacity', '1');
        Utils.Logger.debug('ElementController', 'Showed element: ' + selectorName);
      }
    },

    hideElement: function(selectorName) {
      var element = this.elements[selectorName];
      if (element && element.length > 0) {
        element.hide();
        Utils.Logger.debug('ElementController', 'Hid element: ' + selectorName);
      }
    },

    removeElement: function(selectorName) {
      var element = this.elements[selectorName];
      if (element && element.length > 0) {
        element.remove();
        Utils.Logger.debug('ElementController', 'Removed element: ' + selectorName);
      }
    },

    // Force hide with aggressive styling
    forceHideElement: function(selectorName) {
      var element = this.elements[selectorName];
      if (element && element.length > 0) {
        element.attr('style', 'display: none !important; opacity: 0 !important;');
        Utils.Logger.debug('ElementController', 'Force hid element: ' + selectorName);
      }
    },

    // UI State Management Methods
    getCurrentState: function() {
      var menu = this.elements.menu;
      if (!menu || menu.length === 0) {
        return 'unknown';
      }

      if (menu.hasClass('recording-state')) {
        return 'recording';
      } else if (menu.hasClass('playback-state')) {
        return 'playback';
      } else if (menu.hasClass('ai-processing-state')) {
        return 'processing';
      } else {
        return 'ready';
      }
    },

    setReadyToRecordState: function() {
      Utils.Logger.info('ElementController', 'Setting ready-to-record state');

      this.showElement('recordButton');
      this.forceHideElement('nativePlayButton');
      this.removeElement('customPlayButton');
      this.removeElement('backButton');
      this.hideElement('timer');
      this.hideElement('nativeTimer');

      // Ensure we have fresh element references
      var menu = this.elements.menu;
      if (!menu || menu.length === 0) {
        Utils.Logger.warn('ElementController', 'Menu element not found, refreshing cache');
        this.refreshElements();
        menu = this.elements.menu;
      }

      if (menu && menu.length > 0) {
        menu.removeClass('playback-state recording-state ai-processing-state').addClass('ready-state');
        Utils.Logger.debug('ElementController', 'Added ready-state class to menu');
      }

      this.updateButtonState('record');
    },

    setReadyToRecordWithVideoState: function() {
      Utils.Logger.info('ElementController', 'Setting ready-to-record-with-video state');

      this.setReadyToRecordState();

      // Add custom play button for existing video
      var menu = this.elements.menu;
      if (menu && menu.length > 0) {
        var playButton = Utils.DOM.create('button', {
          'class': 'play-custom-btn',
          'id': 'time-span',
          'onclick': 'playVideoCustom()',
          'title': 'Preview existing recording'
        });

        var svg = Utils.DOM.create('svg', {
          'width': '16',
          'height': '16',
          'viewBox': '0 0 24 24',
          'fill': 'none',
          'stroke': 'currentColor',
          'stroke-width': '2',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        });

        var polygon = Utils.DOM.create('polygon', {
          'points': '5,3 19,12 5,21'
        });

        svg.append(polygon);
        playButton.append(svg);

        var span = Utils.DOM.create('span', {
          'style': 'font-size: 0.75rem; margin-top: 0.25rem;'
        });

        playButton.append(span);
        menu.append(playButton);
      }
    },

    setRecordingState: function() {
      Utils.Logger.info('ElementController', 'Setting recording state');

      // Ensure we have fresh element references
      var menu = this.elements.menu;
      if (!menu || menu.length === 0) {
        Utils.Logger.warn('ElementController', 'Menu element not found, refreshing cache');
        this.refreshElements();
        menu = this.elements.menu;
      }

      if (menu && menu.length > 0) {
        menu.removeClass('ready-state playback-state ai-processing-state').addClass('recording-state');
        Utils.Logger.debug('ElementController', 'Added recording-state class to menu');
      } else {
        Utils.Logger.error('ElementController', 'Still cannot find menu element after refresh');
      }

      this.updateButtonToStop();
    },

    setPlaybackState: function() {
      Utils.Logger.info('ElementController', 'Setting playback state');

      // Ensure we have fresh element references
      var menu = this.elements.menu;
      if (!menu || menu.length === 0) {
        Utils.Logger.warn('ElementController', 'Menu element not found, refreshing cache');
        this.refreshElements();
        menu = this.elements.menu;
      }

      if (menu && menu.length > 0) {
        menu.removeClass('recording-state ready-state ai-processing-state').addClass('playback-state');
        Utils.Logger.debug('ElementController', 'Added playback-state class to menu');
      }

      this.hideElement('recordButton');
      this.showElement('nativePlayButton');
    },

    // Button state management
    updateButtonState: function(state) {
      var button = this.elements.recordButton;
      if (!button || button.length === 0) return;

      if (state === 'record') {
        this.updateButtonToRecord();
      } else if (state === 'stop') {
        this.updateButtonToStop();
      }
    },

    updateButtonToRecord: function() {
      var button = this.elements.recordButton;
      if (!button || button.length === 0) return;

      // Remove all state classes
      button.removeClass('pipeRecStop pipeRecRec');

      // Set record button appearance
      var svgHtml = '<svg style="enable-background:new 0 0 16 16;" version="1.1" width="30" height="30" viewBox="0 0 100 100" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<circle cx="50" cy="50" r="30" fill="red"></circle>' +
        '<circle cx="50" cy="50" r="40" stroke="black" stroke-width="8" fill="none"></circle>' +
        '</svg>';

      button.html(svgHtml);
      button.attr('title', 'record');
      button.removeClass('pipeBtn').addClass('pipeBtn');

      // Force visibility
      button.css({
        'display': 'block',
        'visibility': 'visible',
        'opacity': '1',
        'pointer-events': 'auto'
      }).prop('disabled', false).show();

      Utils.Logger.debug('ElementController', 'Button updated to record state');
    },

    updateButtonToStop: function() {
      var button = this.elements.recordButton;
      if (!button || button.length === 0) return;

      // Change button appearance to stop
      button.removeClass('pipeRecRec').addClass('pipeRecStop');
      button.find('svg').remove();

      var stopSvgHtml = '<svg style="enable-background:new 0 0 16 16;" version="1.1" width="30" height="30" viewBox="0 0 100 100" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<rect x="25" y="25" width="50" height="50" fill="red"></rect>' +
        '</svg>';

      button.html(stopSvgHtml);
      button.attr('title', 'stop');

      Utils.Logger.debug('ElementController', 'Button updated to stop state');
    },

    // Timer management
    startTimer: function() {
      var menu = this.elements.menu;
      if (!menu || menu.length === 0) return;

      // Add timer if not exists
      if (Utils.DOM.select('.pipeTimer-custom').length === 0) {
        var timerDiv = Utils.DOM.create('div', {
          'class': 'pipeTimer-custom'
        }, '00:00');
        menu.append(timerDiv);
      }

      this.showElement('timer');
      Utils.Logger.debug('ElementController', 'Timer started');
    },

    updateTimer: function(timeString) {
      var timer = Utils.DOM.select('.pipeTimer-custom');
      if (timer && timer.length > 0) {
        timer.text(timeString);
      }
    },

    stopTimer: function() {
      this.hideElement('timer');
      Utils.Logger.debug('ElementController', 'Timer stopped');
    },

    // Question display management
    showQuestion: function(question) {
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

      Utils.Logger.debug('ElementController', 'Question updated: ' + question);
    },

    // Processing state management
    showProcessingState: function() {
      // Ensure we have fresh element references
      var menu = this.elements.menu;
      if (!menu || menu.length === 0) {
        Utils.Logger.warn('ElementController', 'Menu element not found, refreshing cache');
        this.refreshElements();
        menu = this.elements.menu;
      }
      
      if (!menu || menu.length === 0) {
        Utils.Logger.error('ElementController', 'Still cannot find menu element for processing state');
        return;
      }

      var overlay = Utils.DOM.create('div', {
        'class': 'ai-processing-overlay'
      });

      var content = Utils.DOM.create('div', {
        'class': 'ai-thinking-content'
      });

      var spinner = Utils.DOM.create('div', {
        'class': 'ai-thinking-spinner'
      });

      var title = Utils.DOM.create('h3', {}, 'AI is thinking...');
      var subtitle = Utils.DOM.create('p', {}, 'Analyzing your response and preparing a follow-up question');

      content.append(spinner);
      content.append(title);
      content.append(subtitle);
      overlay.append(content);
      menu.append(overlay);

      menu.addClass('ai-processing-state');

      var descElement = Utils.DOM.select('#dynamic-question-description');
      if (descElement && descElement.length > 0) {
        descElement.text('Please wait while AI processes your response...');
      }

      Utils.Logger.info('ElementController', 'Processing state shown');
    },

    hideProcessingState: function() {
      Utils.DOM.select('.ai-processing-overlay').fadeOut(300, function() {
        Utils.DOM.select(this).remove();
      });

      var menu = this.elements.menu;
      if (menu && menu.length > 0) {
        menu.removeClass('ai-processing-state');
      }

      Utils.Logger.info('ElementController', 'Processing state hidden');
    },

    // Modal management
    showPermissionsModal: function() {
      Utils.DOM.select('#permission').modal({
        escapeClose: false,
        clickClose: false,
        showClose: false
      });
    },

    showInstructionsModal: function() {
      Utils.DOM.select('#recordInstruction').modal();
    },

    showSuccessModal: function(metadata) {
      var title = Utils.DOM.select('#record-title');
      var image = Utils.DOM.select('#image-sucess');
      var result = Utils.DOM.select('#result');

      title.empty();
      image.empty();
      result.empty();

      if (metadata && metadata.segments && metadata.segments.length > 0) {
        // Conversation success
        title.append('Interview Completed Successfully!');

        var totalQuestions = metadata.segments.length;
        var duration = metadata.totalDuration;
        var minutes = Math.floor(duration / 60);
        var seconds = Math.round(duration % 60);

        var successMessage = 'Great job! You answered ' + totalQuestions + ' question' +
          (totalQuestions > 1 ? 's' : '') + ' in ' + minutes + ':' +
          (seconds < 10 ? '0' : '') + seconds + '. Thank you for your thoughtful responses!';

        result.addClass('success-feedback').append(successMessage);
      } else {
        // Regular recording success
        title.append('Perfect! Video Recorded Successfully');
        var regularMessage = 'Your video response has been recorded successfully! You can now continue to the next question.';
        result.addClass('success-feedback').append(regularMessage);
      }

      // Add success icon
      var successIcon = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: hsl(var(--success));"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>';
      image.append(successIcon);

      // Show modal buttons
      Utils.DOM.select('#modal-buttons').show();

      Utils.DOM.select('#error').modal({
        escapeClose: true,
        clickClose: true,
        showClose: true,
        onClose: function() {
          Utils.DOM.select('#modal-buttons').hide();
          ElementController.setReadyToRecordWithVideoState();
        }
      });

      Utils.Logger.info('ElementController', 'Success modal shown');
    },

    showErrorModal: function(errorMessage) {
      var title = Utils.DOM.select('#record-title');
      var image = Utils.DOM.select('#image-sucess');
      var result = Utils.DOM.select('#result');

      title.empty();
      image.empty();
      result.empty();

      title.append('Recording needs improvement');

      var errorIcon = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: hsl(var(--destructive));"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
      image.append(errorIcon);

      result.addClass('error-feedback');
      result.append('<li style="font-size:15px;padding-left:5px;">Your video didn\'t meet our requirements</li>');
      result.append('<li style="font-size:15px;padding-left:5px;">' + errorMessage + '</li>');

      var retryButton = '<button class="btn btn-destructive" onClick="modalRetake()" style="margin-top: 1rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>Try Again</button>';
      result.append(retryButton);

      Utils.DOM.select('#error').modal({
        escapeClose: false,
        clickClose: false,
        showClose: false
      });

      Utils.Logger.info('ElementController', 'Error modal shown');
    },

    // State change handler
    onStateChange: function(oldState, newState, data) {
      Utils.Logger.debug('ElementController', 'State change: ' + oldState + ' -> ' + newState);

      switch (newState) {
        case StateManager.getStates().READY:
          this.setReadyToRecordState();
          break;
        case StateManager.getStates().RECORDING:
          this.setRecordingState();
          this.startTimer();
          break;
        case StateManager.getStates().PROCESSING:
          this.showProcessingState();
          break;
        case StateManager.getStates().CONVERSATION_ACTIVE:
          // Handled by conversation manager
          break;
        case StateManager.getStates().COMPLETE:
          // Success modal handled by recording service
          break;
        case StateManager.getStates().ERROR:
          if (data && data.error) {
            this.showErrorModal(data.error);
          }
          break;
      }
    },

    // Cleanup
    cleanup: function() {
      Utils.Logger.info('ElementController', 'Cleaning up element controller');

      // Remove any dynamic elements
      this.removeElement('customPlayButton');
      this.removeElement('backButton');
      Utils.DOM.select('.ai-processing-overlay').remove();

      Utils.Logger.info('ElementController', 'Element controller cleanup complete');
    }
  };

  // Export ElementController
  return ElementController;

})();
