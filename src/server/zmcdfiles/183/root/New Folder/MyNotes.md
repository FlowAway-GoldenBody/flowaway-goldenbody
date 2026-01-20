MyNotes.md


### 001 instsall homebrew
baoer@baoers-MacBook-Air Dev % /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"


==> Checking for `sudo` access (which may request your password)...
Password:
==> This script will install:
/opt/homebrew/bin/brew
/opt/homebrew/share/doc/homebrew
/opt/homebrew/share/man/man1/brew.1
/opt/homebrew/share/zsh/site-functions/_brew
/opt/homebrew/etc/bash_completion.d/brew
/opt/homebrew
/etc/paths.d/homebrew
==> The following new directories will be created:
/opt/homebrew/bin
/opt/homebrew/etc
/opt/homebrew/include
/opt/homebrew/lib
/opt/homebrew/sbin
/opt/homebrew/share
/opt/homebrew/var
/opt/homebrew/opt
/opt/homebrew/share/zsh
/opt/homebrew/share/zsh/site-functions
/opt/homebrew/var/homebrew
/opt/homebrew/var/homebrew/linked
/opt/homebrew/Cellar
/opt/homebrew/Caskroom
/opt/homebrew/Frameworks

Press RETURN/ENTER to continue or any other key to abort:
==> /usr/bin/sudo /usr/bin/install -d -o root -g wheel -m 0755 /opt/homebrew
==> /usr/bin/sudo /bin/mkdir -p /opt/homebrew/bin /opt/homebrew/etc /opt/homebrew/include /opt/homebrew/lib /opt/homebrew/sbin /opt/homebrew/share /opt/homebrew/var /opt/homebrew/opt /opt/homebrew/share/zsh /opt/homebrew/share/zsh/site-functions /opt/homebrew/var/homebrew /opt/homebrew/var/homebrew/linked /opt/homebrew/Cellar /opt/homebrew/Caskroom /opt/homebrew/Frameworks
==> /usr/bin/sudo /bin/chmod ug=rwx /opt/homebrew/bin /opt/homebrew/etc /opt/homebrew/include /opt/homebrew/lib /opt/homebrew/sbin /opt/homebrew/share /opt/homebrew/var /opt/homebrew/opt /opt/homebrew/share/zsh /opt/homebrew/share/zsh/site-functions /opt/homebrew/var/homebrew /opt/homebrew/var/homebrew/linked /opt/homebrew/Cellar /opt/homebrew/Caskroom /opt/homebrew/Frameworks
==> /usr/bin/sudo /bin/chmod go-w /opt/homebrew/share/zsh /opt/homebrew/share/zsh/site-functions
==> /usr/bin/sudo /usr/sbin/chown baoer /opt/homebrew/bin /opt/homebrew/etc /opt/homebrew/include /opt/homebrew/lib /opt/homebrew/sbin /opt/homebrew/share /opt/homebrew/var /opt/homebrew/opt /opt/homebrew/share/zsh /opt/homebrew/share/zsh/site-functions /opt/homebrew/var/homebrew /opt/homebrew/var/homebrew/linked /opt/homebrew/Cellar /opt/homebrew/Caskroom /opt/homebrew/Frameworks
==> /usr/bin/sudo /usr/bin/chgrp admin /opt/homebrew/bin /opt/homebrew/etc /opt/homebrew/include /opt/homebrew/lib /opt/homebrew/sbin /opt/homebrew/share /opt/homebrew/var /opt/homebrew/opt /opt/homebrew/share/zsh /opt/homebrew/share/zsh/site-functions /opt/homebrew/var/homebrew /opt/homebrew/var/homebrew/linked /opt/homebrew/Cellar /opt/homebrew/Caskroom /opt/homebrew/Frameworks
==> /usr/bin/sudo /usr/sbin/chown -R baoer:admin /opt/homebrew
==> Downloading and installing Homebrew...
remote: Enumerating objects: 311485, done.
remote: Counting objects: 100% (337/337), done.
remote: Compressing objects: 100% (151/151), done.
remote: Total 311485 (delta 246), reused 232 (delta 186), pack-reused 311148 (from 3)
remote: Enumerating objects: 55, done.
remote: Counting objects: 100% (34/34), done.
remote: Total 55 (delta 34), reused 34 (delta 34), pack-reused 21 (from 1)
==> /usr/bin/sudo /bin/mkdir -p /etc/paths.d
==> /usr/bin/sudo tee /etc/paths.d/homebrew
/opt/homebrew/bin
==> /usr/bin/sudo /usr/sbin/chown root:wheel /etc/paths.d/homebrew
==> /usr/bin/sudo /bin/chmod a+r /etc/paths.d/homebrew
==> Updating Homebrew...
==> Downloading https://ghcr.io/v2/homebrew/portable-ruby/portable-ruby/blobs/sha256:20fa657858e44a4b39171d6e4111f8a9716eb62a78ebbd1491d94f90bb7b830a
########################################################################################################################################################################### 100.0%
==> Pouring portable-ruby-3.4.5.arm64_big_sur.bottle.tar.gz
==> Installation successful!

