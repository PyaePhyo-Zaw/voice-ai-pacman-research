const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const tileSize = 32;

const SETTINGS = {
  pacmanBaseSpeed: 1.4,
  ghostBaseSpeedMultiplier: 0.85,
  pacmanLevelSpeedIncrease: 0.05,
  ghostLevelSpeedIncrease: 0.08,
  frightenedDuration: 600,
  lives: 3,
  maxLevel: 10,
  turnSnapTolerance: 5,
  pacmanCollisionRadius: 10,
  ghostCollisionRadius: 11,
  ghostRespawnDelayFrames: 120,
  ghostRespawnInvincibleFrames: 180,
  ghostSpawnCampDistance: tileSize * 4
};

const VOICE_COMMAND_SELECTION_MODE = "first";
const STORAGE_KEY = "voiceAiPacmanResearchData";
const DEFAULT_RECOGNITION_LANGUAGE = "en-US";
const USE_LANGUAGE_SWITCHING = true;
const MIXED_MODE_LANGUAGES = ["en-US", "ja-JP"];
const MIXED_UNRECOGNIZED_SWITCH_LIMIT = 1;
const MIXED_NO_SPEECH_SWITCH_LIMIT = 2;
const LANGUAGE_SWITCH_COOLDOWN_MS = 1800;
const MAX_RESEARCH_EVENT_LOG = 300;

const stageMaps = [
  [
    "1111111111111111111",
    "1222222221222222221",
    "1211111211212111121",
    "1322221212212122231",
    "1211111211112111121",
    "1222222222222222221",
    "1211211111111211121",
    "1221212222221212221",
    "1111212111121211111",
    "1222222121222222221",
    "1211112121212111121",
    "1322222222222222231",
    "1211211111111211121",
    "1221222222222212221",
    "1111111111111111111"
  ],
  [
    "1111111111111111111",
    "1222222122222122221",
    "1211122121112121111",
    "1322122221212221221",
    "1112121111211121221",
    "1222221222222212221",
    "1211111211111211121",
    "1222222222222222221",
    "1211111212111211121",
    "1222221212221212221",
    "1122121211111212111",
    "1322122222222222231",
    "1212111112111112121",
    "1222222222222222221",
    "1111111111111111111"
  ],
  [
    "1111111111111111111",
    "1222222222222222221",
    "1211111211111211121",
    "1322221212221212231",
    "1211121212111212121",
    "1222122222122222121",
    "1112121112111122121",
    "1222222222222222221",
    "1212111121111212111",
    "1222122222222212221",
    "1212121112111111121",
    "1322221212221212231",
    "1211111211111211121",
    "1222222222222222221",
    "1111111111111111111"
  ],
  [
    "1111111111111111111",
    "1222222122222122221",
    "1211122121212121111",
    "1322122221212221221",
    "1112121111211121221",
    "1222122222222212221",
    "1212111211111211121",
    "1222221222222212221",
    "1211111212111211121",
    "1222221212221212221",
    "1121121211111212111",
    "1322222221222222231",
    "1211111212111211121",
    "1222222222222222221",
    "1111111111111111111"
  ],
  [
    "1111111111111111111",
    "1222222221222222221",
    "1211111211212111121",
    "1322221212222122231",
    "1211121211112121121",
    "1222122222222222121",
    "1112121112111122121",
    "1222222222222222221",
    "1212111121111212111",
    "1222221212221212221",
    "1211121212111211121",
    "1322122222222222231",
    "1212111112111112121",
    "1222222222222222221",
    "1111111111111111111"
  ]
];

// Stage maps change every two levels and remain fixed for fair research trials.
function getStageIndex(levelNumber) {
  const safeLevel = Math.min(Math.max(Number(levelNumber) || 1, 1), SETTINGS.maxLevel);
  return Math.min(Math.floor((safeLevel - 1) / 2), stageMaps.length - 1);
}

function getCurrentMap() {
  return stageMaps[getStageIndex(level)];
}

const DIRECTIONS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

const COMMAND_TO_DIRECTION = {
  UP: "up",
  DOWN: "down",
  LEFT: "left",
  RIGHT: "right"
};

const ui = {
  score: document.getElementById("score"),
  level: document.getElementById("level"),
  lives: document.getElementById("lives"),
  highScore: document.getElementById("highScore"),
  bestLevel: document.getElementById("bestLevel"),
  ghostStatus: document.getElementById("ghostStatus"),
  voiceButton: document.getElementById("voiceButton"),
  voiceStatus: document.getElementById("voiceStatus"),
  voiceModeLine: document.getElementById("voiceModeLine"),
  voiceDebug: document.getElementById("voiceDebug"),
  heard: document.getElementById("heard"),
  command: document.getElementById("command"),
  totalCommands: document.getElementById("totalCommands"),
  successfulCommands: document.getElementById("successfulCommands"),
  failedCommands: document.getElementById("failedCommands"),
  englishCommands: document.getElementById("englishCommands"),
  japaneseCommands: document.getElementById("japaneseCommands"),
  katakanaCommands: document.getElementById("katakanaCommands"),
  mixedCommands: document.getElementById("mixedCommands"),
  recognitionMode: document.getElementById("recognitionMode"),
  transcriptMode: document.getElementById("transcriptMode"),
  englishRecognitionAttempts: document.getElementById("englishRecognitionAttempts"),
  japaneseRecognitionAttempts: document.getElementById("japaneseRecognitionAttempts"),
  languageSwitchCount: document.getElementById("languageSwitchCount"),
  successfulAfterLanguageSwitch: document.getElementById("successfulAfterLanguageSwitch"),
  avgResponseTime: document.getElementById("avgResponseTime"),
  successRate: document.getElementById("successRate"),
  unlockedLevel: document.getElementById("unlockedLevel"),
  highestLevelReached: document.getElementById("highestLevelReached"),
  completedLevelCount: document.getElementById("completedLevelCount"),
  survivalTime: document.getElementById("survivalTime"),
  lastTranscript: document.getElementById("lastTranscript"),
  lastDetectedCommand: document.getElementById("lastDetectedCommand"),
  fullscreenButton: document.getElementById("fullscreenButton"),
  resetDataButton: document.getElementById("resetDataButton"),
  levelOverlay: document.getElementById("levelOverlay"),
  levelOverlayEyebrow: document.getElementById("levelOverlayEyebrow"),
  levelOverlayTitle: document.getElementById("levelOverlayTitle"),
  levelOverlayMessage: document.getElementById("levelOverlayMessage"),
  continueLevelButton: document.getElementById("continueLevelButton"),
  chooseLevelButton: document.getElementById("chooseLevelButton"),
  backToStartButton: document.getElementById("backToStartButton"),
  levelSelectGrid: document.getElementById("levelSelectGrid")
};

canvas.width = stageMaps[0][0].length * tileSize;
canvas.height = stageMaps[0].length * tileSize;

let pellets = [];
let powerPellets = [];
let effects = [];
let score = 0;
let level = 1;
let lives = SETTINGS.lives;
let frightenedTimer = 0;
let gameState = "start";
let countdownText = "";
let countdownTimers = [];
let voiceRecognition = null;
let voiceShouldRun = false;
let isVoiceListening = false;
let microphonePermissionGranted = false;
let microphonePermissionRequest = null;
let micPermissionState = "unknown";
let recognitionState = "idle";
let currentRecognitionLanguage = DEFAULT_RECOGNITION_LANGUAGE;
let lastTranscriptLanguageMode = "";
let mixedModeLanguageIndex = 0;
let mixedModeUnrecognizedStreak = 0;
let noSpeechStreak = 0;
let pendingLanguageSwitch = false;
let languageSwitchInProgress = false;
let recognitionStartInProgress = false;
let lastLanguageSwitchTime = 0;
let awaitingCommandAfterLanguageSwitch = false;
let voiceModeMessage = "";
let ghostStatusUpdateCounter = 0;
let lastGhostDebugLogTime = 0;
let movementDebugCounter = 0;
let pendingNextLevel = null;
let stageIntroTitle = "";
let stageIntroSubtitle = "";

const pacman = {
  x: tileSize * 1.5,
  y: tileSize * 1.5,
  radius: 12,
  direction: "right",
  nextDirection: "right",
  speed: SETTINGS.pacmanBaseSpeed,
  mouth: 0
};

const ghosts = [
  {
    name: "Blinky",
    homeX: tileSize * 17.5,
    homeY: tileSize * 13.5,
    x: tileSize * 17.5,
    y: tileSize * 13.5,
    radius: 13,
    color: "#ff3d4e",
    speedFactor: 1.04,
    speed: 1,
    direction: "left",
    startDirection: "left",
    activeFromLevel: 1
  },
  {
    name: "Pinky",
    homeX: tileSize * 9.5,
    homeY: tileSize * 7.5,
    x: tileSize * 9.5,
    y: tileSize * 7.5,
    radius: 13,
    color: "#ff78d6",
    speedFactor: 0.96,
    speed: 1,
    direction: "left",
    startDirection: "left",
    activeFromLevel: 1
  },
  {
    name: "Inky",
    homeX: tileSize * 9.5,
    homeY: tileSize * 7.5,
    x: tileSize * 9.5,
    y: tileSize * 7.5,
    radius: 13,
    color: "#45dcff",
    speedFactor: 0.92,
    speed: 1,
    direction: "right",
    startDirection: "right",
    activeFromLevel: 3
  },
  {
    name: "Clyde",
    homeX: tileSize * 9.5,
    homeY: tileSize * 7.5,
    x: tileSize * 9.5,
    y: tileSize * 7.5,
    radius: 13,
    color: "#ff9d3b",
    speedFactor: 0.88,
    speed: 1,
    direction: "up",
    startDirection: "up",
    activeFromLevel: 5
  }
];

const safeGhostSpawnPoints = [
  { name: "Center", x: tileSize * 9.5, y: tileSize * 7.5 },
  { name: "Upper-left", x: tileSize * 1.5, y: tileSize * 1.5 },
  { name: "Upper-right", x: tileSize * 17.5, y: tileSize * 1.5 },
  { name: "Lower-left", x: tileSize * 1.5, y: tileSize * 13.5 },
  { name: "Lower-right", x: tileSize * 17.5, y: tileSize * 13.5 }
];

