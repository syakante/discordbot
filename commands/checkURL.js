const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, SlashCommandBuilder } = require('discord.js');
const { request } = require('undici');
const headers = require('../headers.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('checkurl')
		.setDescription('see if URL is available on Wayback Machine')
		.addStringOption(option => option.setName('url')
			.setDescription('my epic description')
			.setRequired(true)),
	async execute(interaction) {
		const url = interaction.options.getString('url');
		const isAvail = await request(`https://archive.org/wayback/available?url=${url}`);
		const { archived_snapshots } = await isAvail.body.json();
		if (Object.keys(archived_snapshots).length == 0)	 {
			await interaction.reply(`No results found for ${url}. Testing SPN API...`);

			const options = {
				path: '/',
				method: 'POST',
				headers: new Headers(headers),
				body: `url=${encodeURIComponent('http://example.com')}`,
			}
			console.log(headers)
			//const client = new Client('https://web.archive.org/save/');

			try {
				await fetch('https://web.archive.org/save/', options)
				.then(res => res.json())
				.then(res => console.log(res))
				.catch((error) => console.error("Error:",error));
				console.log("ok");
			} catch (error) {
				console.error(error);
			}
			return interaction.editReply("end here");
		}
		//else
		const row = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setCustomId('save_new')
					.setLabel('Save New')
					.setStyle(ButtonStyle.Primary),
				new ButtonBuilder()
					.setCustomId('use_latest')
					.setLabel('Use Latest')
					.setStyle(ButtonStyle.Secondary),
			);
		//return interaction.reply(`The closest snapshot for ${url} is from ${archived_snapshots.closest.timestamp}.`);
		await interaction.reply({ content: `The closest snapshot for ${url} is from ${archived_snapshots.closest.timestamp}.`, components: [row] });
		
		const filter = i => i.isButton() && (i.customId === 'save_new' || i.customId === 'use_latest')
									&& (i.user.id === i.message.interaction.user.id);

		const collector = interaction.channel.createMessageComponentCollector({ filter, time: 10000 });

		collector.on('collect', async i => {
		    //await i.deferUpdate();
			if (i.customId === 'save_new') {
		    	await interaction.editReply({ content: 'Clicked Save New'});
			} else if (i.customId === 'use_latest') {
				await interaction.editReply({ content: 'Clicked Use Latest'});
			}
		    await interaction.editReply({ components: [] });
		    //interaction.followUp({ content: 'public message'})
		    collector.stop();
		});

	},
};