const Guild = require('../models/guildModel');
const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const os = require('os');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');

// Function to fetch the status information
const fetchStatus = async () => {
    const botStatus = '> Online'; // Placeholder for bot status

    const websiteStatus = await fetchWebsiteStatus();
    
    const docsStatus = await fetchDocsStatus();
    
    const ramUsage = await fetchRamUsage();
    
    const apiStatus = await fetchApiStatus();

    const databaseStatus = await fetchDatabaseStatus();
    
    const mariaDBStatus = await fetchMariaDBStatus();

     // Calculate server uptime
    const uptime = os.uptime();
    const serverUptime = formatUptime(uptime);

    return { botStatus, websiteStatus, docsStatus, ramUsage, databaseStatus, mariaDBStatus, apiStatus, serverUptime };
};

// Function to fetch website status
const fetchWebsiteStatus = async () => {
    try {
        const startTime = Date.now();
        const response = await fetch('https://your-url-to-check.de/'); //change it to your desired URL
        const endTime = Date.now();
        const latency = endTime - startTime;
        const httpStatus = response.status;
        return {
            status: response.ok ? 'Online <a:green_dota:1228131258815746130>' : 'Offline <a:red_dota:1228131551334895686>',
            latency: latency,
            httpStatus: httpStatus
        };
    } catch (error) {
        console.error('Error fetching website status:', error);
        return {
            status: 'Offline',
            latency: null,
            httpStatus: null
        };
    }
};

const fetchDocsStatus = async () => {
    try {
        const startTime = Date.now();
        const response = await fetch('https://your-url-to-check.de/'); //change it to your desired URL
        const endTime = Date.now();
        const latency = endTime - startTime;
        const httpStatus = response.status;
        return {
            status: response.ok ? '           Online' : 'Offline <a:red_dota:1228131551334895686>',
            latency: latency,
            httpStatus: httpStatus
        };
    } catch (error) {
        console.error('Error fetching website status:', error);
        return {
            status: 'Offline',
            latency: null,
            httpStatus: null
        };
    }
};

const formatUptime = (uptime) => {
    const days = Math.floor(uptime / (60 * 60 * 24));
    const hours = Math.floor(uptime / (60 * 60)) % 24;
    const minutes = Math.floor(uptime / 60) % 60;
    const seconds = Math.floor(uptime % 60);

    return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
};

// Function to fetch the bot's RAM usage asynchronously
const fetchRamUsage = async () => {
    return new Promise((resolve, reject) => {
        try {
            // Get memory usage statistics
            const memoryUsage = process.memoryUsage();
            
            // Convert bytes to megabytes for easier readability
            const rss = Math.round(memoryUsage.rss / 1024 / 1024);
            const heapTotal = Math.round(memoryUsage.heapTotal / 1024 / 1024);
            const heapUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024);
            const external = Math.round(memoryUsage.external / 1024 / 1024);

            resolve({ rss, heapTotal, heapUsed, external });
        } catch (error) {
            reject(error);
        }
    });
};

const fetchApiStatus = async () => {
    try {
        const startTime = Date.now();
        // Make a request to your API endpoint
        const response = await fetch('https://your-api.de/api'); //The api has to return status: Online in the response Body or this will not work, this is custom for my api.
        const endTime = Date.now();
        const latency = endTime - startTime;
        const httpStatus = response.status;
        // Assuming your API returns JSON data with status information
        const data = await response.json();
        const status = data.status; // Assuming your API response includes a field named "status" indicating the status
        return {
            status: status,
            latency: latency,
            httpStatus: httpStatus
        };
    } catch (error) {
        console.error('Error fetching API status:', error);
        return {
            status: 'Offline',
            latency: null,
            httpStatus: null
        };
    }
};

const bytesToKB = (bytes) => {
    return (bytes / 1024).toFixed(2) + ' KB';
};

const bytesToMB = (bytes) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const bytesToGB = (bytes) => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