const levelThemes = [
  {
    maxLevel: 2,
    name: "Blue Neon",
    background: "#000006",
    wallFill: "rgba(6, 13, 44, 0.92)",
    wallStroke: "#156bff",
    wallInner: "rgba(102, 230, 255, 0.95)",
    glow: "#00e5ff",
    atmosphere: "rgba(0, 229, 255, 0.08)"
  },
  {
    maxLevel: 4,
    name: "Pink Cyber",
    background: "#08000f",
    wallFill: "rgba(27, 8, 52, 0.92)",
    wallStroke: "#8b5cff",
    wallInner: "rgba(255, 79, 216, 0.86)",
    glow: "#ff4fd8",
    atmosphere: "rgba(139, 92, 255, 0.1)"
  },
  {
    maxLevel: 6,
    name: "Green Matrix",
    background: "#000b07",
    wallFill: "rgba(0, 28, 17, 0.92)",
    wallStroke: "#0bd66f",
    wallInner: "rgba(153, 255, 196, 0.92)",
    glow: "#45ff9a",
    atmosphere: "rgba(69, 255, 154, 0.09)"
  },
  {
    maxLevel: 8,
    name: "Red Danger",
    background: "#120003",
    wallFill: "rgba(48, 4, 14, 0.92)",
    wallStroke: "#ff3d4e",
    wallInner: "rgba(255, 157, 59, 0.88)",
    glow: "#ff3d4e",
    atmosphere: "rgba(255, 61, 78, 0.1)"
  },
  {
    maxLevel: 10,
    name: "Gold Final",
    background: "#100d00",
    wallFill: "rgba(42, 33, 5, 0.92)",
    wallStroke: "#ffe84a",
    wallInner: "rgba(255, 157, 59, 0.9)",
    glow: "#ffe84a",
    atmosphere: "rgba(255, 232, 74, 0.1)"
  }
];

const defaultResearchData = {
  totalVoiceCommands: 0,
  successfulCommands: 0,
  failedCommands: 0,
  englishCommandCount: 0,
  japaneseCommandCount: 0,
  katakanaCommandCount: 0,
  mixedCommandCount: 0,
  unrecognizedCommandCount: 0,
  totalResponseTimeMs: 0,
  averageCommandResponseTimeMs: 0,
  lastTranscript: "",
  lastDetectedCommand: "",
  lastSourceType: "",
  lastNormalizedText: "",
  currentRecognitionMode: "mixed-cycle",
  lastTranscriptLanguageMode: "",
  lastRecognitionLanguage: "",
  lastCommandRecognized: false,
  lastLanguageSwitchTriggered: false,
  lastResponseTimeMs: 0,
  englishRecognitionAttempts: 0,
  japaneseRecognitionAttempts: 0,
  languageSwitchCount: 0,
  successfulAfterLanguageSwitch: 0,
  voiceCommandEvents: [],
  highScore: 0,
  bestLevel: 1,
  unlockedLevel: 1,
  sessionStartTime: 0,
  sessionEndTime: 0,
  survivalTimeMs: 0,
  highestLevelReached: 1,
  completedLevelCount: 0,
  gameCompleted: false,
  levelAttempts: {},
  levelClears: {}
};

let researchData = loadResearchData();

const SOURCE_TYPE_LABELS = {
  english: "English",
  japanese: "Japanese",
  katakana: "Katakana pronunciation",
  mixed: "Mixed",
  unrecognized: "Unrecognized"
};

function createDefaultResearchData() {
  return {
    ...defaultResearchData,
    levelAttempts: {},
    levelClears: {},
    voiceCommandEvents: []
  };
}

const pronunciationReplacements = [
  { pattern: /リ\s*ス\s*タ\s*ー\s*ト|り\s*す\s*た\s*ー\s*と/g, replacement: " restart ", command: "RESTART" },
  { pattern: /ス\s*タ\s*ー\s*ト|す\s*た\s*ー\s*と/g, replacement: " start ", command: "START" },
  { pattern: /ポ\s*ー\s*ズ|ぽ\s*ー\s*ず/g, replacement: " pause ", command: "PAUSE" },
  { pattern: /フ\s*ラ\s*イ\s*ト|ふ\s*ら\s*い\s*と|ブ\s*ラ\s*イ\s*ト|ぶ\s*ら\s*い\s*と|ラ\s*イ\s*ト|ら\s*い\s*と/g, replacement: " right ", command: "RIGHT" },
  { pattern: /レ\s*フ\s*ト|れ\s*ふ\s*と|リ\s*フ\s*ト|り\s*ふ\s*と|ラ\s*フ\s*ト|ら\s*ふ\s*と/g, replacement: " left ", command: "LEFT" },
  { pattern: /ア\s*ッ\s*プ|あ\s*っ\s*ぷ|ア\s*プ|あ\s*ぷ/g, replacement: " up ", command: "UP" },
  { pattern: /ダ\s*ウ\s*ン|だ\s*う\s*ん/g, replacement: " down ", command: "DOWN" }
];

const voicePatterns = [
  {
    command: "CHOOSE_LEVEL",
    patterns: [/\bchoose\s+level\b/g, /\blevel\s+select\b/g, /\bselect\s+level\b/g, /レベル選択/g]
  },
  {
    command: "CONTINUE",
    patterns: [/\bcontinue\b/g, /\bnext\b/g, /\bgo\s+next\b/g, /続ける/g, /次/g]
  },
  {
    command: "BACK",
    patterns: [/\bback\b/g, /\bback\s+to\s+start\b/g, /\breturn\b/g, /戻る/g]
  },
  {
    command: "LEVEL_10",
    patterns: [/\blevel\s*(?:ten|10)\b/g, /レベル\s*10/g]
  },
  {
    command: "LEVEL_9",
    patterns: [/\blevel\s*(?:nine|9)\b/g, /レベル\s*9(?!\d)/g]
  },
  {
    command: "LEVEL_8",
    patterns: [/\blevel\s*(?:eight|8)\b/g, /レベル\s*8(?!\d)/g]
  },
  {
    command: "LEVEL_7",
    patterns: [/\blevel\s*(?:seven|7)\b/g, /レベル\s*7(?!\d)/g]
  },
  {
    command: "LEVEL_6",
    patterns: [/\blevel\s*(?:six|6)\b/g, /レベル\s*6(?!\d)/g]
  },
  {
    command: "LEVEL_5",
    patterns: [/\blevel\s*(?:five|5)\b/g, /レベル\s*5(?!\d)/g]
  },
  {
    command: "LEVEL_4",
    patterns: [/\blevel\s*(?:four|4)\b/g, /レベル\s*4(?!\d)/g]
  },
  {
    command: "LEVEL_3",
    patterns: [/\blevel\s*(?:three|3)\b/g, /レベル\s*3(?!\d)/g]
  },
  {
    command: "LEVEL_2",
    patterns: [/\blevel\s*(?:two|2)\b/g, /レベル\s*2(?!\d)/g]
  },
  {
    command: "LEVEL_1",
    patterns: [/\blevel\s*(?:one|1)\b/g, /レベル\s*1(?!\d)/g]
  },
  {
    command: "RESTART",
    patterns: [/\brestart\b/g, /\btry\s+again\b/g, /\bretry\b/g, /もう一回/g, /もう一度/g, /やり直し/g]
  },
  {
    command: "PAUSE",
    patterns: [/\bpause\b/g, /\bstop\s+temporarily\b/g, /\bhold\b/g, /一時停止/g, /止まって/g, /待って/g]
  },
  {
    command: "START",
    patterns: [/\bstart\b/g, /\bbegin\b/g, /\bplay\b/g, /\bresume\b/g, /開始/g, /始めて/g, /始める/g, /再開/g]
  },
  {
    command: "UP",
    patterns: [
      /\b(?:go|move|turn)\s*\u3046\u3048/g,
      /\u3046\u3048\u306b\u884c\u3063\u3066/g,
      /\u3046\u3048\u3078/g,
      /(?:^|[\s、。])\u3046\u3048(?:$|[\s、。])/g
    ]
  },
  {
    command: "DOWN",
    patterns: [
      /\b(?:go|move|turn)\s*\u3057\u305f/g,
      /\u3057\u305f\u306b\u884c\u3063\u3066/g,
      /\u3057\u305f\u3078/g,
      /(?:^|[\s、。])\u3057\u305f(?:$|[\s、。])/g
    ]
  },
  {
    command: "LEFT",
    patterns: [
      /\b(?:go|move|turn)\s*\u3072\u3060\u308a/g,
      /\u3072\u3060\u308a\u306b\u884c\u3063\u3066/g,
      /\u3072\u3060\u308a\u306b\u66f2\u304c\u3063\u3066/g,
      /\u3072\u3060\u308a\u3078/g,
      /(?:^|[\s、。])\u3072\u3060\u308a(?:$|[\s、。])/g
    ]
  },
  {
    command: "RIGHT",
    patterns: [
      /\b(?:go|move|turn)\s*\u307f\u304e/g,
      /\u307f\u304e\u306b\u884c\u3063\u3066/g,
      /\u307f\u304e\u306b\u66f2\u304c\u3063\u3066/g,
      /\u307f\u304e\u3078/g,
      /(?:^|[\s、。])\u307f\u304e(?:$|[\s、。])/g
    ]
  },
  {
    command: "UP",
    patterns: [/\b(?:go|move|turn)\s+(?:to\s+)?(?:the\s+)?(?:up|app)\b/g, /\b(?:go|move|turn)\s*(?:up|app)\b/g, /\b(?:up|app)\s*に\s*行って/g, /\b(?:up|app)\b/g, /\b(?:go|move|turn)\s*上/g, /上に行って/g, /上行って/g, /上へ/g, /上に/g, /上/g]
  },
  {
    command: "DOWN",
    patterns: [/\b(?:go|move|turn)\s+(?:to\s+)?(?:the\s+)?down\b/g, /\b(?:go|move|turn)\s*down\b/g, /\bdown\s*に\s*行って/g, /\bdown\b/g, /\b(?:go|move|turn)\s*下/g, /下に行って/g, /下行って/g, /下へ/g, /下に/g, /下/g]
  },
  {
    command: "LEFT",
    patterns: [/\b(?:go|move|turn)\s+(?:to\s+)?(?:the\s+)?left\b/g, /\b(?:go|move|turn)\s*left\b/g, /\bleft\s*に\s*行って/g, /\bleft\s*に\s*曲がって/g, /\bleft\b/g, /\b(?:go|move|turn)\s*左/g, /左に曲がって/g, /左に行って/g, /左行って/g, /左へ/g, /左に/g, /左/g]
  },
  {
    command: "RIGHT",
    patterns: [/\b(?:go|move|turn)\s+(?:to\s+)?(?:the\s+)?(?:right|light|write)\b/g, /\b(?:go|move|turn)\s*(?:right|light|write)\b/g, /\b(?:right|light|write)\s*に\s*行って/g, /\b(?:right|light|write)\s*に\s*曲がって/g, /\b(?:right|light|write)\b/g, /\b(?:go|move|turn)\s*右/g, /右に曲がって/g, /右に行って/g, /右行って/g, /右へ/g, /右に/g, /右/g]
  }
];

