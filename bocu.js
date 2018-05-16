/** @license JS code Copyright (C) 2018, Arthur Marks,  MIT License. C code Copyright (C) 2002, International Business Machines, Markus W. Scherer, ICU X License */

/**
*   BOCU : Binary Ordered Compression for Unicode
*
*   A javascript port from the original C code (license below)
*   Copyright (C) 2018, Arthur Marks,  MIT License or something
*   (at least a star for this github repo would be nice)
*
******************************************************************************
*
*   Copyright (C) 2002, International Business Machines
*   Corporation and others.  All Rights Reserved.
*
*   For licensing terms see the ICU X License:
*   http://oss.software.ibm.com/cvs/icu/~checkout~/icu/license.html
*
*   created by: Markus W. Scherer
*
******************************************************************************
*/

/*
*   a fast MIME-compatible Binary Ordered Compression for Unicode. Under 2KB minified and gzipped.
*
*   This takes the byte values returned by the base code and then stores the bytes in string form as a binary 
*   string that you would save as binary. This is safe to use on any valid Unicode value. Tested in the major browsers.
*
*   Bocu is an alternative to storing strings as Utf8. It is slightly obfuscated, and much faster on short strings than
*   a true general compression method like gz deflate. 
*/

/* testing: '“Moscow” is Москва.' ==> F1 56 2E A0 BF C3 B3 BF C7 F1 57 20 2E BC C3 20 D3 D0 8E 91 8A 82 80 4B FA
*  sBocu = bocu.encode('“Moscow” is Москва.');
*/

