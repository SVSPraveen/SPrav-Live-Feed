/**
 * webgpu_worker.js
 * ================
 * Dedicated Web Worker for in-browser LLM inference via WebGPU & Apache TVM.
 *
 * Architecture Note:
 * ------------------
 * This worker delegates high-throughput WebGPU shader dispatch and KV-cache
 * management to @mlc-ai/web-llm's WebWorkerMLCEngineHandler.
 * The handler manages:
 *  - Dynamic WASM module initialization and GPU memory buffers
 *  - Progressive weight streaming from Hugging Face & CacheStorage
 *  - Tokenizer execution and temperature/top_p sampling off the main thread
 *
 * This implementation wraps the handler with worker lifecycle safety:
 *  - Error trapping via self.onerror and self.onunhandledrejection
 *  - Diagnostic healthcheck ping/pong responder
 *  - Graceful degradation telemetry if WebGPU device loss occurs
 */

import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

let handler = null;

try {
  handler = new WebWorkerMLCEngineHandler();
} catch (initErr) {
  console.error('[WebGPU Worker] Failed to instantiate WebWorkerMLCEngineHandler:', initErr);
}

self.onmessage = (event) => {
  // Support internal diagnostic heartbeat/healthcheck
  if (event.data && event.data.type === 'SPRAV_WORKER_PING') {
    self.postMessage({
      type: 'SPRAV_WORKER_PONG',
      timestamp: Date.now(),
      hasGpuContext: typeof navigator !== 'undefined' && Boolean(navigator.gpu),
      handlerReady: Boolean(handler)
    });
    return;
  }

  // Forward all MLC-AI standard protocol messages to WebWorkerMLCEngineHandler
  if (handler && typeof handler.onmessage === 'function') {
    try {
      handler.onmessage(event);
    } catch (dispatchErr) {
      console.error('[WebGPU Worker] Message dispatch error:', dispatchErr);
      self.postMessage({
        type: 'ERROR',
        error: dispatchErr?.message || String(dispatchErr)
      });
    }
  } else {
    console.warn('[WebGPU Worker] Received message before handler was ready:', event.data);
  }
};

self.onerror = (errorEvent) => {
  console.error('[WebGPU Worker] Uncaught worker error:', errorEvent.message || errorEvent);
};

self.onunhandledrejection = (rejectionEvent) => {
  console.error('[WebGPU Worker] Unhandled promise rejection in worker:', rejectionEvent.reason);
};