function loadResearchData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createDefaultResearchData();

    const parsed = JSON.parse(saved);
    const merged = {
      ...createDefaultResearchData(),
      ...parsed,
      levelAttempts: { ...(parsed.levelAttempts || {}) },
      levelClears: { ...(parsed.levelClears || {}) },
      voiceCommandEvents: Array.isArray(parsed.voiceCommandEvents)
        ? parsed.voiceCommandEvents
        : []
    };

    if (parsed.unrecognizedCommandCount === undefined) {
      merged.unrecognizedCommandCount = merged.failedCommands;
    }

    merged.unlockedLevel = Math.min(Math.max(Number(merged.unlockedLevel) || 1, 1), SETTINGS.maxLevel);
    merged.highestLevelReached = Math.min(
      Math.max(Number(merged.highestLevelReached) || Number(merged.bestLevel) || 1, 1),
      SETTINGS.maxLevel
    );

    return merged;
  } catch (error) {
    console.warn("Research data could not be loaded.", error);
    return createDefaultResearchData();
  }
}

function saveResearchData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(researchData));
  } catch (error) {
    console.warn("Research data could not be saved.", error);
  }
}

function getUnlockedLevel() {
  return Math.min(Math.max(Number(researchData.unlockedLevel) || 1, 1), SETTINGS.maxLevel);
}

function unlockLevel(levelNumber) {
  const nextUnlockedLevel = Math.min(Math.max(levelNumber, 1), SETTINGS.maxLevel);

  if (nextUnlockedLevel > getUnlockedLevel()) {
    researchData.unlockedLevel = nextUnlockedLevel;
    saveResearchData();
  }
}

function updateHighestLevelReached(levelNumber) {
  const reachedLevel = Math.min(Math.max(levelNumber, 1), SETTINGS.maxLevel);

  if (reachedLevel > researchData.highestLevelReached) {
    researchData.highestLevelReached = reachedLevel;
    saveResearchData();
  }
}

function recordLevelAttempt(levelNumber) {
  const key = String(levelNumber);
  researchData.levelAttempts[key] = (researchData.levelAttempts[key] || 0) + 1;
  updateHighestLevelReached(levelNumber);
  saveResearchData();
}

function recordLevelClear(levelNumber) {
  const key = String(levelNumber);
  researchData.levelClears[key] = (researchData.levelClears[key] || 0) + 1;
  researchData.completedLevelCount++;
  saveResearchData();
}

function startResearchSession(startLevel) {
  const now = Date.now();
  researchData.sessionStartTime = now;
  researchData.sessionEndTime = 0;
  researchData.survivalTimeMs = 0;
  researchData.gameCompleted = false;
  researchData.currentRecognitionMode = getRecognitionModeForResearch();
  recordLevelAttempt(startLevel);
}

function finishResearchSession(gameCompleted) {
  const now = Date.now();
  const startTime = researchData.sessionStartTime || now;

  researchData.sessionEndTime = now;
  researchData.survivalTimeMs = Math.max(0, now - startTime);
  researchData.gameCompleted = Boolean(gameCompleted);
  saveResearchData();
}

