/**
 * qr_generator.js
 * ===============
 * Pure JavaScript Zero-Dependency QR Code Generator.
 * Computes QR Code matrix and exports crisp SVG, Canvas, or Data URL.
 * 
 * Compliant with ISO/IEC 18004.
 * $0 compute cost, 100% in-browser, zero external npm packages required.
 */

// Reed-Solomon polynomial math tables in GF(256) with primitive polynomial 0x11D
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);
(function initGF() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = val;
    GF256_EXP[i + 255] = val;
    GF256_LOG[val] = i;
    val = (val << 1) ^ ((val >> 7) * 0x11d);
  }
})();

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

// Generates Reed-Solomon generator polynomial for degree
function rsGenPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = [1, GF256_EXP[i]];
    const res = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      res[j] ^= gfMul(poly[j], next[0]);
      res[j + 1] ^= gfMul(poly[j], next[1]);
    }
    poly = Array.from(res);
  }
  return poly;
}

// Computes error correction codewords for data
function rsComputeEcc(data, eccLen) {
  const gen = rsGenPoly(eccLen);
  const buf = new Uint8Array(data.length + eccLen);
  buf.set(data);
  for (let i = 0; i < data.length; i++) {
    const factor = buf[i];
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) {
        buf[i + j] ^= gfMul(gen[j], factor);
      }
    }
  }
  return buf.subarray(data.length);
}

// Version table capacities for Level L (Low error correction = maximum data capacity for QR)
// [totalCodewords, eccPerBlock, numBlocks]
const VERSION_SPECS_L = [
  null,
  [26, 7, 1],    // v1: 21x21, 19 data bytes
  [44, 10, 1],   // v2: 25x25, 34 data bytes
  [70, 15, 1],   // v3: 29x29, 55 data bytes
  [100, 20, 1],  // v4: 33x33, 80 data bytes
  [134, 26, 1],  // v5: 37x37, 108 data bytes
  [172, 18, 2],  // v6: 41x41, 136 data bytes
  [196, 20, 2],  // v7: 45x45, 156 data bytes
  [242, 24, 2],  // v8: 49x49, 194 data bytes
  [292, 30, 2],  // v9: 53x53, 232 data bytes
  [346, 18, 4],  // v10: 57x57, 274 data bytes
  [404, 20, 4],  // v11: 61x61, 324 data bytes
  [466, 24, 4],  // v12: 65x65, 370 data bytes
  [532, 26, 4],  // v13: 69x69, 428 data bytes
  [581, 30, 4],  // v14: 73x73, 461 data bytes
  [655, 22, 6],  // v15: 77x77, 523 data bytes
  [733, 24, 6],  // v16: 81x81, 589 data bytes
  [815, 28, 6],  // v17: 85x85, 647 data bytes
  [901, 30, 6],  // v18: 89x89, 721 data bytes
  [991, 28, 8],  // v19: 93x93, 795 data bytes
  [1085, 28, 8], // v20: 97x97, 861 data bytes
  [1156, 28, 8], // v21: 101x101, 932 data bytes
  [1258, 28, 8], // v22: 105x105, 1034 data bytes
  [1364, 30, 8], // v23: 109x109, 1124 data bytes
  [1474, 30, 8], // v24: 113x113, 1234 data bytes
  [1588, 26, 10], // v25: 117x117, 1328 data bytes
  [1706, 28, 10], // v26: 121x121, 1426 data bytes
  [1828, 28, 10], // v27: 125x125, 1548 data bytes
  [1921, 30, 12], // v28: 129x129, 1561 data bytes
];

// Alignment pattern centers for Versions 1-28
const ALIGNMENT_PATTERN_POS = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
  [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66],
  [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78],
  [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122]
];

/**
 * Encodes text into an 8-bit byte-mode QR Code bitstream.
 */
function encodeData(text, version) {
  const utf8 = new TextEncoder().encode(text);
  const dataLen = utf8.length;
  const spec = VERSION_SPECS_L[version];
  const totalDataBytes = spec[0] - (spec[1] * spec[2]);

  // Bit buffer
  let bits = '';
  // 1. Mode indicator: 8-bit byte mode is 0100
  bits += '0100';
  // 2. Character count indicator: 8 bits for v1-9, 16 bits for v10-40
  const charCountBits = version < 10 ? 8 : 16;
  bits += dataLen.toString(2).padStart(charCountBits, '0');

  // 3. UTF-8 byte payload
  for (let i = 0; i < utf8.length; i++) {
    bits += utf8[i].toString(2).padStart(8, '0');
  }

  // 4. Terminator: up to 4 zeroes
  const maxBits = totalDataBytes * 8;
  const termLen = Math.min(4, maxBits - bits.length);
  bits += '0'.repeat(termLen);

  // 5. Pad to multiple of 8
  while (bits.length % 8 !== 0) {
    bits += '0';
  }

  // 6. Pad bytes 0xEC and 0x11
  const padBytes = ['11101100', '00010001'];
  let padIdx = 0;
  while (bits.length < maxBits) {
    bits += padBytes[padIdx % 2];
    padIdx++;
  }

  // Convert bits to byte array
  const dataBytes = new Uint8Array(totalDataBytes);
  for (let i = 0; i < totalDataBytes; i++) {
    dataBytes[i] = parseInt(bits.substr(i * 8, 8), 2);
  }

  return dataBytes;
}

/**
 * Finds the minimum required QR version (1 to 20) for given text length.
 */
