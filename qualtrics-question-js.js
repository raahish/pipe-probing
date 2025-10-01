var questionName = "VQ1";
var videoURL = "VQ1_pipe_url";
var mimetype = 'audio/webm';
var Q_CHL = "${e://Field/Q_CHL}";
var pipeParams = {
    size: {
        width: "100%",
        height: 510,
    },
    qualityurl: "avq/480p.xml",
    accountHash: "fb6878ab6bdc0a6bc55c2a6b3f695e05",
    eid: "KCfFkj",
    mrt: 300,
    avrec: 1,
    sis: 1,
    mimetype: mimetype,
    questionName: questionName,
    payload: "${e://Field/ResponseID}",
};
var validationDetails = {
    min_stremtime: 30,
	required: true
}
if (Q_CHL == "preview"){
	var validationDetails = {

		min_stremtime: 0,
		required: false
	}
}

var deepGramConfiguration = {
    endPoint: "wss://api.deepgram.com/v1/listen",
    token: "1189b2a8085fcccbf10862e04038fc6ae660f610", // Working DeepGram API key
};

// Question configuration for AI probing
var questionConfig = {
    questionText: "What are your current nutritional goals you're trying to achieve? Why?",
    probingInstructions: "Make sure to understand what motivates them to choose their goals. Explore both the practical and emotional reasons behind their choices.",
    probingAmount: "Moderate" // Options: "None", "Moderate", "Deep"
};

// OpenAI Configuration (temporary client-side)
var OPENAI_API_KEY = "sk-proj-..."; // Replace with actual key
var OPENAI_MODEL = "gpt-4o"; // Using gpt-4 for better JSON responses

// System prompts for each probing level
var probingSystemPrompts = {
    "None": "You should not ask any follow-up questions.",
    "Moderate": "You are an expert qualitative researcher. Ask 1-3 thoughtful follow-up questions to better understand the participant's response. " +
    "Focus on: " +
    "- Clarifying vague statements " +
    "- Exploring key motivations " +
    "- Understanding context " +
    "Stop when you have sufficient depth or reach 3 questions total.",
    "Deep": "You are an expert qualitative researcher conducting an in-depth interview. Ask 3-5 probing follow-up questions to thoroughly explore the participant's response. " +
    "Focus on: " +
    "- Uncovering underlying motivations and emotions " +
    "- Exploring contradictions or interesting points " +
    "- Getting specific examples and stories " +
    "- Understanding the full context and implications " +
    "Continue until you have comprehensive understanding or reach 5 questions total."
};

// Probing limits
var maxProbesByLevel = {
    "None": 0,
    "Moderate": 3,
    "Deep": 5
};

// Essential functions that must be available immediately
function getMobileOperatingSystem() {
    var userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // 🔍 SAFARI DEBUG: Comprehensive mobile detection logging
    console.log('🔍 SAFARI DEBUG - Mobile OS Detection:');
    console.log('  📱 Full User Agent: ' + userAgent);
    console.log('  📱 Navigator vendor: ' + (navigator.vendor || 'not available'));
    console.log('  📱 Platform: ' + (navigator.platform || 'not available'));
    console.log('  📱 Touch support: ' + ('ontouchstart' in window));
    console.log('  📱 Max touch points: ' + (navigator.maxTouchPoints || 'not available'));
    console.log('  📱 Is mobile: ' + /Mobi|Android/i.test(userAgent));
    console.log('  📱 Is iOS: ' + /iPad|iPhone|iPod/.test(userAgent));
    console.log('  📱 Is Safari: ' + (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)));
    console.log('  📱 Is Chrome: ' + /Chrome/.test(userAgent));
    
    if (/windows phone/i.test(userAgent)) {
        window.mimetype = 'audio/webm';
        console.log('  📱 Detected: Windows Phone');
    } else if (/android/i.test(userAgent)) {
        window.mimetype = 'audio/webm';
        console.log('  📱 Detected: Android');
    } else if (/iPad|iPhone|iPod/.test(userAgent)) {
        window.mimetype = 'audio/mp4';
        console.log('  📱 Detected: iOS Device');
    } else {
        window.mimetype = 'audio/webm';
        console.log('  📱 Detected: Desktop/Other');
    }
    console.log('Mobile OS detected, mimetype set to: ' + window.mimetype);
}

function modalClose() {
    console.log('Modal close triggered');
    jQuery.modal.close();
}

function modalRetake() {
    console.log('Modal retake triggered');
    jQuery.modal.close();
    // Will be enhanced by the modular system when it loads
}

function nextQuestion() {
    console.log('Next question triggered');
    jQuery.modal.close();
    if (typeof document.querySelector('.NextButton') !== 'undefined') {
        document.querySelector('.NextButton').click();
    }
}

function updateEmbeddedData(data){
    Qualtrics.SurveyEngine.setEmbeddedData(videoURL, data);
}

// Initialize mimetype immediately
getMobileOperatingSystem();

Qualtrics.SurveyEngine.addOnload(function() {

    jQuery("#SkinContent #Buttons").hide();
    jQuery("#NextButton-custom").hide();
    jQuery("#permission").modal({
        escapeClose: false,
        clickClose: false,
        showClose: false
    });
});

Qualtrics.SurveyEngine.addOnReady(function() {});

Qualtrics.SurveyEngine.addOnUnload(function() {});