// Data storage
const defaultConfig = {
  days: 10,
  hoursPerDay: 8,
  overhead: 10,
  holidays: 1,
  buffer: 15,
  developers: ['Jim', 'Jerry', 'Alice', 'Bob'],
  personalDaysOff: {},
};
let sprintConfig = {
  ...defaultConfig,
  ...(JSON.parse(localStorage.getItem('sprintConfig')) || {}),
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
      tasks: tasks.map((t) => ({
        id: t.id,
        description: t.description,
        hours: t.hours,
      })),
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
  const overhead = parseInt(sprintConfig.overhead) || 0;
  const holidays = parseInt(sprintConfig.holidays) || 0;
  const buffer = parseInt(sprintConfig.buffer) || 0;
  const personalDaysOff = sprintConfig.personalDaysOff[developer] || 0;

  const availableDays = days - holidays - personalDaysOff;
  // Apply buffer before overhead to yield 58 hours
  let targetHours = availableDays * hoursPerDay * (1 - buffer / 100) - overhead;
  targetHours = Number(targetHours.toFixed(2));

  console.log(`calculateTargetHours for ${developer}:`);
  console.log(
    `  days=${days}, hoursPerDay=${hoursPerDay}, overhead=${overhead}, holidays=${holidays}, buffer=${buffer}, personalDaysOff=${personalDaysOff}`
  );
  console.log(`  availableDays=${availableDays}`);
  console.log(
    `  hoursBeforeOverhead=${(
      availableDays *
      hoursPerDay *
      (1 - buffer / 100)
    ).toFixed(2)}`
  );
  console.log(`  finalTargetHours=${targetHours}`);

  return Math.max(0, targetHours);
}

// Update task calculations (capAvg, hours, etc.) and store in tasks
function updateTaskCalculations() {
  const hoursPerDay = parseInt(sprintConfig.hoursPerDay) || 8;

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
    const timeHours = sprintConfig.developers
      .map((dev) => {
        const val = votes[`${task.id}-${dev}-time`];
        return val === '1/2 Day'
          ? 0.5 * hoursPerDay
          : val === '1 Day'
          ? 1 * hoursPerDay
          : val === '1.5 Days'
          ? 1.5 * hoursPerDay
          : val === '2.5 Days'
          ? 2.5 * hoursPerDay
          : val === '4 Days'
          ? 4 * hoursPerDay
          : 0;
      })
      .filter((v) => v);
    const capAvg = capPoints.length
      ? capPoints.reduce((a, b) => a + b, 0) / capPoints.length
      : 0;
    const hours = timeHours.length
      ? timeHours.reduce((a, b) => a + b, 0) / timeHours.length
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
            votes[`${task.id}-${dev}-time`] === '1/2 Day'
              ? 1
              : votes[`${task.id}-${dev}-time`] === '1 Day'
              ? 2
              : votes[`${task.id}-${dev}-time`] === '1.5 Days'
              ? 3
              : votes[`${task.id}-${dev}-time`] === '2.5 Days'
              ? 4
              : votes[`${task.id}-${dev}-time`] === '4 Days'
              ? 5
              : 0;
          return cap + time;
        })
        .filter((v) => v)
        .reduce((a, b) => a + b, 0) / (capPoints.length || 1);
    const capColor =
      capAvg <= 1.49 ? 'Trivial' : capAvg <= 2.49 ? 'Optimal' : 'Challenging';

    // Round hours to 2 decimal places
    const roundedHours = Number(hours.toFixed(2));

    // Validate task.hours
    if (task.hours !== roundedHours) {
      console.warn(
        `Task ${task.id} hours mismatch: stored=${task.hours}, expected=${roundedHours}`
      );
      task.hours = roundedHours;
    }

    task.capAvg = capAvg;
    task.capColor = capColor;
    task.composite = composite;
  });

  saveData();
  console.log(
    'Tasks updated with new hours:',
    tasks.map((t) => ({
      id: t.id,
      description: t.description,
      hours: t.hours.toFixed(2),
    }))
  );
}

// Debug function to inspect tasks and assignments
function debugData() {
  console.log('Debug Data:');
  console.log('sprintConfig:', sprintConfig);
  console.log(
    'Tasks:',
    tasks.map((t) => ({
      id: t.id,
      description: t.description,
      hours: t.hours.toFixed(2),
      capAvg: t.capAvg,
      capColor: t.capColor,
    }))
  );
  console.log('Assignments:', assignments);
  console.log('Votes:', votes);
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
    days: !isNaN(parseInt(document.getElementById('days').value))
      ? parseInt(document.getElementById('days').value)
      : sprintConfig.days,
    hoursPerDay: !isNaN(parseInt(document.getElementById('hoursPerDay').value))
      ? parseInt(document.getElementById('hoursPerDay').value)
      : sprintConfig.hoursPerDay,
    overhead: !isNaN(parseInt(document.getElementById('overhead').value))
      ? parseInt(document.getElementById('overhead').value)
      : sprintConfig.overhead,
    holidays: !isNaN(parseInt(document.getElementById('holidays').value))
      ? parseInt(document.getElementById('holidays').value)
      : sprintConfig.holidays,
    buffer: !isNaN(parseInt(document.getElementById('buffer').value))
      ? parseInt(document.getElementById('buffer').value)
      : sprintConfig.buffer,
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
  updateTaskCalculations();
  debugData();
});

