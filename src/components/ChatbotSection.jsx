import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  ArrowUp, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  User, 
  Loader2
} from 'lucide-react';

export default function ChatbotSection({ persona, currentLocation, currentTempC, tempUnit }) {
  // Store chat history and draft input text independently for every persona ID
  const [chatHistoryMap, setChatHistoryMap] = useState({});
  const [draftInputMap, setDraftInputMap] = useState({});
  
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  
  const chatScrollBoxRef = useRef(null);
  const recognitionRef = useRef(null);

  const personaId = persona.id;

  // Retrieve or initialize messages for the active persona
  const activeMessages = chatHistoryMap[personaId] || [
    {
      id: `welcome-${personaId}`,
      sender: 'bot',
      text: `Hello! I'm your ${persona.name} Weather Assistant. Ask me anything about current weather impact on your ${persona.name.toLowerCase()} schedule in ${currentLocation.name}!`,
      time: 'Just now',
    },
  ];

  // Retrieve draft text for the active persona
  const currentInputText = draftInputMap[personaId] || '';

  // Ensure default welcome message is initialized in map if missing
  useEffect(() => {
    if (!chatHistoryMap[personaId]) {
      setChatHistoryMap((prev) => ({
        ...prev,
        [personaId]: [
          {
            id: `welcome-${personaId}`,
            sender: 'bot',
            text: `Hello! I'm your ${persona.name} Weather Assistant. Ask me anything about current weather impact on your ${persona.name.toLowerCase()} schedule in ${currentLocation.name}!`,
            time: 'Just now',
          },
        ],
      }));
    }
  }, [personaId, currentLocation.name]);

  // Scroll ONLY the inner chat message box when new messages arrive
  const scrollToInnerChatBottom = () => {
    if (chatScrollBoxRef.current) {
      chatScrollBoxRef.current.scrollTop = chatScrollBoxRef.current.scrollHeight;
    }
  };

  const setInputForActivePersona = (val) => {
    setDraftInputMap((prev) => ({
      ...prev,
      [personaId]: val,
    }));
  };

  // Handle Speech Recognition (Voice Input)
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your question.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputForActivePersona(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  // Handle Text-to-Speech (Audio Output)
  const speakResponse = (messageId, text) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setSpeakingMessageId(null);
    };

    utterance.onerror = () => {
      setSpeakingMessageId(null);
    };

    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = (textToSend = currentInputText) => {
    const query = textToSend.trim();
    if (!query) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Update state for active persona
    setChatHistoryMap((prev) => ({
      ...prev,
      [personaId]: [...(prev[personaId] || activeMessages), userMsg],
    }));

    setInputForActivePersona('');
    setIsTyping(true);

    setTimeout(() => {
      scrollToInnerChatBottom();
    }, 50);

    // Generate AI response after delay
    setTimeout(() => {
      let botAnswer = persona.chatbotAnswers[query] || persona.chatbotAnswers.default;

      if (query.toLowerCase().includes('temp') || query.toLowerCase().includes('weather')) {
        const displayTemp = tempUnit === 'C' ? `${currentTempC}°C` : `${Math.round((currentTempC * 9)/5 + 32)}°F`;
        botAnswer += ` (Current temp in ${currentLocation.name} is ${displayTemp}).`;
      }

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botAnswer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatHistoryMap((prev) => ({
        ...prev,
        [personaId]: [...(prev[personaId] || []), botMsg],
      }));
      setIsTyping(false);

      setTimeout(() => {
        scrollToInnerChatBottom();
      }, 50);
    }, 900);
  };

  return (
    <div className="w-full bg-white rounded-[2rem] p-4 sm:p-5 shadow-md border border-slate-200/90 my-5 flex flex-col shrink-0 relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
            <Bot className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 leading-tight">
              Ask your {persona.name} Assistant
            </h3>
            <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Tailored for {persona.name} conditions
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-200">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Mausam AI</span>
        </div>
      </div>

      {/* Quick Question Chips (Kept & Untouched) */}
      <div className="mb-3 shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
          Suggested Questions
        </span>
        <div className="flex flex-wrap gap-1.5">
          {persona.quickQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(q)}
              className="text-xs font-semibold bg-slate-100/90 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200/80 transition-all text-left shadow-2xs"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div 
        ref={chatScrollBoxRef}
        className="max-h-48 sm:max-h-52 overflow-y-auto pr-1 space-y-3 no-scrollbar my-2 flex-1 min-h-[90px]"
      >
        <AnimatePresence initial={false}>
          {activeMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'bot' && (
                <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`relative max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-none shadow-sm'
                    : 'bg-slate-100/90 text-slate-800 rounded-bl-none border border-slate-200/60'
                }`}
              >
                <p>{msg.text}</p>

                <div className="flex items-center justify-between gap-3 mt-1 text-[9px] font-medium text-slate-400">
                  <span className={msg.sender === 'user' ? 'text-amber-100' : 'text-slate-400'}>
                    {msg.time}
                  </span>

                  {/* Speaker Text-To-Speech Button */}
                  {msg.sender === 'bot' && (
                    <button
                      type="button"
                      onClick={() => speakResponse(msg.id, msg.text)}
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 hover:text-amber-700 p-0.5 rounded transition-colors"
                      title="Read response aloud"
                    >
                      {speakingMessageId === msg.id ? (
                        <VolumeX className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 pl-2"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
            <span>Mausam AI is thinking...</span>
          </motion.div>
        )}
      </div>

      {/* CLAUDE-STYLE CHAT INPUT BAR (High Visibility Block Element with 44px+ height) */}
      <div className="w-full pt-3 mt-3 border-t border-slate-200 flex flex-col gap-1.5 shrink-0 bg-white">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Type your question
        </span>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative w-full flex items-center bg-slate-100 hover:bg-slate-50/80 border-2 border-slate-200 focus-within:border-amber-500 focus-within:bg-white rounded-2xl p-1.5 min-h-[50px] transition-all shadow-2xs"
        >
          {/* Left Side: Voice Input Microphone Button */}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              isListening
                ? 'bg-red-500 text-white animate-pulse shadow-md'
                : 'bg-white text-slate-600 shadow-2xs hover:bg-slate-100'
            }`}
            title={isListening ? 'Stop listening' : 'Voice Input (Speech-to-Text)'}
          >
            {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Center: Controlled Typing Input Field (Explicit 44px+ touch height) */}
          <input
            type="text"
            value={currentInputText}
            onChange={(e) => setInputForActivePersona(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about today's weather..."
            className="flex-1 min-w-0 bg-transparent border-0 outline-none px-3 py-2 h-11 sm:h-12 min-h-[44px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 font-semibold focus:ring-0 focus:outline-none"
          />

          {/* Right Side: Active / Disabled Upward Send Arrow Button */}
          <button
            type="submit"
            disabled={!currentInputText.trim()}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              currentInputText.trim()
                ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600 cursor-pointer scale-105'
                : 'bg-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
            }`}
            title="Send Question"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
  );
}
