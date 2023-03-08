const { SlashCommandBuilder } = require('discord.js');
const { request } = require('undici');
//...?

module.exports = {
	data: new SlashCommandBuilder()
		.setName('checkurl')
		.setDescription('see if URL is available on Wayback Machine')
		.addStringOption(option => option.setName('url')
			.setDescription('The input to echo back')
			.setRequired(true)),
	async execute(interaction) {
		const url = interaction.options.getString('url');
		const isAvail = await request(`https://archive.org/wayback/available?url=${url}`);
		const { archived_snapshots } = await isAvail.body.json();
		if (Object.keys(archived_snapshots).length == 0)	 {
			return interaction.reply(`No results found for ${url}.`)
		}
		//else
		return interaction.reply(`The closest snapshot for ${url} is from ${archived_snapshots.closest.timestamp}.`);
	},
};