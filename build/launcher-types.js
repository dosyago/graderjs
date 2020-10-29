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
System.register("launcher", ["fs", "path", "child_process", "adm-zip", "lib/common"], function (exports_2, context_2) {
    "use strict";
    var fs_1, path_2, child_process_1, adm_zip_1, common_js_1;
    var __moduleName = context_2 && context_2.id;
    async function launchApp() {
        console.log('App launcher started.');
        // setup a promise to track a part of the setup
        let state = 'pending';
        let resolve, reject;
        const pr = new Promise((res, rej) => (resolve = res, reject = rej));
        pr.then(() => state = 'complete').catch(() => state = 'rejected');
        let appBundle, subprocess = {}, message = '';
        // setup future cleanup
        const killService = (e) => {
            subprocess.kill();
            console.log('');
            common_js_1.say({ exitTrigger: e });
            return process.exit(1);
        };
        process.on('SIGINT', killService);
        process.on('SIGQUIT', killService);
        process.on('SIGTSTP', killService);
        process.on('SIGHUP', killService);
        process.on('error', killService);
        // retrieve the app from the virtual filesystem in the build
        const appPath = path_2.default.resolve(__dirname, '..', 'build', 'app.zip');
        try {
            appBundle = fs_1.default.readFileSync(appPath);
        }
        catch (e) {
            console.log('src build service error', e);
            return exit(1);
        }
        try {
            // create the app directory
            console.log('Preparing app data directory.');
            const name = common_js_1.DEBUG ? path_2.default.resolve(common_js_1.appDir(), 'dev') : common_js_1.appDir();
            const zipName = path_2.default.resolve(name, 'app.zip');
            if (!fs_1.default.existsSync(name)) {
                fs_1.default.mkdirSync(name, { recursive: true });
            }
            if (fs_1.default.existsSync(zipName)) {
                fs_1.default.unlinkSync(zipName);
            }
            // unzip a fresh copy of app from binary every time
            console.log('Inflating app contents.');
            fs_1.default.writeFileSync(zipName, appBundle);
            const file = new adm_zip_1.default(zipName);
            file.extractAllTo(name, /*overwrite*/ true);
            // and delete the zip
            fs_1.default.unlinkSync(zipName);
            // wait for log stream
            let logResolve;
            const logPr = new Promise(res => logResolve = res);
            const log = fs_1.default.createWriteStream(common_js_1.logFile());
            log.on('open', () => logResolve());
            await logPr;
            // fork the app process
            console.log('App process requested.');
            const procName = path_2.default.resolve(name, 'app', 'service.js');
            subprocess = child_process_1.fork(procName, !common_js_1.DEBUG ?
                { stdio: [log, log, log, 'ipc'], detached: true }
                :
                    { stdio: 'inherit' });
            subprocess.on('error', (...args) => (console.log('err', args), reject(args)));
            subprocess.on('message', (...args) => {
                if (typeof args[0] == "string") {
                    message = args[0];
                }
                process.stdout.write('\n' + message);
                resolve(args);
            });
            !common_js_1.DEBUG && subprocess.unref();
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
            await common_js_1.sleep(Math.round(Math.random() * 370));
        }
        console.log('');
        common_js_1.DEBUG && console.log({ message, state });
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
            await common_js_1.sleep(5000);
            return exit(1);
        }
    }
    function exit(code) {
        console.log(`Exit status: ${code ? 'failure' : 'success'}`);
        if (common_js_1.DEBUG) {
            console.log(`DEBUG is on. Not exiting.`);
            process.stdin.resume();
        }
        else {
            console.log('Exiting...');
            common_js_1.sleep(500).then(() => process.exit(code));
        }
    }
    return {
        setters: [
            function (fs_1_1) {
                fs_1 = fs_1_1;
            },
            function (path_2_1) {
                path_2 = path_2_1;
            },
            function (child_process_1_1) {
                child_process_1 = child_process_1_1;
            },
            function (adm_zip_1_1) {
                adm_zip_1 = adm_zip_1_1;
            },
            function (common_js_1_1) {
                common_js_1 = common_js_1_1;
            }
        ],
        execute: function () {
            launchApp();
        }
    };
});