// Load setup data
function loadSetup() {
  const form = document.getElementById('setupForm');
  if (form) {
    document.getElementById('days').value =
      sprintConfig.days ?? defaultConfig.days;
    document.getElementById('hoursPerDay').value =
      sprintConfig.hoursPerDay ?? defaultConfig.hoursPerDay;
    document.getElementById('overhead').value =
      sprintConfig.overhead ?? defaultConfig.overhead;
    document.getElementById('holidays').value =
      sprintConfig.holidays ?? defaultConfig.holidays;
    document.getElementById('buffer').value =
      sprintConfig.buffer ?? defaultConfig.buffer;
    document.getElementById('developers').value =
      sprintConfig.developers?.join(', ') ??
      defaultConfig.developers.join(', ');
    document.getElementById('personalDaysOff').value = Object.entries(
      sprintConfig.personalDaysOff ?? {}
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
      .map((dev) => `<th>${dev} Capability</th><th>${dev} Time</th>`)
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
            <option value="" class="select-option" ${
              capValue === '' ? 'selected' : ''
            }>Select</option>
            <option value="Trivial" class="trivial" ${
              capValue === 'Trivial' ? 'selected' : ''
            }>Trivial</option>
            <option value="Optimal" class="optimal" ${
              capValue === 'Optimal' ? 'selected' : ''
            }>Optimal</option>
            <option value="Challenging" class="challenging" ${
              capValue === 'Challenging' ? 'selected' : ''
            }>Challenging</option>
        </select></td>
        <td><select class="form-select time" data-task="${
          task.id
        }" data-dev="${dev}" data-type="time">
            <option value="" class="select-option" ${
              timeValue === '' ? 'selected' : ''
            }>Select</option>
            <option value="1/2 Day" ${
              timeValue === '1/2 Day' ? 'selected' : ''
            }>1/2 Day</option>
            <option value="1 Day" ${
              timeValue === '1 Day' ? 'selected' : ''
            }>1 Day</option>
            <option value="1.5 Days" ${
              timeValue === '1.5 Days' ? 'selected' : ''
            }>1.5 Days</option>
            <option value="2.5 Days" ${
              timeValue === '2.5 Days' ? 'selected' : ''
            }>2.5 Days</option>
            <option value="4 Days" ${
              timeValue === '4 Days' ? 'selected' : ''
            }>4 Days</option>
        </select></td>`;
    });
    row.innerHTML += `<td><button class="btn btn-danger btn-sm" onclick="deleteTask(${task.id})">Delete</button></td>`;
    body.appendChild(row);
  });

  document.querySelectorAll('.cap, .time').forEach((select) => {
    updateSelectColor(select);
    select.addEventListener('change', (e) => {
      votes[
        `${e.target.dataset.task}-${e.target.dataset.dev}-${e.target.dataset.type}`
      ] = e.target.value;
      saveData();
      updateTaskCalculations();
      updateSelectColor(e.target);
      console.log('Vote updated:', votes);
    });
  });
}

// Helper function to update select element color based on selected value
function updateSelectColor(select) {
  if (select.classList.contains('cap')) {
    const value = select.value;
    select.style.color =
      value === ''
        ? 'black'
        : value === 'Trivial'
        ? '#d39e00'
        : value === 'Optimal'
        ? '#28a745'
        : value === 'Challenging'
        ? '#dc3545'
        : 'black';
  } else {
    select.style.color = 'black';
  }
}

function saveVotes() {
  saveData();
  updateTaskCalculations();
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
      '<td colspan="6" class="text-center">No tasks available. Add tasks in the Voting page.</td>';
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
            <td>${task.composite ? task.composite.toFixed(2) : '0.00'}</td>
            <td>${task.hours ? task.hours.toFixed(2) : '0.00'}</td>`;
    table.appendChild(row);
  });
}

