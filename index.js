const fs = require('node:fs');
const path = require('node:path');
//const { request } = require('undici');
// Require the necessary discord.js classes
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { ArgumentParser } = require('argparse');
const parser = new ArgumentParser({description: 'dev(elopment) or rel(ease) build'});
parser.add_argument('build', { metavar: 'b', type: 'str', default: 'dev'});
let args = parser.parse_args();
const build = args.build;

let token;
if (build == 'dev') {
	token = require('./config_dev.json').token;
} else if (build == 'rel') {
	token = require('./config_rel.json').token;
} else {
	console.error("bad argument");
	return;
}

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

//get .js files from commands folder
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
//and events folder
//const eventsPath = path.join(__dirname, 'events');
//const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	/*
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING[ The commmand at ${filepath} is missing a required "data" or "execute" property.`)
	}*/
	client.commands.set(command.data.name, command);
}
/*
for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}
*/

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
	if(!interaction.isChatInputCommand()) return;
	
	const command = interaction.client.commands.get(interaction.commandName);
	//const command = client.commands.get(interaction.commandName)

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true })
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
		}
	}

});

// Log in to Discord with your client's token
client.login(token);