import { STORAGE_KEYS, getStoredSettings, saveCalendarSelection } from '../shared/storage.js'

const accountPill = document.getElementById('accountPill')
const statusText = document.getElementById('statusText')
const errorText = document.getElementById('errorText')
const loginButton = document.getElementById('loginButton')
const reloadButton = document.getElementById('reloadButton')
const calendarSelect = document.getElementById('calendarSelect')
const saveButton = document.getElementById('saveButton')
const selectionStatus = document.getElementById('selectionStatus')

let calendars = []

async function sendMessage(type, payload) {
  const response = await chrome.runtime.sendMessage({ type, payload })
  if (!response?.ok) {
    throw new Error(response?.error || 'Falha na comunicacao com a extensao.')
  }

  return response.data
}

function setLoadingState(isLoading) {
  loginButton.disabled = isLoading
  reloadButton.disabled = isLoading
  saveButton.disabled = isLoading || !calendarSelect.value
}

function setError(message = '') {
  errorText.hidden = !message
  errorText.textContent = message
}

function renderCalendars(selectedCalendarId) {
  calendarSelect.innerHTML = ''

  if (!calendars.length) {
    const option = document.createElement('option')
    option.value = ''
    option.textContent = 'Nenhuma agenda disponivel'
    calendarSelect.append(option)
    calendarSelect.disabled = true
    saveButton.disabled = true
    return
  }

  const placeholder = document.createElement('option')
  placeholder.value = ''
  placeholder.textContent = 'Selecione uma agenda'
  calendarSelect.append(placeholder)

  calendars.forEach(calendar => {
    const option = document.createElement('option')
    option.value = calendar.id
    option.textContent = calendar.primary ? `${calendar.summary} (principal)` : calendar.summary
    if (calendar.id === selectedCalendarId) {
      option.selected = true
    }
    calendarSelect.append(option)
  })

  calendarSelect.disabled = false
  saveButton.disabled = !calendarSelect.value
}

async function loadStatus() {
  const authStatus = await sendMessage('AUTH_STATUS')
  const settings = await getStoredSettings()

  if (!authStatus.isConfigured) {
    accountPill.textContent = 'OAuth nao configurado'
    statusText.textContent = 'Edite o client_id em manifest.json antes de autenticar.'
    calendarSelect.disabled = true
    return
  }

  accountPill.textContent = authStatus.email ? `Conectado: ${authStatus.email}` : 'Pronto para autenticar'
  statusText.textContent = authStatus.email
    ? 'Autenticacao pronta. Voce pode recarregar as agendas e escolher a agenda fixa.'
    : 'Faça login para listar as agendas disponiveis.'
  loginButton.textContent = authStatus.email ? 'Trocar conta Google' : 'Entrar com Google'

  if (settings[STORAGE_KEYS.calendarSummary]) {
    selectionStatus.textContent = `Agenda atual: ${settings[STORAGE_KEYS.calendarSummary]}`
  }
}

async function loadCalendars() {
  setLoadingState(true)
  setError('')

  try {
    const settings = await getStoredSettings()
    calendars = await sendMessage('LIST_CALENDARS')
    renderCalendars(settings[STORAGE_KEYS.calendarId])
    statusText.textContent = `${calendars.length} agenda(s) carregada(s).`
  } catch (error) {
    setError(error.message)
    statusText.textContent = 'Nao foi possivel carregar as agendas.'
  } finally {
    setLoadingState(false)
  }
}

loginButton.addEventListener('click', async () => {
  setLoadingState(true)
  setError('')

  try {
    const result = await sendMessage('LOGIN')
    accountPill.textContent = `Conectado: ${result.email}`
    loginButton.textContent = 'Trocar conta Google'
    statusText.textContent = 'Autenticacao concluida. Agora carregue as agendas.'
    await loadCalendars()
  } catch (error) {
    setError(error.message)
  } finally {
    setLoadingState(false)
  }
})

reloadButton.addEventListener('click', async () => {
  await loadCalendars()
})

calendarSelect.addEventListener('change', () => {
  saveButton.disabled = !calendarSelect.value
})

saveButton.addEventListener('click', async () => {
  const selectedCalendar = calendars.find(calendar => calendar.id === calendarSelect.value)
  if (!selectedCalendar) {
    return
  }

  await saveCalendarSelection(selectedCalendar)
  selectionStatus.textContent = `Agenda atual: ${selectedCalendar.summary}`
})

window.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadStatus()
  } catch (error) {
    setError(error.message)
    statusText.textContent = 'Falha ao consultar o estado da extensao.'
  }
})
