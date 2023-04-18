const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const { ArgumentParser } = require('argparse');
const parser = new ArgumentParser({description: 'dev(elopment) or rel(ease) build'});
parser.add_argument('build', { metavar: 'b', type: 'str', default: 'dev'});
let args = parser.parse_args();
const build = args.build;

let commandFiles = [];
let clientId, guildId, token;
const commandsPath = path.join(__dirname, 'commands');

if (build == 'dev') {
	({ clientId, guildId, token } = require('./config_dev.json'));
	commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
} else if (build == 'rel') {
	({ clientId, token } = require('./config_rel.json'));
	const myCommands = ['twitter.js', 'user.js'];
	commandFiles = fs.readdirSync(commandsPath).filter(file => myCommands.includes(file));
} else {
	console.error("bad argument");
	return;
}

let commands = [];

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command.data.toJSON());
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(token);

// and deploy your commands!
let data;
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		if(build == 'dev'){
			data = await rest.put(
				Routes.applicationGuildCommands(clientId, guildId),
				{ body: commands },
			);

		} else if (build == 'rel') {
			data = await rest.put(
				Routes.applicationCommands(clientId),
				{ body: commands },
			);
		}

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();
