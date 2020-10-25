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
    }
};
// determine where this code is running 
System.register("lib/common", [], function (exports_1, context_1) {
    "use strict";
    var DEBUG, NO_SANDBOX, APP_ROOT, sleep;
    var __moduleName = context_1 && context_1.id;
    function say(o) {
        console.log(JSON.stringify(o));
    }
    exports_1("say", say);
    return {
        setters: [],
        execute: function () {// determine where this code is running 
            exports_1("DEBUG", DEBUG = process.env.DEBUG_grader || true);
            exports_1("NO_SANDBOX", NO_SANDBOX = process.env.DEBUG_grader || false);
            exports_1("APP_ROOT", APP_ROOT = __dirname);
            exports_1("sleep", sleep = ms => new Promise(res => setTimeout(res, ms)));
        }
    };
});
System.register("lib/protocol", ["node-fetch", "ws"], function (exports_2, context_2) {
    "use strict";
    var node_fetch_1, ws_1, ROOT_SESSION;
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
            process.exit(1);
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
            let resolve;
            const promise = new Promise(res => resolve = res);
            Resolvers[key] = resolve;
            socket.send(JSON.stringify(message));
            return promise;
        }
        async function handle(message) {
            const stringMessage = message;
            message = JSON.parse(message);
            if (message.error) {
                //console.warn(message);
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
            socket.close();
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
            }
        ],
        execute: function () {
            ROOT_SESSION = "browser";
        }
    };
});
System.register("service", ["fs", "os", "path", "express", "chrome-launcher", "http-terminator", "config", "lib/common", "lib/protocol"], function (exports_3, context_3) {
    "use strict";
    var fs_1, os_1, path_1, express_1, chrome_launcher_1, http_terminator_1, config_js_1, common_js_1, protocol_js_1, PORT_DEBUG, MAX_RETRY, SITE_PATH, newSessionId, SessionId, appDir, expiredSessionFile, app_data_dir, temp_browser_cache, retryCount;
    var __moduleName = context_3 && context_3.id;
    // main executable block
    async function go() {
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
        if (common_js_1.DEBUG || process.argv[1].includes(`service_${config_js_1.default.name}`)) { // our startup cue
            notify('Request app start.');
            return await run(app);
        }
    }
    exports_3("go", go);
    // main functions
    async function run(app) {
        // start background service
        console.log(`Start service...`);
        notify('Request service start.');
        let service, ServicePort;
        try {
            ({ service, port: ServicePort } = await start({ app, desiredPort: config_js_1.default.desiredPort }));
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
            const expiredSessions = JSON.parse(fs_1.default.readFileSync(expiredSessionFile()).toString());
            expiredSessions.forEach(sessionId => {
                try {
                    fs_1.default.rmdirSync(appDir(sessionId), { recursive: true, maxRetries: 3, retryDelay: 700 });
                }
                catch (e) {
                    common_js_1.DEBUG && console.info(`Error deleting old sessions directory ${sessionId}...`, e);
                    undeletedOldSessions.push(sessionId);
                }
            });
        }
        catch (e) {
            common_js_1.DEBUG && console.info(`Error deleting sessions from expred sessions file...`, e);
        }
        fs_1.default.writeFileSync(expiredSessionFile(), JSON.stringify(undeletedOldSessions));
        // launch UI
        notify('Request user interface.');
        console.log(`Launching UI...`);
        let UI, browser;
        try {
            ({ UI, browser } = await newBrowser({ ServicePort, sessionId: SessionId }));
        }
        catch (e) {
            console.error(e);
            notify('Could not start UI (chrome). Because: ' + JSON.stringify(e));
            process.exit(1);
        }
        common_js_1.DEBUG && console.log({ browser, ChromeLaunch: chrome_launcher_1.launch });
        console.log(`Chrome started.`);
        notify('User interface created.');
        const killService = installCleanupHandlers({ ui: UI, bg: service, browser });
        notify && notify(`App started. ${ServicePort}`);
        process.disconnect && process.disconnect();
        return { app, killService, ServicePort, browser, service, UI, notify, newSessionId };
    }
    async function newBrowser({ ServicePort, sessionId, path: path = '/' }) {
        if (!sessionId || !ServicePort) {
            throw new TypeError(`newBrowser must be passed a unique sessionId and ServicePort`);
        }
        // set up disk space
        safe_notify('Request UI directories.');
        if (!fs_1.default.existsSync(temp_browser_cache(sessionId))) {
            console.log(`Temp browser cache directory does not exist. Creating...`);
            fs_1.default.mkdirSync(temp_browser_cache(sessionId), { recursive: true });
            console.log(`Created.`);
        }
        if (!fs_1.default.existsSync(app_data_dir(sessionId))) {
            console.log(`App data dir does not exist. Creating...`);
            fs_1.default.mkdirSync(app_data_dir(sessionId), { recursive: true });
            console.log(`Created.`);
        }
        safe_notify('UI data and cache directory created.');
        // start browser
        const CHROME_OPTS = !common_js_1.NO_SANDBOX ? [
            `--disable-breakpad`,
            `--metrics-recording-only`,
            `--new-window`,
            `--no-first-run`,
            `--app=http://localhost:${ServicePort}${path}`,
            '--restore-last-session',
            `--disk-cache-dir=${temp_browser_cache(sessionId)}`,
            `--aggressive-cache-discard`
        ] : [
            `--disable-breakpad`,
            `--metrics-recording-only`,
            `--new-window`,
            `--no-first-run`,
            `--app=http://localhost:${ServicePort}${path}`,
            '--restore-last-session',
            `--disk-cache-dir=${temp_browser_cache(sessionId)}`,
            `--aggressive-cache-discard`,
            '--no-sandbox'
        ];
        const LAUNCH_OPTS = {
            logLevel: 'verbose',
            chromeFlags: CHROME_OPTS,
            userDataDir: app_data_dir(sessionId),
            ignoreDefaultFlags: true,
        };
        common_js_1.DEBUG && console.log({ LAUNCH_OPTS });
        let browser;
        try {
            browser = await chrome_launcher_1.launch(LAUNCH_OPTS);
        }
        catch (e) {
            common_js_1.DEBUG && console.error(e);
            safe_notify('Could not start UI (chrome). Because: ' + JSON.stringify(e));
        }
        // connect to UI
        safe_notify('Request interface connection.');
        console.log(`Connecting to UI...`);
        console.log(browser);
        const UI = await protocol_js_1.default({ port: browser.port, exposeSocket: true });
        console.log(`Connected.`);
        safe_notify('User interface online.');
        // get windowId
        let windowId;
        try {
            const { targetInfos } = await UI.send("Target.getTargets", {});
            const appTarget = targetInfos.find(({ type, url }) => {
                return type == 'page' && url.startsWith(`http://localhost:${ServicePort}`);
            });
            ({ windowId } = await UI.send("Browser.getWindowForTarget", {
                targetId: appTarget.targetId
            }));
        }
        catch (e) {
            common_js_1.DEBUG && console.info(`Error getting window ID...`, e);
        }
        UI.windowId = windowId;
        browser.sessionId = sessionId;
        return { UI, browser };
    }
    exports_3("newBrowser", newBrowser);
    async function start({ app, desiredPort }) {
        let upAt, resolve, reject;
        const pr = new Promise((res, rej) => (resolve = res, reject = rej));
        let port = desiredPort;
        addHandlers(app);
        console.log({ DEBUG: common_js_1.DEBUG, port });
        const service = app.listen(Number(port), async (err) => {
            if (PORT_DEBUG || err) {
                console.warn(err);
                return reject(err);
            }
            upAt = new Date;
            common_js_1.say({ serviceUp: { upAt, port } });
            resolve({ service, upAt, port });
            console.log(`Ready`);
        });
        service.on('error', async (err) => {
            await common_js_1.sleep(10);
            if (retryCount++ < MAX_RETRY) {
                console.log({ retry: { retryCount, badPort: port, DEBUG: common_js_1.DEBUG, err } });
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
    function randomPort() {
        // choose a port form the dynamic/private range: 49152 - 65535
        return 49152 + Math.round(Math.random() * (65535 - 49152));
    }
    // safe notify handles any IPC channel closed error and ensure it is not thrown 
    function safe_notify(msg) {
        if (process.send) {
            return process.send(msg, null, {}, e => {
                if (e) {
                    common_js_1.say({ processSend: msg });
                }
            });
        }
        else {
            common_js_1.say({ processSend: msg });
            return false;
        }
    }
    function notify(msg) {
        if (process.send) {
            process.send(msg);
        }
        else {
            common_js_1.say({ processSend: msg });
        }
    }
    function addHandlers(app) {
        app.use(express_1.default.urlencoded({ extended: true }));
        app.use(express_1.default.static(SITE_PATH));
    }
    function installCleanupHandlers({ ui, bg, browser }) {
        // someone closed the browser window
        const killService = async () => {
            try {
                browser.kill();
            }
            catch (e) {
                common_js_1.DEBUG && console.info(`Could not kill browser...`, e);
            }
            if (bg.listening) {
                // try to delete  
                try {
                    fs_1.default.rmdirSync(appDir(SessionId), { recursive: true, maxRetries: 3, retryDelay: 700 });
                }
                catch (e) {
                    common_js_1.DEBUG && console.info(`Error deleting session folder...`, e);
                }
                // if it did not delete yet schedule for later
                if (fs_1.default.existsSync(appDir(SessionId))) {
                    try {
                        let expiredSessions = [];
                        try {
                            expiredSessions = JSON.parse(fs_1.default.readFileSync(expiredSessionFile()).toString());
                        }
                        catch (e) {
                            common_js_1.DEBUG && console.info(`Unable to read expired sessions file...`, e);
                        }
                        expiredSessions.push(SessionId);
                        fs_1.default.writeFileSync(expiredSessionFile(), JSON.stringify(expiredSessions));
                    }
                    catch (e) {
                        common_js_1.DEBUG && console.info(`Error scheduling session data for deletion...`, e);
                    }
                }
                await stop(bg);
            }
            else {
                common_js_1.say({ killService: 'already closed' });
            }
            process.exit(0);
        };
        ui.socket.on('close', killService);
        // process cleanliness 
        process.on('beforeExit', killService);
        process.on('SIGBREAK', killService);
        process.on('SIGHUP', killService);
        process.on('SIGINT', killService);
        process.on('SIGTERM', killService);
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
        common_js_1.say({ service: `Closing service...` });
        await serviceTerminator.terminate();
        common_js_1.say({ service: 'Closed' });
    }
    return {
        setters: [
            function (fs_1_1) {
                fs_1 = fs_1_1;
            },
            function (os_1_1) {
                os_1 = os_1_1;
            },
            function (path_1_1) {
                path_1 = path_1_1;
            },
            function (express_1_1) {
                express_1 = express_1_1;
            },
            function (chrome_launcher_1_1) {
                chrome_launcher_1 = chrome_launcher_1_1;
            },
            function (http_terminator_1_1) {
                http_terminator_1 = http_terminator_1_1;
            },
            function (config_js_1_1) {
                config_js_1 = config_js_1_1;
            },
            function (common_js_1_1) {
                common_js_1 = common_js_1_1;
            },
            function (protocol_js_1_1) {
                protocol_js_1 = protocol_js_1_1;
            }
        ],
        execute: function () {
            // constants
            PORT_DEBUG = false;
            MAX_RETRY = 10;
            SITE_PATH = path_1.default.resolve(__dirname, 'public');
            exports_3("newSessionId", newSessionId = () => (Math.random() * 1137).toString(36));
            SessionId = newSessionId();
            appDir = sessionId => common_js_1.DEBUG ?
                path_1.default.resolve(__dirname, '..', 'sessions', sessionId)
                :
                    path_1.default.resolve(os_1.default.homedir(), '.grader', 'appData', `${(config_js_1.default.organization || config_js_1.default.author).name}`, `service_${config_js_1.default.name}`, 'sessions', sessionId);
            expiredSessionFile = () => common_js_1.DEBUG ?
                path_1.default.resolve(__dirname, '..', 'old-sessions.json')
                :
                    path_1.default.resolve(os_1.default.homedir(), '.grader', 'appData', `${(config_js_1.default.organization || config_js_1.default.author).name}`, `service_${config_js_1.default.name}`, 'old-sessions.json');
            app_data_dir = sessionId => path_1.default.resolve(appDir(sessionId), `ui-data`);
            temp_browser_cache = sessionId => path_1.default.resolve(appDir(sessionId), `ui-cache`);
            console.log({ SITE_PATH });
            // global variables 
            retryCount = 0;
        }
    };
});
System.register("index", ["service", "lib/common"], function (exports_4, context_4) {
    "use strict";
    var Service, Common, API, App;
    var __moduleName = context_4 && context_4.id;
    // basic functions
    async function go() {
        App = await Service.go();
        //Common.DEBUG && console.log({App});
        return App;
    }
    async function stop() {
        if (!App) {
            throw new TypeError(`stop can only be called if App has started and is not already stopped.`);
        }
        await App.killService();
    }
    function say(msg) {
        return App.notify(msg, null, {}, e => {
            Common.DEBUG && console.info("say.App.notify", e);
            throw new TypeError(`Cannot say a console message because App Console has already closed.`);
        });
    }
    async function open() {
        const { ServicePort } = App;
        const sessionId = App.newSessionId();
        let browser, UI;
        try {
            ({ UI, browser } = await Service.newBrowser({ ServicePort, sessionId }));
        }
        catch (e) {
            console.log("open", e);
        }
        return { UI, browser };
    }
    async function close(UI = App.UI) {
        return await UI.send("Browser.close", {});
    }
    async function move({ x, y }, UI = App.UI) {
        return await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                left: x,
                top: y
            }
        });
    }
    async function size({ width, height }, UI = App.UI) {
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
        return await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                width,
                height: height + 85
            }
        });
    }
    async function minimize(UI = App.UI) {
        return await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                windowState: 'minimized'
            }
        });
    }
    async function maximize(UI = App.UI) {
        return await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                windowState: 'maximized'
            }
        });
    }
    async function fullscreen(UI = App.UI) {
        return await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                windowState: 'fullscreen'
            }
        });
    }
    async function partscreen(UI = App.UI) {
        return await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                windowState: 'normal'
            }
        });
    }
    function send() {
    }
    function on() {
    }
    function off() {
    }
    return {
        setters: [
            function (Service_1) {
                Service = Service_1;
            },
            function (Common_1) {
                Common = Common_1;
            }
        ],
        execute: function () {
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
                    fullscreen,
                    partscreen,
                },
                control: {
                    send,
                    on,
                    off,
                },
                util: {
                    sleep: Common.sleep
                }
            };
            exports_4("default", API);
        }
    };
});
System.register("app", ["index"], function (exports_5, context_5) {
    "use strict";
    var index_js_1;
    var __moduleName = context_5 && context_5.id;
    async function start() {
        await index_js_1.default.go();
        const { UI: UI2 } = await index_js_1.default.ui.open();
        await index_js_1.default.util.sleep(3000);
        await index_js_1.default.ui.close(UI2);
        await index_js_1.default.util.sleep(2000);
        await index_js_1.default.ui.maximize();
        await index_js_1.default.util.sleep(2000);
        await index_js_1.default.ui.maximize();
        await index_js_1.default.util.sleep(2000);
        await index_js_1.default.ui.fullscreen();
        await index_js_1.default.util.sleep(2000);
        await index_js_1.default.ui.partscreen();
        await index_js_1.default.util.sleep(2000);
        await index_js_1.default.ui.size({ width: 500, height: 400 });
        await index_js_1.default.util.sleep(2000);
        await index_js_1.default.ui.move({ x: 300, y: 200 });
    }
    return {
        setters: [
            function (index_js_1_1) {
                index_js_1 = index_js_1_1;
            }
        ],
        execute: function () {
            start();
        }
    };
});
