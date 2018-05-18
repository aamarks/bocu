bocu
==========================================

A fast MIME-compatible [Binary Ordered Compression for Unicode](https://en.wikipedia.org/wiki/Binary_Ordered_Compression_for_Unicode) (BOCU). Under 2KB minified and gzipped.

Like [SCSU](http://en.wikipedia.org/wiki/Standard_Compression_Scheme_for_Unicode), BOCU is designed to be useful for compressing short strings and does so by mapping runs of characters in the same small alphabet to single bytes, thus reducing Unicode text to a size comparable to that of legacy encodings, while retaining all the advantages of Unicode. Unlike SCSU, BOCU is safe for email, preserving linefeeds and other control codes. 

I could not find any javascript implementations of BOCU so I wrote this one. This produces binary equivalent output of the C code. Tested on the entire unicode range. Tested in the major browsers.


Usage & Examples
-------

```javascript
sBocu = bocu.encode(sPlainText);
sPlainText = bocu.decode(sBocu);
```

```
bocu.encode('“Moscow” is Москва.'); // returns binary string: ñV. ¿Ã³¿ÇñW .¼Ã ÓÐKú
// with bytes: F1 56 2E A0 BF C3 B3 BF C7 F1 57 20 2E BC C3 20 D3 D0 8E 91 8A 82 80 4B FA

bocu.encode('foo 𝌆 bar 𝟙𝟚𝟛😎 mañana mañana 🏳️‍🌈');  
//  saved as utf-16: 84 bytes;  utf-8: 61 bytes;  deflate raw: 57 bytes  bocu1: 55 bytes; 
//  benchmark for that string: Bocu 664,117 ops/sec, gz deflate (Pako) 7,081 ops/sec
```

BOCU 'compression' won't do any better than utf-8 on simple English (byte per character --  it's bennefit is with other scripts that take multiple bytes with standard encoding like utf-8. The first character in a line will require multiple bytes and subsequent characters within a small script will only take one byte.) The massive speed difference between bocu and deflate is only with small strings, but that's when BOCU and SCSU are useful (for instance, saving individual strings into a database). bocu is faster on Firefox than a simple utf-8 conversion using `s = unescape(encodeURIComponent(s));` while on Chrome conversion to utf-8 is a couple of times faster.

```
// note that the encoded lines are always still sortable 
bocu.encode('alpha'); // ±¼À¸±
bocu.encode('beta');  // ²µÄ± 
bocu.encode('gamma'); // ·±½½± 

bocu.encode('άλφα');  // d3 60 8b 96 81
bocu.encode('βήτα');  // d3 66 7e 94 81
bocu.encode('γάμμα'); // d3 67 7c 8c 8c 81

```

Notes
-----

- This will work as is in a modern browser `<script src="bocu.js"></script>`. This uses ES6 features like arrow functions and the spread operator. If you want this to work in older browsers use something like the [Google Closure Compiler](https://closure-compiler.appspot.com) on Simple mode to minify, which currently will polyfill to ES5, or specify using `@language_out ES3`, or ES6 for no polyfill.

- I've ported the core parts of the C code (not the test module) and added a wrapper to encode a string and decode. The only minor change I made to the core was not including the number of bytes used in the lead byte (which is not stored in the encoding anyway) and simply figure out the number of bytes the return integer takes. Also the code allows for customising BOCU to be non-standard and use fewer byte values which requires conditional compilation `#if BOCU1_MAX_TRAIL`... that js can't do natively. The small bit of conditional code has been commented out, but could be added in for those unusual cases.

-I have not found any bocu1 files to test and can translate but can't program in C. The [C program](http://source.icu-project.org/repos/icu/icuhtml/trunk/design/conversion/bocu1/bocu1.html) is available and can produce BOCU-1 encoded files. If testing those files by reading them with fileReader, they must be opened as binary, not text, else fileReader will get the encoding wrong. 

BOCU Encoding References
------------------------

- http://www.ewellic.org/compression.html
- http://www.unicode.org/notes/tn6/
- http://www.icu-project.org/docs/papers/binary_ordered_compression_for_unicode.html


Authors
------

- Arthur Marks [@aamarks](https://github.com/aamarks)

Original implementation (in C):

- [BOCU-1 icu-project](http://source.icu-project.org/repos/icu/icuhtml/trunk/design/conversion/bocu1/bocu1.html) created by Markus W. Scherer. The license link for that code is dead. This may apply: [How-is-the-ICU-licensed?](http://userguide.icu-project.org/icufaq#TOC-How-is-the-ICU-licensed-) However there is also https://www.unicode.org/notes/tn6/#Intellectual_Property.


License
-------

MIT
