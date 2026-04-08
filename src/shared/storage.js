export const STORAGE_KEYS = {
  calendarId: 'calendarId',
  calendarSummary: 'calendarSummary',
  lastAuthEmail: 'lastAuthEmail',
}

export async function getStoredSettings() {
  return chrome.storage.sync.get(Object.values(STORAGE_KEYS))
}

export async function saveCalendarSelection(calendar) {
  await chrome.storage.sync.set({
    [STORAGE_KEYS.calendarId]: calendar.id,
    [STORAGE_KEYS.calendarSummary]: calendar.summary,
  })
}

export async function saveAuthenticatedEmail(email) {
  await chrome.storage.sync.set({
    [STORAGE_KEYS.lastAuthEmail]: email || '',
  })
}

export async function clearAuthenticatedEmail() {
  await chrome.storage.sync.remove([STORAGE_KEYS.lastAuthEmail])
}

export async function clearStoredSettings() {
  await chrome.storage.sync.remove(Object.values(STORAGE_KEYS))
}