// Variable to store previous reads and writes counts
let previousReads = 0;
let previousWrites = 0;

const fetchDatabaseStatus = async () => {
    try {
        // Check if MongoDB is connected
        const isConnected = mongoose.connection.readyState === 1;

        // Get database statistics if connected
        let stats = {};
        if (isConnected) {
            // Get database statistics
            stats = await mongoose.connection.db.stats();

            // Convert sizes to KB, MB, or GB
            stats.dataSize = bytesToMB(stats.dataSize);
            stats.storageSize = bytesToMB(stats.storageSize);
            stats.indexSize = bytesToMB(stats.indexSize);
            stats.totalSize = bytesToMB(stats.totalSize);
            stats.fsUsedSize = bytesToGB(stats.fsUsedSize);
            stats.fsTotalSize = bytesToGB(stats.fsTotalSize);

            // Get additional statistics for reads and writes
            const serverStatus = await mongoose.connection.db.admin().serverStatus();
            const { opcounters } = serverStatus;

            // Calculate reads and writes since the last check
            const currentReads = opcounters.query;
            const currentWrites = opcounters.insert + opcounters.update + opcounters.delete;

            // Calculate difference in reads and writes since last check
            stats.readsSinceLastCheck = currentReads - previousReads;
            stats.writesSinceLastCheck = currentWrites - previousWrites;

            // Update previous reads and writes counts
            previousReads = currentReads;
            previousWrites = currentWrites;
             //console.log(serverStatus);
        }
        return { isConnected, stats };
    } catch (error) {
        console.error('Error fetching database status and stats:', error);
        return { isConnected: false, stats: {} };
    }
};

// Function to fetch database status
const fetchMariaDBStatus = async () => {
    try {
        // Create a connection to the MariaDB database
        const connectionInfo = {
            host: '',
            user: '',
            password: '',
            database: ''
        };
        
        const connection = await mysql.createConnection(connectionInfo);

        // Execute a query to fetch database statistics
        const [rows] = await connection.execute('SHOW STATUS');

        // Close the connection
        await connection.end();

        // Process the query result and extract relevant information
        const stats = {};
        
        // Extract relevant status information from the query result
        rows.forEach(row => {
            stats[row.Variable_name] = row.Value;
        });
        //console.log(stats);
        return { isConnected: true, connectionInfo, stats };
    } catch (error) {
        console.error('Error fetching database status:', error);
        return { isConnected: false, connectionInfo: {}, stats: {} };
    }
};

let lastImageUpdateTime = 0;

