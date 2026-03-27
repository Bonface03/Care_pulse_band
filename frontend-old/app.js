// DOM Elements
const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const welcomeMessage = document.getElementById('welcomeMessage');
const updateTimeElement = document.getElementById('updateTime');

// Tab elements
const homeTab = document.getElementById('homeTab');
const aboutTab = document.getElementById('aboutTab');
const productsTab = document.getElementById('productsTab');
const contactTab = document.getElementById('contactTab');
const livestreamTab = document.getElementById('livestreamTab');

// Card elements
const homeCard = document.getElementById('home');
const aboutCard = document.getElementById('about');
const productsCard = document.getElementById('products');
const contactCard = document.getElementById('contact');
const livestreamCard = document.getElementById('livestream');
const adminControlsCard = document.getElementById('adminControls');

// Search elements
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');

// ============ STREAMING VARIABLES ============
let streamInterval = null;
let isStreaming = false;
let esp32IP = "";
let frameTimes = [];

// ============ STREAMING ELEMENTS ============
// These will be initialized when needed
let startStreamBtn = null;
let stopStreamBtn = null;
let captureBtn = null;
let streamPlaceholder = null;
let streamDisplay = null;
let streamLoading = null;
let cameraStream = null;
let connectionStatus = null;
let streamStats = null;
let esp32IPInput = null;
let detectBtn = null;
let qualitySelect = null;
let resolutionSelect = null;
let fpsSelect = null;
let liveIndicator = null;
let resolutionIndicator = null;
let deviceIP = null;
let streamQuality = null;
let photoPreview = null;
let capturedPhoto = null;
let downloadBtn = null;
let closePreviewBtn = null;
let toggleLEDBtn = null;
let rebootBtn = null;
let calibrateBtn = null;

// Initialize the application
function init() {
    console.log('VTA Surgery Dashboard initialized');

    // Set up event listeners
    setupEventListeners();

    // Always show login page first
    loginPage.style.display = 'flex';
    dashboardPage.style.display = 'none';

    // Focus on username input
    usernameInput.focus();

    // Start time updater
    updateTime();
    setInterval(updateTime, 60000); // Update every minute
}

// Set up all event listeners
function setupEventListeners() {
    // Login button
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }

    // Logout button
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Tab navigation
    if (homeTab) homeTab.addEventListener('click', () => switchTab('home'));
    if (aboutTab) aboutTab.addEventListener('click', () => switchTab('about'));
    if (productsTab) productsTab.addEventListener('click', () => switchTab('products'));
    if (contactTab) contactTab.addEventListener('click', () => switchTab('contact'));
    if (livestreamTab) livestreamTab.addEventListener('click', handleLivestreamTab);

    // Search functionality
    if (searchButton) {
        searchButton.addEventListener('click', handleSearch);
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }

    // Handle Enter key in password field
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
}

// Update current time
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString();

    if (updateTimeElement) {
        updateTimeElement.textContent = `${dateString} ${timeString}`;
    }
}

