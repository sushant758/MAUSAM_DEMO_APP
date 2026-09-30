import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, ArrowUp, Mic, MicOff, Volume2, VolumeX, Sparkles, User, Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { sendChatMessage } from '../services/chat';
import { useLanguage } from '../i18n/LanguageContext';

// ─── F9: ONE shared assistant ─────────────────────────────────────────────────
// - sharedMessages / setSharedMessages: the single global message list (from HomeScreen)
// - sharedDraftMap / setSharedDraftMap: per-persona draft text (also from HomeScreen)
// The header text and suggested-question chips remain persona-specific.
// Switching personas does NOT clear history — each message records which persona sent it.
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatbotSection({
  persona,
  currentLocation,
  currentTempC,
  tempUnit,
  weatherCtx,       // A6: full weather context forwarded to chat service
  // F9 shared state
  sharedMessages,
  setSharedMessages,
  sharedDraftMap,
  setSharedDraftMap,
}) {
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

  const chatScrollBoxRef = useRef(null);
  const recognitionRef = useRef(null);

  const personaId = persona.id;
  const { lang, t, tp } = useLanguage();

  // A7: Initialize shared welcome message in the active language
  useEffect(() => {
    if (sharedMessages.length === 0) {
      setSharedMessages([{
        id: 'welcome-shared',
        sender: 'bot',
        persona: personaId,
        text: t('chat.greeting'),
        time: lang === 'hi' ? 'अभी' : 'Just now',
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Current draft for the active persona
  const currentInputText = sharedDraftMap[personaId] || '';
  const setInputForPersona = (val) => {
    setSharedDraftMap((prev) => ({ ...prev, [personaId]: val }));
  };

  // Scroll ONLY the inner chat box — never the whole page (critical invariant)
  const scrollToInnerBottom = () => {
    if (chatScrollBoxRef.current) {
      chatScrollBoxRef.current.scrollTop = chatScrollBoxRef.current.scrollHeight;
    }
  };

  // ─── Voice Input (STT) ─────────────────────────────────────────────────────
  const hasSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return; // button hidden when unsupported

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e) => {
        setInputForPersona(e.results[0][0].transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  // ─── Text-to-Speech ────────────────────────────────────────────────────────
  const speakResponse = (messageId, text) => {
    if (!('speechSynthesis' in window)) return;
    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  // ─── A6: Send message via /api/chat → rule-based fallback ─────────────────
  const handleSend = async (textToSend = currentInputText) => {
    const query = textToSend.trim();
    if (!query) return;

    const userMsg = {
      id:     `user-${Date.now()}`,
      sender: 'user',
      persona: personaId,
      text:   query,
      time:   new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setSharedMessages((prev) => [...prev, userMsg]);
    setInputForPersona('');
    setIsTyping(true);
    setTimeout(scrollToInnerBottom, 50);

    // Build LLM conversation history (last 10 turns, excluding welcome)
    const history = sharedMessages
      .filter((m) => m.sender === 'user' || m.sender === 'bot')
      .slice(-10)
      .map((m) => ({ role: m.sender === 'bot' ? 'assistant' : 'user', content: m.text }));

    // Enrich ctx with location + tempUnit
    const enrichedCtx = {
      ...(weatherCtx ?? {}),
      locationName: currentLocation?.name ?? '',
      tempUnit,
    };

    try {
      const reply = await sendChatMessage(query, history, personaId, enrichedCtx, lang);
      setSharedMessages((prev) => [...prev, {
        id:     `bot-${Date.now()}`,
        sender: 'bot',
        persona: personaId,
        text:   reply,
        time:   new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch {
      setSharedMessages((prev) => [...prev, {
        id: `bot-err-${Date.now()}`, sender: 'bot', persona: personaId,
        text: 'Sorry, I had trouble responding. Please try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsTyping(false);
      setTimeout(scrollToInnerBottom, 50);
    }
  };

  return (
    <div className="w-full bg-white rounded-[2rem] p-4 sm:p-5 shadow-md border border-slate-200/90 my-5 flex flex-col shrink-0 relative">
      {/* Header — persona-specific title (A7 translated) */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
            <Bot className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 leading-tight">
              {tp('chat.heading', { persona: t(`persona.${personaId}`, persona.name) })}
            </h3>
            <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('chat.subheading')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-200">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Mausam AI</span>
        </div>
      </div>

      {/* Persona-specific suggested question chips (A7 translated) */}
      <div className="mb-3 shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
          {t('chat.suggested')}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {/* A7: show translated questions if available, else fall back to persona.quickQuestions */}
          {[1,2,3,4].map((idx) => {
            const key = `q.${personaId}.${idx}`;
            const q = t(key, persona.quickQuestions[idx - 1]);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(q)}
                className="text-xs font-semibold bg-slate-100/90 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200/80 transition-all text-left shadow-2xs"
              >
                {q}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat messages — inner scroll only, never the whole page */}
      <div
        ref={chatScrollBoxRef}
        className="max-h-48 sm:max-h-52 overflow-y-auto pr-1 space-y-3 no-scrollbar my-2 flex-1 min-h-[90px]"
      >
        <AnimatePresence initial={false}>
          {sharedMessages.map((msg) => (
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
                {/* A7: welcome greeting follows active language live */}
                <p>{msg.id === 'welcome-shared' ? t('chat.greeting') : msg.text}</p>

                <div className="flex items-center justify-between gap-3 mt-1 text-[9px] font-medium text-slate-400">
                  <span className={msg.sender === 'user' ? 'text-amber-100' : 'text-slate-400'}>
                    {msg.time}
                  </span>
                  {msg.sender === 'bot' && (
                    <button
                      type="button"
                      onClick={() => speakResponse(msg.id, msg.text)}
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 hover:text-amber-700 p-0.5 rounded transition-colors"
                      title="Read response aloud"
                      aria-label="Read response aloud"
                    >
                      {speakingMessageId === msg.id
                        ? <VolumeX className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
                        : <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                      }
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
            <span>{t('chat.thinking')}</span>
          </motion.div>
        )}
      </div>

      {/* Input bar */}
      <div className="w-full pt-3 mt-3 border-t border-slate-200 flex flex-col gap-1.5 shrink-0 bg-white">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          {t('chat.placeholder')}
        </span>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="relative w-full flex items-center bg-slate-100 hover:bg-slate-50/80 border-2 border-slate-200 focus-within:border-amber-500 focus-within:bg-white rounded-2xl p-1.5 min-h-[50px] transition-all shadow-2xs"
        >
          {/* Mic — hidden when Web Speech API not supported (F9 / A6 spec) */}
          {hasSpeechRecognition && (
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-md'
                  : 'bg-white text-slate-600 shadow-2xs hover:bg-slate-100'
              }`}
              aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              title={isListening ? 'Stop listening' : 'Voice Input (Speech-to-Text)'}
            >
              {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-slate-600" />}
            </button>
          )}

          <input
            type="text"
            value={currentInputText}
            onChange={(e) => setInputForPersona(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
            }}
            placeholder={t('chat.placeholder')}
            className="flex-1 min-w-0 bg-transparent border-0 outline-none px-3 py-2 h-11 sm:h-12 min-h-[44px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 font-semibold focus:ring-0"
          />

          {/* Send — activates only with non-empty text */}
          <button
            type="submit"
            disabled={!currentInputText.trim()}
            aria-label="Send message"
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              currentInputText.trim()
                ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600 cursor-pointer scale-105'
                : 'bg-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
            }`}
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
  );
}
