// Foley Box sound catalog.
// Every clip is a real recording hosted on Wikimedia Commons under a public-domain or
// free Creative Commons license. Audio is streamed from Commons' MP3 transcodes and
// cached on the device by the service worker, so the board works offline after first load.
// start/end are trim points in seconds; gain normalises loudness across pads.

const C = "https://upload.wikimedia.org/wikipedia/commons/";
const mp3 = (hash, file) => `${C}transcoded/${hash}/${file}/${file}.mp3`;

const LIC = {
  PD: { name: "Public domain", url: "https://creativecommons.org/publicdomain/mark/1.0/" },
  CC0: { name: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
  BY3: { name: "CC BY 3.0", url: "https://creativecommons.org/licenses/by/3.0/" },
  BY4: { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
  BYSA3: { name: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" },
  BYSA25: { name: "CC BY-SA 2.5", url: "https://creativecommons.org/licenses/by-sa/2.5/" },
  BYSA4: { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
};

export const CATEGORIES = [
  { id: "laughs", name: "Laugh track" },
  { id: "crowd", name: "Crowd" },
  { id: "drums", name: "Rimshots & stings" },
  { id: "business", name: "Business" },
  { id: "cartoon", name: "Cartoon" },
];

const S = (o) => ({ gain: 1, start: 0, ...o, src: mp3(o.hash, o.file), page: `https://commons.wikimedia.org/wiki/File:${o.file}` });

export const SOUNDS = [
  // Laugh track
  S({ id: "sitcom", cat: "laughs", label: "Sitcom laugh", hash: "e/e5", file: "72844_lonemonk_approx-800-laughter-and-clapter-1.wav", end: 9.8, title: "Approx. 800 laughter and clapter", author: "lonemonk (freesound.org)", lic: LIC.BY3 }),
  S({ id: "biglaugh", cat: "laughs", label: "Big laugh", hash: "5/55", file: "72843_lonemonk_approx-800-laughter-only-1.wav", start: 0.1, end: 7.5, gain: 1.4, title: "Approx. 800 laughter only", author: "lonemonk (freesound.org)", lic: LIC.BY3 }),
  S({ id: "chuckle", cat: "laughs", label: "Chuckle", hash: "1/15", file: "72842_lonemonk_approx-800-laugh-1.wav", end: 2.45, gain: 1.3, title: "Approx. 800 laugh", author: "lonemonk (freesound.org)", lic: LIC.BY3 }),
  S({ id: "cartoonlaugh", cat: "laughs", label: "Cartoon laugh", hash: "c/cb", file: "Cartoon_Laugh.ogg", start: 0.45, end: 4.6, gain: 2.8, title: "Cartoon Laugh", author: "JohnsonBrandEditing", lic: LIC.CC0 }),
  S({ id: "evillaugh", cat: "laughs", label: "Mwahaha", hash: "9/96", file: "WAPP-Evil_Laugh.wav", end: 2.2, title: "WAPP Evil Laugh", author: "Dued1", lic: LIC.CC0 }),
  S({ id: "villain", cat: "laughs", label: "Villain laugh", hash: "f/fb", file: "Evil_laughter.ogg", start: 0.15, end: 4.4, gain: 1.2, title: "Evil laughter", author: "stilgar (pdsounds.org)", lic: LIC.PD }),

  // Crowd
  S({ id: "applause", cat: "crowd", label: "Applause", hash: "0/09", file: "Applause_ii.ogg", start: 0.2, end: 10.75, gain: 1.7, title: "Applause ii", author: "thore (pdsounds.org)", lic: LIC.PD }),
  S({ id: "cheer", cat: "crowd", label: "Cheers", hash: "1/1b", file: "Clapping_hurray_%28cropped%29.oga", end: 9.8, gain: 1.1, title: "Clapping hurray (cropped)", author: "Starlite (pdsounds.org)", lic: LIC.PD }),
  S({ id: "slowclap", cat: "crowd", label: "Slow clap", hash: "a/a3", file: "Slow_starting_applause.ogg", end: 16, title: "Slow starting applause", author: "stephan (pdsounds.org)", lic: LIC.PD }),
  S({ id: "boo", cat: "crowd", label: "Boo!", hash: "e/e5", file: "Soundgoats_-_Audience_Booing.wav", end: 4.7, gain: 3, title: "Audience Booing", author: "Brendon (Soundgoats)", lic: LIC.PD }),
  S({ id: "crickets", cat: "crowd", label: "Crickets", hash: "7/71", file: "Audio_H%C3%B6rbild_Grillenzirpen_-_nachts_um_3_im_F%C3%B6hrenwald_M%C3%B6dling.ogg", start: 0.5, end: 7.0, gain: 1.2, title: "Grillenzirpen, nachts um 3 im Föhrenwald Mödling", author: "DrTrumpet", lic: LIC.BYSA4 }),
  S({ id: "rooster", cat: "crowd", label: "Wake up!", hash: "0/0d", file: "Medium_rooster_crowing.ogg", start: 2.0, end: 6.2, gain: 1.2, title: "Medium rooster crowing", author: "alys (pdsounds.org)", lic: LIC.PD }),

  // Rimshots & stings
  S({ id: "rimshot", cat: "drums", label: "Ba-dum-tss", hash: "0/0c", file: "Kevin_MacLeod_assorted_rimshots_-_Kdum-keesh.wav", end: 2.3, gain: 1.7, title: "Assorted rimshots: Kdum-keesh", author: "Kevin MacLeod (incompetech.com)", lic: LIC.BY3 }),
  S({ id: "badum", cat: "drums", label: "Ba-dum", hash: "0/0f", file: "Kevin_MacLeod_assorted_rimshots_-_Bah-dum.wav", end: 1.0, title: "Assorted rimshots: Bah-dum", author: "Kevin MacLeod (incompetech.com)", lic: LIC.BY3 }),
  S({ id: "ping", cat: "drums", label: "Ba-dum-ping", hash: "b/bf", file: "Kevin_MacLeod_assorted_rimshots_-_D-dum-ping.wav", end: 1.6, gain: 1.2, title: "Assorted rimshots: D-dum-ping", author: "Kevin MacLeod (incompetech.com)", lic: LIC.BY3 }),
  S({ id: "drumroll", cat: "drums", label: "Drumroll", hash: "7/70", file: "Kevin_MacLeod_assorted_rimshots_-_4-second_roll.wav", end: 4.8, title: "Assorted rimshots: 4-second roll", author: "Kevin MacLeod (incompetech.com)", lic: LIC.BY3 }),
  S({ id: "crash", cat: "drums", label: "Crash!", hash: "d/df", file: "Kevin_MacLeod_assorted_rimshots_-_Crasher.wav", end: 2.6, title: "Assorted rimshots: Crasher", author: "Kevin MacLeod (incompetech.com)", lic: LIC.BY3 }),
  S({ id: "trombone", cat: "drums", label: "Sad trombone", hash: "3/35", file: "Sad_Trombone-Joe_Lamb-665429450.ogg", end: 3.8, title: "Sad Trombone", author: "Joe Lamb", lic: LIC.BY3 }),
  S({ id: "dundun", cat: "drums", label: "Dun dun duuun", hash: "8/81", file: "Dun_dun_duuun%21.ogg", end: 4.5, title: "Dun dun duuun!", author: "copyc4t", lic: LIC.BY4 }),
  S({ id: "gong", cat: "drums", label: "Gong", hash: "4/42", file: "Gong_or_bell_vibrant_%28short%29.ogg", start: 0.2, end: 5.6, gain: 1.2, title: "Gong or bell vibrant (short)", author: "pdsounds.org", lic: LIC.CC0 }),

  // Business
  S({ id: "phone", cat: "business", label: "Phone ringing", hash: "e/e7", file: "Model_500_Telephone_British_ring.ogg", end: 6.0, title: "Model 500 Telephone, British ring", author: "CianMcCann", lic: LIC.BYSA3 }),
  S({ id: "typing", cat: "business", label: "Furious typing", hash: "0/0a", file: "Typing_-_Model_M_1986.ogg", end: 5.0, title: "Typing, Model M 1986", author: "Raymangold22", lic: LIC.CC0 }),
  S({ id: "typeding", cat: "business", label: "Typewriter ding", hash: "9/9f", file: "406243_stubb_typewriter-ding-near-mono.wav", end: 1.05, gain: 2.5, title: "Typewriter ding", author: "_stubb (freesound.org)", lic: LIC.CC0 }),
  S({ id: "dialup", cat: "business", label: "Dial-up internet", hash: "8/85", file: "Dial_up_connection_%28short%29.oga", end: 9.5, gain: 1.2, title: "Dial up connection (short)", author: "pdsounds.org", lic: LIC.CC0 }),
  S({ id: "busy", cat: "business", label: "Busy signal", hash: "6/6c", file: "NorthAmericanBusySignal.ogg", end: 4.0, gain: 1.4, title: "North American busy signal", author: "Jamieyu (English Wikipedia)", lic: LIC.PD }),
  S({ id: "openbell", cat: "business", label: "Opening bell", hash: "6/64", file: "Dingdingding.wav", end: 1.74, gain: 3, title: "Ding ding ding", author: "IOII-IOIO-IIOI", lic: LIC.CC0 }),
  S({ id: "deadline", cat: "business", label: "Deadline", hash: "5/56", file: "Clock_ticking.ogg", end: 6.0, gain: 1.3, title: "Clock ticking", author: "natalie (pdsounds.org)", lic: LIC.PD }),
  S({ id: "kaching", cat: "business", label: "Ka-ching", hash: "7/70", file: "Cash_register.ogg", start: 0.2, end: 1.9, gain: 1.2, title: "Cash register", author: "Wikimedia Commons contributor", lic: LIC.PD }),
  S({ id: "coins", cat: "business", label: "Budget", hash: "2/2d", file: "Coins_dropped_in_metallic_moneybox.ogg", end: 3.6, gain: 1.6, title: "Coins dropped in metallic moneybox", author: "ezwa (pdsounds.org)", lic: LIC.PD }),
  S({ id: "shredder", cat: "business", label: "Shredder", hash: "e/e4", file: "Shredder_hum.ogg", end: 4.0, gain: 3, title: "Shredder hum", author: "stephan (pdsounds.org)", lic: LIC.PD }),
  S({ id: "printer", cat: "business", label: "Dot-matrix printer", hash: "1/17", file: "Star-LC-10-printer-01.ogg", end: 6.0, gain: 0.9, title: "Star LC-10 printer", author: "Priwo", lic: LIC.PD }),
  S({ id: "whip", cat: "business", label: "Crack the whip", hash: "c/c2", file: "Whip-sound.ogg", end: 0.89, gain: 1.2, title: "Whip sound", author: "Mike Koenig", lic: LIC.BY3 }),

  // Cartoon
  S({ id: "boing", cat: "cartoon", label: "Boing", hash: "e/ee", file: "Boing_raw.ogg", end: 2.6, gain: 1.6, title: "Boing raw", author: "cfork", lic: LIC.BY4 }),
  S({ id: "bonk", cat: "cartoon", label: "Bonk", hash: "a/a1", file: "Cartoon_Punch.ogg", start: 0.3, end: 0.85, title: "Cartoon Punch", author: "Unknown author", lic: LIC.BYSA25 }),
  S({ id: "squeak", cat: "cartoon", label: "Squeak", hash: "6/6e", file: "Rubber_squeaking.ogg", start: 0.25, end: 3.6, gain: 2, title: "Rubber squeaking", author: "stephan (pdsounds.org)", lic: LIC.PD }),
  S({ id: "wolf", cat: "cartoon", label: "Wolf whistle", hash: "a/ab", file: "Wolf_whistle.ogg", start: 1.0, end: 2.3, gain: 1.8, title: "Wolf whistle", author: "Wikimedia Commons contributor", lic: LIC.PD }),
  S({ id: "ref", cat: "cartoon", label: "Foul!", hash: "7/7d", file: "218318_splicesound_referee-whistle-blow-gymnasium.wav", start: 0.05, end: 1.2, gain: 2, title: "Referee whistle blow, gymnasium", author: "SpliceSound (freesound.org)", lic: LIC.CC0 }),
  S({ id: "bell", cat: "cartoon", label: "Ding-ding", hash: "c/ce", file: "Rotating-bicycle-bell.wav", end: 1.3, gain: 3, title: "Rotating bicycle bell", author: "AntumDeluge", lic: LIC.CC0 }),
];

// Keyboard shortcuts, assigned in board order.
export const KEYS = "1234567890qwertyuiopasdfghjklzxcvbnm".split("");
