const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

async function fetchWithToken(path, token, options = {}) {
  const response = await fetch(`${CALENDAR_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Google Calendar API falhou: ${response.status} ${text}`)
  }

  return response.json()
}

export async function listCalendars(token) {
  const result = await fetchWithToken('/users/me/calendarList', token)
  return result.items || []
}

export async function createCalendarEvent(token, calendarId, event) {
  return fetchWithToken(`/calendars/${encodeURIComponent(calendarId)}/events`, token, {
    method: 'POST',
    body: JSON.stringify(event),
  })
}

export function toCalendarEvent(email, deadline) {
  const descriptionParts = [
    `Origem: ${email.subject || 'Sem assunto'}`,
    email.from ? `Remetente: ${email.from}` : '',
    deadline.sourceText ? `Trecho detectado: ${deadline.sourceText}` : '',
    email.link ? `Thread: ${email.link}` : '',
    email.snippet ? `\n${email.snippet}` : '',
  ].filter(Boolean)

  const baseEvent = {
    summary: deadline.title || email.subject || 'Prazo detectado no Gmail',
    description: descriptionParts.join('\n'),
    source: email.link
      ? {
          title: 'Gmail',
          url: email.link,
        }
      : undefined,
  }

  if (deadline.allDay) {
    return {
      ...baseEvent,
      start: { date: deadline.date },
      end: { date: deadline.endDate || deadline.date },
    }
  }

  return {
    ...baseEvent,
    start: {
      dateTime: deadline.dateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: deadline.endDateTime || deadline.dateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  }
}
