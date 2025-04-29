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
                    <option value="Green" ${
                      capValue === 'Green' ? 'selected' : ''
                    }>Green</option>
                    <option value="Yellow" ${
                      capValue === 'Yellow' ? 'selected' : ''
                    }>Yellow</option>
                    <option value="Red" ${
                      capValue === 'Red' ? 'selected' : ''
                    }>Red</option>
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
      console.log('Vote updated:', votes);
    });
  });
}

function saveVotes() {
  saveData();
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
    const capPoints = sprintConfig.developers
      .map((dev) => {
        const val = votes[`${task.id}-${dev}-cap`];
        return val === 'Green'
          ? 1
          : val === 'Yellow'
          ? 2
          : val === 'Red'
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
            votes[`${task.id}-${dev}-cap`] === 'Green'
              ? 1
              : votes[`${task.id}-${dev}-cap`] === 'Yellow'
              ? 2
              : votes[`${task.id}-${dev}-cap`] === 'Red'
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
      capAvg <= 1.49 ? 'Green' : capAvg <= 2.49 ? 'Yellow' : 'Red';
    const timeColor =
      timeAvg <= 1.49 ? 'Short' : timeAvg <= 2.49 ? 'Medium' : 'Long';
    const hours = timeColor === 'Short' ? 2 : timeColor === 'Medium' ? 4.5 : 9;

    const row = document.createElement('tr');
    row.innerHTML = `
            <td>${task.id}</td>
            <td>${task.description}</td>
            <td>${capAvg.toFixed(2)}</td>
            <td class="${capColor.toLowerCase()}">${capColor}</td>
            <td>${timeAvg.toFixed(2)}</td>
            <td class="${timeColor.toLowerCase()}">${timeColor}</td>
            <td>${composite.toFixed(2)}</td>
            <td>${hours}</td>`;
    table.appendChild(row);
  });
}

