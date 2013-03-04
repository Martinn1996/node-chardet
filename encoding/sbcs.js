var util = require('util'),
    Match = require ('../match');

/**
 * This class recognizes single-byte encodings. Because the encoding scheme is so
 * simple, language statistics are used to do the matching.
 */

function NGramParser(theNgramList, theByteMap) {
    var N_GRAM_MASK = 0xFFFFFF;

    this.byteIndex = 0;
    this.ngram = 0;

    this.ngramList = theNgramList;
    this.byteMap = theByteMap;

    this.ngramCount = 0;
    this.hitCount = 0;

    this.spaceChar;

    /*
     * Binary search for value in table, which must have exactly 64 entries.
     */
    this.search = function(table, value) {
        var index = 0;

        if (table[index + 32] <= value) {
            index += 32;
        }

        if (table[index + 16] <= value) {
            index += 16;
        }

        if (table[index + 8] <= value) {
            index += 8;
        }

        if (table[index + 4] <= value) {
            index += 4;
        }

        if (table[index + 2] <= value) {
            index += 2;
        }

        if (table[index + 1] <= value) {
            index += 1;
        }

        if (table[index] > value) {
            index -= 1;
        }

        if (index < 0 || table[index] != value) {
            return -1;
        }

        return index;
    };

    this.lookup = function(thisNgram) {
        this.ngramCount += 1;
        if (this.search(this.ngramList, thisNgram) >= 0) {
            this.hitCount += 1;
        }
    };

    this.addByte = function(b) {
        this.ngram = ((this.ngram << 8) + (b & 0xFF)) & N_GRAM_MASK;
        this.lookup(this.ngram);
    }

    this.nextByte = function(det)
    {
        if (this.byteIndex >= det.fInputLen) {
            return -1;
        }

        return det.fInputBytes[this.byteIndex++] & 0xFF;
    }

    // public int parse(CharsetDetector det)
    // {
    //     return parse (det, (byte)0x20);
    // }

    this.parse = function(det, spaceCh) {
        var b;
        var ignoreSpace = false;
        this.spaceChar = spaceCh;

        while ((b = this.nextByte(det)) >= 0) {
            var mb = this.byteMap[b];

            // TODO: 0x20 might not be a space in all character sets...
            if (mb != 0) {
                if (!(mb == this.spaceChar && ignoreSpace)) {
                    this.addByte(mb);
                }

                ignoreSpace = (mb == this.spaceChar);
            }
        }

        // TODO: Is this OK? The buffer could have ended in the middle of a word...
        this.addByte(this.spaceChar);

        var rawPercent = this.hitCount / this.ngramCount;

//                if (rawPercent <= 2.0) {
//                    return 0;
//                }

        // TODO - This is a bit of a hack to take care of a case
        // were we were getting a confidence of 135...
        if (rawPercent > 0.33) {
            return 98;
        }

        return Math.floor(rawPercent * 300.0);
    };
};

function NGramsPlusLang(la, ng) {
    this.fLang = la;
    this.fNGrams = ng;
};

function sbcs() {};
sbcs.prototype.spaceChar = 0x20;
sbcs.prototype.ngrams = [];
sbcs.prototype.byteMap = [];
sbcs.prototype.match = function(det) {

    var multiple = (this.ngrams instanceof Array && this.ngrams[0] instanceof Array);
    if (multiple) {
        var bestConfidenceSoFar = -1;
        var lang = null;

        for (var i = this.ngrams.length - 1; i >= 0; i--) {
            var ngl = this.ngrams[i];

            var parser = new NGramParser(ngl.fNGrams, this.byteMap);
            var confidence = parser.parse(det, this.spaceChar);
            if (confidence > bestConfidenceSoFar) {
                bestConfidenceSoFar = confidence;
                lang = ngl.fLang;
            }
        }

        var name = this.name(det);
        return bestConfidenceSoFar <= 0 ? null : new Match(det, this, bestConfidenceSoFar, name, lang);
    }

    var parser = new NGramParser(this.ngrams, this.byteMap);
    var confidence = parser.parse(det, this.spaceChar);
    return confidence <= 0 ? null : new Match(det, this, confidence);
};


