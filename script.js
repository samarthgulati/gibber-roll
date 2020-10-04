var table = document.querySelector('table');
var loadBtn = document.querySelector('#load');
var clearBtn = document.querySelector('#clear');
var saveBtn = document.querySelector('#save');
var playPause = document.querySelector('#playPause');
var instrumentEl = document.querySelector('#instrumentEl');
var presetEl = document.querySelector('#presetEl');
var bpmSlider = document.querySelector('#bpmSlider');
var bpmEl = document.querySelector('#bpmEl');
var columnsEl = document.querySelector('#columnsEl');
var rowsEl = document.querySelector('#rowsEl');
var transposeEl = document.querySelector('#transposeEl');
var octDown = document.querySelector('#octDown');
var octUp = document.querySelector('#octUp');
var labelsEl = document.querySelector('aside');
// var reverbEl = document.querySelector('#reverbEl');
var drumRevEl = document.querySelector('#drumRevEl');
var instRevEl = document.querySelector('#instRevEl');
// var delayEl = document.querySelector('#delayEl');
var drumDelayEl = document.querySelector('#drumDelayEl');
var instrumentDelayEl = document.querySelector('#instDelayEl');
var delayTimeEl = document.querySelector('#delayTimeEl');
var jsonUrl = JsonUrl('lzma');
var keyboard = buildKeyboard(1, 7);

function buildKeyboard(min, max) {
  var notes = ['C ', 'C#', 'D ', 'D#', 'E ', 'F ', 'F#', 'G ', 'G#', 'A ', 'A#', 'B '];
  var keyboard = [];
  for(var i = min; i <= max; i++) {
    for(var j = 0; j < notes.length; j++) {
      keyboard.push(`${notes[j]} ${i}`);
    }
  }
  return keyboard;
}

var columns = 16;
var rows = 16;

var incBy = 1;

var steps = {};
var notes = [];
var stepsObj = {};
var sequencer;
var instrument;
var previewInstrument;

var drumSteps = {};
var drumNotes = ['oh', 'ch', 'sd', 'kd'];
var drumStepsObj = {};
var drumSequencer;
var drums;
var previewDrums;
var reverb;
// var drumRev = 0;
// var instrumentRev = 1;
var delay;
// var drumDelay = 0;
// var instrumentDelay = 0.5;
var delayTime;

function updateColumns(idx, row, instrument, note) {
  for (var c = 0; c < columns; c++) {
    var cell = document.createElement('td');
    cell.dataset.note = note;
    cell.dataset.instrument = instrument;
    cell.style.setProperty('--row', idx);
    cell.classList.add(Math.floor(0.25*c) % 2 ? 'light' : 'dark');
    row.appendChild(cell);
  }
}

function updateTable() {
  if(playPause.textContent !== '►') {
    stop();
  }
  labelsEl.innerHTML = '';
  table.innerHTML = '';
  columns = columnsEl.value;
  rows = rowsEl.value;
  table.style.setProperty('--rows', rows);
  for(var r = 0; r < rows; r++) {
    var note = (rows-r-1) * incBy;
    notes.push(note);
    steps[note] = document.createElement('tr');
    table.appendChild(steps[note]);
    labelsEl.appendChild(document.createElement('span'));
    updateColumns(r, steps[note], 'synth', note);
  }

  for(var d = 0; d < drumNotes.length; d++) {
    var note = drumNotes[d];
    drumSteps[note] = document.createElement('tr');
    drumSteps[note].classList.add('drums');
    drumSteps[note].style.setProperty('--h', 300*d/4);
    table.appendChild(drumSteps[note]);
    var label = document.createElement('span');
    label.textContent = note;
    label.classList.add('drums');
    labelsEl.appendChild(label);
    updateColumns(d, drumSteps[note], 'drums', note);
  }
  updateLabels();
}

function playNote(instr, note) {
  if(instr !== 'drums') {
    // instrument.stop();
    previewInstrument.note(Number(note) + Number(transposeEl.value) * incBy);
    return;
  }
  previewDrums.play(note);
  return;
}

function handleTableClick(e) {
  var td = e.composedPath()[0];
  if(td.tagName !== 'TD') return;
  td.classList.toggle('on');
  if(td.classList.contains('on')) {
    playNote(td.dataset.instrument, td.dataset.note);
  }
  if(playPause.textContent !== '►') {
    stop();
    play();
  }
}

