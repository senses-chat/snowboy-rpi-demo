require('dotenv').config();

const fs = require('fs');
const xunfei = require('xunfeisdk');
const { promisify } = require('util');

const writeFileAsync = promisify(fs.writeFile);

const client = new xunfei.Client(process.env.XUNFEI_APPID);
client.TTSAppKey = process.env.XUNFEI_TTS_KEY;

async function xunfeiTTS(text, audios) {
  console.log('turning following text into speech:', text);

  try {
    const result = await client.TTS(
      text,
      xunfei.TTSAufType.L16_16K,
      xunfei.TTSAueType.RAW,
      xunfei.TTSVoiceName.XiaoYan,
    );

    console.log(result);

    const filename = `response${audios}.wav`; 

    await writeFileAsync(filename, result.audio);

    console.log(`response written to ${filename}`);

    return filename;
  } catch (err) {
    console.log(err.response.status);
    console.log(err.response.headers);
    console.log(err.response.data);

    return null;
  }
}

if (require.main === module) {
  xunfeiTTS('我今天好开心', 'test').then(filename => console.log('test output at', filename));
}

module.exports = {
  xunfeiTTS,
};
