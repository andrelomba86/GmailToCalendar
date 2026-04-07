import { createCalendarEvent, listCalendars, toCalendarEvent } from './calendar-api.js'
import {
  STORAGE_KEYS,
  clearAuthenticatedEmail,
  getStoredSettings,
  saveAuthenticatedEmail,
} from '../shared/storage.js'

function isOAuthConfigured() {
  const manifest = chrome.runtime.getManifest()
  return (
    manifest.oauth2 &&
    manifest.oauth2.client_id &&
    !manifest.oauth2.client_id.startsWith('YOUR_GOOGLE_CLIENT_ID')
  )
}

async function getAuthToken(interactive = true) {
  if (!isOAuthConfigured()) {
    throw new Error('Configure o client_id OAuth no manifest.json antes de autenticar.')
  }

  const authResult = await chrome.identity.getAuthToken({ interactive })
  const token = typeof authResult === 'string' ? authResult : authResult?.token
  if (!token) {
    throw new Error('Nao foi possivel obter token de autenticacao.')
  }

  return token
}

async function revokeCachedToken() {
  try {
    const token = await chrome.identity.getAuthToken({ interactive: false })
    const rawToken = typeof token === 'string' ? token : token?.token
    if (rawToken) {
      await chrome.identity.removeCachedAuthToken({ token: rawToken })
    }
  } catch {}
}

async function clearCachedAuthTokens() {
  if (typeof chrome.identity.clearAllCachedAuthTokens === 'function') {
    await chrome.identity.clearAllCachedAuthTokens()
    return
  }

  await revokeCachedToken()
}

async function fetchGoogleProfile(token) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Falha ao consultar o perfil autenticado.')
  }

  return response.json()
}

async function withFreshToken(work) {
  try {
    const token = await getAuthToken(true)
    return await work(token)
  } catch (error) {
    if (!String(error.message || error).includes('401')) {
      throw error
    }

    await revokeCachedToken()
    const token = await getAuthToken(true)
    return work(token)
  }
}

async function handleAuthStatus() {
  const settings = await getStoredSettings()
  return {
    isConfigured: isOAuthConfigured(),
    isAuthenticated: Boolean(settings[STORAGE_KEYS.lastAuthEmail]),
    email: settings[STORAGE_KEYS.lastAuthEmail] || '',
  }
}

async function handleLogin() {
  const switchAccount = true

  if (switchAccount) {
    await clearCachedAuthTokens()
    await clearAuthenticatedEmail()
  }

  try {
    const token = await getAuthToken(true)
    const profile = await fetchGoogleProfile(token)
    await saveAuthenticatedEmail(profile.email || '')

    return {
      email: profile.email || '',
    }
  } catch (error) {
    const message = String(error?.message || error || '')

    if (message.includes('not a valid origin for the client')) {
      throw new Error(
        'Client OAuth invalido para extensao Chrome. Confira tipo de credencial e Application ID.',
      )
    }

    if (message.includes('OAuth2 request failed')) {
      throw new Error(
        'Falha no OAuth. Verifique se esta conta esta em Usuarios de teste e se a Calendar API esta ativada no projeto.',
      )
    }

    if (message.includes('The user did not approve access')) {
      throw new Error('A autorizacao foi cancelada.')
    }

    throw error
  }
}

async function handleListCalendars() {
  return withFreshToken(async token => {
    const calendars = await listCalendars(token)
    return calendars.map(calendar => ({
      id: calendar.id,
      summary: calendar.summary,
      primary: Boolean(calendar.primary),
      accessRole: calendar.accessRole,
    }))
  })
}

async function handleCreateEvents(payload) {
  const settings = await getStoredSettings()
  const calendarId = settings[STORAGE_KEYS.calendarId]

  if (!calendarId) {
    throw new Error('Nenhuma agenda foi configurada. Abra as opcoes da extensao e escolha uma agenda.')
  }

  const selectedDeadlines = (payload.deadlines || []).filter(deadline => deadline.selected)
  if (!selectedDeadlines.length) {
    throw new Error('Nenhum prazo foi selecionado para criacao.')
  }

  return withFreshToken(async token => {
    const created = []
    for (const deadline of selectedDeadlines) {
      const event = toCalendarEvent(payload.email, deadline)
      const result = await createCalendarEvent(token, calendarId, event)
      created.push({
        id: result.id,
        htmlLink: result.htmlLink,
        summary: result.summary,
      })
    }

    return {
      createdCount: created.length,
      created,
    }
  })
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  ;(async () => {
    switch (message?.type) {
      case 'AUTH_STATUS':
        sendResponse({ ok: true, data: await handleAuthStatus() })
        return
      case 'LOGIN':
        sendResponse({ ok: true, data: await handleLogin() })
        return
      case 'LIST_CALENDARS':
        sendResponse({ ok: true, data: await handleListCalendars() })
        return
      case 'CREATE_EVENTS':
        sendResponse({ ok: true, data: await handleCreateEvents(message.payload) })
        return
      default:
        sendResponse({ ok: false, error: 'Mensagem nao suportada.' })
    }
  })().catch(error => {
    sendResponse({ ok: false, error: error.message || 'Erro desconhecido.' })
  })

  return true
})
