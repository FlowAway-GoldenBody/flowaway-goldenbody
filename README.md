## WHAT THIS IS:
flowaway goldenbody is a os interface made with almost pure js, no frameworks and stuff for client side, server side, maybe cuz rammerhead prob used some idk.
so like, you as a user, you basically can install any apps, just drop a folder in the app format in the /apps folder of your account, which has 6 system apps there, plz dont modify them if you dont know what you are doing!!! we dont have a index.html, instead you go to http://localhost:8080/goldenbody.html, you create an account, 3 letter minimum for username and 1 letter minimum for password. you made your 1st acc XD

back to apps, so like you open your file explorer on the taskbar or start menu, aka the triangle button on the taskbar. there is a sample app for you already, the GUI is already built, you can add your tweaks to it if you want, but i highly recommend making a new one and replace all the your app something. all the app modifications are live, and to do so, write the global vars and functions there so the cleaning system can reach them, plz dont cause mem leaks. also please please plz use window.yourvar = your_value; or window.yourfunc = () => {...}; or window.yourfunc = async () => {...}; if you dont want to do window.something you can declare the vars like you did in python. plz dont use let/var/function to declare any global vars that you want the cleaner to clean. also your main function CANNOT be declared in any of the above if you want your app to work.

there will be a app store soon at goldenbody://apps in the browser. there you will download apps through zipped files and you can unzip it on a random unzip files website. we dont support downloads yet so plz use websites that use showDirectoryPicker() or showSaveFilePicker() to download files. its fully implemented in the browser. the browser has handling for every single fs api by now. for file explorer, PLZ PLZ PLZ make sure to save before closing.

guys also, me and sjdwwvjejbc are trying to make a seperate website that handles statefarm client, which at least dispite errors it can display tracers in shell shockers rn, it is not released yet so just wait 4 now

if you are curious what flowAway Goldenbody means, you can picture it as a person wearing a porcupine like golden armor and holding a efficiency V golden shovel in minecraft

## Installing and running

We recommends you to have at least **node v16** to be installed. Once you installed nodejs, clone the repo, then run `npm install` and `npm run build`.

After, configure your settings in [src/config.js](src/config.js). If you wish to consistently pull updates from this repo without the hassle of merging, create `config.js` in the root folder so they override the configs in `src/`.

Finally run the following to start the server: `node src/server.js`

## Discord server

For any user-help issue related questions, especially pertaining to goldenbody, please ask them here: [hydrosphere](https://discord.gg/9puv3rp9Tx).