// Handle login
function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    console.log('Login attempt for:', username);

    // Basic validation
    if (!username) {
        alert('Please enter username');
        usernameInput.focus();
        return;
    }

    if (!password) {
        alert('Please enter password');
        passwordInput.focus();
        return;
    }

    // Determine user role
    const isAdmin = username.toLowerCase() === 'admin';
    const role = isAdmin ? 'Administrator' : 'Medical Staff';

    // Update welcome message
    if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome, ${username}! You are now logged in as ${role}.`;
    }

    // Show admin controls if admin
    if (adminControlsCard) {
        adminControlsCard.style.display = isAdmin ? 'block' : 'none';
    }

    // Hide login page, show dashboard
    loginPage.style.display = 'none';
    dashboardPage.style.display = 'block';

    // Reset login form
    usernameInput.value = '';
    passwordInput.value = '';

    // Show home tab by default
    switchTab('home');

    // Update time
    updateTime();

    console.log(`User ${username} logged in successfully as ${role}`);
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Stop any active stream
        if (isStreaming) {
            stopStream();
        }

        // Show login page, hide dashboard
        loginPage.style.display = 'flex';
        dashboardPage.style.display = 'none';

        // Reset to home tab
        switchTab('home');

        // Focus on username field
        usernameInput.focus();

        console.log('User logged out');
    }
}

// Handle livestream tab click
function handleLivestreamTab() {
    switchTab('livestream');
    initStreaming(); // Initialize streaming only when tab is clicked
}

// Initialize streaming functionality
function initStreaming() {
    // Don't re-initialize if already done
    if (window.streamingInitialized) return;

    console.log('Initializing streaming functionality...');

    // Get streaming elements
    startStreamBtn = document.getElementById('startStreamBtn');
    stopStreamBtn = document.getElementById('stopStreamBtn');
    captureBtn = document.getElementById('captureBtn');
    streamPlaceholder = document.getElementById('streamPlaceholder');
    streamDisplay = document.getElementById('streamDisplay');
    streamLoading = document.getElementById('streamLoading');
    cameraStream = document.getElementById('cameraStream');
    connectionStatus = document.getElementById('connectionStatus');
    streamStats = document.getElementById('streamStats');
    esp32IPInput = document.getElementById('esp32IP');
    detectBtn = document.getElementById('detectBtn');
    qualitySelect = document.getElementById('qualitySelect');
    resolutionSelect = document.getElementById('resolutionSelect');
    fpsSelect = document.getElementById('fpsSelect');
    liveIndicator = document.getElementById('liveIndicator');
    resolutionIndicator = document.getElementById('resolutionIndicator');
    deviceIP = document.getElementById('deviceIP');
    streamQuality = document.getElementById('streamQuality');
    photoPreview = document.getElementById('photoPreview');
    capturedPhoto = document.getElementById('capturedPhoto');
    downloadBtn = document.getElementById('downloadBtn');
    closePreviewBtn = document.getElementById('closePreviewBtn');
    toggleLEDBtn = document.getElementById('toggleLEDBtn');
    rebootBtn = document.getElementById('rebootBtn');
    calibrateBtn = document.getElementById('calibrateBtn');

    // Check if streaming elements exist
    if (!startStreamBtn) {
        console.error('Streaming elements not found!');
        return;
    }

    // Try to get saved ESP32 IP
    const savedIP = localStorage.getItem('esp32IP');
    if (savedIP && esp32IPInput) {
        esp32IPInput.value = savedIP;
        esp32IP = savedIP;
    }

    // Set up streaming event listeners
    detectBtn?.addEventListener('click', detectESP32);
    startStreamBtn.addEventListener('click', startStream);
    stopStreamBtn.addEventListener('click', stopStream);
    captureBtn?.addEventListener('click', capturePhoto);

    // Quality controls
    qualitySelect?.addEventListener('change', updateStreamQuality);
    resolutionSelect?.addEventListener('change', updateStreamQuality);
    fpsSelect?.addEventListener('change', updateStreamQuality);

    // Photo preview controls
    closePreviewBtn?.addEventListener('click', () => {
        if (photoPreview) photoPreview.style.display = 'none';
    });

    downloadBtn?.addEventListener('click', downloadPhoto);

    // Admin controls
    toggleLEDBtn?.addEventListener('click', toggleLED);
    rebootBtn?.addEventListener('click', rebootDevice);
    calibrateBtn?.addEventListener('click', calibrateCamera);

    // Handle image load errors
    if (cameraStream) {
        cameraStream.addEventListener('error', function () {
            if (isStreaming) {
                console.log('Stream frame error, retrying...');
                setTimeout(() => {
                    if (isStreaming) {
                        const quality = qualitySelect ? qualitySelect.value : '10';
                        const resolution = resolutionSelect ? resolutionSelect.value : '5';
                        loadFrame(quality, resolution);
                    }
                }, 1000);
            }
        });
    }

    // Handle page visibility change
    document.addEventListener('visibilitychange', function () {
        if (document.hidden && isStreaming) {
            // Pause stream when tab is not visible
            if (streamInterval) {
                clearInterval(streamInterval);
                streamInterval = null;
            }
        } else if (!document.hidden && isStreaming) {
            // Resume stream when tab becomes visible
            const quality = qualitySelect ? qualitySelect.value : '10';
            const resolution = resolutionSelect ? resolutionSelect.value : '5';
            const fps = fpsSelect ? fpsSelect.value : '50';
            updateStream(quality, resolution, fps);
        }
    });

    window.streamingInitialized = true;
    console.log('Streaming functionality initialized');
}

// Auto-detect ESP32 on local network
async function detectESP32() {
    showNotification('Scanning network for ESP32...', 'info');

    // Try common ESP32-CAM IP addresses
    const commonIPs = [
        '192.168.1.100',
        '192.168.1.101',
        '192.168.1.102',
        '192.168.4.1',  // ESP32 AP mode
        '192.168.0.100',
        '192.168.0.101',
        '192.168.137.100'  // For USB tethering
    ];

    for (const ip of commonIPs) {
        try {
            // Create a test image
            const testImg = new Image();
            testImg.src = `http://${ip}/stream?q=20&r=10&t=${Date.now()}`;

            // Wait for image to load or timeout
            await new Promise((resolve, reject) => {
                testImg.onload = () => resolve(true);
                testImg.onerror = () => reject();
                setTimeout(() => reject(), 1000);
            });

            // If we get here, ESP32 found
            esp32IP = ip;
            if (esp32IPInput) {
                esp32IPInput.value = ip;
            }
            localStorage.setItem('esp32IP', ip);
            showNotification(`Found ESP32 at ${ip}`, 'success');
            return;

        } catch (e) {
            continue;
        }
    }

    showNotification('Could not auto-detect ESP32. Please enter IP manually.', 'error');
}

