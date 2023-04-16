const { Events } = require('discord.js');

module.exports = {
	name: Events.ClientReady, //this property states which event this file is for
	once: true, //TF does the event run only once
	execute(client) { //holds event logic and called by event handler whenever event happens
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};
