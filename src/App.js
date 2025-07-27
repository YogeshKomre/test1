import { useCallback, useEffect, useRef, useState } from 'react';
import { getAIResponse, getOpenAIResponse } from './services/aiService';

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
    // State to control which AI model to use
    const [aiModel, setAiModel] = useState('gemini'); // 'gemini' or 'openai'
    // Ref to automatically scroll to the latest message in the chat
    const messagesEndRef = useRef(null);

    // Effect to scroll to the bottom of the chat window whenever chatHistory changes
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory]);

    // Function to speak text using the Web Speech API
    const speakText = useCallback((text) => {
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
    }, [isVoiceEnabled]);

    // Function to send a message to the AI
    const sendMessage = async () => {
        if (userInput.trim() === '') return; // Prevent sending empty messages

        const userMessage = { role: 'user', text: userInput };
        // Update chat history with the user's message
        setChatHistory((prev) => [...prev, userMessage]);
        setUserInput(''); // Clear the input field

        setIsLoading(true); // Set loading state to true

        try {
            // Check if API key is set
            if (aiModel === 'gemini' && (!process.env.REACT_APP_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY === 'your_gemini_api_key_here')) {
                throw new Error('Gemini API key is not set. Please add your API key to the .env file.');
            }
            
            if (aiModel === 'openai' && (!process.env.REACT_APP_OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY === 'your_openai_api_key_here')) {
                throw new Error('OpenAI API key is not set. Please add your API key to the .env file.');
            }
            
            // Determine if this is the first message
            const isFirstMessage = chatHistory.length === 0;
            
            let aiResponseText;
            
            // Use the appropriate AI service based on the selected model
            if (aiModel === 'openai') {
                aiResponseText = await getOpenAIResponse(chatHistory, userInput);
            } else {
                // Default to Gemini
                aiResponseText = await getAIResponse(chatHistory, userInput, isFirstMessage);
            }
            
            // Update chat history with the AI's response
            setChatHistory((prev) => [...prev, { 
                role: 'model', 
                text: aiResponseText,
                model: aiModel // Add the model information
            }]);
            
            // Speak the AI's response
            speakText(aiResponseText);
        } catch (error) {
            console.error('Error fetching AI response:', error);
            const errorMessage = `Error: ${error.message || 'There was an error connecting to the AI. Please check your network or try again later.'}`;
            setChatHistory((prev) => [...prev, { 
                role: 'model', 
                text: errorMessage,
                model: aiModel // Add the model information even for error messages
            }]);
            speakText(errorMessage);
        } finally {
            setIsLoading(false); // Reset loading state
        }
    };

    // Function to reset the chat
    const resetChat = useCallback(() => {
        // Stop any ongoing speech
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
        setChatHistory([]); // Clear all messages
        setUserInput('');   // Clear input field
        setIsLoading(false); // Ensure loading is false
        // Send an initial welcome message from the AI after reset
        const welcomeMessage = 'Hello! I am your Optimum Agent. How can I assist you with your technical issue today?';
        setChatHistory([{ 
            role: 'model', 
            text: welcomeMessage,
            model: aiModel // Include the current model in the welcome message
        }]);
        speakText(welcomeMessage); // Speak the welcome message
    }, [setChatHistory, setUserInput, setIsLoading, speakText, aiModel]); // Add all dependencies

    // Initial message from the AI when the component mounts or resets
    useEffect(() => {
        if (chatHistory.length === 0) {
            resetChat(); // Call reset to set the initial welcome message and speak it
        }
    }, [chatHistory.length, resetChat]); // Add chatHistory.length and resetChat to the dependency array

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 font-inter">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 text-white p-4 rounded-t-xl shadow-md flex justify-between items-center">
                    <h1 className="text-2xl font-bold">AI Tech Support Trainer</h1>
                    <div className="flex items-center space-x-4">
                        <label className="flex items-center cursor-pointer">
                            <span className="mr-2 text-sm">Voice</span>
                            <div className={`relative w-10 h-6 transition-colors duration-200 ease-in-out rounded-full ${isVoiceEnabled ? 'bg-green-400' : 'bg-gray-400'}`}>
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={isVoiceEnabled}
                                    onChange={() => setIsVoiceEnabled(!isVoiceEnabled)}
                                />
                                <span
                                    className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out transform ${isVoiceEnabled ? 'translate-x-4' : ''}`}
                                />
                            </div>
                        </label>
                        <div className="flex items-center">
                            <select
                                value={aiModel}
                                onChange={(e) => setAiModel(e.target.value)}
                                className="bg-blue-700 text-white border border-blue-500 rounded-lg p-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                                <option value="gemini">Gemini</option>
                                <option value="openai">OpenAI</option>
                            </select>
                        </div>
                        <div className="text-xs bg-blue-700 px-2 py-1 rounded">
                            {aiModel === 'gemini' ? 
                                (process.env.REACT_APP_GEMINI_API_KEY && process.env.REACT_APP_GEMINI_API_KEY !== 'your_gemini_api_key_here' ? 
                                    '✓ Gemini Key Set' : '✗ Gemini Key Missing') : 
                                (process.env.REACT_APP_OPENAI_API_KEY && process.env.REACT_APP_OPENAI_API_KEY !== 'your_openai_api_key_here' ? 
                                    '✓ OpenAI Key Set' : '✗ OpenAI Key Missing')}
                        </div>
                        <button
                            onClick={resetChat}
                            className="bg-blue-700 hover:bg-blue-800 text-white text-sm px-3 py-1 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
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
                                {message.role === 'user' ? 'You' : `Optimum Agent (${message.model || 'AI'})`}
                            </p>
                            <p>{message.text}</p>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="mb-4 p-3 rounded-lg max-w-[80%] mr-auto bg-gray-200 text-gray-800 shadow-sm rounded-bl-none animate-pulse">
                            <p className="font-medium mb-1">Optimum Agent ({aiModel})</p>
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
                        {isLoading ? `${aiModel === 'openai' ? 'OpenAI' : 'Gemini'}...` : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;