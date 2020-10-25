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
System.register("app", ["child_process", "fs", "path", "os", "adm-zip", "config", "lib/common"], function (exports_3, context_3) {
    "use strict";
    var child_process_1, fs_1, path_1, os_1, adm_zip_1, config_js_1, common_js_1;
    var __moduleName = context_3 && context_3.id;
    async function launchApp() {
        console.log('App launcher started.');
        // setup a promise to track a part of the setup
        let state = 'pending';
        let resolve, reject;
        const pr = new Promise((res, rej) => (resolve = res, reject = rej));
        pr.then(() => state = 'complete').catch(() => state = 'rejected');
        let appBundle, subprocess, message = '';
        // setup future cleanup
        const killService = (e) => {
            subprocess.kill();
            console.log();
            common_js_1.say({ exitTrigger: e });
            process.exit(1);
        };
        process.on('SIGINT', killService);
        process.on('SIGQUIT', killService);
        process.on('SIGTSTP', killService);
        process.on('SIGHUP', killService);
        process.on('error', killService);
        // retrieve the app from the virtual filesystem in the build
        const appPath = path_1.default.resolve(__dirname, '..', 'build', 'app.zip');
        try {
            appBundle = fs_1.default.readFileSync(appPath);
        }
        catch (e) {
            console.log('src build service error', e);
        }
        try {
            // create the app directory
            console.log('Preparing app data directory.');
            common_js_1.DEBUG && console.log({ DEBUG: common_js_1.DEBUG });
            const name = common_js_1.DEBUG ?
                path_1.default.resolve(__dirname, '..', 'dev')
                :
                    path_1.default.resolve(os_1.default.homedir(), '.grader', 'appData', `${(config_js_1.default.organization || config_js_1.default.author).name}`, `service_${config_js_1.default.name}`);
            const zipName = path_1.default.resolve(name, 'app.zip');
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
            common_js_1.DEBUG && console.log({ zipName, name, appPath });
            file.extractAllTo(name, /*overwrite*/ true);
            // and delete the zip
            fs_1.default.unlinkSync(zipName);
            // fork the app process
            console.log('App process requested.');
            const procName = path_1.default.resolve(name, 'app', 'service.js');
            common_js_1.DEBUG && console.log({ procName });
            subprocess = child_process_1.fork(procName, !common_js_1.DEBUG ?
                { stdio: [null, null, null, 'ipc'], detached: true }
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
            console.log('fork err', e);
            console.log('App process failed. Exiting...');
            process.exit(1);
        }
        console.log('App process created.');
        /*
          await sleep(5000);
          process.exit(0);
        */
        // keep this process spinning while we track startup progress
        const progress = [];
        while (subprocess.connected && !(typeof message == "string" && message.startsWith('App started.'))) {
            if (state == 'pending') {
                process.stdout.clearLine(0); // 0 is 'entire line'
                process.stdout.cursorTo(0);
                process.stdout.write(`Waiting for your system security checks: ${progress.join('.')}`);
            }
            await common_js_1.sleep(Math.round(Math.random() * 370));
            progress.push('');
        }
        console.log('');
        // report the outcome
        if (typeof message == "string" && message.startsWith('App started.')) {
            const port = Number(message.split('.')[1].trim());
            console;
            console.log(`Service on port ${port}`);
            console.log('Launcher exiting successfully...');
            if (common_js_1.DEBUG) {
                await common_js_1.sleep(20000);
            }
            else {
                process.exit(0);
            }
        }
        else {
            console.error('Error at', message);
            console.info('Check state', state, 'subprocess.connected', subprocess.connected);
            console.log('Launcher failed. Exiting in 5 seconds...');
            await common_js_1.sleep(5000);
            process.exit(1);
        }
    }
    return {
        setters: [
            function (child_process_1_1) {
                child_process_1 = child_process_1_1;
            },
            function (fs_1_1) {
                fs_1 = fs_1_1;
            },
            function (path_1_1) {
                path_1 = path_1_1;
            },
            function (os_1_1) {
                os_1 = os_1_1;
            },
            function (adm_zip_1_1) {
                adm_zip_1 = adm_zip_1_1;
            },
            function (config_js_1_1) {
                config_js_1 = config_js_1_1;
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
