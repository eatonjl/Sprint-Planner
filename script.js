// Data storage
let sprintConfig = JSON.parse(localStorage.getItem('sprintConfig')) || {
  sprintLength: 2,
  days: 10,
  hoursPerDay: 8,
  overhead: 10,
  holidays: 1,
  buffer: 15,
  developers: ['Jim', 'Jerry', 'Alice', 'Bob'],
  personalDaysOff: {}, // e.g., { "Alice": 2, "Bob": 1 }
};
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let votes = JSON.parse(localStorage.getItem('votes')) || {};
let assignments = JSON.parse(localStorage.getItem('assignments')) || {};

// Chart instances to track for destruction
let capChartInstance = null;
let hoursChartInstance = null;

// Save data to LocalStorage
function saveData() {
  try {
    localStorage.setItem('sprintConfig', JSON.stringify(sprintConfig));
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('votes', JSON.stringify(votes));
    localStorage.setItem('assignments', JSON.stringify(assignments));
    console.log('Data saved to LocalStorage:', {
      sprintConfig,
      tasks,
      votes,
      assignments,
    });
  } catch (error) {
    console.error('Error saving to LocalStorage:', error);
    alert('Failed to save data. Check console for details.');
  }
}

// Calculate target hours per developer
function calculateTargetHours(developer) {
  const days = parseInt(sprintConfig.days) || 10;
  const hoursPerDay = parseInt(sprintConfig.hoursPerDay) || 8;
  const overhead = parseInt(sprintConfig.overhead) || 10;
  const holidays = parseInt(sprintConfig.holidays) || 0;
  const buffer = parseInt(sprintConfig.buffer) || 15;
  const personalDaysOff = sprintConfig.personalDaysOff[developer] || 0;

  // Calculate available days
  const availableDays = days - holidays - personalDaysOff;

  // Calculate total hours (excluding overhead and buffer)
  let targetHours = availableDays * hoursPerDay - overhead;

  // Apply buffer
  targetHours = targetHours * (1 - buffer / 100);

  return Math.max(0, targetHours);
}

// Update task calculations (capAvg, timeAvg, etc.) and store in tasks
function updateTaskCalculations() {
  tasks.forEach((task) => {
    const capPoints = sprintConfig.developers
      .map((dev) => {
        const val = votes[`${task.id}-${dev}-cap`];
        return val === 'Trivial'
          ? 1
          : val === 'Optimal'
          ? 2
          : val === 'Challenging'
          ? 3
          : 0;
      })
      .filter((v) => v);
    const timePoints = sprintConfig.developers
      .map((dev) => {
        const val = votes[`${task.id}-${dev}-time`];
        return val === 'Short'
          ? 1
          : val === 'Medium'
          ? 2
          : val === 'Long'
          ? 3
          : 0;
      })
      .filter((v) => v);
    const capAvg = capPoints.length
      ? capPoints.reduce((a, b) => a + b, 0) / capPoints.length
      : 0;
    const timeAvg = timePoints.length
      ? timePoints.reduce((a, b) => a + b, 0) / timePoints.length
      : 0;
    const composite =
      sprintConfig.developers
        .map((dev) => {
          const cap =
            votes[`${task.id}-${dev}-cap`] === 'Trivial'
              ? 1
              : votes[`${task.id}-${dev}-cap`] === 'Optimal'
              ? 2
              : votes[`${task.id}-${dev}-cap`] === 'Challenging'
              ? 3
              : 0;
          const time =
            votes[`${task.id}-${dev}-time`] === 'Short'
              ? 1
              : votes[`${task.id}-${dev}-time`] === 'Medium'
              ? 2
              : votes[`${task.id}-${dev}-time`] === 'Long'
              ? 3
              : 0;
          return cap + time;
        })
        .filter((v) => v)
        .reduce((a, b) => a + b, 0) / (capPoints.length || 1);
    const capColor =
      capAvg <= 1.49 ? 'Trivial' : capAvg <= 2.49 ? 'Optimal' : 'Challenging';
    const timeColor =
      timeAvg <= 1.49 ? 'Short' : timeAvg <= 2.49 ? 'Medium' : 'Long';
    const hours = timeColor === 'Short' ? 2 : timeColor === 'Medium' ? 4.5 : 9;

    // Update task properties
    task.capAvg = capAvg;
    task.timeAvg = timeAvg;
    task.capColor = capColor;
    task.timeColor = timeColor;
    task.hours = hours;
    task.composite = composite;
  });

  saveData(); // Save updated tasks
}

