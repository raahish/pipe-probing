# Qualtrics Video Recorder Integration

A custom video recording solution for Qualtrics surveys that enables respondents to record video responses with real-time audio transcription.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [File Structure](#file-structure)
- [How It Works](#how-it-works)
- [API Integrations](#api-integrations)
- [Validation Rules](#validation-rules)
- [Browser Compatibility](#browser-compatibility)
- [Known Issues](#known-issues)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Overview

This project implements a custom video recorder within Qualtrics surveys using the AddPipe video recording service. It provides a seamless recording experience with real-time audio transcription via DeepGram API and includes features like video validation, retake functionality, and automatic upload to AWS S3.

## Features

- 📹 **Video Recording**: Full video and audio capture using AddPipe SDK
- 🎤 **Real-time Transcription**: Audio transcription via DeepGram WebSocket API
- ✅ **Video Validation**: Minimum duration requirements with visual feedback
- 🔄 **Retake Functionality**: Users can re-record if not satisfied
- 📱 **Mobile Support**: Automatic format detection for iOS/Android
- 💾 **Automatic Upload**: Videos uploaded to S3 with URL stored in Qualtrics
- 🎨 **Custom UI/UX**: Modal-based workflow with branded styling

## Architecture

```
┌─────────────────────┐
│  Qualtrics Survey   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────┐
│    HTML Template    │────▶│   AddPipe SDK   │
│  (Question Text)    │     └────────┬────────┘
└─────────────────────┘              │
           │                         ▼
           ▼                ┌─────────────────┐
┌─────────────────────┐     │   AWS S3        │
│ Custom JavaScript   │     │ Video Storage   │
│  (Question JS)      │     └─────────────────┘
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────┐
│  Secure JS File     │────▶│  DeepGram API   │
│ (Main Logic)        │     │ (Transcription) │
└─────────────────────┘     └─────────────────┘
```

## Installation

### Qualtrics Setup

1. **Create a Text Entry Question** in your Qualtrics survey
2. **Add HTML Content**:
   - Click on the question text
   - Switch to HTML view
   - Copy the contents of `qualtrics-question-html.html`
   - Update the question text on line 1

3. **Add JavaScript**:
   - Click on the question's gear icon
   - Select "Add JavaScript"
   - Copy the contents of `qualtrics-question-js.js`

4. **Host Static Files**:
   - Upload `templates/static/qualtrics-addpipe-custom-secure.js` to your server
   - Upload `templates/qualtrics-addpipe-custom.css` to your server
   - Update the URLs in the HTML file to point to your hosted files

## Configuration

### JavaScript Configuration (`qualtrics-question-js.js`)

```javascript
// Question identifier
var questionName = "VQ1";

// Qualtrics embedded data field name
var videoURL = "VQ1_pipe_url";

// AddPipe configuration
var pipeParams = {
    size: { width: "100%", height: 510 },
    qualityurl: "avq/480p.xml",
    accountHash: "YOUR_ADDPIPE_ACCOUNT_HASH",
    eid: "YOUR_ENVIRONMENT_ID",
    mrt: 120,  // Max recording time in seconds
    avrec: 1,  // 1 = audio+video, 0 = audio only
    sis: 1,    // Show in stream
    mimetype: mimetype,
    questionName: questionName,
    payload: "${e://Field/ResponseID}"
};

// Validation settings
var validationDetails = {
    min_stremtime: 30,  // Minimum recording time in seconds
    required: true      // Whether video is required
};

// DeepGram configuration
var deepGramConfiguration = {
    endPoint: "wss://api.deepgram.com/v1/listen",
    token: "YOUR_DEEPGRAM_API_KEY"
};
```

### S3 Configuration

Update the S3 base URL in `qualtrics-addpipe-custom-secure.js`:

```javascript
var S3_BASE_URL = 'https://s3.us-east-1.amazonaws.com/your-bucket-name/';
```

## File Structure

```
pipe-probing/
├── qualtrics-question-html.html      # HTML template for Qualtrics question
├── qualtrics-question-js.js          # JavaScript for Qualtrics integration
├── templates/
│   ├── qualtrics-addpipe-custom.css  # Custom styling
│   └── static/
│       └── qualtrics-addpipe-custom-secure.js  # Main application logic
```

## How It Works

### User Flow

1. **Initial Load**
   - Question loads with custom HTML/JS
   - Permission modal appears automatically
   - Default Qualtrics navigation is hidden

2. **Permission Grant**
   ```javascript
   // User clicks "Grant Access" button
   getCamAccess() → getUserMedia({ video: true, audio: true })
   ```

3. **Recording Process**
   - Instructions modal displays recording guidelines
   - AddPipe recorder initializes
   - User clicks record button
   - Timer starts counting
   - Audio streams to DeepGram for transcription

4. **Post-Recording**
   - Video validation checks minimum duration
   - Success: URL saved to Qualtrics embedded data
   - Failure: Error modal with retake option

5. **Data Storage**
   ```javascript
   // Video URL is constructed and saved
   const URL = `${S3_BASE_URL}${streamName}.mp4`;
   updateEmbeddedData(URL);  // Saves to Qualtrics
   ```

### Key Event Handlers

```javascript
// Recording started
recorderObject.btRecordPressed = function(recorderId) {
    // Initialize WebSocket for transcription
    // Start MediaRecorder
};

// Recording stopped
recorderObject.btStopRecordingPressed = function(recorderId) {
    // Close WebSocket
    // Stop MediaRecorder
    // Trigger validation
};

// Upload successful
recorderObject.onVideoUploadSuccess = function(...args) {
    // Show next button
    // Update UI
};
```

## API Integrations

### AddPipe SDK
- **Purpose**: Video recording and upload
- **Documentation**: [AddPipe Docs](https://addpipe.com/docs)
- **Key Methods**:
  - `PipeSDK.insert()`: Initialize recorder
  - Event handlers for recording lifecycle

### DeepGram API
- **Purpose**: Real-time audio transcription
- **Protocol**: WebSocket
- **Endpoint**: `wss://api.deepgram.com/v1/listen`
- **Authentication**: Token-based

### AWS S3
- **Purpose**: Video file storage
- **Access**: Direct URL construction
- **Format**: `https://s3.region.amazonaws.com/bucket/filename.mp4`

## Validation Rules

| Rule | Default Value | Description |
|------|--------------|-------------|
| `min_stremtime` | 30 seconds | Minimum recording duration |
| `required` | true | Whether video is mandatory |
| Preview Mode | Disabled | Validation bypassed when `Q_CHL == "preview"` |

## Browser Compatibility

### Supported Browsers
- Chrome 53+
- Firefox 42+
- Safari 11+
- Edge 79+

### Mobile Support
- iOS: Uses `audio/mp4` format
- Android: Uses `audio/webm` format
- Automatic format detection based on user agent

### Required APIs
- `getUserMedia`
- `MediaRecorder`
- `WebSocket`

## Known Issues

1. **Security Vulnerabilities**
   - API keys exposed in client-side code
   - No request validation or rate limiting

2. **Code Quality**
   - Global variables may cause conflicts
   - Inline CSS generation in JavaScript
   - Mixed concerns in single file

3. **UI/UX**
   - Some hardcoded styling values
   - Limited accessibility features
   - No internationalization support

## Security Considerations

⚠️ **WARNING**: Current implementation has security issues that should be addressed:

1. **API Keys**: Move sensitive keys to server-side
   ```javascript
   // Don't do this:
   token: "2b0d154cf9bee4a3c9431afb651625a05ba11739"  // Exposed!
   
   // Do this instead:
   token: await fetchTokenFromServer()
   ```

2. **CORS**: Implement proper CORS policies
3. **Validation**: Add server-side validation for uploads
4. **HTTPS**: Ensure all resources load over HTTPS

## Troubleshooting

### Common Issues

**Camera Permission Denied**
```javascript
// Error is logged with IP for debugging
handleAPiCallForDeviceError(IpAddress, errorMessage);
```

**Recording Won't Start**
- Check browser compatibility
- Verify HTTPS connection
- Check console for errors

**Transcription Not Working**
- Verify DeepGram API key
- Check WebSocket connection
- Monitor network tab for WS traffic

**Video Not Uploading**
- Verify AddPipe account status
- Check S3 bucket permissions
- Monitor console for upload errors

### Debug Mode
Enable console logging by checking for these key events:
- `btRecordPressed >>>` - Recording started
- `WebSocket >>>` - WS connection established
- `transcript >>>` - Transcription received
- `onVideoUploadSuccess` - Upload completed

## Contributing

When modifying this integration:

1. Test in Qualtrics preview mode first
2. Verify cross-browser compatibility
3. Maintain backward compatibility
4. Update documentation for any changes
5. Follow existing code style

## License

This implementation uses third-party services:
- AddPipe (Commercial License Required)
- DeepGram (API Key Required)
- AWS S3 (Storage Costs Apply)

---

For additional support or questions, please refer to the respective service documentation or contact your system administrator.