// Start the ESP32 stream
async function startStream() {
    if (!esp32IPInput) return;

    const ip = esp32IPInput.value.trim();

    if (!ip) {
        showNotification('Please enter ESP32 IP address', 'error');
        return;
    }

    esp32IP = ip;

    // Save IP for future use
    localStorage.setItem('esp32IP', esp32IP);

    // Show loading
    if (streamPlaceholder) streamPlaceholder.style.display = 'none';
    if (streamLoading) streamLoading.style.display = 'flex';

    try {
        // Test connection
        const testImg = new Image();
        const testPromise = new Promise((resolve, reject) => {
            testImg.onload = () => resolve(true);
            testImg.onerror = () => reject(new Error('Cannot connect to ESP32'));
            setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });

        testImg.src = `http://${esp32IP}/stream?q=20&r=10&t=${Date.now()}`;
        await testPromise;

        // Update device info
        if (deviceIP) deviceIP.textContent = `IP: ${esp32IP}`;

        // Start the stream
        if (streamPlaceholder) streamPlaceholder.style.display = 'none';
        if (streamLoading) streamLoading.style.display = 'none';
        if (streamDisplay) streamDisplay.style.display = 'block';

        const quality = qualitySelect ? qualitySelect.value : '10';
        const resolution = resolutionSelect ? resolutionSelect.value : '5';
        const fps = fpsSelect ? fpsSelect.value : '50';

        // Update indicators
        if (resolutionIndicator) resolutionIndicator.textContent = getResolutionName(resolution);
        if (streamQuality) streamQuality.textContent = `Quality: ${getQualityName(quality)}`;

        // Start streaming
        updateStream(quality, resolution, fps);

        // Update UI
        if (startStreamBtn) startStreamBtn.disabled = true;
        if (stopStreamBtn) stopStreamBtn.disabled = false;
        if (captureBtn) captureBtn.disabled = false;
        isStreaming = true;

        // Update connection status
        if (connectionStatus) {
            connectionStatus.innerHTML = `
                <i class="fas fa-circle status-online"></i>
                Connected
            `;
        }

        showNotification('Stream started successfully', 'success');

    } catch (error) {
        console.error('Stream start error:', error);
        showNotification(`Connection failed: ${error.message}`, 'error');

        // Reset UI
        if (streamPlaceholder) streamPlaceholder.style.display = 'block';
        if (streamLoading) streamLoading.style.display = 'none';
        if (streamDisplay) streamDisplay.style.display = 'none';
    }
}

