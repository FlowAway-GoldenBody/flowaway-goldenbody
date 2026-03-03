## WHAT THIS IS:
flowaway goldenbody is a os interface made with almost pure js, no frameworks and stuff for client side, server side, maybe cuz rammerhead prob used some idk. The only dependency you need is nodejs v16 to v<current> aka 24 or smt.
so like, you as a user, you basically can install any apps, just drop a folder in the app format in the /apps folder of your account, which has 6 system apps there, plz dont modify them if you dont know what you are doing!!! we dont have a index.html, instead you go to http://localhost:8080/goldenbody.html, you create an account, 3 letter minimum for username and 1 letter minimum for password. you made your 1st acc XD

hosting: try to host it online asap because you can then do what you need.
if the localhost link dont work try make a cloudflare tunnel via installing cloudflared from brew if you have one or just chatgpt it.

back to apps, so like you open your file explorer on the taskbar or start menu, aka the triangle button on the taskbar. there is a sample app for you already, the GUI is already built, you can add your tweaks to it if you want, but i highly recommend making a new one and replace all the your app something. all the app modifications are live, and to do so, write the global vars and functions there so the cleaning system can reach them, plz dont cause mem leaks. also please please plz use window.yourvar = your_value; or window.yourfunc = () => {...}; or window.yourfunc = async () => {...}; if you dont want to do window.something you can declare the vars like you did in python. plz dont use let/var/function to declare any global vars that you want the cleaner to clean. also your main function CANNOT be declared in any of the above if you want your app to work.

there will be a app store soon at goldenbody://app-store in the browser. there you will download apps through zipped files and you can unzip it on a random unzip files website. we dont support downloads yet so plz use websites that use showDirectoryPicker() or showSaveFilePicker() to download files. its fully implemented in the browser. the browser has handling for every single fs api by now. 

just so you know that this aka the readme.md would prob not be updated as often as the repo, and find new features out by explore! just like you did in minecraft, no one teaches you how to survive or use stuff like redstone, you figure it out urself. it has way more features than i can describe here! bugs are literally fixed DAILY and average 1 commit per DAY. plz note that the whole repo is 90% vibe coded so plz dont be like oh its written by ai... as long as it works its fine, and yes there are really **MILD** event listeners stacking with browser but as long as it dont affect framerate on chromebooks its okay. But it will be fixed some day when i felt like it. AI is a great tool and plz feel free to use it, there are 2 different ways of vibe coding, `just like using free ranger, you can click as fast as possible and miss your shots (messy vibe coding with global vars everywhere, works by chance, aka you can spam and pray you shot the dead center, but its not sustainable) or you can aim well and snipe long range while cs is reloading (reviewing ai generated code and apply patch via the ai or if its complicated then gotta use urself, watch for global scope pollution, focus on whether its what you want, the way its written, if you dont understand the ai code AT ALL i mean that by understanding the code is just as hard as arabic if u never learned it, thats a problem. if thats the case id say, just hop on a game and... if you dont understand some particular stuff, let the ai explain or like you can just do nothin. i dont understand like 1/4 of what the ai wrote but i can still comprehend and fix bugs.);` ignore what i said if you dont know what free ranger is. obviously goldenbody is the 2nd one of what i said, real skill.


even though the terminal app is a bit incomplete now, dont worry, it eventually will be ok.

## Installing and running

We recommends you to have at least **node v16** to be installed, **node v22** works too. Once you installed nodejs, clone the repo, then run `npm install` and `npm run build`.

After, configure your settings in [src/config.js](src/config.js). If you wish to consistently pull updates from this repo without the hassle of merging, create `config.js` in the root folder so they override the configs in `src/`.

Finally run the following to start the server: `node src/server.js`

## Discord server

For any user-help issue related questions, especially pertaining to goldenbody, please email me (a1462978843@outlook.com) .
