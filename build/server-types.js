System.register("config", [], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            exports_1("default", {
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
            });
        }
    };
});
// determine where this code is running 
System.register("lib/common", [], function (exports_2, context_2) {
    "use strict";
    var DEBUG, NO_SANDBOX, APP_ROOT, sleep;
    var __moduleName = context_2 && context_2.id;
    function say(o) {
        console.log(JSON.stringify(o));
    }
    exports_2("say", say);
    return {
        setters: [],
        execute: function () {// determine where this code is running 
            exports_2("DEBUG", DEBUG = process.env.DEBUG_grader || false);
            exports_2("NO_SANDBOX", NO_SANDBOX = process.env.DEBUG_grader || false);
            exports_2("APP_ROOT", APP_ROOT = __dirname);
            exports_2("sleep", sleep = ms => new Promise(res => setTimeout(res, ms)));
        }
    };
});
System.register("lib/protocol", ["node-fetch", "ws"], function (exports_3, context_3) {
    "use strict";
    var node_fetch_1, ws_1, ROOT_SESSION;
    var __moduleName = context_3 && context_3.id;
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
    exports_3("default", connect);
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
System.register("service", ["fs", "os", "path", "express", "chrome-launcher", "http-terminator", "config", "lib/common", "lib/protocol"], function (exports_4, context_4) {
    "use strict";
    var fs_1, os_1, path_1, express_1, chrome_launcher_1, http_terminator_1, config_js_1, common_js_1, protocol_js_1, PORT_DEBUG, MAX_RETRY, SITE_PATH, SessionId, appDir, expiredSessionFile, app_data_dir, temp_browser_cache, retryCount;
    var __moduleName = context_4 && context_4.id;
    // main executable block
    function go() {
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
            run(app);
        }
    }
    exports_4("go", go);
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
        // set up disk space
        notify('Request cache directory.');
        if (!fs_1.default.existsSync(temp_browser_cache())) {
            console.log(`Temp browser cache directory does not exist. Creating...`);
            fs_1.default.mkdirSync(temp_browser_cache(), { recursive: true });
            console.log(`Deleted.`);
        }
        if (!fs_1.default.existsSync(app_data_dir())) {
            console.log(`App data dir does not exist. Creating...`);
            fs_1.default.mkdirSync(app_data_dir(), { recursive: true });
            console.log(`Created.`);
        }
        notify('Cache directory created.');
        // launch UI
        notify('Request user interface.');
        console.log(`Launching UI...`);
        const CHROME_OPTS = !common_js_1.NO_SANDBOX ? [
            `--disable-breakpad`,
            `--metrics-recording-only`,
            `--new-window`,
            `--no-first-run`,
            `--app=http://localhost:${ServicePort}`,
            '--restore-last-session',
            `--disk-cache-dir=${temp_browser_cache()}`,
            `--aggressive-cache-discard`
        ] : [
            `--disable-breakpad`,
            `--metrics-recording-only`,
            `--new-window`,
            `--no-first-run`,
            `--app=http://localhost:${ServicePort}`,
            '--restore-last-session',
            `--disk-cache-dir=${temp_browser_cache()}`,
            `--aggressive-cache-discard`,
            '--no-sandbox'
        ];
        const LAUNCH_OPTS = {
            logLevel: 'verbose',
            chromeFlags: CHROME_OPTS,
            userDataDir: app_data_dir(),
            ignoreDefaultFlags: true
        };
        console.log({ LAUNCH_OPTS });
        let browser;
        try {
            browser = await chrome_launcher_1.launch(LAUNCH_OPTS);
        }
        catch (e) {
            console.error(e);
            notify('Could not start UI (chrome). Because: ' + JSON.stringify(e));
            process.exit(1);
        }
        console.log({ browser, ChromeLaunch: chrome_launcher_1.launch });
        console.log(`Chrome started.`);
        notify('User interface created.');
        // connect to UI
        notify('Request interface connection.');
        console.log(`Connecting to UI...`);
        console.log(browser);
        const UI = await protocol_js_1.default({ port: browser.port, exposeSocket: true });
        console.log(`Connected.`);
        notify('User interface online.');
        installCleanupHandlers({ ui: UI, bg: service });
        notify && notify(`App started. ${ServicePort}`);
        process.disconnect && process.disconnect();
    }
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
    function installCleanupHandlers({ ui, bg }) {
        // someone closed the browser window
        const killService = async () => {
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
            SessionId = (Math.random() * 1137).toString(36);
            appDir = sessionId => common_js_1.DEBUG ?
                path_1.default.resolve(__dirname, '..', 'sessions', sessionId)
                :
                    path_1.default.resolve(os_1.default.homedir(), '.grader', 'appData', `${(config_js_1.default.organization || config_js_1.default.author).name}`, `service_${config_js_1.default.name}`, 'sessions', sessionId);
            expiredSessionFile = () => common_js_1.DEBUG ?
                path_1.default.resolve(__dirname, '..', 'old-sessions.json')
                :
                    path_1.default.resolve(os_1.default.homedir(), '.grader', 'appData', `${(config_js_1.default.organization || config_js_1.default.author).name}`, `service_${config_js_1.default.name}`, 'old-sessions.json');
            app_data_dir = () => path_1.default.resolve(appDir(SessionId), `ui-data`);
            temp_browser_cache = () => path_1.default.resolve(appDir(SessionId), `ui-cache`);
            console.log({ SITE_PATH });
            // global variables 
            retryCount = 0;
        }
    };
});
System.register("index", ["service"], function (exports_5, context_5) {
    "use strict";
    var Service, API, App;
    var __moduleName = context_5 && context_5.id;
    function go() {
        App = Service.go();
        return App;
    }
    function stop() {
    }
    function say() {
    }
    function open() {
    }
    function close() {
    }
    function move() {
    }
    function size() {
    }
    function minimize() {
    }
    function maximize() {
    }
    function fullscreen() {
    }
    function partscreen() {
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
                }
            };
            exports_5("default", API);
        }
    };
});
System.register("app", ["index"], function (exports_6, context_6) {
    "use strict";
    var index_js_1;
    var __moduleName = context_6 && context_6.id;
    return {
        setters: [
            function (index_js_1_1) {
                index_js_1 = index_js_1_1;
            }
        ],
        execute: function () {
            index_js_1.default.go();
        }
    };
});
