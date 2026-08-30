## V 1.0.0
- First stable version.

## V 1.0.1
- Fixed some file transfer bugs

## V 1.1.0
- Added new taskbar layout

## V 1.1.1
- Various bug fixes

## V 1.1.2
- Fixed the file upload bug once and for all

## V 1.1.3
- Emergency patch

## V 1.1.4
- Fixed some bugs in zmcd.js (auth/login/signup)

## V 1.1.5
- Added a reset system option

## V 1.1.6
- Added rate limit to systemRecovery server endpoint

## V 1.1.7
- Fix quota leaks and rewrite a lot of storage quota logics

## V 1.1.8
- Organized how login/signup/auth work

## V 1.2.0
- Added 2 features for untrusted iframe apps: 1. close its own window 2. iframe apps can now launch other apps on the user's cloud device if the user give it the permission to do so.

## V 1.2.1
- When session has expired, the caller will still get a response if the user refilled the session.

## V 1.2.2
- Fixed a bug when the retry for session expired for writefile don't use the new session token

## V 1.2.3
- fixed a rate limit get IP bug, file organizations for the rate limit logic.

## V 1.2.4
- Added screenshot ability

## V 2.0.0
- New app (Terminal), the old one is removed.

## V 2.1.0
- Massive update for terminal. it has reached its 1st stable version.

## V 2.1.1
- Minor update on display for ls cmd, added resetpathperms in systemrecovery.

## V 2.1.2
- update readme, fixed a bug in terminal where you can run app custom commands without the apps name in front, fixed a security hole where app command scripts can be from files out of their app program folder

## No version increase
- fixed server performance issue, various bug fixes
- remove the iframe hook after sign out