const generateRamUsageDiagram = async (ramUsage) => {
    const currentTime = Date.now(); // Get current time

    // Check if 5 minutes have elapsed since the last image update
    if (currentTime - lastImageUpdateTime < 4.5 * 60 * 1000) {
        return; // Skip image generation if not enough time has passed
    }

    // Update last image update time
    lastImageUpdateTime = currentTime;
    
    const filename = 'ram_usage.png'; // Specify the filename
    const legendWidth = 100; // Width of the legend
    const barWidth = 35; // Width of each bar
    const gap = 10; // Gap between bars

    const canvasHeight = 400; // Height of the canvas
    const canvasWidth = 300 + legendWidth; // Width of the canvas

    // Calculate maximum RAM usage among all properties
    const maxRamUsage = Math.max(ramUsage.heapUsed, ramUsage.rss, ramUsage.heapTotal, ramUsage.external);

    // Calculate scale factor for the bars
    const scaleFactor = (canvasHeight - 40) / maxRamUsage; // Leaving 20 pixels at the top

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Set background to white
    ctx.fillStyle = '#FFFFFF'; // White color
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw horizontal line above the image border at the bottom
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight - 20);
    ctx.lineTo(canvasWidth, canvasHeight - 20);
    ctx.strokeStyle = '#000000'; // Black color
    ctx.stroke();

    // Draw vertical line at the left side for RAM scale
    ctx.beginPath();
    ctx.moveTo(50, 20);
    ctx.lineTo(50, canvasHeight - 20);
    ctx.strokeStyle = '#000000'; // Black color
    ctx.stroke();

    // Draw scale on the left side
    ctx.fillStyle = '#000000'; // Black color
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('0 MB', 48, canvasHeight - 5);
    ctx.fillText(`${Math.ceil(maxRamUsage)} MB`, 48, 22);

    // Draw reference points on the vertical line
    const referencePoints = [0.25, 0.5, 0.75]; // Define reference points as fractions of the maximum value
    referencePoints.forEach(point => {
        const yPos = (1 - point) * (canvasHeight - 40) + 20;
        ctx.beginPath();
        ctx.moveTo(45, yPos);
        ctx.lineTo(50, yPos);
        ctx.strokeStyle = '#CCCCCC'; // Light gray color
        ctx.stroke();
        ctx.fillText(`${Math.ceil(point * maxRamUsage)} MB`, 48, yPos + 2);
    });

    // Draw reference lines
    ctx.beginPath();
    ctx.moveTo(50, 20);
    ctx.lineTo(canvasWidth - legendWidth, 20);
    ctx.strokeStyle = '#CCCCCC'; // Light gray color
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(50, (canvasHeight - 20) / 4 + 20);
    ctx.lineTo(canvasWidth - legendWidth, (canvasHeight - 20) / 4 + 20);
    ctx.strokeStyle = '#CCCCCC'; // Light gray color
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(50, (canvasHeight - 20) / 2 + 20);
    ctx.lineTo(canvasWidth - legendWidth, (canvasHeight - 20) / 2 + 20);
    ctx.strokeStyle = '#CCCCCC'; // Light gray color
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(50, 3 * (canvasHeight - 20) / 4 + 20);
    ctx.lineTo(canvasWidth - legendWidth, 3 * (canvasHeight - 20) / 4 + 20);
    ctx.strokeStyle = '#CCCCCC'; // Light gray color
    ctx.stroke();

    // Calculate bar heights
    const heapUsedHeight = ramUsage.heapUsed * scaleFactor;
    const rssHeight = ramUsage.rss * scaleFactor;
    const heapTotalHeight = ramUsage.heapTotal * scaleFactor;
    const externalHeight = ramUsage.external * scaleFactor;

    // Draw Heap Used bar
    ctx.fillStyle = '#00FF00'; // Green color
    ctx.fillRect(gap + 50, canvasHeight - 20 - heapUsedHeight, barWidth, heapUsedHeight);

    // Draw RSS bar
    ctx.fillStyle = '#0000FF'; // Blue color
    ctx.fillRect(2 * gap + barWidth + 50, canvasHeight - 20 - rssHeight, barWidth, rssHeight);

    // Draw Heap Total bar
    ctx.fillStyle = '#00FFFF'; // Cyan color
    ctx.fillRect(3 * gap + 2 * barWidth + 50, canvasHeight - 20 - heapTotalHeight, barWidth, heapTotalHeight);

    // Draw External bar
    ctx.fillStyle = '#FFFF00'; // Yellow color
    ctx.fillRect(4 * gap + 3 * barWidth + 50, canvasHeight - 20 - externalHeight, barWidth, externalHeight);

    // Draw legend
    ctx.fillStyle = '#000000'; // Black color for legend text
    ctx.font = '12px Arial';
    ctx.fillText('Heap Used    ', canvasWidth + 10, 20);
    ctx.fillStyle = '#00FF00'; // Green color
    ctx.fillRect(canvasWidth - 80, 10, 10, 10);
    ctx.fillStyle = '#000000';
    ctx.fillText('RSS    ', canvasWidth + 10, 40);
    ctx.fillStyle = '#0000FF'; // Blue color
    ctx.fillRect(canvasWidth - 80, 30, 10, 10);
    ctx.fillStyle = '#000000';
    ctx.fillText('Heap Total    ', canvasWidth + 10, 60);
    ctx.fillStyle = '#00FFFF'; // Cyan color
    ctx.fillRect(canvasWidth - 80, 50, 10, 10);
    ctx.fillStyle = '#000000';
    ctx.fillText('External    ', canvasWidth + 10, 80);
    ctx.fillStyle = '#FFFF00'; // Yellow color
    ctx.fillRect(canvasWidth - 80, 70, 10, 10);
    
    // Add creation date and time in the top right corner
    ctx.fillStyle = '#000000'; // Black color
    ctx.fillText(new Date().toLocaleString('de-DE'), canvasWidth + 0, 10);

    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');

    // Write buffer data to the file (override existing file)
    fs.writeFileSync(filename, buffer);

    //console.log(`PNG file generated: ${filename}`);

    return buffer; // Return buffer in case it's needed elsewhere
};

