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
    mrt: 120,
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
    token: "YOUR_DEEPGRAM_API_KEY_HERE", // Replace with a valid DeepGram API key
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

// Start function

function updateEmbeddedData(data){
    Qualtrics.SurveyEngine.setEmbeddedData(videoURL, data);
}


Qualtrics.SurveyEngine.addOnload(function() {

    jQuery("#SkinContent #Buttons").hide();
    jQuery("#NextButton-custom").hide();
    getMobileOperatingSystem();
    jQuery("#permission").modal({
        escapeClose: false,
        clickClose: false,
        showClose: false
    });
});

Qualtrics.SurveyEngine.addOnReady(function() {});

Qualtrics.SurveyEngine.addOnUnload(function() {});