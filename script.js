var table = document.querySelector('table');
var codeBtn = document.querySelector('#code');
var loadBtn = document.querySelector('#load');
var clearBtn = document.querySelector('#clear');
var saveBtn = document.querySelector('#save');
var remixInstBtn = document.querySelector('#remixInst');
var remixDrumsBtn = document.querySelector('#remixDrums');
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
var synthLabelsEl = document.querySelector('#synthLabels');
var drumLabelsEl = document.querySelector('#drumLabels');
var reverbEl = document.querySelector('#reverbEl');
var drumRevEl = document.querySelector('#drumRevEl');
var instRevEl = document.querySelector('#instRevEl');
var delayEl = document.querySelector('#delayEl');
var drumDelayEl = document.querySelector('#drumDelayEl');
var instDelayEl = document.querySelector('#instDelayEl');
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
var bpmMult = 1;

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

function setupColumns(idx, row, instrument, note) {
  for (var c = 0; c < columns; c++) {
    var cell = document.createElement('td');
    cell.dataset.note = note;
    cell.dataset.instrument = instrument;
    cell.style.setProperty('--row', idx);
    cell.classList.add(Math.floor(0.25*c) % 2 ? 'light' : 'dark');
    row.appendChild(cell);
  }
}

function setupTable() {
  synthLabelsEl.innerHTML = '';
  drumLabelsEl.innerHTML = '';
  table.innerHTML = '';
  columns = columnsEl.value;
  rows = rowsEl.value;
  bpmMult = 16 / columns;
  document.body.style.setProperty('--rows', rows);
  for(var r = 0; r < rows; r++) {
    var note = (rows-r-1) * incBy;
    notes.push(note);
    steps[note] = document.createElement('tr');
    table.appendChild(steps[note]);
    synthLabelsEl.appendChild(document.createElement('span'));
    setupColumns(r, steps[note], 'synth', note);
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
    drumLabelsEl.appendChild(label);
    setupColumns(d, drumSteps[note], 'drums', note);
  }
  updateLabels();
}

function playNote(inst, note) {
  if(inst !== 'drums') {
    // instrument.stop();
    previewInstrument.note(Number(note) + Number(transposeEl.value) * incBy);
    return;
  }
  previewDrums.play(note);
  return;
}

function handleTableClick(e) {
  var isPlaying = playPause.textContent !== '►';
  if(isPlaying) {
    stop();
  }
  var td = e.composedPath()[0];
  if(td.tagName !== 'TD') return;
  td.classList.toggle('on');
  if(td.classList.contains('on')) {
    playNote(td.dataset.instrument, td.dataset.note);
  }
  if(isPlaying) {
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

function setup() {
  reverb = Bus2().fx.add( Freeverb() );
  delayFX = Delay({ time: 1 / 6, feedback: .75 });
  delay = Bus2().fx.add( delayFX );
  updateInstrument({target: instrumentEl});
  updateReverb();
  updateDelay();
  updateDelayTime();
  drums = Drums();
  drums.connect( reverb, Number(drumRevEl.value) );
  drums.connect( delay, Number(drumDelayEl.value) );

  previewDrums = Drums();
  hideOverlay();
  load();
}

function hideOverlay() {
  document.querySelector('#overlay').style.display = 'none';
}

function showOverlay() {
  document.querySelector('#overlay').style.display = 'flex';
}

function loadGibber() {
  loadBtn.disabled = true;
  loadBtn.textContent = 'Loading...';
  Gibber.init()
  .then(setup);
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
  if (instrument !== undefined) instrument.clear();
  instrument = window[instrumentEl.value](preset);
  instrument.connect( reverb, Number(instRevEl.value) );
  instrument.connect( delay, Number(instDelayEl.value) );

  if (previewInstrument !== undefined) previewInstrument.clear();
  previewInstrument = window[instrumentEl.value](preset);
  if(isPlaying) {
    play();
  }
}

function clearGrid() {
  stepsObj = {};
  drumStepsObj = {};
  var onCells = table.querySelectorAll('.on');
  for(var i = 0; i < onCells.length; i++) {
    onCells[i].classList.remove('on');
  }
  var isPlaying = playPause.textContent !== '►';
  if(isPlaying) {
    stop();
  }
}

function updateBpm() {
  Clock.bpm = bpmEl.value * bpmMult;
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
    var index = (synthLabelsEl.children.length - 1) - i;
    var labelEl = synthLabelsEl.children[index];
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
  var isPlaying = playPause.textContent !== '►';
  if(isPlaying) {
    stop();
  }
  var delta = e.target.tagName === 'BUTTON' ? Number(e.target.textContent) : 0;
  transposeEl.value = Math.max(
    Number(transposeEl.min), 
    Math.min(
      Number(transposeEl.max), 
      Number(transposeEl.value) + delta
    )
  );
  updateLabels();
  if(isPlaying) {
    play();
  }
}

function updateReverb() {
  reverb.gain = Number(reverbEl.value);
}

function updateDelay() {
  delay.gain = Number(delayEl.value);
}

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
  loadBtn.textContent = 'Saving...';
  showOverlay();
  updateSequence();
  var state = {
    instrumentEl: instrumentEl.value,
    presetEl: presetEl.value,
    stepsObj: stepsObj,
    reverbEl: reverbEl.value,
    delayEl: delayEl.value,
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
    hideOverlay();
  });
}