// Assignments
function renderAssignmentsTable() {
  const table = document.getElementById('assignmentsTable');
  if (!table) return;
  table.innerHTML = '';
  tasks.forEach((task) => {
    const capPoints = sprintConfig.developers
      .map((dev) => {
        const val = votes[`${task.id}-${dev}-cap`];
        return val === 'Green'
          ? 1
          : val === 'Yellow'
          ? 2
          : val === 'Red'
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
    const capColor =
      capAvg <= 1.49 ? 'Green' : capAvg <= 2.49 ? 'Yellow' : 'Red';
    const timeColor =
      timeAvg <= 1.49 ? 'Short' : timeAvg <= 2.49 ? 'Medium' : 'Long';
    const hours = timeColor === 'Short' ? 2 : timeColor === 'Medium' ? 4.5 : 9;

    const row = document.createElement('tr');
    row.innerHTML = `
            <td>${task.id}</td>
            <td>${task.description}</td>
            <td class="${capColor.toLowerCase()}">${capColor}</td>
            <td class="${timeColor.toLowerCase()}">${timeColor}</td>
            <td>${hours}</td>
            <td><select class="form-select assign" data-task="${task.id}">
                <option value="">Select</option>
                ${sprintConfig.developers
                  .map(
                    (dev) =>
                      `<option value="${dev}" ${
                        assignments[task.id] === dev ? 'selected' : ''
                      }>${dev}</option>`
                  )
                  .join('')}
            </select></td>`;
    table.appendChild(row);
  });

  document.querySelectorAll('.assign').forEach((select) => {
    select.addEventListener('change', (e) => {
      assignments[e.target.dataset.task] = e.target.value;
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
  const teamRow = { tasks: 0, capPoints: 0, hours: 0 };
  sprintConfig.developers.forEach((dev) => {
    const devTasks = Object.keys(assignments)
      .filter((id) => assignments[id] === dev)
      .map((id) => tasks.find((t) => t.id == id));
    const capPoints = devTasks
      .map((task) => {
        const capAvg =
          sprintConfig.developers
            .map((d) => {
              const val = votes[`${task.id}-${d}-cap`];
              return val === 'Green'
                ? 1
                : val === 'Yellow'
                ? 2
                : val === 'Red'
                ? 3
                : 0;
            })
            .filter((v) => v)
            .reduce((a, b) => a + b, 0) / (sprintConfig.developers.length || 1);
        return capAvg <= 1.49 ? 1 : capAvg <= 2.49 ? 2 : 3;
      })
      .reduce((a, b) => a + b, 0);
    const hours = devTasks
      .map((task) => {
        const timeAvg =
          sprintConfig.developers
            .map((d) => {
              const val = votes[`${task.id}-${d}-time`];
              return val === 'Short'
                ? 1
                : val === 'Medium'
                ? 2
                : val === 'Long'
                ? 3
                : 0;
            })
            .filter((v) => v)
            .reduce((a, b) => a + b, 0) / (sprintConfig.developers.length || 1);
        return timeAvg <= 1.49 ? 2 : timeAvg <= 2.49 ? 4.5 : 9;
      })
      .reduce((a, b) => a + b, 0);
    const capAvg = devTasks.length ? capPoints / devTasks.length : 0;
    const availableHours =
      (sprintConfig.days -
        sprintConfig.holidays -
        (sprintConfig.personalDaysOff[dev] || 0)) *
        sprintConfig.hoursPerDay -
      sprintConfig.overhead;
    const alert =
      capAvg < 1.5 || capAvg > 2.5
        ? 'Adjust Capability'
        : hours > availableHours * 0.8
        ? 'Reduce Hours'
        : 'OK';

    const row = document.createElement('tr');
    row.innerHTML = `
            <td>${dev}</td>
            <td>${devTasks.length}</td>
            <td>${capPoints}</td>
            <td>${capAvg.toFixed(2)}</td>
            <td>${hours}</td>
            <td class="alert">${alert}</td>`;
    table.appendChild(row);

    teamRow.tasks += devTasks.length;
    teamRow.capPoints += capPoints;
    teamRow.hours += hours;
  });

  const teamCapAvg = teamRow.tasks ? teamRow.capPoints / teamRow.tasks : 0;
  const teamAvailableHours = sprintConfig.developers.reduce((sum, dev) => {
    return (
      sum +
      (sprintConfig.days -
        sprintConfig.holidays -
        (sprintConfig.personalDaysOff[dev] || 0)) *
        sprintConfig.hoursPerDay -
      sprintConfig.overhead
    );
  }, 0);
  const teamAlert =
    teamCapAvg < 1.5 || teamCapAvg > 2.5
      ? 'Adjust Capability'
      : teamRow.hours > teamAvailableHours * 0.8
      ? 'Reduce Hours'
      : 'OK';
  const teamRowEl = document.createElement('tr');
  teamRowEl.innerHTML = `
        <td><strong>Team</strong></td>
        <td>${teamRow.tasks}</td>
        <td>${teamRow.capPoints}</td>
        <td>${teamCapAvg.toFixed(2)}</td>
        <td>${teamRow.hours}</td>
        <td class="alert">${teamAlert}</td>`;
  table.appendChild(teamRowEl);
}

function saveAssignments() {
  saveData();
  alert('Assignments saved!');
  renderAssignmentsTable();
}

// Dashboard
function renderDashboard() {
  console.log('Rendering dashboard with assignments:', assignments);
  const teamCapAvg = document.getElementById('teamCapAvg');
  const teamHours = document.getElementById('teamHours');
  const teamAlert = document.getElementById('teamAlert');
  if (!teamCapAvg || !teamHours || !teamAlert) {
    console.error('Dashboard elements not found.');
    return;
  }

  if (!window.Chart) {
    console.error('Chart.js not loaded.');
    alert('Charts failed to load. Please check your internet connection.');
    return;
  }

  const capData = sprintConfig.developers.map((dev) => {
    const devTasks = Object.keys(assignments)
      .filter((id) => assignments[id] === dev)
      .map((id) => tasks.find((t) => t.id == id));
    const capPoints = devTasks
      .map((task) => {
        const capAvg =
          sprintConfig.developers
            .map((d) => {
              const val = votes[`${task.id}-${d}-cap`];
              return val === 'Green'
                ? 1
                : val === 'Yellow'
                ? 2
                : val === 'Red'
                ? 3
                : 0;
            })
            .filter((v) => v)
            .reduce((a, b) => a + b, 0) / (sprintConfig.developers.length || 1);
        return capAvg <= 1.49 ? 1 : capAvg <= 2.49 ? 2 : 3;
      })
      .reduce((a, b) => a + b, 0);
    return devTasks.length ? capPoints / devTasks.length : 0;
  });

  const hoursData = sprintConfig.developers.map((dev) => {
    const devTasks = Object.keys(assignments)
      .filter((id) => assignments[id] === dev)
      .map((id) => tasks.find((t) => t.id == id));
    return devTasks
      .map((task) => {
        const timeAvg =
          sprintConfig.developers
            .map((d) => {
              const val = votes[`${task.id}-${d}-time`];
              return val === 'Short'
                ? 1
                : val === 'Medium'
                ? 2
                : val === 'Long'
                ? 3
                : 0;
            })
            .filter((v) => v)
            .reduce((a, b) => a + b, 0) / (sprintConfig.developers.length || 1);
        return timeAvg <= 1.49 ? 2 : timeAvg <= 2.49 ? 4.5 : 9;
      })
      .reduce((a, b) => a + b, 0);
  });

  try {
    new Chart(document.getElementById('capChart'), {
      type: 'bar',
      data: {
        labels: sprintConfig.developers,
        datasets: [
          {
            label: 'Capability Average',
            data: capData,
            backgroundColor: capData.map((v) =>
              v < 1.5 || v > 2.5 ? '#dc3545' : '#28a745'
            ),
          },
        ],
      },
      options: { scales: { y: { beginAtZero: true, max: 3 } } },
    });

    new Chart(document.getElementById('hoursChart'), {
      type: 'bar',
      data: {
        labels: sprintConfig.developers,
        datasets: [
          {
            label: 'Hours',
            data: hoursData,
            backgroundColor: sprintConfig.developers.map((developer, index) => {
              const hours = hoursData[index] || 0;
              const availableHours =
                (sprintConfig.days -
                  sprintConfig.holidays -
                  (sprintConfig.personalDaysOff[developer] || 0)) *
                  sprintConfig.hoursPerDay -
                sprintConfig.overhead;
              return hours > availableHours * 0.8
                ? '#dc3545'
                : hours > availableHours * 0.6
                ? '#ffc107'
                : '#28a745';
            }),
          },
        ],
      },
      options: { scales: { y: { beginAtZero: true, max: 70 } } },
    });
  } catch (error) {
    console.error('Error rendering charts:', error);
    alert('Failed to render charts. Check console for details.');
  }

  const teamTasks = Object.keys(assignments).length;
  const teamCapPoints = Object.keys(assignments)
    .map((id) => {
      const task = tasks.find((t) => t.id == id);
      if (!task) return 0; // Handle missing task
      const capAvg =
        sprintConfig.developers
          .map((d) => {
            const val = votes[`${task.id}-${d}-cap`];
            return val === 'Green'
              ? 1
              : val === 'Yellow'
              ? 2
              : val === 'Red'
              ? 3
              : 0;
          })
          .filter((v) => v)
          .reduce((a, b) => a + b, 0) / (sprintConfig.developers.length || 1);
      return capAvg <= 1.49 ? 1 : capAvg <= 2.49 ? 2 : 3;
    })
    .reduce((a, b) => a + b, 0);
  const teamHoursTotal = Object.keys(assignments)
    .map((id) => {
      const task = tasks.find((t) => t.id == id);
      if (!task) return 0; // Handle missing task
      const timeAvg =
        sprintConfig.developers
          .map((d) => {
            const val = votes[`${task.id}-${d}-time`];
            return val === 'Short'
              ? 1
              : val === 'Medium'
              ? 2
              : val === 'Long'
              ? 3
              : 0;
          })
          .filter((v) => v)
          .reduce((a, b) => a + b, 0) / (sprintConfig.developers.length || 1);
      return timeAvg <= 1.49 ? 2 : timeAvg <= 2.49 ? 4.5 : 9;
    })
    .reduce((a, b) => a + b, 0);
  const teamAvailableHours = sprintConfig.developers.reduce((sum, dev) => {
    return (
      sum +
      (sprintConfig.days -
        sprintConfig.holidays -
        (sprintConfig.personalDaysOff[dev] || 0)) *
        sprintConfig.hoursPerDay -
      sprintConfig.overhead
    );
  }, 0);
  teamCapAvg.textContent = teamTasks
    ? (teamCapPoints / teamTasks).toFixed(2)
    : '0';
  teamHours.textContent = teamHoursTotal.toFixed(1);
  teamAlert.textContent =
    teamCapAvg.textContent < 1.5 || teamCapAvg.textContent > 2.5
      ? 'Adjust Capability'
      : teamHoursTotal > teamAvailableHours * 0.8
      ? 'Reduce Hours'
      : 'OK';
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
  if (document.getElementById('capChart')) renderDashboard();
  setActiveNav();
});
