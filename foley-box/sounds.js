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
  { id: "emotions", name: "Emotions" },
  { id: "business", name: "Business" },
  { id: "cartoon", name: "Cartoon" },
];

const S = (o) => ({ gain: 1, start: 0, ...o, src: mp3(o.hash, o.file), page: `https://commons.wikimedia.org/wiki/File:${o.file}` });

export const SOUNDS = [
  // Laugh track
  S({ id: "sitcom", cat: "laughs", label: "Sitcom laugh", hash: "e/e5", file: "72844_lonemonk_approx-800-laughter-and-clapter-1.wav", end: 9.8, gain: 0.79, title: "Approx. 800 laughter and clapter", author: "lonemonk (freesound.org)", lic: LIC.BY3 }),
  S({ id: "biglaugh", cat: "laughs", label: "Big laugh", hash: "5/55", file: "72843_lonemonk_approx-800-laughter-only-1.wav", start: 0.1, end: 7.5, gain: 1.26, title: "Approx. 800 laughter only", author: "lonemonk (freesound.org)", lic: LIC.BY3 }),
  S({ id: "chuckle", cat: "laughs", label: "Chuckle", hash: "e/eb", file: "Small_group_laughter.ogg", start: 0.7, end: 4.4, gain: 4.32, title: "Small group laughter", author: "Ch0cchi (freesound.org)", lic: LIC.BY3 }),
  S({ id: "cartoonlaugh", cat: "laughs", label: "Cartoon laugh", hash: "c/cb", file: "Cartoon_Laugh.ogg", start: 0.45, end: 4.6, gain: 2.82, title: "Cartoon Laugh", author: "JohnsonBrandEditing", lic: LIC.CC0 }),
  S({ id: "villain", cat: "laughs", label: "Villain laugh", hash: "f/fb", file: "Evil_laughter.ogg", start: 0.15, end: 4.4, gain: 1.0, title: "Evil laughter", author: "stilgar (pdsounds.org)", lic: LIC.PD }),

  // Crowd
  S({ id: "applause", cat: "crowd", label: "Applause", hash: "0/09", file: "Applause_ii.ogg", start: 1.5, end: 10.75, gain: 1.9, title: "Applause ii", author: "thore (pdsounds.org)", lic: LIC.PD }),
  S({ id: "cheer", cat: "crowd", label: "Cheers & air horns", hash: "9/94", file: "F1-Race-Crowd-Applause-Air-Horns.wav", start: 9.2, end: 14.5, gain: 1.41, title: "Crowd applause and air horns, F1 British Grand Prix 2012", author: "WebbFilmsUK", lic: LIC.BY4 }),
  S({ id: "slowclap", cat: "crowd", label: "Slow clap", hash: "a/a3", file: "Slow_starting_applause.ogg", start: 3.4, end: 16, gain: 0.98, title: "Slow starting applause", author: "stephan (pdsounds.org)", lic: LIC.PD }),
  S({ id: "boo", cat: "crowd", label: "Boo!", hash: "e/e5", file: "Soundgoats_-_Audience_Booing.wav", end: 4.7, gain: 1.78, title: "Audience Booing", author: "Brendon (Soundgoats)", lic: LIC.PD }),
  S({ id: "crickets", cat: "crowd", label: "Crickets", hash: "7/71", file: "Audio_H%C3%B6rbild_Grillenzirpen_-_nachts_um_3_im_F%C3%B6hrenwald_M%C3%B6dling.ogg", start: 0.5, end: 7.0, gain: 5.0, title: "Grillenzirpen, nachts um 3 im Föhrenwald Mödling", author: "DrTrumpet", lic: LIC.BYSA4 }),
  S({ id: "rooster", cat: "crowd", label: "Wake up!", hash: "0/0d", file: "Medium_rooster_crowing.ogg", start: 2.8, end: 6.8, gain: 0.45, title: "Medium rooster crowing", author: "alys (pdsounds.org)", lic: LIC.PD }),

  // Rimshots & stings
  S({ id: "rimshot", cat: "drums", label: "Ba-dum-tss", hash: "0/0c", file: "Kevin_MacLeod_assorted_rimshots_-_Kdum-keesh.wav", end: 2.0, gain: 1.94, title: "Assorted rimshots: Kdum-keesh", author: "Kevin MacLeod (incompetech.com)", lic: LIC.BY3 }),
  S({ id: "ping", cat: "drums", label: "Ba-dum-ping", hash: "b/bf", file: "Kevin_MacLeod_assorted_rimshots_-_D-dum-ping.wav", end: 1.2, gain: 1.38, title: "Assorted rimshots: D-dum-ping", author: "Kevin MacLeod (incompetech.com)", lic: LIC.BY3 }),
  S({ id: "drumroll", cat: "drums", label: "Drumroll", hash: "7/70", file: "Kevin_MacLeod_assorted_rimshots_-_4-second_roll.wav", end: 4.6, gain: 0.97, title: "Assorted rimshots: 4-second roll", author: "Kevin MacLeod (incompetech.com)", lic: LIC.BY3 }),
  S({ id: "crash", cat: "drums", label: "Crash!", hash: "d/df", file: "Kevin_MacLeod_assorted_rimshots_-_Crasher.wav", end: 2.6, gain: 1.09, title: "Assorted rimshots: Crasher", author: "Kevin MacLeod (incompetech.com)", lic: LIC.BY3 }),
  S({ id: "trombone", cat: "drums", label: "Sad trombone", hash: "3/35", file: "Sad_Trombone-Joe_Lamb-665429450.ogg", end: 3.8, gain: 0.45, title: "Sad Trombone", author: "Joe Lamb", lic: LIC.BY3 }),
  S({ id: "dundun", cat: "drums", label: "Dun dun duuun", hash: "8/81", file: "Dun_dun_duuun%21.ogg", end: 4.5, gain: 0.56, title: "Dun dun duuun!", author: "copyc4t", lic: LIC.BY4 }),
  S({ id: "gong", cat: "drums", label: "Gong", hash: "4/42", file: "Gong_or_bell_vibrant_%28short%29.ogg", start: 0.2, end: 5.6, gain: 1.0, title: "Gong or bell vibrant (short)", author: "pdsounds.org", lic: LIC.CC0 }),

  // Emotions
  S({ id: "oohaah", cat: "emotions", label: "Ooh-aah", emoji: "😮", hash: "0/0f", file: "Ohhh_ahhh.ogg", end: 4.5, gain: 5.0, title: "Ohhh Ahhh!", author: "starlite (pdsounds.org)", lic: LIC.PD }),
  S({ id: "hooray", cat: "emotions", label: "Hooray!", emoji: "🙌", hash: "e/e8", file: "Hurray.ogg", start: 0.3, end: 2.9, gain: 1.94, title: "Hurray", author: "starlite (pdsounds.org)", lic: LIC.PD }),
  S({ id: "blower", cat: "emotions", label: "Party blower", emoji: "🥳", hash: "e/e0", file: "Luftr%C3%BCssel.ogg", start: 0.6, end: 2.0, gain: 0.63, title: "Luftrüssel (party blower)", author: "Flo Sorg", lic: LIC.PD }),
  S({ id: "hmm", cat: "emotions", label: "Hmm…", emoji: "🤔", hash: "3/31", file: "Hm_and_sigh.ogg", start: 0.8, end: 1.7, gain: 5.0, title: "Hm and sigh", author: "ezwa (pdsounds.org)", lic: LIC.PD }),
  S({ id: "sigh", cat: "emotions", label: "Sigh", emoji: "😮‍💨", hash: "3/31", file: "Hm_and_sigh.ogg", start: 3.6, end: 7.6, gain: 3.96, title: "Hm and sigh", author: "ezwa (pdsounds.org)", lic: LIC.PD }),
  S({ id: "sob", cat: "emotions", label: "Sob", emoji: "😭", hash: "e/e1", file: "Male_crying_and_weeping.ogg", start: 0.6, end: 4.2, gain: 1.38, title: "Male crying and weeping", author: "jacobmathiassen (freesound.org)", lic: LIC.BY3 }),
  S({ id: "babycry", cat: "emotions", label: "Waaah", emoji: "🍼", hash: "c/cf", file: "Baby_long_wanting_cry.ogg", start: 0.4, end: 5.0, gain: 1.78, title: "Baby long wanting cry", author: "natalie (pdsounds.org)", lic: LIC.PD }),
  S({ id: "snore", cat: "emotions", label: "Snore", emoji: "😴", hash: "a/ae", file: "Zzz.ogg", start: 1.2, end: 5.6, gain: 2.24, title: "Zzz (snoring)", author: "Béotien lambda", lic: LIC.BYSA3 }),
  S({ id: "yawn", cat: "emotions", label: "Yawn", emoji: "🥱", hash: "4/43", file: "Yawning_1.ogg", start: 1.0, end: 4.2, gain: 4.47, title: "Yawning 1", author: "ezwa (pdsounds.org)", lic: LIC.PD }),
  S({ id: "cough", cat: "emotions", label: "Awkward cough", emoji: "😬", hash: "d/d9", file: "Cough_2.ogg", start: 4.4, end: 5.6, gain: 1.12, title: "Cough 2", author: "ezwa (pdsounds.org)", lic: LIC.PD }),
  S({ id: "sneeze", cat: "emotions", label: "Achoo", emoji: "🤧", hash: "d/d0", file: "Sneezing.ogg", start: 0.2, end: 2.9, gain: 1.0, title: "Sneezing", author: "jc (pdsounds.org)", lic: LIC.PD }),
  S({ id: "heartbeat", cat: "emotions", label: "Nervous heartbeat", emoji: "💓", hash: "e/eb", file: "Heart_sound_82bpm.ogg", end: 5.2, rate: 1.3, hp: 30, pre: 2, drive: 4, hp2: 150, gain: 1.25, title: "Heart sound, 82 bpm", author: "TECHNO-INSPECTOR", lic: LIC.BYSA4, note: "sped up 1.3× and saturated so it is audible on phone speakers" }),
  S({ id: "babygiggle", cat: "emotions", label: "Baby giggle", emoji: "🥰", hash: "6/6b", file: "Baby_Laugh.ogg", end: 1.7, gain: 1.78, title: "Baby Laugh", author: "reinsamba (freesound.org)", lic: LIC.BY3 }),

  // Business
  S({ id: "phone", cat: "business", label: "Phone ringing", hash: "e/e7", file: "Model_500_Telephone_British_ring.ogg", start: 0.25, end: 6.0, gain: 0.4, title: "Model 500 Telephone, British ring", author: "CianMcCann", lic: LIC.BYSA3 }),
  S({ id: "typing", cat: "business", label: "Furious typing", hash: "0/0a", file: "Typing_-_Model_M_1986.ogg", end: 5.0, gain: 1.04, title: "Typing, Model M 1986", author: "Raymangold22", lic: LIC.CC0 }),
  S({ id: "typeding", cat: "business", label: "Typewriter ding", hash: "9/9f", file: "406243_stubb_typewriter-ding-near-mono.wav", end: 1.05, gain: 2.88, title: "Typewriter ding", author: "_stubb (freesound.org)", lic: LIC.CC0 }),
  S({ id: "knock", cat: "business", label: "Knock knock", hash: "1/1c", file: "Knocking_on_wood_or_door.ogg", start: 0.3, end: 1.2, gain: 2.16, title: "Knocking on wood or door", author: "stephan (pdsounds.org)", lic: LIC.PD }),
  S({ id: "dialup", cat: "business", label: "Dial-up internet", hash: "8/85", file: "Dial_up_connection_%28short%29.oga", end: 9.5, gain: 0.89, title: "Dial up connection (short)", author: "pdsounds.org", lic: LIC.CC0 }),
  S({ id: "busy", cat: "business", label: "Busy signal", hash: "6/6c", file: "NorthAmericanBusySignal.ogg", end: 4.0, gain: 0.56, title: "North American busy signal", author: "Jamieyu (English Wikipedia)", lic: LIC.PD }),
  S({ id: "openbell", cat: "business", label: "Opening bell", hash: "6/64", file: "Dingdingding.wav", end: 1.74, gain: 5.0, title: "Boxing bell", author: "IOII-IOIO-IIOI", lic: LIC.CC0 }),
  S({ id: "deadline", cat: "business", label: "Deadline", hash: "5/56", file: "Clock_ticking.ogg", end: 5.2, gain: 2.11, title: "Clock, ticking", author: "natalie (pdsounds.org)", lic: LIC.PD }),
  S({ id: "kaching", cat: "business", label: "Ka-ching", hash: "7/70", file: "Cash_register.ogg", start: 0.3, end: 1.9, gain: 0.63, title: "Cash register", author: "Wikimedia Commons contributor", lic: LIC.PD }),
  S({ id: "coins", cat: "business", label: "Budget", hash: "2/2d", file: "Coins_dropped_in_metallic_moneybox.ogg", end: 3.6, gain: 1.9, title: "Coins dropped in metallic moneybox", author: "ezwa (pdsounds.org)", lic: LIC.PD }),
  S({ id: "shredder", cat: "business", label: "Shredder", hash: "e/e4", file: "Shredder_hum.ogg", end: 4.0, gain: 2.24, title: "Shredder hum", author: "stephan (pdsounds.org)", lic: LIC.PD }),
  S({ id: "printer", cat: "business", label: "Dot-matrix printer", hash: "1/17", file: "Star-LC-10-printer-01.ogg", end: 6.0, gain: 0.71, title: "Star LC-10 printer", author: "Priwo", lic: LIC.PD }),
  S({ id: "whip", cat: "business", label: "Crack the whip", hash: "c/c2", file: "Whip-sound.ogg", end: 0.89, gain: 1.34, title: "Whip sound", author: "Mike Koenig", lic: LIC.BY3 }),

  // Cartoon
  S({ id: "boing", cat: "cartoon", label: "Boing", hash: "e/ee", file: "Boing_raw.ogg", end: 2.6, gain: 1.26, title: "Boing raw", author: "cfork (freesound.org)", lic: LIC.BY4 }),
  S({ id: "bonk", cat: "cartoon", label: "Bonk", hash: "4/44", file: "Bongo_Grave.ogg", end: 0.4, rate: 1.0, bend: 0.75, pre: 4, drive: 8, hp2: 100, gain: 0.3, title: "Bongo grave (low bongo)", author: "ZappaMidiPF", lic: LIC.BYSA4, note: "pitch-bent down and saturated for a cartoon bonk" }),
  S({ id: "pan", cat: "cartoon", label: "Frying pan", hash: "8/85", file: "Pots_and_pans_hits_5_%28Gravity_Sound%29.wav", start: 0.15, end: 1.9, gain: 0.95, title: "Pots and pans hits 5", author: "Gravity Sound", lic: LIC.BY4 }),
  S({ id: "squeak", cat: "cartoon", label: "Squeak", hash: "6/6e", file: "Rubber_squeaking.ogg", start: 0.25, end: 3.6, gain: 2.0, title: "Rubber squeaking", author: "stephan (pdsounds.org)", lic: LIC.PD }),
  S({ id: "beep", cat: "cartoon", label: "Beep beep", hash: "8/8c", file: "Car_Horn.wav", start: 0.45, end: 2.3, gain: 1.12, title: "Car Horn", author: "15HPanska_Ruttner_Jan", lic: LIC.CC0 }),
  S({ id: "wolf", cat: "cartoon", label: "Wolf whistle", hash: "a/ab", file: "Wolf_whistle.ogg", start: 1.1, end: 2.2, gain: 0.79, title: "Wolf whistle", author: "Wikimedia Commons contributor", lic: LIC.PD }),
  S({ id: "ref", cat: "cartoon", label: "Foul!", hash: "7/7d", file: "218318_splicesound_referee-whistle-blow-gymnasium.wav", start: 0.05, end: 1.0, gain: 0.63, title: "Referee whistle blow, gymnasium", author: "SpliceSound (freesound.org)", lic: LIC.CC0 }),
  S({ id: "bell", cat: "cartoon", label: "Ding-ding", hash: "c/ce", file: "Rotating-bicycle-bell.wav", end: 1.2, gain: 1.26, title: "Rotating bicycle bell", author: "AntumDeluge", lic: LIC.CC0 }),
];

// Keyboard shortcuts, assigned in board order.
export const KEYS = "1234567890qwertyuiopasdfghjklzxcvbnm".split("");