function updateGridFromObj() {
  for(var i = 0; i < notes.length; i++) {
    var note = notes[i];
    if(!(note in stepsObj)) continue;
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
    if(!(note in drumStepsObj)) continue;
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
    if(!window[key]) return;
    if(key.endsWith('El')) {
      window[key].value = state[key];
    } else if(key.endsWith('Obj')) {
      window[key] = state[key];
    } 
  }
  setupTable();
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
  updateReverb();
  updateDelay();
  // starts playing some sound on setting value
  // updateDelayTime();
  updateGridFromObj();
  hideOverlay();
}

function load() {
  loadBtn.textContent = 'Loading...';
  showOverlay();
  var searchParams = new URLSearchParams(window.location.search);
  if(!searchParams.has('state')) {
    hideOverlay();
    return;
  }
  jsonUrl.decompress(searchParams.get('state')).then(loadState);
}

function updateColumns() {
  var isPlaying = playPause.textContent !== '►';
  if(isPlaying) {
    stop();
  }
  var currCount = document.querySelectorAll('tr:first-of-type > td').length;
  var newCount = Number(columnsEl.value);
  if(newCount === currCount) return;
  var rows = document.querySelectorAll('tr');
  for(var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var dataset = rows[i].firstElementChild.dataset;
    if(newCount > currCount) {
      for(var j = 0; j < newCount - currCount; j++) {
        var cell = document.createElement('td');
        cell.style.setProperty('--row', i);
        cell.classList.add(Math.floor(0.25*(currCount + j)) % 2 ? 'light' : 'dark');
        cell.dataset.note = dataset.note;
        cell.dataset.instrument = dataset.instrument;
        row.appendChild(cell);
      }
    } else {
      for(var j = currCount - 1; j >= newCount; j--) {
        row.removeChild(row.children[j]);
      }
    }
  }
  bpmMult = 16 / columnsEl.value;
  updateBpm();
  if(isPlaying) {
    play();
  }
}

function updateRows() {
  var isPlaying = playPause.textContent !== '►';
  if(isPlaying) {
    stop();
  }
  var currCount = document.querySelectorAll('tr:not(.drums)').length;
  var newCount = Number(rowsEl.value);
  
  rows = newCount;
  if(newCount === currCount) return;
  if(newCount > currCount) {
    for(var i = newCount - currCount - 1; i >= 0 ; i--) {
      var note = (rows-i-1) * incBy;
      notes.unshift(note);
      steps[note] = document.createElement('tr');
      table.insertBefore(steps[note], table.firstElementChild);
      synthLabelsEl.insertBefore(document.createElement('span'), synthLabelsEl.firstElementChild);
      setupColumns(i, steps[note], 'synth', note);
    }
    updateLabels();
  } else {
    for(var j = 0; j < currCount - newCount; j++) {
      var note = notes.shift();
      delete steps[note];
      table.removeChild(table.children[0]);
      synthLabelsEl.removeChild(synthLabelsEl.children[0]);
    }
  }
  document.body.style.setProperty('--rows', rows);
  if(isPlaying) {
    play();
  }
}

