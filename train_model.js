require('dotenv').config();

const axios = require('axios');
const fs = require('fs');
const inquirer = require('inquirer');
const { record } = require('node-record-lpcm16');

const ENDPOINT = 'https://snowboy.kitt.ai/api/v1/train/';
const token = process.env.KITT_AI_TOKEN;

async function anyKey(message) {
  console.log(message || 'Press any key to continue');

  process.stdin.setRawMode(true);
  return new Promise(resolve => process.stdin.once('data', () => {
    process.stdin.setRawMode(false);
    resolve();
  }));
}

async function sleep(delay) {
  return new Promise(resolve => setTimeout(resolve, delay));
}

async function promptOptions() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Model Name',
    },
    {
      type: 'list',
      name: 'language',
      message: 'Model Language',
      default: 1,
      choices: [
        {
          name: 'Arabic',
          value: 'ar',
          short: 'ar',
        },
        {
          name: 'Chinese',
          value: 'zh',
          short: 'zh',
        },
        {
          name: 'Dutch',
          value: 'nl',
          short: 'nl',
        },
        {
          name: 'English',
          value: 'en',
          short: 'en',
        },
        {
          name: 'French',
          value: 'fr',
          short: 'fr',
        },
        {
          name: 'German',
          value: 'dt',
          short: 'dt',
        },
        {
          name: 'Hindi',
          value: 'hi',
          short: 'hi',
        },
        {
          name: 'Italian',
          value: 'it',
          short: 'it',
        },
        {
          name: 'Japanese',
          value: 'jp',
          short: 'jp',
        },
        {
          name: 'Korean',
          value: 'ko',
          short: 'ko',
        },
        {
          name: 'Persian',
          value: 'fa',
          short: 'fa',
        },
        {
          name: 'Polish',
          value: 'pl',
          short: 'pl',
        },
        {
          name: 'Portuguese',
          value: 'pt',
          short: 'pt',
        },
        {
          name: 'Russian',
          value: 'ru',
          short: 'ru',
        },
        {
          name: 'Spanish',
          value: 'es',
          short: 'es',
        },
        {
          name: 'Other',
          value: 'ot',
          short: 'ot',
        },
      ],
    },
    {
      type: 'list',
      name: 'age_group',
      message: 'Voice Age Group',
      default: 2,
      choices: [
        {
          name: 'years 0-9',
          value: '0_9',
          short: '0_9',
        },
        {
          name: 'years 10-19',
          value: '10_19',
          short: '10_19',
        },
        {
          name: 'years 20-29',
          value: '20_29',
          short: '20_29',
        },
        {
          name: 'years 30-39',
          value: '30_39',
          short: '30_39',
        },
        {
          name: 'years 40-49',
          value: '40_49',
          short: '40_49',
        },
        {
          name: 'years 50-59',
          value: '50_59',
          short: '50_59',
        },
        {
          name: 'year 60+',
          value: '60+',
          short: '60+',
        },
      ],
    },
    {
      type: 'list',
      name: 'gender',
      choices: [
        {
          name: 'Male',
          value: 'M',
          short: 'M',
        },
        {
          name: 'Female',
          value: 'F',
          short: 'F',
        },
      ],
    },
    {
      type: 'input',
      name: 'microphone',
      message: 'Your microphone type (e.g. PS3 Eye)',
      default: 'Blue Snowball',
    },
    {
      type: 'confirm',
      name: 'has_model',
      message: 'Do you have the models ready?',
      default: false,
    },
  ]);
}

async function main() {
  console.log('Please answer the following questions about the model');

  const answers = await promptOptions();
  console.log(answers);

  if (!answers.has_model) {
    console.log('You will record 3 wav clips with the device (3 seconds each), once finished, the script will invoke the kitt.ai train model API to submit the training data');
  }

  const voice_samples = [];

  for (let i = 0; i < 3; i++) {
    const filename = `model-${answers.name}-${i}.wav`;

    if (!answers.has_model) {
      console.log('record new sample in 3s');
      await sleep(3000);

      console.log('recording sample', i);

      const recorder = record({
          sampleRate: 16000,
          threshold: 0.5,
          recorder: 'rec',
          device: 'plughw:CARD=Snowball',
      });

      const stream = fs.createWriteStream(filename, { binary: true });
      recorder.stream().pipe(stream);
      // await anyKey('Press any key to stop recording');
      await sleep(3000);
      recorder.stop();
    }

    console.log(`Converting file ${filename} into base64`);
    const wavFile = fs.readFileSync(filename);
    voice_samples.push({ wave: wavFile.toString('base64') });
  }

  delete answers.has_model;

  Object.assign(answers, {
    token,
    voice_samples,
  });

  try {
    const response = await axios.post(ENDPOINT, answers, { responseType: 'arraybuffer' });
    const pModelFilename = `${answers.name}.pmdl`;
    const pModelFile = fs.writeFileSync(pModelFilename, response.data);

    console.log(`Personal model created at ${pModelFilename}`);
  } catch (err) {
    console.log(err.response.status);
    console.log(err.response.data);
    console.log(err.response.headers);
  }
}

main();
