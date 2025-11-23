// Spicy Logger Frontend - Main Application Logic

// ============================================
// Global State and Configuration
// ============================================
let currentPage = 1;
let logsPerPage = 50;
let totalLogs = 0;
let autoRefreshInterval = null;
let currentFilters = {
  service: '',
  levels: ['info', 'warn', 'error', 'debug'],
  startDate: '',
  endDate: '',
  search: ''
};

// ============================================
// API Configuration
// ============================================
const API_BASE_URL = window.location.origin;
const API_ENDPOINTS = {
  logs: `${API_BASE_URL}/api/logs`,
  stats: `${API_BASE_URL}/api/logs/stats`
};

// ============================================
// Utility Functions
// ============================================

/**
 * Format timestamp to DD/MM/YYYY HH:mm:ss
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get Bootstrap badge class for log level
 */
function getLevelBadgeClass(level) {
  const classes = {
    'info': 'bg-primary',
    'warn': 'bg-warning text-dark',
    'error': 'bg-danger',
    'debug': 'bg-secondary'
  };
  return classes[level] || 'bg-secondary';
}

/**
 * Truncate long text with ellipsis
 */
function truncateText(text, maxLength = 100) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Show error toast notification
 */
function showError(message) {
  console.error(message);
  // You can integrate a toast library here if needed
  alert(`Error: ${message}`);
}

// ============================================
// Statistics Loading
// ============================================

/**
 * Load and display statistics
 */
