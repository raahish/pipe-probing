/*
 * Qualtrics DeepGram WebSocket Test
 * 
 * This is a minimal test to verify if DeepGram WebSocket connections work within Qualtrics environment.
 * Based on the working implementation from test-deepgram-api.html
 * 
 * Instructions:
 * 1. Create a new "Text/Graphic" question in Qualtrics
 * 2. Add this code to the "Question JavaScript" section
 * 3. The question text can be: "DeepGram WebSocket Test - Check browser console for results"
 * 4. Test in Qualtrics preview to see if WebSocket works in that environment
 */

Qualtrics.SurveyEngine.addOnload(function() {
    console.log('🧪 DeepGram WebSocket Test - Starting...');
    
    // DeepGram Configuration - using the working API key from test
    const DEEPGRAM_API_KEY = "1189b2a8085fcccbf10862e04038fc6ae660f610";
    
    // Global variables for WebSocket test
    let ws = null;
    let mediaRecorder = null;
    let stream = null;
    let transcriptCount = 0;
    let permissionsGranted = false;
    let isRecording = false;
    
    // Enhanced logging function with multiple outputs
    function log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        
        // Log to console
        console.log(logMessage);
        
        // Also log to UI for visibility
        const transcriptDiv = document.getElementById('dg-transcript');
        if (transcriptDiv) {
            transcriptDiv.textContent += logMessage + '\n';
            transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
        }
    }
    
    // Separate function for transcript-only entries (cleaner UI)
    function logTranscriptOnly(message) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`);
    }
    
    // Create test UI elements
    function createTestUI() {
        const questionContainer = this.getQuestionContainer();
        
        const testHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h3>🧪 DeepGram WebSocket Test in Qualtrics</h3>
                <p><strong>Status:</strong> <span id="dg-status" style="padding: 5px 10px; border-radius: 4px; background-color: #f8d7da; color: #721c24;">Disconnected</span></p>
                
                <button id="dg-start-btn" style="background-color: #28a745; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 4px; cursor: pointer;">
                    Start Recording & Transcription
                </button>
                
                <button id="dg-stop-btn" style="background-color: #dc3545; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 4px; cursor: pointer;" disabled>
                    Stop Recording & Transcription
                </button>
                
                <button id="dg-clear-btn" style="background-color: #6c757d; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 4px; cursor: pointer;">
                    Clear Results
                </button>
                
                <div id="dg-transcript" style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; margin: 15px 0; min-height: 150px; border-radius: 4px; font-family: monospace; font-size: 12px; overflow-y: auto; max-height: 200px;">
                    Click "Start Recording" to begin WebSocket test...
                </div>
                
                <p style="font-size: 12px; color: #666;">
                    <strong>Instructions:</strong> Open browser console (F12) to see detailed logs. 
                    This test verifies if DeepGram WebSocket connections work within Qualtrics environment.
                </p>
            </div>
        `;
        
        questionContainer.innerHTML = testHTML;
        
        // Add event listeners
        document.getElementById('dg-start-btn').addEventListener('click', startTranscription);
        document.getElementById('dg-stop-btn').addEventListener('click', stopTranscription);
        document.getElementById('dg-clear-btn').addEventListener('click', clearResults);
    }
    
    // Update status display
    function updateStatus(status, type) {
        const statusEl = document.getElementById('dg-status');
        if (statusEl) {
            statusEl.textContent = status;
            
            // Update styling based on type
            switch(type) {
                case 'connected':
                    statusEl.style.backgroundColor = '#d4edda';
                    statusEl.style.color = '#155724';
                    break;
                case 'connecting':
                    statusEl.style.backgroundColor = '#fff3cd';
                    statusEl.style.color = '#856404';
                    break;
                case 'error':
                case 'disconnected':
                default:
                    statusEl.style.backgroundColor = '#f8d7da';
                    statusEl.style.color = '#721c24';
                    break;
            }
        }
    }
    
    // Add transcript entry to UI (separate from logs)
    function addTranscriptEntry(transcript, isFinal, count) {
        const timestamp = new Date().toLocaleTimeString();
        
        // Log to console with detailed info
        logTranscriptOnly(`${isFinal ? '✅ FINAL TRANSCRIPT' : '⏳ INTERIM TRANSCRIPT'} #${count}: "${transcript}"`);
        
        // Add to UI in a cleaner format
        const transcriptDiv = document.getElementById('dg-transcript');
        if (transcriptDiv && isFinal) { // Only show final transcripts in UI to avoid clutter
            const entry = `[${timestamp}] FINAL #${count}: "${transcript}"\n`;
            transcriptDiv.textContent += entry;
            transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
        }
    }
    
    // Start transcription - using exact working implementation
    async function startTranscription() {
        try {
            log('🎤 Starting DeepGram WebSocket test in Qualtrics...');
            updateStatus('Requesting microphone access...', 'connecting');
            
            // Only request microphone access if we don't have it yet
            if (!permissionsGranted || !stream) {
                log('🎤 Requesting microphone access...');
                
                // Get microphone access
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                permissionsGranted = true;
                log('✅ Microphone access granted');
            } else {
                log('🎤 Using existing microphone access');
            }
            
            // Create WebSocket connection - EXACT same as working test
            log('🔗 Connecting to DeepGram...');
            log('🔑 Using API key: ' + DEEPGRAM_API_KEY.substring(0, 8) + '...');
            
            ws = new WebSocket(
                'wss://api.deepgram.com/v1/listen?model=nova-3&language=en-US&smart_format=true&interim_results=true', 
                ['token', DEEPGRAM_API_KEY]
            );
            
            ws.onopen = () => {
                log('🎉 SUCCESS: DeepGram WebSocket connected in Qualtrics!');
                log('🔗 WebSocket State: ' + ws.readyState + ' (1 = OPEN)');
                log('🌐 WebSocket URL: ' + ws.url);
                updateStatus('Connected - Recording...', 'connected');
                
                // Start recording
                log('🎙️ Creating MediaRecorder...');
                try {
                    mediaRecorder = new MediaRecorder(stream, {
                        mimeType: 'audio/webm;codecs=opus'
                    });
                    log('✅ MediaRecorder created successfully');
                } catch (e) {
                    log('⚠️ Fallback: Creating MediaRecorder without mimeType');
                    mediaRecorder = new MediaRecorder(stream);
                }
                
                let chunkCount = 0;
                
                mediaRecorder.addEventListener('dataavailable', (event) => {
                    chunkCount++;
                    if (event.data.size > 0 && ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(event.data);
                        log(`📤 Chunk #${chunkCount}: Sent ${event.data.size} bytes to DeepGram`);
                    } else {
                        log(`⚠️ Chunk #${chunkCount}: Skipped (size: ${event.data.size}, ws state: ${ws ? ws.readyState : 'null'})`);
                    }
                });
                
                mediaRecorder.addEventListener('start', () => {
                    log('🎙️ MediaRecorder STARTED - audio recording active');
                });
                
                mediaRecorder.addEventListener('stop', () => {
                    log('🛑 MediaRecorder STOPPED');
                });
                
                mediaRecorder.addEventListener('error', (event) => {
                    log('❌ MediaRecorder ERROR: ' + event.error);
                });
                
                log('▶️ Starting MediaRecorder with 1000ms intervals...');
                mediaRecorder.start(1000); // Send data every 1 second
                isRecording = true;
                
                // Update UI
                document.getElementById('dg-start-btn').disabled = true;
                document.getElementById('dg-stop-btn').disabled = false;
                
                log('✅ Recording setup complete - speak now to test transcription!');
            };
            
            ws.onmessage = (event) => {
                log('📨 Received WebSocket message');
                
                try {
                    const data = JSON.parse(event.data);
                    log('📋 Message type: ' + data.type);
                    
                    if (data.type === 'Results') {
                        log('🎯 Processing Results message...');
                        
                        if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
                            const transcript = data.channel.alternatives[0].transcript;
                            const confidence = data.channel.alternatives[0].confidence;
                            
                            if (transcript && transcript.trim()) {
                                transcriptCount++;
                                log(`📝 Transcript found: "${transcript}" (confidence: ${confidence})`);
                                addTranscriptEntry(transcript, data.is_final, transcriptCount);
                            } else {
                                log('📝 Empty transcript received');
                            }
                        } else {
                            log('⚠️ Results message missing expected structure');
                            log('📊 Raw data: ' + JSON.stringify(data, null, 2));
                        }
                    } else if (data.type === 'Metadata') {
                        log('📊 Received DeepGram metadata');
                        log('📊 Metadata: ' + JSON.stringify(data, null, 2));
                    } else if (data.type === 'UtteranceEnd') {
                        log('🔚 Utterance ended');
                    } else if (data.type === 'SpeechStarted') {
                        log('🗣️ Speech started detected');
                    } else {
                        log('❓ Unknown message type: ' + data.type);
                        log('📊 Full message: ' + JSON.stringify(data, null, 2));
                    }
                } catch (error) {
                    log('❌ Error parsing DeepGram response: ' + error.message);
                    log('📊 Raw message: ' + event.data);
                }
            };
            
            ws.onerror = (error) => {
                log('❌ DeepGram WebSocket error in Qualtrics: ' + error);
                log('🔍 This indicates WebSocket connections may be blocked in Qualtrics environment');
                updateStatus('Connection error', 'error');
            };
            
            ws.onclose = (event) => {
                log(`🔌 DeepGram WebSocket closed: Code ${event.code} - ${event.reason || 'No reason provided'}`);
                
                // Specific error code analysis
                if (event.code === 1006) {
                    log('⚠️ Code 1006: Abnormal closure - likely blocked by Qualtrics CSP or network restrictions');
                } else if (event.code === 1002) {
                    log('⚠️ Code 1002: Protocol error - authentication may have failed');
                } else if (event.code === 1000) {
                    log('✅ Code 1000: Normal closure');
                }
                
                updateStatus('Disconnected', 'disconnected');
                cleanup();
            };
            
        } catch (error) {
            log('❌ Error starting transcription in Qualtrics: ' + error.message);
            updateStatus('Error: ' + error.message, 'error');
        }
    }
    
    // Stop transcription
    function stopTranscription() {
        log('🛑 Stopping transcription...');
        
        // Stop MediaRecorder first
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        
        // Wait a bit then close WebSocket
        setTimeout(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        }, 100);
        
        // Clean up UI immediately
        document.getElementById('dg-start-btn').disabled = false;
        document.getElementById('dg-stop-btn').disabled = true;
        updateStatus('Stopping...', 'connecting');
        
        isRecording = false;
    }
    
    // Cleanup resources
    function cleanup() {
        log('🧹 Cleaning up resources...');
        
        // Don't stop the media stream - keep it for reuse
        mediaRecorder = null;
        ws = null;
        isRecording = false;
        
        // Update UI
        const startBtn = document.getElementById('dg-start-btn');
        const stopBtn = document.getElementById('dg-stop-btn');
        
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        
        updateStatus('Disconnected', 'disconnected');
    }
    
    // Clear results
    function clearResults() {
        const transcriptDiv = document.getElementById('dg-transcript');
        if (transcriptDiv) {
            transcriptDiv.textContent = 'Click "Start Recording" to begin WebSocket test...\n';
        }
        transcriptCount = 0;
        log('🧹 Results and logs cleared');
    }
    
    // Initialize the test UI
    createTestUI.call(this);
    
    log('🚀 DeepGram WebSocket Test initialized in Qualtrics');
    log('📋 Test Environment: Qualtrics Survey Engine');
    log('🌐 User Agent: ' + navigator.userAgent.substring(0, 100) + '...');
    log('🔒 Protocol: ' + window.location.protocol);
    log('🏠 Origin: ' + window.location.origin);
    log('🎤 MediaDevices available: ' + !!navigator.mediaDevices);
    log('🔊 getUserMedia available: ' + !!navigator.mediaDevices?.getUserMedia);
    log('🌐 WebSocket available: ' + !!window.WebSocket);
    log('🎙️ MediaRecorder available: ' + !!window.MediaRecorder);
    
    // Test supported MIME types
    if (window.MediaRecorder) {
        const testTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
        log('🎵 Supported audio formats:');
        testTypes.forEach(type => {
            const supported = MediaRecorder.isTypeSupported(type);
            log(`   ${supported ? '✅' : '❌'} ${type}`);
        });
    }
});

Qualtrics.SurveyEngine.addOnReady(function() {
    console.log('✅ Qualtrics question ready - DeepGram test UI should be visible');
});

Qualtrics.SurveyEngine.addOnUnload(function() {
    console.log('🔄 Qualtrics question unloading - cleaning up DeepGram test');
    
    // Clean up any active connections
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        window.ws.close();
    }
    
    if (window.stream) {
        window.stream.getTracks().forEach(track => track.stop());
    }
});
