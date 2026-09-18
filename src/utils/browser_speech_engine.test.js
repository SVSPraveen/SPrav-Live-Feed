import { describe, it, beforeEach, afterEach, after } from 'node:test';
import assert from 'node:assert';
import {
  isSpeechSynthesisSupported,
  isSpeechRecognitionSupported,
  getAvailableVoices,
  getBestInterviewerVoice,
  chunkTextForSpeech,
  speakText,
  stopSpeaking,
  createSpeechRecognizer,
  analyzeVoiceDelivery,
  COMMON_FILLER_WORDS
} from './browser_speech_engine.js';

describe('browser_speech_engine utility', () => {
  const hadWindow = 'window' in globalThis;
  const originalWindow = globalThis.window;

  after(() => {
    if (!hadWindow) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  });

  beforeEach(() => {
    if (typeof globalThis.window === 'undefined') {
      globalThis.window = {};
    }

    globalThis.window.speechSynthesis = {
      speak: (utterance) => {
        setTimeout(() => {
          if (utterance.onstart) utterance.onstart();
          setTimeout(() => {
            if (utterance.onend) utterance.onend();
          }, 10);
        }, 5);
      },
      cancel: () => {},
      pause: () => {},
      resume: () => {},
      getVoices: () => [
        { name: 'Microsoft David Desktop - English (United States)', lang: 'en-US' },
        { name: 'Google US English Natural', lang: 'en-US' },
        { name: 'Microsoft Zira Desktop - English (United States)', lang: 'en-US' }
      ],
      speaking: false,
      paused: false
    };

    globalThis.window.SpeechSynthesisUtterance = class MockUtterance {
      constructor(text) {
        this.text = text;
        this.voice = null;
        this.rate = 1.0;
        this.pitch = 1.0;
        this.volume = 1.0;
        this.onstart = null;
        this.onend = null;
        this.onerror = null;
      }
    };
  });

  afterEach(() => {
    stopSpeaking();
  });

  it('detects native speech synthesis support accurately', () => {
    assert.strictEqual(isSpeechSynthesisSupported(), true);

    const saved = globalThis.window.speechSynthesis;
    delete globalThis.window.speechSynthesis;
    assert.strictEqual(isSpeechSynthesisSupported(), false);
    globalThis.window.speechSynthesis = saved;
  });

  it('detects speech recognition support accurately', () => {
    delete globalThis.window.SpeechRecognition;
    delete globalThis.window.webkitSpeechRecognition;
    assert.strictEqual(isSpeechRecognitionSupported(), false);

    globalThis.window.SpeechRecognition = function() {};
    assert.strictEqual(isSpeechRecognitionSupported(), true);

    delete globalThis.window.SpeechRecognition;
    globalThis.window.webkitSpeechRecognition = function() {};
    assert.strictEqual(isSpeechRecognitionSupported(), true);
    delete globalThis.window.webkitSpeechRecognition;
  });

  it('retrieves voices and selects the best natural interviewer voice', () => {
    const voices = getAvailableVoices();
    assert.strictEqual(voices.length, 3);

    const bestVoice = getBestInterviewerVoice('en');
    assert.ok(bestVoice);
    assert.ok(bestVoice.name.includes('Google US English Natural'));
  });

  it('chunks long text into coherent sentences to avoid Chromium 15s timeout', () => {
    assert.deepStrictEqual(chunkTextForSpeech(''), []);

    const shortText = 'Tell me about a time you led a high-stakes incident.';
    assert.deepStrictEqual(chunkTextForSpeech(shortText), [shortText]);

    const longText = 'We faced a cascading database deadlock. First, we isolated the writer nodes. Second, we spun up advisory locks in Redis. Third, we completed the recovery without dropping a single order.';
    const chunks = chunkTextForSpeech(longText, 80);
    assert.ok(chunks.length >= 2);
    assert.ok(chunks.join(' ').includes('We faced a cascading database deadlock'));
  });

  it('speakText invokes native speech synthesis and triggers callbacks', async () => {
    let started = false;
    let ended = false;

    const success = await speakText('How would you design a distributed rate limiter?', {
      onStart: () => { started = true; },
      onEnd: () => { ended = true; },
      rate: 1.05
    });

    assert.strictEqual(success, true);
    assert.strictEqual(started, true);
    assert.strictEqual(ended, true);
  });

  it('stopSpeaking cancels ongoing speech synthesis without throwing', () => {
    let cancelCalled = false;
    globalThis.window.speechSynthesis.cancel = () => { cancelCalled = true; };

    stopSpeaking();
    assert.strictEqual(cancelCalled, true);
  });

  it('createSpeechRecognizer configures recognition and passes transcripts', () => {
    let started = false;
    let stopped = false;
    const mockRecInstance = {
      start() {
        started = true;
        if (this.onstart) this.onstart();
      },
      stop() {
        stopped = true;
        if (this.onend) this.onend();
      },
      abort() {},
      continuous: false,
      interimResults: false,
      lang: ''
    };

    globalThis.window.SpeechRecognition = function() {
      return mockRecInstance;
    };

    let transcriptResult = '';
    let startCallback = false;
    let endCallback = false;

    const recognizer = createSpeechRecognizer({
      onTranscriptChange: (text) => { transcriptResult = text; },
      onStart: () => { startCallback = true; },
      onEnd: () => { endCallback = true; }
    });

    assert.strictEqual(recognizer.supported, true);
    recognizer.start();

    assert.strictEqual(started, true);
    assert.strictEqual(startCallback, true);

    // Simulate speech result
    mockRecInstance.onresult({
      resultIndex: 0,
      results: [
        [{ transcript: 'During our Black Friday sale ' }]
      ]
    });

    assert.strictEqual(transcriptResult, 'During our Black Friday sale');

    recognizer.stop();
    assert.strictEqual(stopped, true);
    assert.strictEqual(endCallback, true);
  });

  describe('analyzeVoiceDelivery voice mock coaching engine', () => {
    it('returns default empty state for blank transcript', () => {
      const res = analyzeVoiceDelivery('');
      assert.strictEqual(res.deliveryScore, 10);
      assert.strictEqual(res.fillerCount, 0);
      assert.strictEqual(res.starScore, 0);
    });

    it('detects filler words and calculates frequency per 100 words', () => {
      const transcript = 'Um, basically when I was at Stripe, you know, our team had a latency spike and like, actually we needed to fix it.';
      const res = analyzeVoiceDelivery(transcript);

      assert.ok(res.fillerCount >= 4);
      assert.ok(res.detectedFillers.um >= 1);
      assert.ok(res.detectedFillers.basically >= 1);
      assert.ok(res.fillerFrequencyPer100 > 0);
      assert.ok(res.suggestions.some(s => s.includes('filler words')));
    });

    it('recognizes complete STAR framework story with metrics and provides high score', () => {
      const starTranscript = 'When I was at Stripe, our team faced an issue where payment webhooks were failing during traffic spikes. My responsibility was to eliminate dropped events and restore reliability. I engineered a distributed Redis semantic buffer and refactored the ingestion worker pool in Go. Resulting in zero dropped webhooks and decreased p99 latency by 45%, saving $1.2M in SLA penalties.';
      const res = analyzeVoiceDelivery(starTranscript, { durationSeconds: 45 });

      assert.strictEqual(res.starChecklist.situation, true);
      assert.strictEqual(res.starChecklist.task, true);
      assert.strictEqual(res.starChecklist.action, true);
      assert.strictEqual(res.starChecklist.result, true);
      assert.strictEqual(res.starScore, 100);
      assert.ok(res.deliveryScore >= 9.0);
      assert.ok(res.wpm > 0);
    });
  });
});