// Update stream with current settings
function updateStream(quality, resolution, fps) {
    if (streamInterval) {
        clearInterval(streamInterval);
    }

    // Load first frame
    loadFrame(quality, resolution);

    // Set up interval for streaming
    streamInterval = setInterval(() => {
        loadFrame(quality, resolution);
        updateStreamStats();
    }, parseInt(fps));
}

// Load a single frame
function loadFrame(quality, resolution) {
    if (!cameraStream) return;

    const timestamp = Date.now();
    cameraStream.src = `http://${esp32IP}/stream?q=${quality}&r=${resolution}&t=${timestamp}`;

    // Record frame time for stats
    frameTimes.push(performance.now());
    if (frameTimes.length > 30) {
        frameTimes.shift();
    }
}

// Update streaming statistics
function updateStreamStats() {
    if (!streamStats) return;

    if (frameTimes.length > 1) {
        const times = [];
        for (let i = 1; i < frameTimes.length; i++) {
            times.push(frameTimes[i] - frameTimes[i - 1]);
        }

        const avgDelay = Math.round(times.reduce((a, b) => a + b) / times.length);
        const avgFPS = Math.round(1000 / avgDelay);

        streamStats.textContent = `FPS: ${avgFPS} | Delay: ${avgDelay}ms`;
    }
}

// Stop the stream
function stopStream() {
    if (streamInterval) {
        clearInterval(streamInterval);
        streamInterval = null;
    }

    isStreaming = false;

    // Reset UI
    if (streamDisplay) streamDisplay.style.display = 'none';
    if (streamPlaceholder) streamPlaceholder.style.display = 'block';

    if (startStreamBtn) startStreamBtn.disabled = false;
    if (stopStreamBtn) stopStreamBtn.disabled = true;
    if (captureBtn) captureBtn.disabled = true;

    if (connectionStatus) {
        connectionStatus.innerHTML = `
            <i class="fas fa-circle status-offline"></i>
            Disconnected
        `;
    }

    if (streamStats) streamStats.textContent = 'FPS: -- | Delay: --ms';

    showNotification('Stream stopped', 'info');
}

// Update stream quality
function updateStreamQuality() {
    if (isStreaming && streamInterval) {
        const quality = qualitySelect ? qualitySelect.value : '10';
        const resolution = resolutionSelect ? resolutionSelect.value : '5';
        const fps = fpsSelect ? fpsSelect.value : '50';

        updateStream(quality, resolution, fps);
        showNotification('Stream quality updated', 'info');
    }
}

// Capture a photo
async function capturePhoto() {
    if (!isStreaming) return;

    const resolution = resolutionSelect ? resolutionSelect.value : '5';
    const timestamp = Date.now();

    try {
        showNotification('Capturing photo...', 'info');

        // Capture high quality photo
        if (capturedPhoto) {
            capturedPhoto.src = `http://${esp32IP}/capture?q=2&r=${resolution}&t=${timestamp}`;
        }

        // Show preview
        if (photoPreview) {
            photoPreview.style.display = 'flex';
        }

        showNotification('Photo captured!', 'success');

    } catch (error) {
        console.error('Capture error:', error);
        showNotification('Failed to capture photo', 'error');
    }
}