const generateStatusEmbed = (status, lastOutageTimestamp, imageUrl) => {
    // Define the fields for website status
    const websiteFields = [
        { name: '> **Homepage**', value: 'Loading...' },
        { name: '> **Docs**', value: 'Loading...' },
        { name: '> **API**', value: 'Loading...' }
    ];
    
    // Consolidate RAM usage fields into one field
    const ramField = {
        name: '**Memory Usage:**',
        value: `> **External:**                                  \`${status.ramUsage.external} MB\`\n> **Heap Used:**                           \`${status.ramUsage.heapUsed} MB\`\n> **Heap Total:**                           \`${status.ramUsage.heapTotal} MB\`\n > **RSS (Resident Set Size):** \`${status.ramUsage.rss} MB\`\n`,
        inline: false
    };
    
    const databaseStatus = status.databaseStatus;
const formattedDatabaseStatus = `
> **Connected**: \`${databaseStatus.isConnected}\`
> **DB**: ||${databaseStatus.stats.db}||
> **Collections**: \`${databaseStatus.stats.collections}\`
> **Views**: \`${databaseStatus.stats.views}\`
> **Objects**: \`${databaseStatus.stats.objects}\`
> **Average Object Size**: \`${databaseStatus.stats.avgObjSize.toFixed(2)}\`
> **Data Size**: \`${databaseStatus.stats.dataSize}\`
> **Storage Size**: \`${databaseStatus.stats.storageSize}\`
> **Indexes**: \`${databaseStatus.stats.indexes}\`
> **Index Size**: \`${databaseStatus.stats.indexSize}\`
> **Total Size**: \`${databaseStatus.stats.totalSize}\`
> **FS Used Size**: \`${databaseStatus.stats.fsUsedSize}\`
> **FS Total Size**: \`${databaseStatus.stats.fsTotalSize}\`
> **Read-Operations**: \`${databaseStatus.stats.readsSinceLastCheck}\`
> **Write-Operations**: \`${databaseStatus.stats.writesSinceLastCheck}\`
`;

    const locales = {
        'en-US': {
            title: 'Service Status',
            url: 'https://url.statuspage.io/',
            image: { url: 'attachment://ram_usage.png' },
            //thumbnail: { url: 'https://i.gyazo.com/0301a3078536695875249caaeb60b11e.png' },
            description: 'Status information about the bot, website, and database.',
            
            fields: [
                { name: 'Bot:', value: status.botStatus },
                //ramField,
                { name: 'Website:', value: 'Loading...', inline: false }, // Placeholder for website status
                { name: 'Database:', value: formattedDatabaseStatus },
                { name: 'Last update:', value: `> <t:${Math.floor(new Date().getTime() / 1000)}:R>
                `, inline: true },
                { name: 'Last outage:', value: `> <t:${Math.floor(new Date().getTime() / 1000)}:R>
                `, inline: true },
                { 
  name: 'Server Uptime:', 
  value: `> \`${formatUptime(os.uptime())}\``, 
  inline: true },
 ramField
            ],
            timestamp: new Date(),
        }
    };

    // Default to 'en-US'
    const userLocale = 'en-US';
    const response = locales[userLocale];

    // Update the website status fields based on the language
    if (response) {
        if (status.websiteStatus) {
            websiteFields[0].value = `${status.websiteStatus.status} \`(${status.websiteStatus.httpStatus} | ${status.websiteStatus.latency}ms)\``;
            websiteFields[0].status = status.websiteStatus.status; // Add status property to the field object
        }
        if (status.docsStatus) {
            websiteFields[1].value = `${status.docsStatus.status} \`(${status.docsStatus.httpStatus} | ${status.docsStatus.latency}ms)\``;
            websiteFields[1].status = status.docsStatus.status; // Add status property to the field object
        }
        if (status.apiStatus) {
            websiteFields[2].value = `${status.apiStatus.status} \`(${status.apiStatus.httpStatus} | ${status.apiStatus.latency}ms)\``;
            websiteFields[2].status = status.apiStatus.status; // Add status property to the field object
        }
        response.fields[1].value = websiteFields.map(field => `${field.name}: ${field.value}`).join('\n');
    response.footer = {
            text: 'Service Status - Updated Every Minute',
            icon_url: '' // Replace with your icon URL
        };
        response.timestamp = new Date(); // Update the timestamp
    }
   // Update the timestamp with the last outage timestamp
    response.fields[4].value = `> <t:${lastOutageTimestamp}:R>`;
    // Change embed color based on website status
    if (response && response.fields[1].value.includes('Offline')) {
        response.color = 0xFF0000; // Red color for offline status
    } else {
        response.color = 0x00FF99; // Default color
    }
    

    return response ? response : locales['en-US'];
};

