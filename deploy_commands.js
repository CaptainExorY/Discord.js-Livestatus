const { REST, Routes } = require('discord.js');
const { clientId, token, mongoURI } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

// Function to connect to MongoDB
async function connectToMongo() {
    try {
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Error connecting to MongoDB', err);
        throw err;
    }
}

// Function to deploy global commands
async function deployGlobalCommands(commands) {
    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log(`Started refreshing ${commands.length} global application (/) commands`);

        // Deploy global commands
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} global application (/) commands`);
    } catch (error) {
        console.error('Error deploying global commands:', error);
        throw error;
    }
}

// Main function to deploy global commands
async function deployGlobalCommandsOnly() {
    try {
        await connectToMongo();

        // Load commands from files
        const commands = [];
        const foldersPath = path.join(__dirname, 'commands');
        const commandFolders = fs.readdirSync(foldersPath);

        for (const folder of commandFolders) {
            const commandsPath = path.join(foldersPath, folder);
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);

                if ('data' in command && 'execute' in command) {
                    commands.push(command.data);
                } else {
                    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            }
        }

        // Deploy global commands
        await deployGlobalCommands(commands);

        // Close the MongoDB connection after deploying commands
        await mongoose.connection.close();
        console.log('Closed MongoDB connection');
    } catch (error) {
        console.error('Error deploying global commands:', error);
    }
}

// Call the main function to deploy global commands
deployGlobalCommandsOnly();