==> Homebrew has enabled anonymous aggregate formulae and cask analytics.
Read the analytics documentation (and how to opt-out) here:
  https://docs.brew.sh/Analytics
No analytics data has been sent yet (nor will any be during this install run).

==> Homebrew is run entirely by unpaid volunteers. Please consider donating:
  https://github.com/Homebrew/brew#donations

==> Next steps:
- Run these commands in your terminal to add Homebrew to your PATH:
    echo >> /Users/baoer/.zprofile
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> /Users/baoer/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
- Run brew help to get started
- Further documentation:
    https://docs.brew.sh

baoer@baoers-MacBook-Air Dev % 





### 002 install nvm
Last login: Thu Sep 25 13:33:55 on ttys001
baoer@baoers-MacBook-Air ~ % type brew
brew is /opt/homebrew/bin/brew
baoer@baoers-MacBook-Air ~ % brew install nvm
==> Fetching downloads for: nvm
==> Downloading https://ghcr.io/v2/homebrew/core/nvm/manifests/0.40.3
######################################################################### 100.0%
==> Fetching nvm
==> Downloading https://ghcr.io/v2/homebrew/core/nvm/blobs/sha256:f7833c9ed1c611
######################################################################### 100.0%
==> Pouring nvm--0.40.3.all.bottle.tar.gz
==> Caveats
Please note that upstream has asked us to make explicit managing
nvm via Homebrew is unsupported by them and you should check any
problems against the standard nvm install method prior to reporting.

You should create NVM's working directory if it doesn't exist:
  mkdir ~/.nvm

