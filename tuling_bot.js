require('dotenv').config();

const axios = require('axios');

const url = 'http://openapi.tuling123.com/openapi/api/v2';

async function tulingBot(text) {
  const response = await axios.post(url, {
    reqType: 0,
    perception: {
      inputText: {
        text,
      },
    },
    userInfo: {
      apiKey: process.env.TULING_API_KEY,
      userId: 'myUser',
    },
  });

  console.log(JSON.stringify(response.data, null, 2));
  return response.data;
}

if (require.main === module) {
  tulingBot('你是谁啊');
}

module.exports = {
  tulingBot,
};
