System.register("lib/args", ["os", "path", "fs"], function (exports_1, context_1) {
    "use strict";
    var os_1, path_1, fs_1, DSP, DCP, server_port, chrome_port, Pref, pref_file, cacheId, BasePath, temp_browser_cache, app_data_dir, args;
    var __moduleName = context_1 && context_1.id;
    function updateBasePath(new_base_path) {
        new_base_path = path_1.default.resolve(new_base_path);
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
        if (fs_1.default.existsSync(pref_file)) {
            try {
                Object.assign(Pref, JSON.parse(fs_1.default.readFileSync(pref_file)));
            }
            catch (e) {
                console.warn("Error reading from preferences file", e);
            }
        }
        else {
            console.log("Preferences file does not exist. Creating one...");
            savePref();
        }
    }
    function savePref() {
        try {
            fs_1.default.writeFileSync(pref_file, JSON.stringify(Pref));
        }
        catch (e) {
            console.warn("Error writing preferences file", pref_file, Pref, e);
        }
    }
    return {
        setters: [
            function (os_1_1) {
                os_1 = os_1_1;
            },
            function (path_1_1) {
                path_1 = path_1_1;
            },
            function (fs_1_1) {
                fs_1 = fs_1_1;
            }
        ],
        execute: function () {
            DSP = 22121;
            DCP = 8222;
            exports_1("server_port", server_port = process.env.PORT || process.argv[2] || DSP);
            exports_1("chrome_port", chrome_port = process.argv[3] || DCP);
            Pref = {};
            pref_file = path_1.default.resolve(os_1.default.homedir(), '.grader.config.json');
            cacheId = Math.random().toString('36');
            loadPref();
            BasePath = Pref.BasePath;
            temp_browser_cache = () => path_1.default.resolve(os_1.default.homedir(), '.temp-browser-cache' + cacheId);
            app_data_dir = () => path_1.default.resolve(os_1.default.homedir(), '.app-data');
            //console.log(`Args usage: <server_port> <chrome_port> <... other args>`);
            updateBasePath(process.argv[5] || Pref.BasePath || os_1.default.homedir());
            args = {
                server_port,
                chrome_port,
                updateBasePath,
                getBasePath,
                temp_browser_cache,
                app_data_dir
            };
            exports_1("default", args);
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
System.register("app", ["child_process", "fs", "path", "os", "adm-zip", "lib/args", "lib/common"], function (exports_3, context_3) {
    "use strict";
    var child_process_1, fs_2, path_2, os_2, adm_zip_1, args_js_1, common_js_1;
    var __moduleName = context_3 && context_3.id;
    async function start() {
        console.log('App launcher started.');
        let state = 'pending';
        let resolve, reject;
        const pr = new Promise((res, rej) => (resolve = res, reject = rej));
        pr.then(() => state = 'complete').catch(() => state = 'rejected');
        let srv, subprocess, message;
        try {
            srv = fs_2.default.readFileSync(path_2.default.resolve(__dirname, '..', 'build', 'app.zip'));
        }
        catch (e) {
            console.log('src build server error', e);
        }
        try {
            console.log('Preparing temp data directory.');
            const name = path_2.default.resolve(os_2.default.homedir(), '.grader_server_' + Math.random().toString(36));
            const zipName = path_2.default.resolve(name, 'app.zip');
            fs_2.default.mkdirSync(name, { recursive: true });
            fs_2.default.writeFileSync(zipName, srv);
            console.log('Inflating app contents.');
            const file = new adm_zip_1.default(zipName);
            file.extractAllTo(name);
            const procName = path_2.default.resolve(name, 'app', 'server.js');
            console.log('App process requested.');
            subprocess = child_process_1.fork(procName, { stdio: [null, null, null, 'ipc'], detached: true, windowsHide: true });
            subprocess.on('error', (...args) => (console.log('err', args), reject(args)));
            subprocess.on('message', msg => (message = msg, process.stdout.write('\n' + msg), resolve(args_js_1.default)));
            subprocess.unref();
        }
        catch (e) {
            console.log('fork err', e);
            console.log('App process failed. Exiting...');
            process.exit(1);
        }
        console.log('App process created.');
        // keep parent spinning 
        const progress = [];
        while (subprocess.connected && message != 'App started.') {
            if (state == 'pending') {
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write(`Waiting for your system security checks: ${progress.join('.')}`);
            }
            await common_js_1.sleep(Math.round(Math.random() * 370));
            progress.push('');
        }
        console.log('');
        if (message == 'App started.') {
            console.log('Launcher exiting successfully...');
            process.exit(0);
        }
        else {
            console.error('Error at', message);
            console.info('Check state', state);
            console.log('Launcher failed. Exiting in 15 seconds...');
            await common_js_1.sleep(15000);
            process.exit(1);
        }
    }
    return {
        setters: [
            function (child_process_1_1) {
                child_process_1 = child_process_1_1;
            },
            function (fs_2_1) {
                fs_2 = fs_2_1;
            },
            function (path_2_1) {
                path_2 = path_2_1;
            },
            function (os_2_1) {
                os_2 = os_2_1;
            },
            function (adm_zip_1_1) {
                adm_zip_1 = adm_zip_1_1;
            },
            function (args_js_1_1) {
                args_js_1 = args_js_1_1;
            },
            function (common_js_1_1) {
                common_js_1 = common_js_1_1;
            }
        ],
        execute: function () {
            process.on('error', (...args) => {
                console.log(args);
            });
            start();
        }
    };
});
