// embedding_worker.js
// Dedicated Web Worker executing BAAI/bge-small-en-v1.5 (quantized INT8 ~33MB)
// Runs on CPU via WebAssembly (WASM SIMD) with 0 VRAM usage.
// 100% Client-Side Sovereign Execution.

let pipelinePromise = null;
let extractor = null;

async function getExtractor(progressCallback) {
  if (extractor) return extractor;
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await import('@xenova/transformers');
      
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      const instance = await pipeline(
        'feature-extraction',
        'Xenova/bge-small-en-v1.5',
        {
          quantized: true,
          progress_callback: (prog) => {
            if (typeof progressCallback === 'function') {
              progressCallback(prog);
            }
          }
        }
      );
      return instance;
    })();
  }
  extractor = await pipelinePromise;
  return extractor;
}

self.onmessage = async (event) => {
  const { type, id, text, texts } = event.data || {};

  try {
    if (type === 'INIT') {
      await getExtractor((prog) => {
        self.postMessage({ type: 'PROGRESS', progress: prog });
      });
      self.postMessage({ type: 'INIT_SUCCESS', id });
      return;
    }

    if (type === 'EMBED') {
      const ext = await getExtractor();
      const output = await ext(text, { pooling: 'mean', normalize: true });
      const vector = Array.from(output.data);
      self.postMessage({ type: 'EMBED_SUCCESS', id, vector });
      return;
    }

    if (type === 'BATCH_EMBED') {
      const ext = await getExtractor();
      const results = [];
      for (const t of (texts || [])) {
        const output = await ext(t, { pooling: 'mean', normalize: true });
        results.push(Array.from(output.data));
      }
      self.postMessage({ type: 'BATCH_EMBED_SUCCESS', id, vectors: results });
      return;
    }

    if (type === 'TERMINATE') {
      extractor = null;
      pipelinePromise = null;
      self.postMessage({ type: 'TERMINATED' });
      self.close();
      return;
    }
  } catch (err) {
    self.postMessage({ type: 'ERROR', id, error: err?.message || String(err) });
  }
};
