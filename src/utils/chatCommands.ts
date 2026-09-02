export type ChatIntent =
  | 'navigate_home'
  | 'navigate_explore'
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
  {
    patterns: [/\b(go home|home|back to home|main|record screen|record page|map)\b/i],
    intent: 'navigate_home',
  },
  {
    patterns: [/\b(explore|open explore|discover|discover outdoors|what is nearby)\b/i],
    intent: 'navigate_explore',
  },
  {
    patterns: [/\b(trail|trails|hike|hiking trails?|browse trails?|show trails?|find trails?)\b/i],
    intent: 'navigate_trails',
  },
  {
    patterns: [/\b(event|events|show events|find events|browse events)\b/i],
    intent: 'navigate_events',
  },
  {
    patterns: [/\b(profile|my profile|account|settings|my account|me)\b/i],
    intent: 'navigate_profile',
  },
  {
    patterns: [/\b(spot|spots|points of interest|poi|locations)\b/i],
    intent: 'navigate_spots',
  },
  {
    patterns: [/\b(trackathon|trackathons|challenge|challenges|competition|competitions|race|races)\b/i],
    intent: 'navigate_trackathons',
  },
  {
    patterns: [/\b(guide|help me|tutorial|how to use|documentation|docs)\b/i],
    intent: 'navigate_guide',
  },
  {
    patterns: [/\b(post|posts|community|feed|social)\b/i],
    intent: 'navigate_posts',
  },
  {
    patterns: [/\b(conditions?|nearby conditions?|hazards?|incident map|status)\b/i],
    intent: 'navigate_status',
  },
  {
    patterns: [/\b(timeline|my timeline|activity|activities|history|my history|tracks|my tracks)\b/i],
    intent: 'navigate_timeline',
  },
  {
    patterns: [/\b(start track|start tracking|begin track|begin tracking|record track|new track|create track|start a track)\b/i],
    intent: 'action_start_tracking',
  },
  {
    patterns: [/\b(stop track|stop tracking|end track|end tracking|finish track|finish tracking|pause track|save track)\b/i],
    intent: 'action_stop_tracking',
  },
  {
    patterns: [/\b(how does sign.?in work|how do i sign in|what is internet identity|explain sign.?in|sign.?in process|how to sign in|why sign in|how does login work|how do i log in|what is ii|how does auth work|how does authentication work|explain login|what is the login|how does identity work)\b/i],
    intent: 'query_signin_info',
  },
  {
    patterns: [/\b(sign in|log in|login|authenticate|connect wallet)\b/i],
    intent: 'action_login',
  },
  {
    patterns: [/\b(sign out|log out|logout|disconnect)\b/i],
    intent: 'action_logout',
  },
  {
    patterns: [/\b(export|download track|export track|save gpx|export gpx|export kml)\b/i],
    intent: 'action_export',
  },
  {
    patterns: [/\b(import|upload track|import track|load gpx|import gpx|import kml)\b/i],
    intent: 'action_import',
  },
  {
    patterns: [/\b(add waypoint|mark location|add point|record point|checkpoint|add checkpoint)\b/i],
    intent: 'action_add_waypoint',
  },
  {
    patterns: [/\b(create group|new group|make group|start group)\b/i],
    intent: 'action_create_group',
  },
  {
    patterns: [/\b(report incident|report hazard|obstacle|wildlife|weather alert|incident)\b/i],
    intent: 'action_report_incident',
  },
  {
    patterns: [/\b(share location|live track|share my location|share track|share my track)\b/i],
    intent: 'action_share_location',
  },
  {
    patterns: [/\b(what can you do|what do you do|capabilities|features|commands|list commands|available commands)\b/i],
    intent: 'query_help',
  },
  {
    patterns: [/\b(help|assist|support)\b/i],
    intent: 'query_help',
  },
  {
    patterns: [/\b(my status|current status|am i logged in|am i signed in|who am i)\b/i],
    intent: 'query_status',
  },
];

