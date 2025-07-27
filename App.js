import React, { useState, useEffect, useRef } from 'react';

// Main App component for the AI Tech Support Training Website
function App() {
    // State to store the conversation history between user and AI
    const [chatHistory, setChatHistory] = useState([]);
    // State to store the current input from the user
    const [userInput, setUserInput] = useState('');
    // State to manage the loading status while waiting for AI response
    const [isLoading, setIsLoading] = useState(false);
    // State to control whether AI responses should be spoken aloud
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true); // Default to voice enabled
    // Ref to automatically scroll to the latest message in the chat
    const messagesEndRef = useRef(null);

    // Effect to scroll to the bottom of the chat window whenever chatHistory changes
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory]);

    // Function to speak text using the Web Speech API
    const speakText = (text) => {
        if (!isVoiceEnabled || !('speechSynthesis' in window)) {
            console.warn("Speech synthesis not supported or voice disabled.");
            return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        // You can customize voice, pitch, rate here if needed
        // utterance.voice = speechSynthesis.getVoices().find(voice => voice.name === 'Google US English');
        // utterance.pitch = 1;
        // utterance.rate = 1;
        speechSynthesis.speak(utterance);
    };

    // Function to send a message to the AI
    const sendMessage = async () => {
        if (userInput.trim() === '') return; // Prevent sending empty messages

        const userMessage = { role: 'user', text: userInput };
        // Update chat history with the user's message
        setChatHistory((prev) => [...prev, userMessage]);
        setUserInput(''); // Clear the input field

        setIsLoading(true); // Set loading state to true

        try {
            // Prepare the chat history for the Gemini API payload
            // The AI's persona is set in the first 'user' part of the initial message
            let apiChatHistory = chatHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));

            // Add the current user message to the API chat history
            apiChatHistory.push({ role: 'user', parts: [{ text: userInput }] });

            // Define the initial prompt for the AI to set its persona
            // This is crucial for guiding the AI's behavior as a tech support agent
            const initialPrompt = {
                role: "user",
                parts: [{ text: "You are a helpful and patient tech support agent. Your goal is to assist the user in troubleshooting common technical issues. Provide clear, step-by-step instructions and ask clarifying questions when needed. Keep your responses professional and focused on problem-solving. This is for training purposes, so be thorough in your explanations. Start by asking the user what problem they are experiencing." }]
            };

            // If it's the very first message, include the initial persona prompt
            const payloadContents = chatHistory.length === 0
                ? [initialPrompt, { role: "user", parts: [{ text: userInput }] }]
                : apiChatHistory;

            const payload = {
                contents: payloadContents,
                generationConfig: {
                    temperature: 0.7, // Controls the randomness of the output
                    topK: 40,         // Considers the top K most likely tokens
                    topP: 0.95,       // Nucleus sampling: selects from tokens whose cumulative probability exceeds P
                    maxOutputTokens: 500 // Maximum number of tokens in the response
                }
            };

            // Get API key from environment variables
            const apiKey = process.env.REACT_APP_GEMINI_API_KEY || '';
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const aiResponseText = result.candidates[0].content.parts[0].text;
                // Update chat history with the AI's response
                setChatHistory((prev) => [...prev, { role: 'model', text: aiResponseText }]);
                // Speak the AI's response
                speakText(aiResponseText);
            } else {
                console.error('Unexpected API response structure:', result);
                const errorMessage = 'Sorry, I could not get a response from the AI. Please try again.';
                setChatHistory((prev) => [...prev, { role: 'model', text: errorMessage }]);
                speakText(errorMessage);
            }
        } catch (error) {
            console.error('Error fetching AI response:', error);
            const errorMessage = 'There was an error connecting to the AI. Please check your network or try again later.';
            setChatHistory((prev) => [...prev, { role: 'model', text: errorMessage }]);
            speakText(errorMessage);
        } finally {
            setIsLoading(false); // Reset loading state
        }
    };

    // Function to reset the chat
    const resetChat = () => {
        // Stop any ongoing speech
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
        setChatHistory([]); // Clear all messages
        setUserInput('');   // Clear input field
        setIsLoading(false); // Ensure loading is false
        // Send an initial welcome message from the AI after reset
        const welcomeMessage = 'Hello! I am your Optimum Agent. How can I assist you with your technical issue today?';
        setChatHistory([{ role: 'model', text: welcomeMessage }]);
        speakText(welcomeMessage); // Speak the welcome message
    };

    // Initial message from the AI when the component mounts or resets
    useEffect(() => {
        if (chatHistory.length === 0) {
            resetChat(); // Call reset to set the initial welcome message and speak it
        }
    }, []); // Run only once on mount

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 font-inter">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 text-white p-4 rounded-t-xl shadow-md flex justify-between items-center">
                    <h1 className="text-2xl font-bold">AI Tech Support Trainer</h1>
                    <div className="flex items-center space-x-4">
                        <label className="flex items-center cursor-pointer">
                            <span className="mr-2 text-white font-semibold">Voice On</span>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={isVoiceEnabled}
                                    onChange={() => setIsVoiceEnabled(!isVoiceEnabled)}
                                />
                                <div className={`block bg-gray-600 w-14 h-8 rounded-full ${isVoiceEnabled ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isVoiceEnabled ? 'translate-x-full' : ''}`}></div>
                            </div>
                        </label>
                        <button
                            onClick={resetChat}
                            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                            title="Start a new conversation"
                        >
                            Reset Chat
                        </button>
                    </div>
                </div>

                {/* Chat Messages Area */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                    {chatHistory.map((message, index) => (
                        <div
                            key={index}
                            className={`mb-4 p-3 rounded-lg max-w-[80%] shadow-sm ${
                                message.role === 'user'
                                    ? 'bg-blue-500 text-white ml-auto rounded-br-none'
                                    : 'bg-gray-200 text-gray-800 mr-auto rounded-bl-none'
                            }`}
                        >
                            <p className="font-medium mb-1">
                                {message.role === 'user' ? 'You' : 'Optimum Agent'} {/* Changed here */}
                            </p>
                            <p>{message.text}</p>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="mb-4 p-3 rounded-lg max-w-[80%] mr-auto bg-gray-200 text-gray-800 shadow-sm rounded-bl-none animate-pulse">
                            <p className="font-medium mb-1">Optimum Agent</p> {/* Changed here */}
                            <p>Thinking...</p>
                        </div>
                    )}
                    <div ref={messagesEndRef} /> {/* Scroll target */}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-gray-100 border-t border-gray-200 flex items-center rounded-b-xl">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !isLoading) {
                                sendMessage();
                            }
                        }}
                        placeholder="Type your technical issue or question..."
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                        disabled={isLoading}
                    />
                    <button
                        onClick={sendMessage}
                        className={`ml-4 px-6 py-3 rounded-lg font-semibold shadow-md transition duration-300 ease-in-out transform ${
                            isLoading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
                        }`}
                        disabled={isLoading}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;