// Setup
document.getElementById('setupForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const personalDaysOffInput = document
    .getElementById('personalDaysOff')
    .value.trim();
  const personalDaysOff = {};
  if (personalDaysOffInput) {
    personalDaysOffInput.split(',').forEach((entry) => {
      const [name, days] = entry.split(':').map((s) => s.trim());
      if (name && days && !isNaN(days)) {
        personalDaysOff[name] = parseInt(days);
      }
    });
  }
  const newConfig = {
    sprintLength:
      parseInt(document.getElementById('sprintLength').value) ||
      sprintConfig.sprintLength,
    days: parseInt(document.getElementById('days').value) || sprintConfig.days,
    hoursPerDay:
      parseInt(document.getElementById('hoursPerDay').value) ||
      sprintConfig.hoursPerDay,
    overhead:
      parseInt(document.getElementById('overhead').value) ||
      sprintConfig.overhead,
    holidays:
      parseInt(document.getElementById('holidays').value) ||
      sprintConfig.holidays,
    buffer:
      parseInt(document.getElementById('buffer').value) || sprintConfig.buffer,
    developers:
      document
        .getElementById('developers')
        .value.split(',')
        .map((name) => name.trim())
        .filter((name) => name) || sprintConfig.developers,
    personalDaysOff,
  };
  sprintConfig = newConfig;
  saveData();
  alert('Setup saved!');
  loadSetup();
});

// Load setup data
function loadSetup() {
  const form = document.getElementById('setupForm');
  if (form) {
    document.getElementById('sprintLength').value = sprintConfig.sprintLength;
    document.getElementById('days').value = sprintConfig.days;
    document.getElementById('hoursPerDay').value = sprintConfig.hoursPerDay;
    document.getElementById('overhead').value = sprintConfig.overhead;
    document.getElementById('holidays').value = sprintConfig.holidays;
    document.getElementById('buffer').value = sprintConfig.buffer;
    document.getElementById('developers').value =
      sprintConfig.developers.join(', ');
    document.getElementById('personalDaysOff').value = Object.entries(
      sprintConfig.personalDaysOff
    )
      .map(([name, days]) => `${name}: ${days}`)
      .join(', ');
    console.log('Setup loaded:', sprintConfig);
  }
}

// Voting
document.getElementById('taskForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const description = document.getElementById('taskDescription').value.trim();
  if (description) {
    tasks.push({ id: tasks.length + 1, description });
    saveData();
    document.getElementById('taskDescription').value = '';
    renderVotingTable();
  } else {
    alert('Please enter a task description.');
  }
});

function deleteTask(taskId) {
  if (confirm(`Are you sure you want to delete task #${taskId}?`)) {
    tasks = tasks.filter((task) => task.id !== parseInt(taskId));
    Object.keys(votes).forEach((key) => {
      if (key.startsWith(`${taskId}-`)) delete votes[key];
    });
    Object.keys(assignments).forEach((key) => {
      if (key === taskId.toString()) delete assignments[key];
    });
    saveData();
    renderVotingTable();
  }
}

