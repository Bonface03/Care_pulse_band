import './style.css'
import Chart from 'chart.js/auto'
import { io } from 'socket.io-client'

// --- State ---
let authToken = localStorage.getItem('carepulse_token')
let currentMode = 'login' // 'login' or 'register'
let socket = null
let vitalsChart = null

// --- DOM Elements ---
const authScreen = document.getElementById('auth-screen')
const dashboardScreen = document.getElementById('dashboard-screen')
const tabLogin = document.getElementById('tab-login')
const tabRegister = document.getElementById('tab-register')
const authForm = document.getElementById('auth-form')
const authSubmitBtn = document.getElementById('auth-submit')
const authError = document.getElementById('auth-error')
const usernameInput = document.getElementById('username')
const passwordInput = document.getElementById('password')
const logoutBtn = document.getElementById('logout-btn')

// Vitals DOM
const spo2Value = document.getElementById('spo2-value')
const hrValue = document.getElementById('hr-value')
const bgValue = document.getElementById('bg-value')
const fallValue = document.getElementById('fall-value')
const spo2Status = document.getElementById('spo2-status')
const hrStatus = document.getElementById('hr-status')
const bgStatus = document.getElementById('bg-status')
const fallStatus = document.getElementById('fall-status')
const refreshHistoryBtn = document.getElementById('refresh-history-btn')
const historyBody = document.getElementById('history-body')

const IS_DEV = window.location.hostname === 'localhost' && window.location.port === '5173';
const API_BASE = IS_DEV ? 'http://localhost:3000' : window.location.origin;
const API_URL = `${API_BASE}/api`;

// --- Initialization ---
function init() {
  if (authToken) {
    showDashboard()
  } else {
    showAuth()
  }
}

// --- Navigation ---
function showAuth() {
  authScreen.classList.add('active')
  dashboardScreen.classList.remove('active')
  if (socket) socket.disconnect()
}

function showDashboard() {
  authScreen.classList.remove('active')
  dashboardScreen.classList.add('active')
  initChart()
  connectSocket()
  fetchHistory()
}

// --- Auth Logic ---
tabLogin.addEventListener('click', () => {
  currentMode = 'login'
  tabLogin.classList.add('active')
  tabRegister.classList.remove('active')
  authSubmitBtn.innerHTML = 'SECURE LOGIN <i class="ri-arrow-right-line"></i>'
  authError.textContent = ''
})

tabRegister.addEventListener('click', () => {
  currentMode = 'register'
  tabRegister.classList.add('active')
  tabLogin.classList.remove('active')
  authSubmitBtn.innerHTML = 'REGISTER ACCOUNT <i class="ri-user-add-line"></i>'
  authError.textContent = ''
})

authForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  authError.textContent = ''
  
  const username = usernameInput.value
  const password = passwordInput.value
  
  try {
    const endpoint = currentMode === 'login' ? '/auth/login' : '/auth/register'
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    
    const data = await res.json()
    
    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed')
    }
    
    if (currentMode === 'register') {
      // Auto switch to login
      currentMode = 'login'
      tabLogin.click()
      authError.style.color = 'var(--success-color)'
      authError.textContent = 'Registration successful. Please login.'
      passwordInput.value = ''
    } else {
      // Login success
      authToken = data.token
      localStorage.setItem('carepulse_token', authToken)
      usernameInput.value = ''
      passwordInput.value = ''
      showDashboard()
    }
  } catch (err) {
    authError.style.color = 'var(--error-color)'
    authError.textContent = err.message
  }
})

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('carepulse_token')
  authToken = null
  showAuth()
})

// --- Dashboard & Socket Logic ---
function connectSocket() {
  if (socket) socket.disconnect()
  
  socket = io(API_BASE, {
    auth: { token: authToken }
  })
  
  socket.on('connect', () => {
    console.log('Connected to real-time vitals stream')
    spo2Status.textContent = 'Live'
    hrStatus.textContent = 'Live'
    bgStatus.textContent = 'Live'
    fallStatus.textContent = 'Live'
  })
  
  socket.on('vitals_update', (data) => {
    updateVitalsUI(data)
    updateChart(data)
  })
  
  socket.on('connect_error', (err) => {
    console.error('Socket error:', err)
    if (err.message === 'Authentication error') {
      logoutBtn.click() // Force logout if token invalid
    }
  })
}

