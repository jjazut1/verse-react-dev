import { GameIcon, GameConfig } from './types';

// Game icons from the original HTML - comprehensive emoji set
export const DEFAULT_ICONS: GameIcon[] = [
  { id: '1', html: '&#127754', type: 'emoji', dataIcon: '&#127754' }, // 🌺
  { id: '2', html: '&#127755', type: 'emoji', dataIcon: '&#127755' }, // 🌻
  { id: '3', html: '&#127786', type: 'emoji', dataIcon: '&#127786' }, // 🍊
  { id: '4', html: '&#127788', type: 'emoji', dataIcon: '&#127788' }, // 🍌
  { id: '5', html: '&#127789', type: 'emoji', dataIcon: '&#127789' }, // 🍍
  { id: '6', html: '&#127790', type: 'emoji', dataIcon: '&#127790' }, // 🍎
  { id: '7', html: '&#127828', type: 'emoji', dataIcon: '&#127828' }, // 🍔
  { id: '8', html: '&#127839', type: 'emoji', dataIcon: '&#127839' }, // 🍟
  { id: '9', html: '&#127947', type: 'emoji', dataIcon: '&#127947' }, // 🥓
  { id: '10', html: '&#127846', type: 'emoji', dataIcon: '&#127846' }, // 🍶
  { id: '11', html: '&#127847', type: 'emoji', dataIcon: '&#127847' }, // 🍷
  { id: '12', html: '&#127849', type: 'emoji', dataIcon: '&#127849' }, // 🍹
  { id: '13', html: '&#127850', type: 'emoji', dataIcon: '&#127850' }, // 🍺
  { id: '14', html: '&#127851', type: 'emoji', dataIcon: '&#127851' }, // 🍻
  { id: '15', html: '&#127853', type: 'emoji', dataIcon: '&#127853' }, // 🍽
  { id: '16', html: '&#127868', type: 'emoji', dataIcon: '&#127868' }, // 🎬
  { id: '17', html: '&#127875', type: 'emoji', dataIcon: '&#127875' }, // 🎳
  { id: '18', html: '&#127876', type: 'emoji', dataIcon: '&#127876' }, // 🎴
  { id: '19', html: '&#127877', type: 'emoji', dataIcon: '&#127877' }, // 🎵
  { id: '20', html: '&#127906', type: 'emoji', dataIcon: '&#127906' }, // 🏂
  { id: '21', html: '&#127910', type: 'emoji', dataIcon: '&#127910' }, // 🏆
  { id: '22', html: '&#127911', type: 'emoji', dataIcon: '&#127911' }, // 🏇
  { id: '23', html: '&#127912', type: 'emoji', dataIcon: '&#127912' }, // 🏈
  { id: '24', html: '&#127917', type: 'emoji', dataIcon: '&#127917' }, // 🏍
  { id: '25', html: '&#127918', type: 'emoji', dataIcon: '&#127918' }, // 🏎
  { id: '26', html: '&#127923', type: 'emoji', dataIcon: '&#127923' }, // 🏓
  { id: '27', html: '&#127925', type: 'emoji', dataIcon: '&#127925' }, // 🏕
  { id: '28', html: '&#127926', type: 'emoji', dataIcon: '&#127926' }, // 🏖
  { id: '29', html: '&#127927', type: 'emoji', dataIcon: '&#127927' }, // 🏗
  { id: '30', html: '&#127929', type: 'emoji', dataIcon: '&#127929' }, // 🏙
  { id: '31', html: '&#127930', type: 'emoji', dataIcon: '&#127930' }, // 🏚
  { id: '32', html: '&#127931', type: 'emoji', dataIcon: '&#127931' }, // 🏛
  { id: '33', html: '&#127932', type: 'emoji', dataIcon: '&#127932' }, // 🏜
  { id: '34', html: '&#127956', type: 'emoji', dataIcon: '&#127956' }, // 🐌
  { id: '35', html: '&#127962', type: 'emoji', dataIcon: '&#127962' }, // 🐒
  { id: '36', html: '&#127963', type: 'emoji', dataIcon: '&#127963' }, // 🐓
  { id: '37', html: '&#127993', type: 'emoji', dataIcon: '&#127993' }, // 🐹
  { id: '38', html: '&#127994', type: 'emoji', dataIcon: '&#127994' }, // 🐺
  { id: '39', html: '&#128008', type: 'emoji', dataIcon: '&#128008' }, // 🐈
  { id: '40', html: '&#128009', type: 'emoji', dataIcon: '&#128009' }, // 🐉
  { id: '41', html: '&#128017', type: 'emoji', dataIcon: '&#128017' }, // 🐑
  { id: '42', html: '&#128018', type: 'emoji', dataIcon: '&#128018' }, // 🐒
  { id: '43', html: '&#128021', type: 'emoji', dataIcon: '&#128021' }, // 🐕
  { id: '44', html: '&#128025', type: 'emoji', dataIcon: '&#128025' }, // 🐙
  { id: '45', html: '&#128035', type: 'emoji', dataIcon: '&#128035' }, // 🐣
  { id: '46', html: '&#128038', type: 'emoji', dataIcon: '&#128038' }, // 🐦
  { id: '47', html: '&#128039', type: 'emoji', dataIcon: '&#128039' }, // 🐧
  { id: '48', html: '&#128049', type: 'emoji', dataIcon: '&#128049' }, // 🐱
  { id: '49', html: '&#128054', type: 'emoji', dataIcon: '&#128054' }, // 🐶
  { id: '50', html: '&#128062', type: 'emoji', dataIcon: '&#128062' }, // 🐾
  { id: '51', html: '&#128064', type: 'emoji', dataIcon: '&#128064' }, // 👀
  { id: '52', html: '&#128276', type: 'emoji', dataIcon: '&#128276' }, // 💤
  { id: '53', html: '&#128293', type: 'emoji', dataIcon: '&#128293' }, // 🔥
  { id: '54', html: '&#128659', type: 'emoji', dataIcon: '&#128659' }, // 🚳
  { id: '55', html: '&#128664', type: 'emoji', dataIcon: '&#128664' }, // 🚸
  // Custom images from the original
  { 
    id: '56', 
    html: '<img src="https://drive.google.com/thumbnail?id=1W5fABGL2LGPHGXkk35WEjphVdTo0qfwz" style="width: 50px; height: 50px; object-fit: cover; pointer-events: none;">',
    type: 'image',
    dataIcon: '&#127867'
  },
  { 
    id: '57', 
    html: '<img src="https://drive.google.com/thumbnail?id=12ZtS7SJYplggkvip6V4E2ow_Os2xdJib" style="width: 55px; height: 55px; object-fit: cover; pointer-events: none;">',
    type: 'image',
    dataIcon: '&#127866'
  }
];

