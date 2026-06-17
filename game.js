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
  ghostCollisionRadius: 11
};

const VOICE_COMMAND_SELECTION_MODE = "first";
const STORAGE_KEY = "voiceAiPacmanResearchData";
const MIXED_MODE_LANGUAGES = ["ja-JP", "en-US"];
const MIXED_UNRECOGNIZED_SWITCH_LIMIT = 2;

const map = [
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
];

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
  avgResponseTime: document.getElementById("avgResponseTime"),
  lastTranscript: document.getElementById("lastTranscript"),
  lastDetectedCommand: document.getElementById("lastDetectedCommand"),
  fullscreenButton: document.getElementById("fullscreenButton"),
  resetDataButton: document.getElementById("resetDataButton")
};

canvas.width = map[0].length * tileSize;
canvas.height = map.length * tileSize;

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
let currentRecognitionLanguage = "ja-JP";
let lastTranscriptLanguageMode = "";
let mixedModeLanguageIndex = 0;
let mixedModeUnrecognizedStreak = 0;
let ghostStatusUpdateCounter = 0;
let lastGhostDebugLogTime = 0;
let movementDebugCounter = 0;

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
  highScore: 0,
  bestLevel: 1
};

let researchData = loadResearchData();

const SOURCE_TYPE_LABELS = {
  english: "English",
  japanese: "Japanese",
  katakana: "Katakana pronunciation",
  mixed: "Mixed",
  unrecognized: "Unrecognized"
};

const pronunciationReplacements = [
  { pattern: /リスタート|りすたーと/g, replacement: " restart ", command: "RESTART" },
  { pattern: /スタート|すたーと/g, replacement: " start ", command: "START" },
  { pattern: /ポーズ|ぽーず/g, replacement: " pause ", command: "PAUSE" },
  { pattern: /フライト|ふらいと|ブライト|ぶらいと|ライト|らいと/g, replacement: " right ", command: "RIGHT" },
  { pattern: /レフト|れふと|リフト|りふと/g, replacement: " left ", command: "LEFT" },
  { pattern: /アップ|あっぷ/g, replacement: " up ", command: "UP" },
  { pattern: /ダウン|だうん/g, replacement: " down ", command: "DOWN" }
];

const voicePatterns = [
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
    if (!saved) return { ...defaultResearchData };

    const parsed = JSON.parse(saved);
    const merged = { ...defaultResearchData, ...parsed };

    if (parsed.unrecognizedCommandCount === undefined) {
      merged.unrecognizedCommandCount = merged.failedCommands;
    }

    return merged;
  } catch (error) {
    console.warn("Research data could not be loaded.", error);
    return { ...defaultResearchData };
  }
}

function saveResearchData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(researchData));
  } catch (error) {
    console.warn("Research data could not be saved.", error);
  }
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

  if (changed) saveResearchData();
}