async function loadStats() {
  try {
    // Build query params for date filtering if applicable
    const params = new URLSearchParams();
    if (currentFilters.startDate) params.append('startDate', currentFilters.startDate);
    if (currentFilters.endDate) params.append('endDate', currentFilters.endDate);

    const url = params.toString() ? `${API_ENDPOINTS.stats}?${params}` : API_ENDPOINTS.stats;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load stats: ${response.statusText}`);
    }

    const data = await response.json();
    const stats = data.stats || {};

    // Update stat cards
    document.getElementById('statTotal').textContent = stats.totalLogs || 0;
    document.getElementById('statInfo').textContent = stats.byLevel?.info || 0;
    document.getElementById('statWarn').textContent = stats.byLevel?.warn || 0;
    document.getElementById('statError').textContent = stats.byLevel?.error || 0;

    // Extract service names from byService array
    const services = (stats.byService || []).map(item => item.service);

    // Populate service dropdown
    populateServiceDropdown(services);

  } catch (error) {
    console.error('Error loading stats:', error);
    showError('Failed to load statistics');
  }
}

/**
 * Populate service dropdown with unique services
 */
function populateServiceDropdown(services) {
  const serviceSelect = document.getElementById('filterService');

  // Keep the "All Services" option
  const currentValue = serviceSelect.value;
  serviceSelect.innerHTML = '<option value="">All Services</option>';

  // Add service options
  services.forEach(service => {
    const option = document.createElement('option');
    option.value = service;
    option.textContent = service;
    serviceSelect.appendChild(option);
  });

  // Restore previous selection if it still exists
  if (currentValue) {
    serviceSelect.value = currentValue;
  }
}

// ============================================
// Logs Fetching and Rendering
// ============================================

/**
 * Fetch logs from API with current filters
 */
async function fetchLogs() {
  try {
    // Show loading state
    const tableBody = document.getElementById('logsTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading logs...</td></tr>';

    // Build query parameters
    const params = new URLSearchParams();
    params.append('page', currentPage);
    params.append('limit', logsPerPage);

    if (currentFilters.service) {
      params.append('service', currentFilters.service);
    }

    if (currentFilters.levels.length > 0 && currentFilters.levels.length < 4) {
      params.append('level', currentFilters.levels.join(','));
    }

    if (currentFilters.startDate) {
      params.append('startDate', new Date(currentFilters.startDate).toISOString());
    }

    if (currentFilters.endDate) {
      params.append('endDate', new Date(currentFilters.endDate).toISOString());
    }

    if (currentFilters.search) {
      params.append('search', currentFilters.search);
    }

    const response = await fetch(`${API_ENDPOINTS.logs}?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`);
    }

    const responseData = await response.json();

    // Update total logs count for pagination
    totalLogs = responseData.pagination?.totalLogs || 0;

    // Render logs table
    renderLogsTable(responseData.data || []);

    // Update pagination controls
    updatePaginationControls();

  } catch (error) {
    console.error('Error fetching logs:', error);
    const tableBody = document.getElementById('logsTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load logs. Please try again.</td></tr>';
  }
}

/**
 * Render logs into the table
 */
function renderLogsTable(logs) {
  const tableBody = document.getElementById('logsTableBody');

  if (logs.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No logs found matching the current filters.</td></tr>';
    return;
  }

  tableBody.innerHTML = '';

  logs.forEach((log, index) => {
    // Main row
    const row = document.createElement('tr');
    row.style.cursor = 'pointer';
    row.dataset.logId = log._id;
    row.dataset.expanded = 'false';

    // Timestamp column
    const timestampCell = document.createElement('td');
    timestampCell.textContent = formatTimestamp(log.timestamp);
    row.appendChild(timestampCell);

    // Service column
    const serviceCell = document.createElement('td');
    serviceCell.textContent = log.service || 'Unknown';
    row.appendChild(serviceCell);

    // Level column with badge
    const levelCell = document.createElement('td');
    const levelBadge = document.createElement('span');
    levelBadge.className = `badge ${getLevelBadgeClass(log.level)}`;
    levelBadge.textContent = log.level.toUpperCase();
    levelCell.appendChild(levelBadge);
    row.appendChild(levelCell);

    // Message column (truncated)
    const messageCell = document.createElement('td');
    messageCell.textContent = truncateText(log.message, 80);
    messageCell.title = log.message; // Full message on hover
    row.appendChild(messageCell);

    // Details column (clickable)
    const detailsCell = document.createElement('td');
    const hasDetails = (log.metadata && Object.keys(log.metadata).length > 0) || log.stack;
    if (hasDetails) {
      detailsCell.innerHTML = '<i class="bi bi-chevron-down"></i> View';
      detailsCell.className = 'text-primary';
    } else {
      detailsCell.textContent = '-';
      detailsCell.className = 'text-muted';
    }
    row.appendChild(detailsCell);

    // Add click event for expansion
    if (hasDetails) {
      row.addEventListener('click', () => toggleRowExpansion(row, log));
    }

    tableBody.appendChild(row);
  });
}

/**
 * Toggle row expansion to show metadata and stack trace
 */
function toggleRowExpansion(row, log) {
  const isExpanded = row.dataset.expanded === 'true';
  const logId = row.dataset.logId;

  // Find or remove existing expansion row
  const existingExpansionRow = document.getElementById(`expansion-${logId}`);

  if (isExpanded) {
    // Collapse
    if (existingExpansionRow) {
      existingExpansionRow.remove();
    }
    row.dataset.expanded = 'false';
    const chevron = row.querySelector('.bi-chevron-up');
    if (chevron) chevron.className = 'bi bi-chevron-down';
  } else {
    // Expand
    row.dataset.expanded = 'true';
    const chevron = row.querySelector('.bi-chevron-down');
    if (chevron) chevron.className = 'bi bi-chevron-up';

    // Create expansion row
    const expansionRow = document.createElement('tr');
    expansionRow.id = `expansion-${logId}`;
    expansionRow.className = 'expansion-row';

    const expansionCell = document.createElement('td');
    expansionCell.colSpan = 5;
    expansionCell.className = 'bg-light';

    let expansionContent = '<div class="p-3">';

    // Full message
    expansionContent += `<div class="mb-3"><strong>Full Message:</strong><br><pre class="bg-white p-2 rounded">${escapeHtml(log.message)}</pre></div>`;

    // Metadata
    if (log.metadata && Object.keys(log.metadata).length > 0) {
      expansionContent += `<div class="mb-3"><strong>Metadata:</strong><br><pre class="bg-white p-2 rounded">${escapeHtml(JSON.stringify(log.metadata, null, 2))}</pre></div>`;
    }

    // Stack trace
    if (log.stack) {
      expansionContent += `<div class="mb-3"><strong>Stack Trace:</strong><br><pre class="bg-white p-2 rounded text-danger" style="font-size: 0.85rem;">${escapeHtml(log.stack)}</pre></div>`;
    }

    expansionContent += '</div>';
    expansionCell.innerHTML = expansionContent;
    expansionRow.appendChild(expansionCell);

    // Insert after current row
    row.after(expansionRow);
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// Pagination Controls
// ============================================

/**
 * Update pagination controls state
 */
function updatePaginationControls() {
  const totalPages = Math.ceil(totalLogs / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage + 1;
  const endIndex = Math.min(currentPage * logsPerPage, totalLogs);

  // Update pagination info text
  const paginationInfo = document.getElementById('paginationInfo');
  if (totalLogs > 0) {
    paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${totalLogs} logs`;
  } else {
    paginationInfo.textContent = 'No logs to display';
  }

  // Update button states
  const prevButton = document.getElementById('prevPage');
  const nextButton = document.getElementById('nextPage');

  prevButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= totalPages;

  // Update page selector value
  document.getElementById('logsPerPage').value = logsPerPage;
}

