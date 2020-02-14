# watchx

WIP tool to watch your haxe projects and build them automatically.

Install it globally via npm/yarn: `yarn global add watchx-cli`

Run it: `watchx`

If it's run in a folder with only one hxml or openfl project file it should detect it and use it.

You can also pass which file to use as parameter.

Any other parameter is forwarded to the haxe compiler/openfl command.

Ideas for future:

- add live reload
- support some sort of "assets folder" (is haxe bin/export.... .hxml faster than openfl build?)
