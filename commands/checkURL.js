const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, SlashCommandBuilder } = require('discord.js');
//const { request } = require('undici');
const myHeader = require('../headers.json');
const headers = new Headers(myHeader);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('checkurl')
		.setDescription('see if URL is available on Wayback Machine')
		.addStringOption(option => option.setName('url')
			.setDescription('my epic description')
			.setRequired(true)),
	async execute(interaction) {
		const url = interaction.options.getString('url');
		
		const isAvail = await fetch(`https://archive.org/wayback/available?url=${url}`);
		const { archived_snapshots } = await isAvail.json();

		if (Object.keys(archived_snapshots).length == 0)	 {
			
			await interaction.reply(`No results found for ${url}. Saving to Wayback Machine...`);

			const options = {
				path: '/',
				method: 'POST',
				headers,
				body: `url=${encodeURIComponent(url)}`,
			}

			try {
				//POSTing to SPN
				const saveResponse = await fetch('https://web.archive.org/save/', options);
				//get back url and job_id
				const { job_id } = await saveResponse.json();

				//VVV TODO VVV

				//syntax for checking status:
				//https://web.archive.org/save/status/job_id
				//Response json, but we only care about the status part of it
				//const { status } = await request(`https://web.archive.org/save/status/${job_id}`);
				/* what i want to do is check the status. if pending, sleep and check later; if error, smth wrong wtf
				 * and check until timeout amount (what should that amount be?)
				 * ok "expired" job_ids just give pending I guess but timeout should handle that...?
				*/
				const myTimeoutLength = 5000;
				
				try {
					//Checking status
					const { status } = await fetch(`https://web.archive.org/save/status/${job_id}`, { signal: AbortSignal.timeout(myTimeoutLength)});
					console.log("ok");
					console.log(status);
				} catch (err) {
					if (err.name === "TimeoutError") {
						console.error("Timeout: It took too long to get the result!");
					} else if (err.name === "AbortError") {
						console.error("Fetch aborted by user action.");
					} else if (err.name === "TypeError") {
						console.error("AbortSignal.timeout() method is not supported.");
					} else {
						console.error(`Error: type ${err.name}, message:${err.message}`);
					}
					return interaction.editReply("Something went wrong. See console error.");
				}


				console.log("ok");
			} catch (err) {
				console.error(err);
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