/**
 * Go to previous page
 */
function goToPreviousPage() {
  if (currentPage > 1) {
    currentPage--;
    fetchLogs();
  }
}

/**
 * Go to next page
 */
function goToNextPage() {
  const totalPages = Math.ceil(totalLogs / logsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    fetchLogs();
  }
}

/**
 * Change logs per page
 */
function changeLogsPerPage(newLimit) {
  logsPerPage = parseInt(newLimit);
  currentPage = 1; // Reset to first page
  fetchLogs();
}

// ============================================
// Filter Management
// ============================================

/**
 * Collect filter values from UI
 */
function collectFilters() {
  // Service filter
  currentFilters.service = document.getElementById('filterService').value;

  // Date filters
  currentFilters.startDate = document.getElementById('filterStartDate').value;
  currentFilters.endDate = document.getElementById('filterEndDate').value;

  // Search filter
  currentFilters.search = document.getElementById('filterSearch').value;

  // Level checkboxes
  const levels = [];
  if (document.getElementById('levelInfo').checked) levels.push('info');
  if (document.getElementById('levelWarn').checked) levels.push('warn');
  if (document.getElementById('levelError').checked) levels.push('error');
  if (document.getElementById('levelDebug').checked) levels.push('debug');
  currentFilters.levels = levels;
}

/**
 * Apply filters and refresh logs
 */
function applyFilters() {
  collectFilters();
  currentPage = 1; // Reset to first page
  fetchLogs();
  loadStats(); // Update stats with date filters
}

/**
 * Clear all filters
 */
function clearFilters() {
  // Reset filter inputs
  document.getElementById('filterService').value = '';
  document.getElementById('filterStartDate').value = '';
  document.getElementById('filterEndDate').value = '';
  document.getElementById('filterSearch').value = '';

  // Check all level checkboxes
  document.getElementById('levelInfo').checked = true;
  document.getElementById('levelWarn').checked = true;
  document.getElementById('levelError').checked = true;
  document.getElementById('levelDebug').checked = true;

  // Reset filters object
  currentFilters = {
    service: '',
    levels: ['info', 'warn', 'error', 'debug'],
    startDate: '',
    endDate: '',
    search: ''
  };

  currentPage = 1;
  fetchLogs();
  loadStats();
}

/**
 * Refresh data (logs + stats)
 */
function refreshData() {
  fetchLogs();
  loadStats();
}

// ============================================
// Auto-Refresh
// ============================================

/**
 * Toggle auto-refresh on/off
 */
function toggleAutoRefresh() {
  const toggle = document.getElementById('autoRefreshToggle');

  if (toggle.checked) {
    // Start auto-refresh every 5 seconds
    autoRefreshInterval = setInterval(() => {
      console.log('Auto-refreshing logs...');
      refreshData();
    }, 5000);
    console.log('Auto-refresh enabled (every 5 seconds)');
  } else {
    // Stop auto-refresh
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
      console.log('Auto-refresh disabled');
    }
  }
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🌶️ Spicy Logger Frontend Initialized');

  // Load initial data
  loadStats();
  fetchLogs();

  // Setup event listeners

  // Filter controls
  document.getElementById('btnApplyFilters').addEventListener('click', applyFilters);
  document.getElementById('btnClearFilters').addEventListener('click', clearFilters);
  document.getElementById('btnRefresh').addEventListener('click', refreshData);

  // Pagination controls
  document.getElementById('btnPrevPage').addEventListener('click', goToPreviousPage);
  document.getElementById('btnNextPage').addEventListener('click', goToNextPage);
  document.getElementById('limitSelect').addEventListener('change', (e) => {
    changeLogsPerPage(e.target.value);
  });

  // Auto-refresh toggle
  document.getElementById('autoRefreshToggle').addEventListener('change', toggleAutoRefresh);

  // Enter key on search triggers apply filters
  document.getElementById('filterSearch').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  });

  console.log('✅ Event listeners configured');
  console.log('📊 Ready to view logs!');
});
