const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require("discord.js");
const schedule = require("node-schedule");
const express = require("express");
require("dotenv").config();

// Express keepalive
const app = express();
app.get("/", (req, res) => res.send("Gang Wash Bot is online!"));
app.listen(3000, () => console.log("🌐 Express server started"));

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
  "<@239122621961076737>", // OG Sharif
  "<@540417434457341972>", // Rico
  "<@192847925032779776>"  // Throck
];

let selectedMembers = [];
let currentWashingAmount = 0;
let currentRequiredAmount = 1500000;
let washingMessage = null;

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // ⏰ Schedule for 10:10 AM EDT (14:10 UTC)
  schedule.scheduleJob("10 14 * * *", () => startWashingCycle("10:10 AM"));
  // ⏰ Schedule for 10:10 PM EDT (2:10 UTC next day)
  schedule.scheduleJob("10 2 * * *", () => startWashingCycle("10:10 PM"));
});

client.on("messageCreate", async (message) => {
  const content = message.content.toLowerCase();

  if (content === "!test") {
    startWashingCycle("Test Run");
    message.channel.send("🧪 Test started.");
  }

  if (content === "!queue") {
    const remaining = gangMembers.filter((m) => !selectedMembers.includes(m));
    const response =
      `🧼 **Gang Washing Queue** 🧼\n\n` +
      `**Selected so far:**\n${selectedMembers.length > 0 ? selectedMembers.join("\n") : "None"}\n\n` +
      `**Still eligible:**\n${remaining.length > 0 ? remaining.join("\n") : "All have been selected. Queue will reset soon!"}`;
    message.channel.send(response);
  }

  if (content.startsWith("!washed")) {
    if (!message.member.permissions.has("Administrator")) {
      return message.channel.send("❌ You do not have permission to use this command.");
    }
    const target = message.mentions.users.first();
    if (!target) return message.channel.send("❌ Please mention a user.");
    const targetMention = `<@${target.id}>`;

    if (gangMembers.includes(targetMention)) {
      if (!selectedMembers.includes(targetMention)) {
        selectedMembers.push(targetMention);
        return message.channel.send(`✅ ${targetMention} has been marked as washed and added to the selected list.`);
      } else {
        return message.channel.send(`⚠️ ${targetMention} is already in the selected list.`);
      }
    } else {
      return message.channel.send("❌ This user is not in the gang wash cycle.");
    }
  }

  if (content === "!reset") {
    if (!message.member.permissions.has("Administrator")) {
      return message.channel.send("❌ You do not have permission to use this command.");
    }
    selectedMembers = [];
    currentWashingAmount = 0;
    currentRequiredAmount = 1500000;
    washingMessage = null;
    message.channel.send("🔁 Gang wash cycle has been reset.");
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const userId = `<@${interaction.user.id}>`;

  if (interaction.customId === "yes") {
    const amount = 500000;
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
    await interaction.reply(`${userId} can't wash. Picking someone else...`);
    startWashingCycle("Retry");
  }
});

function startWashingCycle(timeSlot) {
  const channel = client.channels.cache.get("1358603838915088595"); // Replace with your channel ID
  if (!channel) return console.error("Channel not found.");

  const available = gangMembers.filter((m) => !selectedMembers.includes(m));
  if (available.length === 0) {
    selectedMembers = [];
    return channel.send("✅ All members have been cycled through. Queue has been reset.");
  }

  const selected = available[Math.floor(Math.random() * available.length)];
  selectedMembers.push(selected);
  currentWashingAmount = 0;
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
  if (!channel) return;

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("yes").setLabel("I'll Wash the Rest").setStyle(ButtonStyle.Primary)
  );

  const content = `💰 Still need $${(currentRequiredAmount - currentWashingAmount).toLocaleString()}!\nWho can help finish it?`;
  channel.send({ content, components: [buttons] });
}

function resetWashCycle() {
  selectedMembers = [];
  currentWashingAmount = 0;
  currentRequiredAmount = 1500000;
  washingMessage = null;
}

client.login(process.env.token);