Add the following to your shell profile e.g. ~/.profile or ~/.zshrc:
  export NVM_DIR="$HOME/.nvm"
  [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"  # This loads nvm
  [ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"  # This loads nvm bash_completion

You can set $NVM_DIR to any location, but leaving it unchanged from
/opt/homebrew/Cellar/nvm/0.40.3 will destroy any nvm-installed Node installations
upon upgrade/reinstall.

Type `nvm help` for further information.
==> Summary
🍺  /opt/homebrew/Cellar/nvm/0.40.3: 10 files, 206.7KB
==> Running `brew cleanup nvm`...
Disable this behaviour by setting `HOMEBREW_NO_INSTALL_CLEANUP=1`.
Hide these hints with `HOMEBREW_NO_ENV_HINTS=1` (see `man brew`).
==> No outdated dependents to upgrade!
baoer@baoers-MacBook-Air ~ % 



### 003 node.js
baoer@baoers-MacBook-Air ~ % nvm install --lts
Installing latest LTS version.
Downloading and installing node v22.20.0...
Downloading https://nodejs.org/dist/v22.20.0/node-v22.20.0-darwin-arm64.tar.xz...
################################################################################################################################################################################################## 100.0%
Computing checksum with sha256sum
Checksums matched!
Now using node v22.20.0 (npm v10.9.3)
Creating default alias: default -> lts/* (-> v22.20.0)
baoer@baoers-MacBook-Air ~ % node -v
v22.20.0
baoer@baoers-MacBook-Air ~ % npm -v
10.9.3
baoer@baoers-MacBook-Air ~ % type pnpm
pnpm not found
baoer@baoers-MacBook-Air ~ % corepack enable
baoer@baoers-MacBook-Air ~ % corepack prepare pnpm@latest --activate

Preparing pnpm@latest for immediate activation...
baoer@baoers-MacBook-Air ~ % type pnpm
pnpm is /Users/baoer/.nvm/versions/node/v22.20.0/bin/pnpm
baoer@baoers-MacBook-Air ~ % 



### 004 pnpm dev
baoer@baoers-MacBook-Air ~ % cd /Users/baoer/Dev/projects/scramjet
baoer@baoers-MacBook-Air scramjet % pnpm dev

> @mercuryworkshop/scramjet@2.0.0-alpha dev /Users/baoer/Dev/projects/scramjet
> node server.js

/Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js:395
    throw new Error(
          ^

Error: Cannot find native binding. npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828). Please try `npm i` again after removing both package-lock.json and node_modules directory.

Cannot find module './rspack.darwin-universal.node'
Require stack:
- /Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js
Cannot find module '@rspack/binding-darwin-universal'
Require stack:
- /Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js
Cannot find module './rspack.darwin-arm64.node'
Require stack:
- /Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js
Cannot find module '@rspack/binding-darwin-arm64'
Require stack:
- /Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js
    at Object.<anonymous> (/Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js:395:11)
    at Module._compile (node:internal/modules/cjs/loader:1706:14)
    at Object..js (node:internal/modules/cjs/loader:1839:10)
    at Module.load (node:internal/modules/cjs/loader:1441:32)
    at Function._load (node:internal/modules/cjs/loader:1263:12)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:237:24)
    at Module.require (node:internal/modules/cjs/loader:1463:12)
    at require (node:internal/modules/helpers:147:16)
    at @rspack/binding (/Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+core@1.5.3_@swc+helpers@0.5.17/node_modules/@rspack/core/dist/index.js:294:26) {
  [cause]: [
    Error: Cannot find module './rspack.darwin-universal.node'
    Require stack:
    - /Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js
        at Function._resolveFilename (node:internal/modules/cjs/loader:1383:15)
        at defaultResolveImpl (node:internal/modules/cjs/loader:1025:19)
        at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1030:22)
        at Function._load (node:internal/modules/cjs/loader:1192:37)
        at TracingChannel.traceSync (node:diagnostics_channel:322:14)
        at wrapModuleLoad (node:internal/modules/cjs/loader:237:24)
        at Module.require (node:internal/modules/cjs/loader:1463:12)
        at require (node:internal/modules/helpers:147:16)
        at requireNative (/Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js:138:14)
        at Object.<anonymous> (/Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js:362:17) {
      code: 'MODULE_NOT_FOUND',
      requireStack: [
        '/Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js'
      ]
    },
    Error: Cannot find module '@rspack/binding-darwin-universal'
    Require stack:
    - /Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js
        at Function._resolveFilename (node:internal/modules/cjs/loader:1383:15)
        at defaultResolveImpl (node:internal/modules/cjs/loader:1025:19)
        at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1030:22)
        at Function._load (node:internal/modules/cjs/loader:1192:37)
        at TracingChannel.traceSync (node:diagnostics_channel:322:14)
        at wrapModuleLoad (node:internal/modules/cjs/loader:237:24)
        at Module.require (node:internal/modules/cjs/loader:1463:12)
        at require (node:internal/modules/helpers:147:16)
        at requireNative (/Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js:143:14)
        at Object.<anonymous> (/Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js:362:17) {
      code: 'MODULE_NOT_FOUND',
      requireStack: [
        '/Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js'
      ]
    },
    Error: Cannot find module './rspack.darwin-arm64.node'
    Require stack:
    - /Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js
        at Function._resolveFilename (node:internal/modules/cjs/loader:1383:15)
        at defaultResolveImpl (node:internal/modules/cjs/loader:1025:19)
        at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1030:22)
        at Function._load (node:internal/modules/cjs/loader:1192:37)
        at TracingChannel.traceSync (node:diagnostics_channel:322:14)
        at wrapModuleLoad (node:internal/modules/cjs/loader:237:24)
        at Module.require (node:internal/modules/cjs/loader:1463:12)
        at require (node:internal/modules/helpers:147:16)
        at requireNative (/Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js:160:16)
        at Object.<anonymous> (/Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js:362:17) {
      code: 'MODULE_NOT_FOUND',
      requireStack: [
        '/Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js'
      ]
    },
    Error: Cannot find module '@rspack/binding-darwin-arm64'
    Require stack:
    - /Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js
        at Function._resolveFilename (node:internal/modules/cjs/loader:1383:15)
        at defaultResolveImpl (node:internal/modules/cjs/loader:1025:19)
        at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1030:22)
        at Function._load (node:internal/modules/cjs/loader:1192:37)
        at TracingChannel.traceSync (node:diagnostics_channel:322:14)
        at wrapModuleLoad (node:internal/modules/cjs/loader:237:24)
        at Module.require (node:internal/modules/cjs/loader:1463:12)
        at require (node:internal/modules/helpers:147:16)
        at requireNative (/Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js:165:16)
        at Object.<anonymous> (/Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js:362:17) {
      code: 'MODULE_NOT_FOUND',
      requireStack: [
        '/Users/baoer/Dev/projects/scramjet/node_modules/.pnpm/@rspack+binding@1.5.3/node_modules/@rspack/binding/binding.js'
      ]
    }
  ]
}

Node.js v22.20.0
 ELIFECYCLE  Command failed with exit code 1.
baoer@baoers-MacBook-Air scramjet % 





### 005 pnpm install
baoer@baoers-MacBook-Air scramjet % pnpm install                      
Downloading @rspack/binding-darwin-arm64@1.5.7: 16.24 MB/16.24 MB, done
Packages: +678
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 700, reused 0, downloaded 683, added 678, done
 WARN  Issues with peer dependencies found
.
└─┬ @giancosta86/typedoc-readonly 1.0.1
  └── ✕ unmet peer typedoc@^0.27.0: found 0.28.13

dependencies:
+ @catppuccin/vscode 3.18.0
+ @giancosta86/typedoc-readonly 1.0.1
+ @mercuryworkshop/bare-mux 2.1.7
+ @shipgirl/typedoc-plugin-versions 0.3.2
+ @stephansama/catppuccin-typedoc 1.0.1
+ dom-serializer 2.0.0
+ domhandler 5.0.3
+ domutils 3.2.2
+ htmlparser2 10.0.0
+ parse-domain 8.2.2
+ set-cookie-parser 2.7.1
+ typedoc 0.28.13
+ typedoc-material-theme 1.4.0

devDependencies:
+ @8hobbies/typedoc-plugin-plausible 2.2.0
+ @eslint/eslintrc 3.3.1
+ @eslint/js 9.36.0
+ @estruyf/github-actions-reporter 1.10.0
+ @fastify/static 8.2.0
+ @mercuryworkshop/bare-as-module3 2.2.5
+ @mercuryworkshop/epoxy-transport 2.1.28
+ @mercuryworkshop/libcurl-transport 1.5.0
+ @mercuryworkshop/wisp-js 0.3.3
+ @nebula-services/bare-server-node 2.0.4
+ @playwright/test 1.55.1
+ @rsdoctor/rspack-plugin 1.2.3
+ @rslib/core 0.13.3 (0.14.0 is available)
+ @rspack/cli 1.5.7
+ @rspack/core 1.5.7
+ @types/eslint 9.6.1
+ @types/estree 1.0.8
+ @types/node 24.5.2
+ @types/serviceworker 0.0.152 (0.0.153 is available)
+ @typescript-eslint/eslint-plugin 8.44.1
+ @typescript-eslint/parser 8.44.1
+ actionlint 2.0.6
+ ava 6.4.1
+ dotenv 17.2.2
+ eslint 9.36.0
+ fastify 5.6.1
+ glob 11.0.3
+ playwright 1.55.1
+ prettier 3.6.2
+ ts-checker-rspack-plugin 1.1.5
+ tsc-alias 1.8.16
+ tslib 2.8.1
+ typedoc-plugin-include-example 2.1.2 (3.0.2 is available)
+ typedoc-plugin-markdown 4.9.0
+ typedoc-plugin-mdn-links 5.0.9
+ typescript 5.9.2

╭ Warning ───────────────────────────────────────────────────────────────────────────────────╮
│                                                                                            │
│   Ignored build scripts: core-js.                                                          │
│   Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.   │
│                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────╯

Done in 41.7s using pnpm v10.17.1
baoer@baoers-MacBook-Air scramjet % 






