module.exports.ISO_8859_1 = function() {
    this.byteMap = [
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x00,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67,
        0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
        0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77,
        0x78, 0x79, 0x7A, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67,
        0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
        0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77,
        0x78, 0x79, 0x7A, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0xAA, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0xB5, 0x20, 0x20,
        0x20, 0x20, 0xBA, 0x20, 0x20, 0x20, 0x20, 0x20,
        0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7,
        0xE8, 0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEE, 0xEF,
        0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0x20,
        0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xDF,
        0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7,
        0xE8, 0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEE, 0xEF,
        0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0x20,
        0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF
    ];

    this.ngrams = [
        new NGramsPlusLang("da", [
            0x206166, 0x206174, 0x206465, 0x20656E, 0x206572, 0x20666F, 0x206861, 0x206920, 0x206D65, 0x206F67, 0x2070E5, 0x207369, 0x207374, 0x207469, 0x207669, 0x616620,
            0x616E20, 0x616E64, 0x617220, 0x617420, 0x646520, 0x64656E, 0x646572, 0x646574, 0x652073, 0x656420, 0x656465, 0x656E20, 0x656E64, 0x657220, 0x657265, 0x657320,
            0x657420, 0x666F72, 0x676520, 0x67656E, 0x676572, 0x696765, 0x696C20, 0x696E67, 0x6B6520, 0x6B6B65, 0x6C6572, 0x6C6967, 0x6C6C65, 0x6D6564, 0x6E6465, 0x6E6520,
            0x6E6720, 0x6E6765, 0x6F6720, 0x6F6D20, 0x6F7220, 0x70E520, 0x722064, 0x722065, 0x722073, 0x726520, 0x737465, 0x742073, 0x746520, 0x746572, 0x74696C, 0x766572
        ]),
        new NGramsPlusLang("de", [
            0x20616E, 0x206175, 0x206265, 0x206461, 0x206465, 0x206469, 0x206569, 0x206765, 0x206861, 0x20696E, 0x206D69, 0x207363, 0x207365, 0x20756E, 0x207665, 0x20766F,
            0x207765, 0x207A75, 0x626572, 0x636820, 0x636865, 0x636874, 0x646173, 0x64656E, 0x646572, 0x646965, 0x652064, 0x652073, 0x65696E, 0x656974, 0x656E20, 0x657220,
            0x657320, 0x67656E, 0x68656E, 0x687420, 0x696368, 0x696520, 0x696E20, 0x696E65, 0x697420, 0x6C6963, 0x6C6C65, 0x6E2061, 0x6E2064, 0x6E2073, 0x6E6420, 0x6E6465,
            0x6E6520, 0x6E6720, 0x6E6765, 0x6E7465, 0x722064, 0x726465, 0x726569, 0x736368, 0x737465, 0x742064, 0x746520, 0x74656E, 0x746572, 0x756E64, 0x756E67, 0x766572
        ]),
        new NGramsPlusLang("en", [
            0x206120, 0x20616E, 0x206265, 0x20636F, 0x20666F, 0x206861, 0x206865, 0x20696E, 0x206D61, 0x206F66, 0x207072, 0x207265, 0x207361, 0x207374, 0x207468, 0x20746F,
            0x207768, 0x616964, 0x616C20, 0x616E20, 0x616E64, 0x617320, 0x617420, 0x617465, 0x617469, 0x642061, 0x642074, 0x652061, 0x652073, 0x652074, 0x656420, 0x656E74,
            0x657220, 0x657320, 0x666F72, 0x686174, 0x686520, 0x686572, 0x696420, 0x696E20, 0x696E67, 0x696F6E, 0x697320, 0x6E2061, 0x6E2074, 0x6E6420, 0x6E6720, 0x6E7420,
            0x6F6620, 0x6F6E20, 0x6F7220, 0x726520, 0x727320, 0x732061, 0x732074, 0x736169, 0x737420, 0x742074, 0x746572, 0x746861, 0x746865, 0x74696F, 0x746F20, 0x747320
        ]),
        new NGramsPlusLang("es", [
            0x206120, 0x206361, 0x20636F, 0x206465, 0x20656C, 0x20656E, 0x206573, 0x20696E, 0x206C61, 0x206C6F, 0x207061, 0x20706F, 0x207072, 0x207175, 0x207265, 0x207365,
            0x20756E, 0x207920, 0x612063, 0x612064, 0x612065, 0x61206C, 0x612070, 0x616369, 0x61646F, 0x616C20, 0x617220, 0x617320, 0x6369F3, 0x636F6E, 0x646520, 0x64656C,
            0x646F20, 0x652064, 0x652065, 0x65206C, 0x656C20, 0x656E20, 0x656E74, 0x657320, 0x657374, 0x69656E, 0x69F36E, 0x6C6120, 0x6C6F73, 0x6E2065, 0x6E7465, 0x6F2064,
            0x6F2065, 0x6F6E20, 0x6F7220, 0x6F7320, 0x706172, 0x717565, 0x726120, 0x726573, 0x732064, 0x732065, 0x732070, 0x736520, 0x746520, 0x746F20, 0x756520, 0xF36E20
        ]),
        new NGramsPlusLang("fr", [
            0x206175, 0x20636F, 0x206461, 0x206465, 0x206475, 0x20656E, 0x206574, 0x206C61, 0x206C65, 0x207061, 0x20706F, 0x207072, 0x207175, 0x207365, 0x20736F, 0x20756E,
            0x20E020, 0x616E74, 0x617469, 0x636520, 0x636F6E, 0x646520, 0x646573, 0x647520, 0x652061, 0x652063, 0x652064, 0x652065, 0x65206C, 0x652070, 0x652073, 0x656E20,
            0x656E74, 0x657220, 0x657320, 0x657420, 0x657572, 0x696F6E, 0x697320, 0x697420, 0x6C6120, 0x6C6520, 0x6C6573, 0x6D656E, 0x6E2064, 0x6E6520, 0x6E7320, 0x6E7420,
            0x6F6E20, 0x6F6E74, 0x6F7572, 0x717565, 0x72206C, 0x726520, 0x732061, 0x732064, 0x732065, 0x73206C, 0x732070, 0x742064, 0x746520, 0x74696F, 0x756520, 0x757220
        ]),
        new NGramsPlusLang("it", [
            0x20616C, 0x206368, 0x20636F, 0x206465, 0x206469, 0x206520, 0x20696C, 0x20696E, 0x206C61, 0x207065, 0x207072, 0x20756E, 0x612063, 0x612064, 0x612070, 0x612073,
            0x61746F, 0x636865, 0x636F6E, 0x64656C, 0x646920, 0x652061, 0x652063, 0x652064, 0x652069, 0x65206C, 0x652070, 0x652073, 0x656C20, 0x656C6C, 0x656E74, 0x657220,
            0x686520, 0x692061, 0x692063, 0x692064, 0x692073, 0x696120, 0x696C20, 0x696E20, 0x696F6E, 0x6C6120, 0x6C6520, 0x6C6920, 0x6C6C61, 0x6E6520, 0x6E6920, 0x6E6F20,
            0x6E7465, 0x6F2061, 0x6F2064, 0x6F2069, 0x6F2073, 0x6F6E20, 0x6F6E65, 0x706572, 0x726120, 0x726520, 0x736920, 0x746120, 0x746520, 0x746920, 0x746F20, 0x7A696F
        ]),
        new NGramsPlusLang("nl", [
            0x20616C, 0x206265, 0x206461, 0x206465, 0x206469, 0x206565, 0x20656E, 0x206765, 0x206865, 0x20696E, 0x206D61, 0x206D65, 0x206F70, 0x207465, 0x207661, 0x207665,
            0x20766F, 0x207765, 0x207A69, 0x61616E, 0x616172, 0x616E20, 0x616E64, 0x617220, 0x617420, 0x636874, 0x646520, 0x64656E, 0x646572, 0x652062, 0x652076, 0x65656E,
            0x656572, 0x656E20, 0x657220, 0x657273, 0x657420, 0x67656E, 0x686574, 0x696520, 0x696E20, 0x696E67, 0x697320, 0x6E2062, 0x6E2064, 0x6E2065, 0x6E2068, 0x6E206F,
            0x6E2076, 0x6E6465, 0x6E6720, 0x6F6E64, 0x6F6F72, 0x6F7020, 0x6F7220, 0x736368, 0x737465, 0x742064, 0x746520, 0x74656E, 0x746572, 0x76616E, 0x766572, 0x766F6F
        ]),
        new NGramsPlusLang("no", [
            0x206174, 0x206176, 0x206465, 0x20656E, 0x206572, 0x20666F, 0x206861, 0x206920, 0x206D65, 0x206F67, 0x2070E5, 0x207365, 0x20736B, 0x20736F, 0x207374, 0x207469,
            0x207669, 0x20E520, 0x616E64, 0x617220, 0x617420, 0x646520, 0x64656E, 0x646574, 0x652073, 0x656420, 0x656E20, 0x656E65, 0x657220, 0x657265, 0x657420, 0x657474,
            0x666F72, 0x67656E, 0x696B6B, 0x696C20, 0x696E67, 0x6B6520, 0x6B6B65, 0x6C6520, 0x6C6C65, 0x6D6564, 0x6D656E, 0x6E2073, 0x6E6520, 0x6E6720, 0x6E6765, 0x6E6E65,
            0x6F6720, 0x6F6D20, 0x6F7220, 0x70E520, 0x722073, 0x726520, 0x736F6D, 0x737465, 0x742073, 0x746520, 0x74656E, 0x746572, 0x74696C, 0x747420, 0x747465, 0x766572
        ]),
        new NGramsPlusLang("pt", [
            0x206120, 0x20636F, 0x206461, 0x206465, 0x20646F, 0x206520, 0x206573, 0x206D61, 0x206E6F, 0x206F20, 0x207061, 0x20706F, 0x207072, 0x207175, 0x207265, 0x207365,
            0x20756D, 0x612061, 0x612063, 0x612064, 0x612070, 0x616465, 0x61646F, 0x616C20, 0x617220, 0x617261, 0x617320, 0x636F6D, 0x636F6E, 0x646120, 0x646520, 0x646F20,
            0x646F73, 0x652061, 0x652064, 0x656D20, 0x656E74, 0x657320, 0x657374, 0x696120, 0x696361, 0x6D656E, 0x6E7465, 0x6E746F, 0x6F2061, 0x6F2063, 0x6F2064, 0x6F2065,
            0x6F2070, 0x6F7320, 0x706172, 0x717565, 0x726120, 0x726573, 0x732061, 0x732064, 0x732065, 0x732070, 0x737461, 0x746520, 0x746F20, 0x756520, 0xE36F20, 0xE7E36F
        ]),
        new NGramsPlusLang("sv", [
            0x206174, 0x206176, 0x206465, 0x20656E, 0x2066F6, 0x206861, 0x206920, 0x20696E, 0x206B6F, 0x206D65, 0x206F63, 0x2070E5, 0x20736B, 0x20736F, 0x207374, 0x207469,
            0x207661, 0x207669, 0x20E472, 0x616465, 0x616E20, 0x616E64, 0x617220, 0x617474, 0x636820, 0x646520, 0x64656E, 0x646572, 0x646574, 0x656420, 0x656E20, 0x657220,
            0x657420, 0x66F672, 0x67656E, 0x696C6C, 0x696E67, 0x6B6120, 0x6C6C20, 0x6D6564, 0x6E2073, 0x6E6120, 0x6E6465, 0x6E6720, 0x6E6765, 0x6E696E, 0x6F6368, 0x6F6D20,
            0x6F6E20, 0x70E520, 0x722061, 0x722073, 0x726120, 0x736B61, 0x736F6D, 0x742073, 0x746120, 0x746520, 0x746572, 0x74696C, 0x747420, 0x766172, 0xE47220, 0xF67220,
        ])
    ];

    this.name = function(det) {
        if (typeof det == 'undefined')
            return "ISO-8859-1";
        return det.fC1Bytes ? "windows-1252" : "ISO-8859-1";
    };
};
util.inherits(module.exports.ISO_8859_1, sbcs);