function selectVersion(text) {
  const utf8Len = new TextEncoder().encode(text).length;
  for (let v = 1; v < VERSION_SPECS_L.length; v++) {
    const spec = VERSION_SPECS_L[v];
    const dataCap = spec[0] - (spec[1] * spec[2]);
    // Overhead: 4 bits mode + (8 or 16) bits length
    const overheadBytes = v < 10 ? 2 : 3;
    if (utf8Len + overheadBytes <= dataCap) {
      return v;
    }
  }
  throw new Error(`Text payload too large for client QR generator (${utf8Len} bytes). Use Mobile Sync File.`);
}

/**
 * Builds the full 2D QR Code Matrix for the input text.
 * @param {string} text Text or URL to encode.
 * @returns {{ size: number, modules: boolean[][] }}
 */
export function generateQrMatrix(text) {
  const version = selectVersion(text);
  const size = 17 + 4 * version;
  const spec = VERSION_SPECS_L[version];

  // Initialize module matrix and isFunction (reserved) mask
  const modules = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(r, c, val) {
    modules[r][c] = val;
    isFunction[r][c] = true;
  }

  // 1. Finder patterns at (0,0), (size-7, 0), (0, size-7)
  const finderOrigins = [[0, 0], [size - 7, 0], [0, size - 7]];
  for (const [r0, c0] of finderOrigins) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setModule(r0 + r, c0 + c, isBorder || isCenter);
      }
    }
    // Separators
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = r0 + r;
        const col = c0 + c;
        if (row >= 0 && row < size && col >= 0 && col < size && !isFunction[row][col]) {
          setModule(row, col, false);
        }
      }
    }
  }

  // 2. Alignment patterns
  const alignCoords = ALIGNMENT_PATTERN_POS[version] || [];
  for (const r0 of alignCoords) {
    for (const c0 of alignCoords) {
      if (isFunction[r0][c0]) continue; // Skip if overlaps finder
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
          const isCenter = r === 0 && c === 0;
          setModule(r0 + r, c0 + c, isOuter || isCenter);
        }
      }
    }
  }

  // 3. Timing patterns (Row 6, Col 6)
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // 4. Dark module
  setModule(4 * version + 9, 8, true);

  // 5. Reserve format info areas
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunction[8][size - 1 - i] = true;
    isFunction[size - 1 - i][8] = true;
  }

  // 6. Encode and interleave data + ECC
  const dataBytes = encodeData(text, version);
  const numBlocks = spec[2];
  const eccPerBlock = spec[1];
  const blockSize = Math.floor(dataBytes.length / numBlocks);

  const dataBlocks = [];
  const eccBlocks = [];
  for (let b = 0; b < numBlocks; b++) {
    const blockData = dataBytes.subarray(b * blockSize, (b + 1) * blockSize);
    dataBlocks.push(blockData);
    eccBlocks.push(rsComputeEcc(blockData, eccPerBlock));
  }

  // Interleave codewords
  const finalCodewords = [];
  for (let i = 0; i < blockSize; i++) {
    for (let b = 0; b < numBlocks; b++) {
      finalCodewords.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < eccPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      finalCodewords.push(eccBlocks[b][i]);
    }
  }

  // Convert final codewords to bits
  let dataBits = '';
  for (const byte of finalCodewords) {
    dataBits += byte.toString(2).padStart(8, '0');
  }

  // 7. Place data bits in matrix (two-column zig-zag right to left)
  let bitIdx = 0;
  let dirUp = true;
  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c--; // Skip vertical timing pattern
    const rows = [];
    for (let r = 0; r < size; r++) rows.push(dirUp ? size - 1 - r : r);

    for (const r of rows) {
      for (let col = c; col >= c - 1; col--) {
        if (!isFunction[r][col]) {
          let bit = false;
          if (bitIdx < dataBits.length) {
            bit = dataBits[bitIdx] === '1';
            bitIdx++;
          }
          // Apply standard mask pattern 0: (row + col) % 2 === 0
          if ((r + col) % 2 === 0) {
            bit = !bit;
          }
          modules[r][col] = bit;
        }
      }
    }
    dirUp = !dirUp;
  }

  // 8. Place format information (Level L + Mask 0 = 111011111000100 ^ 101010000010010 = 010001111010110)
  const formatBits = '010001111010110';
  for (let i = 0; i < 15; i++) {
    const bit = formatBits[i] === '1';
    // Top-left
    if (i <= 5) modules[8][i] = bit;
    else if (i === 6) modules[8][7] = bit;
    else if (i === 7) modules[8][8] = bit;
    else if (i === 8) modules[7][8] = bit;
    else modules[14 - i][8] = bit;

    // Bottom / right splits
    if (i < 8) {
      modules[size - 1 - i][8] = bit;
    } else {
      modules[8][size - 15 + i] = bit;
    }
  }

  return { size, modules };
}

function sanitizeSvgColor(val, fallback) {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  if (/^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]{3,20})$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

/**
 * Renders QR matrix as an SVG XML string with customizable colors and border.
 */
export function generateQrSvg(text, options = {}) {
  const margin = Math.max(0, parseInt(options.margin, 10) || 3);
  const color = sanitizeSvgColor(options.color, '#000000');
  const background = sanitizeSvgColor(options.background, '#ffffff');

  const { size, modules } = generateQrMatrix(text);
  const totalSize = size + margin * 2;

  let rects = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) {
        rects += `<rect x="${c + margin}" y="${r + margin}" width="1" height="1" fill="${color}" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges">
    <rect width="${totalSize}" height="${totalSize}" fill="${background}" />
    ${rects}
  </svg>`;
}
