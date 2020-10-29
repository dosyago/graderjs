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
    var os_1, path_1, config_js_1, DEBUG, NO_SANDBOX, APP_ROOT, appDir, expiredSessionFile, sessionDir, app_data_dir, temp_browser_cache, logFile, sleep;
    var __moduleName = context_1 && context_1.id;
    function say(o) {
        console.log(JSON.stringify(o));
    }
    exports_1("say", say);
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
            exports_1("DEBUG", DEBUG = process.env.DEBUG_grader || true);
            exports_1("NO_SANDBOX", NO_SANDBOX = process.env.DEBUG_grader || false);
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
        common_js_2.DEBUG && console.info('Bridge called', requestArgs, index_js_1.default);
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
            counter += 1;
            console.log({ counter, apiResult, time: Date.now() });
            return apiResult;
        }
        catch (e) {
            console.info(`API proxy could not complete request`, { origin, path, args }, e);
            throw new TypeError(`Error on API proxy request: ${e}`);
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
            throw new TypeError(`Path was undefined (at ${steps.slice(0, index).join('.')}) before reaching end of: ${steps.join('.')}`);
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
System.register("service", ["fs", "path", "express", "chrome-launcher", "http-terminator", "config", "lib/common", "lib/protocol", "lib/api_bridge"], function (exports_4, context_4) {
    "use strict";
    var fs_1, path_2, express_1, chrome_launcher_1, http_terminator_1, config_js_3, common_js_3, protocol_js_1, api_bridge_js_1, PORT_DEBUG, MAX_RETRY, MAX_BINDING_RETRY, SITE_PATH, newSessionId, SessionId, BINDING_NAME, JS_CONTEXT_NAME, API_PROXY_SCRIPT, SERVICE_BINDING_SCRIPT, bindingRetryCount, retryCount;
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
        // get platform specific window box (if any)
        const platform = getPlatform();
        const windowBox = settings.windowControls[platform];
        let windowBoxPath = null;
        // true specifies the default
        if (windowBox === true) {
            windowBoxPath = path_2.default.resolve(SITE_PATH, '_winctrlbar', `${platform}_winctrl.html`);
        }
        // a string sets a (possibly relative) path
        else if (typeof windowBox == "string") {
            windowBoxPath = path_2.default.resolve(windowBox);
        }
        // false means no window control box
        else if (windowBox === false) {
            windowBoxPath = null;
        }
        // otherwise we have an error
        else {
            throw new TypeError(`Settings windowControl[platform], if set, can only be a string or a boolean`);
        }
        common_js_3.DEBUG && console.log({ windowBoxPath });
        // start background service
        console.log(`Start service...`);
        notify('Request service start.');
        let service, ServicePort;
        try {
            ({ service, port: ServicePort } = await start({ app, desiredPort: config_js_3.default.desiredPort }));
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
        // launch UI
        notify('Request user interface.');
        console.log(`Launching UI...`);
        let UI, browser;
        try {
            if (windowBoxPath) {
                // open a blank window 
                ({ UI, browser } = await newBrowser({ blank: true, sessionId: SessionId }));
                // and after the page is ready,
                // use our UI connection to write the correct window box as the page
                // get top frame
                const { frameTree: { frame: { id: frameId } } } = await UI.send("Page.getFrameTree", {}, UI.sessionId);
                // write document
                const html = fs_1.default.readFileSync(windowBoxPath).toString();
                console.log({ html, frameId });
                const result = await UI.send("Page.setDocumentContent", {
                    frameId,
                    html
                }, UI.sessionId);
                console.log({ result });
            }
            else {
                ({ UI, browser } = await newBrowser({ ServicePort, sessionId: SessionId }));
            }
        }
        catch (e) {
            console.error(e);
            notify('Could not start UI (chrome). Because: ' + JSON.stringify(e));
            process.exit(1);
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
        return { app, killService, ServicePort, browser, service, UI, notify, newSessionId };
    }
    async function newBrowser({ sessionId, blank: blank = false, ServicePort: ServicePort = undefined, uriPath: uriPath = '/' } = { sessionId: undefined }) {
        if (!(sessionId && ((ServicePort || '').toString() || blank))) {
            throw new TypeError(`newBrowser must be passed a unique sessionId and either the 'blank' flag or a ServicePort`);
        }
        // set up a promise to track progress
        let reject, resolve, pr = new Promise((res, rej) => (resolve = res, reject = rej));
        // set up disk space
        safe_notify('Request UI directories.');
        if (!fs_1.default.existsSync(common_js_3.temp_browser_cache(sessionId))) {
            console.log(`Temp browser cache directory does not exist. Creating...`);
            fs_1.default.mkdirSync(common_js_3.temp_browser_cache(sessionId), { recursive: true });
            console.log(`Created.`);
        }
        if (!fs_1.default.existsSync(common_js_3.app_data_dir(sessionId))) {
            console.log(`App data dir does not exist. Creating...`);
            fs_1.default.mkdirSync(common_js_3.app_data_dir(sessionId), { recursive: true });
            console.log(`Created.`);
        }
        safe_notify('UI data and cache directory created.');
        // construct start URL
        let startUrl;
        if (blank) {
            startUrl = 'data:text/html,<!DOCTYPE html><script>document.title = "Made with Grader"</script>';
        }
        else {
            startUrl = `http://localhost:${ServicePort}${uriPath}`;
        }
        // start browser
        const CHROME_OPTS = !common_js_3.NO_SANDBOX ? [
            `--disable-extensions`,
            `--disable-breakpad`,
            `--metrics-recording-only`,
            `--new-window`,
            `--no-first-run`,
            `--app=${startUrl}`,
            '--restore-last-session',
            `--disk-cache-dir=${common_js_3.temp_browser_cache(sessionId)}`,
            `--aggressive-cache-discard`
        ] : [
            `--disable-extensions`,
            `--disable-breakpad`,
            `--metrics-recording-only`,
            `--new-window`,
            `--no-first-run`,
            `--app=${startUrl}`,
            '--restore-last-session',
            `--disk-cache-dir=${common_js_3.temp_browser_cache(sessionId)}`,
            `--aggressive-cache-discard`,
            '--no-sandbox'
        ];
        const LAUNCH_OPTS = {
            logLevel: 'verbose',
            chromeFlags: CHROME_OPTS,
            userDataDir: common_js_3.app_data_dir(sessionId),
            ignoreDefaultFlags: true,
        };
        common_js_3.DEBUG && console.log({ LAUNCH_OPTS });
        let browser;
        try {
            browser = await chrome_launcher_1.launch(LAUNCH_OPTS);
        }
        catch (e) {
            common_js_3.DEBUG && console.error(e);
            fs_1.default.writeFileSync('browser.error', JSON.stringify({ err: e, msg: e + '', stack: e.stack }));
            safe_notify('Could not start UI (chrome). Because: ' + JSON.stringify(e));
        }
        // connect to UI
        let appTarget;
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
            common_js_3.DEBUG && console.info({ targetInfos, startUrl });
            appTarget = targetInfos.find(({ type, url }) => {
                return type == 'page' && url.startsWith(startUrl);
            });
            ({ windowId } = await UI.send("Browser.getWindowForTarget", {
                targetId: appTarget.targetId
            }));
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
            shutdown: {
                value: shutdownFunc
            }
        });
        Object.defineProperty(browser, 'sessionId', {
            value: sessionId
        });
        // shutdown everything if we detect the UI connection closes
        UI.socket.on('close', () => UI.shutdown());
        // install binding and script and reload
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
                common_js_3.DEBUG && console.info({ name, payload, executionContextId });
                await api_bridge_js_1.default({ name, payload, executionContextId });
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
                        console.log({ installBindingCalled: true });
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
        return pr;
        // helper (in scope) functions
        async function shutdownFunc() {
            if (UI.alreadyShutdown)
                return;
            UI.alreadyShutdown = true;
            // try to kill browser
            try {
                await browser.kill();
            }
            catch (e) {
                console.log(`Browser already dead...`, e);
            }
            // try to delete  
            try {
                fs_1.default.rmdirSync(common_js_3.sessionDir(sessionId), { recursive: true, maxRetries: 3, retryDelay: 700 });
            }
            catch (e) {
                common_js_3.DEBUG && console.info(`Error deleting session folder...`, e);
            }
            // if it did not delete yet schedule for later
            try {
                let expiredSessions = [];
                try {
                    expiredSessions = JSON.parse(fs_1.default.readFileSync(common_js_3.expiredSessionFile()).toString());
                }
                catch (e) {
                    common_js_3.DEBUG && console.info(`Unable to read expired sessions file...`, e);
                }
                expiredSessions.push(sessionId);
                const tmp = '.new' + Math.random();
                fs_1.default.writeFileSync(path_2.default.resolve(common_js_3.expiredSessionFile() + tmp), JSON.stringify(expiredSessions));
                fs_1.default.renameSync(path_2.default.resolve(common_js_3.expiredSessionFile() + tmp), common_js_3.expiredSessionFile());
            }
            catch (e) {
                common_js_3.DEBUG && console.info(`Error scheduling session data for deletion...`, e);
            }
        }
    }
    exports_4("newBrowser", newBrowser);
    async function start({ app, desiredPort }) {
        let upAt, resolve, reject;
        const pr = new Promise((res, rej) => (resolve = res, reject = rej));
        let port = desiredPort;
        addHandlers(app);
        console.log({ DEBUG: common_js_3.DEBUG, port });
        const service = app.listen(Number(port), async (err) => {
            if (PORT_DEBUG || err) {
                console.warn(err);
                return reject(err);
            }
            upAt = new Date;
            common_js_3.say({ serviceUp: { upAt, port } });
            resolve({ service, upAt, port });
            console.log(`Ready`);
        });
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
    function getPlatform() {
        const { platform: raw } = process;
        switch (raw) {
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
    function addHandlers(app) {
        app.use(express_1.default.urlencoded({ extended: true }));
        app.use(express_1.default.static(SITE_PATH));
    }
    function installCleanupHandlers({ ui, bg }) {
        // someone closed the browser window
        const killService = async () => {
            try {
                await ui.shutdown();
            }
            catch (e) {
                common_js_3.DEBUG && console.info(`Error shutting down the browser...`, e);
            }
            if (bg.listening) {
                await stop(bg);
            }
            else {
                common_js_3.say({ killService: 'already closed' });
            }
            process.exit(0);
        };
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
            function (chrome_launcher_1_1) {
                chrome_launcher_1 = chrome_launcher_1_1;
            },
            function (http_terminator_1_1) {
                http_terminator_1 = http_terminator_1_1;
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
            bindingRetryCount = 0;
            retryCount = 0;
        }
    };
});
System.register("index", ["path", "fs", "service", "lib/common", "config"], function (exports_5, context_5) {
    "use strict";
    var path_3, fs_2, Service, Common, config_js_4, DEFAULT_WC, API, App;
    var __moduleName = context_5 && context_5.id;
    // basic functions
    async function go({ apiInUI: apiInUI = false, windowControls: windowControls = undefined, addHandlers: addHandlers = undefined, // callback to add the route handlers to an express app
    server: server = true, // used to disable or replace default server 
    // if you don't want a server or if you need 
    // more control (such as websockets, or TLS)
    // we call listen automatically
    keepConsoleOpen: keepConsoleOpen = false, } = {}) {
        // default parameters
        // window controls
        if (windowControls === undefined) {
            windowControls = DEFAULT_WC;
        }
        else {
            if (windowControls === false) {
                windowControls = {
                    win: false,
                    nix: false,
                    osx: false
                };
            }
            else if (windowControls === true) {
                // win and osx are both false because they provide window controls by default
                windowControls = DEFAULT_WC;
            }
            else {
                // check if it's an object 
                let typeFailure = false;
                try {
                    JSON.stringify(windowControls);
                }
                catch (e) {
                    Common.DEBUG && console.info(e, { windowControls });
                    typeFailure = true;
                }
                if (typeFailure || typeof windowControls !== "object") {
                    throw new TypeError(`API.go: windowControls if set needs to be a boolean, or an object.`);
                }
            }
        }
        App = await Service.go({
            apiInUI, windowControls, addHandlers, server, keepConsoleOpen
        });
        API.ServicePort = App.ServicePort;
        //Common.DEBUG && console.log({App});
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
            Common.DEBUG && console.info("say.App.notify", e);
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
    async function open() {
        const { ServicePort } = App;
        const sessionId = App.newSessionId();
        fs_2.default.writeFileSync('grader.open', JSON.stringify({ ServicePort, sessionId }));
        let browser, UI;
        try {
            ({ UI, browser } = await Service.newBrowser({ ServicePort, sessionId }));
        }
        catch (e) {
            console.log("open", e);
            fs_2.default.writeFileSync('grader.error', JSON.stringify({ err: e, msg: e + '' }));
        }
        // don't expose socket
        UI.socket = null;
        return { UI, browser };
    }
    async function close(UI = App.UI) {
        /*
        try {
          await UI.send("Browser.close", {});
        } catch(e) {
          console.info('Error closing browser', e);
          return false;
        }
    
        try {
          UI.disconnect()
        } catch(e) {
          console.info(`Error disconnecting socket`, e);
          return false;
        }
        */
        try {
            await UI.shutdown();
        }
        catch (e) {
            console.info(`Error shut down browser.`, e);
            return false;
        }
        return true;
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
        if (UI.windowState == 'minimized')
            return;
        const result = await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                windowState: 'minimized'
            }
        });
        UI.windowState = 'minimized';
        return result;
    }
    async function restore(UI = App.UI) {
        let result;
        if (UI.windowState == 'maximized') {
            result = await UI.send("Browser.setWindowBounds", {
                windowId: UI.windowId,
                bounds: {
                    windowState: 'normal'
                }
            });
            UI.windowState = 'normal';
        }
        else {
            result = await UI.send("Browser.setWindowBounds", {
                windowId: UI.windowId,
                bounds: {
                    windowState: 'maximized'
                }
            });
            UI.windowState = 'maximized';
        }
        return result;
    }
    async function maximize(UI = App.UI) {
        if (UI.windowState == 'maximized')
            return;
        if (UI.windowState == 'minimized') {
            await partscreen(UI);
        }
        const result = await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                windowState: 'maximized'
            }
        });
        UI.windowState = 'maximized';
        return result;
    }
    async function fullscreen(UI = App.UI) {
        if (UI.windowState == 'fullscreen')
            return;
        if (UI.windowState == 'minimized') {
            await partscreen(UI);
        }
        const result = await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                windowState: 'fullscreen'
            }
        });
        UI.windowState = 'fullscreen';
        return result;
    }
    async function partscreen(UI = App.UI) {
        if (UI.windowState == 'normal')
            return;
        const result = await UI.send("Browser.setWindowBounds", {
            windowId: UI.windowId,
            bounds: {
                windowState: 'normal'
            }
        });
        UI.windowState = 'normal';
        return result;
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
    async function getAppTitle() {
        return config_js_4.default.name;
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
            DEFAULT_WC = {
                win: false,
                nix: path_3.default.resolve(Service.SITE_PATH, '_winctrlbar', 'nix_winctrl.html'),
                osx: false
            };
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
                    openBlank,
                    writePage,
                    // iframe document inside that
                    getStartURL,
                    // when using a custom window control box)
                    getFavicon,
                    getAppTitle,
                },
                meta: {
                    publishAPI // publish an API into the UI context (requires apiInUI: true)
                },
                control: {
                    send,
                    on,
                    off,
                },
                util: {
                    sleep: Common.sleep
                },
            };
            exports_5("default", API);
        }
    };
});
System.register("app", ["index"], function (exports_6, context_6) {
    "use strict";
    var index_js_2;
    var __moduleName = context_6 && context_6.id;
    async function start() {
        await index_js_2.default.go();
        //await windowDemo();
    }
    return {
        setters: [
            function (index_js_2_1) {
                index_js_2 = index_js_2_1;
            }
        ],
        execute: function () {
            //import {windowDemo} from './demos.js';
            start();
        }
    };
});
