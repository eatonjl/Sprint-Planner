// Global variables
let sprintConfig = {
  developers: [],
  days: 10,
  holidays: 0,
  personalDaysOff: {},
  hoursPerDay: 6,
  overhead: 4,
  buffer: 0.15,
  useOverallVoting: false,
};
let tasks = [];
let assignments = {};
let votes = {};

// Initialize data from localStorage
function initialize() {
  const savedConfig = localStorage.getItem('sprintConfig');
  if (savedConfig) {
    sprintConfig = JSON.parse(savedConfig);
  }
  const savedTasks = localStorage.getItem('tasks');
  if (savedTasks) {
    tasks = JSON.parse(savedTasks);
  }
  const savedAssignments = localStorage.getItem('assignments');
  if (savedAssignments) {
    assignments = JSON.parse(savedAssignments);
  }
  const savedVotes = localStorage.getItem('votes');
  if (savedVotes) {
    votes = JSON.parse(savedVotes);
  }
}

// Save data to localStorage
function saveData() {
  localStorage.setItem('sprintConfig', JSON.stringify(sprintConfig));
  localStorage.setItem('tasks', JSON.stringify(tasks));
  localStorage.setItem('assignments', JSON.stringify(assignments));
  localStorage.setItem('votes', JSON.stringify(votes));
}

// Render the Workload Summary table on assignments.html
function renderSummaryTable() {
  const table = document.getElementById('summaryTable');
  if (!table) return;
  table.innerHTML = '';
  const teamRow = { tasks: 0, capPoints: 0, hours: 0 };
  const developerAlerts = [];
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
    const workloadPercentage = availableHours > 0 ? hours / availableHours : 0;
    let alert;
    if (workloadPercentage < 0.6) {
      alert = hours > availableHours ? 'Reduce Hours' : 'OK';
    } else if (workloadPercentage < 0.8) {
      alert =
        capAvg < 1.5
          ? 'Consider More Challenge'
          : capAvg > 2.5
          ? 'Review Task Difficulty'
          : hours > availableHours
          ? 'Reduce Hours'
          : 'OK';
    } else {
      alert =
        capAvg < 1.5
          ? 'Consider More Challenge'
          : capAvg > 2.49
          ? 'Adjust Capability'
          : hours > availableHours
          ? 'Reduce Hours'
          : 'OK';
    }
    const alertClass =
      alert === 'Review Task Difficulty'
        ? 'alert-review'
        : alert === 'Adjust Capability'
        ? 'alert-adjust'
        : alert === 'Consider More Challenge'
        ? 'alert-challenge'
        : alert === 'Reduce Hours'
        ? 'alert-hours'
        : 'alert-ok';

    developerAlerts.push({ alert, capAvg, workloadPercentage });

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${dev}</td>
      <td>${devTasks.length}</td>
      <td>${capPoints}</td>
      <td>${capAvg ? capAvg.toFixed(2) + '/2' : '-'}</td>
      <td>${hours}/${availableHours}</td>
      <td class="alert ${alertClass}">${alert}</td>`;
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
  const teamWorkloadPercentage =
    teamAvailableHours > 0 ? teamRow.hours / teamAvailableHours : 0;
  let teamAlert;
  const allOK = developerAlerts.every((da) => da.alert === 'OK');
  if (allOK) {
    teamAlert = 'OK';
  } else {
    const hasHighCapLowHours = developerAlerts.some(
      (da) => da.capAvg > 2.5 && da.workloadPercentage < 0.6
    );
    if (hasHighCapLowHours) {
      teamAlert = 'Adjust Capability';
    } else if (teamWorkloadPercentage < 0.6) {
      teamAlert = teamRow.hours > teamAvailableHours ? 'Reduce Hours' : 'OK';
    } else if (teamWorkloadPercentage < 0.8) {
      teamAlert =
        teamCapAvg < 1.5
          ? 'Consider More Challenge'
          : teamCapAvg > 2.5
          ? 'Review Task Difficulty'
          : teamRow.hours > teamAvailableHours
          ? 'Reduce Hours'
          : 'OK';
    } else {
      teamAlert =
        teamCapAvg < 1.5
          ? 'Consider More Challenge'
          : teamCapAvg > 2.49
          ? 'Adjust Capability'
          : teamRow.hours > teamAvailableHours
          ? 'Reduce Hours'
          : 'OK';
    }
  }
  const teamAlertClass =
    teamAlert === 'Review Task Difficulty'
      ? 'alert-review'
      : teamAlert === 'Adjust Capability'
      ? 'alert-adjust'
      : teamAlert === 'Consider More Challenge'
      ? 'alert-challenge'
      : teamAlert === 'Reduce Hours'
      ? 'alert-hours'
      : 'alert-ok';
  const teamRowEl = document.createElement('tr');
  teamRowEl.innerHTML = `
    <td><strong>Team</strong></td>
    <td>${teamRow.tasks}</td>
    <td>${teamRow.capPoints}</td>
    <td>${teamCapAvg ? teamCapAvg.toFixed(2) + '/2' : '-'}</td>
    <td>${teamRow.hours}/${teamAvailableHours}</td>
    <td class="alert ${teamAlertClass}">${teamAlert}</td>`;
  table.appendChild(teamRowEl);
}

// Render the Assignments table on assignments.html
function renderAssignmentsTable() {
  const table = document.getElementById('assignmentsTable');
  if (!table) return;
  table.innerHTML = '';
  tasks.forEach((task) => {
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
    const capColor =
      capAvg <= 1.49 ? 'Green' : capAvg <= 2.49 ? 'Yellow' : 'Red';
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
    const timeColor =
      timeAvg <= 1.49 ? 'Short' : timeAvg <= 2.49 ? 'Medium' : 'Long';
    const hours = timeAvg <= 1.49 ? 2 : timeAvg <= 2.49 ? 4.5 : 9;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${task.id}</td>
      <td>${task.description}</td>
      <td class="${capColor.toLowerCase()}">${capColor}</td>
      <td class="${timeColor.toLowerCase()}">${timeColor}</td>
      <td>${hours}</td>
      <td>
        <select class="form-select" onchange="updateAssignment(${
          task.id
        }, this.value)">
          <option value="">Unassigned</option>
          ${sprintConfig.developers
            .map(
              (dev) =>
                `<option value="${dev}" ${
                  assignments[task.id] === dev ? 'selected' : ''
                }>${dev}</option>`
            )
            .join('')}
        </select>
      </td>`;
    table.appendChild(row);
  });
}