function renderVotingTable() {
  const head = document.getElementById('votingTableHead');
  const body = document.getElementById('votingTable');
  if (!head || !body) return;

  console.log('Rendering voting table with tasks:', tasks);
  head.innerHTML = '';
  body.innerHTML = '';

  const headerRow = document.createElement('tr');
  headerRow.innerHTML =
    '<th>Task #</th><th>Description</th>' +
    sprintConfig.developers
      .map((dev) => `<th>${dev} Cap</th><th>${dev} Time</th>`)
      .join('') +
    '<th>Actions</th>';
  head.appendChild(headerRow);

  tasks.forEach((task) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${task.id}</td><td>${task.description}</td>`;
    sprintConfig.developers.forEach((dev) => {
      const capValue = votes[`${task.id}-${dev}-cap`] || '';
      const timeValue = votes[`${task.id}-${dev}-time`] || '';
      row.innerHTML += `
                <td><select class="form-select cap" data-task="${
                  task.id
                }" data-dev="${dev}" data-type="cap">
                    <option value="">Select</option>
                    <option value="Trivial" ${
                      capValue === 'Trivial' ? 'selected' : ''
                    }>Trivial</option>
                    <option value="Optimal" ${
                      capValue === 'Optimal' ? 'selected' : ''
                    }>Optimal</option>
                    <option value="Challenging" ${
                      capValue === 'Challenging' ? 'selected' : ''
                    }>Challenging</option>
                </select></td>
                <td><select class="form-select time" data-task="${
                  task.id
                }" data-dev="${dev}" data-type="time">
                    <option value="">Select</option>
                    <option value="Short" ${
                      timeValue === 'Short' ? 'selected' : ''
                    }>Short</option>
                    <option value="Medium" ${
                      timeValue === 'Medium' ? 'selected' : ''
                    }>Medium</option>
                    <option value="Long" ${
                      timeValue === 'Long' ? 'selected' : ''
                    }>Long</option>
                </select></td>`;
    });
    row.innerHTML += `<td><button class="btn btn-danger btn-sm" onclick="deleteTask(${task.id})">Delete</button></td>`;
    body.appendChild(row);
  });

  document.querySelectorAll('.cap, .time').forEach((select) => {
    select.addEventListener('change', (e) => {
      votes[
        `${e.target.dataset.task}-${e.target.dataset.dev}-${e.target.dataset.type}`
      ] = e.target.value;
      saveData();
      updateTaskCalculations(); // Update task calculations on vote change
      console.log('Vote updated:', votes);
    });
  });
}

function saveVotes() {
  saveData();
  updateTaskCalculations(); // Ensure task calculations are updated
  alert('Votes saved!');
  renderVotingTable();
}

// Tasks
function renderTasksTable() {
  const table = document.getElementById('tasksTable');
  if (!table) {
    console.error('Tasks table element not found.');
    return;
  }

  console.log('Rendering tasks table with tasks:', tasks, 'and votes:', votes);
  table.innerHTML = '';

  if (tasks.length === 0) {
    console.warn('No tasks available to render.');
    const row = document.createElement('tr');
    row.innerHTML =
      '<td colspan="8" class="text-center">No tasks available. Add tasks in the Voting page.</td>';
    table.appendChild(row);
    return;
  }

  tasks.forEach((task) => {
    const row = document.createElement('tr');
    row.innerHTML = `
            <td>${task.id}</td>
            <td>${task.description}</td>
            <td>${task.capAvg ? task.capAvg.toFixed(2) : '0.00'}</td>
            <td class="${
              task.capColor ? task.capColor.toLowerCase() : ''
            }" style="font-weight: bold;">${task.capColor || ''}</td>
            <td>${task.timeAvg ? task.timeAvg.toFixed(2) : '0.00'}</td>
            <td class="${
              task.timeColor ? task.timeColor.toLowerCase() : ''
            }" style="font-weight: bold;">${task.timeColor || ''}</td>
            <td>${task.composite ? task.composite.toFixed(2) : '0.00'}</td>
            <td>${task.hours || 0}</td>`;
    table.appendChild(row);
  });
}

// Assignments
function renderAssignmentsTable() {
  const table = document.getElementById('assignmentsTable');
  if (!table) return;
  table.innerHTML = '';
  tasks.forEach((task) => {
    const row = document.createElement('tr');
    row.innerHTML = `
            <td>${task.id}</td>
            <td>${task.description}</td>
            <td>
              <select class="form-select assign" data-task="${task.id}">
                <option value="" ${
                  !assignments[task.id] ? 'selected' : ''
                }>Select</option>
                ${sprintConfig.developers
                  .map(
                    (dev) =>
                      `<option value="${dev}" ${
                        assignments[task.id] === dev ? 'selected' : ''
                      }>${dev}</option>`
                  )
                  .join('')}
              </select>
            </td>
            <td class="${
              task.capColor ? task.capColor.toLowerCase() : ''
            }" style="font-weight: bold;">${task.capColor || ''}</td>
            <td class="${
              task.timeColor ? task.timeColor.toLowerCase() : ''
            }" style="font-weight: bold;">${task.timeColor || ''}</td>`;
    table.appendChild(row);
  });

  document.querySelectorAll('.assign').forEach((select) => {
    // Set initial color based on value
    if (!select.value) {
      select.style.color = '#dc3545'; // Red for "Select"
    } else {
      select.style.color = ''; // Default color for developers
    }

    select.addEventListener('change', (e) => {
      const taskId = e.target.dataset.task;
      const value = e.target.value;
      // Update select color
      e.target.style.color = value ? '' : '#dc3545';
      // Update assignments
      if (value) {
        assignments[taskId] = value;
      } else {
        delete assignments[taskId];
      }
      saveData();
      console.log('Assignment updated:', assignments);
      renderSummaryTable();
    });
  });

  renderSummaryTable();
}

