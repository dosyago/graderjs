/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try {
            step(generator.next(value));
        }
        catch (e) {
            reject(e);
        } }
        function rejected(value) { try {
            step(generator["throw"](value));
        }
        catch (e) {
            reject(e);
        } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalAppDataPath = exports.toWinDirFormat = exports.makeTmpDir = exports.getPlatform = exports.ChromeNotInstalledError = exports.UnsupportedPlatformError = exports.InvalidUserDataDirectoryError = exports.ChromePathNotSetError = exports.LauncherError = exports.delay = exports.defaults = void 0;
const path_1 = require("path");
const child_process_1 = require("child_process");
const mkdirp = require("mkdirp");
const isWsl = require('is-wsl');
function defaults(val, def) {
    return typeof val === 'undefined' ? def : val;
}
exports.defaults = defaults;
function delay(time) {
    /* eslint-disable require-yield */
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(resolve => setTimeout(resolve, time));
    });
    /* eslint-enable require-yield */
}
exports.delay = delay;
class LauncherError extends Error {
    constructor(message = 'Unexpected error', code) {
        super();
        this.message = message;
        this.code = code;
        this.stack = new Error().stack;
        return this;
    }
}
exports.LauncherError = LauncherError;
class ChromePathNotSetError extends LauncherError {
    constructor() {
        super(...arguments);
        this.message = 'The environment variable CHROME_PATH must be set to executable of a build of Chromium version 54.0 or later.';
        this.code = "ERR_LAUNCHER_PATH_NOT_SET" /* ERR_LAUNCHER_PATH_NOT_SET */;
    }
}
exports.ChromePathNotSetError = ChromePathNotSetError;
class InvalidUserDataDirectoryError extends LauncherError {
    constructor() {
        super(...arguments);
        this.message = 'userDataDir must be false or a path.';
        this.code = "ERR_LAUNCHER_INVALID_USER_DATA_DIRECTORY" /* ERR_LAUNCHER_INVALID_USER_DATA_DIRECTORY */;
    }
}
exports.InvalidUserDataDirectoryError = InvalidUserDataDirectoryError;
class UnsupportedPlatformError extends LauncherError {
    constructor() {
        super(...arguments);
        this.message = `Platform ${getPlatform()} is not supported.`;
        this.code = "ERR_LAUNCHER_UNSUPPORTED_PLATFORM" /* ERR_LAUNCHER_UNSUPPORTED_PLATFORM */;
    }
}
exports.UnsupportedPlatformError = UnsupportedPlatformError;
class ChromeNotInstalledError extends LauncherError {
    constructor() {
        super(...arguments);
        this.message = 'No Chrome installations found.';
        this.code = "ERR_LAUNCHER_NOT_INSTALLED" /* ERR_LAUNCHER_NOT_INSTALLED */;
    }
}
exports.ChromeNotInstalledError = ChromeNotInstalledError;
function getPlatform() {
    return isWsl ? 'wsl' : process.platform;
}
exports.getPlatform = getPlatform;
function makeTmpDir() {
    /* eslint-disable no-fallthrough */
    switch (getPlatform()) {
        case 'darwin':
        case 'linux':
            return makeUnixTmpDir();
        case 'wsl':
            // We populate the user's Windows temp dir so the folder is correctly created later
            process.env.TEMP = getLocalAppDataPath(`${process.env.PATH}`);
        case 'win32':
            return makeWin32TmpDir();
        default:
            throw new UnsupportedPlatformError();
    }
    /* eslint-enable no-fallthrough */
}
exports.makeTmpDir = makeTmpDir;
function toWinDirFormat(dir = '') {
    const results = /\/mnt\/([a-z])\//.exec(dir);
    if (!results) {
        return dir;
    }
    const driveLetter = results[1];
    return dir.replace(`/mnt/${driveLetter}/`, `${driveLetter.toUpperCase()}:\\`)
        .replace(/\//g, '\\');
}
exports.toWinDirFormat = toWinDirFormat;
function getLocalAppDataPath(path) {
    const userRegExp = /\/mnt\/([a-z])\/Users\/([^/:]+)\/AppData\//;
    const results = userRegExp.exec(path) || [];
    return `/mnt/${results[1]}/Users/${results[2]}/AppData/Local`;
}
exports.getLocalAppDataPath = getLocalAppDataPath;
function makeUnixTmpDir() {
    return child_process_1.execSync('mktemp -d -t lighthouse.XXXXXXX').toString().trim();
}
function makeWin32TmpDir() {
    const winTmpPath = process.env.TEMP || process.env.TMP ||
        (process.env.SystemRoot || process.env.windir) + '\\temp';
    const randomNumber = Math.floor(Math.random() * 9e7 + 1e7);
    const tmpdir = path_1.join(winTmpPath, 'lighthouse.' + randomNumber);
    mkdirp.sync(tmpdir);
    return tmpdir;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.win32 = exports.wsl = exports.linux = exports.darwin = exports.darwinFast = void 0;
const fs = require('fs');
const path = require('path');
const { homedir } = require('os');
const { execSync, execFileSync } = require('child_process');
const escapeRegExp = require('escape-string-regexp');
const log = require('lighthouse-logger');
const utils_1 = require("./utils");
const newLineRegex = /\r?\n/;
/**
 * check for MacOS default app paths first to avoid waiting for the slow lsregister command
 */
function darwinFast() {
    const priorityOptions = [
        process.env.CHROME_PATH,
        process.env.LIGHTHOUSE_CHROMIUM_PATH,
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ];
    for (const chromePath of priorityOptions) {
        if (chromePath && canAccess(chromePath))
            return chromePath;
    }
    return darwin()[0];
}
exports.darwinFast = darwinFast;
function darwin() {
    const suffixes = ['/Contents/MacOS/Google Chrome Canary', '/Contents/MacOS/Google Chrome'];
    const LSREGISTER = '/System/Library/Frameworks/CoreServices.framework' +
        '/Versions/A/Frameworks/LaunchServices.framework' +
        '/Versions/A/Support/lsregister';
    const installations = [];
    const customChromePath = resolveChromePath();
    if (customChromePath) {
        installations.push(customChromePath);
    }
    execSync(`${LSREGISTER} -dump` +
        ' | grep -i \'google chrome\\( canary\\)\\?\\.app\'' +
        ' | awk \'{$1=""; print $0}\'')
        .toString()
        .split(newLineRegex)
        .forEach((inst) => {
        suffixes.forEach(suffix => {
            const execPath = path.join(inst.substring(0, inst.indexOf('.app') + 4).trim(), suffix);
            if (canAccess(execPath) && installations.indexOf(execPath) === -1) {
                installations.push(execPath);
            }
        });
    });
    // Retains one per line to maintain readability.
    // clang-format off
    const home = escapeRegExp(process.env.HOME || homedir());
    const priorities = [
        { regex: new RegExp(`^${home}/Applications/.*Chrome\\.app`), weight: 50 },
        { regex: new RegExp(`^${home}/Applications/.*Chrome Canary\\.app`), weight: 51 },
        { regex: /^\/Applications\/.*Chrome.app/, weight: 100 },
        { regex: /^\/Applications\/.*Chrome Canary.app/, weight: 101 },
        { regex: /^\/Volumes\/.*Chrome.app/, weight: -2 },
        { regex: /^\/Volumes\/.*Chrome Canary.app/, weight: -1 },
    ];
    if (process.env.LIGHTHOUSE_CHROMIUM_PATH) {
        priorities.unshift({ regex: new RegExp(escapeRegExp(process.env.LIGHTHOUSE_CHROMIUM_PATH)), weight: 150 });
    }
    if (process.env.CHROME_PATH) {
        priorities.unshift({ regex: new RegExp(escapeRegExp(process.env.CHROME_PATH)), weight: 151 });
    }
    // clang-format on
    return sort(installations, priorities);
}
exports.darwin = darwin;
function resolveChromePath() {
    if (canAccess(process.env.CHROME_PATH)) {
        return process.env.CHROME_PATH;
    }
    if (canAccess(process.env.LIGHTHOUSE_CHROMIUM_PATH)) {
        log.warn('ChromeLauncher', 'LIGHTHOUSE_CHROMIUM_PATH is deprecated, use CHROME_PATH env variable instead.');
        return process.env.LIGHTHOUSE_CHROMIUM_PATH;
    }
    return undefined;
}
/**
 * Look for linux executables in 3 ways
 * 1. Look into CHROME_PATH env variable
 * 2. Look into the directories where .desktop are saved on gnome based distro's
 * 3. Look for google-chrome-stable & google-chrome executables by using the which command
 */
function linux() {
    let installations = [];
    // 1. Look into CHROME_PATH env variable
    const customChromePath = resolveChromePath();
    if (customChromePath) {
        installations.push(customChromePath);
    }
    // 2. Look into the directories where .desktop are saved on gnome based distro's
    const desktopInstallationFolders = [
        path.join(homedir(), '.local/share/applications/'),
        '/usr/share/applications/',
    ];
    desktopInstallationFolders.forEach(folder => {
        installations = installations.concat(findChromeExecutables(folder));
    });
    // Look for google-chrome(-stable) & chromium(-browser) executables by using the which command
    const executables = [
        'google-chrome-stable',
        'google-chrome',
        'chromium-browser',
        'chromium',
    ];
    executables.forEach((executable) => {
        try {
            const chromePath = execFileSync('which', [executable], { stdio: 'pipe' }).toString().split(newLineRegex)[0];
            if (canAccess(chromePath)) {
                installations.push(chromePath);
            }
        }
        catch (e) {
            // Not installed.
        }
    });
    if (!installations.length) {
        throw new utils_1.ChromePathNotSetError();
    }
    const priorities = [
        { regex: /chrome-wrapper$/, weight: 51 },
        { regex: /google-chrome-stable$/, weight: 50 },
        { regex: /google-chrome$/, weight: 49 },
        { regex: /chromium-browser$/, weight: 48 },
        { regex: /chromium$/, weight: 47 },
    ];
    if (process.env.LIGHTHOUSE_CHROMIUM_PATH) {
        priorities.unshift({ regex: new RegExp(escapeRegExp(process.env.LIGHTHOUSE_CHROMIUM_PATH)), weight: 100 });
    }
    if (process.env.CHROME_PATH) {
        priorities.unshift({ regex: new RegExp(escapeRegExp(process.env.CHROME_PATH)), weight: 101 });
    }
    return sort(uniq(installations.filter(Boolean)), priorities);
}
exports.linux = linux;
function wsl() {
    // Manually populate the environment variables assuming it's the default config
    process.env.LOCALAPPDATA = utils_1.getLocalAppDataPath(`${process.env.PATH}`);
    process.env.PROGRAMFILES = '/mnt/c/Program Files';
    process.env['PROGRAMFILES(X86)'] = '/mnt/c/Program Files (x86)';
    return win32();
}
exports.wsl = wsl;
function win32() {
    const installations = [];
    const suffixes = [
        `${path.sep}Google${path.sep}Chrome SxS${path.sep}Application${path.sep}chrome.exe`,
        `${path.sep}Google${path.sep}Chrome${path.sep}Application${path.sep}chrome.exe`
    ];
    const prefixes = [
        process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']
    ].filter(Boolean);
    const customChromePath = resolveChromePath();
    if (customChromePath) {
        installations.push(customChromePath);
    }
    prefixes.forEach(prefix => suffixes.forEach(suffix => {
        const chromePath = path.join(prefix, suffix);
        if (canAccess(chromePath)) {
            installations.push(chromePath);
        }
    }));
    return installations;
}
exports.win32 = win32;
function sort(installations, priorities) {
    const defaultPriority = 10;
    return installations
        // assign priorities
        .map((inst) => {
        for (const pair of priorities) {
            if (pair.regex.test(inst)) {
                return { path: inst, weight: pair.weight };
            }
        }
        return { path: inst, weight: defaultPriority };
    })
        // sort based on priorities
        .sort((a, b) => (b.weight - a.weight))
        // remove priority flag
        .map(pair => pair.path);
}
function canAccess(file) {
    if (!file) {
        return false;
    }
    try {
        fs.accessSync(file);
        return true;
    }
    catch (e) {
        return false;
    }
}
function uniq(arr) {
    return Array.from(new Set(arr));
}
function findChromeExecutables(folder) {
    const argumentsRegex = /(^[^ ]+).*/; // Take everything up to the first space
    const chromeExecRegex = '^Exec=/.*/(google-chrome|chrome|chromium)-.*';
    let installations = [];
    if (canAccess(folder)) {
        // Output of the grep & print looks like:
        //    /opt/google/chrome/google-chrome --profile-directory
        //    /home/user/Downloads/chrome-linux/chrome-wrapper %U
        let execPaths;
        // Some systems do not support grep -R so fallback to -r.
        // See https://github.com/GoogleChrome/chrome-launcher/issues/46 for more context.
        try {
            execPaths = execSync(`grep -ER "${chromeExecRegex}" ${folder} | awk -F '=' '{print $2}'`, { stdio: 'pipe' });
        }
        catch (e) {
            execPaths = execSync(`grep -Er "${chromeExecRegex}" ${folder} | awk -F '=' '{print $2}'`, { stdio: 'pipe' });
        }
        execPaths = execPaths.toString()
            .split(newLineRegex)
            .map((execPath) => execPath.replace(argumentsRegex, '$1'));
        execPaths.forEach((execPath) => canAccess(execPath) && installations.push(execPath));
    }
    return installations;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomPort = void 0;
const http_1 = require("http");
/**
 * Return a random, unused port.
 */
function getRandomPort() {
    return new Promise((resolve, reject) => {
        const server = http_1.createServer();
        server.listen(0);
        server.once('listening', () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
        server.once('error', reject);
    });
}
exports.getRandomPort = getRandomPort;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FLAGS = void 0;
exports.DEFAULT_FLAGS = [
    // Disable built-in Google Translate service
    '--disable-features=TranslateUI',
    // Disable all chrome extensions
    '--disable-extensions',
    // Disable some extensions that aren't affected by --disable-extensions
    '--disable-component-extensions-with-background-pages',
    // Disable various background network services, including extension updating,
    //   safe browsing service, upgrade detector, translate, UMA
    '--disable-background-networking',
    // Disable syncing to a Google account
    '--disable-sync',
    // Disable reporting to UMA, but allows for collection
    '--metrics-recording-only',
    // Disable installation of default apps on first run
    '--disable-default-apps',
    // Mute any audio
    '--mute-audio',
    // Disable the default browser check, do not prompt to set it as such
    '--no-default-browser-check',
    // Skip first run wizards
    '--no-first-run',
    // Disable backgrounding renders for occluded windows
    '--disable-backgrounding-occluded-windows',
    // Disable renderer process backgrounding
    '--disable-renderer-backgrounding',
    // Disable task throttling of timer tasks from background pages.
    '--disable-background-timer-throttling',
    // Disable background tracing (aka slow reports & deep reports) to avoid 'Tracing already started'
    '--force-fieldtrials=*BackgroundTracing/default/',
];
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try {
            step(generator.next(value));
        }
        catch (e) {
            reject(e);
        } }
        function rejected(value) { try {
            step(generator["throw"](value));
        }
        catch (e) {
            reject(e);
        } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.killAll = exports.launch = exports.Launcher = void 0;
const childProcess = require("child_process");
const fs = require("fs");
const net = require("net");
const rimraf = require("rimraf");
const chromeFinder = require("./chrome-finder");
const random_port_1 = require("./random-port");
const flags_1 = require("./flags");
const utils_1 = require("./utils");
const log = require('lighthouse-logger');
const spawn = childProcess.spawn;
const execSync = childProcess.execSync;
const isWsl = utils_1.getPlatform() === 'wsl';
const isWindows = utils_1.getPlatform() === 'win32';
const _SIGINT = 'SIGINT';
const _SIGINT_EXIT_CODE = 130;
const _SUPPORTED_PLATFORMS = new Set(['darwin', 'linux', 'win32', 'wsl']);
const instances = new Set();
const sigintListener = () => __awaiter(void 0, void 0, void 0, function* () {
    yield killAll();
    process.exit(_SIGINT_EXIT_CODE);
});
function launch(opts = {}) {
    /* eslint-disable require-yield */
    return __awaiter(this, void 0, void 0, function* () {
        opts.handleSIGINT = utils_1.defaults(opts.handleSIGINT, true);
        const instance = new Launcher(opts);
        // Kill spawned Chrome process in case of ctrl-C.
        if (opts.handleSIGINT && instances.size === 0) {
            process.on(_SIGINT, sigintListener);
        }
        instances.add(instance);
        yield instance.launch();
        const kill = () => __awaiter(this, void 0, void 0, function* () {
            instances.delete(instance);
            if (instances.size === 0) {
                process.removeListener(_SIGINT, sigintListener);
            }
            return instance.kill();
        });
        return { pid: instance.pid, port: instance.port, kill, process: instance.chrome };
    });
    /* eslint-enable require-yield */
}
exports.launch = launch;
function killAll() {
    return __awaiter(this, void 0, void 0, function* () {
        let errors = [];
        for (const instance of instances) {
            try {
                yield instance.kill();
                // only delete if kill did not error
                // this means erroring instances remain in the Set
                instances.delete(instance);
            }
            catch (err) {
                errors.push(err);
            }
        }
        return errors;
    });
}
exports.killAll = killAll;
class Launcher {
    constructor(opts = {}, moduleOverrides = {}) {
        this.opts = opts;
        this.tmpDirandPidFileReady = false;
        this.fs = moduleOverrides.fs || fs;
        this.rimraf = moduleOverrides.rimraf || rimraf;
        this.spawn = moduleOverrides.spawn || spawn;
        log.setLevel(utils_1.defaults(this.opts.logLevel, 'silent'));
        // choose the first one (default)
        this.startingUrl = utils_1.defaults(this.opts.startingUrl, 'about:blank');
        this.chromeFlags = utils_1.defaults(this.opts.chromeFlags, []);
        this.requestedPort = utils_1.defaults(this.opts.port, 0);
        this.chromePath = this.opts.chromePath;
        this.ignoreDefaultFlags = utils_1.defaults(this.opts.ignoreDefaultFlags, false);
        this.connectionPollInterval = utils_1.defaults(this.opts.connectionPollInterval, 500);
        this.maxConnectionRetries = utils_1.defaults(this.opts.maxConnectionRetries, 50);
        this.envVars = utils_1.defaults(opts.envVars, Object.assign({}, process.env));
        if (typeof this.opts.userDataDir === 'boolean') {
            if (!this.opts.userDataDir) {
                this.useDefaultProfile = true;
                this.userDataDir = undefined;
            }
            else {
                throw new utils_1.InvalidUserDataDirectoryError();
            }
        }
        else {
            this.useDefaultProfile = false;
            this.userDataDir = this.opts.userDataDir;
        }
    }
    get flags() {
        const flags = this.ignoreDefaultFlags ? [] : flags_1.DEFAULT_FLAGS.slice();
        flags.push(`--remote-debugging-port=${this.port}`);
        if (!this.ignoreDefaultFlags && utils_1.getPlatform() === 'linux') {
            flags.push('--disable-setuid-sandbox');
        }
        if (!this.useDefaultProfile) {
            // Place Chrome profile in a custom location we'll rm -rf later
            // If in WSL, we need to use the Windows format
            flags.push(`--user-data-dir=${isWsl ? utils_1.toWinDirFormat(this.userDataDir) : this.userDataDir}`);
        }
        flags.push(...this.chromeFlags);
        flags.push(this.startingUrl);
        return flags;
    }
    static defaultFlags() {
        return flags_1.DEFAULT_FLAGS.slice();
    }
    /** Returns the highest priority chrome installation. */
    static getFirstInstallation() {
        if (utils_1.getPlatform() === 'darwin')
            return chromeFinder.darwinFast();
        return chromeFinder[utils_1.getPlatform()]()[0];
    }
    /** Returns all available chrome installations in decreasing priority order. */
    static getInstallations() {
        return chromeFinder[utils_1.getPlatform()]();
    }
    // Wrapper function to enable easy testing.
    makeTmpDir() {
        return utils_1.makeTmpDir();
    }
    prepare() {
        const platform = utils_1.getPlatform();
        if (!_SUPPORTED_PLATFORMS.has(platform)) {
            throw new utils_1.UnsupportedPlatformError();
        }
        this.userDataDir = this.userDataDir || this.makeTmpDir();
        this.outFile = this.fs.openSync(`${this.userDataDir}/chrome-out.log`, 'a');
        this.errFile = this.fs.openSync(`${this.userDataDir}/chrome-err.log`, 'a');
        // fix for Node4
        // you can't pass a fd to fs.writeFileSync
        this.pidFile = `${this.userDataDir}/chrome.pid`;
        log.verbose('ChromeLauncher', `created ${this.userDataDir}`);
        this.tmpDirandPidFileReady = true;
    }
    launch() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.requestedPort !== 0) {
                this.port = this.requestedPort;
                // If an explict port is passed first look for an open connection...
                try {
                    return yield this.isDebuggerReady();
                }
                catch (err) {
                    log.log('ChromeLauncher', `No debugging port found on port ${this.port}, launching a new Chrome.`);
                }
            }
            if (this.chromePath === undefined) {
                const installation = Launcher.getFirstInstallation();
                if (!installation) {
                    throw new utils_1.ChromeNotInstalledError();
                }
                this.chromePath = installation;
            }
            if (!this.tmpDirandPidFileReady) {
                this.prepare();
            }
            this.pid = yield this.spawnProcess(this.chromePath);
            return Promise.resolve();
        });
    }
    spawnProcess(execPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const spawnPromise = (() => __awaiter(this, void 0, void 0, function* () {
                if (this.chrome) {
                    log.log('ChromeLauncher', `Chrome already running with pid ${this.chrome.pid}.`);
                    return this.chrome.pid;
                }
                // If a zero value port is set, it means the launcher
                // is responsible for generating the port number.
                // We do this here so that we can know the port before
                // we pass it into chrome.
                if (this.requestedPort === 0) {
                    this.port = yield random_port_1.getRandomPort();
                }
                log.verbose('ChromeLauncher', `Launching with command:\n"${execPath}" ${this.flags.join(' ')}`);
                const chrome = this.spawn(execPath, this.flags, { detached: true, stdio: ['ignore', this.outFile, this.errFile], env: this.envVars });
                this.chrome = chrome;
                this.fs.writeFileSync(this.pidFile, chrome.pid.toString());
                log.verbose('ChromeLauncher', `Chrome running with pid ${chrome.pid} on port ${this.port}.`);
                return chrome.pid;
            }))();
            const pid = yield spawnPromise;
            yield this.waitUntilReady();
            return pid;
        });
    }
    cleanup(client) {
        if (client) {
            client.removeAllListeners();
            client.end();
            client.destroy();
            client.unref();
        }
    }
    // resolves if ready, rejects otherwise
    isDebuggerReady() {
        return new Promise((resolve, reject) => {
            const client = net.createConnection(this.port);
            client.once('error', err => {
                this.cleanup(client);
                reject(err);
            });
            client.once('connect', () => {
                this.cleanup(client);
                resolve();
            });
        });
    }
    // resolves when debugger is ready, rejects after 10 polls
    waitUntilReady() {
        const launcher = this;
        return new Promise((resolve, reject) => {
            let retries = 0;
            let waitStatus = 'Waiting for browser.';
            const poll = () => {
                if (retries === 0) {
                    log.log('ChromeLauncher', waitStatus);
                }
                retries++;
                waitStatus += '..';
                log.log('ChromeLauncher', waitStatus);
                launcher.isDebuggerReady()
                    .then(() => {
                    log.log('ChromeLauncher', waitStatus + `${log.greenify(log.tick)}`);
                    resolve();
                })
                    .catch(err => {
                    if (retries > launcher.maxConnectionRetries) {
                        log.error('ChromeLauncher', err.message);
                        const stderr = this.fs.readFileSync(`${this.userDataDir}/chrome-err.log`, { encoding: 'utf-8' });
                        log.error('ChromeLauncher', `Logging contents of ${this.userDataDir}/chrome-err.log`);
                        log.error('ChromeLauncher', stderr);
                        return reject(err);
                    }
                    utils_1.delay(launcher.connectionPollInterval).then(poll);
                });
            };
            poll();
        });
    }
    kill() {
        return new Promise((resolve, reject) => {
            if (this.chrome) {
                this.chrome.on('close', () => {
                    delete this.chrome;
                    this.destroyTmp().then(resolve);
                });
                log.log('ChromeLauncher', `Killing Chrome instance ${this.chrome.pid}`);
                try {
                    if (isWindows) {
                        // While pipe is the default, stderr also gets printed to process.stderr
                        // if you don't explicitly set `stdio`
                        // wait for log stream
                        // we use start /b and windowsHide to not show any console window
                        // when executing this command
                        execSync(`start /b cmd /c taskkill /pid ${this.chrome.pid} /T /F`, {
                            stdio: 'ignore',
                            windowsHide: true
                        });
                    }
                    else {
                        process.kill(-this.chrome.pid);
                    }
                }
                catch (err) {
                    const message = `Chrome could not be killed ${err.message}`;
                    log.warn('ChromeLauncher', message);
                    reject(new Error(message));
                }
            }
            else {
                // fail silently as we did not start chrome
                resolve();
            }
        });
    }
    destroyTmp() {
        return new Promise(resolve => {
            // Only clean up the tmp dir if we created it.
            if (this.userDataDir === undefined || this.opts.userDataDir !== undefined) {
                return resolve();
            }
            if (this.outFile) {
                this.fs.closeSync(this.outFile);
                delete this.outFile;
            }
            if (this.errFile) {
                this.fs.closeSync(this.errFile);
                delete this.errFile;
            }
            this.rimraf(this.userDataDir, () => resolve());
        });
    }
}
exports.Launcher = Launcher;
exports.default = Launcher;
module.exports = {
    name: "GraderDemoApp",
    author: {
        name: "dosyago",
        url: "https://github.com/dosyago",
    },
    desiredPort: 22121,
    version: "0.0.1",
    description: "A Beautiful Demonstration of Just a Tiny Fraction of The Amazing Benevolence Which Grader Hath To Offer",
    source: "https://github.com/c9fe/grader",
    organization: {
        name: "Grader",
        url: "https://github.com/grader-js"
    },
    apiOrigins: [],
};
System.register("lib/common", ["os", "path", "config"], function (exports_1, context_1) {
    "use strict";
    var os_1, path_1, config_js_1, DEBUG, DEBUG2, APP_ROOT, appDir, expiredSessionFile, sessionDir, app_data_dir, temp_browser_cache, logFile, sleep;
    var __moduleName = context_1 && context_1.id;
    function say(o) {
        console.log(JSON.stringify(o));
    }
    exports_1("say", say);
    function delayThrow(msg) {
        // collect the stack while it's in frame
        const err = new TypeError(msg);
        // throw after delay
        setTimeout(() => { throw err; }, 0);
        return void 0;
    }
    exports_1("delayThrow", delayThrow);
    return {
        setters: [
            function (os_1_1) {
                os_1 = os_1_1;
            },
            function (path_1_1) {
                path_1 = path_1_1;
            },
            function (config_js_1_1) {
                config_js_1 = config_js_1_1;
            }
        ],
        execute: function () {
            // determine where this code is running 
            exports_1("DEBUG", DEBUG = process.env.DEBUG_grader || false);
            exports_1("DEBUG2", DEBUG2 = false);
            exports_1("APP_ROOT", APP_ROOT = __dirname);
            exports_1("appDir", appDir = () => DEBUG ?
                path_1.default.resolve(__dirname, '..')
                :
                    path_1.default.resolve(os_1.default.homedir(), '.grader', 'appData', `${(config_js_1.default.organization || config_js_1.default.author).name}`, `service_${config_js_1.default.name}`));
            exports_1("expiredSessionFile", expiredSessionFile = () => path_1.default.resolve(appDir(), 'old-sessions.json'));
            exports_1("sessionDir", sessionDir = sessionId => path_1.default.resolve(appDir(), 'sessions', sessionId));
            exports_1("app_data_dir", app_data_dir = sessionId => path_1.default.resolve(sessionDir(sessionId), `ui-data`));
            exports_1("temp_browser_cache", temp_browser_cache = sessionId => path_1.default.resolve(sessionDir(sessionId), `ui-cache`));
            exports_1("logFile", logFile = () => path_1.default.resolve(appDir(), 'launcher.log'));
            exports_1("sleep", sleep = ms => new Promise(res => setTimeout(res, ms)));
        }
    };
});
System.register("lib/protocol", ["node-fetch", "ws", "lib/common"], function (exports_2, context_2) {
    "use strict";
    var node_fetch_1, ws_1, common_js_1, ROOT_SESSION;
    var __moduleName = context_2 && context_2.id;
    async function connect({ port: port = 9222, exposeSocket: exposeSocket = false } = {}) {
        const Resolvers = {};
        const Handlers = {};
        let id = 0;
        let socket;
        try {
            const { webSocketDebuggerUrl } = await node_fetch_1.default(`http://localhost:${port}/json/version`).then(r => r.json());
            let resolve;
            const promise = new Promise(res => resolve = res);
            socket = new ws_1.default(webSocketDebuggerUrl);
            socket.on('message', handle);
            socket.on('open', () => resolve());
            /*
            socket.on('error', err => {
              console.info('Socket error', err);
              close();
            });
            */
            await promise;
            const retVal = {
                send,
                on, ons,
                disconnect: close
            };
            if (exposeSocket) {
                retVal.socket = socket;
            }
            return retVal;
        }
        catch (e) {
            console.log("Error communicating with browser", e);
            return;
        }
        async function send(method, params = {}, sessionId) {
            const message = {
                method, params, sessionId,
                id: ++id
            };
            if (!sessionId) {
                delete message[sessionId];
            }
            const key = `${sessionId || ROOT_SESSION}:${message.id}`;
            let resolve, reject = z => console.error(`Reject was not set ${z}`);
            // typescript is stupid volume 2314832: it thinks the following resolve 
            // in the catch block can be undefined, even tho it is clearly set below
            const promise = new Promise((res, rej) => (resolve = res, reject = rej));
            Resolvers[key] = resolve;
            try {
                socket.send(JSON.stringify(message));
            }
            catch (e) {
                console.log('Error sending on socket', e);
                reject(e);
            }
            return promise;
        }
        async function handle(message) {
            const stringMessage = message;
            message = JSON.parse(message);
            if (message.error) {
                common_js_1.DEBUG && console.warn(message);
            }
            const { sessionId } = message;
            const { method } = message;
            const { id, result } = message;
            if (id) {
                const key = `${sessionId || ROOT_SESSION}:${id}`;
                const resolve = Resolvers[key];
                if (!resolve) {
                    console.warn(`No resolver for key`, key, stringMessage.slice(0, 140));
                }
                else {
                    Resolvers[key] = undefined;
                    try {
                        await resolve(result);
                    }
                    catch (e) {
                        console.warn(`Resolver failed`, e, key, stringMessage.slice(0, 140), resolve);
                    }
                }
            }
            else if (method) {
                const listeners = Handlers[method];
                if (Array.isArray(listeners)) {
                    for (const func of listeners) {
                        try {
                            func({ message, sessionId });
                        }
                        catch (e) {
                            console.warn(`Listener failed`, method, e, func.toString().slice(0, 140), stringMessage.slice(0, 140));
                        }
                    }
                }
            }
            else {
                console.warn(`Unknown message on socket`, message);
            }
        }
        function on(method, handler) {
            let listeners = Handlers[method];
            if (!listeners) {
                Handlers[method] = listeners = [];
            }
            listeners.push(wrap(handler));
        }
        function ons(method, handler) {
            let listeners = Handlers[method];
            if (!listeners) {
                Handlers[method] = listeners = [];
            }
            listeners.push(handler);
        }
        function close() {
            try {
                socket.close();
            }
            catch (e) {
                console.info('Error closing socket...', e);
            }
        }
        function wrap(fn) {
            return ({ message }) => fn(message.params);
        }
    }
    exports_2("default", connect);
    return {
        setters: [
            function (node_fetch_1_1) {
                node_fetch_1 = node_fetch_1_1;
            },
            function (ws_1_1) {
                ws_1 = ws_1_1;
            },
            function (common_js_1_1) {
                common_js_1 = common_js_1_1;
            }
        ],
        execute: function () {
            ROOT_SESSION = "browser";
        }
    };
});
System.register("lib/api_bridge", ["lib/common", "index", "config"], function (exports_3, context_3) {
    "use strict";
    var common_js_2, index_js_1, config_js_2, ALLOWED_ORIGINS, counter;
    var __moduleName = context_3 && context_3.id;
    async function bridge(...requestArgs) {
        counter++;
        common_js_2.DEBUG && console.info('Bridge called', requestArgs);
        const [{ name, payload: stringPayload, executionContextId }] = requestArgs;
        let payload;
        try {
            payload = JSON.parse(stringPayload);
        }
        catch (e) {
            console.info(`Error parsing API bridge payload`, name, payload, executionContextId);
            throw new TypeError(`Error parsing API bridge payload ${e}`);
        }
        const { origin, apiProxy } = payload;
        if (!origin || !apiProxy) {
            console.info(`Malformed apiProxy request`, { stringPayload, origin, apiProxy });
            throw new TypeError(`API bridge received malformed apiProxy request. Requires origin and apiProxy properties.`);
        }
        if (!ALLOWED_ORIGINS().has(origin)) {
            console.info(`Illegitimate origin requesting API bridge access`, { stringPayload, origin, apiProxy });
            throw new TypeError(`API bridge received apiProxy request from disallowed origin. If you want this origin to make API bridge requests, add it to the config.apiOrigins list.`);
        }
        const { path, args } = apiProxy;
        try {
            const apiCall = resolvePathToFunction(index_js_1.default, path);
            const revivedArgs = JSON.parse(args);
            const apiResult = await apiCall(...revivedArgs);
            common_js_2.DEBUG && (counter += 1);
            common_js_2.DEBUG && console.log({ counter, apiResult, time: Date.now() });
            return apiResult;
        }
        catch (e) {
            console.info(`API proxy could not complete request`, { origin, path, args }, e);
            throw e;
        }
    }
    exports_3("default", bridge);
    function resolvePathToFunction(root, steps) {
        let link = root;
        let lastLink;
        let index = 0;
        let nextStep = steps[index];
        while (link[nextStep] !== undefined) {
            lastLink = link;
            link = link[nextStep];
            index += 1;
            nextStep = steps[index];
        }
        if (index < steps.length) {
            console.info(`Path ended before last step reached`, { lastLink, link, nextStep, steps, root });
            throw new TypeError(`API method ${steps.join('.')} was not found. Reason: Path was undefined (at ${steps.slice(0, index + 1).join('.')}) before reaching end of: ${steps.join('.')}`);
        }
        if (typeof link !== "function") {
            console.info(`Path ended at non-function`, { lastLink, nonFunction: link, nextStep, steps, root });
            throw new TypeError(`Path needs to end at a function for API call. But ended at: ${link}`);
        }
        // bind link's this value to lastLink
        // as if it was called via <lastLink>.<link>(
        const reboundFunction = link.bind(lastLink);
        return reboundFunction;
    }
    return {
        setters: [
            function (common_js_2_1) {
                common_js_2 = common_js_2_1;
            },
            function (index_js_1_1) {
                index_js_1 = index_js_1_1;
            },
            function (config_js_2_1) {
                config_js_2 = config_js_2_1;
            }
        ],
        execute: function () {
            ALLOWED_ORIGINS = () => {
                const OK = new Set([
                    ...config_js_2.default.apiOrigins || [],
                    `http://localhost:${index_js_1.default.ServicePort}`,
                    `https://localhost:${index_js_1.default.ServicePort}`
                ]);
                return OK;
            };
            counter = 0;
        }
    };
});
System.register("service", ["fs", "path", "express", "http-terminator", "lib/vendor/chrome-launcher", "browser-installer", "index", "config", "lib/common", "lib/protocol", "lib/api_bridge"], function (exports_4, context_4) {
    "use strict";
    var fs_1, path_2, express_1, http_terminator_1, chrome_launcher_js_1, browser_installer_1, index_js_2, config_js_3, common_js_3, protocol_js_1, api_bridge_js_1, PORT_DEBUG, MAX_RETRY, MAX_BINDING_RETRY, SITE_PATH, newSessionId, SessionId, BINDING_NAME, JS_CONTEXT_NAME, API_PROXY_SCRIPT, SERVICE_BINDING_SCRIPT, retryCount;
    var __moduleName = context_4 && context_4.id;
    // main executable block
    async function go(settings) {
        const app = express_1.default();
        // debugging info
        /**
        console.log({
          processArgv: process.argv,
          requireMain: require.main,
          module,
          importMetaURL: import.meta.url
        });
        **/
        if (common_js_3.DEBUG || process.argv[1].includes(`service_${config_js_3.default.name}`)) { // our startup cue
            notify('Request app start.');
            return await run(app, settings);
        }
    }
    exports_4("go", go);
    // main functions
    async function run(app, settings) {
        common_js_3.DEBUG && console.log("Settings", settings);
        const { keepConsoleOpen, server, addHandlers } = settings;
        // start background service
        console.log(`Start service...`);
        notify('Request service start.');
        console.log({ settings });
        let service, ServicePort;
        try {
            ({ service, port: ServicePort } = await start({
                app, addHandlers, desiredPort: config_js_3.default.desiredPort, server
            }));
            index_js_2.default.ServicePort = ServicePort;
        }
        catch (e) {
            console.error(e);
            notify('Could not start background service. Because: ' + JSON.stringify(e));
            process.exit(1);
        }
        notify('Service started.');
        console.log(`App service started.`);
        // cleanup any old sessions
        const undeletedOldSessions = [];
        try {
            const expiredSessions = JSON.parse(fs_1.default.readFileSync(common_js_3.expiredSessionFile()).toString());
            expiredSessions.forEach(sessionId => {
                try {
                    fs_1.default.rmdirSync(common_js_3.sessionDir(sessionId), { recursive: true, maxRetries: 3, retryDelay: 700 });
                }
                catch (e) {
                    common_js_3.DEBUG && console.info(`Error deleting old sessions directory ${sessionId}...`, e);
                    undeletedOldSessions.push(sessionId);
                }
            });
        }
        catch (e) {
            common_js_3.DEBUG && console.info(`Error deleting sessions from expred sessions file...`, e);
        }
        fs_1.default.writeFileSync(common_js_3.expiredSessionFile(), JSON.stringify(undeletedOldSessions));
        // check for keep console open and notify if requested
        if (keepConsoleOpen) {
            notify({ keepConsoleOpen });
        }
        // do layout prep if requrested
        let layout;
        if (settings.doLayout) {
            const { screenWidth, screenHeight } = await index_js_2.default.ui.getScreen({
                ServicePort,
                sessionId: SessionId
            });
            layout = { screenWidth, screenHeight };
            if (typeof settings.doLayout === "function") {
                layout = settings.doLayout(layout);
            }
        }
        // launch UI
        notify('Request user interface.');
        console.log(`Launching UI...`);
        let UI, browser;
        try {
            ({ UI, browser } = await newBrowser({ ServicePort, sessionId: SessionId, layout }));
        }
        catch (e) {
            let fatal = null;
            console.log(e, e.code, e.code == "ERR_LAUNCHER_NOT_INSTALLED");
            if (e && e.code == "ERR_LAUNCHER_NOT_INSTALLED") {
                try {
                    await browser_installer_1.install();
                    ({ UI, browser } = await newBrowser({ ServicePort, sessionId: SessionId, layout }));
                }
                catch (e2) {
                    fatal = e2;
                }
            }
            else {
                fatal = e;
            }
            if (fatal) {
                common_js_3.DEBUG && console.error('fatal', fatal);
                fs_1.default.writeFileSync('browser.error', JSON.stringify({ err: fatal, msg: fatal + '', stack: fatal.stack }));
                safe_notify('Could not start UI (chrome). Because: ' + JSON.stringify(fatal));
                process.exit(1);
            }
        }
        //DEBUG && console.log({browser, ChromeLaunch});
        console.log(`Chrome started.`);
        notify('User interface created.');
        // setup future cleanup
        const killService = installCleanupHandlers({ ui: UI, bg: service });
        // don't keep the socket exposed
        UI.socket = null;
        notify && notify(`App started. ${ServicePort}`);
        process.disconnect && process.disconnect();
        return { expressApp: app, killService, ServicePort, browser, service, UI, notify, newSessionId };
    }
    async function newBrowser({ sessionId: browserSessionId, blank: blank = false, ServicePort: ServicePort = undefined, uriPath: uriPath = '/', headless: headless = false, layout: layout = undefined, noDelete: noDelete = false, silent: silent = false, } = { sessionId: undefined }) {
        if (!(browserSessionId && ((ServicePort || '').toString() || blank))) {
            throw new TypeError(`newBrowser must be passed a unique browserSessionId and either the 'blank' flag or a ServicePort`);
        }
        // DEBUG
        const id = (Math.random() * 99999 + Date.now()).toString(36);
        common_js_3.DEBUG && console.log({ browserStart: { id, browserSessionId, ServicePort } });
        // set up some state to track progress
        let bindingRetryCount = 0;
        // set up a promise to track progress
        let reject, resolve = x => common_js_3.delayThrow(`Resolve not set: ` + x);
        const pr = new Promise((res, rej) => (resolve = res, reject = rej));
        // set up disk space
        !silent && safe_notify('Request UI directories.');
        if (!fs_1.default.existsSync(common_js_3.temp_browser_cache(browserSessionId))) {
            console.log(`Temp browser cache directory does not exist. Creating...`);
            fs_1.default.mkdirSync(common_js_3.temp_browser_cache(browserSessionId), { recursive: true });
            console.log(`Created.`);
        }
        if (!fs_1.default.existsSync(common_js_3.app_data_dir(browserSessionId))) {
            console.log(`App data dir does not exist. Creating...`);
            fs_1.default.mkdirSync(common_js_3.app_data_dir(browserSessionId), { recursive: true });
            console.log(`Created.`);
        }
        !silent && safe_notify('UI data and cache directory created.');
        // construct start URL
        let startUrl;
        if (blank) {
            startUrl = 'data:text/html,<!DOCTYPE html><script>document.title = "Made with Grader"</script>';
        }
        else {
            startUrl = `http://localhost:${ServicePort}${uriPath}`;
        }
        // start browser
        const CHROME_OPTS = [
            `--no-default-browser-check`,
            `--disable-extensions`,
            `--disable-breakpad`,
            `--metrics-recording-only`,
            `--new-window`,
            `--no-first-run`,
            /*'--restore-last-session',*/
            `--disk-cache-dir=${common_js_3.temp_browser_cache(browserSessionId)}`,
            `--aggressive-cache-discard`
        ];
        if (headless) {
            // not really headless because we need to use the real display to collect info
            // but this means it doesn't open a window
            CHROME_OPTS.push('--silent-launch');
        }
        else {
            CHROME_OPTS.push(`--app=${startUrl}`);
        }
        if (layout) {
            let { screenWidth, screenHeight, x, y, width, height } = layout;
            if (!screenWidth || !screenHeight)
                return;
            // auto golden ratio
            if (width === undefined || height === undefined) {
                width = Math.ceil(0.618 * screenWidth);
                height = Math.ceil(0.618 * screenHeight);
            }
            // auto center
            if (x === undefined || y === undefined) {
                x = Math.round((screenWidth - width) / 2);
                y = Math.round((screenHeight - height) / 2);
            }
            CHROME_OPTS.push(`--window-position=${x},${y}`, `--window-size=${width},${height}`);
        }
        const LAUNCH_OPTS = {
            logLevel: common_js_3.DEBUG ? 'verbose' : 'silent',
            chromeFlags: CHROME_OPTS,
            userDataDir: common_js_3.app_data_dir(browserSessionId),
            ignoreDefaultFlags: true,
            handleSIGINT: false
        };
        common_js_3.DEBUG && console.log({ LAUNCH_OPTS });
        let browser;
        try {
            browser = await chrome_launcher_js_1.launch(LAUNCH_OPTS);
        }
        catch (e) {
            let fatal = null;
            console.log('track', e, e.code, e.code == "ERR_LAUNCHER_NOT_INSTALLED");
            if (e && e.code == "ERR_LAUNCHER_NOT_INSTALLED") {
                try {
                    await browser_installer_1.install();
                    browser = await chrome_launcher_js_1.launch(LAUNCH_OPTS);
                }
                catch (e2) {
                    fatal = e2;
                }
            }
            else {
                fatal = e;
            }
            if (fatal) {
                common_js_3.DEBUG && console.error('fatal', fatal);
                fs_1.default.writeFileSync('browser.error', JSON.stringify({ err: fatal, msg: fatal + '', stack: fatal.stack }));
                safe_notify('Could not start UI (chrome). Because: ' + JSON.stringify(fatal));
                throw fatal;
            }
        }
        // connect to UI
        let appTarget;
        !silent && safe_notify('Request interface connection.');
        console.log(`Connecting to UI...`);
        console.log(browser);
        const UI = await protocol_js_1.default({ port: browser.port, exposeSocket: true });
        console.log(`Connected.`);
        !silent && safe_notify('User interface online.');
        UI.id = id;
        UI.browser = browser;
        // prepare cleanup
        Object.defineProperty(UI, 'cleanSessionDirs', {
            value: cleanSessionDirs
        });
        // or if the process exits
        process.on('beforeExit', async () => await index_js_2.default.ui.close(UI));
        // get a target and (if not 'headless') a windowId
        let windowId;
        try {
            const { targetInfos } = await UI.send("Target.getTargets", {});
            common_js_3.DEBUG && console.info({ targetInfos, startUrl });
            if (headless) {
                appTarget = targetInfos.find(({ type }) => {
                    return type == 'background_page';
                });
            }
            else {
                appTarget = targetInfos.find(({ type, url }) => {
                    return type == 'page' && url.startsWith(startUrl);
                });
                ({ windowId } = await UI.send("Browser.getWindowForTarget", {
                    targetId: appTarget.targetId
                }));
            }
        }
        catch (e) {
            common_js_3.DEBUG && console.info(`Error getting window ID...`, e);
        }
        // expose some useful properties 
        Object.defineProperties(UI, {
            windowId: {
                value: windowId
            },
            startUrl: {
                value: startUrl
            },
            browserSessionId: {
                value: browserSessionId
            },
            browser: {
                value: browser
            }
        });
        // install binding and script and reload
        if (headless) {
            const { send } = UI;
            try {
                // attach to target
                common_js_3.DEBUG && console.log({ installingAPIProxy: true });
                const { sessionId } = await send("Target.attachToTarget", {
                    targetId: appTarget.targetId,
                    flatten: true
                });
                UI.sessionId = sessionId;
                await send("Runtime.enable", {}, sessionId);
                common_js_3.DEBUG && console.log({ attached: { sessionId } });
                // get screen details
                const { result: { value: result } } = await send("Runtime.evaluate", {
                    expression: `({screenWidth: screen.width, screenHeight: screen.height})`,
                    returnByValue: true
                }, sessionId);
                console.log({ result });
                const { screenWidth, screenHeight } = result;
                index_js_2.default.util.kv('screen', { screenWidth, screenHeight });
                resolve({ browser, UI });
            }
            catch (e) {
                common_js_3.DEBUG && console.info(`Error install API proxy...`, e);
            }
        }
        else {
            /**
              note that doing it like this
              where we add the binding only to the one isolate JS context
              where our grader API global is
              means that no JS scripts on any page
              can access either the binding or the global
              the only way we can access those scripts is
              to add a config.js property that whitelists those scripts
              and import them here using add script (in the same call we already use)
              or eval them in the isolated world directly
              this means that to actually talk to the window APIs
              from a regular script loaded staticly by the browser
              we need to use postMessage I think
              this is more work for the dev but ultimately i think
              a better solution since it's more secure than just with one flag
              (apiInUI) exposing the service APIs to any script that gets loaded
              by the UI
            **/
            const { on, send } = UI;
            try {
                // attach to target
                common_js_3.DEBUG && console.log({ installingAPIProxy: true });
                const { sessionId } = await send("Target.attachToTarget", {
                    targetId: appTarget.targetId,
                    flatten: true
                });
                UI.sessionId = sessionId;
                await send("Runtime.enable", {}, sessionId);
                await send("Page.enable", {}, sessionId);
                common_js_3.DEBUG && console.log({ attached: { sessionId } });
                // add the proxy script to all frames in this target
                const script = await send("Page.addScriptToEvaluateOnNewDocument", {
                    source: API_PROXY_SCRIPT,
                }, sessionId);
                common_js_3.DEBUG && console.log({ script });
                // listen for binding request
                await on("Runtime.bindingCalled", async ({ name, payload, executionContextId }) => {
                    common_js_3.DEBUG && console.log("Service side received call from UI binding");
                    let id;
                    try {
                        id = JSON.parse(payload).id;
                    }
                    catch (e) {
                        console.info(`Couldn't parse payload`, payload, e);
                        return;
                    }
                    common_js_3.DEBUG && console.info({ name, id, payload, executionContextId });
                    const result = {};
                    try {
                        result.value = await api_bridge_js_1.default({ name, payload, executionContextId });
                    }
                    catch (e) {
                        const stack = e.stack && '\n' + e.stack.split(/\n/g);
                        result.error = `${e.name}: ${e.message}${stack || ''}`;
                    }
                    const sendResult = await send("Runtime.evaluate", {
                        expression: `globalThis._graderUI(${JSON.stringify({ result, id })})`,
                        contextId: executionContextId
                    }, sessionId);
                    if (sendResult.exceptionDetails) {
                        common_js_3.DEBUG && console.info(`Error talking to _graderUI`, JSON.stringify(sendResult));
                    }
                    else {
                        common_js_3.DEBUG && console.log(`Successfully sent API result to page`, { result }, { sendResult });
                    }
                });
                await on("Runtime.consoleAPICalled", async ({ args }) => {
                    try {
                        if (args.length == 0)
                            return;
                        const [{ value: string }] = args;
                        let installBinding = false;
                        if (typeof string == "string") {
                            try {
                                const obj = JSON.parse(string);
                                if (obj.graderRequestInstallBinding) {
                                    installBinding = true;
                                }
                            }
                            catch (e) {
                                // not our message 
                            }
                        }
                        if (installBinding) {
                            common_js_3.DEBUG && console.log({ installBindingCalled: true });
                            // get top frame
                            const { frameTree: { frame: { id: frameId } } } = await send("Page.getFrameTree", {}, sessionId);
                            // create an isolate
                            const { executionContextId } = await send("Page.createIsolatedWorld", {
                                frameId,
                                worldName: JS_CONTEXT_NAME,
                            }, sessionId);
                            // add a binding to it
                            if (bindingRetryCount == 0) {
                                common_js_3.DEBUG && console.log(`Add service binding to ec ${executionContextId}`);
                                await send("Runtime.addBinding", {
                                    name: BINDING_NAME,
                                    executionContextId
                                }, sessionId);
                            }
                            // add the service binding script 
                            // (to receive messages from API proxy and dispatch them to the binding)
                            common_js_3.DEBUG && console.log(`Add service binding script to ec ${executionContextId}`);
                            const { result, exceptionDetails } = await send("Runtime.evaluate", {
                                expression: SERVICE_BINDING_SCRIPT,
                                returnByValue: true,
                                executionContextId
                            }, sessionId);
                            common_js_3.DEBUG && console.log({ result, exceptionDetails });
                            // reload if needed
                            if (exceptionDetails) {
                                if (bindingRetryCount++ < MAX_BINDING_RETRY) {
                                    // reload the page 
                                    // (binding does not seem to be available to 
                                    // isolated script unless page is reloaded)
                                    await send("Page.reload", {}, sessionId);
                                }
                                else {
                                    reject(new Error(`Retries exceeded to add the binding to the page`));
                                }
                            }
                            else {
                                resolve({ browser, UI });
                            }
                        }
                    }
                    catch (e) {
                        common_js_3.DEBUG && console.info(`Error installing binding...`, e);
                    }
                });
                // reload to create a new document to 
                // ensure we add the script and request binding installation
                await send("Page.reload", {}, sessionId);
            }
            catch (e) {
                common_js_3.DEBUG && console.info(`Error install API proxy...`, e);
            }
        }
        return pr;
        // helper (in scope) functions
        function cleanSessionDirs() {
            common_js_3.DEBUG && console.info({ cleanSessionDirs: browserSessionId });
            if (!noDelete) {
                common_js_3.DEBUG && console.info({ deleteStart: { browserSessionId } });
                // try to delete  
                try {
                    fs_1.default.rmdirSync(common_js_3.sessionDir(browserSessionId), { recursive: true, maxRetries: 3, retryDelay: 700 });
                }
                catch (e) {
                    common_js_3.DEBUG && console.info(`Error deleting session folder...`, e);
                }
                // if it did not delete yet schedule for later
                if (fs_1.default.existsSync(common_js_3.sessionDir(browserSessionId))) {
                    common_js_3.DEBUG && console.info({ deleteStart: { browserSessionId } });
                    try {
                        let expiredSessions = [];
                        try {
                            expiredSessions = JSON.parse(fs_1.default.readFileSync(common_js_3.expiredSessionFile()).toString());
                        }
                        catch (e) {
                            common_js_3.DEBUG && console.info(`Unable to read expired sessions file...`, e);
                        }
                        expiredSessions.push(browserSessionId);
                        const tmp = '.new' + Math.random();
                        fs_1.default.writeFileSync(path_2.default.resolve(common_js_3.expiredSessionFile() + tmp), JSON.stringify(expiredSessions));
                        fs_1.default.renameSync(path_2.default.resolve(common_js_3.expiredSessionFile() + tmp), common_js_3.expiredSessionFile());
                        common_js_3.DEBUG && console.info({ expiredSessionsToDeleteLater: expiredSessions });
                    }
                    catch (e) {
                        common_js_3.DEBUG && console.info(`Error scheduling session data for deletion...`, e);
                    }
                }
            }
            else {
                common_js_3.DEBUG && console.info({ noDelete: SessionId });
            }
        }
    }
    exports_4("newBrowser", newBrowser);
    async function start({ app, desiredPort, addHandlers: addHandlers = null, noStandard: noStandard = false, server: server = null }) {
        let service;
        // setting reject here keeps typescript checks happy
        let upAt, resolve, reject = (e = null) => {
            console.warn(new TypeError(`Reject was not set. ${e}`));
        };
        const pr = new Promise((res, rej) => (resolve = res, reject = rej));
        let port = desiredPort;
        if (server) {
            service = server;
            service.listen(Number(port), async (err) => {
                if (PORT_DEBUG || err) {
                    console.warn(err);
                    return reject(err);
                }
                upAt = new Date;
                common_js_3.say({ serviceUp: { upAt, port } });
                resolve({ service, upAt, port });
                console.log(`Ready`);
            });
        }
        else {
            if (!noStandard) {
                addStandardHandlers(app);
            }
            common_js_3.DEBUG && console.log({ startService: port });
            if (addHandlers) {
                try {
                    addHandlers(app);
                }
                catch (e) {
                    console.info(`Error adding handlers to app`, app, addHandlers, e);
                    reject(new TypeError(`Supplied addHandlers function threw error: ${e}`));
                }
            }
            service = app.listen(Number(port), async (err) => {
                if (PORT_DEBUG || err) {
                    console.warn(err);
                    return reject(err);
                }
                upAt = new Date;
                common_js_3.say({ serviceUp: { upAt, port } });
                resolve({ service, upAt, port });
                console.log(`Ready`);
            });
        }
        service.on('error', async (err) => {
            await common_js_3.sleep(10);
            if (retryCount++ < MAX_RETRY) {
                console.log({ retry: { retryCount, badPort: port, DEBUG: common_js_3.DEBUG, err } });
                notify(`${port} taken. Trying new port...`);
                const subsequentTry = start({ app, desiredPort: randomPort() });
                subsequentTry.then(resolve).catch(reject);
            }
            else {
                reject({ err, message: `Retries exceeded and: ${err || 'no further information'}` });
            }
            return;
        });
        return pr;
    }
    // helper functions
    /**
    function getPlatform() {
      const {platform: raw} = process;
  
      switch(raw) {
        case "aix":
        case "freebsd":
        case "linux":
        case "openbsd":
        case "sunos":
          return "nix";
        case "win32":
          return "win";
        case "darwin":
          return "osx";
        default:
          // don't go crazy throwing errors here
          return "win";
      }
    }
    **/
    function randomPort() {
        // choose a port form the dynamic/private range: 49152 - 65535
        return 49152 + Math.round(Math.random() * (65535 - 49152));
    }
    // safe notify handles any IPC channel closed error and ensure it is not thrown 
    function safe_notify(msg) {
        if (process.send) {
            return process.send(msg, null, {}, e => {
                if (e) {
                    common_js_3.say({ processSend: msg });
                }
            });
        }
        else {
            common_js_3.say({ processSend: msg });
            return false;
        }
    }
    function notify(msg) {
        if (process.send) {
            process.send(msg);
        }
        else {
            common_js_3.say({ processSend: msg });
        }
    }
    function addStandardHandlers(app) {
        app.use(express_1.default.urlencoded({ extended: true }));
        app.use(express_1.default.static(SITE_PATH));
    }
    function installCleanupHandlers({ ui, bg }) {
        // someone closed the browser window
        let count = 0;
        const killService = async (...args) => {
            count++;
            common_js_3.DEBUG2 && console.info({ killService: 1, count, args });
            try {
                common_js_3.DEBUG2 && console.info({ killService: 2, count });
                await index_js_2.default.ui.close(ui);
                common_js_3.DEBUG2 && console.info({ killService: 3, count });
            }
            catch (e) {
                common_js_3.DEBUG2 && console.info(`Error shutting down the browser...`, e);
            }
            try {
                common_js_3.DEBUG2 && console.info({ killService: 4, count });
                if (bg.listening) {
                    common_js_3.DEBUG2 && console.info({ killService: 5, count });
                    await stop(bg);
                    common_js_3.DEBUG2 && console.info({ killService: 6, count });
                }
                else {
                    common_js_3.DEBUG2 && console.info({ killService: 7, count });
                    common_js_3.say({ killService: 'already closed' });
                    common_js_3.DEBUG2 && console.info({ killService: 8, count });
                }
            }
            catch (e) {
                common_js_3.DEBUG2 && console.info(`Error shutting down the service...`, e);
            }
            common_js_3.DEBUG2 && console.info({ killService: 9, count });
            process.exit(0);
        };
        ui.socket.on('close', () => ui.disconnected = true);
        ui.socket.on('close', killService);
        // process cleanliness 
        process.on('beforeExit', killService);
        // do we need to ignore these?
        process.on('SIGBREAK', killService);
        process.on('SIGHUP', killService);
        process.on('SIGINT', killService);
        process.on('SIGTERM', killService);
        process.on('SIGQUIT', killService);
        process.on('error', async (...args) => {
            console.log("Process error ", args);
            await killService();
        });
        return killService;
    }
    async function stop(bg) {
        const serviceTerminator = http_terminator_1.createHttpTerminator({
            server: bg,
            gracefulTerminationTimeout: 1000
        });
        common_js_3.say({ service: `Closing service...` });
        await serviceTerminator.terminate();
        common_js_3.say({ service: 'Closed' });
    }
    return {
        setters: [
            function (fs_1_1) {
                fs_1 = fs_1_1;
            },
            function (path_2_1) {
                path_2 = path_2_1;
            },
            function (express_1_1) {
                express_1 = express_1_1;
            },
            function (http_terminator_1_1) {
                http_terminator_1 = http_terminator_1_1;
            },
            function (chrome_launcher_js_1_1) {
                chrome_launcher_js_1 = chrome_launcher_js_1_1;
            },
            function (browser_installer_1_1) {
                browser_installer_1 = browser_installer_1_1;
            },
            function (index_js_2_1) {
                index_js_2 = index_js_2_1;
            },
            function (config_js_3_1) {
                config_js_3 = config_js_3_1;
            },
            function (common_js_3_1) {
                common_js_3 = common_js_3_1;
            },
            function (protocol_js_1_1) {
                protocol_js_1 = protocol_js_1_1;
            },
            function (api_bridge_js_1_1) {
                api_bridge_js_1 = api_bridge_js_1_1;
            }
        ],
        execute: function () {
            // constants
            PORT_DEBUG = false;
            MAX_RETRY = 10;
            MAX_BINDING_RETRY = 10;
            exports_4("SITE_PATH", SITE_PATH = path_2.default.resolve(__dirname, 'public'));
            common_js_3.DEBUG && console.log({ SITE_PATH });
            exports_4("newSessionId", newSessionId = () => (Math.random() * 1137).toString(36));
            SessionId = newSessionId();
            BINDING_NAME = "_graderService";
            JS_CONTEXT_NAME = "GraderWorld";
            API_PROXY_SCRIPT = fs_1.default.readFileSync(path_2.default.resolve(common_js_3.appDir(), 'app', 'ui_inject', 'proxy.js')).toString();
            SERVICE_BINDING_SCRIPT = fs_1.default.readFileSync(path_2.default.resolve(common_js_3.appDir(), 'app', 'ui_inject', 'binding.js')).toString();
            // global variables 
            retryCount = 0;
            // ideas - old code
            // filling a 'blank' page with content without using a server 
            /**
              // this doesn't work as expected
        
              // first start browser and open to blank page
              // after the page is ready,
              // use our UI connection to write the correct window box as the page
        
                // get top frame
                  const {frameTree: {frame: {id: frameId}}} = await UI.send(
                    "Page.getFrameTree", {}, UI.sessionId
                  );
        
                // write document
                  const html = fs.readFileSync(windowBoxPath).toString();
                  console.log({html, frameId});
                  const result = await UI.send("Page.setDocumentContent", {
                    frameId,
                    html
                  }, UI.sessionId);
                  console.log({result});
            **/
        }
    };
});
System.register("index", ["path", "fs", "service", "lib/common", "config"], function (exports_5, context_5) {
    "use strict";
    var path_3, fs_2, Service, Common, config_js_4, callId, sleep, DEBUG, DEBUG2, KV, HasListeners, API, App;
    var __moduleName = context_5 && context_5.id;
    // basic functions
    async function go({ apiInUI: apiInUI = false, addHandlers: addHandlers = undefined, // callback to add the route handlers to an express app
    server: server = true, // used to disable or replace default server 
    // if you don't want a server or if you need 
    // more control (such as websockets, or TLS)
    // we call listen automatically
    keepConsoleOpen: keepConsoleOpen = false, // keeps the console open in case you need it
    doLayout: doLayout = false // control window layout on screen
    // true for auto mode or a function 
    // signature: ({screenWidth, screenHeight}) => 
    // {screenWidth, screenHeight, x, y, width, height}
     } = {}) {
        App = await Service.go({
            apiInUI, addHandlers, server, keepConsoleOpen, doLayout
        });
        return App;
    }
    async function stop() {
        if (!App) {
            throw new TypeError(`API.stop can only be called if App has started and is not already stopped.`);
        }
        await App.killService();
    }
    function say(msg) {
        return App.notify(msg, null, {}, e => {
            DEBUG && console.info("say.App.notify", e);
            throw new TypeError(`Cannot API.say a console message because App Console has already closed.`);
        });
    }
    // meta functions
    async function publishAPI(apiRoot, slotName) {
        // apiRoot is an object with properties that enumerate all the functions of that API
        // e.g. if your API is "sendEmail", "checkReplies", your apiRoot is
        // {sendEmail, checkReplies}
        // you can overwrite built-in APIs (like uitl, ui, control and window)
        // but we throw if you try to overwrite those APIs you publish
        Object.defineProperty(API, slotName, {
            get: () => apiRoot,
            set() {
                throw new TypeError(`API slot ${slotName} is already present and cannot be overwritten.`);
            }
        });
    }
    // window functions
    async function open(settings) {
        const { ServicePort } = App;
        const sessionId = App.newSessionId();
        // do layout prep if requrested
        let layout;
        if (settings.doLayout) {
            const { screenWidth, screenHeight } = await getScreen({
                ServicePort,
                sessionId
            });
            layout = { screenWidth, screenHeight };
            if (typeof settings.doLayout === "function") {
                layout = settings.doLayout(layout);
            }
        }
        fs_2.default.writeFileSync('grader.open.log', JSON.stringify({ ServicePort, sessionId }));
        let browser, UI;
        try {
            ({ UI, browser } = await Service.newBrowser({ ServicePort, sessionId, layout }));
        }
        catch (e) {
            console.log("open.newBrowser", e);
            fs_2.default.writeFileSync('grader.error', JSON.stringify({ err: e, msg: e + '' }));
        }
        // don't expose socket
        UI.socket = null;
        return { UI, browser };
    }
    async function close(UI = App.UI) {
        const call = callId();
        const { browserSessionId, id } = UI;
        DEBUG2 && console.info({ browserSessionId, id, call, close: 1 });
        const errors = [];
        if (!UI.disconnected) {
            try {
                DEBUG2 && console.info({ browserSessionId, id, call, close: 2 });
                await UI.send("Browser.close", {});
                DEBUG2 && console.info({ browserSessionId, id, call, close: 3 });
            }
            catch (e) {
                DEBUG2 && console.info('Error closing browser', e);
                errors.push({ msg: 'error closing browser', e });
            }
            try {
                DEBUG2 && console.info({ browserSessionId, id, call, close: 4 });
                UI.disconnect();
                DEBUG2 && console.info({ browserSessionId, id, call, close: 5 });
            }
            catch (e) {
                DEBUG2 && console.info(`Error disconnecting socket`, e);
                errors.push({ msg: 'error disconnecting socket', e });
            }
        }
        try {
            await UI.browser.kill();
        }
        catch (e) {
            DEBUG2 && console.info(`Error kill browser`, e);
            errors.push({ msg: 'error kill browser', e });
        }
        try {
            DEBUG2 && console.info({ browserSessionId, id, call, close: 6 });
            UI.cleanSessionDirs();
            DEBUG2 && console.info({ browserSessionId, id, call, close: 7 });
        }
        catch (e) {
            DEBUG2 && console.info(`Error shut down browser.`, e);
            errors.push({ msg: 'error UI.cleanSessionDirs', e });
        }
        DEBUG2 && console.info({ browserSessionId, id, call, close: 8 });
        if (errors.length) {
            DEBUG2 && console.log(`API.ui.close`, errors);
            return { status: 'fail', errors };
        }
        else {
            DEBUG2 && console.log(`API.ui.close`, 'success');
            return { status: 'success' };
        }
    }
    async function move({ x, y }, UI = App.UI) {
        UI.x = x;
        UI.y = y;
        return await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                left: x,
                top: y
            }
        });
    }
    async function size({ width, height }, UI = App.UI) {
        /*
        await UI.send("Emulation.setDeviceMetricsOverride", {
          mobile: false,
          width,
          height,
          deviceScaleFactor: 1,
          screenOrientation: {
            angle: 0,
            type: 'portraitPrimary'
          },
        });
        */
        await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                windowState: 'normal',
                width: 0,
                height: 0
            }
        });
        const result = await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                windowState: 'normal',
                width,
                height
            }
        });
        UI.width = width;
        UI.height = height;
        return result;
    }
    async function minimize(UI = App.UI) {
        const { windowState } = await getLayout();
        if (windowState == 'minimized')
            return;
        const result = await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                windowState: 'minimized'
            }
        });
        return result;
    }
    async function restore(UI = App.UI) {
        const { windowState } = await getLayout();
        let result;
        if (windowState == 'maximized') {
            result = await UI.send("Browser.setWindowBounds", {
                windowId: UI.windowId,
                bounds: {
                    windowState: 'normal'
                }
            });
        }
        else {
            result = await UI.send("Browser.setWindowBounds", {
                windowId: UI.windowId,
                bounds: {
                    windowState: 'maximized'
                }
            });
        }
        return result;
    }
    async function maximize(UI = App.UI) {
        const { windowState } = await getLayout();
        if (windowState == 'minimized') {
            await partscreen(UI);
        }
        const result = await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                windowState: 'maximized'
            }
        });
        return result;
    }
    async function fullscreen(UI = App.UI) {
        const { windowState } = await getLayout();
        if (windowState == 'minimized') {
            await partscreen(UI);
        }
        const result = await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                windowState: 'fullscreen'
            }
        });
        return result;
    }
    async function partscreen(UI = App.UI) {
        const { windowState } = await getLayout();
        if (windowState == 'normal')
            return;
        const result = await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                windowState: 'normal'
            }
        });
        return result;
    }
    async function getLayout(UI = App.UI) {
        const { bounds } = await UI.send("Browser.getWindowBounds", {
            windowId: UI.windowId
        });
        return bounds;
    }
    // window functions part ii
    async function openBlank() {
    }
    async function writePage() {
    }
    async function getStartURL(UI = App.UI) {
        return UI.startUrl;
    }
    async function getFavicon() {
        const iconPath = path_3.default.resolve(Service.SITE_PATH, '_icons', 'favicon.ico');
        const base64Icon = fs_2.default.readFileSync(iconPath, { encoding: 'base64' });
        const dataURL = `data:image/ico;base64,${base64Icon}`;
        return dataURL;
    }
    async function getTitle() {
        return config_js_4.default.name;
    }
    // window functions part iii
    async function getScreen({ ServicePort, sessionId }) {
        let screen = load('screen');
        if (!screen) {
            // open a headless browser to a page that sends us the screen details
            let UI;
            try {
                ({ UI } = await Service.newBrowser({
                    silent: true,
                    headless: true,
                    uriPath: '/_api/getscreen.html',
                    ServicePort,
                    sessionId,
                    noDelete: true
                }));
            }
            catch (e) {
                console.log("getScreen.newBrowser", e);
                fs_2.default.writeFileSync('grader.error', JSON.stringify({ err: e, msg: e + '' }));
            }
            // wait until the key is set
            await hasKey('screen');
            // kill the browser __ it has served its purpose, honorably and nobly
            await close(UI);
            screen = load('screen');
        }
        console.log({ screen });
        return screen;
    }
    // control functions
    async function send(command, params, UI = App.UI) {
        return await UI.send(command, params);
    }
    async function on(eventName, handler, UI = App.UI) {
        return await UI.on(eventName, handler);
    }
    function off() {
        throw new TypeError(`off is not implemented yet...`);
    }
    // util part i: KV functions (keys are strings)
    function save(key, value) {
        DEBUG && console.log({ save: { key, value } });
        key += '';
        if (typeof value == "object") {
            // do a pseudo merge
            let newValue;
            if (Array.isArray(value)) {
                const existing = KV[key] || [];
                if (Array.isArray(existing)) {
                    newValue = [...existing, ...value];
                }
                else if (typeof existing == "object") {
                    value.forEach((v, i) => {
                        existing[i] = v;
                    });
                    newValue = existing;
                }
                else {
                    newValue = value;
                }
            }
            else {
                const existing = KV[key] || {};
                newValue = Object.assign(existing, value);
            }
            KV[key] = newValue;
        }
        else {
            KV[key] = value;
        }
        // run any listeners waiting for this key to be set
        let listeners = HasListeners.get(key);
        if (listeners) {
            HasListeners.delete(key);
            listeners.forEach(res => {
                // execute each without a stack
                setTimeout(() => res(true), 0);
            });
        }
    }
    function load(key) {
        key += '';
        return KV[key];
    }
    function del(key) {
        key += '';
        delete KV[key];
    }
    // returns a promise that resolves to true when the key is set
    async function hasKey(key) {
        key += '';
        let resolve = x => Common.delayThrow(`Resolve not set: ` + x);
        const pr = new Promise(res => resolve = res);
        let hasKey = false;
        hasKey = Object.prototype.hasOwnProperty.call(KV, key);
        if (hasKey) {
            return resolve(true);
        }
        else {
            let listeners = HasListeners.get(key);
            if (!listeners) {
                listeners = [];
                HasListeners.set(key, listeners);
            }
            // these listeners will be called by save once key is set
            listeners.push(resolve);
        }
        return pr;
    }
    return {
        setters: [
            function (path_3_1) {
                path_3 = path_3_1;
            },
            function (fs_2_1) {
                fs_2 = fs_2_1;
            },
            function (Service_1) {
                Service = Service_1;
            },
            function (Common_1) {
                Common = Common_1;
            },
            function (config_js_4_1) {
                config_js_4 = config_js_4_1;
            }
        ],
        execute: function () {
            // constants
            callId = () => (99999 * Math.random() + Date.now()).toString(36);
            sleep = Common.sleep, DEBUG = Common.DEBUG, DEBUG2 = Common.DEBUG2;
            // simple key value store
            KV = {};
            HasListeners = new Map();
            // main export
            API = {
                go,
                stop,
                say,
                ui: {
                    open,
                    close,
                    move,
                    size,
                    minimize,
                    maximize,
                    restore,
                    fullscreen,
                    partscreen,
                    getLayout,
                    openBlank,
                    writePage,
                    // iframe document inside that
                    getScreen,
                },
                meta: {
                    publishAPI,
                    getStartURL,
                    getFavicon,
                    getTitle,
                },
                control: {
                    send,
                    on,
                    off,
                },
                util: {
                    sleep,
                    kv: save,
                    k: load,
                    d: del
                },
            };
            exports_5("default", API);
        }
    };
});
System.register("demos", ["index"], function (exports_6, context_6) {
    "use strict";
    var index_js_3;
    var __moduleName = context_6 && context_6.id;
    async function openDemo() {
        return await index_js_3.default.go({ doLayout: true });
    }
    exports_6("openDemo", openDemo);
    async function windowDemo() {
        const app = await index_js_3.default.go({ doLayout: true });
        console.log({ OK: 1 });
        await index_js_3.default.util.sleep(3000);
        console.log({ OK: 2 });
        const { UI: UI2 } = await index_js_3.default.ui.open({ doLayout: true });
        console.log({ OK: 3 });
        await index_js_3.default.util.sleep(3000);
        await index_js_3.default.ui.close(UI2);
        await index_js_3.default.util.sleep(2000);
        await index_js_3.default.ui.minimize();
        await index_js_3.default.util.sleep(2000);
        await index_js_3.default.ui.maximize();
        await index_js_3.default.util.sleep(2000);
        await index_js_3.default.ui.fullscreen();
        await index_js_3.default.util.sleep(2000);
        await index_js_3.default.ui.partscreen();
        await index_js_3.default.util.sleep(2000);
        await index_js_3.default.ui.size({ width: 200, height: 100 });
        await index_js_3.default.util.sleep(2000);
        await index_js_3.default.ui.move({ x: 300, y: 200 });
        await index_js_3.default.util.sleep(2000);
        await index_js_3.default.ui.size({ width: 400, height: 300 });
        await index_js_3.default.util.sleep(2000);
        await index_js_3.default.ui.move({ x: 600, y: 400 });
        await index_js_3.default.util.sleep(2000);
        await index_js_3.default.ui.move({ x: 50, y: 300 });
        await index_js_3.default.util.sleep(2000);
        await index_js_3.default.ui.size({ width: 200, height: 100 });
        return app;
    }
    exports_6("windowDemo", windowDemo);
    return {
        setters: [
            function (index_js_3_1) {
                index_js_3 = index_js_3_1;
            }
        ],
        execute: function () {
        }
    };
});
System.register("app", ["index", "demos", "lib/common"], function (exports_7, context_7) {
    "use strict";
    var index_js_4, demos_js_1, common_js_4;
    var __moduleName = context_7 && context_7.id;
    async function start() {
        const app1 = await demos_js_1.openDemo();
        await common_js_4.sleep(2000);
        index_js_4.default.ui.close(app1.UI);
        const app2 = await demos_js_1.windowDemo();
        await common_js_4.sleep(2000);
        index_js_4.default.ui.close(app2.UI);
    }
    return {
        setters: [
            function (index_js_4_1) {
                index_js_4 = index_js_4_1;
            },
            function (demos_js_1_1) {
                demos_js_1 = demos_js_1_1;
            },
            function (common_js_4_1) {
                common_js_4 = common_js_4_1;
            }
        ],
        execute: function () {
            start();
        }
    };
});
System.register("launcher", ["fs", "path", "child_process", "adm-zip", "lib/vendor/chrome-launcher", "browser-installer", "lib/common"], function (exports_8, context_8) {
    "use strict";
    var fs_3, path_4, child_process_1, adm_zip_1, chrome_launcher_js_2, browser_installer_2, common_js_5;
    var __moduleName = context_8 && context_8.id;
    async function launchApp() {
        console.log('App launcher started.');
        // setup a promise to track a part of the setup
        let state = 'pending';
        let resolve, reject;
        const pr = new Promise((res, rej) => (resolve = res, reject = rej));
        pr.then(() => state = 'complete').catch(() => state = 'rejected');
        let appBundle, subprocess = {}, message = '';
        let preserveConsole = false;
        // setup future cleanup
        const killService = (e) => {
            subprocess.kill();
            console.log('');
            common_js_5.say({ exitTrigger: e });
            return process.exit(1);
        };
        process.on('SIGINT', killService);
        process.on('SIGQUIT', killService);
        process.on('SIGTSTP', killService);
        process.on('SIGHUP', killService);
        process.on('error', killService);
        // retrieve the app from the virtual filesystem in the build
        const appPath = path_4.default.resolve(__dirname, '..', 'build', 'app.zip');
        try {
            appBundle = fs_3.default.readFileSync(appPath);
        }
        catch (e) {
            console.log('src build service error', e);
            return exit(1);
        }
        // ensure dependencies are met
        {
            let val;
            try {
                val = chrome_launcher_js_2.Launcher.getFirstInstallation();
            }
            catch (e) {
                common_js_5.DEBUG && console.info('Dependency check', e);
                console.log('Discovered upgrade opportunity.');
            }
            if (!val) {
                console.log(`Installing dependencies...`);
                await browser_installer_2.install();
                console.log('Done! Process upgraded.');
            }
        }
        try {
            // create the app directory
            console.log('Preparing app data directory.');
            const name = common_js_5.DEBUG ? path_4.default.resolve(common_js_5.appDir(), 'dev') : common_js_5.appDir();
            const zipName = path_4.default.resolve(name, 'app.zip');
            if (!fs_3.default.existsSync(name)) {
                fs_3.default.mkdirSync(name, { recursive: true });
            }
            if (fs_3.default.existsSync(zipName)) {
                fs_3.default.unlinkSync(zipName);
            }
            // unzip a fresh copy of app from binary every time
            console.log('Inflating app contents.');
            fs_3.default.writeFileSync(zipName, appBundle);
            const file = new adm_zip_1.default(zipName);
            file.extractAllTo(name, /*overwrite*/ true);
            // and delete the zip
            fs_3.default.unlinkSync(zipName);
            // wait for log stream
            let logResolve;
            const logPr = new Promise(res => logResolve = res);
            const log = fs_3.default.createWriteStream(common_js_5.logFile());
            log.on('open', () => logResolve());
            await logPr;
            // fork the app process
            console.log('App process requested.');
            const procName = path_4.default.resolve(name, 'app', 'service.js');
            subprocess = child_process_1.fork(procName, !common_js_5.DEBUG ?
                { stdio: [log, log, log, 'ipc'], detached: true }
                :
                    { stdio: 'inherit' });
            subprocess.on('error', (...args) => (console.log('err', args), reject(args)));
            subprocess.on('message', (...args) => {
                if (!args[0])
                    return;
                if (typeof args[0] == "string") {
                    message = args[0];
                }
                else {
                    if (args[0].keepConsoleOpen) {
                        preserveConsole = true;
                    }
                }
                process.stdout.write('\n' + message);
                resolve(args);
            });
            !common_js_5.DEBUG && subprocess.unref();
        }
        catch (e) {
            console.log('launch err', e);
            return exit(1);
        }
        console.log('App process created.');
        // keep this process spinning while we track startup progress
        const progress = [];
        while (subprocess.connected && !(typeof message == "string" && message.startsWith('App started.'))) {
            if (state == 'pending') {
                progress.push('');
                process.stdout.clearLine(0); // 0 is 'entire line'
                process.stdout.cursorTo(0);
                process.stdout.write(`Waiting for your system security checks: ${progress.join('.')}`);
            }
            await common_js_5.sleep(Math.round(Math.random() * 370));
        }
        console.log('');
        common_js_5.DEBUG && console.log({ message, state });
        // check for keepConsoleOpen
        if (preserveConsole) {
            process.stdin.resume();
            console.log('Persistent console created.');
        }
        // report the outcome
        if (typeof message == "string" && message.startsWith('App started.')) {
            const port = Number(message.split('.')[1].trim());
            console.log(`Service on port ${port}`);
            console.log(`Launcher completed successfully.`);
            return exit(0);
        }
        else {
            console.error('Error at', message);
            console.info('State', state, 'subprocess.connected', subprocess.connected);
            console.log('Launcher failed. Exiting in 5 seconds...');
            await common_js_5.sleep(5000);
            return exit(1);
        }
    }
    function exit(code) {
        console.log(`Exit status: ${code ? 'failure' : 'success'}`);
        if (common_js_5.DEBUG) {
            console.log(`DEBUG is on. Not exiting.`);
            process.stdin.resume();
        }
        else {
            console.log('Exiting...');
            common_js_5.sleep(500).then(() => process.exit(code));
        }
    }
    return {
        setters: [
            function (fs_3_1) {
                fs_3 = fs_3_1;
            },
            function (path_4_1) {
                path_4 = path_4_1;
            },
            function (child_process_1_1) {
                child_process_1 = child_process_1_1;
            },
            function (adm_zip_1_1) {
                adm_zip_1 = adm_zip_1_1;
            },
            function (chrome_launcher_js_2_1) {
                chrome_launcher_js_2 = chrome_launcher_js_2_1;
            },
            function (browser_installer_2_1) {
                browser_installer_2 = browser_installer_2_1;
            },
            function (common_js_5_1) {
                common_js_5 = common_js_5_1;
            }
        ],
        execute: function () {
            launchApp();
        }
    };
});
const path = require('path');
const CONFIG = require('./config.js');
module.exports = {
    entry: CONFIG.entry || "./app.js",
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: "service.js"
    },
    /*
    optimization: {
      minimize: false
    },
    */
    target: "node",
    node: {
        __dirname: false
    },
};
System.register("lib/args", ["os", "path", "fs", "lib/common"], function (exports_9, context_9) {
    "use strict";
    var os_2, path_5, fs_4, common_js_6, DSP, service_port, Pref, pref_file, BasePath, args;
    var __moduleName = context_9 && context_9.id;
    function updateBasePath(new_base_path) {
        new_base_path = path_5.default.resolve(new_base_path);
        if (BasePath == new_base_path) {
            return false;
        }
        console.log(`Updating base path from ${BasePath} to ${new_base_path}...`);
        BasePath = new_base_path;
        console.log(`Base path updated to: ${BasePath}. Saving to preferences...`);
        Pref.BasePath = BasePath;
        savePref();
        console.log(`Saved!`);
        return true;
    }
    function getBasePath() {
        return BasePath;
    }
    function loadPref() {
        if (fs_4.default.existsSync(pref_file)) {
            try {
                Object.assign(Pref, JSON.parse(fs_4.default.readFileSync(pref_file).toString('utf-8')));
            }
            catch (e) {
                common_js_6.DEBUG && console.warn("Error reading from preferences file", e);
            }
        }
        else {
            console.log("Preferences file does not exist. Creating one...");
            savePref();
        }
    }
    function savePref() {
        try {
            fs_4.default.writeFileSync(pref_file, JSON.stringify(Pref));
        }
        catch (e) {
            common_js_6.DEBUG && console.warn("Error writing preferences file", pref_file, Pref, e);
        }
    }
    return {
        setters: [
            function (os_2_1) {
                os_2 = os_2_1;
            },
            function (path_5_1) {
                path_5 = path_5_1;
            },
            function (fs_4_1) {
                fs_4 = fs_4_1;
            },
            function (common_js_6_1) {
                common_js_6 = common_js_6_1;
            }
        ],
        execute: function () {
            DSP = 22121;
            exports_9("service_port", service_port = process.env.PORT || process.argv[2] || DSP);
            Pref = {};
            pref_file = path_5.default.resolve(os_2.default.homedir(), '.grader', 'config.js');
            loadPref();
            BasePath = Pref.BasePath;
            updateBasePath(process.argv[5] || Pref.BasePath || os_2.default.homedir());
            args = {
                service_port,
                updateBasePath,
                getBasePath,
            };
            exports_9("default", args);
        }
    };
});
(function () {
    const DEBUG = false;
    /* eslint-disable no-undef */
    // if binding not present yet following line will throw 
    // (which we want as it lets us know if binding is present!)
    const attachResult = { bindingAttached: !!_graderService };
    /* eslint-enable no-undef */
    globalThis.top.addEventListener('message', async ({ origin, data }) => {
        DEBUG && console.log(`Binding context received...`, origin, data);
        const { id, apiProxy } = data;
        if (apiProxy && id) {
            globalThis.top._graderService(JSON.stringify({ origin, apiProxy, id }));
        }
        else {
            DEBUG && console.info(`No apiProxy and id properties, so not a binding context message`, data);
        }
    });
    // add the reverse binding so the service can communicate to the UI
    // this will be called from service using Runtime.evaluate
    Object.defineProperty(globalThis, '_graderUI', {
        value: msg => {
            const { result, id } = msg;
            if (!result) {
                DEBUG && console.info(`Isolated world _graderUI received invalid result object`, msg);
                throw new TypeError(`Isolated world _graderUI received invalid result object`);
            }
            globalThis.top.postMessage({ result, id }, "*");
            return true;
        }
    });
    globalThis.top.postMessage("binding ready", "*");
    return attachResult;
}());
{
    const DEBUG = false;
    const GRADER_API_SLOT = 'grader';
    const SLOT_DESCRIPTOR = Object.create(null);
    const $ = Symbol.for(`[[GraderProxyHandlerPrivates]]`);
    const AwaitingPromises = new Map();
    const Target = async () => await void 0;
    let ID = 1;
    let readyRes;
    let ServiceIsReady = new Promise(res => readyRes = res);
    let GraderProxy, HandlerInstance, revoke;
    let ready = false;
    if (globalThis.self == globalThis.top) {
        // we should probably do security checks on origin
        globalThis.top.addEventListener('message', ({ origin, data }) => {
            if (data == "binding ready") {
                ready = true;
                DEBUG && console.log("API Proxy notified that service binding is ready", origin);
                readyRes(true);
            }
            else if (data == "turnOff") {
                ready = false;
                turnOff();
            }
            else if (typeof data == "object") {
                if (data.apiProxy)
                    return;
                if (!(data.id && data.result))
                    return;
                try {
                    const { id, result } = data;
                    const key = id + '';
                    const { resolve, reject } = AwaitingPromises.get(key);
                    AwaitingPromises.delete(key);
                    if (!resolve) {
                        throw new TypeError(`No resolver for message ${key} with result ${result}`);
                    }
                    else {
                        if (result.error) {
                            reject(result.error);
                        }
                        else {
                            resolve(result.value);
                        }
                    }
                }
                catch (e) {
                    DEBUG && console.info(`Error when message received`, data, e);
                }
            }
        });
        // a way to communicate with service before we install binding
        console.log(JSON.stringify({
            graderRequestInstallBinding: true
        }));
    }
    class Handler {
        constructor() {
            const Privates = Object.create(null);
            Privates.path = new Array();
            Object.defineProperty(this, $, {
                get: () => Privates
            });
        }
        apply(targ, thisArg, args) {
            const handler = this;
            guard('apply', handler, targ, GraderProxy);
            try {
                args = JSON.stringify(args);
            }
            catch (e) {
                DEBUG && console.warn(`apply.JSON.stringify error`, e);
                throw new TypeError(`Arguments need to be able to be serialized by JSON.stringify`);
            }
            if (thisArg !== GraderProxy) {
                throw new TypeError(`Do not rebind this when calling APIs using the ${GRADER_API_SLOT} proxy.`);
            }
            const path = Array.from(this[$].path);
            this[$].path.length = 0;
            return send({ path, args });
        }
        get(targ, prop, recv) {
            const handler = this;
            guard('get', handler, targ, recv);
            this[$].path.push(prop.toString());
            return recv;
        }
        // not possible 
        construct() {
            throw new TypeError(`Not constructible.`);
        }
        defineProperty() {
            throw new TypeError(`Not possible.`);
        }
        deleteProperty() {
            throw new TypeError(`Not possible.`);
        }
        getOwnPropertyDescriptor() {
            throw new TypeError(`Not possible.`);
        }
        getPrototypeOf() {
            throw new TypeError(`Not possible.`);
        }
        has() {
            throw new TypeError(`Not possible.`);
        }
        isExtensible() {
            throw new TypeError(`Not possible.`);
        }
        ownKeys() {
            throw new TypeError(`Not possible.`);
        }
        preventExtensions() {
            throw new TypeError(`Not possible.`);
        }
        set() {
            throw new TypeError(`Not possible.`);
        }
        setPrototypeOf() {
            throw new TypeError(`Not possible.`);
        }
    }
    HandlerInstance = new Handler;
    ({ proxy: GraderProxy, revoke } = Proxy.revocable(Target, HandlerInstance));
    SLOT_DESCRIPTOR.get = () => GraderProxy;
    Object.freeze(SLOT_DESCRIPTOR);
    Object.defineProperty(globalThis, GRADER_API_SLOT, SLOT_DESCRIPTOR);
    Object.defineProperty(globalThis, 'graderReady', {
        value: async () => ServiceIsReady
    });
    /* eslint-disable no-inner-declarations */
    function guard(source, handler, targ, recv) {
        if (handler !== HandlerInstance) {
            throw new TypeError(`${source}: this needs to be the HandlerInstance`);
        }
        if (targ !== Target) {
            throw new TypeError(`${source}: targ needs to be the Target`);
        }
        if (recv !== GraderProxy) {
            throw new TypeError(`${source}: recv needs to be the GraderProxy`);
        }
    }
    // send using binding added with Runtime.addBinding
    async function send(data) {
        let resolve, reject;
        const pr = new Promise((res, rej) => (resolve = res, reject = rej));
        if (!ready) {
            const error = TypeError(`Binding is not ready yet.`);
            reject(error);
        }
        else {
            DEBUG && console.log("Will send", data);
            const id = nextId();
            const key = id + '';
            AwaitingPromises.set(key, { resolve, reject });
            globalThis.top.postMessage({ id, apiProxy: data }, "*");
        }
        return pr;
    }
    // disable the binding
    function turnOff() {
        revoke();
    }
    function nextId() {
        return ID++;
    }
    /* eslint-enable no-inner-declarations */
}