const intentResponses: Record<ChatIntent, (isAuthed: boolean, principal?: string) => ParsedCommand> = {
  navigate_home: () => ({
    intent: 'navigate_home',
    message: '🗺️ Opening the Record screen.',
    navigationPath: '/',
  }),
  navigate_explore: () => ({
    intent: 'navigate_explore',
    message: '🧭 Opening Explore for trails, spots, and nearby conditions.',
    navigationPath: '/explore',
  }),
  navigate_trails: () => ({
    intent: 'navigate_trails',
    message: '🥾 Opening Trails.',
    navigationPath: '/trails',
  }),
  navigate_events: () => ({
    intent: 'navigate_events',
    message: '📅 Opening Events.',
    navigationPath: '/events',
  }),
  navigate_profile: (isAuthed) => ({
    intent: 'navigate_profile',
    message: isAuthed ? '👤 Opening Me.' : '🔐 Sign in to open your profile and account settings.',
    navigationPath: isAuthed ? '/profile' : undefined,
    requiresAuth: !isAuthed,
    quickReplies: isAuthed ? [] : ['Sign In'],
  }),
  navigate_spots: () => ({
    intent: 'navigate_spots',
    message: '📍 Opening Spots.',
    navigationPath: '/spots',
  }),
  navigate_trackathons: () => ({
    intent: 'navigate_trackathons',
    message: '🏁 Opening Challenges.',
    navigationPath: '/trackathons',
  }),
  navigate_guide: () => ({
    intent: 'navigate_guide',
    message: '📖 Opening the guide.',
    navigationPath: '/guide',
  }),
  navigate_posts: () => ({
    intent: 'navigate_posts',
    message: '💬 Opening community posts.',
    navigationPath: '/posts',
  }),
  navigate_status: () => ({
    intent: 'navigate_status',
    message: '⚠️ Opening nearby Conditions and incident reports.',
    navigationPath: '/status',
  }),
  navigate_timeline: (isAuthed, principal) => ({
    intent: 'navigate_timeline',
    message: isAuthed ? '🕘 Opening your track history.' : '🔐 Sign in to view synced history.',
    navigationPath: isAuthed && principal ? `/tracks/${principal}` : undefined,
    requiresAuth: !isAuthed,
    quickReplies: isAuthed ? [] : ['Sign In'],
  }),
  action_start_tracking: () => ({
    intent: 'action_start_tracking',
    message: '▶️ Opening Record. You can record locally without signing in; location is requested only when recording needs it.',
    actionType: 'start_tracking',
    navigationPath: '/',
    quickReplies: ['Go to Record'],
  }),
  action_stop_tracking: () => ({
    intent: 'action_stop_tracking',
    message: '✅ Use Finish on the Record screen when you are ready to complete the track.',
    navigationPath: '/',
    quickReplies: ['Go to Record'],
  }),
  action_login: () => ({
    intent: 'action_login',
    message: '🔐 Opening the sign-in dialog.',
    actionType: 'open_login',
    quickReplies: [],
  }),
  action_logout: (isAuthed) => ({
    intent: 'action_logout',
    message: isAuthed ? '👋 Signing you out...' : "You're not currently signed in.",
    actionType: isAuthed ? 'logout' : undefined,
    quickReplies: [],
  }),
  action_export: () => ({
    intent: 'action_export',
    message: '💾 Local GPX/KML/CSV export works without signing in. Open Record, load or record a track, then choose Export.',
    navigationPath: '/',
    quickReplies: ['Go to Record'],
  }),
  action_import: () => ({
    intent: 'action_import',
    message: '📂 Open Record and choose Import to load a local GPX, KML, or CSV route.',
    navigationPath: '/',
    quickReplies: ['Go to Record'],
  }),
  action_add_waypoint: () => ({
    intent: 'action_add_waypoint',
    message: '📌 In Manual mode, tap Record Point. AllTracks asks for location at that moment, then lets you add a note or photo.',
    navigationPath: '/',
    quickReplies: ['Go to Record'],
  }),
  action_create_group: (isAuthed) => ({
    intent: 'action_create_group',
    message: isAuthed
      ? '👥 Group options are available from your profile and advanced track options.'
      : '🔐 Sign in first to manage groups.',
    navigationPath: isAuthed ? '/profile' : undefined,
    requiresAuth: !isAuthed,
    quickReplies: isAuthed ? ['Go to Profile'] : ['Sign In'],
  }),
  action_report_incident: (isAuthed) => ({
    intent: 'action_report_incident',
    message: isAuthed
      ? '⚠️ Record a point and mark it as an incident to publish a shared field report.'
      : '🔐 Sign in to publish shared incident reports. Local track recording still works without an account.',
    navigationPath: isAuthed ? '/' : undefined,
    requiresAuth: !isAuthed,
    quickReplies: isAuthed ? ['Go to Record'] : ['Sign In'],
  }),
  action_share_location: (isAuthed) => ({
    intent: 'action_share_location',
    message: isAuthed
      ? '📡 Record cloud-enabled points, then use Share to copy your live tracking link.'
      : '🔐 Sign in to publish and share live location. Local recording does not require an account.',
    navigationPath: isAuthed ? '/' : undefined,
    requiresAuth: !isAuthed,
    quickReplies: isAuthed ? ['Go to Record'] : ['Sign In'],
  }),
  query_signin_info: () => ({
    intent: 'query_signin_info',
    message: `🔐 AllTracks uses Internet Identity for cloud and account features.\n\nYou do not need to sign in to record locally or import/export local track files. Sign in when you want synced history, groups, live sharing, community features, or cloud storage.\n\nInternet Identity uses device authentication such as biometrics or a security key, so there is no AllTracks password to remember.`,
    quickReplies: ['Sign In', 'Start Tracking'],
  }),
  query_status: (isAuthed, principal) => ({
    intent: 'query_status',
    message: isAuthed
      ? `✅ You're signed in. ID: ${principal ? principal.slice(0, 12) + '...' : 'unknown'}`
      : 'You are using AllTracks without an account. Local recording and file import/export are still available.',
    quickReplies: isAuthed ? ['Go to Profile', 'Sign Out'] : ['Start Tracking', 'Sign In'],
  }),
  query_help: () => ({
    intent: 'query_help',
    message: `I can handle common AllTracks navigation and action commands.\n\n**Core**\n- “Start tracking” / “Finish track” / “Record point”\n- “Import a track” / “Export GPX”\n\n**Explore**\n- “Open Explore” / “Browse trails” / “Show spots” / “Check conditions”\n\n**Account**\n- “View my history” / “Open profile” / “Sign in”\n\nShared cloud features such as live location and incident publishing require sign-in; local recording does not.`,
    quickReplies: ['Start Tracking', 'Open Explore', 'Browse Trails', 'View Profile'],
  }),
  unknown: () => ({
    intent: 'unknown',
    message: 'I handle common AllTracks actions and navigation. Try “Start tracking”, “Open Explore”, “View my history”, or “Help”.',
    quickReplies: ['Help', 'Start Tracking', 'Open Explore', 'Browse Trails'],
  }),
};

export function parseCommand(input: string, isAuthed: boolean, principal?: string): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) return intentResponses.unknown(isAuthed, principal);

  for (const { patterns, intent } of intentPatterns) {
    if (patterns.some((p) => p.test(trimmed))) {
      return intentResponses[intent](isAuthed, principal);
    }
  }

  if (trimmed === '?') return intentResponses.query_help(isAuthed, principal);
  return intentResponses.unknown(isAuthed, principal);
}

export const SUGGESTED_COMMANDS = [
  'Start tracking',
  'Open Explore',
  'Browse trails',
  'View my history',
  'View profile',
  'Check conditions',
  'Import a track',
  'Export GPX',
  'How does signin work?',
  'Help',
];
