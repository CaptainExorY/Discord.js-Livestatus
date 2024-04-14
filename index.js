const fs = require('fs');
const path = require('node:path');
const fetch = require('node-fetch');
const mongoose = require('mongoose');
const logger = require('./handlers/fileLogHandler');
const {
    Client,
    Collection,
    Events,
    GatewayIntentBits,
    Partials
} = require('discord.js');
const {
    token,
    mongoURI,
} = require('./config.json');
const {
    ActivityType,
    EmbedBuilder
} = require("discord.js");

// Define the Guild model only once
const Guild = require('./models/guildModel');
ient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
GatewayIntentBits.DirectMessages,
GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    ws: { properties: { $browser: 'Discord iOS' } },
});

/////MAX LISTENERS
client.setMaxListeners(20);
/////MAX LISTENERS
client.commands = new Collection();



let status = [{
        name: '.gg/kqjexCVD',
        type: ActivityType.Playing,
    },
];

async function loadGuildIds() {
    try {
        const guilds = await Guild.find({}, {
            _id: 0,
            key: 1,
            'settings.greeting.message': 1
        });
        const guildData = guilds.map(guild => ({
                    key: guild.key,
                    greetingMessage: guild.settings.greeting.message
                }));
        return guildData || [];
    } catch (err) {
        logger.error('Error fetching guild IDs from MongoDB:', err);
        throw err;
    }
}

async function connectToMongo() {
    try {
        await mongoose.connect(mongoURI);
        logger.info('Connected to MongoDB');
    } catch (err) {
        logger.error('Error connecting to MongoDB', err);
        throw err;
    }
}

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            logger.info(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
});

const { updateStatusMessage } = require('./handlers/statusHandler');

client.once('ready', async () => {
    logger.info(`${client.user.tag} is Online`);
    
    // Set up the function to update the status message
    const updateStatus = async () => {
        try {
            // Iterate through each guild and update the status message
            client.guilds.cache.forEach(async (guild) => {
                await updateStatusMessage(client, guild.id);
            });
        } catch (error) {
            console.error('Error updating status:', error);
        } finally {
            // Calculate milliseconds until the next minute
            const now = new Date();
            const msUntilNextMinute = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());

            // Schedule the next update at the beginning of the next minute
            setTimeout(updateStatus, msUntilNextMinute);
        }
    };

    // Start the update process
    updateStatus();
    
    setInterval(() => {
        let random = Math.floor(Math.random() * status.length);
        client.user.setActivity(status[random], { type: 3, browser: "DISCORD IOS" });
    }, 10000);


    try {
        // Connect to MongoDB
        await connectToMongo(mongoURI, {
            poolSize: 20,
        });

        // Load guild IDs from the database
        const guildIds = await loadGuildIds();

        // Iterate through guild IDs
        for (const guildData of guildIds) {
            const guildId = guildData.key;
            const guild = client.guilds.cache.get(guildId);
            
            if (guild) {
                logger.info(`Connected to server: ${guild.name}`);

                const guildSettings = await Guild.findOne({ key: guild.id });

                if (guildSettings) {
                    
                }
            } else {
                logger.info(`Unable to find server with ID: ${guildId}`);
            }
        }
    } catch (error) {
        logger.error('Error during bot initialization:', error);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand())
        return;
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        logger.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: 'There was an error while executing this command!',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: 'There was an error while executing this command!',
                ephemeral: true
            });
        }
    }
});

process.on('SIGINT', async() => {
    try {
        await mongoose.connection.close();
        logger.info('Closed MongoDB connection');
        process.exit(0);
    } catch (error) {
        logger.error('Error closing MongoDB connection:', error);
        process.exit(1);
    }
});


function start() {
    client.login(token);
}
module.exports = {
    start,
};
client.login(token);

