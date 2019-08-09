require('dotenv').config();

const crypto = require('crypto');
const EventEmitter = require('events');
const fs = require('fs');
const WebSocket = require('ws');

let transcriptionBuffer = '';
let ws;

class XunfeiTranscriber extends EventEmitter {
  constructor() {
    super();
    this.ready = false;
    this.on('ready', () => {
      console.log('transcriber ready');
      this.ready = true;
    });
    this.on('error', (err) => {
      console.log(err);
    });
    this.on('result', () => {
      cleanupWs();
      this.ready = false;
      init();
    });
  }

  push(audioFile) {
    if (!this.ready) {
      console.log('transcriber not ready');
      return;
    }

    this.emit('push', audioFile);
  }
}

function cleanupWs() {
  ws.removeAllListeners('open');
  ws.removeAllListeners('message');
  ws.removeAllListeners('error');
  ws.removeAllListeners('close');
  ws.close();
  ws = null;
}

function init() {
  const host = 'iat-api.xfyun.cn';
  const path = '/v2/iat';

  const encrypt = (value) => {
    const secret = process.env.XUNFEI_IAT_SECRET;
    // const secret = 'secretxxxxxxxx2df7900c09xxxxxxxx';
    const hmac = crypto.createHmac('sha256', new Buffer(secret));
    hmac.update(value);
    return hmac.digest('base64');
  };

  const signatureOrigin = (dateString) => {
    return `host: ${host}\ndate: ${dateString}\nGET ${path} HTTP/1.1`;
  };

  const authorizationOrigin = (signature) => {
    const apiKey = process.env.XUNFEI_IAT_KEY;
    // const apiKey = 'keyxxxxxxxx8ee279348519exxxxxxxx';
    const result = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;

    console.log(result);

    return result;
  };

  const toBase64String = (value) => new Buffer(value).toString('base64');

  const xunfeiUrl = () => {
    const dateString = new Date().toUTCString();
    // const dateString = 'Wed, 10 Jul 2019 07:35:43 GMT';
    const signature = encrypt(signatureOrigin(dateString));
    const authorization = toBase64String(authorizationOrigin(signature));

    console.log(authorization);

    return `ws://${host}${path}?host=${host}&date=${encodeURIComponent(dateString)}&authorization=${authorization}`;
  };

  const url = xunfeiUrl();

  console.log(url);

  ws = new WebSocket(url);

  ws.on('open', () => {
    console.log('transcriber connection established');
    xunfeiTranscriber.emit('ready');
  });

  ws.on('message', (data) => {
    console.log('incoming xunfei transcription result');

    const payload = JSON.parse(data);

    if (payload.code !== 0) {
      cleanupWs();
      init();
      xunfeiTranscriber.emit('error', payload);
      return;
    }

    if (payload.data) {
      transcriptionBuffer += payload.data.result.ws.reduce((acc, item) => {
        return acc + item.cw.map(cw => cw.w);
      }, '');

      if (payload.data.status === 2) {
        xunfeiTranscriber.emit('result', transcriptionBuffer);
      }
    }
  });

  ws.on('error', (error) => {
    console.log(error);
    cleanupWs();
  });

  ws.on('close', () => {
    console.log('closed');
    init();
  });
}

const xunfeiTranscriber = new XunfeiTranscriber();

init();

xunfeiTranscriber.on('push', function pushAudioFile(audioFile) {
  transcriptionBuffer = '';

  const audioPayload = (statusCode, audioBase64) => ({
    common: statusCode === 0 ? {
      app_id: process.env.XUNFEI_APPID,
    } : undefined,
    business: statusCode === 0 ? {
      language: 'zh_cn',
      domain: 'iat',
      ptt: 0,
    } : undefined,
    data: {
      status: statusCode,
      format: 'audio/L16;rate=16000',
      encoding: 'raw',
      audio: audioBase64,
    },
  });

  const chunkSize = 9000; 
  const buffer = new Buffer(chunkSize);

  fs.open(audioFile, 'r', (err, fd) => {
    if (err) {
      throw err;
    }

    let i = 0;
    
    function readNextChunk() {
      fs.read(fd, buffer, 0, chunkSize, null, (errr, nread) => {
        if (errr) {
          throw errr;
        }

        if (nread === 0) {
          console.log('sending end frame');

          ws.send(JSON.stringify({
            data: { status: 2 },
          }));

          return fs.close(fd, (err) => {
            if (err) {
              throw err;
            }
          });
        }

        let data;
        if (nread < chunkSize) {
          data = buffer.slice(0, nread);
        } else {
          data = buffer;
        }

        const audioBase64 = data.toString('base64');
        console.log('chunk', i, 'size', audioBase64.length);
        const payload = audioPayload(i >= 1 ? 1 : 0, audioBase64);

        ws.send(JSON.stringify(payload)); 
        i++;

        readNextChunk();
      });
    }

    readNextChunk();
  });
});

if (require.main === module) {
  xunfeiTranscriber.on('ready', () => {
    xunfeiTranscriber.push('audio0.wav');
  });
  xunfeiTranscriber.on('result', (data) => {
    console.log('result', data);
  });
}

module.exports = {
  xunfeiTranscriber,
};