function getCommandSuccessRate() {
  if (researchData.totalVoiceCommands === 0) return 0;
  return Math.round((researchData.successfulCommands / researchData.totalVoiceCommands) * 100);
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.round((milliseconds || 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function updateResearchBestStats() {
  let changed = false;

  if (score > researchData.highScore) {
    researchData.highScore = score;
    changed = true;
  }

  if (level > researchData.bestLevel) {
    researchData.bestLevel = level;
    changed = true;
  }

  if (level > researchData.highestLevelReached) {
    researchData.highestLevelReached = level;
    changed = true;
  }

  if (changed) saveResearchData();
}

function recordVoiceCommand(transcript, analysis, responseTimeMs, transcriptLanguageMode, languageSwitchTriggered = false) {
  const command = analysis.command;
  const sourceType = analysis.sourceType || "unrecognized";
  const recognitionLanguage = transcriptLanguageMode || currentRecognitionLanguage;
  const commandRecognized = Boolean(command);

  researchData.totalVoiceCommands++;
  researchData.lastTranscript = transcript;
  researchData.lastDetectedCommand = command || "UNRECOGNIZED";
  researchData.lastSourceType = sourceType;
  researchData.lastNormalizedText = analysis.normalizedText || "";
  researchData.currentRecognitionMode = getRecognitionModeForResearch();
  lastTranscriptLanguageMode = recognitionLanguage;
  researchData.lastTranscriptLanguageMode = lastTranscriptLanguageMode;
  researchData.lastRecognitionLanguage = recognitionLanguage;
  researchData.lastCommandRecognized = commandRecognized;
  researchData.lastLanguageSwitchTriggered = Boolean(languageSwitchTriggered);
  researchData.lastResponseTimeMs = responseTimeMs;

  if (recognitionLanguage === "en-US") researchData.englishRecognitionAttempts++;
  if (recognitionLanguage === "ja-JP") researchData.japaneseRecognitionAttempts++;

  if (command) {
    researchData.successfulCommands++;
    researchData.totalResponseTimeMs += responseTimeMs;
    researchData.averageCommandResponseTimeMs =
      researchData.totalResponseTimeMs / researchData.successfulCommands;

    if (awaitingCommandAfterLanguageSwitch) {
      researchData.successfulAfterLanguageSwitch++;
      awaitingCommandAfterLanguageSwitch = false;
    }

    if (sourceType === "english") researchData.englishCommandCount++;
    if (sourceType === "japanese") researchData.japaneseCommandCount++;
    if (sourceType === "katakana") researchData.katakanaCommandCount++;
    if (sourceType === "mixed") researchData.mixedCommandCount++;
  } else {
    researchData.failedCommands++;
    researchData.unrecognizedCommandCount++;
  }

  researchData.voiceCommandEvents.push({
    timestamp: new Date().toISOString(),
    transcript,
    detectedCommand: command || "UNRECOGNIZED",
    sourceType,
    recognitionLanguage,
    recognized: commandRecognized,
    languageSwitchTriggered: Boolean(languageSwitchTriggered),
    responseTimeMs: Math.round(responseTimeMs)
  });

  if (researchData.voiceCommandEvents.length > MAX_RESEARCH_EVENT_LOG) {
    researchData.voiceCommandEvents = researchData.voiceCommandEvents.slice(-MAX_RESEARCH_EVENT_LOG);
  }

  saveResearchData();
  updateResearchPanel();

  // Firebase, Supabase, or a university backend database can be added here later.
  console.table({
    totalVoiceCommands: researchData.totalVoiceCommands,
    successfulCommands: researchData.successfulCommands,
    failedCommands: researchData.failedCommands,
    unrecognizedCommandCount: researchData.unrecognizedCommandCount,
    successRate: `${getCommandSuccessRate()}%`,
    englishCommandCount: researchData.englishCommandCount,
    japaneseCommandCount: researchData.japaneseCommandCount,
    katakanaCommandCount: researchData.katakanaCommandCount,
    mixedCommandCount: researchData.mixedCommandCount,
    englishRecognitionAttempts: researchData.englishRecognitionAttempts,
    japaneseRecognitionAttempts: researchData.japaneseRecognitionAttempts,
    languageSwitchCount: researchData.languageSwitchCount,
    successfulAfterLanguageSwitch: researchData.successfulAfterLanguageSwitch,
    lastRecognitionLanguage: researchData.lastRecognitionLanguage,
    lastLanguageSwitchTriggered: researchData.lastLanguageSwitchTriggered,
    unlockedLevel: researchData.unlockedLevel,
    highestLevelReached: researchData.highestLevelReached,
    completedLevelCount: researchData.completedLevelCount,
    gameCompleted: researchData.gameCompleted,
    lastTranscript: researchData.lastTranscript,
    lastDetectedCommand: researchData.lastDetectedCommand,
    lastSourceType: SOURCE_TYPE_LABELS[sourceType],
    lastNormalizedText: researchData.lastNormalizedText,
    currentRecognitionMode: researchData.currentRecognitionMode,
    lastTranscriptLanguageMode: researchData.lastTranscriptLanguageMode,
    averageCommandResponseTimeMs: Math.round(researchData.averageCommandResponseTimeMs)
  });
}

function updateResearchPanel() {
  ui.totalCommands.textContent = researchData.totalVoiceCommands;
  ui.successfulCommands.textContent = researchData.successfulCommands;
  ui.failedCommands.textContent = researchData.unrecognizedCommandCount;
  ui.successRate.textContent = `${getCommandSuccessRate()}%`;
  ui.englishCommands.textContent = researchData.englishCommandCount;
  ui.japaneseCommands.textContent = researchData.japaneseCommandCount;
  ui.katakanaCommands.textContent = researchData.katakanaCommandCount;
  ui.mixedCommands.textContent = researchData.mixedCommandCount;
  ui.unlockedLevel.textContent = getUnlockedLevel();
  ui.highestLevelReached.textContent = researchData.highestLevelReached;
  ui.completedLevelCount.textContent = researchData.completedLevelCount;
  ui.survivalTime.textContent = formatDuration(researchData.survivalTimeMs);
  ui.recognitionMode.textContent = researchData.currentRecognitionMode || getRecognitionModeForResearch();
  ui.transcriptMode.textContent = researchData.lastTranscriptLanguageMode || lastTranscriptLanguageMode || "...";
  ui.englishRecognitionAttempts.textContent = researchData.englishRecognitionAttempts;
  ui.japaneseRecognitionAttempts.textContent = researchData.japaneseRecognitionAttempts;
  ui.languageSwitchCount.textContent = researchData.languageSwitchCount;
  ui.successfulAfterLanguageSwitch.textContent = researchData.successfulAfterLanguageSwitch;
  ui.avgResponseTime.textContent = `${Math.round(researchData.averageCommandResponseTimeMs)} ms`;
  ui.lastTranscript.textContent = researchData.lastTranscript || "...";
  ui.lastDetectedCommand.textContent = researchData.lastDetectedCommand
    ? `${researchData.lastDetectedCommand} / ${SOURCE_TYPE_LABELS[researchData.lastSourceType] || "Unknown"}`
    : "...";
  ui.highScore.textContent = researchData.highScore;
  ui.bestLevel.textContent = researchData.bestLevel;
}

function resetResearchData() {
  researchData = {
    ...createDefaultResearchData(),
    currentRecognitionMode: getRecognitionModeForResearch()
  };

  saveResearchData();
  updateResearchPanel();

  ui.heard.textContent = "...";
  ui.command.textContent = "...";
  ui.lastTranscript.textContent = "...";
  ui.lastDetectedCommand.textContent = "...";

  if (gameState === "levelselect") renderLevelSelect();
}

function normalizeVoiceText(text) {
  return String(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[。、，,．.！!？?；;：:「」『』"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePronunciationText(text) {
  let normalizedText = normalizeVoiceText(text);

  for (const replacement of pronunciationReplacements) {
    normalizedText = normalizedText.replace(replacement.pattern, replacement.replacement);
  }

  return normalizedText.replace(/\s+/g, " ").trim();
}

function detectSourceType(originalText, normalizedText, command) {
  if (!command) return "unrecognized";

  const baseText = normalizeVoiceText(originalText);
  const hasEnglishCommand = /\b(right|light|write|left|up|app|down|start|play|begin|resume|pause|hold|restart|retry|go|move|turn|continue|next|back|return|choose|select|level|one|two|three|four|five|six|seven|eight|nine|ten)\b|\btry\s+again\b|\bstop\s+temporarily\b/.test(baseText);
  const hasKatakanaCommand = pronunciationReplacements.some(replacement => {
    replacement.pattern.lastIndex = 0;
    return replacement.pattern.test(baseText);
  });
  const hasJapaneseCommand = /右|左|上|下|開始|始めて|始める|再開|一時停止|止まって|待って|もう一回|もう一度|やり直し|続ける|次|戻る|レベル選択|レベル/.test(baseText);
  const hasJapaneseGrammar = /に|へ|行って|曲がって/.test(baseText);

  const hasHiraganaDirection = /\u307f\u304e|\u3072\u3060\u308a|\u3046\u3048|\u3057\u305f/.test(baseText);

  pronunciationReplacements.forEach(replacement => {
    replacement.pattern.lastIndex = 0;
  });

  if (hasEnglishCommand && (hasJapaneseCommand || hasHiraganaDirection || hasJapaneseGrammar || hasKatakanaCommand)) {
    return "mixed";
  }

  if (hasKatakanaCommand) return "katakana";
  if (hasHiraganaDirection) return "japanese";
  if (hasJapaneseCommand || /右|左|上|下/.test(normalizedText)) return "japanese";
  if (hasEnglishCommand) return "english";

  return "unrecognized";
}

function addVoicePatternMatches(normalizedText, command, pattern, matches) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  let match = regex.exec(normalizedText);

  while (match) {
    matches.push({
      command,
      index: match.index,
      length: match[0].length
    });

    if (match.index === regex.lastIndex) regex.lastIndex++;
    match = regex.exec(normalizedText);
  }
}

function analyzeVoiceCommand(text) {
  const normalizedText = normalizePronunciationText(text);
  const matches = [];

  for (const group of voicePatterns) {
    for (const pattern of group.patterns) {
      addVoicePatternMatches(normalizedText, group.command, pattern, matches);
    }
  }

  if (matches.length === 0) {
    return {
      command: null,
      sourceType: "unrecognized",
      normalizedText
    };
  }

  matches.sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index;
    return a.length - b.length;
  });

  // Normal gameplay uses the first clear command in a sentence.
  // A future queue mode can consume later matches, but it is intentionally disabled now.
  const selectedMatch = VOICE_COMMAND_SELECTION_MODE === "last"
    ? matches[matches.length - 1]
    : matches[0];
  const command = selectedMatch.command;

  return {
    command,
    sourceType: detectSourceType(text, normalizedText, command),
    normalizedText
  };
}

function applyWrongLanguageSafety(transcript, analysis, transcriptLanguageMode) {
  const recognitionLanguage = transcriptLanguageMode || currentRecognitionLanguage;
  const baseText = normalizeVoiceText(transcript);

  // English recognition can sometimes turn Japanese speech into unrelated English words.
  // These low-quality transcripts should trigger language cycling, not wrong movement.
  if (recognitionLanguage === "en-US" && /\bhey\s+daddy\b/.test(baseText)) {
    return {
      command: null,
      sourceType: "unrecognized",
      normalizedText: analysis.normalizedText
    };
  }

  return analysis;
}

function parseVoiceCommand(text) {
  return analyzeVoiceCommand(text).command;
}

function setupPellets() {
  pellets = [];
  powerPellets = [];
  const currentMap = getCurrentMap();

  for (let row = 0; row < currentMap.length; row++) {
    for (let col = 0; col < currentMap[row].length; col++) {
      const tile = currentMap[row][col];
      const pellet = {
        x: col * tileSize + tileSize / 2,
        y: row * tileSize + tileSize / 2
      };

      if (tile === "2") pellets.push(pellet);
      if (tile === "3") powerPellets.push(pellet);
    }
  }
}

function getSelectedVoiceMode() {
  return "mixed";
}

function getRecognitionModeForResearch() {
  return getSelectedVoiceMode() === "mixed" ? "mixed-cycle" : getRecognitionLanguage();
}

function getVoiceModeLabel() {
  if (getSelectedVoiceMode() === "mixed") return "Experimental Mixed Mode";
  if (getSelectedVoiceMode() === "ja-JP") return "Japanese / Katakana Mode";
  return "English Mode";
}

function getRecognitionLanguageLabel(language) {
  return language === "ja-JP" ? "Japanese / Katakana" : "English";
}

function getNextMixedRecognitionLanguage() {
  return MIXED_MODE_LANGUAGES[(mixedModeLanguageIndex + 1) % MIXED_MODE_LANGUAGES.length];
}

function getRecognitionLanguage() {
  if (getSelectedVoiceMode() === "mixed") {
    if (!USE_LANGUAGE_SWITCHING) return DEFAULT_RECOGNITION_LANGUAGE;
    return MIXED_MODE_LANGUAGES[mixedModeLanguageIndex];
  }

  return getSelectedVoiceMode();
}

function resetMixedModeState() {
  mixedModeLanguageIndex = 0;
  mixedModeUnrecognizedStreak = 0;
  noSpeechStreak = 0;
  currentRecognitionLanguage = getRecognitionLanguage();
  pendingLanguageSwitch = false;
  languageSwitchInProgress = false;
  awaitingCommandAfterLanguageSwitch = false;
  voiceModeMessage = "";
  researchData.currentRecognitionMode = getRecognitionModeForResearch();
  saveResearchData();
  updateResearchPanel();
}

function applyMixedRecognitionLanguageSwitch() {
  mixedModeLanguageIndex = (mixedModeLanguageIndex + 1) % MIXED_MODE_LANGUAGES.length;
  mixedModeUnrecognizedStreak = 0;
  noSpeechStreak = 0;
  currentRecognitionLanguage = getRecognitionLanguage();
  lastLanguageSwitchTime = Date.now();
  awaitingCommandAfterLanguageSwitch = true;
  researchData.languageSwitchCount++;
  voiceRecognition = null;
}

function requestRecognitionLanguageSwitch() {
  if (getSelectedVoiceMode() !== "mixed") return false;
  if (!USE_LANGUAGE_SWITCHING) return false;
  if (!voiceShouldRun) return false;
  if (languageSwitchInProgress) return false;

  const now = Date.now();
  if (now - lastLanguageSwitchTime < LANGUAGE_SWITCH_COOLDOWN_MS) return false;

  // Language switching restarts SpeechRecognition only after repeated misses.
  // It never requests microphone permission again.
  languageSwitchInProgress = true;
  pendingLanguageSwitch = true;
  voiceModeMessage = `Trying ${getRecognitionLanguageLabel(getNextMixedRecognitionLanguage())} recognition...`;
  updateVoiceModeLine();

  if (voiceRecognition && (isVoiceListening || recognitionStartInProgress)) {
    try {
      voiceRecognition.stop();
    } catch (error) {
      try {
        voiceRecognition.abort();
      } catch (abortError) {
        languageSwitchInProgress = false;
        pendingLanguageSwitch = false;
        voiceModeMessage = "";
        updateVoiceModeLine();
        return false;
      }
    }
  } else {
    applyMixedRecognitionLanguageSwitch();
    languageSwitchInProgress = false;
    pendingLanguageSwitch = false;
    saveResearchData();
    updateResearchPanel();
    if (voiceShouldRun) startVoiceRecognition();
  }

  return true;
}

function switchMixedRecognitionLanguage() {
  return requestRecognitionLanguageSwitch();
}

function updateMixedModeAfterTranscript(analysis) {
  if (getSelectedVoiceMode() !== "mixed") return false;

  if (analysis.command) {
    mixedModeUnrecognizedStreak = 0;
    noSpeechStreak = 0;
    return false;
  }

  if (!USE_LANGUAGE_SWITCHING) return false;

  mixedModeUnrecognizedStreak++;

  if (mixedModeUnrecognizedStreak >= MIXED_UNRECOGNIZED_SWITCH_LIMIT) {
    return requestRecognitionLanguageSwitch();
  }

  return false;
}

async function ensureMicrophonePermission() {
  if (microphonePermissionGranted) return true;
  if (microphonePermissionRequest) return microphonePermissionRequest;

  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    micPermissionState = "blocked";
    return false;
  }

  microphonePermissionRequest = navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      microphonePermissionGranted = true;
      micPermissionState = "granted";
      stream.getTracks().forEach(track => track.stop());
      console.log("Mic permission granted");
      return true;
    })
    .catch(() => {
      microphonePermissionGranted = false;
      micPermissionState = "blocked";
      return false;
    });

  const permissionAllowed = await microphonePermissionRequest;
  microphonePermissionRequest = null;
  return permissionAllowed;
}

function createVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  console.log("SpeechRecognition supported:", Boolean(SpeechRecognition));

  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  currentRecognitionLanguage = USE_LANGUAGE_SWITCHING ? getRecognitionLanguage() : DEFAULT_RECOGNITION_LANGUAGE;
  recognition.lang = currentRecognitionLanguage;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  console.log("Voice recognition created:", recognition.lang);

  recognition.onstart = function() {
    isVoiceListening = true;
    recognitionStartInProgress = false;
    recognitionState = "listening";
    voiceModeMessage = "";
    console.log("Voice started");
    console.log("Recognition started");
    updateVoiceStatus();
  };

  recognition.onresult = handleVoiceRecognitionResult;

  recognition.onerror = function(event) {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      voiceShouldRun = false;
      isVoiceListening = false;
      recognitionStartInProgress = false;
      languageSwitchInProgress = false;
      pendingLanguageSwitch = false;
      voiceModeMessage = "";
      micPermissionState = "blocked";
      recognitionState = "error";
      updateVoiceStatus("Microphone blocked. Please allow microphone access in Chrome site settings.", true);
      return;
    }

    if (event.error === "no-speech") {
      noSpeechStreak++;
      recognitionState = "ended";
      if (noSpeechStreak >= MIXED_NO_SPEECH_SWITCH_LIMIT) {
        requestRecognitionLanguageSwitch();
      }
      updateVoiceStatus();
      return;
    }

    if (event.error === "aborted" && (pendingLanguageSwitch || languageSwitchInProgress)) {
      recognitionState = "ended";
      updateVoiceStatus();
      return;
    }

    recognitionStartInProgress = false;
    recognitionState = "error";
    updateVoiceStatus(`Voice error: ${event.error}`, true);
  };

  recognition.onend = function() {
    isVoiceListening = false;
    recognitionStartInProgress = false;
    recognitionState = "ended";
    console.log("Voice ended");

    if (pendingLanguageSwitch) {
      pendingLanguageSwitch = false;
      applyMixedRecognitionLanguageSwitch();
      languageSwitchInProgress = false;
      saveResearchData();
      updateResearchPanel();
    }

    updateVoiceStatus();

    if (voiceShouldRun) {
      setTimeout(() => {
        if (voiceShouldRun) startVoiceRecognition();
      }, 300);
    }
  };

  return recognition;
}