module.exports.ISO_8859_2 = function() {
    this.byteMap = [
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x00,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67,
        0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
        0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77,
        0x78, 0x79, 0x7A, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67,
        0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
        0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77,
        0x78, 0x79, 0x7A, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0xB1, 0x20, 0xB3, 0x20, 0xB5, 0xB6, 0x20,
        0x20, 0xB9, 0xBA, 0xBB, 0xBC, 0x20, 0xBE, 0xBF,
        0x20, 0xB1, 0x20, 0xB3, 0x20, 0xB5, 0xB6, 0xB7,
        0x20, 0xB9, 0xBA, 0xBB, 0xBC, 0x20, 0xBE, 0xBF,
        0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7,
        0xE8, 0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEE, 0xEF,
        0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0x20,
        0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xDF,
        0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7,
        0xE8, 0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEE, 0xEF,
        0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0x20,
        0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0x20
    ];

    this.ngrams = [
        new NGramsPlusLang("cs", [
            0x206120, 0x206279, 0x20646F, 0x206A65, 0x206E61, 0x206E65, 0x206F20, 0x206F64, 0x20706F, 0x207072, 0x2070F8, 0x20726F, 0x207365, 0x20736F, 0x207374, 0x20746F,
            0x207620, 0x207679, 0x207A61, 0x612070, 0x636520, 0x636820, 0x652070, 0x652073, 0x652076, 0x656D20, 0x656EED, 0x686F20, 0x686F64, 0x697374, 0x6A6520, 0x6B7465,
            0x6C6520, 0x6C6920, 0x6E6120, 0x6EE920, 0x6EEC20, 0x6EED20, 0x6F2070, 0x6F646E, 0x6F6A69, 0x6F7374, 0x6F7520, 0x6F7661, 0x706F64, 0x706F6A, 0x70726F, 0x70F865,
            0x736520, 0x736F75, 0x737461, 0x737469, 0x73746E, 0x746572, 0x746EED, 0x746F20, 0x752070, 0xBE6520, 0xE16EED, 0xE9686F, 0xED2070, 0xED2073, 0xED6D20, 0xF86564,
        ]),
        new NGramsPlusLang("hu", [
            0x206120, 0x20617A, 0x206265, 0x206567, 0x20656C, 0x206665, 0x206861, 0x20686F, 0x206973, 0x206B65, 0x206B69, 0x206BF6, 0x206C65, 0x206D61, 0x206D65, 0x206D69,
            0x206E65, 0x20737A, 0x207465, 0x20E973, 0x612061, 0x61206B, 0x61206D, 0x612073, 0x616B20, 0x616E20, 0x617A20, 0x62616E, 0x62656E, 0x656779, 0x656B20, 0x656C20,
            0x656C65, 0x656D20, 0x656E20, 0x657265, 0x657420, 0x657465, 0x657474, 0x677920, 0x686F67, 0x696E74, 0x697320, 0x6B2061, 0x6BF67A, 0x6D6567, 0x6D696E, 0x6E2061,
            0x6E616B, 0x6E656B, 0x6E656D, 0x6E7420, 0x6F6779, 0x732061, 0x737A65, 0x737A74, 0x737AE1, 0x73E967, 0x742061, 0x747420, 0x74E173, 0x7A6572, 0xE16E20, 0xE97320,
        ]),
        new NGramsPlusLang("pl", [
            0x20637A, 0x20646F, 0x206920, 0x206A65, 0x206B6F, 0x206D61, 0x206D69, 0x206E61, 0x206E69, 0x206F64, 0x20706F, 0x207072, 0x207369, 0x207720, 0x207769, 0x207779,
            0x207A20, 0x207A61, 0x612070, 0x612077, 0x616E69, 0x636820, 0x637A65, 0x637A79, 0x646F20, 0x647A69, 0x652070, 0x652073, 0x652077, 0x65207A, 0x65676F, 0x656A20,
            0x656D20, 0x656E69, 0x676F20, 0x696120, 0x696520, 0x69656A, 0x6B6120, 0x6B6920, 0x6B6965, 0x6D6965, 0x6E6120, 0x6E6961, 0x6E6965, 0x6F2070, 0x6F7761, 0x6F7769,
            0x706F6C, 0x707261, 0x70726F, 0x70727A, 0x727A65, 0x727A79, 0x7369EA, 0x736B69, 0x737461, 0x776965, 0x796368, 0x796D20, 0x7A6520, 0x7A6965, 0x7A7920, 0xF37720,
        ]),
        new NGramsPlusLang("ro", [
            0x206120, 0x206163, 0x206361, 0x206365, 0x20636F, 0x206375, 0x206465, 0x206469, 0x206C61, 0x206D61, 0x207065, 0x207072, 0x207365, 0x2073E3, 0x20756E, 0x20BA69,
            0x20EE6E, 0x612063, 0x612064, 0x617265, 0x617420, 0x617465, 0x617520, 0x636172, 0x636F6E, 0x637520, 0x63E320, 0x646520, 0x652061, 0x652063, 0x652064, 0x652070,
            0x652073, 0x656120, 0x656920, 0x656C65, 0x656E74, 0x657374, 0x692061, 0x692063, 0x692064, 0x692070, 0x696520, 0x696920, 0x696E20, 0x6C6120, 0x6C6520, 0x6C6F72,
            0x6C7569, 0x6E6520, 0x6E7472, 0x6F7220, 0x70656E, 0x726520, 0x726561, 0x727520, 0x73E320, 0x746520, 0x747275, 0x74E320, 0x756920, 0x756C20, 0xBA6920, 0xEE6E20,
        ])
    ];

    this.name = function(det) {
        if (typeof det == 'undefined')
            return "ISO-8859-2";
        return det.fC1Bytes ? "windows-1250" : "ISO-8859-2";
    };
};
util.inherits(module.exports.ISO_8859_2, sbcs);


