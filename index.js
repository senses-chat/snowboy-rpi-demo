const fs = require('fs');

const { record } = require('node-record-lpcm16');
const Detector = require('snowboy').Detector;
const Models = require('snowboy').Models;
const Speaker = require('speaker');

const { xunfeiTranscriber } = require('./xunfei_stt');
const { xunfeiTTS } = require('./xunfei_tts');
const { tulingBot } = require('./tuling_bot');

const MAX_SILENCE_COUNT = 3;

let audios = 0;
let duplex;
let silenceCount;
let speaking;

const init = () => {
  const filename = `audio${audios}.wav`;
  duplex = fs.createWriteStream(filename, { binary: true });
  silenceCount = 0;
  speaking = false;
  console.log(`initialized audio write stream to ${filename}`);
};

const transcribe = () => {
  console.log('transcribing');
  const filename = `audio${audios}.wav`;
  xunfeiTranscriber.push(filename);
};

xunfeiTranscriber.on('result', async (data) => {
  console.log('transcriber result:', data);
  const response = await tulingBot(data);

  const playVoice = (filename) => {
    return new Promise((resolve, reject) => {
      const speaker = new Speaker({
        channels: 1,
        bitDepth: 16,
        sampleRate: 16000,
      });
      const outStream = fs.createReadStream(filename);      
      // this is just to activate the speaker, 2s delay
      speaker.write(Buffer.alloc(32000, 10));
      outStream.pipe(speaker);
      outStream.on('end', resolve);
    });
  };

  for (let i = 0; i < response.results.length; i++) {
    const result = response.results[i];
    if (result.values && result.values.text) {
      const outputFilename = await xunfeiTTS(result.values.text, `${audios-1}-${i}`);
      if (outputFilename) {
        await playVoice(outputFilename);
      }
    }
  }
});

const mic = record({
  sampleRate: 16000,
  threshold: 0.5,
  recorder: 'rec',
  device: 'plughw:CARD=Snowball',
}).stream();

const models = new Models();

models.add({
  file: 'snowboy/resources/models/jarvis.umdl',
  sensitivity: '0.8,0.80',
  hotwords : ['jarvis', 'jarvis'],
});

// models.add({
//   file: 'shuaige.pmdl',
//   sensitivity: '0.5',
//   hotwords : ['shuaige'],
// });

const detector = new Detector({
  resource: "snowboy/resources/common.res",
  models: models,
  audioGain: 2.0,
  applyFrontend: true
});

detector.on('silence', function () {
  if (speaking) {
    if (++silenceCount > MAX_SILENCE_COUNT) {
      mic.unpipe(duplex);
      duplex.destroy();
      transcribe();
      audios++;
      init();
    }
  }
  console.log('silence', speaking, silenceCount);
});

detector.on('sound', function (buffer) {
  // <buffer> contains the last chunk of the audio that triggers the "sound"
  // event. It could be written to a wav stream.
  // speaker.write(buffer);
  
  if (speaking) {
    silenceCount = 0;
  }

  console.log('sound');
});

detector.on('error', function () {
  console.log('error');
});

detector.on('hotword', function (index, hotword, buffer) {
  // <buffer> contains the last chunk of the audio that triggers the "hotword"
  // event. It could be written to a wav stream. You will have to use it
  // together with the <buffer> in the "sound" event if you want to get audio
  // data after the hotword.
  
  if (!speaking) {
    silenceCount = 0;
    speaking = true;
    mic.pipe(duplex);
  }

  console.log('hotword', index, hotword);
});

mic.pipe(detector);
init();