function startVoiceRecognition() {
  if (!voiceShouldRun) return;
  if (isVoiceListening || recognitionStartInProgress) return;

  if (!voiceRecognition) {
    voiceRecognition = createVoiceRecognition();
  } else {
    currentRecognitionLanguage = USE_LANGUAGE_SWITCHING ? getRecognitionLanguage() : DEFAULT_RECOGNITION_LANGUAGE;
    voiceRecognition.lang = currentRecognitionLanguage;
  }

  if (!voiceRecognition) {
    voiceShouldRun = false;
    recognitionState = "error";
    updateVoiceStatus("Voice: Web Speech API unavailable in this browser.", true);
    return;
  }

  try {
    recognitionState = "starting";
    recognitionStartInProgress = true;
    updateVoiceStatus();
    voiceRecognition.start();
  } catch (error) {
    recognitionStartInProgress = false;
    recognitionState = "error";
    updateVoiceStatus(`Voice: ${error.message || "could not start"}`, true);
  }
}

async function startVoice() {
  if (voiceShouldRun) {
    stopVoice();
    return;
  }

  console.log("START VOICE clicked");
  resetMixedModeState();
  voiceShouldRun = true;
  recognitionState = "starting";
  updateVoiceStatus("Voice: requesting microphone");

  const hasPermission = await ensureMicrophonePermission();
  if (!voiceShouldRun) {
    recognitionState = "idle";
    updateVoiceStatus();
    return;
  }

  if (!hasPermission) {
    voiceShouldRun = false;
    isVoiceListening = false;
    recognitionState = "error";
    updateVoiceStatus("Microphone blocked. Please allow microphone access in Chrome site settings.", true);
    return;
  }

  startVoiceRecognition();
}

function stopVoice() {
  voiceShouldRun = false;
  pendingLanguageSwitch = false;
  languageSwitchInProgress = false;
  recognitionStartInProgress = false;
  voiceModeMessage = "";

  if (voiceRecognition) {
    const recognition = voiceRecognition;
    voiceRecognition = null;

    try {
      recognition.stop();
    } catch (error) {
      recognition.abort();
    }
  }

  isVoiceListening = false;
  recognitionState = "idle";
  updateVoiceStatus();
}

function handleVoiceRecognitionResult(event) {
  console.log("Recognition result event", event);

  let interimTranscript = "";

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const transcript = String(event.results[i][0].transcript).trim();
    if (!transcript) continue;

    if (event.results[i].isFinal) {
      console.log("Transcript:", transcript);
      handleTranscript(transcript, currentRecognitionLanguage);
    } else {
      interimTranscript += `${transcript} `;
    }
  }

  if (interimTranscript.trim()) {
    ui.heard.textContent = interimTranscript.trim();
  }
}

async function processTranscriptWithFutureAI(transcript) {
  // Future: send audio/transcript to Whisper API or OpenAI Realtime API.
  // Return command JSON like:
  // { command: "RIGHT", languageType: "mixed", confidence: 0.92 }
  return null;
}

function handleTranscript(transcript, transcriptLanguageMode) {
  const startedAt = performance.now();
  let analysis = analyzeVoiceCommand(transcript);
  analysis = applyWrongLanguageSafety(transcript, analysis, transcriptLanguageMode);

  console.log("Transcript:", transcript);
  console.log("Detected command:", analysis.command);

  if (analysis.command) {
    executeGameCommand(analysis.command, "voice");
  }

  const responseTimeMs = performance.now() - startedAt;
  const languageSwitchTriggered = updateMixedModeAfterTranscript(analysis);
  updateTranscriptDisplay(transcript, analysis);
  recordVoiceCommand(transcript, analysis, responseTimeMs, transcriptLanguageMode, languageSwitchTriggered);
}

function processTranscript(transcript, transcriptLanguageMode) {
  handleTranscript(transcript, transcriptLanguageMode);
}

function updateTranscriptDisplay(transcript, analysis) {
  ui.heard.textContent = transcript || "...";
  ui.command.textContent = analysis.command
    ? `Command: ${analysis.command}\nType: ${SOURCE_TYPE_LABELS[analysis.sourceType]}`
    : "Command: UNRECOGNIZED\nType: Unrecognized";
}

function isSpeechRecognitionSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function updateVoiceDebug() {
  if (!ui.voiceDebug) return;

  ui.voiceDebug.textContent =
    `Browser support: ${isSpeechRecognitionSupported() ? "yes" : "no"} | ` +
    `Mic permission: ${micPermissionState} | ` +
    `Recognition state: ${recognitionState} | ` +
    `Language: ${currentRecognitionLanguage}`;
}

function updateVoiceModeLine() {
  if (!ui.voiceModeLine) return;

  if (voiceModeMessage) {
    ui.voiceModeLine.textContent = voiceModeMessage;
    return;
  }

  ui.voiceModeLine.textContent = `Listening mode: ${getRecognitionLanguageLabel(currentRecognitionLanguage)}`;
}

function updateVoiceStatus(message, isError = false) {
  ui.voiceButton.classList.toggle("listening", voiceShouldRun);
  ui.voiceButton.textContent = voiceShouldRun ? "STOP VOICE" : "START VOICE";
  ui.voiceStatus.classList.toggle("error", isError);

  if (message) {
    ui.voiceStatus.textContent = message;
    updateVoiceModeLine();
    updateVoiceDebug();
    return;
  }

  if (voiceShouldRun && isVoiceListening) {
    ui.voiceStatus.textContent = "Voice: listening";
  } else if (voiceShouldRun) {
    ui.voiceStatus.textContent = "Voice: listening";
  } else {
    ui.voiceStatus.textContent = "Voice: idle";
  }

  updateVoiceModeLine();
  updateVoiceDebug();
}

function hasActiveResearchSession() {
  return Boolean(researchData.sessionStartTime && !researchData.sessionEndTime);
}

function finishResearchSessionIfActive(gameCompleted) {
  if (hasActiveResearchSession()) finishResearchSession(gameCompleted);
}

function setLevelOverlayVisible(visible) {
  if (!ui.levelOverlay) return;
  ui.levelOverlay.classList.toggle("hidden", !visible);
  ui.levelOverlay.hidden = !visible;
}

function setLevelSelectVisible(visible) {
  if (!ui.levelSelectGrid) return;
  ui.levelSelectGrid.classList.toggle("hidden", !visible);
  ui.levelSelectGrid.hidden = !visible;
}

function setLevelOverlayText(eyebrow, title, message) {
  ui.levelOverlayEyebrow.textContent = eyebrow;
  ui.levelOverlayTitle.textContent = title;
  ui.levelOverlayMessage.textContent = message;
}

function renderLevelSelect() {
  const unlockedLevel = getUnlockedLevel();
  ui.levelSelectGrid.innerHTML = "";

  for (let levelNumber = 1; levelNumber <= SETTINGS.maxLevel; levelNumber++) {
    const button = document.createElement("button");
    const unlocked = levelNumber <= unlockedLevel;

    button.type = "button";
    button.textContent = unlocked ? `LEVEL ${levelNumber}` : `LOCKED ${levelNumber}`;
    button.disabled = !unlocked;
    button.dataset.level = String(levelNumber);
    button.addEventListener("click", () => selectLevel(levelNumber));
    ui.levelSelectGrid.appendChild(button);
  }
}

function showLevelClearScreen() {
  const nextLevel = Math.min(level + 1, SETTINGS.maxLevel);
  pendingNextLevel = nextLevel;

  setLevelOverlayText(
    "LEVEL CLEAR",
    `LEVEL ${level} COMPLETE!`,
    `Level ${nextLevel} is now unlocked. Continue the current run or choose an unlocked level.`
  );

  ui.continueLevelButton.hidden = false;
  ui.continueLevelButton.textContent = `CONTINUE TO LEVEL ${nextLevel}`;
  ui.chooseLevelButton.hidden = false;
  ui.backToStartButton.hidden = false;
  setLevelSelectVisible(false);
  setLevelOverlayVisible(true);
}

function showFinalClearScreen() {
  pendingNextLevel = null;

  setLevelOverlayText(
    "FINAL CLEAR",
    "ALL LEVELS COMPLETE!",
    "Research run complete. Level 10 will not repeat."
  );

  ui.continueLevelButton.hidden = true;
  ui.chooseLevelButton.hidden = false;
  ui.backToStartButton.hidden = false;
  setLevelSelectVisible(false);
  setLevelOverlayVisible(true);
}

function showLevelSelectScreen() {
  gameState = "levelselect";
  renderLevelSelect();
  setLevelOverlayText(
    "CHOOSE LEVEL",
    "SELECT UNLOCKED LEVEL",
    `Unlocked through Level ${getUnlockedLevel()}. Locked levels cannot be selected.`
  );

  ui.continueLevelButton.hidden = !(pendingNextLevel && pendingNextLevel <= getUnlockedLevel());
  ui.chooseLevelButton.hidden = true;
  ui.backToStartButton.hidden = false;
  setLevelSelectVisible(true);
  setLevelOverlayVisible(true);
}

function hideLevelOverlay() {
  setLevelOverlayVisible(false);
  setLevelSelectVisible(false);
}

function canSelectLevelNow() {
  return gameState === "start" ||
    gameState === "levelclear" ||
    gameState === "levelselect" ||
    gameState === "finalclear" ||
    gameState === "gameover";
}

function selectLevel(levelNumber) {
  if (!canSelectLevelNow()) return false;
  if (levelNumber < 1 || levelNumber > getUnlockedLevel()) return false;

  startGame(levelNumber);
  return true;
}

function continueToNextLevel() {
  if (gameState !== "levelclear" && gameState !== "levelselect") return false;
  if (!pendingNextLevel || pendingNextLevel > getUnlockedLevel()) return false;

  level = pendingNextLevel;
  pendingNextLevel = null;
  frightenedTimer = 0;
  countdownText = "";
  effects = [];

  hideLevelOverlay();
  resetPositions();
  setupPellets();
  recordLevelAttempt(level);
  updateUI();
  startStageIntro();
  return true;
}

