const { SlashCommandBuilder } = require('discord.js');
const { request } = require('undici');
//this fixes the problem but the problem shouldnt be occuring in the first place

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cat')
		.setDescription('randomcat api test'),
	async execute(interaction) {
		const catResult = await request('https://aws.random.cat/meow'); //sent GET request
		const { file } = await catResult.body.json(); //get JSON via undici
		return interaction.reply({ files: [{ attachment: file, name: 'cat.png' }] });
	},
};