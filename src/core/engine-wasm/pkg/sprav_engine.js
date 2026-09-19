// SPrav Job AI WebAssembly Engine Module
import * as wasmBg from './sprav_engine_bg.js';

let wasmInstance = null;

export async function initWasm(wasmInput) {
  if (wasmInstance) return wasmInstance;

  let buffer;
  if (!wasmInput) {
    // In Vite / browser environment:
    const wasmUrl = new URL('./sprav_engine_bg.wasm', import.meta.url).href;
    const response = await fetch(wasmUrl);
    buffer = await response.arrayBuffer();
  } else if (wasmInput instanceof ArrayBuffer || ArrayBuffer.isView(wasmInput)) {
    buffer = wasmInput;
  } else if (typeof wasmInput === 'string') {
    const response = await fetch(wasmInput);
    buffer = await response.arrayBuffer();
  }

  const { instance } = await WebAssembly.instantiate(buffer, {});
  wasmInstance = instance.exports;
  wasmBg.setWasm(wasmInstance);
  return wasmInstance;
}

export function wasm_kernel_version() {
  return wasmInstance ? wasmInstance.wasm_kernel_version() : 20260919;
}

export function score_resume(contact, sections, format, keywords, verbs, quant, dates, length, flags, skills, edu, jd_match, has_jd) {
  if (!wasmInstance) throw new Error("Wasm engine not initialized");
  return wasmInstance.score_resume(contact, sections, format, keywords, verbs, quant, dates, length, flags, skills, edu, jd_match, has_jd ? 1 : 0);
}

export function score_grade(score) {
  if (!wasmInstance) throw new Error("Wasm engine not initialized");
  return wasmInstance.score_grade(score);
}

export function get_freshness_multiplier(code, age_days) {
  if (!wasmInstance) throw new Error("Wasm engine not initialized");
  return wasmInstance.get_freshness_multiplier(code, age_days);
}

export function calculate_freshness_decay(ats_score, code, age_days) {
  if (!wasmInstance) throw new Error("Wasm engine not initialized");
  return wasmInstance.calculate_freshness_decay(ats_score, code, age_days);
}

export function calculate_callback_likelihood(ats_score, freshness_multiplier, is_remote) {
  if (!wasmInstance) throw new Error("Wasm engine not initialized");
  return wasmInstance.calculate_callback_likelihood(ats_score, freshness_multiplier, is_remote ? 1 : 0);
}

export function calculate_salary_delta(job_median, benchmark_median) {
  if (!wasmInstance) throw new Error("Wasm engine not initialized");
  return wasmInstance.calculate_salary_delta(job_median, benchmark_median);
}

export function classify_salary_tier(delta_percent) {
  if (!wasmInstance) throw new Error("Wasm engine not initialized");
  return wasmInstance.classify_salary_tier(delta_percent);
}

export default initWasm;
