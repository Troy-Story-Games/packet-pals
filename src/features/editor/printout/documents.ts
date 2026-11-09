/** Fun things that can come out of the printer. */
export interface PrintDoc {
  emoji: string;
  title: string;
  lines: string[];
}

export const DOCUMENTS: PrintDoc[] = [
  {
    emoji: '1f996',
    title: 'Dinosaur Facts',
    lines: ['T. rex had teeth as big as bananas!', 'Some dinosaurs had feathers.'],
  },
  { emoji: '1f389', title: 'Party Invitation', lines: ['You are invited!', 'Bring your best dance moves.'] },
  { emoji: '1f5fa', title: 'Treasure Map', lines: ['Start at the big tree.', 'Ten steps to the X!'] },
  { emoji: '1f355', title: 'Pizza Menu', lines: ['Cheese ......... yum', 'Pineapple ...... maybe?'] },
  { emoji: '1f680', title: 'Rocket Blueprint', lines: ['Engines: 3', 'Destination: the Moon'] },
  { emoji: '1f431', title: 'Cat Drawing', lines: ['Meow!', '(it looks just like a real cat)'] },
  { emoji: '1f4c5', title: 'Homework', lines: ['2 + 2 = 4', 'Spelling: n-e-t-w-o-r-k'] },
  {
    emoji: '1f3c6',
    title: 'Gold Star Certificate',
    lines: ['Awarded to {from}', 'for brilliant networking!'],
  },
  {
    emoji: '1f308',
    title: 'Rainbow Colouring Page',
    lines: ['Red, orange, yellow, green...', 'Colour me in!'],
  },
  { emoji: '1f47e', title: 'Game High Scores', lines: ['1. {from} ...... 9999', '2. Pip .......... 9998'] },
  { emoji: '1f366', title: 'Ice Cream Recipe', lines: ['Milk, sugar, freezing cold.', 'Add sprinkles!'] },
  { emoji: '1f9ed', title: 'Adventure Plan', lines: ['Pack snacks.', 'Explore the garden jungle.'] },
];

/** A document picked from the token, so each print is a surprise but stable while shown. */
export function documentFor(token: number): PrintDoc {
  return DOCUMENTS[(token * 7) % DOCUMENTS.length];
}
