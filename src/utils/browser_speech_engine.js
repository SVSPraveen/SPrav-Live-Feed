/**
 * browser_speech_engine.js
 * ========================
 * 100% Client-Side W3C Web Speech Engine abstraction for SPrav Job AI.
 * Powers the Real-Time Browser-Native Voice Interview Simulator in PrepCenter.
 *
 * Capabilities:
 * - Text-to-Speech (TTS) via native window.speechSynthesis ($0 server cost, 0 VRAM).
 * - Speech-to-Text (STT) via native SpeechRecognition / webkitSpeechRecognition.
 * - Sentence-level chunking and keep-alive heartbeat mitigating Chromium 15s timeout bug.
 * - Acoustic echo prevention turn-taking coordinator.
 * - Dynamic voice selection prioritizing natural OS English voices.
 * - Auto-reconnecting speech recognition on unexpected silence dropouts.
 */

/**
 * Checks whether native speech synthesis (TTS) is available in the current browser.
 * @returns {boolean}
 */
export function isSpeechSynthesisSupported() {
  return typeof window !== 'undefined' && 
    'speechSynthesis' in window && 
    typeof window.SpeechSynthesisUtterance !== 'undefined';
}

/**
 * Checks whether native speech recognition (STT) is available in the current browser.
 * @returns {boolean}
 */
export function isSpeechRecognitionSupported() {
  return typeof window !== 'undefined' && 
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Returns the list of installed speech synthesis voices.
 * @returns {SpeechSynthesisVoice[]}
 */
export function getAvailableVoices() {
  if (!isSpeechSynthesisSupported()) return [];
  try {
    return window.speechSynthesis.getVoices() || [];
  } catch {
    return [];
  }
}

/**
 * Automatically picks the highest quality natural interviewer voice available.
 * @param {string} [preferredLang='en']
 * @returns {SpeechSynthesisVoice | null}
 */
export function getBestInterviewerVoice(preferredLang = 'en') {
  const voices = getAvailableVoices();
  if (!voices || voices.length === 0) return null;

  // Filter voices matching preferred language (e.g. en-US, en-GB)
  const langMatches = voices.filter(v => 
    (v.lang || '').toLowerCase().startsWith(preferredLang.toLowerCase())
  );
  const candidates = langMatches.length > 0 ? langMatches : voices;

  // Prioritize premium/natural/neural desktop and mobile voices
  const naturalVoice = candidates.find(v => 
    /natural|online|google|samantha|daniel|karen|alex|george|arthur|guy|jenny/i.test(v.name) &&
    !/whisper|compact/i.test(v.name)
  );

  return naturalVoice || candidates[0] || null;
}

/**
 * Splits text into natural sentence chunks to prevent the Chromium 15-second speech cutoff bug.
 * @param {string} text
 * @param {number} [maxChunkLength=180]
 * @returns {string[]}
 */
export function chunkTextForSpeech(text = '', maxChunkLength = 180) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChunkLength) return [trimmed];

  const sentences = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [trimmed];
  const chunks = [];
  let current = '';

  for (const item of sentences) {
    const s = item.trim();
    if (!s) continue;
    if ((current + ' ' + s).trim().length <= maxChunkLength) {
      current = (current + ' ' + s).trim();
    } else {
      if (current) chunks.push(current);
      current = s;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// Active speech state tracking
let _activeKeepAliveTimer = null;
let _activeSpeechUtterances = [];

function _clearKeepAlive() {
  if (_activeKeepAliveTimer) {
    clearInterval(_activeKeepAliveTimer);
    _activeKeepAliveTimer = null;
  }
}

/**
 * Immediately cancels all ongoing speech synthesis.
 */
export function stopSpeaking() {
  _clearKeepAlive();
  _activeSpeechUtterances = [];
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch (_e) {}
  }
}

/**
 * Audibly speaks text using the browser's native SpeechSynthesis API.
 * Automatically splits long text into sentence chunks and maintains a keep-alive pulse.
 *
 * @param {string} text - Text to speak out loud
 * @param {Object} [options]
 * @param {SpeechSynthesisVoice} [options.voice] - Explicit voice to use
 * @param {number} [options.rate=1.0] - Speech rate (0.8 - 1.2)
 * @param {number} [options.pitch=1.0] - Speech pitch (0.9 - 1.1)
 * @param {number} [options.volume=1.0] - Volume (0.0 - 1.0)
 * @param {Function} [options.onStart] - Callback when speech starts
 * @param {Function} [options.onEnd] - Callback when speech completely finishes
 * @param {Function} [options.onError] - Callback on error
 * @returns {Promise<boolean>} Resolves to true when speech finishes
 */
export function speakText(text = '', options = {}) {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisSupported()) {
      if (options.onError) options.onError(new Error('SpeechSynthesis is not supported in this browser.'));
      resolve(false);
      return;
    }

    const chunks = chunkTextForSpeech(text);
    if (chunks.length === 0) {
      resolve(true);
      return;
    }

    // Stop any ongoing speech
    stopSpeaking();

    const voice = options.voice || getBestInterviewerVoice('en');
    let chunkIndex = 0;
    let hasStarted = false;

    // Chromium keep-alive: pulse pause/resume every 12 seconds to prevent silent pause
    _activeKeepAliveTimer = setInterval(() => {
      try {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      } catch (_e) {}
    }, 12000);

    const speakNextChunk = () => {
      if (chunkIndex >= chunks.length) {
        _clearKeepAlive();
        if (options.onEnd) options.onEnd();
        resolve(true);
        return;
      }

      const chunkText = chunks[chunkIndex];
      chunkIndex++;

      try {
        const utterance = new window.SpeechSynthesisUtterance(chunkText);
        if (voice) utterance.voice = voice;
        utterance.rate = options.rate ?? 1.0;
        utterance.pitch = options.pitch ?? 1.0;
        utterance.volume = options.volume ?? 1.0;

        utterance.onstart = () => {
          if (!hasStarted) {
            hasStarted = true;
            if (options.onStart) options.onStart();
          }
        };

        utterance.onend = () => {
          speakNextChunk();
        };

        utterance.onerror = (event) => {
          // If error was caused by cancel(), ignore gracefully
          if (event.error === 'canceled' || event.error === 'interrupted') {
            _clearKeepAlive();
            resolve(false);
            return;
          }
          console.warn('[SpeechEngine] Utterance error:', event.error);
          _clearKeepAlive();
          if (options.onError) options.onError(event);
          resolve(false);
        };

        _activeSpeechUtterances.push(utterance);
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[SpeechEngine] speak exception:', err);
        _clearKeepAlive();
        if (options.onError) options.onError(err);
        resolve(false);
      }
    };

    speakNextChunk();
  });
}