var bocu = (function () {

	var pPrev = 0;

	/**
	 * Function to encode a string to BOCU-1.
	 *
	 * @param {string} s input standard js UTF-16 string
	 * @return {string} the supposedly mime safe encoding as binary string with line feeds preserved
	 */	 
	function encode(s) {
		var c, i = 0, sBocu = '',a = [...s];
		
		pPrev = 0;

		for (; i < a.length; i++) {
			c = encodeBocu1(a[i].codePointAt(0)) // unfortunately chrome is much slower at codePoint than FF
			if (c >>> 24) sBocu += String.fromCharCode(c >>> 24); // improved bitwork?
			if (c >>> 16) sBocu += String.fromCharCode((c & 0xFF0000) >>> 16);
			if (c >>> 8) sBocu += String.fromCharCode((c & 0xFF00) >>> 8);
			sBocu += String.fromCharCode(c >>> 0 & 0xFF);
			//sBocu += String.fromCodePoint(c);  // this isn't working for some high values that aren't valid unicode ( should just add each byte char)
			//sBocu += encodeBocu1(s.codePointAt(i)).toString(16) + ' '; // display byte values
		}
		return sBocu;
	}

	/**
	 * Function to decode a BOCU-1 byte string to a standard js UTF-16 string.
	 *
	 * @param {string} sBocu input BOCU-1 string of bytes
	 * @return {string} output js string
	 */
	function decode(sBocu) {
		var rx = {    // state for current character
			prev: 0,  // character zone
			count: 0, // 0-3 for position within up to 4 byte set
			diff: 0   // char 
		}; 
		var c, i = 0, s = '', a = bStrToBuf(sBocu);

		while (i < a.length) {

			c = decodeBocu1(rx, a[i++]);

			if (c < -1) {
				console.log("error: Bocu encoding error at string index " + i + ', character and preceding: ' + sBocu.substr(i - Math.max(0, 10), Math.min(i, 10)));
				return;
			}
			if (c >= 0) {
				s += String.fromCodePoint(c);
			}
			// -1 indicates non-character 'window' adjuster that may take 1-3 bytes? followed by final diff, the state is adjusted to handle the next byte
		}
		return s;
	}

	function bStrToBuf(s) {
		var buf = new ArrayBuffer(s.length); // 1 byte for each char (must be binary string)
		var bufView = new Uint8Array(buf);
		for (var i = 0, sLen = s.length; i < sLen; i++) {
			bufView[i] = s.charCodeAt(i);
		}
		return bufView;
	}
	/* *********************** end wrapping code, begin port of C code ************************* */


	/* initial value for "prev": middle of the ASCII range */
	const BOCU1_ASCII_PREV = 0x40;

	/* bounding byte values for differences */
	const BOCU1_MIN = 0x21;
	const BOCU1_MIDDLE = 0x90;
	const BOCU1_MAX_LEAD = 0xfe;
	const BOCU1_MAX_TRAIL = 0xff; // if you change this need to add in what was conditional compilation in decodeBocu1TrailByte()
	const BOCU1_RESET = 0xff;

	/* number of lead bytes */
	const BOCU1_COUNT = (BOCU1_MAX_LEAD - BOCU1_MIN + 1);

	/* adjust trail byte counts for the use of some C0 control byte values */
	const BOCU1_TRAIL_CONTROLS_COUNT = 20;
	const BOCU1_TRAIL_BYTE_OFFSET = (BOCU1_MIN - BOCU1_TRAIL_CONTROLS_COUNT);  //13 0x0d

	/* number of trail bytes */
	const BOCU1_TRAIL_COUNT = ((BOCU1_MAX_TRAIL - BOCU1_MIN + 1) + BOCU1_TRAIL_CONTROLS_COUNT); //243 0xf3
	/* I added these two to be faster but it's such a minor part of the whole that it has little effect */
	const BOCU1_TRAIL_COUNT_SQRD = BOCU1_TRAIL_COUNT * BOCU1_TRAIL_COUNT
	const BOCU1_TRAIL_COUNT_NEGCUBE = -BOCU1_TRAIL_COUNT * BOCU1_TRAIL_COUNT * BOCU1_TRAIL_COUNT
	/*
	 * number of positive and negative single-byte codes
	 * (counting 0==BOCU1_MIDDLE among the positive ones)
	 */
	const BOCU1_SINGLE = 64;

	/* number of lead bytes for positive and negative 2/3/4-byte sequences */
	const BOCU1_LEAD_2 = 43;
	const BOCU1_LEAD_3 = 3;
	const BOCU1_LEAD_4 = 1;

	/* The difference value range for single-byters. */
	const BOCU1_REACH_POS_1 = (BOCU1_SINGLE - 1);
	const BOCU1_REACH_NEG_1 = (-BOCU1_SINGLE);

	/* The difference value range for double-byters. */
	const BOCU1_REACH_POS_2 = (BOCU1_REACH_POS_1 + BOCU1_LEAD_2 * BOCU1_TRAIL_COUNT);
	const BOCU1_REACH_NEG_2 = (BOCU1_REACH_NEG_1 - BOCU1_LEAD_2 * BOCU1_TRAIL_COUNT);

	/* The difference value range for 3-byters. */
	const BOCU1_REACH_POS_3 = (BOCU1_REACH_POS_2 + BOCU1_LEAD_3 * BOCU1_TRAIL_COUNT * BOCU1_TRAIL_COUNT);
	const BOCU1_REACH_NEG_3 = (BOCU1_REACH_NEG_2 - BOCU1_LEAD_3 * BOCU1_TRAIL_COUNT * BOCU1_TRAIL_COUNT);

	/* The lead byte start values. */
	const BOCU1_START_POS_2 = (BOCU1_MIDDLE + BOCU1_REACH_POS_1 + 1);
	const BOCU1_START_POS_3 = (BOCU1_START_POS_2 + BOCU1_LEAD_2);
	const BOCU1_START_POS_4 = (BOCU1_START_POS_3 + BOCU1_LEAD_3);
	/* ==BOCU1_MAX_LEAD */

	const BOCU1_START_NEG_2 = (BOCU1_MIDDLE + BOCU1_REACH_NEG_1);
	const BOCU1_START_NEG_3 = (BOCU1_START_NEG_2 - BOCU1_LEAD_2);
	const BOCU1_START_NEG_4 = (BOCU1_START_NEG_3 - BOCU1_LEAD_3);
	/* ==BOCU1_MIN+1 */

	/* The length of a byte sequence, according to the lead byte  = (!=BOCU1_RESET). */
	/* Seems to be unused so... (I've used my own method in the wrapper to determine num bytes 
	*  and eliminated the lead byte indicator from packDiff.) 
	*/
	/* const BOCU1_LENGTH_FROM_LEAD(lead) =
		((BOCU1_START_NEG_2 <= (lead) && (lead) < BOCU1_START_POS_2) ? 1 : 
		(BOCU1_START_NEG_3 <= (lead) && (lead) < BOCU1_START_POS_3) ? 2 : 
		(BOCU1_START_NEG_4 <= (lead) && (lead) < BOCU1_START_POS_4) ? 3 : 4); */

	/* The length of a byte sequence, according to its packed form. */
	/* const BOCU1_LENGTH_FROM_PACKED = (packed) => ((packed) < 0x04000000 ? (packed) >> 24 : 4); */
	/*
	 * 12 commonly used C0 control codes (and space) are only used to encode
	 * themselves directly,
	 * which makes BOCU-1 MIME-usable and reasonably safe for
	 * ASCII-oriented software.
	 *
	 * These controls are
	 *  0 NUL,  7 BEL,  8 BS,  9 TAB,  a LF,  b VT,  c FF,  d CR,  e SO,  f SI, 1a SUB,  1b ESC
	 *
	 * The other 20 C0 controls are also encoded directly (to preserve order)
	 * but are also used as trail bytes in difference encoding
	 * (for better compression).
	 */
	
	bocu1ByteToTrail = [-1, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, -1, -1, -1, -1, -1, -1, -1, -1, -1, 
		                0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, -1, -1, 0x10, 0x11, 0x12, 0x13, -1];
	bocu1TrailToByte = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x10, 0x11, 0x12, 0x13, 
		                0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1c, 0x1d, 0x1e, 0x1f];
	const BOCU1_TRAIL_TO_BYTE = (t) => ((t >= BOCU1_TRAIL_CONTROLS_COUNT) ? t + BOCU1_TRAIL_BYTE_OFFSET : bocu1TrailToByte[t]);


	/*
	 * Integer division and modulo with negative numerators
	 * yields negative modulo results and quotients that are one more than
	 * what we need here.
	 * This macro adjust the results so that the modulo-value m is always >=0.
	 *
	 * For positive n, the if() condition is always FALSE.
	 *
	 * @param n Number to be split into quotient and rest.
	 *          Will be modified to contain the quotient.
	 * @param d Divisor.
	 * @return m Output for the rest (modulo result).
	 */
	/* 	function NEGDIVMOD(n, d) {  // this doesn't work in js because both m and n need to be returned
			var m = 0;
			m = n % d;
			n /= d;
			if (m < 0) {
				--n;
				m += d;
			} return m;
		} 
	*/

	/* BOCU-1 implementation functions ------------------------------------------ */

	/**
	 * Compute the next "previous" value for differencing
	 * from the current code point.
	 *
	 * @param c current code point, 0..0x10ffff
	 * @return "previous code point" state value
	 */
	function bocu1Prev(c) {
		/* compute new prev (middle of the codepage-like block) */
		if (0x3040 <= c && c <= 0x309f) {
			/* Hiragana is not 128-aligned */
			return 0x3070;
		} else if (0x4e00 <= c && c <= 0x9fa5) { // large scripts need two bytes for diff
			/* CJK Unihan */
			return 0x4e00 - BOCU1_REACH_NEG_2;
		} else if (0xac00 <= c && c <= 0xd7a3) {
			/* Korean Hangul */
			return 0xc1d1; // Math.trunc((0xd7a3 + 0xac00) / 2);
		} else {
			/* mostly small scripts */  // 0x40 into the ascii-sized 128 byte block of current char
			// this can be neg. Need ((c & ~0x7f) >>> 0) to not be neg
			return (c & ~0x7f) + BOCU1_ASCII_PREV; // tilde bit swap is twice as fast as negative, and about same as c & 0xFFFFFF80
		}
	}

	/**
	 * Encode a difference -0x10ffff..0x10ffff in 1..4 bytes
	 * and return a packed integer with them.
	 *
	 * The encoding favors small absolute differences with short encodings
	 * to compress runs of same-script characters.
	 *
	 * @param diff difference value -0x10ffff..0x10ffff
	 * @return (I am not returning the byte number (1-3) in the high byte 
	 *      The final output shouldn't have that. It could only be used to inform the caller 
	 *      of the number of bytes needed to be stored but that's easy enough to figure out.)
	 *      0x010000zz for 1-byte sequence zz  
	 *      0x0200yyzz for 2-byte sequence yy zz
	 *      0x03xxyyzz for 3-byte sequence xx yy zz
	 *      0xwwxxyyzz for 4-byte sequence ww xx yy zz (ww>0x03)
	 */
	function packDiff(diff) {
		var result, lead, count, shift;

		if (diff >= BOCU1_REACH_NEG_1) {
			/* mostly positive differences, and single-byte negative ones */
			if (diff <= BOCU1_REACH_POS_1) {
				/* single byte */
				// return 0x01000000|(BOCU1_MIDDLE+diff); // not using the number of bytes in lead byte
				return BOCU1_MIDDLE + diff; // if in same script as last char, instead of encoding char you encode char shift from the middle of the script block
			} else if (diff <= BOCU1_REACH_POS_2) {
				/* two bytes */
				diff -= BOCU1_REACH_POS_1 + 1;
				lead = BOCU1_START_POS_2;
				count = 1;
			} else if (diff <= BOCU1_REACH_POS_3) {
				/* three bytes */
				diff -= BOCU1_REACH_POS_2 + 1;
				lead = BOCU1_START_POS_3;
				count = 2;
			} else {
				/* four bytes */
				diff -= BOCU1_REACH_POS_3 + 1;
				lead = BOCU1_START_POS_4;
				count = 3;
			}
		} else {
			/* two- and four-byte negative differences */
			if (diff >= BOCU1_REACH_NEG_2) {
				/* two bytes */
				diff -= BOCU1_REACH_NEG_1;
				lead = BOCU1_START_NEG_2;
				count = 1;
			} else if (diff >= BOCU1_REACH_NEG_3) {
				/* three bytes */
				diff -= BOCU1_REACH_NEG_2;
				lead = BOCU1_START_NEG_3;
				count = 2;
			} else {
				/* four bytes */
				diff -= BOCU1_REACH_NEG_3;
				lead = BOCU1_START_NEG_4;
				count = 3;
			}
		}

		/* encode the length of the packed result */
		//if(count<3) {
		//result=(count+1)<<24;
		//} else /* count==3, MSB used for the lead byte */ {
		result = 0;
		//}

		/* calculate trail bytes like digits in itoa() */
		shift = 0;
		var m = 0;
		do {
			// NEGDIVMOD()
			m = diff % BOCU1_TRAIL_COUNT;
			diff = ~~(diff / BOCU1_TRAIL_COUNT); // should I use Math.trunc instead? think ~~ is older, and it's a bit faster
			if (m < 0) {
				--diff;
				m += BOCU1_TRAIL_COUNT;
			}
			// result |= BOCU1_TRAIL_TO_BYTE(NEGDIVMOD(diff, BOCU1_TRAIL_COUNT))<<shift;
			result |= BOCU1_TRAIL_TO_BYTE(m) << shift;
			shift += 8;
		} while (--count > 0);

		/* add lead byte */
		result |= (lead + diff) << shift;

		return result;
	}

	/**
	 * BOCU-1 encoder function.
	 *
	 * @param pPrev 
	 *        the "previous code point" state;
	 *        the initial value should be 0 which
	 *        encodeBocu1 will set to the actual BOCU-1 initial state value
	 * @param c the code point to encode
	 * @return the packed 1/2/3/4-byte encoding, see packDiff(),
	 *         or 0 if an error occurs
	 *
	 * @see packDiff
	 */
	function encodeBocu1(c) {
		var prev;

		if (c < 0 || c > 0x10ffff) {
			/* illegal argument */
			//console.log('illegal character value: out of unicode range');
			return 0;
		}

		prev = pPrev;
		if (prev === 0) {
			/* lenient handling of initial value 0 */
			prev = pPrev = BOCU1_ASCII_PREV;
		}

		if (c <= 0x20) {
			/*
			 * ISO C0 control & space:
			 * Encode directly for MIME compatibility,
			 * and reset state except for space, to not disrupt compression.
			 */
			if (c !== 0x20) { // any control except space resets Prev
				pPrev = BOCU1_ASCII_PREV; // ...i.e. new line (resets Prev)
			}
			// return 0x01000000|c;  // not using lead byte, number of bytes indicator (if lead byte is set it's actual character data)
			return c;
		}

		/*
		 * all other Unicode code points c==U+0021..U+10ffff
		 * are encoded with the difference c-prev
		 *
		 * a new prev is computed from c to be saved for use on the next char,
		 * placed in the middle of a 0x80-block (for most small scripts: english, russian, etc) or
		 * in the middle of the Unihan and Hangul blocks
		 * to statistically minimize the following difference
		 */
		pPrev = bocu1Prev(c);
		return packDiff(c - prev);
	}

	/**
	 * Function for BOCU-1 decoder; handles multi-byte lead bytes.
	 *
	 * @param pRx the decoder state structure
	 * @param b lead byte;
	 *          BOCU1_MIN<=b<BOCU1_START_NEG_2 or BOCU1_START_POS_2<=b<=BOCU1_MAX_LEAD
	 * @return -1 (state change only)
	 *
	 * @see decodeBocu1
	 */
	function decodeBocu1LeadByte(pRx, b) {
		var c, count;

		if (b >= BOCU1_START_NEG_2) {
			/* positive difference */
			if (b < BOCU1_START_POS_3) {
				/* two bytes */
				c = (b - BOCU1_START_POS_2) * BOCU1_TRAIL_COUNT + BOCU1_REACH_POS_1 + 1;
				count = 1;
			} else if (b < BOCU1_START_POS_4) {
				/* three bytes */
				c = (b - BOCU1_START_POS_3) * BOCU1_TRAIL_COUNT_SQRD + BOCU1_REACH_POS_2 + 1;
				count = 2;
			} else {
				/* four bytes */
				c = BOCU1_REACH_POS_3 + 1;
				count = 3;
			}
		} else {
			/* negative difference */
			if (b >= BOCU1_START_NEG_3) {
				/* two bytes */
				c = (b - BOCU1_START_NEG_2) * BOCU1_TRAIL_COUNT + BOCU1_REACH_NEG_1;
				count = 1;
			} else if (b > BOCU1_MIN) {
				/* three bytes */
				c = (b - BOCU1_START_NEG_3) * BOCU1_TRAIL_COUNT_SQRD + BOCU1_REACH_NEG_2;
				count = 2;
			} else {
				/* four bytes */
				c = BOCU1_TRAIL_COUNT_NEGCUBE + BOCU1_REACH_NEG_3;
				count = 3;
			}
		}

		/* set the state for decoding the trail byte(s) */
		pRx.diff = c;
		pRx.count = count;
		return -1;
	}

	/**
	 * Function for BOCU-1 decoder; handles multi-byte trail bytes.
	 *
	 * @param pRx pointer to the decoder state structure
	 * @param b trail byte
	 * @return result value, same as decodeBocu1
	 *
	 * @see decodeBocu1
	 */
	function decodeBocu1TrailByte(pRx, b) {
		var t, c, count;

		if (b <= 0x20) {
			// -1s (any of special controls (tab, newline,...space) should not be a trail byte)
			/* skip some C0 controls and make the trail byte range contiguous */
			t = bocu1ByteToTrail[b];
			if (t < 0) {
				/* illegal trail byte value */
				pRx.prev = BOCU1_ASCII_PREV;
				pRx.count = 0;
				return -99;
			}
// #if BOCU1_MAX_TRAIL<0xff
		// } else if (b > BOCU1_MAX_TRAIL) {
		// 	return -99;
// #endif
		} else {
			t = b - BOCU1_TRAIL_BYTE_OFFSET;
		}

		/* add trail byte into difference and decrement count */
		c = pRx.diff;
		count = pRx.count;

		if (count === 1) {
			/* final trail byte, deliver a code point */
			c = pRx.prev + c + t;
			if (0 <= c && c <= 0x10ffff) {
				/* valid code point result */
				pRx.prev = bocu1Prev(c);
				pRx.count = 0;
				return c;
			} else {
				/* illegal code point result */
				pRx.prev = BOCU1_ASCII_PREV;
				pRx.count = 0;
				return -99;
			}
		}

		/* intermediate trail byte */
		if (count === 2) {
			pRx.diff = c + t * BOCU1_TRAIL_COUNT;
		} else /* count==3 */ {
			pRx.diff = c + t * BOCU1_TRAIL_COUNT_SQRD;
		}
		pRx.count = count - 1;
		return -1;
	}

	/**
	 * BOCU-1 decoder function.
	 *
	 * @param pRx pointer to the decoder state structure;
	 *        the initial values should be 0 which
	 *        decodeBocu1 will set to actual initial state values
	 * @param b an input byte
	 * @return
	 *      0..0x10ffff for a result code point
	 *      -1 if only the state changed without code point output
	 *     <-1 if an error occurs
	 */
	function decodeBocu1(pRx, b) {
		var prev, c, count;

		prev = pRx.prev;
		if (prev === 0) {
			/* lenient handling of initial 0 values */
			prev = pRx.prev = BOCU1_ASCII_PREV;
			count = pRx.count = 0;
		} else {
			count = pRx.count;
		}
		if (count === 0) {
			/* byte in lead position */
			if (b <= 0x20) {
				/*
				 * Direct-encoded C0 control code or space.
				 * Reset prev for C0 control codes but not for space.
				 */
				if (b !== 0x20) {
					pRx.prev = BOCU1_ASCII_PREV;
				}
				return b;
			}

			/*
			 * b is a difference lead byte.
			 *
			 * Return a code point directly from a single-byte difference.
			 *
			 * For multi-byte difference lead bytes, set the decoder state
			 * with the partial difference value from the lead byte and
			 * with the number of trail bytes.
			 *
			 * For four-byte differences, the signedness also affects the
			 * first trail byte, which has special handling farther below.
			 */
			if (b >= BOCU1_START_NEG_2 && b < BOCU1_START_POS_2) {
				/* single-byte difference */
				c = prev + (b - BOCU1_MIDDLE);
				pRx.prev = bocu1Prev(c);
				return c;
			} else if (b === BOCU1_RESET) {
				/* only reset the state, no code point */
				pRx.prev = BOCU1_ASCII_PREV;
				return -1;
			} else {
				return decodeBocu1LeadByte(pRx, b);
			}
		} else {
			/* trail byte in any position */
			return decodeBocu1TrailByte(pRx, b);
		}
	}
	// ************************* end port of C code **************************

	return {
		encode: encode,
		decode: decode
	}

})();