function updateVitalsUI(data) {
  if (data.spo2) spo2Value.textContent = data.spo2
  if (data.heart_rate) hrValue.textContent = data.heart_rate
  if (data.blood_glucose) bgValue.textContent = data.blood_glucose
  if (data.fall_status !== undefined) {
    fallValue.textContent = data.fall_status
    if (data.fall_status.toLowerCase() === 'abnormal') {
      fallValue.style.color = 'var(--error-color)'
      fallStatus.textContent = 'Alert'
      fallStatus.style.color = 'var(--error-color)'
    } else {
      fallValue.style.color = 'var(--text-primary)'
      fallStatus.textContent = 'Normal'
      fallStatus.style.color = 'var(--success-color)'
    }
  }
}

// --- History Logic ---
async function fetchHistory() {
  try {
    historyBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading data...</td></tr>'
    const res = await fetch(`${API_URL}/data/history`, {
      headers: { 'Authorization': `Bearer ${authToken}` } // Although not strictly required by backend yet
    })
    
    if (!res.ok) throw new Error('Failed to fetch history')
    
    const data = await res.json()
    
    if (data.length === 0) {
      historyBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No history available</td></tr>'
      return
    }
    
    historyBody.innerHTML = ''
    data.forEach(row => {
      const tr = document.createElement('tr')
      const timeStr = new Date(row.timestamp).toLocaleString()
      tr.innerHTML = `
        <td>${timeStr}</td>
        <td>${row.spo2 || '--'}</td>
        <td>${row.heart_rate || '--'}</td>
        <td>${row.blood_glucose || '--'}</td>
        <td>${row.fall_status || '--'}</td>
      `
      historyBody.appendChild(tr)
    })
  } catch (err) {
    console.error('Error fetching history:', err)
    historyBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--error-color);">Error loading history</td></tr>'
  }
}

refreshHistoryBtn.addEventListener('click', fetchHistory)

// --- Charting ---
function initChart() {
  const ctx = document.getElementById('vitalsChart').getContext('2d')
  
  if (vitalsChart) vitalsChart.destroy()
  
  Chart.defaults.color = '#949bb2'
  Chart.defaults.font.family = 'Inter'
  
  vitalsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'SpO2 (%)',
          borderColor: '#00d2ff',
          backgroundColor: 'rgba(0, 210, 255, 0.1)',
          data: [],
          tension: 0.4,
          fill: true
        },
        {
          label: 'Heart Rate (bpm)',
          borderColor: '#ff4b4b',
          backgroundColor: 'rgba(255, 75, 75, 0.1)',
          data: [],
          tension: 0.4,
          fill: true
        },
        {
          label: 'Blood Glucose (mg/dL)',
          borderColor: '#ffd700',
          backgroundColor: 'rgba(255, 215, 0, 0.1)',
          data: [],
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          min: 40,
          max: 180
        }
      },
      animation: { duration: 0 } // Disable animation for live data
    }
  })
}

function updateChart(data) {
  if (!vitalsChart) return
  
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  
  vitalsChart.data.labels.push(now)
  vitalsChart.data.datasets[0].data.push(data.spo2 || null)
  vitalsChart.data.datasets[1].data.push(data.heart_rate || null)
  vitalsChart.data.datasets[2].data.push(data.blood_glucose || null)
  
  // Keep only last 20 data points
  if (vitalsChart.data.labels.length > 20) {
    vitalsChart.data.labels.shift()
    vitalsChart.data.datasets[0].data.shift()
    vitalsChart.data.datasets[1].data.shift()
    vitalsChart.data.datasets[2].data.shift()
  }
  
  vitalsChart.update()
}

// Start
init()