export const DEFAULT_CONFIG: GameConfig = {
  title: 'Name It Game',
  description: 'Find matching symbols between cards in this fast-paced pattern recognition game',
  gameTime: 300, // 5 minutes
  iconSet: DEFAULT_ICONS,
  maxPlayers: 2,
  enableSound: true,
  enableWebRTC: false, // Start disabled for single player mode
  difficulty: 'medium'
};

// Dobble algorithm constants
export const ICONS_PER_CARD = 8;
export const TOTAL_CARDS = 57; // Based on Dobble mathematics: n² - n + 1 where n = 8

// Game timing constants
export const MATCH_FEEDBACK_DURATION = 1000; // milliseconds
export const CARD_ANIMATION_DURATION = 500; // milliseconds
export const COUNTDOWN_DURATION = 3; // seconds

// WebRTC configuration with multiple TURN providers for maximum connectivity
export const WEBRTC_CONFIG: RTCConfiguration = {
  iceServers: [
    // Google STUN servers for basic connectivity
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    
    // Additional STUN servers for redundancy
    { urls: 'stun:stun.nextcloud.com:443' },
    { urls: 'stun:stun.sipnet.net:3478' },
    { urls: 'stun:stun.ekiga.net' },
    { urls: 'stun:stun.ideasip.com' },
    
    // Primary TURN servers - OpenRelay (free, reliable)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject', 
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    
    // Secondary TURN servers - Metered (backup)
    {
      urls: 'turn:relay1.expressturn.com:3478',
      username: 'expressturn',
      credential: 'WmfDVWd3eKJ82Tko'
    },
    {
      urls: 'turns:relay1.expressturn.com:5349',
      username: 'expressturn',
      credential: 'WmfDVWd3eKJ82Tko'
    },
    
    // Third TURN provider - Numb (additional backup)
    {
      urls: 'turn:numb.viagenie.ca',
      username: 'webrtc@live.com',
      credential: 'muazkh'
    },
    {
      urls: 'turns:numb.viagenie.ca',
      username: 'webrtc@live.com',
      credential: 'muazkh'
    }
  ],
  // Enhanced configuration for maximum connectivity (based on successful previous testing)
  iceCandidatePoolSize: 20,  // Proven working value from extensive testing
  bundlePolicy: 'max-bundle', // Reduce connection complexity
  rtcpMuxPolicy: 'require',   // Force RTCP multiplexing
  // Allow both direct and relay connections (more permissive than relay-only)
  iceTransportPolicy: 'all' // ✅ Use successful 'all' policy from previous testing
};

// Card positioning for circular arrangement
export const CARD_POSITIONS = {
  center: { top: '50%', left: '50%' },
  player1: { top: '22%', left: '1%' },
  player2: { top: '22%', right: '1%' }
};

// Icon positioning within cards (circular arrangement)
export const getIconPositions = (count: number = ICONS_PER_CARD) => {
  const positions = [];
  const radius = 100;
  const centerX = 50;
  const centerY = 50;
  
  // Outer circle positions
  const angleStep = (2 * Math.PI) / (count - 1);
  for (let i = 0; i < count - 1; i++) {
    const angle = i * angleStep;
    const x = centerX + (radius * Math.cos(angle)) / 300 * 100;
    const y = centerY + (radius * Math.sin(angle)) / 300 * 100;
    positions.push({ x, y });
  }
  
  // Center position
  positions.push({ x: centerX, y: centerY });
  
  return positions;
};

// Difficulty settings
export const DIFFICULTY_SETTINGS = {
  debug: {
    gameTime: 20, // 20 seconds - for troubleshooting
    maxMistakes: 10,
    hintCooldown: 1000 // 1 second
  },
  easy: {
    gameTime: 420, // 7 minutes
    maxMistakes: 5,
    hintCooldown: 10000 // 10 seconds
  },
  medium: {
    gameTime: 300, // 5 minutes
    maxMistakes: 3,
    hintCooldown: 15000 // 15 seconds
  },
  hard: {
    gameTime: 180, // 3 minutes
    maxMistakes: 1,
    hintCooldown: 20000 // 20 seconds
  }
}; 