// Assignments
function renderAssignmentsTable() {
  const tbody = document.getElementById('assignmentsTable');
  if (!tbody) return;
  tbody.innerHTML = ''; // Clear only the <tbody> content, preserving the <thead>
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
            <td>${task.hours ? task.hours.toFixed(2) : '0.00'}</td>`;
    tbody.appendChild(row);
  });

  document.querySelectorAll('.assign').forEach((select) => {
    select.style.color = select.value === '' ? '#dc3545' : 'black';
    select.addEventListener('change', (e) => {
      const taskId = e.target.dataset.task;
      const value = e.target.value;
      e.target.style.color = value === '' ? '#dc3545' : 'black';
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

  updateTaskCalculations();
  renderSummaryTable();
}

function renderSummaryTable() {
  const table = document.getElementById('summaryTable');
  if (!table) return;
  table.innerHTML = '';
  const teamRow = { tasks: 0, hours: 0, targetHours: 0 };
  const teamCapData = [];

  const capData = [];
  const hoursData = [];
  const targetHoursData = [];

  sprintConfig.developers.forEach((dev) => {
    const devTasks = Object.keys(assignments)
      .filter((id) => assignments[id] === dev)
      .map((id) => tasks.find((t) => t.id == id))
      .filter((task) => task);
    const hours = Number(
      devTasks.reduce((sum, task) => sum + (task.hours || 0), 0).toFixed(2)
    );
    const capPoints = devTasks.reduce((sum, task) => {
      return sum + (task.capAvg <= 1.49 ? 1 : task.capAvg <= 2.49 ? 2 : 3);
    }, 0);
    const capAvg = devTasks.length ? capPoints / devTasks.length : 0;
    const targetHours = calculateTargetHours(dev);
    const hoursPercentage =
      targetHours > 0 ? ((hours / targetHours) * 100).toFixed(2) : 0;
    const statusValue = (
      capAvg *
      (hours / (targetHours > 0 ? targetHours : 1))
    ).toFixed(2);

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
            <td>${hours.toFixed(2)}/${targetHours.toFixed(2)}</td>
            <td class="${statusColor}" style="font-weight: bold; color: ${
      statusColor === 'below-capacity'
        ? '#d39e00'
        : statusColor === 'at-capacity'
        ? '#28a745'
        : '#dc3545'
    };">${status}</td>`;
    table.appendChild(row);

    teamRow.tasks += devTasks.length;
    teamRow.hours += hours;
    teamRow.targetHours += targetHours;
    if (devTasks.length) {
      teamCapData.push({ capAvg, taskCount: devTasks.length });
    }

    capData.push(capAvg);
    hoursData.push(hours);
    targetHoursData.push(targetHours);

    console.log(
      `Developer ${dev}: tasks=${devTasks.length}, capAvg=${capAvg.toFixed(
        2
      )}, hours=${hours.toFixed(2)}, targetHours=${targetHours.toFixed(
        2
      )}, taskDetails=[${devTasks
        .map((t) => `Task ${t.id}: ${t.hours.toFixed(2)}h`)
        .join(', ')}]`
    );
  });

  const totalTasks = teamCapData.reduce(
    (sum, { taskCount }) => sum + taskCount,
    0
  );
  const teamCapAvg = totalTasks
    ? teamCapData.reduce(
        (sum, { capAvg, taskCount }) => sum + capAvg * taskCount,
        0
      ) / totalTasks
    : 0;

  const teamHoursPercentage =
    teamRow.targetHours > 0 ? (teamRow.hours / teamRow.targetHours) * 100 : 0;
  let teamStatus = '';
  let teamStatusColor = '';
  if (teamHoursPercentage > 100) {
    teamStatus = 'Above Capacity';
    teamStatusColor = 'above-capacity';
  } else if (
    teamCapAvg *
      (teamRow.hours / (teamRow.targetHours > 0 ? teamRow.targetHours : 1)) <
    1.5
  ) {
    teamStatus = 'Below Capacity';
    teamStatusColor = 'below-capacity';
  } else if (
    teamCapAvg *
      (teamRow.hours / (teamRow.targetHours > 0 ? teamRow.targetHours : 1)) <=
    2.49
  ) {
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
        <td>${teamRow.hours.toFixed(2)}/${teamRow.targetHours.toFixed(2)}</td>
        <td class="${teamStatusColor}" style="font-weight: bold; color: ${
    teamStatusColor === 'below-capacity'
      ? '#d39e00'
      : teamStatusColor === 'at-capacity'
      ? '#28a745'
      : '#dc3545'
  };">${teamStatus}</td>`;
  table.appendChild(teamRowEl);

  console.log(
    `Team: tasks=${teamRow.tasks}, capAvg=${teamCapAvg.toFixed(
      2
    )}, hours=${teamRow.hours.toFixed(
      2
    )}, targetHours=${teamRow.targetHours.toFixed(2)}`
  );

  renderCharts(capData, hoursData, targetHoursData);
}

function renderCharts(capData, hoursData, targetHoursData) {
  if (!window.Chart) {
    console.error('Chart.js not loaded.');
    alert('Charts failed to load. Please check your internet connection.');
    return;
  }

  try {
    if (capChartInstance) {
      capChartInstance.destroy();
      capChartInstance = null;
    }
    if (hoursChartInstance) {
      hoursChartInstance.destroy();
      hoursChartInstance = null;
    }

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

    hoursChartInstance = new Chart(document.getElementById('hoursChart'), {
      type: 'bar',
      data: {
        labels: sprintConfig.developers.map(
          (dev, i) => `${dev} (${targetHoursData[i].toFixed(2)}h)`
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

function setActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-nav .nav-link').forEach((link) => {
    link.classList.remove('active');
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });
}

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
  if (document.getElementById('assignmentsTable')) {
    updateTaskCalculations();
    renderAssignmentsTable();
  }
  setActiveNav();
});
