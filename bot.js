    const { Client, GatewayIntentBits } = require("discord.js");
    const schedule = require("node-schedule");
    const express = require("express");

    // Setup express to keep Replit awake
    const app = express();
    app.get("/", (req, res) => res.send("Gang Wash Bot is alive!"));
    app.listen(3000, () => console.log("Web server running..."));

    // Initialize the bot
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    });

    // Your gang members – replace with real Discord user IDs
    const gangMembers = [
      "<@222153000284717058>", //Connor
      "<@364841539626598414>", //Frenchie
      "<@192553728031719424>", //Moe
      "<@1087868902895255562>", //Tak
      "<@580483960413618188>", //Andreas
      "<@901862634532515860>", //Ernie
      "<@179998633092055041>", //Frank
      "<@652927651652042793>", //Loaded
      "<@700778810580402197>", //Maki
      "<@239122621961076737>", //OG Shariff
      "<@540417434457341972>", //Rico
      "<@192847925032779776>", //Throck
    ];

    // Keeps track of who has already been selected
    let selectedMembers = [];

    // Initialize the bot when it's ready
    client.once("ready", () => {
      console.log(`✅ Logged in as ${client.user.tag}`);

      // Schedule #1 – 12 AM EST (5 AM UTC) – asking about 5 AM wash
      schedule.scheduleJob("0 6 * * *", () => {
        sendWashMessage("5 AM");
      });

      // Schedule #2 – 12 PM EST (3 PM UTC) – asking about 3 PM wash
      schedule.scheduleJob("0 18 * * *", () => {
        sendWashMessage("3 PM");
      });
    });

    // Listen for messages to trigger the !test command
    client.on("messageCreate", (message) => {
      console.log(`Received message from ${message.author.tag}: "${message.content}"`);

      // Check if the bot was mentioned
      if (message.content.includes(client.user.id)) {
        console.log(`Bot was mentioned by ${message.author.tag}`);
      }

      if (message.content.toLowerCase() === "!test") {
        console.log('Test command received');
        sendWashMessage("5 AM"); // Test for 5 AM
        message.channel.send("💸 Test message sent for 5 AM! 💸");
      }

      // Handle responses to the Gang Wash message
      if (selectedMembers.includes(message.author.id)) {
        console.log(`Handling response from ${message.author.tag}: "${message.content}"`);
        if (message.content.toLowerCase() === "yes") {
          message.channel.send(`${message.author.tag} will wash today! 💸`);
        } else if (message.content.toLowerCase() === "no") {
          message.channel.send(`${message.author.tag} said no. Trying another member...`);
          sendWashMessage(message.content.includes("5 AM") ? "5 AM" : "3 PM"); // Retry with the same time slot
        }
      }
    });

    // Send wash message
    function sendWashMessage(timeSlot) {
      const channel = client.channels.cache.get("1358603838915088595"); // Replace with your channel ID

      if (!channel) {
        console.error("❌ Channel not found.");
        return;
      }

      // Ensure we don't repeat members in a single day
      const availableMembers = gangMembers.filter(
        (member) => !selectedMembers.includes(member)
      );

      // If everyone has been selected, reset the selectedMembers array
      if (availableMembers.length === 0) {
        selectedMembers = [];
      }

      // Randomly pick the member for this round
      const randomIndex = Math.floor(Math.random() * availableMembers.length);
      const selectedMember = availableMembers[randomIndex];

      // Add the selected member to the selectedMembers array
      selectedMembers.push(selectedMember);

      // Ask the selected member if they will wash
      const message = `💸 **Gang Washing Turn** 💸\n\n🧼 **Will you wash today?**\n\nHey ${selectedMember}, will you wash 1.5 million at ${timeSlot}? Reply with **yes** or **no**.`;

      channel.send(message);
    }

    const token = process.env.token;
    client.login(token);