function updateSequence() {
  stepsObj = {};
  for(var i = 0; i < notes.length; i++) {
    var note = notes[i];
    var noteEl = steps[note];
    stepsObj[note] = '';
    for(var j = 0; j < noteEl.children.length; j++) {
      var cell = noteEl.children[j];
      if(cell.classList.contains('on')) {
        stepsObj[note] += 'x';
      } else {
        stepsObj[note] += '.';
      }
    }
  }
  drumStepsObj = {};
  for(var k = 0; k < drumNotes.length; k++) {
    var note = drumNotes[k];
    var noteEl = drumSteps[note];
    drumStepsObj[note] = '';
    for(var l = 0; l < noteEl.children.length; l++) {
      var cell = noteEl.children[l];
      if(cell.classList.contains('on')) {
        drumStepsObj[note] += 'x';
      } else {
        drumStepsObj[note] += '.';
      }
    }
  }
}

function stop() {
  if(!sequencer) return;
  sequencer.stop();
  drumSequencer.stop();
  playPause.textContent = '►';
  playPause.classList.remove('playing');
}

function transposedSteps() {
  var transposedStepsObj = {};
  var transposeBy = Number(transposeEl.value) * incBy;
  var steps = Object.keys(stepsObj);
  for(var i = 0; i < steps.length; i++) {
    var step = Number(steps[i]);
    transposedStepsObj[step + transposeBy] = stepsObj[step];
  }
  return transposedStepsObj;
}

function play() {
  updateSequence();
  var transposedStepsObj = transposedSteps();
  sequencer = Gibber.Steps(transposedStepsObj, instrument);
  drumSequencer = Gibber.Steps(drumStepsObj, drums);
  playPause.textContent = '■';
  playPause.classList.add('playing');
}

function togglePlayPause() {
  if(playPause.textContent === '►') {
    play();
  } else {
    stop();
  }
}

function hideOverlay() {
  reverb = Bus2().fx.add( Freeverb() );
  delayFX = Delay({ time: 1 / 6, feedback: .75 });
  delay = Bus2().fx.add( delayFX );
  updateInstrument({target: instrumentEl});
  // updateReverb();
  // updateDelay();
  updateDelayTime();
  drums = Drums();
  // drums.connect( reverb, drumRev );
  // drums.connect( delay, drumDelay );

  previewDrums = Drums();
  
  document.querySelector('#overlay').style.display = 'none';
  load();
}

function loadGibber() {
  loadBtn.disabled = true;
  loadBtn.textContent = 'Loading...';
  Gibber.init()
  .then(hideOverlay);
}

function updateInstrument(e) {
  var isPlaying = playPause.textContent !== '►';
  if(isPlaying) {
    stop();
  }
  if(e.target === instrumentEl) {
    updatePresets();
  }
  var preset = presetEl.value === '' ? undefined : presetEl.value;
  instrument = window[instrumentEl.value](preset);
  // instrument.connect( reverb, instrumentRev );
  // instrument.connect( delay, instrumentDelay );

  previewInstrument = window[instrumentEl.value](preset);
  if(isPlaying) {
    play();
  }
}

function clearGrid() {
  var onCells = table.querySelectorAll('.on');
  for(var i = 0; i < onCells.length; i++) {
    onCells[i].classList.remove('on');
  }
  togglePlayPause();
}

function updateBpm() {
  Clock.bpm = bpmEl.value;
}

function updateBpmInput() {
  bpmSlider.value = bpmEl.value;
  updateBpm();
}

function updateBpmSlider() {
  bpmEl.value = bpmSlider.value;
  updateBpm();
}

function updatePresets() {
  presetEl.innerHTML = '<option value=""></option>';
  var presets = Object.keys(Gibber.Audio.Presets.instruments[instrumentEl.value]);
  for(var i = 0; i < presets.length; i++) {
    var opt = document.createElement('option');
    opt.value = presets[i];
    opt.textContent = presets[i];
    presetEl.appendChild(opt);
  }
}

function updateLabels() {
  var shift = Number(transposeEl.value);
  var startIndex = keyboard.indexOf('C  4') + shift;
  var labels = keyboard.slice(startIndex, startIndex + Number(rowsEl.value));
  for(var i = 0; i < labels.length; i++) {
    var index = (labelsEl.children.length - 1) - 4 - i;
    var labelEl = labelsEl.children[index];
    var row = table.children[index];
    row.style.setProperty('--h', 360*((i-shift)%12)/12);
    labelEl.textContent = labels[i];
    if(labels[i].includes('#')) {
      row.classList.add('black');
      row.classList.remove('white');
      labelEl.classList.add('black');
      labelEl.classList.remove('white');
    } else {
      row.classList.remove('black');
      row.classList.add('white');
      labelEl.classList.remove('black');
      labelEl.classList.add('white');
    }
  }
}

