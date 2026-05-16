export type ChatIntent =
  | 'navigate_home'
  | 'navigate_trails'
  | 'navigate_events'
  | 'navigate_profile'
  | 'navigate_spots'
  | 'navigate_trackathons'
  | 'navigate_guide'
  | 'navigate_posts'
  | 'navigate_status'
  | 'navigate_timeline'
  | 'action_start_tracking'
  | 'action_stop_tracking'
  | 'action_login'
  | 'action_logout'
  | 'action_export'
  | 'action_import'
  | 'action_add_waypoint'
  | 'action_create_group'
  | 'action_report_incident'
  | 'action_share_location'
  | 'query_status'
  | 'query_signin_info'
  | 'query_help'
  | 'unknown';

export interface ParsedCommand {
  intent: ChatIntent;
  message: string;
  navigationPath?: string;
  actionType?: string;
  requiresAuth?: boolean;
  quickReplies?: string[];
}

interface IntentPattern {
  patterns: RegExp[];
  intent: ChatIntent;
}

const intentPatterns: IntentPattern[] = [
  // Navigation intents
  {
    patterns: [
      /\b(go home|home|back to home|main|dashboard|map)\b/i,
    ],
    intent: 'navigate_home',
  },
  {
    patterns: [
      /\b(trail|trails|hike|hiking trails?|browse trails?|show trails?|find trails?)\b/i,
    ],
    intent: 'navigate_trails',
  },
  {
    patterns: [
      /\b(event|events|show events|find events|browse events)\b/i,
    ],
    intent: 'navigate_events',
  },
  {
    patterns: [
      /\b(profile|my profile|account|settings|my account)\b/i,
    ],
    intent: 'navigate_profile',
  },
  {
    patterns: [
      /\b(spot|spots|points of interest|poi|locations)\b/i,
    ],
    intent: 'navigate_spots',
  },
  {
    patterns: [
      /\b(trackathon|trackathons|competition|competitions|race|races)\b/i,
    ],
    intent: 'navigate_trackathons',
  },
  {
    patterns: [
      /\b(guide|help me|tutorial|how to use|documentation|docs)\b/i,
    ],
    intent: 'navigate_guide',
  },
  {
    patterns: [
      /\b(post|posts|community|feed|social)\b/i,
    ],
    intent: 'navigate_posts',
  },
  {
    patterns: [
      /\b(status|app status|system status|network status)\b/i,
    ],
    intent: 'navigate_status',
  },
  {
    patterns: [
      /\b(timeline|my timeline|activity|activities|history)\b/i,
    ],
    intent: 'navigate_timeline',
  },

  // Action intents
  {
    patterns: [
      /\b(start track|start tracking|begin track|begin tracking|record track|new track|create track|start a track)\b/i,
    ],
    intent: 'action_start_tracking',
  },
  {
    patterns: [
      /\b(stop track|stop tracking|end track|end tracking|finish track|finish tracking|pause track|save track)\b/i,
    ],
    intent: 'action_stop_tracking',
  },
  {
    patterns: [
      /\b(how does sign.?in work|how do i sign in|what is internet identity|explain sign.?in|sign.?in process|how to sign in|why sign in|how does login work|how do i log in|what is ii|how does auth work|how does authentication work|explain login|what is the login|how does identity work)\b/i,
    ],
    intent: 'query_signin_info',
  },
  {
    patterns: [
      /\b(sign in|log in|login|authenticate|connect wallet)\b/i,
    ],
    intent: 'action_login',
  },
  {
    patterns: [
      /\b(sign out|log out|logout|disconnect)\b/i,
    ],
    intent: 'action_logout',
  },
  {
    patterns: [
      /\b(export|download track|export track|save gpx|export gpx|export kml)\b/i,
    ],
    intent: 'action_export',
  },
  {
    patterns: [
      /\b(import|upload track|import track|load gpx|import gpx|import kml)\b/i,
    ],
    intent: 'action_import',
  },
  {
    patterns: [
      /\b(add waypoint|mark location|add point|checkpoint|add checkpoint)\b/i,
    ],
    intent: 'action_add_waypoint',
  },
  {
    patterns: [
      /\b(create group|new group|make group|start group)\b/i,
    ],
    intent: 'action_create_group',
  },
  {
    patterns: [
      /\b(report incident|report hazard|hazard|obstacle|wildlife|weather alert|incident)\b/i,
    ],
    intent: 'action_report_incident',
  },
  {
    patterns: [
      /\b(share location|live track|share my location|share track|share my track)\b/i,
    ],
    intent: 'action_share_location',
  },

  // Query intents
  {
    patterns: [
      /\b(what can you do|what do you do|capabilities|features|commands|list commands|available commands)\b/i,
    ],
    intent: 'query_help',
  },
  {
    patterns: [
      /\b(help|assist|support)\b/i,
    ],
    intent: 'query_help',
  },
  {
    patterns: [
      /\b(my status|current status|am i logged in|am i signed in|who am i)\b/i,
    ],
    intent: 'query_status',
  },
];

