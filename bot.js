// Gang Washing Discord Bot with Scheduled Messages, Buttons, Partial Wash Handling, and Dynamic Amount Input

const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
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
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
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
  "<@192847925032779776>", // Throck
];

let selectedMembers = [];
let currentWashingAmount = 0;
let currentRequiredAmount = 1500000;
let washingMessage = null;

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  schedule.scheduleJob("10 14 * * *", () => startWashingCycle("3:00 PM")); // 10:10 AM EDT
  schedule.scheduleJob("10 2 * * *", () => startWashingCycle("5:00 AM")); // 10:10 PM EDT
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

  if (message.content.toLowerCase().startsWith("!washed")) {
    const match = message.content.match(/<@!?(\d+)>/);
    if (!match) return message.reply("❌ Please mention a user to mark as washed.");
    const userId = `<@${match[1]}>`;
    if (!selectedMembers.includes(userId)) selectedMembers.push(userId);
    message.reply(`✅ ${userId} has been manually added to the selected list.`);
  }

  if (message.content.toLowerCase() === "!reset" && message.member.permissions.has("Administrator")) {
    selectedMembers = [];
    message.channel.send("🔄 Washing queue has been reset!");
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    const userId = `<@${interaction.user.id}>`;

    if (interaction.customId === "yes") {
      const modal = new ModalBuilder()
        .setCustomId("amount_modal")
        .setTitle("How Much Will You Wash?");

      const input = new TextInputBuilder()
        .setCustomId("wash_amount")
        .setLabel("Enter amount (e.g., 700000)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
    } else if (interaction.customId === "no") {
      await interaction.reply({ content: `${userId} can't wash. Trying someone else...`, ephemeral: true });
      startWashingCycle("Retry");
    }
  } else if (interaction.isModalSubmit()) {
    if (interaction.customId === "amount_modal") {
      const userId = `<@${interaction.user.id}>`;
      const input = interaction.fields.getTextInputValue("wash_amount");
      const amount = parseInt(input);
      if (isNaN(amount) || amount <= 0) {
        return interaction.reply({ content: "❌ Invalid amount entered.", ephemeral: true });
      }

      currentWashingAmount += amount;
      if (!selectedMembers.includes(userId)) selectedMembers.push(userId);

      if (currentWashingAmount < currentRequiredAmount) {
        await interaction.reply(`${userId} is washing $${amount.toLocaleString()}. 💸 Still need $${(currentRequiredAmount - currentWashingAmount).toLocaleString()} more!`);
        askForMore();
      } else {
        await interaction.reply(`✅ Washing fully covered! Total: $${currentWashingAmount.toLocaleString()}`);
        resetWashCycle();
      }
    }
  }
});

function startWashingCycle(washTimeLabel) {
  const channel = client.channels.cache.get("1358603838915088595"); // Replace with your channel ID
  if (!channel) return console.error("Channel not found.");

  const available = gangMembers.filter((m) => !selectedMembers.includes(m));
  if (available.length === 0) selectedMembers = [], available.push(...gangMembers);
  const selected = available[Math.floor(Math.random() * available.length)];
  selectedMembers.push(selected);

  currentWashingAmount = 0;
  currentRequiredAmount = 1500000;

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("yes").setLabel("Yes - I'll Wash").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("no").setLabel("No").setStyle(ButtonStyle.Danger)
  );

  const content = `💸 **Gang Washing Time** 💸\n\n${selected}, can you wash **$1.5M** for the **${washTimeLabel}** slot?\nClick below:`;
  channel.send({ content, components: [buttons] }).then((msg) => (washingMessage = msg));
}

function askForMore() {
  const channel = client.channels.cache.get("1358603838915088595");
  if (!channel) return;
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("yes").setLabel("I'll Wash the Rest").setStyle(ButtonStyle.Primary)
  );

  const content = `💰 Still need $${(currentRequiredAmount - currentWashingAmount).toLocaleString()} to be washed!\nWho can help finish it?`;
  channel.send({ content, components: [buttons] });
}

function resetWashCycle() {
  currentWashingAmount = 0;
  washingMessage = null;
}

client.login(process.env.token);
