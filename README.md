# Snowboy run demo

First install all kinds of dependencies (TODO)

https://awesome-alexa.js.org/#/installation?id=install-module

Then clone `snowboy` repo, use instructions to build locally, then re-run `npm install` to finish installing.

# train model

http://docs.kitt.ai/snowboy/#api-v1-train

record using `rec -r 16000 -c 1 -b 16 -e signed-integer 1.wav` command

# References

- [Article](https://x-tech.io/zh/posts/voice-chatbot-snowboy/)
- [sonus](https://github.com/evancohen/sonus) provides quite a bit of inspiration on how to process audio streams.