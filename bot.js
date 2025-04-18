const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const schedule = require("node-schedule");
const express = require("express");

// Setup express (optional for uptime)
const app = express();
app.get("/", (req, res) => res.send("Gang Wash Bot is alive!"));
app.listen(3000, () => console.log("🌐 Web server running..."));

// Initialize the bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

// Gang members (Mention format)
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

let selectedMembers = [];
let currentSelectedMember = null; // for tracking replies

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // 1 AM EDT = 5 AM UTC
  schedule.scheduleJob("0 7 * * *", () => {
    sendWashMessage("5 AM");
  });

  // 1 PM EDT = 17 UTC
  schedule.scheduleJob("0 19 * * *", () => {
    sendWashMessage("3 PM");
  });
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  // !test to manually trigger
  if (content === "!test") {
    sendWashMessage("Test");
    return message.channel.send("🧪 Test message sent!");
  }

  // !reset (admin only)
  if (content === "!reset") {
    const member = await message.guild.members.fetch(message.author.id);
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      selectedMembers = [];
      currentSelectedMember = null;
      console.log("🔁 Gang wash cycle reset by admin.");
      return message.channel.send("♻️ Cycle reset. All members are eligible again.");
    } else {
      return message.reply("🚫 Only admins can use this command.");
    }
  }

  // Yes/No response handling
  if (currentSelectedMember && message.author.toString() === currentSelectedMember) {
    if (content === "yes") {
      message.channel.send(`${message.author.tag} will wash today! 💸`);
      currentSelectedMember = null;
    } else if (content === "no") {
      message.channel.send(`${message.author.tag} said no. Trying someone else...`);
      currentSelectedMember = null;
      sendWashMessage("Retry");
    }
  }
});

// Sends the washing message
function sendWashMessage(timeSlot) {
  const channel = client.channels.cache.get("1358603838915088595"); // Replace with your channel ID

  if (!channel) {
    console.error("❌ Channel not found.");
    return;
  }

  const availableMembers = gangMembers.filter(
    (member) => !selectedMembers.includes(member)
  );

  if (availableMembers.length === 0) {
    selectedMembers = [];
  }

  const finalPool = gangMembers.filter(
    (member) => !selectedMembers.includes(member)
  );

  const randomIndex = Math.floor(Math.random() * finalPool.length);
  const selectedMember = finalPool[randomIndex];
  selectedMembers.push(selectedMember);
  currentSelectedMember = selectedMember;

  const message = `💸 **Gang Washing Turn** 💸\n\n🧼 Will you wash **1.5 million at ${timeSlot}**?\n\n${selectedMember}, reply with **yes** or **no**.`;

  channel.send(message);
}

const token = process.env.token;
client.login(token);