function renderSummaryTable() {
  const table = document.getElementById('summaryTable');
  if (!table) return;
  table.innerHTML = '';
  const teamRow = { tasks: 0, capPoints: 0, hours: 0, targetHours: 0 };

  // Collect data for charts
  const capData = [];
  const hoursData = [];
  const targetHoursData = [];

  sprintConfig.developers.forEach((dev) => {
    const devTasks = Object.keys(assignments)
      .filter((id) => assignments[id] === dev)
      .map((id) => tasks.find((t) => t.id == id))
      .filter((task) => task);
    const capPoints = devTasks
      .map((task) => {
        return task.capAvg <= 1.49 ? 1 : task.capAvg <= 2.49 ? 2 : 3;
      })
      .reduce((a, b) => a + b, 0);
    const hours = devTasks.map((task) => task.hours).reduce((a, b) => a + b, 0);
    const capAvg = devTasks.length ? capPoints / devTasks.length : 0;
    const targetHours = calculateTargetHours(dev);
    const hoursPercentage = targetHours > 0 ? (hours / targetHours) * 100 : 0;
    const statusValue = capAvg * (hours / (targetHours > 0 ? targetHours : 1));

    // Status logic
    let status = '';
    let statusColor = '';
    if (hoursPercentage > 100) {
      status = 'Above Capacity';
      statusColor = 'above-capacity';
    } else if (statusValue < 1.5) {
      status = 'Below Capacity';
      statusColor = 'below-capacity';
    } else if (statusValue <= 2.49) {
      status = 'At Capacity';
      statusColor = 'at-capacity';
    } else {
      status = 'Above Capacity';
      statusColor = 'above-capacity';
    }

    const row = document.createElement('tr');
    row.innerHTML = `
            <td>${dev}</td>
            <td>${devTasks.length}</td>
            <td>${capAvg.toFixed(2)}</td>
            <td>${Math.floor(hours)}/${Math.floor(targetHours)}</td>
            <td class="${statusColor}" style="font-weight: bold; color: ${
      statusColor === 'below-capacity'
        ? '#d39e00'
        : statusColor === 'at-capacity'
        ? '#28a745'
        : '#dc3545'
    };">${status}</td>`;
    table.appendChild(row);

    // Accumulate team totals
    teamRow.tasks += devTasks.length;
    teamRow.capPoints += capPoints;
    teamRow.hours += hours;
    teamRow.targetHours += targetHours;

    // Collect chart data
    capData.push(capAvg);
    hoursData.push(hours);
    targetHoursData.push(targetHours);
  });

  // Team row
  const teamCapAvg = teamRow.tasks ? teamRow.capPoints / teamRow.tasks : 0;
  const teamHoursPercentage =
    teamRow.targetHours > 0 ? (teamRow.hours / teamRow.targetHours) * 100 : 0;
  const teamStatusValue =
    teamCapAvg *
    (teamRow.hours / (teamRow.targetHours > 0 ? teamRow.targetHours : 1));
  let teamStatus = '';
  let teamStatusColor = '';
  if (teamHoursPercentage > 100) {
    teamStatus = 'Above Capacity';
    teamStatusColor = 'above-capacity';
  } else if (teamStatusValue < 1.5) {
    teamStatus = 'Below Capacity';
    teamStatusColor = 'below-capacity';
  } else if (teamStatusValue <= 2.49) {
    teamStatus = 'At Capacity';
    teamStatusColor = 'at-capacity';
  } else {
    teamStatus = 'Above Capacity';
    teamStatusColor = 'above-capacity';
  }

  const teamRowEl = document.createElement('tr');
  teamRowEl.innerHTML = `
        <td><strong>Team</strong></td>
        <td>${teamRow.tasks}</td>
        <td>${teamCapAvg.toFixed(2)}</td>
        <td>${Math.floor(teamRow.hours)}/${Math.floor(teamRow.targetHours)}</td>
        <td class="${teamStatusColor}" style="font-weight: bold; color: ${
    teamStatusColor === 'below-capacity'
      ? '#d39e00'
      : teamStatusColor === 'at-capacity'
      ? '#28a745'
      : '#dc3545'
  };">${teamStatus}</td>`;
  table.appendChild(teamRowEl);

  // Render charts
  renderCharts(capData, hoursData, targetHoursData);
}

