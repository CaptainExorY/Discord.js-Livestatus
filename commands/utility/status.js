const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');
const Guild = require('../../models/guildModel');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Manage bot status messages')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a bot status message to this channel')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove the bot status message from this channel')
        ),
    async execute(interaction) {
        try {
            const subCommand = interaction.options.getSubcommand();

            if (subCommand === 'add') {
                const guildId = interaction.guild.id;
                const channelId = interaction.channel.id;

                // Send the initial status embed and save its ID to the guild settings
                const initialMessage = await interaction.channel.send({ content: 'Loading bot status...', ephemeral: true });
                const initialDbMessage = await interaction.channel.send({ content: 'Loading db status...', ephemeral: true });
                const messageId = initialMessage.id;
                const dbMessageId = initialDbMessage.id;

                await Guild.findOneAndUpdate(
                    { key: guildId },
                    { 'settings.statusId': messageId, 'settings.statusIdDb': dbMessageId, 'settings.statusChannelId': channelId },
                    { upsert: true }
                );

                // Respond with an ephemeral message
                await interaction.reply({ content: 'Bot status message added!', ephemeral: true });
            } else if (subCommand === 'remove') {
                const guildId = interaction.guild.id;

                // Retrieve the guild settings and remove the status message IDs
                const guildSettings = await Guild.findOne({ key: guildId });

                if (!guildSettings || !guildSettings.settings.statusId) {
                    return interaction.reply({ content: 'Bot status message not found!', ephemeral: true });
                }

                const statusChannelId = guildSettings.settings.statusChannelId;
                const statusId = guildSettings.settings.statusId;
                const statusIdDb = guildSettings.settings.statusIdDb;

                // Delete the bot status message from the channel
                const statusChannel = await interaction.guild.channels.resolve(statusChannelId);
                const statusMessage = await statusChannel.messages.fetch(statusId);
                
                const dbMessage = await statusChannel.messages.fetch(statusIdDb);

                if (statusMessage) {
                    await statusMessage.delete();
                }
                if (dbMessage) {
                    await dbMessage.delete();
                }

                // Remove the status message IDs from the guild settings
                guildSettings.settings.statusId = null;
                guildSettings.settings.statusIdDb = null;
                guildSettings.settings.statusChannelId = null;

                await guildSettings.save();

                // Respond with an ephemeral message
                await interaction.reply({ content: 'Bot status message removed!', ephemeral: true });
            }
        } catch (error) {
            console.error('Error during command execution:', error);
            return interaction.reply({ content: 'An error occurred during command execution.', ephemeral: true });
        }
    },
};