// Prompt "games". The original app calls these gameSlug on the public link
// (e.g. /<username>/confessions). Each one changes the card header and the
// set of random "dice" suggestions shown to the sender.

const GAMES = [
  {
    slug: '',
    title: 'send me anonymous messages!',
    emoji: '💬',
    suggestions: [
      'what was your first impression of me?',
      'what is something you have never told anyone?',
      'what song is stuck in your head right now?',
      'if you could live anywhere, where would it be?',
      'what is your hot take that nobody agrees with?',
      'what would you do with a million dollars?',
    ],
  },
  {
    slug: 'confessions',
    title: 'confessions',
    emoji: '🤫',
    suggestions: [
      'i confess i have a secret talent nobody knows about',
      'i confess i stalked your old posts',
      'i confess i laughed at your joke way later',
    ],
  },
  {
    slug: 'tbh',
    title: 'tbh',
    emoji: '🫣',
    suggestions: [
      'tbh you seem really chill',
      'tbh i wish we talked more',
      'tbh your playlist is elite',
    ],
  },
  {
    slug: 'neverhaveiever',
    title: 'never have i ever',
    emoji: '🙊',
    suggestions: [
      'never have i ever skipped class to sleep',
      'never have i ever cried at a movie',
      'never have i ever texted the wrong person',
    ],
  },
  {
    slug: '3words',
    title: 'describe me in 3 words',
    emoji: '✍️',
    suggestions: ['funny, kind, chaotic', 'smart, quiet, loyal', 'bold, creative, loud'],
  },
  {
    slug: 'rateme',
    title: 'rate me 1-10',
    emoji: '⭐',
    suggestions: ['10/10 no notes', '8/10 would be 10 if you replied faster', '9/10 vibes are immaculate'],
  },
  {
    slug: 'dealbreakers',
    title: 'dealbreakers',
    emoji: '🚩',
    suggestions: ['bad texter', 'doesn’t like dogs', 'puts milk before cereal'],
  },
  {
    slug: 'shipme',
    title: 'ship me with someone',
    emoji: '💘',
    suggestions: ['you and the person who sits next to you', 'you and your best friend, obviously'],
  },
  {
    slug: 'askmeanything',
    title: 'ask me anything',
    emoji: '❓',
    suggestions: ['what is your biggest fear?', 'what is your dream job?', 'cats or dogs?'],
  },
];

const BY_SLUG = new Map(GAMES.map((g) => [g.slug, g]));

function getGame(slug) {
  return BY_SLUG.get(slug || '') || null;
}

function publicGames() {
  return GAMES.map(({ slug, title, emoji }) => ({ slug, title, emoji }));
}

function randomSuggestion(slug) {
  const game = getGame(slug) || GAMES[0];
  const list = game.suggestions;
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = { GAMES, getGame, publicGames, randomSuggestion };
