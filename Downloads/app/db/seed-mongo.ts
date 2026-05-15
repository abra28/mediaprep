import { connectMongo, getNextId } from "./mongo";

const CHECKLIST_ITEMS = [
  // ARRIVAL (8)
  ["Talkback earpiece charged and tested", "arrival", "all"],
  ["Team huddle complete - all roles present", "arrival", "team-lead"],
  ["Final setlist confirmed with worship leader", "arrival", "team-lead"],
  ["Sermon notes and scripture references received", "arrival", "team-lead"],
  ["Special elements / announcements confirmed", "arrival", "team-lead"],
  ["Visitor welcome slides prepared", "arrival", "content"],
  ["Parking team radio check", "arrival", "all"],
  ["Emergency contacts list posted", "arrival", "team-lead"],
  // VIDEO (12)
  ["All PTZ cameras powered on and responding", "video", "camera-operator"],
  ["Camera presets recalled and verified", "video", "camera-operator"],
  ["Focus and exposure checked on all angles", "video", "camera-operator"],
  ["Camera joystick / controller functional", "video", "camera-operator"],
  ["Video router / switcher inputs confirmed", "video", "camera-operator"],
  ["Recording devices started and space verified", "video", "camera-operator"],
  ["ISO recording setup confirmed (if required)", "video", "camera-operator"],
  ["Confidence monitor feed checked", "video", "camera-operator"],
  ["Video return feed to stage working", "video", "camera-operator"],
  ["Camera operators briefed on shot list", "video", "camera-operator"],
  ["Spare batteries and SD cards available", "video", "camera-operator"],
  ["Video cables secured and labeled", "video", "camera-operator"],
  // STREAMING (12)
  ["vMix / OBS opened and project loaded", "streaming", "stream-operator"],
  ["All input sources connected and visible", "streaming", "stream-operator"],
  ["YouTube/Facebook stream key entered and tested", "streaming", "stream-operator"],
  ["Internet speed test passed (5+ Mbps upload)", "streaming", "stream-operator"],
  ["Backup internet connection verified (hotspot)", "streaming", "stream-operator"],
  ["Stream graphics / lower thirds loaded", "streaming", "stream-operator"],
  ["Bitrate and resolution settings confirmed", "streaming", "stream-operator"],
  ["Audio routed to stream mix correctly", "streaming", "stream-operator"],
  ["Stream title and description set", "streaming", "stream-operator"],
  ["Scheduled stream / go-live button ready", "streaming", "stream-operator"],
  ["Recording backup configured on local drive", "streaming", "stream-operator"],
  ["Moderator access shared with chat team", "streaming", "stream-operator"],
  // AUDIO (12)
  ["Soundboard / mixer powered on and scenes loaded", "audio", "sound-engineer"],
  ["All wireless microphones have fresh batteries", "audio", "sound-engineer"],
  ["Microphone frequencies scanned - no interference", "audio", "sound-engineer"],
  ["Line check completed - all inputs audible", "audio", "sound-engineer"],
  ["Stage monitor mixes set per musician request", "audio", "sound-engineer"],
  ["House EQ and compression dialed in", "audio", "sound-engineer"],
  ["Backup audio recorder armed and tested", "audio", "sound-engineer"],
  ["In-ear monitor system functional", "audio", "sound-engineer"],
  ["Sermon mic tested for plosives and proximity", "audio", "sound-engineer"],
  ["Playback / click track routed correctly", "audio", "sound-engineer"],
  ["Talkback channel to camera operators tested", "audio", "sound-engineer"],
  ["Emergency mute buttons functional", "audio", "sound-engineer"],
  // PRESENTATION (12)
  ["EasyWorship / ProPresenter opened and loaded", "presentation", "presentation"],
  ["All songs imported with correct lyrics and order", "presentation", "presentation"],
  ["Sermon slides created and proofread", "presentation", "presentation"],
  ["Announcement slides updated", "presentation", "presentation"],
  ["NDI output tested and received by switcher", "presentation", "presentation"],
  ["Confidence monitor output configured", "presentation", "presentation"],
  ["Slide transitions and animations verified", "presentation", "presentation"],
  ["Timer / countdown slide ready for service start", "presentation", "presentation"],
  ["Bible verses hyperlinked in sermon notes", "presentation", "presentation"],
  ["Run-through completed with worship team", "presentation", "presentation"],
  ["Backup laptop on standby (same slide deck)", "presentation", "presentation"],
  ["Lyrics operator briefed on song flow", "presentation", "presentation"],
  // GO LIVE (8)
  ["Pre-service countdown started on screens", "golive", "presentation"],
  ["Live stream started and health verified", "golive", "stream-operator"],
  ["Recording confirmed active on all devices", "golive", "camera-operator"],
  ["Team lead gives final 'all clear'", "golive", "team-lead"],
  ["House lights dimmed to service level", "golive", "lighting"],
  ["Stage lights checked - no dark spots", "golive", "lighting"],
  ["First camera preset on pastor / speaker", "golive", "camera-operator"],
  ["Sound levels set - house mix ready", "golive", "sound-engineer"],
  // DURING (10)
  ["Monitor stream health and bitrate throughout", "during", "stream-operator"],
  ["Follow camera shot list - wide / medium / close", "during", "camera-operator"],
  ["Advance lyrics on time with worship", "during", "presentation"],
  ["Monitor chat and relay prayer requests", "during", "stream-operator"],
  ["Photographer captures worship and sermon moments", "during", "photography"],
  ["Audio levels maintained - no clipping or dropouts", "during", "sound-engineer"],
  ["Lighting cues executed on transitions", "during", "lighting"],
  ["Take sermon notes for social media quotes", "during", "content"],
  ["Monitor backup recording continuously", "during", "camera-operator"],
  ["Team lead available for emergency decisions", "during", "team-lead"],
  // POST (10)
  ["Stream properly ended and archive verified", "post", "stream-operator"],
  ["Recording files backed up to storage", "post", "camera-operator"],
  ["Photos culled and edited within 2 hours", "post", "photography"],
  ["Social media post drafted and scheduled", "post", "content"],
  ["Sermon highlight clip identified for reels", "post", "content"],
  ["Equipment powered down and stored", "post", "all"],
  ["Microphone batteries removed for storage", "post", "sound-engineer"],
  ["Cable management and stage cleanup", "post", "all"],
  ["5-minute team debrief - what worked / didn't", "post", "team-lead"],
  ["Checklist reset for next Sunday", "post", "team-lead"],
];

async function seed() {
  const db = await connectMongo();

  // Seed checklist items
  const itemsCol = db.collection("checklist_items");
  const existing = await itemsCol.countDocuments();
  if (existing === 0) {
    const docs = await Promise.all(
      CHECKLIST_ITEMS.map(async ([text, phase, role]) => ({
        id: await getNextId("checklist_item"),
        text,
        phase,
        role,
        order: 0,
        createdAt: new Date(),
      }))
    );
    await itemsCol.insertMany(docs);
    console.log(`Seeded ${docs.length} checklist items.`);
  } else {
    console.log(`${existing} items already seeded.`);
  }

  // Seed default service time
  const settingsCol = db.collection("app_settings");
  const settingExists = await settingsCol.findOne({ key: "serviceTime" });
  if (!settingExists) {
    await settingsCol.insertOne({
      id: await getNextId("app_setting"),
      key: "serviceTime",
      value: "09:00",
      updatedAt: new Date(),
    });
    console.log("Default service time set.");
  }

  console.log("Database ready.");
}

seed().catch(console.error);
