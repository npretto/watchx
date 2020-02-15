#!/usr/bin/env node
const fs = require("fs");
const parser = require("fast-xml-parser");
const chokidar = require("chokidar");
const { spawn } = require("child_process");
const chalk = require("chalk");

const ok = chalk.greenBright;
const error = chalk.redBright;
const warning = chalk.yellow;
const info = chalk.gray;

const readDir = fs.readdirSync;

let [nodePath, watchxPath, ...args] = process.argv;

if (
  args.length === 1 &&
  (args[0].endsWith(".hxml") || args[0].endsWith(".xml"))
) {
  // fix in case of openfl the arg is the target name
  [filename, ...args] = args;
  run(filename);
} else {
  const filesInPwd = readDir(".");
  const hxmls = filesInPwd.filter(f => f.endsWith(".hxml"));
  const openflFiles = filesInPwd.filter(f => f.endsWith(".xml"));

  if (hxmls.length === 1) {
    const [hxml] = hxmls;
    console.log(ok(`${hxml} file detected, will use it as config`));
    run(hxml);
  } else if (openflFiles.length == 1) {
    const [openflFile] = openflFiles;
    console.log(ok(`${openflFile} file detected, will use it as config`));
    if (args.length === 0) {
      console.log(warning("openfl needs a target"));
      process.exit(1);
    }
    run(openflFile);
  } else {
    console.log(error("No project file selected"));
    console.log("This can happen if there are more than 1 in this folder");
    console.log("You can pass one as the first argument");
  }
}

function run(fileName) {
  console.log(info(`watchx will use ${fileName}`));
  let config = {};
  if (fileName.endsWith(".hxml")) {
    config = parseHxml(fileName);
  } else if (fileName.endsWith(".xml")) {
    config = parseOpenflProjectFile(fileName);
  }
  console.log(info("config"), config);

  let command = "";
  let compilerArgs = [];
  if (config.type === "hxml") {
    command = "haxe";
    compileArgs = [fileName, ...args];
  } else if (config.type === "openfl") {
    command = "openfl";
    compileArgs = ["build", ...args];
  }

  let child = undefined;
  let changedWhileBuilding = false;

  if (config.type == "openfl" && args.includes("html5")) {
    console.log("starting livereload on port 8080");
    const LiveReloadAndServe = require("./livereloadandserve");

    const liveReloadServer = new LiveReloadAndServe("Export/html5/bin");
    liveReloadServer.listen();
  }

  chokidar
    .watch(config.sources, { ignoreInitial: true })
    .on("all", (event, path) => {
      console.log(info(event, path));

      if (child) {
        console.log(
          info("file changed while building, will rebuild at the end")
        );
        changedWhileBuilding = true;
      } else {
        console.log("");
        console.log(`starting new build`);
        console.log("");
        build();
      }
    });

  const build = () => {
    child = spawn(command, compileArgs);

    child && child.stdout.pipe(process.stdout);
    child && child.stderr.pipe(process.stderr);

    child.on("close", code => {
      if (code === 0) {
        console.log(ok("build has finished successfully"));
        //   postBuild();
      } else {
        console.log("");
        console.log(error(`build failed with error code: ${code}`));
      }
      child = undefined;
      if (changedWhileBuilding) {
        console.log("");
        console.log("rebuilding because a file was changed during last build");
        console.log("");
        changedWhileBuilding = false;
        build();
      }
    });
  };
}

function parseHxml(fileName) {
  const content = fs.readFileSync(fileName, { encoding: "utf8" });
  const lines = content.split("\n");
  const args = lines.filter(l => l.length > 0).map(arg => arg.split(" "));
  const sources = args
    .filter(([type, ...others]) => type === "-cp")
    .map(([type, folder]) => folder);

  return { type: "hxml", sources };
}

function parseOpenflProjectFile(fileName) {
  const content = fs.readFileSync(fileName, { encoding: "utf8" });
  const jsonObj = parser.parse(content, {
    ignoreAttributes: false,
    attributeNamePrefix: "",
    arrayMode: true
  });

  const project = jsonObj.project[0];
  const sources = project.source.map(el => el.path);
  const assets = project.assets.map(el => el.path);

  return { type: "openfl", sources, assets };
}
