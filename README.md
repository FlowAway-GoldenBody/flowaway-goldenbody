## WHAT THIS IS
flowaway goldenbody is an OS-like webpage built with vanilla js and a node server. 

## EXAMPLE IMAGE
![goldenbody](https://media.discordapp.net/attachments/1398365819863302267/1528472440332877884/Screenshot_2026-07-19_at_2.30.05_PM.png?ex=6a5e6c63&is=6a5d1ae3&hm=3f7b34b1ee1ebf7d4e3cafd8788cdbe35a8fc586a1ca34f194f58814a73d8459&=&format=webp&quality=lossless&width=1852&height=1204)
## EXAMPLE IMAGE 2
![goldenbody2](https://media.discordapp.net/attachments/1398365819863302267/1528472439930097694/Screenshot_2026-07-19_at_2.28.32_PM.png?ex=6a5e6c63&is=6a5d1ae3&hm=613fda87f2397e7d9e6b780022253c9837d481add198265df3209be533b27a88&=&format=webp&quality=lossless&width=1852&height=1204)

## QUICK DEV & RUN

- Requirements: Node.js (v16+ recommended). IDK if bun works...
- Install libraries/dependencies the server needs via npm install:

```bash
npm install
```

- THE BACKEND IS BASED ON ""aka (copied from)"" RAMMERHEAD SINCE THE PURPOSE OF THIS THING USED TO BE A PROXY:
- Configure Rammerhead `src/config.js` to override defaults.
- Run server:

```bash
node src/server.js
```

- you can also run with: 
```bash
npm start
```

- If you want external access, `cloudflared` is a good option to host it.

- Just so yall know you can run this server in about 10 minutes after you get a new rpi or any device including an android phone. If you need longer than that there must be some stuff u did wrong!

-!!!IMPORTANT!!! if you are hosting on termux change config.js to this
`const enableWorkers = false;` on line 7 of config.js

## CONTACT

For project-related questions: a1462978843@outlook.com, alt email: playminecraft183@outlook.com