const generateDBStatusEmbed = (status) => {
    const uptimeInSeconds = status.mariaDBStatus.stats.Uptime;
    const uptimeInMinutes = uptimeInSeconds / 60;
    const queriesPerSecond = status.mariaDBStatus.stats.Queries / uptimeInSeconds;

    const locales = {
        'en-US': {
            title: 'MySQL Status',
            url: 'https://url.statuspage.io/',
            description: 'Status information about the MySQL database.',
            fields: [
                { name: 'MySQL Database:', 
                  value: `> **Online:** \n` +
                  `> **Threads Connected:** \`${status.mariaDBStatus.stats.Threads_connected}\`\n` +
                         `> **Threads Running:** \`${status.mariaDBStatus.stats.Threads_running}\`\n` +
                         `> **Threads Cached:** \`${status.mariaDBStatus.stats.Threads_cached}\`\n` +
                         `> **Uptime:** \`${uptimeInMinutes.toFixed(2)} minutes\`\n` +
                         `> **Questions:** \`${status.mariaDBStatus.stats.Questions}\`\n` +
                         `> **Queries per Second (Avg):** \`${queriesPerSecond.toFixed(2)}\`\n` +
                         `> **Bytes Received:** \`${status.mariaDBStatus.stats.Bytes_received}\`\n` +
                         `> **Bytes Sent:** \`${status.mariaDBStatus.stats.Bytes_sent}\`\n` +
                         `> **InnoDB Buffer Pool Read Requests:** \`${status.mariaDBStatus.stats.Innodb_buffer_pool_read_requests}\`\n` +
                         `> **InnoDB Buffer Pool Reads:** \`${status.mariaDBStatus.stats.Innodb_buffer_pool_reads}\`\n` +
                         `> **InnoDB Buffer Pool Wait Free:** \`${status.mariaDBStatus.stats.Innodb_buffer_pool_wait_free}\`\n` +
                         `> **InnoDB Buffer Pool Write Requests:** \`${status.mariaDBStatus.stats.Innodb_buffer_pool_write_requests}\`\n` +
                         `> **InnoDB Data Reads:** \`${status.mariaDBStatus.stats.Innodb_data_reads}\`\n` +
                         `> **InnoDB Data Writes:** \`${status.mariaDBStatus.stats.Innodb_data_writes}\`\n` +
                         `> **InnoDB Data Fsyncs:** \`${status.mariaDBStatus.stats.Innodb_data_fsyncs}\`\n` +
                         `> **InnoDB Log Writes:** \`${status.mariaDBStatus.stats.Innodb_log_writes}\`\n` +
                         `> **InnoDB Rows Read:** \`${status.mariaDBStatus.stats.Innodb_rows_read}\`\n` +
                         `> **InnoDB Rows Inserted:** \`${status.mariaDBStatus.stats.Innodb_rows_inserted}\`\n` +
                         `> **InnoDB Rows Updated:** \`${status.mariaDBStatus.stats.Innodb_rows_updated}\`\n` +
                         `> **InnoDB Rows Deleted:** \`${status.mariaDBStatus.stats.Innodb_rows_deleted}\`\n`
                },
            ],
            timestamp: new Date(),
        }
    };

    const userLocale = 'en-US';
    const response = locales[userLocale];

    if (response) {
        response.footer = {
            text: 'Service Status - Updated Every Minute',
            icon_url: '' 
        };
        response.timestamp = new Date(); 
    }
    
    return response ? response : locales['en-US'];
};