// Download captured photo
function downloadPhoto() {
    if (!capturedPhoto || !capturedPhoto.src) return;

    const link = document.createElement('a');
    link.href = capturedPhoto.src;
    link.download = `esp32-capture-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Helper functions for streaming
function getResolutionName(res) {
    const resolutions = {
        '10': 'QVGA',
        '8': 'VGA',
        '7': 'SVGA',
        '6': 'XGA',
        '5': 'HD',
        '3': 'UXGA'
    };
    return resolutions[res] || 'Unknown';
}

function getQualityName(q) {
    const qualities = {
        '20': 'Fast',
        '15': 'Balanced',
        '10': 'Good',
        '5': 'High',
        '2': 'Best'
    };
    return qualities[q] || 'Unknown';
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    // Add to body
    document.body.appendChild(notification);

    // Show with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// ============ EXISTING FUNCTIONS ============

// Switch between tabs
function switchTab(tabId) {
    console.log('Switching to tab:', tabId);

    // Remove active class from all tabs
    [homeTab, aboutTab, productsTab, contactTab, livestreamTab].forEach(tab => {
        if (tab) tab.classList.remove('active');
    });

    // Add active class to clicked tab
    switch (tabId) {
        case 'home':
            if (homeTab) homeTab.classList.add('active');
            break;
        case 'about':
            if (aboutTab) aboutTab.classList.add('active');
            break;
        case 'products':
            if (productsTab) productsTab.classList.add('active');
            break;
        case 'contact':
            if (contactTab) contactTab.classList.add('active');
            break;
        case 'livestream':
            if (livestreamTab) livestreamTab.classList.add('active');
            break;
    }

    // Hide all cards
    [homeCard, aboutCard, productsCard, contactCard, livestreamCard].forEach(card => {
        if (card) card.style.display = 'none';
    });

    // Show selected card
    switch (tabId) {
        case 'home':
            if (homeCard) homeCard.style.display = 'block';
            break;
        case 'about':
            if (aboutCard) aboutCard.style.display = 'block';
            break;
        case 'products':
            if (productsCard) productsCard.style.display = 'block';
            break;
        case 'contact':
            if (contactCard) contactCard.style.display = 'block';
            break;
        case 'livestream':
            if (livestreamCard) livestreamCard.style.display = 'block';
            break;
    }
}

// Handle search
function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
        alert('Please enter a search term');
        return;
    }

    // Search through cards
    const cards = [homeCard, aboutCard, productsCard, contactCard, livestreamCard];
    const cardTitles = ['Home', 'About Us', 'Products', 'Contact Us', 'Livestream'];

    let foundIndex = -1;

    // First check card titles
    for (let i = 0; i < cardTitles.length; i++) {
        if (cardTitles[i].toLowerCase().includes(query)) {
            foundIndex = i;
            break;
        }
    }

    // If not found in titles, check card content
    if (foundIndex === -1) {
        for (let i = 0; i < cards.length; i++) {
            if (cards[i] && cards[i].textContent.toLowerCase().includes(query)) {
                foundIndex = i;
                break;
            }
        }
    }

    // Navigate to found section
    if (foundIndex !== -1) {
        const tabIds = ['home', 'about', 'products', 'contact', 'livestream'];
        switchTab(tabIds[foundIndex]);

        // Highlight search term (simplified)
        alert(`Found in ${cardTitles[foundIndex]} section`);

        // Clear search input
        searchInput.value = '';
    } else {
        alert('No matching sections found');
    }
}

// Admin control functions (updated for ESP32)
function toggleLED() {
    if (!esp32IP) {
        showNotification('Please connect to ESP32 first', 'error');
        return;
    }

    try {
        // Create a simple GET request for LED toggle
        const img = new Image();
        img.src = `http://${esp32IP}/led?state=toggle&t=${Date.now()}`;
        showNotification('LED toggled', 'success');
    } catch (error) {
        showNotification('Failed to toggle LED', 'error');
    }
}

function rebootDevice() {
    if (!esp32IP) {
        showNotification('Please connect to ESP32 first', 'error');
        return;
    }

    if (confirm('Are you sure you want to reboot the ESP32 device?')) {
        try {
            const img = new Image();
            img.src = `http://${esp32IP}/reboot?t=${Date.now()}`;
            showNotification('ESP32 rebooting... Please wait 30 seconds.', 'info');

            // Stop stream if active
            if (isStreaming) {
                stopStream();
            }
        } catch (error) {
            showNotification('Reboot command sent', 'info');
        }
    }
}

function calibrateCamera() {
    if (!esp32IP) {
        showNotification('Please connect to ESP32 first', 'error');
        return;
    }

    try {
        const img = new Image();
        img.src = `http://${esp32IP}/calibrate?t=${Date.now()}`;
        showNotification('Camera calibration started', 'success');
    } catch (error) {
        showNotification('Failed to calibrate camera', 'error');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Debug info
console.log('App.js loaded successfully');