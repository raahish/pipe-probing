// Main Application Orchestrator - Coordinates all modules
// No template literals used - only string concatenation

var VideoRecorderApp = (function() {

  var Utils = window.Utils;
  var GlobalRegistry = window.GlobalRegistry;
  var StateManager = window.StateManager;

  // Application state
  var isInitialized = false;
  var initializationPromise = null;

  // Main Application API
  var VideoRecorderApp = {

    // Initialize the entire application
    initialize: function() {
      if (isInitialized) {
        Utils.Logger.warn('VideoRecorderApp', 'Application already initialized');
        return Promise.resolve();
      }

      if (initializationPromise) {
        return initializationPromise;
      }

      initializationPromise = this._initializeAsync();
      return initializationPromise;
    },

    // Internal initialization
    _initializeAsync: function() {
      return new Promise(function(resolve, reject) {
        Utils.Logger.info('VideoRecorderApp', 'Starting application initialization');

        try {
          // Step 1: Initialize global registry
          GlobalRegistry.initialize();
          Utils.Logger.info('VideoRecorderApp', 'Global registry initialized');

          // Step 1.5: Reset global transcript for fresh question context
          // CRITICAL: Prevents context pollution across multiple questions in survey
          window.global_transcript = '';
          Utils.Logger.info('VideoRecorderApp', 'Global transcript reset for new question');

          // Step 2: Initialize core modules
          VideoRecorderApp._initializeCoreModules();
          Utils.Logger.info('VideoRecorderApp', 'Core modules initialized');

          // Step 3: Initialize UI modules
          VideoRecorderApp._initializeUIModules();
          Utils.Logger.info('VideoRecorderApp', 'UI modules initialized');

          // Step 4: Initialize recording services
          VideoRecorderApp._initializeRecordingServices();
          Utils.Logger.info('VideoRecorderApp', 'Recording services initialized');

          // Step 5: Initialize AI services
          VideoRecorderApp._initializeAIServices();
          Utils.Logger.info('VideoRecorderApp', 'AI services initialized');

          // Step 6: Set up main application flow
          VideoRecorderApp._setupApplicationFlow();
          Utils.Logger.info('VideoRecorderApp', 'Application flow configured');

          isInitialized = true;
          Utils.Logger.info('VideoRecorderApp', 'Application initialization complete');

          resolve();

        } catch (error) {
          Utils.Logger.error('VideoRecorderApp', 'Initialization failed', error);
          reject(error);
        }
      });
    },

    // Initialize core modules
    _initializeCoreModules: function() {
      Utils.Logger.info('VideoRecorderApp', 'Initializing core modules');

      // Register state manager (no initialization needed)
      GlobalRegistry.register('stateManager', StateManager);

      // Initialize event handler
      var eventHandler = window.EventHandler;
      eventHandler.initialize();
      GlobalRegistry.register('eventHandler', eventHandler);

      Utils.Logger.info('VideoRecorderApp', 'Core modules registered');
    },

    // Initialize UI modules
    _initializeUIModules: function() {
      Utils.Logger.info('VideoRecorderApp', 'Initializing UI modules');

      var config = GlobalRegistry.getConfig();
      var questionName = config.questionName;

      // Initialize element controller
      var elementController = window.ElementController;
      elementController.initialize(questionName);
      GlobalRegistry.register('elementController', elementController);

      // Initialize timer manager
      var timerManager = window.TimerManager;
      timerManager.initialize();
      GlobalRegistry.register('timerManager', timerManager);

      // Initialize modal manager
      var modalManager = window.ModalManager;
      modalManager.initialize();
      GlobalRegistry.register('modalManager', modalManager);

      Utils.Logger.info('VideoRecorderApp', 'UI modules registered');
    },

    // Initialize recording services
    _initializeRecordingServices: function() {
      Utils.Logger.info('VideoRecorderApp', 'Initializing recording services');

      var config = GlobalRegistry.getConfig();

      // Initialize Pipe integration
      var pipeIntegration = window.PipeIntegration;
      pipeIntegration.initialize(config.questionName, config.pipeParams)
        .then(function() {
          GlobalRegistry.register('pipeIntegration', pipeIntegration);
          Utils.Logger.info('VideoRecorderApp', 'Pipe integration registered');
        })
        .catch(function(error) {
          Utils.Logger.error('VideoRecorderApp', 'Pipe integration initialization failed', error);
        });

      // Initialize transcription service
      var transcriptionService = window.TranscriptionService;
      transcriptionService.initialize(config.deepgram);
      GlobalRegistry.register('transcriptionService', transcriptionService);

      // Initialize validation
      var validation = window.Validation;
      GlobalRegistry.register('validation', validation);

      Utils.Logger.info('VideoRecorderApp', 'Recording services registered');
    },

    // Initialize AI services
    _initializeAIServices: function() {
      Utils.Logger.info('VideoRecorderApp', 'Initializing AI services');

      var config = GlobalRegistry.getConfig();

      // Initialize conversation manager
      var conversationManager = window.ConversationManager;
      conversationManager.initialize(config.questionName, null, config.questionConfig);
      GlobalRegistry.register('conversationManager', conversationManager);

      // Initialize AI service
      var aiService = window.AIService;
      aiService.initialize(config.openai.apiKey, config.openai.model);
      GlobalRegistry.register('aiService', aiService);

      Utils.Logger.info('VideoRecorderApp', 'AI services registered');
    },

    // Set up main application flow
    _setupApplicationFlow: function() {
      Utils.Logger.info('VideoRecorderApp', 'Setting up application flow');

      // Set up global functions for backward compatibility
      this._setupGlobalFunctions();

      // Set up permissions and instructions flow
      this._setupModalFlow();

      Utils.Logger.info('VideoRecorderApp', 'Application flow configured');
    },

    // Set up global functions for compatibility
    _setupGlobalFunctions: function() {
      var self = this;

      // Global functions that need to be available
      window.getCamAccess = function() {
        Utils.Logger.info('VideoRecorderApp', 'Camera access requested');

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
            .then(function(stream) {
              Utils.Logger.info('VideoRecorderApp', 'Camera access granted');

              // Close permissions modal and show instructions
              var modalManager = GlobalRegistry.get('modalManager');
              if (modalManager) {
                jQuery.modal.close();
                modalManager.showInstructions();
              }

              // Start the main application
              self.start();
            })
            .catch(function(err) {
              Utils.Logger.error('VideoRecorderApp', 'Camera access denied', err);
              // Still proceed to instructions
              var modalManager = GlobalRegistry.get('modalManager');
              if (modalManager) {
                jQuery.modal.close();
                modalManager.showInstructions();
              }
              self.start();
            });
        } else {
          Utils.Logger.warn('VideoRecorderApp', 'MediaDevices not available');
          var modalManager = GlobalRegistry.get('modalManager');
          if (modalManager) {
            jQuery.modal.close();
            modalManager.showInstructions();
          }
          self.start();
        }
      };

      window.modalClose = function() {
        Utils.Logger.info('VideoRecorderApp', 'Modal close triggered');
        var modalManager = GlobalRegistry.get('modalManager');
        if (modalManager) {
          modalManager.handleClose();
        }
        
        // Display the initial question from config
        var config = GlobalRegistry.getConfig();
        if (config.questionConfig && config.questionConfig.questionText) {
          Utils.Logger.info('VideoRecorderApp', 'Displaying initial question from config');
          
          var titleElement = Utils.DOM.select('#dynamic-question-title');
          var descElement = Utils.DOM.select('#dynamic-question-description');
          
          if (titleElement && titleElement.length > 0) {
            titleElement.text(config.questionConfig.questionText);
            Utils.Logger.debug('VideoRecorderApp', 'Question title updated: ' + config.questionConfig.questionText);
          }
          
          if (descElement && descElement.length > 0) {
            descElement.text('Click record when ready to respond.');
          }
        } else {
          Utils.Logger.warn('VideoRecorderApp', 'No question config found or questionText missing');
        }
      };

      window.modalRetake = function() {
        Utils.Logger.info('VideoRecorderApp', 'Modal retake triggered');
        var modalManager = GlobalRegistry.get('modalManager');
        if (modalManager) {
          modalManager.handleRetake();
        }
      };

      window.nextQuestion = function() {
        Utils.Logger.info('VideoRecorderApp', 'Next question triggered');
        jQuery.modal.close();
        if (typeof document.querySelector('.NextButton') !== 'undefined') {
          document.querySelector('.NextButton').click();
        }
      };

      // Mobile OS detection - now handled in qualtrics-question-js.js
      // The function is already defined and initialized there

      // Legacy functions for compatibility
      window.playVideoCustom = function() {
        var pipeIntegration = GlobalRegistry.get('pipeIntegration');
        if (pipeIntegration) {
          pipeIntegration.playVideo();
        }
      };

      window.playVideoEvent = function() {
        var pipeIntegration = GlobalRegistry.get('pipeIntegration');
        if (pipeIntegration) {
          pipeIntegration.playVideo();
        }
      };

      window.stoppedVideo = function() {
        var elementController = GlobalRegistry.get('elementController');
        if (elementController) {
          elementController.setPlaybackState();
        }
      };

      window.showGallary = function() {
        Utils.Logger.info('VideoRecorderApp', 'Gallery view requested');
        // Gallery functionality would be implemented here if needed
      };

      window.backToCamera = function() {
        Utils.Logger.info('VideoRecorderApp', 'Back to camera requested');
        var elementController = GlobalRegistry.get('elementController');
        if (elementController) {
          elementController.setReadyToRecordWithVideoState();
        }
      };

      Utils.Logger.info('VideoRecorderApp', 'Global functions configured');
    },

    // Set up modal flow
    _setupModalFlow: function() {
      // Set up permissions modal on page load
      jQuery(function() {
        Utils.Logger.info('VideoRecorderApp', 'Setting up initial modal flow');

        // CRITICAL: Close any lingering modals from previous question
        // This prevents VQ1's success modal from appearing on VQ2's page
        // when VQ1's delayed onSaveOk callback fires after navigation
        jQuery.modal.close();
        jQuery('#modal-buttons').hide();

        jQuery('#SkinContent #Buttons').hide();
        jQuery('#NextButton-custom').hide();

        var modalManager = GlobalRegistry.get('modalManager');
        if (modalManager) {
          modalManager.showPermissions();
        }
      });

      Utils.Logger.info('VideoRecorderApp', 'Modal flow configured');
    },

    // Start the main application
    start: function() {
      Utils.Logger.info('VideoRecorderApp', 'Starting main application');

      // Initialize the application if not already done
      return this.initialize().then(function() {
        Utils.Logger.info('VideoRecorderApp', 'Application started successfully');
      }).catch(function(error) {
        Utils.Logger.error('VideoRecorderApp', 'Application start failed', error);
        StateManager.setError('Application initialization failed: ' + error.message);
      });
    },

    // Get application status
    getStatus: function() {
      var registryState = GlobalRegistry.getState();
      var stateManagerState = StateManager.getState();
      var performanceMetrics = GlobalRegistry.getPerformanceMetrics();

      return {
        initialized: isInitialized,
        currentState: stateManagerState.current,
        modulesRegistered: Object.keys(GlobalRegistry.getAllModules()).length,
        performance: performanceMetrics,
        config: GlobalRegistry.getConfig(),
        errors: registryState.hasError ? registryState.errorMessage : null
      };
    },

    // Cleanup application
    cleanup: function() {
      Utils.Logger.info('VideoRecorderApp', 'Cleaning up application');

      // Cleanup all modules
      var modules = GlobalRegistry.getAllModules();
      for (var moduleName in modules) {
        var module = modules[moduleName];
        if (module && typeof module.cleanup === 'function') {
          try {
            module.cleanup();
          } catch (error) {
            Utils.Logger.error('VideoRecorderApp', 'Cleanup failed for ' + moduleName, error);
          }
        }
      }

      // Cleanup global registry
      GlobalRegistry.cleanup();

      isInitialized = false;
      initializationPromise = null;

      Utils.Logger.info('VideoRecorderApp', 'Application cleanup complete');
    },

    // Debug information
    debug: function() {
      var status = this.getStatus();
      var modules = GlobalRegistry.getAllModules();

      var debugInfo = {
        status: status,
        modules: {}
      };

      for (var moduleName in modules) {
        var module = modules[moduleName];
        if (module && typeof module.getInfo === 'function') {
          debugInfo.modules[moduleName] = module.getInfo();
        }
      }

      Utils.Logger.info('VideoRecorderApp', 'Debug information:');
      console.log(JSON.stringify(debugInfo, null, 2));

      return debugInfo;
    }
  };

  // Export VideoRecorderApp
  return VideoRecorderApp;

})();

// Auto-initialize the application when the script loads
VideoRecorderApp.initialize();
