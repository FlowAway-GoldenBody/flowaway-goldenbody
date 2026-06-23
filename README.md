## WHAT THIS IS
flowaway goldenbody is an OS-like webpage built with vanilla js and a node server. 

## EXAMPLE IMAGE
![goldenbody](https://media.discordapp.net/attachments/1398365819863302267/1518319314636243075/Screenshot_2026-06-21_at_2.18.45_PM.png?ex=6a397c8d&is=6a382b0d&hm=04123aa26ae5442af76b292a79aa5483c2cd9cac52c74f95e52c720f81b8f58c&=&format=webp&quality=lossless&width=1842&height=1198)
## EXAMPLE IMAGE 2
![goldenbody2](https://media.discordapp.net/attachments/1398365819863302267/1518319314967597197/Screenshot_2026-06-21_at_2.17.50_PM.png?ex=6a3ace0d&is=6a397c8d&hm=bbc79bd56e0cbdc877efa1feb891ecc862fd7715cfd02e99f2bde84135278aa1&=&format=webp&quality=lossless&width=1842&height=1198)

## QUICK DEV & RUN

- Requirements: Node.js (v16+ recommended). IDK if bun works...
- Install libraries/dependencies the server needs via npm install:

```bash
npm install
```

- THE BACKEND IS BASED ON (copied from) RAMMERHEAD SINCE THE PURPOSE OF THIS THING USED TO BE A PROXY:
- Configure Rammerhead `src/config.js` or create a local `config.js` to override defaults.
- Run server:

```bash
node src/server.js
```

- you can also run with: 
```bash
npm start
```

- If you want external access during development, `cloudflared` is a convenient option for a quick tunnel.

- Just so yall know you can run this server in about 10 minutes after you get a new rpi. If you need longer than that there must be some stuff u did wrong!

## CONTACT

For project-related questions: a1462978843@outlook.com, alt email: playminecraft183@outlook.com