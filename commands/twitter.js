const { hideLinkEmbed, SlashCommandBuilder } = require('discord.js');
const myHeader = require('../headers.json');
const headers = new Headers(myHeader);
const { TwitterApi } = require('twitter-api-v2');
const client = new TwitterApi('bearer token placeholder');
//obviously... do not push that ^

module.exports = {
	data: new SlashCommandBuilder()
		.setName('twt')
		.setDescription('Save a Twitter URL to the Wayback Machine and reupload the tweet\'s images to this channel.')
		.addStringOption(option =>
			option
				.setName('url')
				.setDescription('Link to Tweet')
				.setRequired(true))
		.addStringOption(option =>
			option
				.setName('notes')
				.setDescription('Your own optional tags or notes')),
	
	async execute(interaction) {
		let url = interaction.options.getString('url');
		let notes = interaction.options.getString('notes') ?? '';

		const options = {
			path: '/',
			method: 'POST',
			headers,
			body: `url=${encodeURIComponent(url)}&skip_first_archive=1&js_behavior_timeout=0&capture_outlinks=0`,
		}

		const twtPattern = /https?:\/\/(www\.|mobile\.)?twitter\.com\/\w+\/status\/(?<id>\d+)/;
		const match = url.match(twtPattern);
		//console.log(match);
		if (!match){
			return interaction.reply(`${hideLinkEmbed(url)} is not a valid Twitter link.`);
		}

		url = match[0]; //a little sus but I'll go with it

		const thisTweet = await client.v2.singleTweet(match.groups.id, {
			'media.fields': 'url',
			'user.fields': 'username',
			expansions: [
				'attachments.media_keys',
				'author_id',
			]
		});

		console.log(JSON.stringify(thisTweet));

		if (thisTweet.errors){
			return interaction.reply({content: `${url} error: ${thisTweet.errors[0].title}!`}) //considering ephemeral: true here?
		}
		if (!thisTweet.includes.media){
			return interaction.reply(`Couldn't find any images in ${hideLinkEmbed(url)}.`)
		}
		//thisTweet.includes.media = an array of objects, length depends on how many media attachments
		//for each object in the array we want "url"
		//so like thisTweet.includes.media[i].url
		let mediaUrlArr = await thisTweet.includes.media.map(({ url }) => url);
		//case: length of media > number of url. Specifically this happens if there's a gif/video attachment.
		//in this case, let the user know, and just upload the files that have URLs.
		if (mediaUrlArr.every(i => i === undefined)){
			return interaction.reply(`Can't reupload video(s) in ${hideLinkEmbed(url)}.`)
			//note that the user might know this and just want to archive a link to a video
			//so instead of return, skip to the part where you archive it
			//...later
			//potentially change flow here so instead of checking .every and then .some,
			//only check .some and then check if array empty after that
		}
		let hasVideo = false;
		if (mediaUrlArr.some(i => i === undefined)){
			mediaUrlArr = mediaUrlArr.filter(url => url !== undefined);
			hasVideo = true;
		}
		const tweetUser = thisTweet.includes.users[0].username;
		const displayName = thisTweet.includes.users[0].name;
		let tweetDescr = thisTweet.data.text;

		const tcoInd = [...tweetDescr.matchAll(new RegExp(/https:\/\/t.co\/\w+/g))].map(a => a.index);
		//if has video, remove the last two t.co
		//if no video, remove the last t.co
		//it's that easy! Except JS doesn't have negative indexing
		//they'll always be at the end of text so you can just slice off everything in the string after the nth t.co
		const tcoSlice = tcoInd[tcoInd.length-1-hasVideo];
		if(tcoSlice == 0){
			tweetDescr = "";
		} else {
			tweetDescr = tweetDescr.slice(0, tcoSlice-1);
		}

		console.log(mediaUrlArr);
		
		const fileArr = mediaUrlArr.map((s, i) => ({name: `${tweetUser}_${i}.${s.match(/([^.]*$)/)[0]}`, attachment: s}))
		//with multiple files it would look someting like this
		/*
		*	files: [{name: filename1, attachment: path1}, {name: filename2, attachment: path2}]
		*/
		console.log(fileArr);

		const tweetEmbed = {
			color: 0x1DA1F2,
			title: url,
			author: {
				name: `${displayName} (@${tweetUser})`,
				url: `https://twitter.com/${tweetUser}`,
			},
			description: tweetDescr,
			fields: [],
			//in the future, maybe add timestamp. See field in the twitter API docs.
		}
		
		if(notes.length !== 0){
			tweetEmbed.fields.push({
				name: 'Notes',
				value: notes.trim() //I think it auto trims or sth (at least denies space-only answer) but w/e
			});
		}
		if(hasVideo){
			tweetEmbed.fields.push({
				name: "Video was omitted.",
				value: "Reupload not supported at this time."
			})
		}

		return interaction.reply({ embeds: [tweetEmbed],
									files: fileArr});
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
				 * I think this should be handled by promises and stuff
				 * and SPN  already has a builtin max capture time of 50s
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
}