function backToStart() {
  finishResearchSessionIfActive(false);
  clearCountdownTimers();
  pendingNextLevel = null;
  score = 0;
  level = 1;
  lives = SETTINGS.lives;
  countdownText = "";
  frightenedTimer = 0;
  effects = [];
  gameState = "start";
  hideLevelOverlay();
  resetPositions();
  setupPellets();
  updateUI();
  return true;
}

function completeCurrentLevel() {
  clearCountdownTimers();
  frightenedTimer = 0;
  addEffect(canvas.width / 2, canvas.height / 2, "text", "#ffe84a", `LEVEL ${level} CLEAR`);
  recordLevelClear(level);

  if (level >= SETTINGS.maxLevel) {
    finishResearchSession(true);
    gameState = "finalclear";
    showFinalClearScreen();
    updateUI();
    return;
  }

  unlockLevel(level + 1);
  gameState = "levelclear";
  showLevelClearScreen();
  updateUI();
}

function getLevelFromCommand(command) {
  const match = /^LEVEL_(\d+)$/.exec(command);
  return match ? Number(match[1]) : null;
}

function executeGameCommand(command, source) {
  const direction = COMMAND_TO_DIRECTION[command];
  const selectedLevel = getLevelFromCommand(command);

  if (direction) {
    if (gameState === "playing" || gameState === "stageintro" || gameState === "countdown") {
      pacman.nextDirection = direction;
    }
    return true;
  }

  if (selectedLevel) {
    return selectLevel(selectedLevel);
  }

  if (command === "CONTINUE") {
    return continueToNextLevel();
  }

  if (command === "BACK") {
    return backToStart();
  }

  if (command === "CHOOSE_LEVEL") {
    if (gameState === "start" || gameState === "levelclear" || gameState === "finalclear" || gameState === "gameover") {
      showLevelSelectScreen();
      return true;
    }

    return false;
  }

  if (command === "START") {
    if (gameState === "levelclear" || (gameState === "levelselect" && pendingNextLevel)) {
      continueToNextLevel();
    } else if (gameState === "levelselect") {
      startGame();
    } else if (gameState === "start" || gameState === "gameover" || gameState === "finalclear") {
      startGame();
    } else if (gameState === "paused") {
      gameState = "playing";
    }
    return true;
  }

  if (command === "PAUSE") {
    if (gameState === "playing") {
      gameState = "paused";
    } else if (gameState === "paused") {
      gameState = "playing";
    }
    return true;
  }

  if (command === "RESTART") {
    startGame();
    return true;
  }

  return false;
}

function updateDifficulty() {
  const difficultyLevel = Math.min(level, SETTINGS.maxLevel);
  const levelIndex = difficultyLevel - 1;

  pacman.speed = SETTINGS.pacmanBaseSpeed + levelIndex * SETTINGS.pacmanLevelSpeedIncrease;

  ghosts.forEach(ghost => {
    ghost.speed =
      SETTINGS.pacmanBaseSpeed * SETTINGS.ghostBaseSpeedMultiplier * ghost.speedFactor +
      levelIndex * SETTINGS.ghostLevelSpeedIncrease;
  });
}

function getTile(x, y) {
  const currentMap = getCurrentMap();
  const col = Math.floor(x / tileSize);
  const row = Math.floor(y / tileSize);

  if (row < 0 || row >= currentMap.length || col < 0 || col >= currentMap[0].length) return "1";

  return currentMap[row][col];
}

function canMove(x, y, direction, speed, radius) {
  const vector = DIRECTIONS[direction];
  const newX = x + vector.dx * speed;
  const newY = y + vector.dy * speed;

  return (
    getTile(newX - radius, newY - radius) !== "1" &&
    getTile(newX + radius, newY - radius) !== "1" &&
    getTile(newX - radius, newY + radius) !== "1" &&
    getTile(newX + radius, newY + radius) !== "1"
  );
}

function getValidDirections(entity, radius) {
  const testSpeed = Math.max(entity.speed || 1, 1);

  return Object.keys(DIRECTIONS).filter(direction => (
    canMove(entity.x, entity.y, direction, testSpeed, radius)
  ));
}

function nearestTileCenter(value) {
  return Math.floor(value / tileSize) * tileSize + tileSize / 2;
}

function getPacmanTileCenter() {
  return {
    centerX: Math.floor(pacman.x / tileSize) * tileSize + tileSize / 2,
    centerY: Math.floor(pacman.y / tileSize) * tileSize + tileSize / 2
  };
}

function getPacmanAlignedPosition(direction) {
  const { centerX, centerY } = getPacmanTileCenter();
  const tolerance = SETTINGS.turnSnapTolerance;

  if (Math.abs(pacman.x - centerX) > tolerance) return null;
  if (Math.abs(pacman.y - centerY) > tolerance) return null;

  return { x: centerX, y: centerY };
}

function isOppositeDirection(a, b) {
  return DIRECTIONS[a].dx + DIRECTIONS[b].dx === 0 &&
    DIRECTIONS[a].dy + DIRECTIONS[b].dy === 0;
}

function canEnterNextTileFromCenter(centerX, centerY, direction) {
  const vector = DIRECTIONS[direction];
  const nextTileX = centerX + vector.dx * tileSize;
  const nextTileY = centerY + vector.dy * tileSize;

  return getTile(nextTileX, nextTileY) !== "1" &&
    canMove(centerX, centerY, direction, pacman.speed, SETTINGS.pacmanCollisionRadius);
}

function tryBufferedTurn() {
  // Normal buffered turn: keyboard and voice both write to this same nextDirection buffer.
  const nextDirection = pacman.nextDirection;
  if (nextDirection === pacman.direction) return false;

  const alignedPosition = getPacmanAlignedPosition(nextDirection);

  if (!alignedPosition) return false;

  if (canEnterNextTileFromCenter(alignedPosition.x, alignedPosition.y, nextDirection)) {
    // Snap to the current tile center only at a real intersection, then turn.
    pacman.x = alignedPosition.x;
    pacman.y = alignedPosition.y;
    pacman.direction = nextDirection;
    return true;
  }

  return false;
}

function snapPacmanToMovementLine() {
  const { centerX, centerY } = getPacmanTileCenter();
  const tolerance = SETTINGS.turnSnapTolerance;

  if (pacman.direction === "left" || pacman.direction === "right") {
    if (Math.abs(pacman.y - centerY) <= tolerance) pacman.y = centerY;
    return;
  }

  if (Math.abs(pacman.x - centerX) <= tolerance) pacman.x = centerX;
}

function tryStuckRecoveryTurn() {
  const nextDirection = pacman.nextDirection;
  const { centerX, centerY } = getPacmanTileCenter();

  // Blocked-direction recovery: force-snap to the nearest tile center when stuck.
  pacman.x = centerX;
  pacman.y = centerY;

  if (!canEnterNextTileFromCenter(pacman.x, pacman.y, nextDirection)) {
    return false;
  }

  pacman.direction = nextDirection;

  const vector = DIRECTIONS[pacman.direction];
  pacman.x += vector.dx * pacman.speed;
  pacman.y += vector.dy * pacman.speed;

  return true;
}

function logMovementDebug(canTurnNow) {
  movementDebugCounter++;

  if (movementDebugCounter % 30 !== 0 && !canTurnNow) return;

  console.debug("Pac-Man movement", {
    currentDirection: pacman.direction,
    nextDirection: pacman.nextDirection,
    canTurnNow
  });
}

