// AI Service for handling API requests to AI models

/**
 * Sends a message to the AI model and returns the response
 * @param {Array} chatHistory - The chat history between user and AI
 * @param {string} userInput - The current user message
 * @param {boolean} isFirstMessage - Whether this is the first message in the conversation
 * @returns {Promise<string>} - The AI's response text
 */
export const getAIResponse = async (chatHistory, userInput, isFirstMessage = false) => {
  try {
    // Prepare the chat history for the API payload
    let apiChatHistory = chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Add the current user message to the API chat history
    apiChatHistory.push({ role: 'user', parts: [{ text: userInput }] });

    // Define the initial prompt for the AI to set its persona
    const initialPrompt = {
      role: "user",
      parts: [{ text: "You are a helpful and patient tech support agent. Your goal is to assist the user in troubleshooting common technical issues. Provide clear, step-by-step instructions and ask clarifying questions when needed. Keep your responses professional and focused on problem-solving. This is for training purposes, so be thorough in your explanations. Start by asking the user what problem they are experiencing." }]
    };

    // If it's the very first message, include the initial persona prompt
    const payloadContents = isFirstMessage
      ? [initialPrompt, { role: "user", parts: [{ text: userInput }] }]
      : apiChatHistory;

    const payload = {
      contents: payloadContents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 500
      }
    };

    // Replace with your actual API key or environment variable
    // For production, use environment variables (process.env.REACT_APP_AI_API_KEY)
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY || "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const result = await response.json();

    if (result.candidates && 
        result.candidates.length > 0 &&
        result.candidates[0].content && 
        result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
      return result.candidates[0].content.parts[0].text;
    } else {
      console.error('Unexpected API response structure:', result);
      throw new Error('Invalid response format from AI service');
    }
  } catch (error) {
    console.error('Error in AI service:', error);
    throw error; // Re-throw to handle in the component
  }
};

/**
 * Alternative API for AI responses using OpenAI
 * @param {Array} chatHistory - The chat history between user and AI
 * @param {string} userInput - The current user message
 * @returns {Promise<string>} - The AI's response text
 */
export const getOpenAIResponse = async (chatHistory, userInput) => {
  try {
    // Format messages for OpenAI API
    const messages = [
      // System message to set the AI's behavior
      { 
        role: "system", 
        content: "You are a helpful and patient tech support agent. Your goal is to assist the user in troubleshooting common technical issues. Provide clear, step-by-step instructions and ask clarifying questions when needed. Keep your responses professional and focused on problem-solving."
      },
      // Convert chat history to OpenAI format
      ...chatHistory.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text
      })),
      // Add current user message
      { role: "user", content: userInput }
    ];

    // Replace with your actual OpenAI API key
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY || "";
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API request failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      console.error('Unexpected OpenAI API response structure:', data);
      throw new Error('Invalid response format from OpenAI service');
    }
  } catch (error) {
    console.error('Error in OpenAI service:', error);
    throw error;
  }
};