// Update assignment for a task
function updateAssignment(taskId, developer) {
  if (developer) {
    assignments[taskId] = developer;
  } else {
    delete assignments[taskId];
  }
  saveData();
  renderSummaryTable();
}

// Save assignments
function saveAssignments() {
  saveData();
  alert('Assignments saved!');
}

// Render the Tasks table on tasks.html
function renderTasksTable() {
  const table = document.getElementById('tasksTable');
  if (!table) return;
  table.innerHTML = '';
  tasks.forEach((task) => {
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
    const capColor =
      capAvg <= 1.49 ? 'Green' : capAvg <= 2.49 ? 'Yellow' : 'Red';
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
    const timeColor =
      timeAvg <= 1.49 ? 'Short' : timeAvg <= 2.49 ? 'Medium' : 'Long';
    const hours = timeAvg <= 1.49 ? 2 : timeAvg <= 2.49 ? 4.5 : 9;
    const composite = capAvg * hours;
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

// Render the Voting table on voting.html
function renderVotingTable() {
  const thead = document.getElementById('votingTableHead');
  const tbody = document.getElementById('votingTable');
  if (!thead || !tbody) return;
  thead.innerHTML = '';
  tbody.innerHTML = '';

  const headerRow = document.createElement('tr');
  headerRow.innerHTML = '<th>Task #</th><th>Description</th>';
  if (sprintConfig.useOverallVoting) {
    headerRow.innerHTML += '<th>Overall Capability</th><th>Overall Time</th>';
  } else {
    sprintConfig.developers.forEach((dev) => {
      headerRow.innerHTML += `<th>${dev} Capability</th><th>${dev} Time</th>`;
    });
  }
  thead.appendChild(headerRow);

  tasks.forEach((task) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${task.id}</td><td>${task.description}</td>`;
    if (sprintConfig.useOverallVoting) {
      row.innerHTML += `
        <td>
          <select class="form-select overall-cap" onchange="updateOverallVote(${
            task.id
          }, 'cap', this.value)">
            <option value="">Select</option>
            <option value="Green" ${
              votes[`${task.id}-overall-cap`] === 'Green' ? 'selected' : ''
            }>Green</option>
            <option value="Yellow" ${
              votes[`${task.id}-overall-cap`] === 'Yellow' ? 'selected' : ''
            }>Yellow</option>
            <option value="Red" ${
              votes[`${task.id}-overall-cap`] === 'Red' ? 'selected' : ''
            }>Red</option>
          </select>
        </td>
        <td>
          <select class="form-select overall-time" onchange="updateOverallVote(${
            task.id
          }, 'time', this.value)">
            <option value="">Select</option>
            <option value="Short" ${
              votes[`${task.id}-overall-time`] === 'Short' ? 'selected' : ''
            }>Short</option>
            <option value="Medium" ${
              votes[`${task.id}-overall-time`] === 'Medium' ? 'selected' : ''
            }>Medium</option>
            <option value="Long" ${
              votes[`${task.id}-overall-time`] === 'Long' ? 'selected' : ''
            }>Long</option>
          </select>
        </td>`;
    } else {
      sprintConfig.developers.forEach((dev) => {
        row.innerHTML += `
          <td>
            <select class="form-select cap" onchange="updateVote(${
              task.id
            }, '${dev}', 'cap', this.value)">
              <option value="">Select</option>
              <option value="Green" ${
                votes[`${task.id}-${dev}-cap`] === 'Green' ? 'selected' : ''
              }>Green</option>
              <option value="Yellow" ${
                votes[`${task.id}-${dev}-cap`] === 'Yellow' ? 'selected' : ''
              }>Yellow</option>
              <option value="Red" ${
                votes[`${task.id}-${dev}-cap`] === 'Red' ? 'selected' : ''
              }>Red</option>
            </select>
          </td>
          <td>
            <select class="form-select time" onchange="updateVote(${
              task.id
            }, '${dev}', 'time', this.value)">
              <option value="">Select</option>
              <option value="Short" ${
                votes[`${task.id}-${dev}-time`] === 'Short' ? 'selected' : ''
              }>Short</option>
              <option value="Medium" ${
                votes[`${task.id}-${dev}-time`] === 'Medium' ? 'selected' : ''
              }>Medium</option>
              <option value="Long" ${
                votes[`${task.id}-${dev}-time`] === 'Long' ? 'selected' : ''
              }>Long</option>
            </select>
          </td>`;
      });
    }
    tbody.appendChild(row);
  });
}

// Update individual vote
function updateVote(taskId, developer, type, value) {
  votes[`${taskId}-${developer}-${type}`] = value;
  saveData();
}

// Update overall vote (applies to all developers)
function updateOverallVote(taskId, type, value) {
  sprintConfig.developers.forEach((dev) => {
    votes[`${taskId}-${dev}-${type}`] = value;
  });
  votes[`${taskId}-overall-${type}`] = value;
  saveData();
}

// Save votes
function saveVotes() {
  saveData();
  alert('Votes saved!');
}

// Add a new task
function addTask(description) {
  const taskId = tasks.length ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
  tasks.push({ id: taskId, description });
  saveData();
  renderVotingTable();
  renderTasksTable();
  renderAssignmentsTable();
}

// Handle task form submission
function setupTaskForm() {
  const form = document.getElementById('taskForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const description = document.getElementById('taskDescription').value;
      if (description) {
        addTask(description);
        form.reset();
      }
    });
  }
}

// Handle setup form submission
function saveSetup() {
  const form = document.getElementById('setupForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      sprintConfig.days = parseInt(document.getElementById('days').value) || 10;
      sprintConfig.hoursPerDay =
        parseInt(document.getElementById('hoursPerDay').value) || 6;
      sprintConfig.overhead =
        parseInt(document.getElementById('overhead').value) || 4;
      sprintConfig.holidays =
        parseInt(document.getElementById('holidays').value) || 0;
      sprintConfig.buffer =
        parseInt(document.getElementById('buffer').value) / 100 || 0.15;
      sprintConfig.useOverallVoting =
        document.getElementById('useOverallVoting').checked;
      const developersInput = document.getElementById('developers').value;
      sprintConfig.developers = developersInput
        .split(',')
        .map((d) => d.trim())
        .filter((d) => d);
      const personalDaysOffInput =
        document.getElementById('personalDaysOff').value;
      sprintConfig.personalDaysOff = {};
      if (personalDaysOffInput) {
        personalDaysOffInput.split(',').forEach((entry) => {
          const [name, days] = entry.split(':').map((s) => s.trim());
          if (name && days) {
            sprintConfig.personalDaysOff[name] = parseInt(days) || 0;
          }
        });
      }
      saveData();
      alert('Setup saved!');
      renderVotingTable();
      renderAssignmentsTable();
      renderSummaryTable();
      renderTasksTable();
    });
  }
}

// Render the dashboard charts and widgets on dashboard.html
function renderDashboard() {
  const teamTasks = Object.keys(assignments).map((id) =>
    tasks.find((t) => t.id == id)
  );
  const capData = sprintConfig.developers.map((developer) => {
    const devTasks = Object.keys(assignments)
      .filter((id) => assignments[id] === developer)
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
  const hoursData = sprintConfig.developers.map((developer) => {
    const devTasks = Object.keys(assignments)
      .filter((id) => assignments[id] === developer)
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

  // Calculate maximum target hours for y-axis scaling
  const targetHours = sprintConfig.developers.map((developer) => {
    return (
      (sprintConfig.days -
        sprintConfig.holidays -
        (sprintConfig.personalDaysOff[developer] || 0)) *
        sprintConfig.hoursPerDay -
      sprintConfig.overhead
    );
  });
  const maxTargetHours = Math.max(...targetHours, 0);

  // Capability Chart
  if (typeof Chart !== 'undefined') {
    new Chart(document.getElementById('capChart'), {
      type: 'bar',
      data: {
        labels: sprintConfig.developers,
        datasets: [
          {
            label: 'Capability Average',
            data: capData,
            backgroundColor: sprintConfig.developers.map((developer, index) => {
              const v = capData[index];
              const hours = hoursData[index] || 0;
              const availableHours =
                (sprintConfig.days -
                  sprintConfig.holidays -
                  (sprintConfig.personalDaysOff[developer] || 0)) *
                  sprintConfig.hoursPerDay -
                sprintConfig.overhead;
              const workloadPercentage =
                availableHours > 0 ? hours / availableHours : 0;
              if (
                hours > availableHours ||
                (workloadPercentage >= 0.8 && v >= 2.5)
              ) {
                return '#dc3545';
              } else if (
                workloadPercentage >= 0.6 &&
                workloadPercentage <= 1.0 &&
                v >= 1.5 &&
                v < 2.5
              ) {
                return '#ffc107';
              } else {
                return '#28a745';
              }
            }),
          },
        ],
      },
      options: { scales: { y: { beginAtZero: true, max: 3 } } },
    });
  } else {
    console.warn('Chart.js is not loaded. Capability Chart will not render.');
  }

  // Hours Chart
  if (typeof Chart !== 'undefined') {
    new Chart(document.getElementById('hoursChart'), {
      type: 'bar',
      data: {
        labels: sprintConfig.developers.map((developer, index) => {
          const availableHours =
            (sprintConfig.days -
              sprintConfig.holidays -
              (sprintConfig.personalDaysOff[developer] || 0)) *
              sprintConfig.hoursPerDay -
            sprintConfig.overhead;
          return `${developer}\n${availableHours}h`;
        }),
        datasets: [
          {
            label: 'Hours Assigned',
            data: hoursData,
            backgroundColor: sprintConfig.developers.map((developer, index) => {
              const hours = hoursData[index] || 0;
              const availableHours =
                (sprintConfig.days -
                  sprintConfig.holidays -
                  (sprintConfig.personalDaysOff[developer] || 0)) *
                  sprintConfig.hoursPerDay -
                sprintConfig.overhead;
              return hours > availableHours
                ? '#dc3545'
                : hours > availableHours * 0.8
                ? '#ffc107'
                : '#28a745';
            }),
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: Math.ceil(maxTargetHours * 1.1), // 10% buffer above max target hours
          },
        },
        plugins: {
          legend: { display: true },
          tooltip: { enabled: true },
        },
        maintainAspectRatio: false,
      },
    });
  } else {
    console.warn('Chart.js is not loaded. Hours Chart will not render.');
  }

  // Team Capability, Hours, and Alert Widgets
  const teamCapEl = document.getElementById('teamCapAvg');
  const teamHoursEl = document.getElementById('teamHours');
  const teamAlertEl = document.getElementById('teamAlert');
  if (teamCapEl && teamHoursEl && teamAlertEl) {
    const teamTasks = Object.keys(assignments).map((id) =>
      tasks.find((t) => t.id == id)
    );
    const teamCapAvg = teamTasks.length
      ? teamTasks
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
                .reduce((a, b) => a + b, 0) /
              (sprintConfig.developers.length || 1);
            return capAvg <= 1.49 ? 1 : capAvg <= 2.49 ? 2 : 3;
          })
          .reduce((a, b) => a + b, 0) / teamTasks.length
      : 0;
    const teamHours = teamTasks
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
    const teamWorkloadPercentage =
      teamAvailableHours > 0 ? teamHours / teamAvailableHours : 0;

    const developerAlerts = sprintConfig.developers.map((dev) => {
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
              .reduce((a, b) => a + b, 0) /
            (sprintConfig.developers.length || 1);
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
              .reduce((a, b) => a + b, 0) /
            (sprintConfig.developers.length || 1);
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
      const workloadPercentage =
        availableHours > 0 ? hours / availableHours : 0;
      let alert;
      if (workloadPercentage < 0.6) {
        alert = hours > availableHours ? 'Reduce Hours' : 'OK';
      } else if (workloadPercentage < 0.8) {
        alert =
          capAvg < 1.5
            ? 'Consider More Challenge'
            : capAvg > 2.5
            ? 'Review Task Difficulty'
            : hours > availableHours
            ? 'Reduce Hours'
            : 'OK';
      } else {
        alert =
          capAvg < 1.5
            ? 'Consider More Challenge'
            : capAvg > 2.49
            ? 'Adjust Capability'
            : hours > availableHours
            ? 'Reduce Hours'
            : 'OK';
      }
      return { alert, capAvg, workloadPercentage };
    });

    let teamAlert;
    const allOK = developerAlerts.every((da) => da.alert === 'OK');
    if (allOK) {
      teamAlert = 'OK';
    } else {
      const hasHighCapLowHours = developerAlerts.some(
        (da) => da.capAvg > 2.5 && da.workloadPercentage < 0.6
      );
      if (hasHighCapLowHours) {
        teamAlert = 'Adjust Capability';
      } else if (teamWorkloadPercentage < 0.6) {
        teamAlert = teamHours > teamAvailableHours ? 'Reduce Hours' : 'OK';
      } else if (teamWorkloadPercentage < 0.8) {
        teamAlert =
          teamCapAvg < 1.5
            ? 'Consider More Challenge'
            : teamCapAvg > 2.5
            ? 'Review Task Difficulty'
            : teamHours > teamAvailableHours
            ? 'Reduce Hours'
            : 'OK';
      } else {
        teamAlert =
          teamCapAvg < 1.5
            ? 'Consider More Challenge'
            : teamCapAvg > 2.49
            ? 'Adjust Capability'
            : teamHours > teamAvailableHours
            ? 'Reduce Hours'
            : 'OK';
      }
    }
    const teamAlertClass =
      teamAlert === 'Review Task Difficulty'
        ? 'alert-review'
        : teamAlert === 'Adjust Capability'
        ? 'alert-adjust'
        : teamAlert === 'Consider More Challenge'
        ? 'alert-challenge'
        : teamAlert === 'Reduce Hours'
        ? 'alert-hours'
        : 'alert-ok';
    teamCapEl.innerHTML = teamCapAvg ? teamCapAvg.toFixed(2) : '-';
    teamHoursEl.innerHTML = teamHours ? teamHours.toFixed(2) : '-';
    teamAlertEl.innerHTML = teamAlert;
    teamAlertEl.className = `alert ${teamAlertClass}`;
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  initialize();
  setupTaskForm();
  saveSetup();
  renderVotingTable();
  renderTasksTable();
  renderAssignmentsTable();
  renderSummaryTable();
  renderDashboard();
});
