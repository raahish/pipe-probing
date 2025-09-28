# DeepGram Setup Guide

## Getting Your DeepGram API Key

1. **Sign up for DeepGram**: Go to [https://console.deepgram.com/signup](https://console.deepgram.com/signup)
2. **Create a free account** - DeepGram offers $200 in free credits
3. **Get your API key**:
   - Go to the DeepGram Console
   - Navigate to "API Keys" section
   - Copy your API key (starts with a long string of characters)

## Adding Your API Key

1. **Open** `qualtrics-question-js.js`
2. **Find** the `deepGramConfiguration` section:
   ```javascript
   var deepGramConfiguration = {
       endPoint: "wss://api.deepgram.com/v1/listen",
       token: "YOUR_DEEPGRAM_API_KEY_HERE", // Replace this
   };
   ```
3. **Replace** `"YOUR_DEEPGRAM_API_KEY_HERE"` with your actual API key

## Testing

After adding your API key, you should see these logs in the console:
- `🔗 Connecting to DeepGram: wss://api.deepgram.com/v1/listen?token=TOKEN_HIDDEN&...`
- `🎤 DeepGram WebSocket connected`
- `📤 Sending audio chunk to DeepGram: 1234 bytes`
- `✅ Final transcript: "your spoken words"`

## Without DeepGram (Optional)

The system will work without DeepGram - you just won't get real-time transcription. The conversational AI will still function, but transcripts will be empty.

## Troubleshooting

**Error Code 1006**: Usually means invalid API key or network issues
**Connection Failed**: Check your API key and internet connection
**No Transcription**: Verify your API key is correct and you have credits remaining