module.exports.ISO_8859_5 = function() {
    this.byteMap = [
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x00,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67,
        0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
        0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77,
        0x78, 0x79, 0x7A, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67,
        0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
        0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77,
        0x78, 0x79, 0x7A, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7,
        0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0x20, 0xFE, 0xFF,
        0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7,
        0xD8, 0xD9, 0xDA, 0xDB, 0xDC, 0xDD, 0xDE, 0xDF,
        0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7,
        0xE8, 0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEE, 0xEF,
        0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7,
        0xD8, 0xD9, 0xDA, 0xDB, 0xDC, 0xDD, 0xDE, 0xDF,
        0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7,
        0xE8, 0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEE, 0xEF,
        0x20, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7,
        0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0x20, 0xFE, 0xFF
    ];

    this.ngrams = [
        0x20D220, 0x20D2DE, 0x20D4DE, 0x20D7D0, 0x20D820, 0x20DAD0, 0x20DADE, 0x20DDD0, 0x20DDD5, 0x20DED1, 0x20DFDE, 0x20DFE0, 0x20E0D0, 0x20E1DE, 0x20E1E2, 0x20E2DE,
        0x20E7E2, 0x20EDE2, 0xD0DDD8, 0xD0E2EC, 0xD3DE20, 0xD5DBEC, 0xD5DDD8, 0xD5E1E2, 0xD5E220, 0xD820DF, 0xD8D520, 0xD8D820, 0xD8EF20, 0xDBD5DD, 0xDBD820, 0xDBECDD,
        0xDDD020, 0xDDD520, 0xDDD8D5, 0xDDD8EF, 0xDDDE20, 0xDDDED2, 0xDE20D2, 0xDE20DF, 0xDE20E1, 0xDED220, 0xDED2D0, 0xDED3DE, 0xDED920, 0xDEDBEC, 0xDEDC20, 0xDEE1E2,
        0xDFDEDB, 0xDFE0D5, 0xDFE0D8, 0xDFE0DE, 0xE0D0D2, 0xE0D5D4, 0xE1E2D0, 0xE1E2D2, 0xE1E2D8, 0xE1EF20, 0xE2D5DB, 0xE2DE20, 0xE2DEE0, 0xE2EC20, 0xE7E2DE, 0xEBE520
    ];

    this.name = function(det) {
        return "ISO-8859-5";
    };

    this.language = function() {
        return "ru";
    };
};
util.inherits(module.exports.ISO_8859_5, sbcs);


