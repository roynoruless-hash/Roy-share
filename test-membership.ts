import { Telegraf } from 'telegraf';

const requiredChannel = '@royversehub';
const requiredGroup = '@roynoversehub';
const userId = 8661147262; // Admin's tg user id from earlier

async function run() {
  const token = "8960284435:AAED41SczzuXtqK3zm7JJKL0V7uopQUL-MI";
  const newBot = new Telegraf(token);

  let channelMember = false;
  let groupMember = false;

  try {
    const chatMember = await newBot.telegram.getChatMember(requiredChannel, userId);
    console.log("Channel chatMember:", chatMember);
    channelMember = ['creator', 'administrator', 'member'].includes(chatMember.status);
  } catch (err: any) {
    console.error('Channel check failed', err.description);
  }

  try {
    const chatMember2 = await newBot.telegram.getChatMember(requiredGroup, userId);
    console.log("Group chatMember:", chatMember2);
    groupMember = ['creator', 'administrator', 'member'].includes(chatMember2.status);
  } catch (err: any) {
    console.error('Group check failed', err.description);
  }

  console.log("channelMember:", channelMember, "groupMember:", groupMember);
}

run();
