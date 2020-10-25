App launcher started.
Preparing app data directory.
{ DEBUG: true }
Inflating app contents.
{
  zipName: 'C:\\Users\\cris7\\Downloads\\dev\\app.zip',
  name: 'C:\\Users\\cris7\\Downloads\\dev',
  appPath: 'C:\\Users\\cris7\\Downloads\\build\\app.zip'
}
App process requested.
{ procName: 'C:\\Users\\cris7\\Downloads\\dev\\app\\service.js' }
App process created.
Waiting for your system security checks: ...............................................................................Waiting for your system security checks: ...............................................................................Waiting for your system security checks: ...............................................................................Waiting for your system security checks: ...............................................................................Waiting for your system security checks: ...............................................................................Waiting for your system security checks: ...............................................................................Waiting for your system security checks: ...............................................................................Waiting for your system security checks: ...............................................................................Waiting for your system security checks: ...............................................................................Waiting for your system security checks: .........................................................................................{ SITE_PATH: 'C:\\Users\\cris7\\Downloads\\dev\\app\\public' }
Start service...

Request app start.
Request service start.{ DEBUG: true, port: 22121 }
{"serviceUp":{"upAt":"2020-10-25T05:38:05.218Z","port":22121}}
Ready
App service started.

Service started.Error deleting sessions from expred sessions file... Error: ENOENT: no such file or directory, open 'C:\Users\cris7\Downloads\dev\old-sessions.json'
    at Object.openSync (fs.js:451:3)
    at Object.readFileSync (fs.js:353:35)
    at Object.readFileSync (C:\Users\cris7\Downloads\grader (22).exe:201:55)
    at run (C:\Users\cris7\Downloads\dev\app\service.js:31795:66)
    at processTicksAndRejections (internal/process/task_queues.js:93:5) {
  errno: -4058,
  syscall: 'open',
  code: 'ENOENT',
  path: 'C:\\Users\\cris7\\Downloads\\dev\\old-sessions.json'
}

Request cache directory.Temp browser cache directory does not exist. Creating...
Deleted.
App data dir does not exist. Creating...
Created.
Launching UI...

Cache directory created.
Request user interface.{
  LAUNCH_OPTS: {
    logLevel: 'verbose',
    chromeFlags: [
      '--disable-breakpad',
      '--metrics-recording-only',
      '--new-window',
      '--no-first-run',
      '--app=http://localhost:22121',
      '--restore-last-session',
      '--disk-cache-dir=C:\\Users\\cris7\\Downloads\\dev\\sessions\\ki.611y0g21\\ui-cache',
      '--aggressive-cache-discard'
    ],
    userDataDir: 'C:\\Users\\cris7\\Downloads\\dev\\sessions\\ki.611y0g21\\ui-data',
    ignoreDefaultFlags: true
  }
}
  ChromeLauncher:verbose created C:\Users\cris7\Downloads\dev\sessions\ki.611y0g21\ui-data +0ms
  ChromeLauncher:verbose Launching with command:
  ChromeLauncher:verbose "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --remote-debugging-port=51956 --user-data-dir=C:\Users\cris7\Downloads\dev\sessions\ki.611y0g21\ui-data --disable-breakpad --metrics-recording-only --new-window --no-first-run --app=http://localhost:22121 --restore-last-session --disk-cache-dir=C:\Users\cris7\Downloads\dev\sessions\ki.611y0g21\ui-cache --aggressive-cache-discard about:blank +5ms
  ChromeLauncher:verbose Chrome running with pid 14460 on port 51956. +19ms
  ChromeLauncher Waiting for browser. +4ms
  ChromeLauncher Waiting for browser... +1ms
  ChromeLauncher Waiting for browser...√ +546ms
{
  browser: {
    pid: 14460,
    port: 51956,
    kill: [Function: kill],
    process: ChildProcess {
      _events: [Object: null prototype] {},
      _eventsCount: 0,
      _maxListeners: undefined,
      _closesNeeded: 1,
      _closesGot: 0,
      connected: false,
      signalCode: null,
      exitCode: null,
      killed: false,
      spawnfile: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      _handle: [Process],
      spawnargs: [Array],
      pid: 14460,
      stdin: null,
      stdout: null,
      stderr: null,
      stdio: [Array]
    }
  },
  ChromeLaunch: [Function: launch]
}
Chrome started.

User interface created.
Request interface connection.Connecting to UI...
{
  pid: 14460,
  port: 51956,
  kill: [Function: kill],
  process: ChildProcess {
    _events: [Object: null prototype] {},
    _eventsCount: 0,
    _maxListeners: undefined,
    _closesNeeded: 1,
    _closesGot: 0,
    connected: false,
    signalCode: null,
    exitCode: null,
    killed: false,
    spawnfile: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    _handle: Process {
      onexit: [Function],
      pid: 14460,
      [Symbol(owner)]: [Circular]
    },
    spawnargs: [
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      '--remote-debugging-port=51956',
      '--user-data-dir=C:\\Users\\cris7\\Downloads\\dev\\sessions\\ki.611y0g21\\ui-data',
      '--disable-breakpad',
      '--metrics-recording-only',
      '--new-window',
      '--no-first-run',
      '--app=http://localhost:22121',
      '--restore-last-session',
      '--disk-cache-dir=C:\\Users\\cris7\\Downloads\\dev\\sessions\\ki.611y0g21\\ui-cache',
      '--aggressive-cache-discard',
      'about:blank'
    ],
    pid: 14460,
    stdin: null,
    stdout: null,
    stderr: null,
    stdio: [ null, null, null ]
  }
}
Connected.

User interface online.
App started. 22121
Service on port 22121
Launcher exiting successfully...
Unable to read expired sessions file... ReferenceError: expiredSessions is not defined
    at WebSocket.killService (C:\Users\cris7\Downloads\dev\app\service.js:31942:29)
    at WebSocket.emit (events.js:209:13)
    at WebSocket.EventEmitter.emit (domain.js:476:20)
    at WebSocket.emitClose (C:\Users\cris7\Downloads\dev\app\service.js:28929:10)
    at Socket.socketOnClose (C:\Users\cris7\Downloads\dev\app\service.js:29596:15)
    at Socket.emit (events.js:209:13)
    at Socket.EventEmitter.emit (domain.js:476:20)
    at TCP.<anonymous> (net.js:658:12)
Error scheduling session data for deletion...
{"service":"Closing service..."}
{"service":"Closed"}