module.exports.ISO_8859_6 = function() {
    this.byteMap = [
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x00,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67,
        0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
        0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77,
        0x78, 0x79, 0x7A, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67,
        0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
        0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77,
        0x78, 0x79, 0x7A, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7,
        0xC8, 0xC9, 0xCA, 0xCB, 0xCC, 0xCD, 0xCE, 0xCF,
        0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7,
        0xD8, 0xD9, 0xDA, 0x20, 0x20, 0x20, 0x20, 0x20,
        0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7,
        0xE8, 0xE9, 0xEA, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20
    ];

    this.ngrams = [
        0x20C7E4, 0x20C7E6, 0x20C8C7, 0x20D9E4, 0x20E1EA, 0x20E4E4, 0x20E5E6, 0x20E8C7, 0xC720C7, 0xC7C120, 0xC7CA20, 0xC7D120, 0xC7E420, 0xC7E4C3, 0xC7E4C7, 0xC7E4C8,
        0xC7E4CA, 0xC7E4CC, 0xC7E4CD, 0xC7E4CF, 0xC7E4D3, 0xC7E4D9, 0xC7E4E2, 0xC7E4E5, 0xC7E4E8, 0xC7E4EA, 0xC7E520, 0xC7E620, 0xC7E6CA, 0xC820C7, 0xC920C7, 0xC920E1,
        0xC920E4, 0xC920E5, 0xC920E8, 0xCA20C7, 0xCF20C7, 0xCFC920, 0xD120C7, 0xD1C920, 0xD320C7, 0xD920C7, 0xD9E4E9, 0xE1EA20, 0xE420C7, 0xE4C920, 0xE4E920, 0xE4EA20,
        0xE520C7, 0xE5C720, 0xE5C920, 0xE5E620, 0xE620C7, 0xE720C7, 0xE7C720, 0xE8C7E4, 0xE8E620, 0xE920C7, 0xEA20C7, 0xEA20E5, 0xEA20E8, 0xEAC920, 0xEAD120, 0xEAE620
    ];

    this.name = function(det) {
        return "ISO-8859-6";
    };

    this.language = function() {
        return "ar";
    };
};
util.inherits(module.exports.ISO_8859_6, sbcs);


