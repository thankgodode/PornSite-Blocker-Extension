/*global chrome*/
const REDIRECT_URL = "https://www.reddit.com/r/NoFap/";

const DEFAULT_BLOCKED_DOMAINS = [
  "pornhub.com",
  "xvideos.com",
  "xnxx.com",
  "redtube.com",
  "youporn.com",
  "tube8.com",
  "xhamster.com",
  "spankbang.com",
  "porntrex.com",
  "tnaflix.com",
  "beeg.com",
  "txxx.com",
  "hclips.com",
  "hdzog.com",
  "porn.com",
  "sex.com",
  "adult.com",
  "brazzers.com",
  "bangbros.com",
  "realitykings.com",
];

// ── Streak helpers ──────────────────────────────────────────────────────────

async function getStreakData() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["streakStart", "lastActive", "broken"], (data) => {
      resolve({
        streakStart: data.streakStart || null,
        lastActive: data.lastActive || null,
        broken: data.broken || false,
      });
    });
  });
}

async function initStreakIfNeeded() {
  const { streakStart } = await getStreakData();
  if (!streakStart) {
    const now = Date.now();
    await chrome.storage.sync.set({
      streakStart: now,
      lastActive: now,
      broken: false,
    });
  }
}

async function recordActiveDay() {
  const now = Date.now();
  await chrome.storage.sync.set({ lastActive: now });
}

async function breakStreak() {
  const now = Date.now();
  await chrome.storage.sync.set({
    streakStart: now,
    lastActive: now,
    broken: true,
  });
}

// ── Blocklist rule management ───────────────────────────────────────────────

async function getBlockedDomains() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["customDomains", "removedDefaults"], (data) => {
      const custom = data.customDomains || [];
      const removed = data.removedDefaults || [];
      const defaults = DEFAULT_BLOCKED_DOMAINS.filter((d) => !removed.includes(d));
      resolve([...new Set([...defaults, ...custom])]);
    });
  });
}

async function rebuildRules() {
  const domains = await getBlockedDomains();

  // Remove all existing dynamic rules
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  console.log("EXISTING RULES:", existing);
  const existingIds = existing.map((r) => r.id);

  const newRules = domains.map((domain, i) => ({
    id: i + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { url: REDIRECT_URL },
    },
    condition: {
      urlFilter: `||${domain}`,
      resourceTypes: ["main_frame"],
    },
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingIds,
    addRules: newRules,
  });
}

// ── Install / startup ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  await initStreakIfNeeded();
  await rebuildRules();
  // Alarm to record daily activity check
  chrome.alarms.create("dailyCheck", { periodInMinutes: 60 });
});

chrome.runtime.onStartup.addListener(async () => {
  await initStreakIfNeeded();
  await rebuildRules();
});

// ── Daily alarm ─────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "dailyCheck") {
    await recordActiveDay();
  }
});

// ── Message handler (from popup) ────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === "GET_STATE") {
      const domains = await getBlockedDomains();
      const streak = await getStreakData();
      const days = streak.streakStart
        ? Math.floor((Date.now() - streak.streakStart) / 86400000)
        : 0;
      sendResponse({
        domains,
        defaultDomains: DEFAULT_BLOCKED_DOMAINS,
        days,
        broken: streak.broken,
        streakStart: streak.streakStart,
      });
    }

    if (message.type === "ADD_DOMAIN") {
      const data = await new Promise((r) =>
        chrome.storage.sync.get(["customDomains"], r)
      );
      const custom = data.customDomains || [];
      if (!custom.includes(message.domain)) {
        custom.push(message.domain);
        await chrome.storage.sync.set({ customDomains: custom });
        await rebuildRules();
      }
      sendResponse({ ok: true });
    }

    if (message.type === "REMOVE_DOMAIN") {
      const data = await new Promise((r) =>
        chrome.storage.sync.get(["customDomains", "removedDefaults"], r)
      );
      const custom = (data.customDomains || []).filter(
        (d) => d !== message.domain
      );
      const removed = data.removedDefaults || [];
      if (DEFAULT_BLOCKED_DOMAINS.includes(message.domain) && !removed.includes(message.domain)) {
        removed.push(message.domain);
        await chrome.storage.sync.set({ removedDefaults: removed });
      }
      await chrome.storage.sync.set({ customDomains: custom });
      await rebuildRules();
      sendResponse({ ok: true });
    }

    if (message.type === "RESET_STREAK") {
      await breakStreak();
      sendResponse({ ok: true });
    }

    if (message.type === "RESTART_STREAK") {
      const now = Date.now();
      await chrome.storage.sync.set({
        streakStart: now,
        lastActive: now,
        broken: false,
      });
      sendResponse({ ok: true });
    }
  })();
  return true; // keep message channel open for async
});