const updateStatusMessage = async (client, guildId) => {
    try {
        const guildSettings = await Guild.findOne({ key: guildId });
        
        if (!guildSettings) {
            return;
        }
        
        const lastOutageTimestamp = guildSettings.settings.lastOutageTimestamp;

        const statusChannelId = guildSettings.settings.statusChannelId;
        if (!statusChannelId) {
            return;
        }

        const statusId = guildSettings.settings.statusId;
        if (!statusId) {
            return;
        }
        
        const statusIdDb = guildSettings.settings.statusIdDb;
        if (!statusIdDb) {
            return;
        }

        const channel = await client.channels.fetch(statusChannelId);
        if (!channel || channel.type !== 0) {
            console.log(`Channel with ID ${statusChannelId} is not a text channel.`);
            return;
        }

        const message = await channel.messages.fetch(statusId);
        if (!message) {
            console.log(`Message with ID ${statusId} not found in channel ${channel.name}.`);
            return;
        }
        const dbMessage = await channel.messages.fetch(statusIdDb);
        if (!dbMessage) {
            console.log(`Message with ID ${statusIdDb} not found in channel ${channel.name}.`);
            return;
        }
 
        const status = await fetchStatus();
        
        console.log(status);
        
        const isOutage = status.websiteStatus.status === 'Offline <a:red_dota:1228131551334895686>' || status.docsStatus.status === 'Offline' || status.apiStatus.status === 'Offline <a:red_dota:1228131551334895686>';

        // Update the database with the current timestamp if there's an outage
        if (isOutage) {
            // Save the unix timestamp of the outage
            const unixTimestamp = Math.floor(new Date().getTime() / 1000);
            await Guild.findOneAndUpdate({ key: guildId }, { 'settings.lastOutageTimestamp': unixTimestamp });
        }
      
        const embed = generateStatusEmbed(status, lastOutageTimestamp);
        const dbEmbed = generateDBStatusEmbed(status);
        const ramUsage = status.ramUsage;
        // Generate RAM usage diagram
        const diagramBuffer = await generateRamUsageDiagram(ramUsage);
        const attachment = new AttachmentBuilder('ram_usage.png', diagramBuffer); // Create attachment
        embed.image = { url: 'attachment://ram_usage.png' }; // Attach the image to the embed
        await message.edit({ content: '', embeds: [embed, dbEmbed], files: [attachment] });
        await dbMessage.edit({ content: '', embeds: [dbEmbed]});
    } catch (error) {
        console.error('Error updating status message:', error);
    }
};

module.exports = { updateStatusMessage };