module.exports.ISO_8859_7 = function() {
    this.byteMap = [
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x00,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67,
        0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
        0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77,
        0x78, 0x79, 0x7A, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67,
        0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
        0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77,
        0x78, 0x79, 0x7A, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0xA1, 0xA2, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0xDC, 0x20,
        0xDD, 0xDE, 0xDF, 0x20, 0xFC, 0x20, 0xFD, 0xFE,
        0xC0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7,
        0xE8, 0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEE, 0xEF,
        0xF0, 0xF1, 0x20, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7,
        0xF8, 0xF9, 0xFA, 0xFB, 0xDC, 0xDD, 0xDE, 0xDF,
        0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7,
        0xE8, 0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEE, 0xEF,
        0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7,
        0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0x20
    ];

    this.ngrams = [
        0x20E1ED, 0x20E1F0, 0x20E3E9, 0x20E4E9, 0x20E5F0, 0x20E720, 0x20EAE1, 0x20ECE5, 0x20EDE1, 0x20EF20, 0x20F0E1, 0x20F0EF, 0x20F0F1, 0x20F3F4, 0x20F3F5, 0x20F4E7,
        0x20F4EF, 0xDFE120, 0xE120E1, 0xE120F4, 0xE1E920, 0xE1ED20, 0xE1F0FC, 0xE1F220, 0xE3E9E1, 0xE5E920, 0xE5F220, 0xE720F4, 0xE7ED20, 0xE7F220, 0xE920F4, 0xE9E120,
        0xE9EADE, 0xE9F220, 0xEAE1E9, 0xEAE1F4, 0xECE520, 0xED20E1, 0xED20E5, 0xED20F0, 0xEDE120, 0xEFF220, 0xEFF520, 0xF0EFF5, 0xF0F1EF, 0xF0FC20, 0xF220E1, 0xF220E5,
        0xF220EA, 0xF220F0, 0xF220F4, 0xF3E520, 0xF3E720, 0xF3F4EF, 0xF4E120, 0xF4E1E9, 0xF4E7ED, 0xF4E7F2, 0xF4E9EA, 0xF4EF20, 0xF4EFF5, 0xF4F9ED, 0xF9ED20, 0xFEED20
    ];

    this.name = function(det) {
        if (typeof det == 'undefined')
            return "ISO-8859-7";
        return det.fC1Bytes ? "windows-1253" : "ISO-8859-7";
    };

    this.language = function() {
        return "el";
    };
};
util.inherits(module.exports.ISO_8859_7, sbcs);