function renderCharts(capData, hoursData, targetHoursData) {
  if (!window.Chart) {
    console.error('Chart.js not loaded.');
    alert('Charts failed to load. Please check your internet connection.');
    return;
  }

  try {
    // Destroy existing chart instances
    if (capChartInstance) {
      capChartInstance.destroy();
      capChartInstance = null;
    }
    if (hoursChartInstance) {
      hoursChartInstance.destroy();
      hoursChartInstance = null;
    }

    // Capability Chart
    capChartInstance = new Chart(document.getElementById('capChart'), {
      type: 'bar',
      data: {
        labels: sprintConfig.developers,
        datasets: [
          {
            label: 'Capability Average',
            data: capData,
            backgroundColor: capData.map((v) =>
              v < 1.5 ? '#fff3cd' : v <= 2.49 ? '#d4edda' : '#f8d7da'
            ),
          },
        ],
      },
      options: { scales: { y: { beginAtZero: true, max: 3 } } },
    });

    // Hours Chart
    hoursChartInstance = new Chart(document.getElementById('hoursChart'), {
      type: 'bar',
      data: {
        labels: sprintConfig.developers.map(
          (dev, i) => `${dev} (${Math.floor(targetHoursData[i])}h)`
        ),
        datasets: [
          {
            label: 'Hours',
            data: hoursData,
            backgroundColor: hoursData.map((hours, i) => {
              const target = targetHoursData[i];
              const percentage = target > 0 ? (hours / target) * 100 : 0;
              return percentage < 80
                ? '#fff3cd'
                : percentage <= 100
                ? '#d4edda'
                : '#f8d7da';
            }),
          },
        ],
      },
      options: { scales: { y: { beginAtZero: true } } },
    });
  } catch (error) {
    console.error('Error rendering charts:', error);
    alert('Failed to render charts. Check console for details.');
  }
}

function saveAssignments() {
  saveData();
  alert('Assignments saved!');
  renderAssignmentsTable();
}

// Function to set active navbar link
function setActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-nav .nav-link').forEach((link) => {
    link.classList.remove('active');
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });
}

// Initialize pages
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded, initializing...');
  console.log('LocalStorage contents:', {
    sprintConfig: localStorage.getItem('sprintConfig'),
    tasks: localStorage.getItem('tasks'),
    votes: localStorage.getItem('votes'),
    assignments: localStorage.getItem('assignments'),
  });
  if (document.getElementById('setupForm')) loadSetup();
  if (document.getElementById('votingTable')) renderVotingTable();
  if (document.getElementById('tasksTable')) renderTasksTable();
  if (document.getElementById('assignmentsTable')) renderAssignmentsTable();
  setActiveNav();
});
