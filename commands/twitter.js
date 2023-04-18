const { hideLinkEmbed, SlashCommandBuilder } = require('discord.js');
const myHeader = require('../headers.json');
const headers = new Headers(myHeader);
const { TwitterApi } = require('twitter-api-v2');
const client = new TwitterApi('bearer token placeholder');
//
const intspan = require('../intspan.js');

//TODO: add defer
//TODO: github on the rpi
//TODO: global commands

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
				.setDescription('Your own optional tags or notes'))
		.addStringOption(option =>
			option
			.setName('spoiler')
			.setDescription('Which of up to 4 images to spoiler, if any. e.g. 1-3, 4. Default: none'))
		.addStringOption(option =>
			option
			.setName('which')
			.setDescription('Select which images to upload e.g. 1-3, 4. Default: all (except videos)')),
	
	async execute(interaction) {
		let url = interaction.options.getString('url');
		let notes = interaction.options.getString('notes') ?? '';
		let spoilerInd = interaction.options.getString('spoiler');
		let whichInd = interaction.options.getString('which');
		
		//if you attempt to spoiler images that you chose to omit e.g. spoiler 2, only upload 1,3
		//then just ignore the spoiler and upload the requested images

		//V I moved around a bunch of stuff while debugging so double check later
		let spoilerArr = [];
		let spoilerStrArr = [];
		if (spoilerInd) {
			spoilerInd = spoilerInd.replace(/\s+/g, '');
			try {
				spoilerArr = intspan(spoilerInd); //<-- list of int indeces
				if (spoilerArr[0] < 1 || spoilerArr[spoilerArr.length] > 4) {
					return interaction.reply(`Out of range on spoiler option.`)
				}
			} catch (e) {
				return interaction.reply(`${e} on spoiler option.`);
			}
			for (let i = 1; i <= 4; i++) {
				if (spoilerArr.includes(i)) {
					spoilerStrArr.push("SPOILER_");
				} else {
					spoilerStrArr.push("");
				}
			}
		} else {
			spoilerStrArr = ["", "", "", ""];
		}
		let whichArr = [1, 2, 3, 4];
		if (whichInd) {
			whichInd = whichInd.replace(/\s+/g, '');
			try {
				whichArr = intspan(whichInd); //<-- list if int indeces
				if (whichArr[0] < 1 || whichArr[whichArr.length] > 4) {
					return interaction.reply(`Out of range on which option.`)
				}
			} catch (e) {
				return interaction.reply(`${e} on which option.`);
			}
		}
		const twtPattern = /https?:\/\/(www\.|mobile\.)?twitter\.com\/\w+\/status\/(?<id>\d+)/;
		const match = url.match(twtPattern);
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
			return interaction.reply({content: `${url} error: ${thisTweet.errors[0].title}!`})
		}
		if (!thisTweet.includes.media){
			return interaction.reply(`Couldn't find any images in ${hideLinkEmbed(url)}.`)
		}
		//thisTweet.includes.media = an array of objects, length depends on how many media attachments
		//for each object in the array we want "url"
		//so like thisTweet.includes.media[i].url
		let mediaUrlArr = thisTweet.includes.media.map(({ url }) => url);
		//case: length of media > number of url. Specifically this happens if there's a gif/video attachment.
		//in this case, let the user know, and just upload the files that have URLs.

		let hasVideo = false;
		whichArr = whichArr.filter(x => x <= mediaUrlArr.length)
		mediaUrlArr = mediaUrlArr.filter((_, i) => whichArr.includes(i));
		spoilerStrArr = spoilerStrArr.filter((_, i) => whichArr.includes(i));
		const isVideoInd = mediaUrlArr.reduce((acc, cur, i) => {
			if (cur === undefined) {
				acc.push(i);
			}
			return acc;
		}, []);
		
		if (isVideoInd.length > 0) {
			hasVideo = true;
		}

		mediaUrlArr = mediaUrlArr.filter((_, i) => !isVideoInd.includes(i));
		if (mediaUrlArr.length == 0) {
			return interaction.reply(`Can't reupload video(s) in ${hideLinkEmbed(url)}.`)
		}
		spoilerStrArr = spoilerStrArr.filter((_, i) => !isVideoInd.includes(i));
		const tweetUser = thisTweet.includes.users[0].username;
		const displayName = thisTweet.includes.users[0].name;
		let tweetDescr = thisTweet.data.text;



		//Removing redundant t.co links
		const tcoInd = [...tweetDescr.matchAll(new RegExp(/https:\/\/t.co\/\w+/g))].map(a => a.index);
		//if has video, remove the last two t.co
		//if no video, remove the last t.co
		//they'll always be at the end of text so you can just slice off everything in the string after the nth t.co
		const tcoSlice = tcoInd[tcoInd.length-1-hasVideo];
		if(tcoSlice == 0){
			tweetDescr = "";
		} else {
			tweetDescr = tweetDescr.slice(0, tcoSlice-1);
		}

		console.log(mediaUrlArr);
		
		
		const fileArr = mediaUrlArr.map((s, i) => ({name: `${spoilerStrArr[i]}${tweetUser}_${i}.${s.match(/([^.]*$)/)[0]}`, attachment: s}))
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
	}
}