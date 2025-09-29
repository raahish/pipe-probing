// AI Service - OpenAI integration for conversation management
// No template literals used - only string concatenation

var AIService = (function() {

  var Utils = window.Utils;
  var GlobalRegistry = window.GlobalRegistry;

  // AI Service API
  var AIService = {

    // Initialize AI service
    initialize: function(apiKey, model) {
      this.apiKey = apiKey;
      this.model = model || 'gpt-4o';
      this.maxRetries = 2;
      this.retryDelay = 1000; // 1 second

      Utils.Logger.info('AIService', 'AI service initialized with model: ' + this.model);
    },

    // Get follow-up question from AI
    getFollowUpQuestion: function(conversationManager) {
      var self = this;
      var lastError = null;

      Utils.Logger.info('AIService', 'Getting follow-up question from AI');

      // Retry logic for API calls
      return new Promise(function(resolve, reject) {
        var attempt = 0;

        function tryRequest() {
          attempt++;
          Utils.Logger.info('AIService', 'Attempt ' + attempt + '/' + self.maxRetries);

          try {
            var systemPrompt = self.buildSystemPrompt(conversationManager.config, conversationManager.currentProbeCount);

            fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + self.apiKey
              },
              body: JSON.stringify({
                model: self.model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  ...conversationManager.conversationThread
                ],
                temperature: 0.7,
                max_tokens: 200,
                response_format: { type: 'json_object' }
              })
            })
            .then(function(response) {
              if (!response.ok) {
                return response.text().then(function(errorData) {
                  throw new Error('OpenAI API error: ' + response.status + ' - ' + errorData);
                });
              }
              return response.json();
            })
            .then(function(data) {
              var aiResponseText = data.choices[0].message.content;

              // Parse the response
              var aiResponse = self.parseAIResponse(aiResponseText);

              Utils.Logger.info('AIService', 'AI response received:', aiResponse);
              resolve(aiResponse);
            })
            .catch(function(error) {
              Utils.Logger.error('AIService', 'API request failed (attempt ' + attempt + ')', error);
              lastError = error;

              // If not the last attempt, wait before retrying
              if (attempt < self.maxRetries) {
                Utils.Logger.info('AIService', 'Retrying in ' + self.retryDelay + 'ms...');
                setTimeout(tryRequest, self.retryDelay);
              } else {
                // All attempts failed
                Utils.Logger.error('AIService', 'All AI service attempts failed', lastError);
                resolve({
                  hasMoreQuestions: false,
                  error: lastError.message,
                  shouldContinue: false
                });
              }
            });
          } catch (error) {
            Utils.Logger.error('AIService', 'Request setup failed', error);
            lastError = error;

            if (attempt < self.maxRetries) {
              setTimeout(tryRequest, self.retryDelay);
            } else {
              resolve({
                hasMoreQuestions: false,
                error: lastError.message,
                shouldContinue: false
              });
            }
          }
        }

        tryRequest();
      });
    },

    // Parse AI response
    parseAIResponse: function(responseText) {
      try {
        // Try to parse as JSON first
        var parsed = JSON.parse(responseText);

        // Handle different response formats
        if (parsed.isDone === true || parsed.done === true) {
          return {
            hasMoreQuestions: false,
            question: null,
            reasoning: parsed.reasoning || 'Interview complete',
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
        Utils.Logger.warn('AIService', 'Failed to parse AI response as JSON', jsonError);

        // Fallback: treat as plain text question
        var cleanText = responseText.trim();
        if (cleanText.length > 0 && !this.isCompletionResponse(cleanText)) {
          return {
            hasMoreQuestions: true,
            question: cleanText,
            reasoning: 'Parsed as plain text',
            shouldContinue: true
          };
        }
      }

      // Default: no more questions
      return {
        hasMoreQuestions: false,
        question: null,
        reasoning: 'Could not parse response',
        shouldContinue: false
      };
    },

    // Check if response indicates completion
    isCompletionResponse: function(text) {
      var lowerText = text.toLowerCase();
      var completionKeywords = [
        'no more questions',
        'interview complete',
        'sufficient information',
        'thoroughly answered',
        'done',
        'finished',
        'complete'
      ];

      return completionKeywords.some(function(keyword) {
        return lowerText.includes(keyword);
      });
    },

    // Build system prompt
    buildSystemPrompt: function(questionConfig, currentProbeCount) {
      var systemPromptBase = window.probingSystemPrompts[questionConfig.probingAmount] || '';
      var maxQuestions = window.maxProbesByLevel[questionConfig.probingAmount] || 0;
      var remainingQuestions = maxQuestions - currentProbeCount;

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
    },

    // Test API connectivity
    testConnection: function() {
      var self = this;

      return new Promise(function(resolve, reject) {
        if (!self.isConfigured()) {
          reject(new Error('OpenAI API key not configured'));
          return;
        }

        fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': 'Bearer ' + self.apiKey
          }
        })
        .then(function(response) {
          if (!response.ok) {
            throw new Error('API test failed: ' + response.status);
          }
          Utils.Logger.info('AIService', 'OpenAI API connection successful');
          resolve(true);
        })
        .catch(function(error) {
          Utils.Logger.error('AIService', 'OpenAI API connection failed', error);
          reject(error);
        });
      });
    },

    // Check if service is configured
    isConfigured: function() {
      return this.apiKey && this.apiKey !== 'sk-...' && this.apiKey.startsWith('sk-');
    },

    // Get AI service info for debugging
    getInfo: function() {
      return {
        configured: this.isConfigured(),
        model: this.model,
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
        apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 7) + '...' : 'none'
      };
    },

    // State change handler
    onStateChange: function(oldState, newState, data) {
      Utils.Logger.debug('AIService', 'State change: ' + oldState + ' -> ' + newState);

      // AI service is primarily event-driven
    },

    // Cleanup
    cleanup: function() {
      Utils.Logger.info('AIService', 'AI service cleanup complete');
    }
  };

  // Export AIService
  return AIService;

})();
