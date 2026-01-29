/**
 * Curated word lists for alliterative fun name generation.
 * All words are classroom-appropriate (no negative, scary, or violent words).
 * Each letter has 15-25 adjectives and 10-20 animals.
 * Rare letters (Q, X, Z) have fewer entries (5-8 minimum).
 */

export const ADJECTIVES: Record<string, string[]> = {
  A: [
    'Amazing', 'Awesome', 'Adventurous', 'Agile', 'Artistic',
    'Ambitious', 'Athletic', 'Astounding', 'Alert', 'Adorable',
    'Amusing', 'Animated', 'Astonishing', 'Attentive', 'Authentic',
    'Amiable', 'Active', 'Audacious', 'Admirable', 'Appreciative',
  ],
  B: [
    'Bold', 'Brave', 'Brilliant', 'Bouncy', 'Bright',
    'Bubbly', 'Breezy', 'Balanced', 'Beaming', 'Blazing',
    'Blissful', 'Brainy', 'Brisk', 'Bountiful', 'Bustling',
    'Benevolent', 'Breathtaking', 'Buoyant', 'Beloved', 'Bonny',
  ],
  C: [
    'Clever', 'Cool', 'Cosmic', 'Creative', 'Cheerful',
    'Courageous', 'Calm', 'Charming', 'Curious', 'Caring',
    'Capable', 'Celebrated', 'Champion', 'Chipper', 'Classic',
    'Colorful', 'Confident', 'Cozy', 'Crafty', 'Crystal',
  ],
  D: [
    'Daring', 'Dazzling', 'Dynamic', 'Dashing', 'Dreamy',
    'Delightful', 'Devoted', 'Dignified', 'Diligent', 'Dependable',
    'Determined', 'Diplomatic', 'Distinguished', 'Dramatic', 'Driven',
    'Daring', 'Decisive', 'Dandy', 'Dauntless', 'Dainty',
  ],
  E: [
    'Eager', 'Earnest', 'Effervescent', 'Electric', 'Elegant',
    'Eloquent', 'Enchanting', 'Energetic', 'Enthusiastic', 'Epic',
    'Excellent', 'Exciting', 'Exquisite', 'Extraordinary', 'Exuberant',
    'Exemplary', 'Expressive', 'Endearing', 'Enlightened', 'Empowered',
  ],
  F: [
    'Fabulous', 'Fantastic', 'Fearless', 'Friendly', 'Focused',
    'Fluffy', 'Fortunate', 'Fresh', 'Frolicsome', 'Fun',
    'Funny', 'Flashy', 'Fleet', 'Flourishing', 'Flawless',
    'Festive', 'Faithful', 'Fanciful', 'Fiery', 'Fine',
  ],
  G: [
    'Gallant', 'Generous', 'Gentle', 'Gifted', 'Gleaming',
    'Glorious', 'Golden', 'Graceful', 'Grand', 'Great',
    'Gregarious', 'Groovy', 'Grinning', 'Grateful', 'Genuine',
    'Glad', 'Glowing', 'Gutsy', 'Good', 'Gorgeous',
  ],
  H: [
    'Happy', 'Harmonious', 'Hearty', 'Helpful', 'Heroic',
    'Honest', 'Hopeful', 'Humble', 'Humorous', 'Hustle',
    'Handy', 'Hardy', 'Heavenly', 'Honorable', 'Hyper',
    'Hilarious', 'Hardworking', 'Heartfelt', 'Hale', 'Heady',
  ],
  I: [
    'Imaginative', 'Impressive', 'Incredible', 'Independent', 'Ingenious',
    'Innovative', 'Inspiring', 'Intrepid', 'Inventive', 'Invincible',
    'Illustrious', 'Immense', 'Impeccable', 'Insightful', 'Instinctive',
    'Interesting', 'Intuitive', 'Ideal', 'Iconic', 'Industrious',
  ],
  J: [
    'Jaunty', 'Jazzy', 'Jeweled', 'Jocular', 'Jolly',
    'Jovial', 'Joyful', 'Joyous', 'Jubilant', 'Just',
    'Jamming', 'Jumpy', 'Junior', 'Justified', 'Jade',
  ],
  K: [
    'Keen', 'Kind', 'Kinetic', 'Knightly', 'Knowing',
    'Kaleidoscopic', 'Kindhearted', 'Kingly', 'Knockout', 'Kempt',
    'Key', 'Kickstart', 'Kittenish', 'Klutzy', 'Knockout',
  ],
  L: [
    'Lively', 'Luminous', 'Lucky', 'Legendary', 'Lighthearted',
    'Likable', 'Limitless', 'Lofty', 'Lovable', 'Loyal',
    'Lucid', 'Lustrous', 'Luxurious', 'Laudable', 'Laughing',
    'Lavish', 'Leading', 'Learned', 'Leisurely', 'Lush',
  ],
  M: [
    'Magical', 'Magnificent', 'Majestic', 'Marvelous', 'Mighty',
    'Mindful', 'Merry', 'Motivated', 'Musical', 'Masterful',
    'Melodic', 'Merciful', 'Methodical', 'Mirthful', 'Modest',
    'Momentous', 'Monumental', 'Mosaic', 'Magnetic', 'Memorable',
  ],
  N: [
    'Natural', 'Neat', 'Nifty', 'Nimble', 'Noble',
    'Notable', 'Nurturing', 'Neighborly', 'Neutral', 'Newborn',
    'Nerdy', 'Networked', 'Nice', 'Noteworthy', 'Novel',
  ],
  O: [
    'Observant', 'Oceanic', 'Offbeat', 'Olympian', 'Open',
    'Optimistic', 'Original', 'Outstanding', 'Outgoing', 'Orderly',
    'Organic', 'Ornate', 'Overjoyed', 'Opulent', 'Opalescent',
  ],
  P: [
    'Peaceful', 'Perky', 'Persistent', 'Playful', 'Plucky',
    'Polished', 'Positive', 'Powerful', 'Precious', 'Prodigious',
    'Proud', 'Phenomenal', 'Pioneering', 'Plentiful', 'Poised',
    'Popular', 'Praiseworthy', 'Precious', 'Priceless', 'Pristine',
  ],
  Q: [
    'Quick', 'Quiet', 'Quirky', 'Quaint', 'Queenly',
    'Qualified', 'Quintessential', 'Quizzical',
  ],
  R: [
    'Radiant', 'Rambunctious', 'Rapid', 'Remarkable', 'Resilient',
    'Resourceful', 'Respectful', 'Rocking', 'Rosy', 'Royal',
    'Robust', 'Romantic', 'Rowdy', 'Reliable', 'Renowned',
    'Righteous', 'Refreshing', 'Resolute', 'Resplendent', 'Restless',
  ],
  S: [
    'Shining', 'Smart', 'Snappy', 'Sparkling', 'Speedy',
    'Spirited', 'Splendid', 'Stellar', 'Strong', 'Stunning',
    'Super', 'Supreme', 'Swift', 'Sunny', 'Spectacular',
    'Steadfast', 'Swell', 'Soaring', 'Savvy', 'Serene',
  ],
  T: [
    'Talented', 'Tenacious', 'Terrific', 'Thrilling', 'Tidy',
    'Tireless', 'Topnotch', 'Tremendous', 'Triumphant', 'Trusty',
    'Truthful', 'Tuneful', 'Turbocharged', 'Thoughtful', 'Thankful',
    'Tickled', 'Timeless', 'Tough', 'Tranquil', 'Treasured',
  ],
  U: [
    'Ultimate', 'Unbeatable', 'Unconventional', 'Unforgettable', 'Unique',
    'United', 'Unstoppable', 'Upbeat', 'Uplifting', 'Upstanding',
    'Useful', 'Utmost', 'Unified', 'Unlimited', 'Ultra',
  ],
  V: [
    'Valiant', 'Valuable', 'Vast', 'Versatile', 'Vibrant',
    'Victorious', 'Vigorous', 'Vivacious', 'Vivid', 'Vocal',
    'Volcanic', 'Visionary', 'Virtuous', 'Venerable', 'Vital',
  ],
  W: [
    'Warm', 'Watchful', 'Whimsical', 'Wholesome', 'Wild',
    'Wise', 'Witty', 'Wonderful', 'Worthy', 'Wondrous',
    'Winning', 'Welcome', 'Willful', 'Worldly', 'Wishful',
  ],
  X: [
    'Xenial', 'Xtra', 'Xpert', 'Xcellent', 'Xpressive',
  ],
  Y: [
    'Youthful', 'Young', 'Yearning', 'Yappy', 'Yielding',
    'Yonder', 'Yummy', 'Yearly', 'Yippee',
  ],
  Z: [
    'Zany', 'Zealous', 'Zappy', 'Zen', 'Zesty',
    'Zippy', 'Zooming', 'Zonked',
  ],
}

