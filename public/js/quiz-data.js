// Quiz content, scoring and result logic (shared by the whole public site).
window.QUIZ = (() => {
  const VERIFY = [
    { id: 'W2', title: 'THE FRIDGE TEST', mascot: 'fridge', mark: '?',
      q: 'If humans are so intelligent, why do they open the fridge 7 times hoping new food will spawn?',
      options: [{ l: 'A', t: "I'm finding my ex inside the fridge." }, { l: 'B', t: 'I believe in miracles.' }, { l: 'C', t: "I'm waiting for the fridge to apologize for being empty." }] },
    { id: 'W3', title: 'THE EMERGENCY TEST', mascot: 'robot', mark: '📱',
      q: 'If your ex suddenly texted you, "I miss you ❤️", what would you do?',
      options: [{ l: 'A', t: 'Reply, "Sorry, who is this? 😂"' }, { l: 'B', t: 'Say, "I miss your Wi-Fi, not you." 📶' }, { l: 'C', t: 'Give them another chance. 👀' }, { l: 'D', t: 'Leave them on read like they left you. 💀' }] },
    { id: 'W4', title: 'THE FINAL VERIFICATION', mascot: 'robot', mark: '💘',
      q: 'If your crush suddenly looks into your eyes and says, "Why are you so cute? 😘", what would you do?',
      options: [{ l: 'A', t: 'Say, "Because you\'re looking at me. 😉"' }, { l: 'B', t: 'Smile and say, "Only for you. ❤️"' }, { l: 'C', t: 'Reply, "Stop complimenting me, I\'m already blushing. 🙈"' }, { l: 'D', t: 'Say, "Why don\'t you find out more? 👀🔥"' }] },
  ];
  // Human answer is always B. Everything else counts as Robot.

  // t = trait used for the final category. Human: R romantic, C charm, G guarded. Robot: L loving, M mysterious, C charm.
  const o = (t, x, r) => ({ t: x, trait: t, react: r });
  const BLIND = {
    human: [
      { q: 'If your crush says, "I think I am falling for you", what would you say?', options: [
        o('C', '"Careful, I will catch you. 😉"', 'Careful, I will catch you. 😉'),
        o('C', '"Finally, you noticed me! 😂"', 'Finally, you noticed me! 😂'),
        o('R', '"Should I fall for you too? ❤️"', 'Should I fall for you too? ❤️'),
        o('G', '"Prove it first. 👀"', 'Prove it first. 👀')] },
      { q: 'If someone asks, "Are you single?", what would be your reply?', options: [
        o('G', '"Yes, but applications are closed. 😂"', 'HYes, but applications are closed. 😂'),
        o('C', '"Depends on who is asking. 😉"', 'Depends on who is asking. 😉'),
        o('G', '"Single, but not available for everyone. 😎"', 'Single, but not available for everyone. 😎'),
        o('R', '"Why? Are you interested? ❤️"', 'Why? Are you interested? ❤️')] },
      { q: 'If your crush suddenly says, "I wish you were here right now", what would you do?', options: [
        o('C', '"Should I book a ticket? ✈️"', 'Flight booked. Snacks not included.'),
        o('R', '"Same here, more than you know. ❤️"', 'Same here, more than you know. ❤️'),
        o('R', '"Stop making me miss you! 🥹"', 'Stop making me miss you!'),
        o('C', '"Then come and get me. 😏"', 'Then come and get me. 😏')] },
    ],
    robot: [
      { q: 'If your crush sends you a selfie at midnight, what would you do?', options: [
        o('C', '"Trying to steal my sleep? 😍"', 'Trying to steal my sleep? 😍'),
        o('L', '"How am I supposed to sleep now? 🥹"', 'How am I supposed to sleep now?'),
        o('M', 'Send a heart and pretend to be cool. ❤️', 'Send a heart and pretend to be cool. ❤️'),
        o('M', 'Save it and never tell them. 🤫', 'Save it and never tell them. 🤫')] },
      { q: 'If your crush says, "I had a dream about you last night", what would you reply?', options: [
        o('C', '"Hopefully, it was a romantic one. 😏"', 'Hopefully, it was a romantic one. 😏'),
        o('C', '"Even in your dreams, you can not escape me! 😂"', 'CEven in your dreams, you can not escape me! 😂'),
        o('L', '"When are we making it real? ❤️"', 'When are we making it real? ❤️'),
        o('L', '"Tell me every detail! 👀"', 'Tell me every detail! 👀')] },
      { q: 'If your crush asks, "What is your biggest weakness?", what would you say?', options: [
        o('L', '"Your smile. 🥺"', 'CYour smile. 🥺'),
        o('L', '"Chocolate and you. 🍫❤️"', 'Chocolate and you. 🍫❤️'),
        o('M', '"Someone who knows how to make me smile. 😉"', 'MSomeone who knows how to make me smile. 😉'),
        o('C', '"You, but do not let it go to your head. 😂"', 'You, but do not let it go to your head. 😂')] },
    ],
  };

  const CATS = {
    human: { R: 'The Secret Romantic', G: 'Professional Single', C: 'You are missing your ex' },
    robot: { L: 'LoveBot 9000', M: 'Romantic Machine', C: 'You are missing your ex' },
  };
  const ORDER = { human: ['C', 'R', 'G'], robot: ['L', 'C', 'M'] };
  const TEXT = {
    'The Secret Romantic': (n) => `Under the jokes you are a full-time romantic. ${n} of 3 blind choices went for the sweet reply, and your secret is out.`,
    'Professional Single': (n) => `Guarded, witty and fully booked by your own standards. ${n} of 3 choices played it cool, so someone has to earn your attention.`,
    'You are missing your ex': (n) => `You turn every message into a spotlight moment. ${n} of 3 choices were pure charm, so expect smiles wherever you go.`,
    'LoveBot 9000': (n) => `Heart module fully installed. ${n} of 3 choices ran on pure affection, which makes you the most lovable machine in the lab.`,
    'Romantic Machine': (n) => `Mysterious circuits, soft core. ${n} of 3 choices kept feelings in a secret folder, and the lab noticed anyway.`,
    'You are missing your ex': () => 'Your answers keep drifting back to the past. Charm is great, but maybe that chat history needs a closing ceremony.',
  };

  function scoreVerification(letters) {
    const robotCount = letters.filter((l) => l !== 'B').length;
    const robotPct = [0, 40, 75, 100][robotCount];
    const verified = robotCount >= 2 ? 'Robot' : 'Human';
    const score = verified === 'Robot' ? robotPct : robotCount === 0 ? 100 : 60;
    return { robotCount, robotPct, verified, score };
  }

  function finalResult(vLetters, picks, verified) {
    const kind = verified === 'Robot' ? 'robot' : 'human';
    const ex = (vLetters[0] === 'A' ? 1 : 0) + (vLetters[1] === 'C' ? 1 : 0); // ex-related answers
    if (ex >= 2 || (ex === 1 && kind === 'human')) {
      return { category: 'You are missing your ex', description: TEXT['You are missing your ex']() };
    }
    const tally = {};
    picks.forEach((idx, qi) => { const t = BLIND[kind][qi].options[idx].trait; tally[t] = (tally[t] || 0) + 1; });
    let best = ORDER[kind][0];
    ORDER[kind].forEach((t) => { if ((tally[t] || 0) > (tally[best] || 0)) best = t; });
    const category = CATS[kind][best];
    return { category, description: TEXT[category](tally[best]) };
  }

  return { VERIFY, BLIND, scoreVerification, finalResult };
})();