function getCode() {
  updateSequence();
  var transposedStepsObj = transposedSteps();
  for (var key in transposedStepsObj) {
    if (transposedStepsObj[key].indexOf('x') < 0) {
      delete transposedStepsObj[key];
    }
  }
  var drumStepsObjCopy = Object.assign({}, drumStepsObj);
  for (var key in drumStepsObjCopy) {
    if (drumStepsObjCopy[key].indexOf('x') < 0) {
      delete drumStepsObjCopy[key];
    }
  }
  var preset = presetEl.value === '' ? undefined : presetEl.value;
  return `
Clock.bpm = ${bpmEl.value * bpmMult};
reverb = Bus2().fx.add( Freeverb() );
delayFX = Delay({ time: 1 / 6, feedback: .75 });
delay = Bus2().fx.add( delayFX );
instrument = ${instrumentEl.value}(${preset});
drums = Drums();
reverb.gain = ${reverbEl.value};
delay.gain = ${delayEl.value};
delayFX.time = 1 / ${delayTimeEl.value};
instrument.connect(reverb, ${instRevEl.value});
drums.connect(reverb, ${drumRevEl.value});
instrument.connect(delay, ${instDelayEl.value});
drums.connect(delay, ${drumDelayEl.value});
sequencer = Gibber.Steps(${JSON.stringify(transposedStepsObj)}, instrument);
drumSequencer = Gibber.Steps(${JSON.stringify(drumStepsObjCopy)}, drums);`;
}

function copyCodeToClipboard() {
  var textArea = document.createElement("textarea");
  textArea.value = getCode();
  
  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
		var successful = document.execCommand('copy');
    if(successful) {
			codeBtn.textContent = 'Copied';
			codeBtn.setAttribute('disabled', true);
			setTimeout(function() {
				codeBtn.textContent = 'Copy Code';
				codeBtn.removeAttribute('disabled');
			}, 500);
		}
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }

  document.body.removeChild(textArea);
}

function getRandomState(states) {
  var keys = Object.keys(states);
  var keyIdx = Math.floor(Math.random() * keys.length);
  var key = keys[keyIdx];
  return Object.assign({}, states[key]);
}

function remixInst() {
  var isPlaying = playPause.textContent !== '►';
  if(isPlaying) {
    stop();
  }
  var state = getRandomState(melodies);
  console.log(state);
  
  var notes = Object.keys(state.stepsObj);
  var min = Infinity;
  var max = -Infinity;
  for(var j = 0; j < notes.length; j++) {
    var note = Number(notes[j]);
    min = Math.min(note, min);
    max = Math.max(note, max);
  }
  var range = max - min;
  state['transposeEl'] = min;
  state['rowsEl'] = Math.max(range, 16);
  state['columnsEl'] = state.stepsObj[notes[0]].length;
  loadState(state);
  if(isPlaying) {
    play();
  }
}

function remixDrums() {
  var isPlaying = playPause.textContent !== '►';
  if(isPlaying) {
    stop();
  }
  var state = getRandomState(drumBeats);
  var notes = Object.keys(state.drumStepsObj);
  state['columnsEl'] = state.drumStepsObj[notes[0]].length;
  loadState(state);
  if(isPlaying) {
    play();
  }
}

clearBtn.addEventListener('click', clearGrid);
saveBtn.addEventListener('click', save);
loadBtn.addEventListener('click', loadGibber);
playPause.addEventListener('click', togglePlayPause);
instrumentEl.addEventListener('change', updateInstrument);
presetEl.addEventListener('change', updateInstrument);
bpmSlider.addEventListener('input', updateBpmSlider);
bpmEl.addEventListener('change', updateBpmInput);
columnsEl.addEventListener('change', updateColumns);
rowsEl.addEventListener('change', updateRows);
table.addEventListener('click', handleTableClick);
transposeEl.addEventListener('change', updateTranspose);
octUp.addEventListener('click', updateTranspose);
octDown.addEventListener('click', updateTranspose);
reverbEl.addEventListener('change', updateReverb);
drumRevEl.addEventListener('change', updateDrumReverb);
instRevEl.addEventListener('change', updateInstrumentReverb);
delayEl.addEventListener('change', updateDelay);
drumDelayEl.addEventListener('change', updateDrumDelay);
instDelayEl.addEventListener('change', updateInstrumentDelay);
delayTimeEl.addEventListener('change', updateDelayTime);
codeBtn.addEventListener('click', copyCodeToClipboard);
remixInstBtn.addEventListener('click', remixInst);
remixDrumsBtn.addEventListener('click', remixDrums);
setupTable();
