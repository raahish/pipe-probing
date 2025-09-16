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
    token: "2b0d154cf9bee4a3c9431afb651625a05ba11739",
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