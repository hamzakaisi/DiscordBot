// Gang Washing Discord Bot with Scheduled Messages, Buttons, Partial Wash Handling, and !queue Command

const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require("discord.js");
const schedule = require("node-schedule");
const express = require("express");
require("dotenv").config();

// Setup Express to keep the app alive
const app = express();
app.get("/", (req, res) => res.send("Gang Wash Bot is alive!"));
app.listen(3000, () => console.log("🌐 Web server running..."));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

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
  "<@192847925032779776>"  // Throck
];

let selectedMembers = [];
let currentWashingAmount = 0;
let currentRequiredAmount = 1500000;
let currentHelpers = [];
let washingMessage = null;

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Schedule messages at 2:37 AM and 2:37 PM EDT (6:37 UTC and 18:37 UTC)
  schedule.scheduleJob("45 13 * * *", () => {
    startWashingCycle("5:00 AM");
  });

  schedule.scheduleJob("45 1 * * *", () => {
    startWashingCycle("3:00 PM");
  });
});

client.on("messageCreate", async (message) => {
  if (message.content.toLowerCase() === "!test") {
    startWashingCycle("Test Run");
    message.channel.send("🧪 Test started.");
  }

  if (message.content.toLowerCase() === "!queue") {
    const remaining = gangMembers.filter((member) => !selectedMembers.includes(member));
    const response = `🧼 **Gang Washing Queue** 🧼\n\n` +
      `**Selected so far:**\n${selectedMembers.length > 0 ? selectedMembers.join("\n") : "None"}\n\n` +
      `**Still eligible:**\n${remaining.length > 0 ? remaining.join("\n") : "All have been selected. Queue will reset soon!"}`;
    message.channel.send(response);
  }

  if (message.content.toLowerCase() === "!reset" && message.member.permissions.has("Administrator")) {
    selectedMembers = [];
    message.channel.send("🔄 Washing queue has been reset!");
  }

  if (message.content.toLowerCase().startsWith("!washed") && message.member.permissions.has("Administrator")) {
    // Remove member from the list if they are mentioned
    const mentionedUser = message.mentions.users.first();
    if (!mentionedUser) {
      message.channel.send("❌ Please mention a valid user to remove from the wash cycle.");
      return;
    }

    const mentionedMember = `<@${mentionedUser.id}>`;
    if (selectedMembers.includes(mentionedMember)) {
      selectedMembers = selectedMembers.filter(member => member !== mentionedMember);
      message.channel.send(`✅ ${mentionedMember} has been removed from the wash cycle.`);
    } else {
      message.channel.send("❌ This user is not currently in the wash cycle.");
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const userId = `<@${interaction.user.id}>`;

  if (interaction.customId === "yes") {
    const amount = 500000; // You can customize to ask how much with modals or input
    currentWashingAmount += amount;
    if (!selectedMembers.includes(userId)) selectedMembers.push(userId);

    if (currentWashingAmount < currentRequiredAmount) {
      await interaction.reply(`${userId} is washing $${amount.toLocaleString()}. 💸 Still need $${(currentRequiredAmount - currentWashingAmount).toLocaleString()} more!`);
      askForMore();
    } else {
      await interaction.reply(`✅ Washing fully covered! Total: $${currentWashingAmount.toLocaleString()}`);
      resetWashCycle();
    }
  } else if (interaction.customId === "no") {
    await interaction.reply(`${userId} can't wash. Trying another member...`);
    startWashingCycle("Retry");
  }
});

function startWashingCycle(timeSlot) {
  const channel = client.channels.cache.get("1358603838915088595"); // Replace with your channel ID
  if (!channel) return console.error("Channel not found.");

  const available = gangMembers.filter((m) => !selectedMembers.includes(m));
  if (available.length === 0) selectedMembers = available;
  const selected = available[Math.floor(Math.random() * available.length)];
  selectedMembers.push(selected);

  currentWashingAmount = 0;
  currentHelpers = [];
  currentRequiredAmount = 1500000;

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("yes").setLabel("Yes - I'll Wash").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("no").setLabel("No").setStyle(ButtonStyle.Danger)
  );

  const content = `💸 **Gang Washing Time** 💸\n\n${selected}, can you wash **$1.5M** at **${timeSlot}**?\nClick below:`;
  channel.send({ content, components: [buttons] }).then((msg) => (washingMessage = msg));
}

function askForMore() {
  const channel = client.channels.cache.get("1358603838915088595");
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("yes").setLabel("I'll Wash the Rest").setStyle(ButtonStyle.Primary)
  );

  const content = `💰 Still need $${(currentRequiredAmount - currentWashingAmount).toLocaleString()} to be washed!\nWho can help finish it?`;
  channel.send({ content, components: [buttons] });
}

function resetWashCycle() {
  currentWashingAmount = 0;
  currentHelpers = [];
  washingMessage = null;
}

client.login(process.env.token);
