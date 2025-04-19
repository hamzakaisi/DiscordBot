// Gang Washing Bot with Buttons & Partial Washing Support
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const schedule = require("node-schedule");
const express = require("express");

// Keep the bot alive
const app = express();
app.get("/", (_, res) => res.send("Gang Wash Bot is running!"));
app.listen(3000, () => console.log("Web server running..."));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

const gangMembers = [
  "222153000284717058", "364841539626598414", "192553728031719424", "1087868902895255562",
  "580483960413618188", "901862634532515860", "179998633092055041", "652927651652042793",
  "700778810580402197", "239122621961076737", "540417434457341972", "192847925032779776"
];

let selectedMembers = [];
let washingState = null; // Holds data for ongoing wash

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  schedule.scheduleJob("30 13 * * *", () => sendWashMessage("5:00 AM"));
  schedule.scheduleJob("30 1 * * *", () => sendWashMessage("3:00 PM"));
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    const [action, userId] = interaction.customId.split(":");

    if (action === "yes" && interaction.user.id === userId) {
      const modal = new ModalBuilder()
        .setCustomId("wash-amount")
        .setTitle("Enter Amount to Wash")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("amount")
              .setLabel("How much can you wash?")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
      await interaction.showModal(modal);
    } else if (action === "no" && interaction.user.id === userId) {
      await interaction.reply({ content: `No worries. Picking someone else...`, ephemeral: true });
      sendWashMessage(washingState.timeSlot);
    } else if (action === "help") {
      const modal = new ModalBuilder()
        .setCustomId("help-amount")
        .setTitle("Help Wash Remaining")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("help-amount")
              .setLabel("How much of the remaining can you wash?")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
      await interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit()) {
    const amountInput = parseInt(interaction.fields.getTextInputValue("amount") || interaction.fields.getTextInputValue("help-amount"));
    if (isNaN(amountInput) || amountInput <= 0) return interaction.reply({ content: "❌ Invalid amount.", ephemeral: true });

    if (interaction.customId === "wash-amount") {
      washingState.totalWashed += amountInput;
      washingState.mainWasher = interaction.user.id;
      await interaction.reply({ content: `✅ ${interaction.user} is washing $${amountInput.toLocaleString()}.`, ephemeral: false });

      if (washingState.totalWashed < 1500000) {
        const remaining = 1500000 - washingState.totalWashed;
        const channel = client.channels.cache.get(washingState.channelId);
        channel.send({
          content: `❗ We still need to wash $${remaining.toLocaleString()}.
Who can help? Click below to take the rest!`,
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId("help").setLabel("I can wash some!").setStyle(ButtonStyle.Primary)
            )
          ]
        });
      } else {
        finishWash();
      }
    } else if (interaction.customId === "help-amount") {
      washingState.totalWashed += amountInput;
      await interaction.reply({ content: `🤝 ${interaction.user} will wash $${amountInput.toLocaleString()} of the remaining.`, ephemeral: false });

      if (washingState.totalWashed < 1500000) {
        const remaining = 1500000 - washingState.totalWashed;
        const channel = client.channels.cache.get(washingState.channelId);
        channel.send({ content: `Still need $${remaining.toLocaleString()} to be washed. Anyone else?`, components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("help").setLabel("I can wash!").setStyle(ButtonStyle.Primary)
          )
        ] });
      } else {
        finishWash();
      }
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.content === "!reset" && message.member.permissions.has("Administrator")) {
    selectedMembers = [];
    await message.reply("✅ Gang wash queue has been reset.");
  }
});

function sendWashMessage(timeSlot) {
  const channel = client.channels.cache.get("1358603838915088595"); // your channel ID here
  if (!channel) return console.error("❌ Channel not found.");

  const availableMembers = gangMembers.filter(id => !selectedMembers.includes(id));
  if (availableMembers.length === 0) selectedMembers = gangMembers.slice();

  const selectedId = availableMembers[Math.floor(Math.random() * availableMembers.length)];
  selectedMembers.push(selectedId);

  washingState = {
    totalWashed: 0,
    mainWasher: null,
    channelId: channel.id,
    timeSlot
  };

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`yes:${selectedId}`).setLabel("Yes").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`no:${selectedId}`).setLabel("No").setStyle(ButtonStyle.Danger)
  );

  channel.send({
    content: `💸 **Gang Washing Time** 💸\nHey <@${selectedId}>, can you wash $1.5M at **${timeSlot}**?`,
    components: [row]
  });
}

function finishWash() {
  const channel = client.channels.cache.get(washingState.channelId);
  channel.send(`🎉 All $1.5M has been washed! Great job team! 💸`);
  washingState = null;
}

client.login(process.env.token);