/**
 * Creates and initializes a managed browser SpeechRecognition instance.
 * Features automatic restart on unintended silence drops and clean callback dispatching.
 *
 * @param {Object} callbacks
 * @param {Function} callbacks.onTranscriptChange - Receives (fullTranscript: string, isFinal: boolean)
 * @param {Function} [callbacks.onStart] - Triggered when listening starts
 * @param {Function} [callbacks.onEnd] - Triggered when listening completely halts
 * @param {Function} [callbacks.onError] - Triggered on error
 * @param {Object} [options]
 * @param {string} [options.lang='en-US']
 * @returns {Object} Speech recognizer controller with .start(), .stop(), .isListening()
 */
export function createSpeechRecognizer(callbacks = {}, options = {}) {
  const SpeechRecognition = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

  if (!SpeechRecognition) {
    return {
      supported: false,
      start: () => callbacks.onError?.(new Error('SpeechRecognition not supported')),
      stop: () => {},
      isListening: () => false,
      abort: () => {}
    };
  }

  let recognition = null;
  let isListening = false;
  let shouldKeepListening = false;
  let committedTranscript = '';

  const initInstance = () => {
    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = options.lang || 'en-US';

      rec.onstart = () => {
        isListening = true;
        callbacks.onStart?.();
      };

      rec.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            committedTranscript += (committedTranscript ? ' ' : '') + res[0].transcript.trim();
          } else {
            interim += res[0].transcript;
          }
        }
        const fullCurrent = (committedTranscript + (interim ? ' ' + interim : '')).trim();
        callbacks.onTranscriptChange?.(fullCurrent, Boolean(!interim));
      };

      rec.onerror = (event) => {
        // 'no-speech' is a normal event when candidate is thinking
        if (event.error === 'no-speech') {
          return;
        }
        if (event.error === 'aborted') {
          return;
        }
        console.warn('[SpeechEngine] Recognition error:', event.error);
        callbacks.onError?.(event);
      };

      rec.onend = () => {
        isListening = false;
        // If user hasn't explicitly stopped, auto-reconnect to handle silence timeouts
        if (shouldKeepListening) {
          try {
            rec.start();
            return;
          } catch (_e) {}
        }
        callbacks.onEnd?.();
      };

      return rec;
    } catch (e) {
      console.warn('[SpeechEngine] Failed to instantiate SpeechRecognition:', e);
      return null;
    }
  };

  recognition = initInstance();

  return {
    supported: true,
    start: (initialText = '') => {
      committedTranscript = initialText ? String(initialText).trim() : '';
      shouldKeepListening = true;
      if (recognition && !isListening) {
        try {
          recognition.start();
        } catch (err) {
          // If already started or in transition, recreate instance
          recognition = initInstance();
          try { recognition?.start(); } catch (_e) {}
        }
      }
    },
    stop: () => {
      shouldKeepListening = false;
      if (recognition && isListening) {
        try {
          recognition.stop();
        } catch (_e) {}
      }
    },
    abort: () => {
      shouldKeepListening = false;
      if (recognition) {
        try {
          recognition.abort();
        } catch (_e) {}
      }
    },
    isListening: () => isListening,
    getCommittedText: () => committedTranscript
  };
}

export const COMMON_FILLER_WORDS = [
  'um', 'uh', 'like', 'you know', 'basically', 'actually',
  'sort of', 'kind of', 'literally', 'to be honest', 'i mean', 'right'
];

