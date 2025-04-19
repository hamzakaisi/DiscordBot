const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const schedule = require("node-schedule");
const express = require("express");
require("dotenv").config();

const app = express();
app.get("/", (req, res) => res.send("Gang Wash Bot is alive!"));
app.listen(3000, () => console.log("🌐 Web server running..."));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
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

  // Schedule: 10:10 AM EDT → 14:10 UTC | 10:10 PM EDT → 02:10 UTC
  schedule.scheduleJob("10 14 * * *", () => startWashingCycle("3 PM"));
  schedule.scheduleJob("10 2 * * *", () => startWashingCycle("5 AM"));
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

  if (message.content.toLowerCase().startsWith("!washed") && message.member.permissions.has("Administrator")) {
    const mention = message.mentions.members.first();
    if (!mention) return message.reply("❌ Please mention someone.");

    const idTag = `<@${mention.id}>`;
    if (!gangMembers.includes(idTag)) return message.reply("❌ This user is not in the gang list.");

    if (!selectedMembers.includes(idTag)) {
      selectedMembers.push(idTag);
      return message.reply(`✅ ${idTag} was marked as already washed this cycle.`);
    } else {
      return message.reply(`ℹ️ ${idTag} is already in the selected list.`);
    }
  }

  if (message.content.toLowerCase() === "!reset" && message.member.permissions.has("Administrator")) {
    selectedMembers = [];
    message.channel.send("🔄 Washing queue has been reset!");
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  const userId = `<@${interaction.user.id}>`;

  if (interaction.isButton()) {
    if (interaction.customId === "yes_full") {
      if (!selectedMembers.includes(userId)) selectedMembers.push(userId);
      currentWashingAmount = currentRequiredAmount;
      await interaction.reply(`✅ ${userId} will wash the full amount! No more help needed.`);
      resetWashCycle();
    } else if (interaction.customId === "no") {
      await interaction.reply(`${userId} can't wash. Trying another member...`);
      startWashingCycle("Retry");
    } else if (interaction.customId === "partial") {
      const modal = new ModalBuilder()
        .setCustomId("partial_modal")
        .setTitle("Partial Wash Amount")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("amount")
              .setLabel("How much will you wash? (numbers only)")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("e.g. 700000")
              .setRequired(true)
          )
        );
      await interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === "partial_modal") {
    const amount = parseInt(interaction.fields.getTextInputValue("amount"));
    if (isNaN(amount) || amount <= 0) {
      return interaction.reply({ content: "❌ Invalid amount.", ephemeral: true });
    }

    const userId = `<@${interaction.user.id}>`;
    currentWashingAmount += amount;
    if (!selectedMembers.includes(userId)) selectedMembers.push(userId);

    if (currentWashingAmount < currentRequiredAmount) {
      const remaining = currentRequiredAmount - currentWashingAmount;
      await interaction.reply(`${userId} is washing $${amount.toLocaleString()}. Still need $${remaining.toLocaleString()} more!`);
      askForMore(remaining);
    } else {
      await interaction.reply(`✅ Washing fully covered! Total: $${currentWashingAmount.toLocaleString()}`);
      resetWashCycle();
    }
  }
});

function startWashingCycle(targetTime) {
  const channel = client.channels.cache.get("1358603838915088595"); // Replace with your channel ID
  if (!channel) return console.error("Channel not found.");

  const available = gangMembers.filter((m) => !selectedMembers.includes(m));
  if (available.length === 0) {
    selectedMembers = [];
  }

  const reFiltered = gangMembers.filter((m) => !selectedMembers.includes(m));
  const selected = reFiltered[Math.floor(Math.random() * reFiltered.length)];
  selectedMembers.push(selected);

  currentWashingAmount = 0;
  currentHelpers = [];
  currentRequiredAmount = 1500000;

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("yes_full").setLabel("✅ Yes - I'll Wash Full Amount").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("partial").setLabel("🧮 Washing Not Full Amount").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("no").setLabel("❌ No").setStyle(ButtonStyle.Danger)
  );

  const content = `💸 **Gang Washing Time** 💸\n\n${selected}, can you wash **$1.5M** to be ready for **${targetTime}**?\nClick an option below:`;
  channel.send({ content, components: [buttons] }).then((msg) => (washingMessage = msg));
}

function askForMore(remaining) {
  const channel = client.channels.cache.get("1358603838915088595");
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("partial").setLabel("I'll Wash Some").setStyle(ButtonStyle.Primary)
  );

  const content = `💰 Still need $${remaining.toLocaleString()} to be washed.\nWho else can help? Click below:`;
  channel.send({ content, components: [buttons] });
}

function resetWashCycle() {
  currentWashingAmount = 0;
  currentHelpers = [];
  washingMessage = null;
}

client.login(process.env.token);