function movePacman() {
  const currentCanMove = canMove(pacman.x, pacman.y, pacman.direction, pacman.speed, SETTINGS.pacmanCollisionRadius);
  let canTurnNow = false;

  if (currentCanMove) {
    // True buffered turn: keep moving current direction until nextDirection is valid at an intersection.
    canTurnNow = tryBufferedTurn();

    snapPacmanToMovementLine();

    const vector = DIRECTIONS[pacman.direction];
    pacman.x += vector.dx * pacman.speed;
    pacman.y += vector.dy * pacman.speed;
    logMovementDebug(canTurnNow);
    return;
  }

  // Stuck recovery only runs after currentDirection is blocked.
  canTurnNow = tryStuckRecoveryTurn();
  logMovementDebug(canTurnNow);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function addEffect(x, y, type, color, text = "") {
  effects.push({ x, y, type, color, text, age: 0, ttl: type === "text" ? 58 : 32 });
}

function eatPellets() {
  let ateSomething = false;

  pellets = pellets.filter(pellet => {
    if (distance(pacman, pellet) < 14) {
      score += 10;
      ateSomething = true;
      addEffect(pellet.x, pellet.y, "spark", "#ffe84a");
      return false;
    }

    return true;
  });

  powerPellets = powerPellets.filter(pellet => {
    if (distance(pacman, pellet) < 18) {
      score += 50;
      ateSomething = true;
      frightenedTimer = SETTINGS.frightenedDuration;
      addEffect(pellet.x, pellet.y, "power", "#45ff9a");

      ghosts.forEach(ghost => {
        if (ghost.direction === "up") ghost.direction = "down";
        else if (ghost.direction === "down") ghost.direction = "up";
        else if (ghost.direction === "left") ghost.direction = "right";
        else if (ghost.direction === "right") ghost.direction = "left";
      });

      return false;
    }

    return true;
  });

  if (pellets.length === 0 && powerPellets.length === 0) {
    completeCurrentLevel();
    return;
  }

  if (ateSomething) updateUI();
}

function targetForGhost(ghost) {
  if (ghost.name === "Blinky") return { x: pacman.x, y: pacman.y };

  if (ghost.name === "Pinky") {
    return {
      x: pacman.x + DIRECTIONS[pacman.direction].dx * tileSize * 4,
      y: pacman.y + DIRECTIONS[pacman.direction].dy * tileSize * 4
    };
  }

  if (ghost.name === "Inky") {
    return {
      x: pacman.x + Math.sin(Date.now() / 460) * tileSize * 4,
      y: pacman.y + Math.cos(Date.now() / 520) * tileSize * 4
    };
  }

  if (ghost.name === "Clyde") {
    const closeToPacman = distance(ghost, pacman) < tileSize * 5;
    return closeToPacman
      ? { x: tileSize * 1.5, y: tileSize * 13.5 }
      : { x: pacman.x, y: pacman.y };
  }

  return { x: pacman.x, y: pacman.y };
}

function chooseRandomDirection(directions) {
  if (directions.length === 0) return null;
  return directions[Math.floor(Math.random() * directions.length)];
}

function chooseGhostDirection(ghost, allowReverse = false) {
  const target = frightenedTimer > 0
    ? { x: canvas.width - pacman.x, y: canvas.height - pacman.y }
    : targetForGhost(ghost);

  const validDirections = getValidDirections(ghost, SETTINGS.ghostCollisionRadius);
  let candidates = validDirections;

  if (!allowReverse && validDirections.length > 1) {
    candidates = validDirections.filter(direction => !isOppositeDirection(ghost.direction, direction));
  }

  if (candidates.length === 0) {
    return chooseRandomDirection(validDirections) || ghost.direction;
  }

  let bestDirection = null;
  let bestDistance = Infinity;

  for (const direction of candidates) {
    const vector = DIRECTIONS[direction];
    const testX = ghost.x + vector.dx * tileSize;
    const testY = ghost.y + vector.dy * tileSize;
    const testDistance = Math.hypot(testX - target.x, testY - target.y);

    if (testDistance < bestDistance) {
      bestDistance = testDistance;
      bestDirection = direction;
    }
  }

  return bestDirection || chooseRandomDirection(candidates) || ghost.direction;
}

function updateGhostRespawnTimers(ghost) {
  if (ghost.respawnTimer > 0) ghost.respawnTimer--;
  if (ghost.invincibleTimer > 0) ghost.invincibleTimer--;
}

function moveGhost(ghost) {
  // Respawn delay stops a defeated ghost from instantly re-entering the maze.
  if (ghost.respawnTimer > 0) return;

  const speed = frightenedTimer > 0 ? ghost.speed * 0.55 : ghost.speed;
  const intersectionTolerance = Math.max(0.45, speed * 0.45);
  const centerX = nearestTileCenter(ghost.x);
  const centerY = nearestTileCenter(ghost.y);
  const atIntersection = Math.abs(ghost.x - centerX) < intersectionTolerance &&
    Math.abs(ghost.y - centerY) < intersectionTolerance;
  const blocked = !canMove(ghost.x, ghost.y, ghost.direction, speed, SETTINGS.ghostCollisionRadius);
  const forceNewDirection = ghost.stuckFrames >= 30;

  if (atIntersection || blocked || forceNewDirection) {
    ghost.x = Math.abs(ghost.x - centerX) < intersectionTolerance ? centerX : ghost.x;
    ghost.y = Math.abs(ghost.y - centerY) < intersectionTolerance ? centerY : ghost.y;
    ghost.direction = chooseGhostDirection(ghost, blocked || forceNewDirection);
  }

  if (!canMove(ghost.x, ghost.y, ghost.direction, speed, SETTINGS.ghostCollisionRadius)) {
    const validDirections = getValidDirections(ghost, SETTINGS.ghostCollisionRadius);
    ghost.direction = chooseRandomDirection(validDirections) || ghost.direction;
  }

  const oldX = ghost.x;
  const oldY = ghost.y;

  if (canMove(ghost.x, ghost.y, ghost.direction, speed, SETTINGS.ghostCollisionRadius)) {
    ghost.x += DIRECTIONS[ghost.direction].dx * speed;
    ghost.y += DIRECTIONS[ghost.direction].dy * speed;
  }

  if (Math.hypot(ghost.x - oldX, ghost.y - oldY) < 0.05) {
    ghost.stuckFrames++;

    if (ghost.stuckFrames === 30) {
      console.warn(`${ghost.name} may be stuck`, {
        x: Math.round(ghost.x),
        y: Math.round(ghost.y),
        direction: ghost.direction,
        speed: ghost.speed
      });
    }
  } else {
    ghost.stuckFrames = 0;
  }
}

function chooseSafeGhostSpawnPoint(ghost) {
  const homePoint = { name: "Home", x: ghost.homeX, y: ghost.homeY };
  const pacmanNearHome = distance(pacman, homePoint) < SETTINGS.ghostSpawnCampDistance;

  if (!pacmanNearHome) return homePoint;

  return safeGhostSpawnPoints.reduce((farthestPoint, point) => (
    distance(pacman, point) > distance(pacman, farthestPoint) ? point : farthestPoint
  ), safeGhostSpawnPoints[0]);
}

// Eaten ghosts use respawn safety; full level/life resets can stay immediate.
function resetGhost(ghost, useRespawnSafety = true) {
  const spawnPoint = useRespawnSafety
    ? chooseSafeGhostSpawnPoint(ghost)
    : { name: "Home", x: ghost.homeX, y: ghost.homeY };

  ghost.x = spawnPoint.x;
  ghost.y = spawnPoint.y;
  ghost.direction = ghost.startDirection;
  ghost.respawnTimer = useRespawnSafety ? SETTINGS.ghostRespawnDelayFrames : 0;
  ghost.invincibleTimer = useRespawnSafety ? SETTINGS.ghostRespawnInvincibleFrames : 0;
  ghost.spawnPointName = spawnPoint.name;
  ghost.stuckFrames = 0;
  ghost.lastDebugX = ghost.x;
  ghost.lastDebugY = ghost.y;
}

function updateGhostDebugStatus() {
  ghostStatusUpdateCounter++;

  if (ghostStatusUpdateCounter % 20 !== 0) return;

  const activeGhosts = ghosts.filter(ghost => level >= ghost.activeFromLevel);
  const stuckGhosts = activeGhosts.filter(ghost => ghost.stuckFrames >= 30);
  const status = stuckGhosts.length > 0
    ? `Stuck: ${stuckGhosts.map(ghost => ghost.name).join(", ")}`
    : "Moving";

  ui.ghostStatus.textContent = status;

  if (gameState === "playing" && Date.now() - lastGhostDebugLogTime > 3000) {
    lastGhostDebugLogTime = Date.now();
    console.debug("Ghost debug", activeGhosts.slice(0, 2).map(ghost => ({
      name: ghost.name,
      x: Math.round(ghost.x),
      y: Math.round(ghost.y),
      direction: ghost.direction,
      speed: Number(ghost.speed.toFixed(2)),
      stuckFrames: ghost.stuckFrames,
      respawnTimer: ghost.respawnTimer || 0,
      invincibleTimer: ghost.invincibleTimer || 0,
      spawnPoint: ghost.spawnPointName || "Home"
    })));
  }
}

function checkGhostCollision() {
  for (const ghost of ghosts) {
    if (level < ghost.activeFromLevel) continue;

    if (distance(pacman, ghost) < pacman.radius + ghost.radius) {
      // Respawning ghosts are protected, so spawn camping cannot award points.
      if (ghost.invincibleTimer > 0 || ghost.respawnTimer > 0) continue;

      if (frightenedTimer > 0) {
        score += 200;
        addEffect(ghost.x, ghost.y, "text", "#45ff9a", "200");
        resetGhost(ghost);
        updateUI();
      } else {
        loseLife();
        break;
      }
    }
  }
}

function startGame(startLevel = 1) {
  const unlockedLevel = getUnlockedLevel();
  const requestedLevel = Math.min(Math.max(Number(startLevel) || 1, 1), SETTINGS.maxLevel);
  const startingLevel = Math.min(requestedLevel, unlockedLevel);

  finishResearchSessionIfActive(false);
  clearCountdownTimers();
  hideLevelOverlay();
  score = 0;
  level = startingLevel;
  lives = SETTINGS.lives;
  frightenedTimer = 0;
  gameState = "stageintro";
  countdownText = "";
  effects = [];
  pendingNextLevel = null;

  resetPositions();
  setupPellets();
  startResearchSession(level);
  updateUI();
  startStageIntro();
}

function resetPositions() {
  pacman.x = tileSize * 1.5;
  pacman.y = tileSize * 1.5;
  pacman.direction = "right";
  pacman.nextDirection = "right";

  ghosts.forEach(ghost => resetGhost(ghost, false));
  updateDifficulty();
}

function loseLife() {
  lives--;
  addEffect(pacman.x, pacman.y, "power", "#ff4fd8");
  updateUI();

  if (lives <= 0) {
    finishResearchSession(false);
    gameState = "gameover";
    hideLevelOverlay();
    updateUI();
    return;
  }

  resetPositions();
  startLifeCountdown();
}

function clearCountdownTimers() {
  countdownTimers.forEach(timer => clearTimeout(timer));
  countdownTimers = [];
}

function startStageIntro() {
  clearCountdownTimers();
  const theme = getLevelTheme(level);

  stageIntroTitle = `LEVEL ${level}`;
  stageIntroSubtitle = theme.name;
  gameState = "stageintro";

  countdownTimers.push(setTimeout(startLifeCountdown, 1200));
}

function startLifeCountdown() {
  clearCountdownTimers();
  gameState = "countdown";

  const steps = ["3", "2", "1", "GO!"];
  let index = 0;

  function showNextStep() {
    if (gameState !== "countdown") return;

    countdownText = steps[index];
    index++;

    if (index < steps.length) {
      countdownTimers.push(setTimeout(showNextStep, 650));
    } else {
      countdownTimers.push(setTimeout(() => {
        if (gameState === "countdown") {
          countdownText = "";
          gameState = "playing";
        }
      }, 620));
    }
  }

  showNextStep();
}

function updateUI() {
  updateResearchBestStats();
  ui.score.textContent = score;
  ui.level.textContent = level;
  ui.lives.textContent = lives;
  updateResearchPanel();
}

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();

  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }

  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function getLevelTheme(levelNumber) {
  // Theme selection follows the same two-level stage index as the fixed maps.
  return levelThemes[getStageIndex(levelNumber)] || levelThemes[levelThemes.length - 1];
}

function drawLevelAtmosphere(theme) {
  ctx.save();
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, theme.atmosphere);
  gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.015)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = theme.glow;
  ctx.lineWidth = 1;

  for (let x = -canvas.height; x < canvas.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, canvas.height);
    ctx.lineTo(x + canvas.height, 0);
    ctx.stroke();
  }

  ctx.restore();
}