const intentResponses: Record<ChatIntent, (isAuthed: boolean, principal?: string) => ParsedCommand> = {
  navigate_home: () => ({
    intent: 'navigate_home',
    message: '🗺️ Taking you to the home map view!',
    navigationPath: '/',
  }),
  navigate_trails: () => ({
    intent: 'navigate_trails',
    message: '🥾 Opening the trails browser for you!',
    navigationPath: '/trails',
  }),
  navigate_events: () => ({
    intent: 'navigate_events',
    message: '📅 Opening events for you!',
    navigationPath: '/events',
  }),
  navigate_profile: (isAuthed) => ({
    intent: 'navigate_profile',
    message: isAuthed
      ? '👤 Opening your profile!'
      : '🔐 Please sign in first to view your profile.',
    navigationPath: isAuthed ? '/profile' : undefined,
    requiresAuth: !isAuthed,
    quickReplies: isAuthed ? [] : ['Sign In'],
  }),
  navigate_spots: () => ({
    intent: 'navigate_spots',
    message: '📍 Opening spots & points of interest!',
    navigationPath: '/spots',
  }),
  navigate_trackathons: () => ({
    intent: 'navigate_trackathons',
    message: '🏁 Opening trackathons & competitions!',
    navigationPath: '/trackathons',
  }),
  navigate_guide: () => ({
    intent: 'navigate_guide',
    message: '📖 Opening the guide to help you learn AllTracks!',
    navigationPath: '/guide',
  }),
  navigate_posts: () => ({
    intent: 'navigate_posts',
    message: '💬 Opening the community posts feed!',
    navigationPath: '/posts',
  }),
  navigate_status: () => ({
    intent: 'navigate_status',
    message: '📊 Opening the system status page!',
    navigationPath: '/status',
  }),
  navigate_timeline: (isAuthed, principal) => ({
    intent: 'navigate_timeline',
    message: isAuthed
      ? '📈 Opening your activity timeline!'
      : '🔐 Please sign in first to view your timeline.',
    navigationPath: isAuthed && principal ? `/user/${principal}` : undefined,
    requiresAuth: !isAuthed,
    quickReplies: isAuthed ? [] : ['Sign In'],
  }),
  action_start_tracking: (isAuthed) => ({
    intent: 'action_start_tracking',
    message: isAuthed
      ? '▶️ Opening the start tracking dialog! Head to the home screen to begin.'
      : '🔐 Please sign in first to start tracking.',
    actionType: 'start_tracking',
    navigationPath: '/',
    requiresAuth: !isAuthed,
    quickReplies: isAuthed ? ['Go to Map'] : ['Sign In'],
  }),
  action_stop_tracking: (isAuthed) => ({
    intent: 'action_stop_tracking',
    message: isAuthed
      ? '⏹️ To stop tracking, go to the map and click the stop button.'
      : '🔐 Please sign in first.',
    navigationPath: isAuthed ? '/' : undefined,
    requiresAuth: !isAuthed,
    quickReplies: isAuthed ? ['Go to Map'] : ['Sign In'],
  }),
  action_login: () => ({
    intent: 'action_login',
    message: '🔐 Opening the sign-in dialog for you!',
    actionType: 'open_login',
    quickReplies: [],
  }),
  action_logout: (isAuthed) => ({
    intent: 'action_logout',
    message: isAuthed
      ? '👋 Signing you out...'
      : "You're not currently signed in.",
    actionType: isAuthed ? 'logout' : undefined,
    quickReplies: [],
  }),
  action_export: (isAuthed) => ({
    intent: 'action_export',
    message: isAuthed
      ? '💾 To export your track, go to the home map, start or load a track, then click Export.'
      : '🔐 Please sign in first to export tracks.',
    navigationPath: '/',
    requiresAuth: !isAuthed,
    quickReplies: isAuthed ? ['Go to Map'] : ['Sign In'],
  }),
  action_import: (isAuthed) => ({
    intent: 'action_import',
    message: isAuthed
      ? '📂 To import a track, go to the home map and click the Import button to upload a GPX, KML, or CSV file.'
      : '🔐 Please sign in first to import tracks.',
    navigationPath: '/',
    requiresAuth: !isAuthed,
    quickReplies: isAuthed ? ['Go to Map'] : ['Sign In'],
  }),
  action_add_waypoint: (isAuthed) => ({
    intent: 'action_add_waypoint',
    message: isAuthed
      ? '📌 To add a waypoint/checkpoint, start a track on the map and click the location you want to mark.'
      : '🔐 Please sign in first to add waypoints.',
    navigationPath: '/',
    requiresAuth: !isAuthed,
    quickReplies: isAuthed ? ['Go to Map'] : ['Sign In'],
  }),
  action_create_group: (isAuthed) => ({
    intent: 'action_create_group',
    message: isAuthed
      ? '👥 To create a group, go to your Profile and look for the Groups section.'
      : '🔐 Please sign in first to create groups.',
    navigationPath: isAuthed ? '/profile' : undefined,
    requiresAuth: !isAuthed,
    quickReplies: isAuthed ? ['Go to Profile'] : ['Sign In'],
  }),
  action_report_incident: (isAuthed) => ({
    intent: 'action_report_incident',
    message: isAuthed
      ? '⚠️ To report an incident or hazard, go to the map, right-click a location, and select "Report Incident".'
      : '🔐 Please sign in first to report incidents.',
    navigationPath: '/',
    requiresAuth: !isAuthed,
    quickReplies: isAuthed ? ['Go to Map'] : ['Sign In'],
  }),
  action_share_location: (isAuthed) => ({
    intent: 'action_share_location',
    message: isAuthed
      ? '📡 To share your live location, start a track on the map and use the Share button to get your live tracking link.'
      : '🔐 Please sign in first to share your location.',
    navigationPath: isAuthed ? '/' : undefined,
    requiresAuth: !isAuthed,
    quickReplies: isAuthed ? ['Go to Map'] : ['Sign In'],
  }),
  query_signin_info: () => ({
    intent: 'query_signin_info',
    message: `🔐 Here's how signing in works on AllTracks:

**AllTracks uses Internet Identity** — a secure, privacy-preserving authentication system built on the Internet Computer blockchain.

**How it works:**
1. Click **"Sign In"** in the top navigation bar (or say "sign in" here)
2. A popup opens at **https://id.ai** — the Internet Identity service
3. You authenticate using your device's built-in biometrics (Face ID, fingerprint, Windows Hello) or a hardware security key
4. Once verified, you're signed in — no password needed!

**Why Internet Identity?**
- 🔒 No passwords to remember or leak
- 🕵️ No tracking across sites — each app gets a unique ID
- ⏱️ Sessions last up to 7 days; the app auto-renews on revisit
- 🌐 Decentralized — your identity isn't stored by AllTracks

**First time?** Create a free Internet Identity anchor at https://id.ai — it takes about 30 seconds.`,
    quickReplies: ['Sign In', 'What is my status?'],
  }),
  query_status: (isAuthed, principal) => ({
    intent: 'query_status',
    message: isAuthed
      ? `✅ You're signed in! Your ID is: ${principal ? principal.slice(0, 12) + '...' : 'unknown'}`
      : "❌ You're not signed in. Sign in to access all features.",
    quickReplies: isAuthed ? ['Go to Profile', 'Sign Out'] : ['Sign In'],
  }),
  query_help: () => ({
    intent: 'query_help',
    message: `👋 Hi! I'm the AllTracks assistant. Here's what I can help you with:

**Navigate:**
- "Go to trails" / "Show events" / "Open profile"
- "Take me to spots" / "Show trackathons" / "View guide"

**Track Activity:**
- "Start tracking" / "Stop tracking"
- "Add a waypoint" / "Report an incident"
- "Export my track" / "Import a track"

**Community:**
- "Create a group" / "Share my location"
- "Show community posts"

**Account:**
- "Sign in" / "Sign out" / "What's my status"
- "How does signin work?"

Just type what you'd like to do!`,
    quickReplies: ['Start Tracking', 'Browse Trails', 'View Profile', 'How does signin work?'],
  }),
  unknown: () => ({
    intent: 'unknown',
    message: "🤔 I'm not sure what you mean. Try asking for help to see what I can do, or describe what you'd like to accomplish.",
    quickReplies: ['Help', 'Start Tracking', 'Browse Trails', 'View Profile'],
  }),
};

export function parseCommand(input: string, isAuthed: boolean, principal?: string): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    return intentResponses.unknown(isAuthed, principal);
  }

  for (const { patterns, intent } of intentPatterns) {
    if (patterns.some((p) => p.test(trimmed))) {
      return intentResponses[intent](isAuthed, principal);
    }
  }

  // Check for bare "?" as help
  if (trimmed === '?') {
    return intentResponses.query_help(isAuthed, principal);
  }

  return intentResponses.unknown(isAuthed, principal);
}

export const SUGGESTED_COMMANDS = [
  'Start tracking',
  'Browse trails',
  'View profile',
  'Show events',
  'Browse spots',
  'View trackathons',
  'Report incident',
  'Share my location',
  'How does signin work?',
  'Help',
];