export const ANIMALS: Record<string, string[]> = {
  A: [
    'Armadillo', 'Antelope', 'Albatross', 'Axolotl', 'Alpaca',
    'Angelfish', 'Ant', 'Alligator', 'Anteater', 'Ape',
    'Anchovy', 'Arctic Fox', 'Addax',
  ],
  B: [
    'Bear', 'Bunny', 'Butterfly', 'Buffalo', 'Badger',
    'Bat', 'Beaver', 'Beetle', 'Bison', 'Blue Jay',
    'Bobcat', 'Bumblebee', 'Barracuda', 'Bluebird', 'Bullfrog',
  ],
  C: [
    'Cheetah', 'Chameleon', 'Capybara', 'Crane', 'Chinchilla',
    'Clownfish', 'Cardinal', 'Caterpillar', 'Chipmunk', 'Cockatoo',
    'Coyote', 'Crab', 'Cricket', 'Corgi', 'Condor',
  ],
  D: [
    'Dragon', 'Dolphin', 'Deer', 'Dove', 'Dragonfly',
    'Duck', 'Donkey', 'Dingo', 'Dodo', 'Dormouse',
    'Duckling', 'Damselfly', 'Dartfish',
  ],
  E: [
    'Eagle', 'Elephant', 'Emu', 'Elk', 'Echidna',
    'Egret', 'Ermine', 'Eland', 'Ewe', 'Earthworm',
  ],
  F: [
    'Falcon', 'Flamingo', 'Fox', 'Frog', 'Firefly',
    'Ferret', 'Finch', 'Fish', 'Flounder', 'Flying Squirrel',
    'Frigate Bird', 'Fawn', 'Fantail',
  ],
  G: [
    'Gazelle', 'Giraffe', 'Goldfish', 'Goose', 'Gorilla',
    'Grasshopper', 'Grizzly', 'Gecko', 'Gopher', 'Guppy',
    'Greyhound', 'Grouse', 'Gannet',
  ],
  H: [
    'Hawk', 'Hedgehog', 'Heron', 'Hippo', 'Horse',
    'Hummingbird', 'Hamster', 'Hare', 'Hermit Crab', 'Hornet',
    'Husky', 'Hyena', 'Halibut',
  ],
  I: [
    'Iguana', 'Ibis', 'Impala', 'Inchworm', 'Ibex',
    'Irish Setter', 'Isopod', 'Insect', 'Indri', 'Icefish',
  ],
  J: [
    'Jaguar', 'Jay', 'Jellyfish', 'Jackrabbit', 'Junco',
    'Jackal', 'Jabiru', 'Jerboa', 'Junebug', 'Jay Bird',
  ],
  K: [
    'Kangaroo', 'Koala', 'Kingfisher', 'Kiwi', 'Kookaburra',
    'Kitten', 'Kite', 'Kudu', 'Koi', 'Keelback',
  ],
  L: [
    'Llama', 'Leopard', 'Lemur', 'Ladybug', 'Lion',
    'Lobster', 'Lynx', 'Lark', 'Lizard', 'Lorikeet',
    'Lovebird', 'Lightning Bug', 'Lamprey',
  ],
  M: [
    'Moose', 'Meerkat', 'Monarch', 'Macaw', 'Manatee',
    'Mantis', 'Marten', 'Meadowlark', 'Mockingbird', 'Mongoose',
    'Monkey', 'Moth', 'Mouse', 'Mule', 'Mustang',
  ],
  N: [
    'Narwhal', 'Newt', 'Nightingale', 'Numbat', 'Nutcracker',
    'Nuthatch', 'Needlefish', 'Neon Tetra', 'Nighthawk', 'Nautilus',
  ],
  O: [
    'Otter', 'Owl', 'Osprey', 'Octopus', 'Ocelot',
    'Okapi', 'Orangutan', 'Oriole', 'Opossum', 'Oyster',
  ],
  P: [
    'Panda', 'Parrot', 'Peacock', 'Pelican', 'Penguin',
    'Phoenix', 'Porcupine', 'Puffin', 'Panther', 'Platypus',
    'Pony', 'Porpoise', 'Prairie Dog', 'Puppy', 'Python',
  ],
  Q: [
    'Quail', 'Quetzal', 'Quokka', 'Queenfish', 'Quahog',
  ],
  R: [
    'Rabbit', 'Raccoon', 'Raven', 'Reindeer', 'Robin',
    'Rooster', 'Roadrunner', 'Red Panda', 'Rattlesnake', 'Rhino',
    'Ram', 'Ray', 'Ringtail',
  ],
  S: [
    'Seahorse', 'Seal', 'Shark', 'Sloth', 'Snail',
    'Sparrow', 'Squid', 'Starfish', 'Stingray', 'Swan',
    'Salamander', 'Sandpiper', 'Sawfish', 'Scorpion', 'Shrimp',
  ],
  T: [
    'Tiger', 'Toucan', 'Turtle', 'Toad', 'Treefrog',
    'Trout', 'Turkey', 'Tapir', 'Tern', 'Thorny Devil',
    'Tuna', 'Tamarin', 'Terrapin',
  ],
  U: [
    'Unicorn', 'Urchin', 'Uakari', 'Umbrellabird', 'Urial',
    'Upupa',
  ],
  V: [
    'Vulture', 'Viper', 'Vicuna', 'Vole', 'Vampire Bat',
    'Vervet', 'Viperfish', 'Vireo',
  ],
  W: [
    'Whale', 'Wolf', 'Walrus', 'Wombat', 'Woodpecker',
    'Wren', 'Wolverine', 'Warbler', 'Wasp', 'Weasel',
    'Wildcat', 'Wildebeest',
  ],
  X: [
    'Xerus', 'X-ray Tetra', 'Xenops', 'Xiphias', 'Xoloitzcuintli',
  ],
  Y: [
    'Yak', 'Yellowjacket', 'Yellowtail', 'Yapok', 'Yellowhammer',
    'Yorkshire Terrier',
  ],
  Z: [
    'Zebra', 'Zebrafish', 'Zonkey', 'Zorilla', 'Zander',
    'Zapata Wren',
  ],
}