function updateTranspose(e) {
  stop();
  var delta = e.target.tagName === 'BUTTON' ? Number(e.target.textContent) : 0;
  transposeEl.value = Math.max(
    Number(transposeEl.min), 
    Math.min(
      Number(transposeEl.max), 
      Number(transposeEl.value) + delta
    )
  );
  updateLabels();
}

// function updateReverb() {
//   reverb.gain = Number(reverbEl.value);
// }

// function updateDelay() {
//   delay.gain = Number(delayEl.value);
// }

function updateInstrumentReverb() {
  instrument.connect(reverb, Number(instRevEl.value));
}

function updateDrumReverb() {
  drums.connect(reverb, Number(drumRevEl.value));
}

function updateInstrumentDelay() {
  instrument.connect(delay, Number(instDelayEl.value));
}

function updateDrumDelay() {
  drums.connect(delay, Number(drumDelayEl.value));
}

function updateDelayTime() {
  delayFX.time = 1 / Number(delayTimeEl.value);
}

function save() {
  updateSequence();
  var state = {
    instrumentEl: instrumentEl.value,
    presetEl: presetEl.value,
    stepsObj: stepsObj,
    drumStepsObj: drumStepsObj,
    drumRevEl: drumRevEl.value,
    instRevEl: instRevEl.value,
    drumDelayEl: drumDelayEl.value,
    instDelayEl: instDelayEl.value,
    delayTimeEl: delayTimeEl.value,
    bpmEl: bpmEl.value,
    rowsEl: rowsEl.value,
    columnsEl: columnsEl.value,
    transposeEl: transposeEl.value
  };
  
  var searchParams = new URLSearchParams(window.location.search);
  // searchParams.set('state', btoa(JSON.stringify(state)));
  jsonUrl.compress(state).then(stateParam => { 
    searchParams.set('state', stateParam);
    var newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + "?" + searchParams.toString();
    window.history.pushState({ path: newUrl }, '', newUrl);
  });
}

function updateGridFromObj() {
  for(var i = 0; i < notes.length; i++) {
    var note = notes[i];
    var noteEl = steps[note];
    var cellState = stepsObj[note].split('');
    for(var j = 0; j < noteEl.children.length; j++) {
      var cell = noteEl.children[j];
      if(cellState[j] === 'x') {
        cell.classList.add('on');
      }
    }
  }

  for(var k = 0; k < drumNotes.length; k++) {
    var note = drumNotes[k];
    var noteEl = drumSteps[note];
    var cellState = drumStepsObj[note].split('');
    for(var l = 0; l < noteEl.children.length; l++) {
      var cell = noteEl.children[l];
      if(cellState[l] === 'x') {
        cell.classList.add('on');
      }
    }
  }
}

function loadState(state) {
  var keys = Object.keys(state);
  for(var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if(key.endsWith('El')) {
      window[key].value = state[key];
    } else if(key.endsWith('Obj')) {
      window[key] = state[key];
    }
  }
  updateTable();
  updateInstrument({target: instrumentEl});
  presetEl.value = state.presetEl;
  // throws error regarding delay for some presets
  try {
    updateInstrument({target: ''});
  } catch(e) {
    console.error(e);
  }
  updateBpmInput();
  updateTranspose({target: { tagName : ''}});
  updateDrumReverb();
  updateInstrumentReverb();
  updateDrumDelay();
  updateInstrumentDelay();
  // starts playing some sound on setting value
  // updateDelayTime();
  updateGridFromObj();
}

function load() {
  var searchParams = new URLSearchParams(window.location.search);
  if(!searchParams.has('state')) return;
  jsonUrl.decompress(searchParams.get('state')).then(loadState);
}

clearBtn.addEventListener('click', clearGrid);
saveBtn.addEventListener('click', save);
loadBtn.addEventListener('click', loadGibber);
playPause.addEventListener('click', togglePlayPause);
instrumentEl.addEventListener('change', updateInstrument);
presetEl.addEventListener('change', updateInstrument);
bpmSlider.addEventListener('input', updateBpmSlider);
bpmEl.addEventListener('change', updateBpmInput);
columnsEl.addEventListener('change', updateTable);
rowsEl.addEventListener('change', updateTable);
table.addEventListener('click', handleTableClick);
transposeEl.addEventListener('change', updateTranspose);
octUp.addEventListener('click', updateTranspose);
octDown.addEventListener('click', updateTranspose);
// reverbEl.addEventListener('change', updateReverb);
drumRevEl.addEventListener('change', updateDrumReverb);
instRevEl.addEventListener('change', updateInstrumentReverb);
// delayEl.addEventListener('change', updateDelay);
drumDelayEl.addEventListener('change', updateDrumDelay);
instDelayEl.addEventListener('change', updateInstrumentDelay);
delayTimeEl.addEventListener('change', updateDelayTime);

updateTable();