/**
 * Analyzes candidate spoken response transcript for hesitations, filler words,
 * STAR storytelling structure, and delivery pacing.
 *
 * @param {string} transcript - Candidate spoken or typed text
 * @param {object} [options]
 * @param {number} [options.durationSeconds=0] - Audio duration for WPM calculation
 * @returns {object} Delivery analysis object
 */
export function analyzeVoiceDelivery(transcript = '', options = {}) {
  const text = String(transcript || '').trim();
  if (!text) {
    return {
      deliveryScore: 10,
      totalWords: 0,
      fillerCount: 0,
      fillerFrequencyPer100: 0,
      detectedFillers: {},
      wpm: 0,
      starChecklist: { situation: false, task: false, action: false, result: false },
      starScore: 0,
      pacingFeedback: 'Awaiting spoken input...',
      suggestions: []
    };
  }

  const words = text.split(/\s+/);
  const totalWords = words.length;
  const lowerText = text.toLowerCase();

  // 1. Detect filler words
  const detectedFillers = {};
  let totalFillers = 0;

  for (const filler of COMMON_FILLER_WORDS) {
    const escaped = filler.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches && matches.length > 0) {
      detectedFillers[filler] = matches.length;
      totalFillers += matches.length;
    }
  }

  const fillerFrequencyPer100 = totalWords > 0 
    ? Math.round((totalFillers / totalWords) * 100 * 10) / 10 
    : 0;

  // 2. STAR alignment detection
  const hasSituation = /\b(when i was|at my (previous|last)|our team (was|had)|the problem (was|started)|context|situation|background|faced an issue)\b/i.test(lowerText);
  const hasTask = /\b(my (task|responsibility|goal|role)|i was tasked with|we needed to|objective was|challenge was|deliverable)\b/i.test(lowerText);
  const hasAction = /\b(i (engineered|built|designed|implemented|refactored|led|migrated|optimized|wrote|developed|created|investigated|profiled))\b/i.test(lowerText);
  const hasResult = /(\b\d+(\.\d+)?%|\$\d+|\b\d+x\b|\b\d+(ms|s|m|k)\b|\bresult(ed|ing)? in\b|\bimpact was\b|\bdecreased by\b|\bincreased by\b|\bsaved\b)/i.test(lowerText);

  const starChecklist = {
    situation: hasSituation,
    task: hasTask,
    action: hasAction,
    result: hasResult
  };

  const starCount = [hasSituation, hasTask, hasAction, hasResult].filter(Boolean).length;
  const starScore = Math.round((starCount / 4) * 100);

  // 3. WPM Pacing
  let wpm = 0;
  let pacingFeedback = 'Natural conversational cadence';
  if (options.durationSeconds && options.durationSeconds > 5) {
    wpm = Math.round((totalWords / options.durationSeconds) * 60);
    if (wpm < 100) {
      pacingFeedback = `Deliberate / slow pace (${wpm} wpm). You can afford to accelerate slightly.`;
    } else if (wpm > 180) {
      pacingFeedback = `Fast speaking pace (${wpm} wpm). Consider taking pauses after key accomplishments.`;
    } else {
      pacingFeedback = `Optimal cadence (${wpm} wpm) — clear and authoritative.`;
    }
  }

  // 4. Delivery Score Calculation (1 to 10 scale)
  let score = 10;
  if (fillerFrequencyPer100 > 6) score -= 3;
  else if (fillerFrequencyPer100 > 3) score -= 1.5;
  else if (fillerFrequencyPer100 > 1.5) score -= 0.5;

  if (totalWords >= 35) {
    if (!hasResult) score -= 1.5;
    if (!hasAction) score -= 1.5;
    if (!hasSituation && !hasTask) score -= 1.0;
  }

  const deliveryScore = Math.max(1, Math.min(10, Math.round(score * 10) / 10));

  // 5. Actionable Coaching Suggestions
  const suggestions = [];
  if (totalFillers >= 2) {
    const topFillers = Object.entries(detectedFillers).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([w, c]) => `"${w}" (${c}x)`).join(', ');
    suggestions.push(`Try replacing filler words like ${topFillers} with a deliberate 1-second silent pause.`);
  }
  if (!hasResult && totalWords >= 30) {
    suggestions.push('Anchor your conclusion with a measurable metric (e.g. "% latency reduction", "$ saved", or "uptime SLA").');
  }
  if (!hasAction && totalWords >= 30) {
    suggestions.push('Highlight personal ownership using first-person active verbs: "I engineered...", "I profiled...", rather than "We worked on...".');
  }
  if (suggestions.length === 0) {
    suggestions.push('Excellent delivery! Confident tone, high technical density, and clear result metrics.');
  }

  return {
    deliveryScore,
    totalWords,
    fillerCount: totalFillers,
    fillerFrequencyPer100,
    detectedFillers,
    wpm,
    starChecklist,
    starScore,
    pacingFeedback,
    suggestions
  };
}