function recordVoiceCommand(transcript, analysis, responseTimeMs, transcriptLanguageMode) {
  const command = analysis.command;
  const sourceType = analysis.sourceType || "unrecognized";

  researchData.totalVoiceCommands++;
  researchData.lastTranscript = transcript;
  researchData.lastDetectedCommand = command || "UNRECOGNIZED";
  researchData.lastSourceType = sourceType;
  researchData.lastNormalizedText = analysis.normalizedText || "";
  researchData.currentRecognitionMode = getRecognitionModeForResearch();
  researchData.lastTranscriptLanguageMode = transcriptLanguageMode || currentRecognitionLanguage;

  if (command) {
    researchData.successfulCommands++;
    researchData.totalResponseTimeMs += responseTimeMs;
    researchData.averageCommandResponseTimeMs =
      researchData.totalResponseTimeMs / researchData.successfulCommands;

    if (sourceType === "english") researchData.englishCommandCount++;
    if (sourceType === "japanese") researchData.japaneseCommandCount++;
    if (sourceType === "katakana") researchData.katakanaCommandCount++;
    if (sourceType === "mixed") researchData.mixedCommandCount++;
  } else {
    researchData.failedCommands++;
    researchData.unrecognizedCommandCount++;
  }

  saveResearchData();
  updateResearchPanel();

  // Firebase, Supabase, or a university backend database can be added here later.
  console.table({
    totalVoiceCommands: researchData.totalVoiceCommands,
    successfulCommands: researchData.successfulCommands,
    failedCommands: researchData.failedCommands,
    unrecognizedCommandCount: researchData.unrecognizedCommandCount,
    englishCommandCount: researchData.englishCommandCount,
    japaneseCommandCount: researchData.japaneseCommandCount,
    katakanaCommandCount: researchData.katakanaCommandCount,
    mixedCommandCount: researchData.mixedCommandCount,
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
  ui.englishCommands.textContent = researchData.englishCommandCount;
  ui.japaneseCommands.textContent = researchData.japaneseCommandCount;
  ui.katakanaCommands.textContent = researchData.katakanaCommandCount;
  ui.mixedCommands.textContent = researchData.mixedCommandCount;
  ui.recognitionMode.textContent = researchData.currentRecognitionMode || getRecognitionModeForResearch();
  ui.transcriptMode.textContent = researchData.lastTranscriptLanguageMode || lastTranscriptLanguageMode || "...";
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
    ...defaultResearchData,
    currentRecognitionMode: getRecognitionModeForResearch()
  };

  saveResearchData();
  updateResearchPanel();

  ui.heard.textContent = "...";
  ui.command.textContent = "...";
  ui.lastTranscript.textContent = "...";
  ui.lastDetectedCommand.textContent = "...";
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
  const hasEnglishCommand = /\b(right|light|write|left|up|app|down|start|play|begin|resume|pause|hold|restart|retry|go|move|turn)\b|\btry\s+again\b|\bstop\s+temporarily\b/.test(baseText);
  const hasKatakanaCommand = pronunciationReplacements.some(replacement => {
    replacement.pattern.lastIndex = 0;
    return replacement.pattern.test(baseText);
  });
  const hasJapaneseCommand = /右|左|上|下|開始|始めて|始める|再開|一時停止|止まって|待って|もう一回|もう一度|やり直し/.test(baseText);
  const hasJapaneseGrammar = /に|へ|行って|曲がって/.test(baseText);

  pronunciationReplacements.forEach(replacement => {
    replacement.pattern.lastIndex = 0;
  });

  if (hasEnglishCommand && (hasJapaneseCommand || hasJapaneseGrammar || hasKatakanaCommand)) {
    return "mixed";
  }

  if (hasKatakanaCommand) return "katakana";
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

function parseVoiceCommand(text) {
  return analyzeVoiceCommand(text).command;
}

function setupPellets() {
  pellets = [];
  powerPellets = [];

  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) {
      const tile = map[row][col];
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

function getRecognitionLanguage() {
  if (getSelectedVoiceMode() === "mixed") {
    return MIXED_MODE_LANGUAGES[mixedModeLanguageIndex];
  }

  return getSelectedVoiceMode();
}

function resetMixedModeState() {
  mixedModeLanguageIndex = 0;
  mixedModeUnrecognizedStreak = 0;
  currentRecognitionLanguage = getRecognitionLanguage();
  researchData.currentRecognitionMode = getRecognitionModeForResearch();
  saveResearchData();
  updateResearchPanel();
}

function switchMixedRecognitionLanguage() {
  if (getSelectedVoiceMode() !== "mixed") return;

  mixedModeLanguageIndex = (mixedModeLanguageIndex + 1) % MIXED_MODE_LANGUAGES.length;
  mixedModeUnrecognizedStreak = 0;

  // Safer than time-based cycling: only restart after repeated unrecognized transcripts.
  // Timed cycling can interrupt speech mid-command and damage the low-latency feel.
  if (voiceShouldRun && voiceRecognition) {
    try {
      voiceRecognition.stop();
    } catch (error) {
      voiceRecognition.abort();
    }
  }
}

function updateMixedModeAfterTranscript(analysis) {
  if (getSelectedVoiceMode() !== "mixed") return;

  if (analysis.command) {
    mixedModeUnrecognizedStreak = 0;
    return;
  }

  mixedModeUnrecognizedStreak++;

  if (mixedModeUnrecognizedStreak >= MIXED_UNRECOGNIZED_SWITCH_LIMIT) {
    switchMixedRecognitionLanguage();
  }
}

function createVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  currentRecognitionLanguage = getRecognitionLanguage();
  recognition.lang = currentRecognitionLanguage;
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = function() {
    isVoiceListening = true;
    updateVoiceStatus();
  };

  recognition.onresult = handleVoiceRecognitionResult;

  recognition.onerror = function(event) {
    const message = event.error === "not-allowed"
      ? "Voice: microphone permission needed"
      : `Voice: ${event.error}`;

    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      voiceShouldRun = false;
    }

    updateVoiceStatus(message, true);
  };

  recognition.onend = function() {
    isVoiceListening = false;
    updateVoiceStatus();

    if (voiceShouldRun) {
      setTimeout(startVoiceRecognition, 250);
    }
  };

  return recognition;
}

function startVoiceRecognition() {
  if (!voiceShouldRun) return;

  voiceRecognition = createVoiceRecognition();

  if (!voiceRecognition) {
    voiceShouldRun = false;
    updateVoiceStatus("Voice: Web Speech API unavailable", true);
    return;
  }

  try {
    voiceRecognition.start();
  } catch (error) {
    updateVoiceStatus("Voice: restart pending", true);
  }
}

function startVoice() {
  if (voiceShouldRun) {
    stopVoice();
    return;
  }

  resetMixedModeState();
  voiceShouldRun = true;
  startVoiceRecognition();
}

function stopVoice() {
  voiceShouldRun = false;

  if (voiceRecognition) {
    try {
      voiceRecognition.stop();
    } catch (error) {
      voiceRecognition.abort();
    }
  }

  isVoiceListening = false;
  updateVoiceStatus();
}

function handleVoiceRecognitionResult(event) {
  for (let i = event.resultIndex; i < event.results.length; i++) {
    if (!event.results[i].isFinal) continue;

    const transcript = String(event.results[i][0].transcript);
    handleTranscript(transcript, currentRecognitionLanguage);
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
  const analysis = analyzeVoiceCommand(transcript);

  if (analysis.command) {
    executeGameCommand(analysis.command, "voice");
  }

  const responseTimeMs = performance.now() - startedAt;
  updateTranscriptDisplay(transcript, analysis);
  recordVoiceCommand(transcript, analysis, responseTimeMs, transcriptLanguageMode);
  updateMixedModeAfterTranscript(analysis);
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

function updateVoiceStatus(message, isError = false) {
  ui.voiceButton.classList.toggle("listening", voiceShouldRun);
  ui.voiceButton.textContent = voiceShouldRun ? "STOP VOICE" : "START VOICE";
  ui.voiceStatus.classList.toggle("error", isError);

  if (message) {
    ui.voiceStatus.textContent = message;
    return;
  }

  if (voiceShouldRun && isVoiceListening) {
    ui.voiceStatus.textContent = `Voice: listening (${getVoiceModeLabel()} / ${currentRecognitionLanguage})`;
  } else if (voiceShouldRun) {
    ui.voiceStatus.textContent = `Voice: reconnecting (${getVoiceModeLabel()})`;
  } else {
    ui.voiceStatus.textContent = "Voice: idle";
  }
}

function executeGameCommand(command, source) {
  const direction = COMMAND_TO_DIRECTION[command];

  if (direction) {
    if (gameState === "playing") {
      pacman.nextDirection = direction;
    }
    return true;
  }

  if (command === "START") {
    if (gameState === "start" || gameState === "gameover") {
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
  const col = Math.floor(x / tileSize);
  const row = Math.floor(y / tileSize);

  if (row < 0 || row >= map.length || col < 0 || col >= map[0].length) return "1";

  return map[row][col];
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
    level = Math.min(level + 1, SETTINGS.maxLevel);
    addEffect(canvas.width / 2, canvas.height / 2, "text", "#00e5ff", `LEVEL ${level}`);
    resetPositions();
    setupPellets();
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

function moveGhost(ghost) {
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

function resetGhost(ghost) {
  ghost.x = ghost.homeX;
  ghost.y = ghost.homeY;
  ghost.direction = ghost.startDirection;
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
      stuckFrames: ghost.stuckFrames
    })));
  }
}

function checkGhostCollision() {
  for (const ghost of ghosts) {
    if (level < ghost.activeFromLevel) continue;

    if (distance(pacman, ghost) < pacman.radius + ghost.radius) {
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

function startGame() {
  clearCountdownTimers();
  score = 0;
  level = 1;
  lives = SETTINGS.lives;
  frightenedTimer = 0;
  gameState = "playing";
  countdownText = "";
  effects = [];

  resetPositions();
  setupPellets();
  updateUI();
}

function resetPositions() {
  pacman.x = tileSize * 1.5;
  pacman.y = tileSize * 1.5;
  pacman.direction = "right";
  pacman.nextDirection = "right";

  ghosts.forEach(resetGhost);
  updateDifficulty();
}

function loseLife() {
  lives--;
  addEffect(pacman.x, pacman.y, "power", "#ff4fd8");
  updateUI();

  if (lives <= 0) {
    gameState = "gameover";
    return;
  }

  resetPositions();
  startLifeCountdown();
}

function clearCountdownTimers() {
  countdownTimers.forEach(timer => clearTimeout(timer));
  countdownTimers = [];
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
      countdownTimers.push(setTimeout(showNextStep, 700));
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

function drawMap() {
  ctx.save();

  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) {
      if (map[row][col] !== "1") continue;

      const x = col * tileSize;
      const y = row * tileSize;

      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "rgba(6, 13, 44, 0.92)";
      drawRoundedRect(x + 3, y + 3, tileSize - 6, tileSize - 6, 6);
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = "#156bff";
      drawRoundedRect(x + 4, y + 4, tileSize - 8, tileSize - 8, 5);
      ctx.stroke();

      ctx.shadowBlur = 4;
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(102, 230, 255, 0.95)";
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
  const warningFlash = frightened && frightenedTimer < 120 && Math.floor(frightenedTimer / 12) % 2 === 0;
  const bodyColor = frightened ? (warningFlash ? "#ffffff" : "#203fff") : ghost.color;
  const eyeOffset = {
    x: DIRECTIONS[ghost.direction].dx * 1.7,
    y: DIRECTIONS[ghost.direction].dy * 1.7
  };

  ctx.save();
  ctx.translate(ghost.x, ghost.y);
  ctx.shadowColor = bodyColor;
  ctx.shadowBlur = frightened ? 20 : 15;
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000006";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawMap();
  drawPellets();
  drawPacman();

  for (const ghost of ghosts) {
    if (level >= ghost.activeFromLevel) drawGhost(ghost);
  }

  drawEffects();
  drawLives();

  if (gameState === "start") {
    drawOverlayScreen("VOICE AI PAC-MAN", "Say START / スタート", "Press ENTER");
  }

  if (gameState === "paused") {
    drawOverlayScreen("PAUSED", "Say START / 再開", "Press P");
  }

  if (gameState === "countdown") {
    drawOverlayScreen(countdownText, "Voice control ready");
  }

  if (gameState === "gameover") {
    drawOverlayScreen("GAME OVER", "Say RESTART / もう一回", "Press ENTER");
  }
}

function gameLoop() {
  if (gameState === "playing") {
    movePacman();
    eatPellets();

    for (const ghost of ghosts) {
      if (level >= ghost.activeFromLevel) moveGhost(ghost);
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
    "up",
    "app",
    "アップ",
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
