const { Client, GatewayIntentBits } = require("discord.js");
const schedule = require("node-schedule");
const express = require("express");

const app = express();
app.get("/", (req, res) => res.send("Gang Wash Bot is alive!"));
app.listen(3000, () => console.log("🌐 Web server running..."));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Replace with actual user mentions
const gangMembers = [
  "<@222153000284717058>", // Connor
  "<@364841539626598414>", // Frenchie
  "<@192553728031719424>", // Moe
  "<@1087868902895255562>", // Tak
  "<@580483960413618188>", // Andreas
  "<@901862634532515860>", // Ernie
  "<@179998633092055041>", // Frank
  "<@652927651652042793>", // Loaded
  "<@700778810580402197>", // Maki
  "<@239122621961076737>", // OG Shariff
  "<@540417434457341972>", // Rico
  "<@192847925032779776>", // Throck
];

let selectedMembers = [];
let currentMember = null;
const washChannelId = "1358603838915088595"; // Replace with your channel ID

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // 2:37 AM EDT (6:37 UTC)
  schedule.scheduleJob("37 6 * * *", () => {
    sendWashMessage("3 AM");
  });

  // 2:37 PM EDT (18:37 UTC)
  schedule.scheduleJob("37 18 * * *", () => {
    sendWashMessage("3 PM");
  });
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  console.log(`Received message from ${message.author.tag}: "${message.content}"`);

  // Test command
  if (message.content.toLowerCase() === "!test") {
    sendWashMessage("3 AM");
    message.channel.send("💸 Test message sent!");
  }

  // Show queue
  if (message.content.toLowerCase() === "!queue") {
    const remaining = gangMembers.filter(m => !selectedMembers.includes(m));
    message.channel.send(
      `🧼 **Wash Queue** 🧼\n\n**Selected:**\n${selectedMembers.join("\n") || "None yet"}\n\n**Remaining:**\n${remaining.join("\n") || "All done!"}`
    );
  }

  // Admin-only reset
  if (message.content.toLowerCase() === "!reset") {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ You don't have permission to reset.");
    }
    selectedMembers = [];
    currentMember = null;
    message.channel.send("🔄 The gang washing cycle has been reset!");
  }

  // Handle yes/no responses
  if (currentMember && message.content.toLowerCase() === "no" && message.mentions.has(client.user)) {
    message.channel.send(`${message.author.tag} said no. Trying another member...`);
    sendWashMessage("Retry");
  }

  if (currentMember && message.content.toLowerCase() === "yes" && message.mentions.has(client.user)) {
    message.channel.send(`${message.author.tag} will wash today! 💸`);
    currentMember = null;
  }
});

// Sends the wash message
function sendWashMessage(timeSlot) {
  const channel = client.channels.cache.get(washChannelId);

  if (!channel) {
    console.error("❌ Channel not found.");
    return;
  }

  const availableMembers = gangMembers.filter((member) => !selectedMembers.includes(member));

  if (availableMembers.length === 0) {
    selectedMembers = [];
    channel.send("♻️ Everyone has had a turn! The cycle has been reset.");
    return sendWashMessage(timeSlot); // Start new round
  }

  const randomIndex = Math.floor(Math.random() * availableMembers.length);
  const selectedMember = availableMembers[randomIndex];
  selectedMembers.push(selectedMember);
  currentMember = selectedMember;

  channel.send(
    `💸 **Gang Washing Turn** 💸\n\n🧼 **Will you wash today?**\n\nHey ${selectedMember}, will you wash 1.5 million at ${timeSlot}? Tag me and reply with **yes** or **no**.`
  );
}

client.login(process.env.token);