function drawMap(theme = getLevelTheme(level)) {
  ctx.save();
  const currentMap = getCurrentMap();

  for (let row = 0; row < currentMap.length; row++) {
    for (let col = 0; col < currentMap[row].length; col++) {
      if (currentMap[row][col] !== "1") continue;

      const x = col * tileSize;
      const y = row * tileSize;

      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = 12;
      ctx.fillStyle = theme.wallFill;
      drawRoundedRect(x + 3, y + 3, tileSize - 6, tileSize - 6, 6);
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = theme.wallStroke;
      drawRoundedRect(x + 4, y + 4, tileSize - 8, tileSize - 8, 5);
      ctx.stroke();

      ctx.shadowBlur = 4;
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = theme.wallInner;
      drawRoundedRect(x + 9, y + 9, tileSize - 18, tileSize - 18, 4);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawPellets() {
  ctx.save();
  ctx.shadowColor = "#ffe84a";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#fff8c7";

  for (const pellet of pellets) {
    ctx.beginPath();
    ctx.arc(pellet.x, pellet.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const pulse = Math.sin(Date.now() / 150) * 2;

  for (const pellet of powerPellets) {
    const radius = 8 + pulse;
    ctx.shadowColor = "#45ff9a";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#45ff9a";
    ctx.beginPath();
    ctx.arc(pellet.x, pellet.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.arc(pellet.x, pellet.y, radius + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPacman() {
  pacman.mouth += 0.16 + pacman.speed * 0.025;
  const mouthOpen = Math.abs(Math.sin(pacman.mouth)) * 0.33 + 0.06;
  let rotation = 0;

  if (pacman.direction === "down") rotation = Math.PI / 2;
  if (pacman.direction === "left") rotation = Math.PI;
  if (pacman.direction === "up") rotation = -Math.PI / 2;

  ctx.save();
  ctx.translate(pacman.x, pacman.y);
  ctx.rotate(rotation);
  ctx.shadowColor = "#ffe84a";
  ctx.shadowBlur = 18;

  const glow = ctx.createRadialGradient(-4, -4, 2, 0, 0, pacman.radius + 6);
  glow.addColorStop(0, "#fff9a8");
  glow.addColorStop(0.7, "#ffe84a");
  glow.addColorStop(1, "#ffb800");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, pacman.radius, mouthOpen, Math.PI * 2 - mouthOpen);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawGhost(ghost) {
  const frightened = frightenedTimer > 0;
  const respawning = ghost.respawnTimer > 0 || ghost.invincibleTimer > 0;
  const respawnBlink = respawning && Math.floor((ghost.respawnTimer + ghost.invincibleTimer) / 10) % 2 === 0;
  const warningFlash = frightened && frightenedTimer < 120 && Math.floor(frightenedTimer / 12) % 2 === 0;
  const bodyColor = frightened ? (warningFlash ? "#ffffff" : "#203fff") : ghost.color;
  const eyeOffset = {
    x: DIRECTIONS[ghost.direction].dx * 1.7,
    y: DIRECTIONS[ghost.direction].dy * 1.7
  };

  ctx.save();
  ctx.globalAlpha = respawning ? (respawnBlink ? 0.35 : 0.68) : 1;
  ctx.translate(ghost.x, ghost.y);
  ctx.shadowColor = bodyColor;
  ctx.shadowBlur = respawning ? 8 : (frightened ? 20 : 15);
  ctx.fillStyle = bodyColor;

  ctx.beginPath();
  ctx.arc(0, -1, ghost.radius, Math.PI, 0);
  ctx.lineTo(ghost.radius, ghost.radius);

  for (let i = 0; i < 3; i++) {
    const startX = ghost.radius - i * 9;
    ctx.lineTo(startX - 4, ghost.radius - 5);
    ctx.lineTo(startX - 9, ghost.radius);
  }

  ctx.lineTo(-ghost.radius, ghost.radius);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(-5.5, -2, 4.2, 5.2, 0, 0, Math.PI * 2);
  ctx.ellipse(5.5, -2, 4.2, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = frightened ? "#1020aa" : "#06060a";
  ctx.beginPath();
  ctx.arc(-5.5 + eyeOffset.x, -2 + eyeOffset.y, 2.2, 0, Math.PI * 2);
  ctx.arc(5.5 + eyeOffset.x, -2 + eyeOffset.y, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawLives() {
  ctx.save();
  ctx.fillStyle = "#ffe84a";
  ctx.shadowColor = "#ffe84a";
  ctx.shadowBlur = 8;

  for (let i = 0; i < lives; i++) {
    const x = 22 + i * 24;
    const y = canvas.height - 18;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, 8, 0.24 * Math.PI, 1.76 * Math.PI);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawEffects() {
  ctx.save();

  for (const effect of effects) {
    const progress = effect.age / effect.ttl;
    const alpha = Math.max(0, 1 - progress);

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = effect.color;
    ctx.fillStyle = effect.color;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 14;

    if (effect.type === "spark") {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 5 + progress * 14, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (effect.type === "power") {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 12 + progress * 34, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (effect.type === "text") {
      ctx.font = "bold 20px Courier New";
      ctx.textAlign = "center";
      ctx.fillText(effect.text, effect.x, effect.y - progress * 22);
    }

    effect.age++;
  }

  effects = effects.filter(effect => effect.age < effect.ttl);
  ctx.restore();
}

function drawCenteredText(text, y, size, color) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.font = `bold ${size}px Courier New`;
  ctx.fillText(text, canvas.width / 2, y);
  ctx.restore();
}

function drawOverlayScreen(title, subtitle, extra = "") {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(0, 229, 255, 0.65)";
  ctx.lineWidth = 2;
  drawRoundedRect(66, 132, canvas.width - 132, 190, 8);
  ctx.stroke();

  drawCenteredText(title, canvas.height / 2 - 32, 42, "#ffe84a");
  drawCenteredText(subtitle, canvas.height / 2 + 14, 20, "#ffffff");

  if (extra) {
    drawCenteredText(extra, canvas.height / 2 + 48, 16, "#00e5ff");
  }

  ctx.restore();
}

function drawGame() {
  const theme = getLevelTheme(level);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawLevelAtmosphere(theme);

  drawMap(theme);
  drawPellets();
  drawPacman();

  for (const ghost of ghosts) {
    if (level >= ghost.activeFromLevel) drawGhost(ghost);
  }

  drawEffects();
  drawLives();

  if (gameState === "start") {
    drawOverlayScreen("VOICE AI PAC-MAN", `Unlocked Level ${getUnlockedLevel()}`, "ENTER Start / L Choose Level");
  }

  if (gameState === "paused") {
    drawOverlayScreen("PAUSED", "Say START / 再開", "Press P");
  }

  if (gameState === "countdown") {
    drawOverlayScreen(countdownText, "Voice control ready");
  }

  if (gameState === "stageintro") {
    drawOverlayScreen(stageIntroTitle, stageIntroSubtitle, "Get ready");
  }

  if (gameState === "gameover") {
    drawOverlayScreen("GAME OVER", "Say RESTART / もう一回", "Press ENTER");
  }

  if (gameState === "levelclear") {
    drawOverlayScreen(`LEVEL ${level} COMPLETE!`, "Continue / Choose Level / Back", "Say CONTINUE or press ENTER");
  }

  if (gameState === "finalclear") {
    drawOverlayScreen("ALL LEVELS COMPLETE!", "Research run complete", "Back to Start or Choose Level");
  }

  if (gameState === "levelselect") {
    drawOverlayScreen("CHOOSE LEVEL", `Unlocked through Level ${getUnlockedLevel()}`, "Click a level or use voice");
  }
}

function gameLoop() {
  if (gameState === "playing") {
    movePacman();
    eatPellets();

    for (const ghost of ghosts) {
      if (level >= ghost.activeFromLevel) {
        updateGhostRespawnTimers(ghost);
        moveGhost(ghost);
      }
    }

    checkGhostCollision();

    if (frightenedTimer > 0) frightenedTimer--;
  }

  updateGhostDebugStatus();
  drawGame();
  requestAnimationFrame(gameLoop);
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(error => {
      console.warn("Full screen could not be started.", error);
    });
  } else {
    document.exitFullscreen();
  }
}

function updateFullscreenButton() {
  ui.fullscreenButton.textContent = document.fullscreenElement ? "EXIT FULL SCREEN" : "FULL SCREEN";
}

document.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    executeGameCommand(gameState === "gameover" ? "RESTART" : "START", "keyboard");
  }

  if (event.key === "Escape" || event.key === "b" || event.key === "B") {
    if (gameState === "levelclear" || gameState === "finalclear" || gameState === "levelselect") {
      executeGameCommand("BACK", "keyboard");
    }
  }

  if (event.key === "l" || event.key === "L" || event.key === "c" || event.key === "C") {
    if (gameState === "start" || gameState === "levelclear" || gameState === "finalclear" || gameState === "gameover") {
      executeGameCommand("CHOOSE_LEVEL", "keyboard");
    }
  }

  if (/^[0-9]$/.test(event.key)) {
    const selectedLevel = event.key === "0" ? 10 : Number(event.key);

    if (gameState === "levelselect") {
      executeGameCommand(`LEVEL_${selectedLevel}`, "keyboard");
    }
  }

  if (event.key === "p" || event.key === "P") {
    executeGameCommand("PAUSE", "keyboard");
  }

  if (event.key === "f" || event.key === "F") {
    toggleFullScreen();
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    executeGameCommand("UP", "keyboard");
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    executeGameCommand("DOWN", "keyboard");
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    executeGameCommand("LEFT", "keyboard");
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    executeGameCommand("RIGHT", "keyboard");
  }
});

ui.voiceButton.addEventListener("click", startVoice);
ui.fullscreenButton.addEventListener("click", toggleFullScreen);
ui.resetDataButton.addEventListener("click", resetResearchData);
ui.continueLevelButton.addEventListener("click", continueToNextLevel);
ui.chooseLevelButton.addEventListener("click", showLevelSelectScreen);
ui.backToStartButton.addEventListener("click", backToStart);

document.addEventListener("fullscreenchange", updateFullscreenButton);

setupPellets();
resetPositions();
updateUI();
updateVoiceStatus();
gameLoop();

window.parseVoiceCommand = parseVoiceCommand;
window.analyzeVoiceCommand = analyzeVoiceCommand;
window.normalizePronunciationText = normalizePronunciationText;
window.startVoiceRecognition = startVoiceRecognition;
window.handleTranscript = handleTranscript;
window.processTranscriptWithFutureAI = processTranscriptWithFutureAI;
window.testVoiceParser = function() {
  const tests = [
    "right",
    "light",
    "write",
    "ライト",
    "フライト",
    "ブライト",
    "left",
    "レフト",
    "リフト",
    "ラフト",
    "らふと",
    "up",
    "app",
    "アップ",
    "アプ",
    "down",
    "ダウン",
    "右に行って",
    "左に曲がって",
    "go 右",
    "right に行って",
    "アップに行って",
    "ダウンに行って",
    "スタート",
    "ポーズ",
    "もう一回",
    "continue",
    "続ける",
    "back",
    "戻る",
    "level one",
    "レベル1",
    "level ten",
    "レベル10",
    "go to the left and then go down",
    "right then down",
    "右 左",
    "下に行ってから左"
  ];

  console.table(tests.map(text => {
    const analysis = analyzeVoiceCommand(text);

    return {
      text,
      command: analysis.command,
      sourceType: analysis.sourceType,
      normalizedText: analysis.normalizedText
    };
  }));
};
window.startVoice = startVoice;
