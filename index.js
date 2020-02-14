#!/usr/bin/env node
const fs = require("fs");
const parser = require("fast-xml-parser");
const chokidar = require("chokidar");
const { spawn } = require("child_process");

const readDir = fs.readdirSync;

let [nodePath, watchxPath, ...args] = process.argv;

// console.log("hello from watchx");
// console.log("node path: ", nodePath);
// console.log("cmd path: ", watchxPath);
// console.log("args:", args);

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
    console.log(`${hxml} file detected, will use it as config`);
    run(hxml);
  } else if (openflFiles.length == 1) {
    const [openflFile] = openflFiles;
    console.log(`${openflFile} file detected, will use it as config`);
    if (args.length === 0) {
      console.log("openfl needs a target");
      process.exit(1);
    }
    run(openflFile);
  } else {
    console.log("No project file selected");
    console.log("This can happen if there are more than 1 in this folder");
    console.log("You can pass one as the first argument");
  }
}

function run(fileName) {
  console.log(`watchx will use ${fileName}`);
  let config = {};
  if (fileName.endsWith(".hxml")) {
    config = parseHxml(fileName);
  } else if (fileName.endsWith(".xml")) {
    config = parseOpenflProjectFile(fileName);
  }
  console.log("config", config);

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

  chokidar
    .watch(config.sources, { ignoreInitial: true })
    .on("all", (event, path) => {
      console.log(event, path);

      if (child) {
        // console.log(`killing process`);
        // child;
        // child.kill("SIGTERM");
        // console.log(`process killed`);
        console.log("file changed while building, will rebuild at the end");
        changedWhileBuilding = true;
      } else {
        build();
      }
    });

  const build = () => {
    console.log(`starting new  compilation`);
    child = spawn(command, compileArgs);
    console.log("child: ", !!child);

    child && child.stdout.pipe(process.stdout);
    child && child.stderr.pipe(process.stderr);

    child.on("close", code => {
      console.log(`child process exited with code ${code}`);
      child = undefined;
      if (changedWhileBuilding) {
        console.log("rebuilding because it was changed while building");
        changedWhileBuilding = false;
        build();
      }
      if (code === 0) {
        //   postBuild();
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
