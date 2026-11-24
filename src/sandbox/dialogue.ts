/** One conversation option: what the player says, what the NPC answers, and the gesture to play. */
export interface DLine {
  prompt: string;
  reply: string;
  gesture: string;
  end?: boolean;
}

export const ROLES = ["Villager", "Vendor", "Shopkeeper", "Guard", "Kid", "Traveler", "Stranger"];

/** Starter conversation for a role. Every list ends with a goodbye line that closes the talk. */
export function defaultDialogue(role: string, name: string): { greeting: string; lines: DLine[] } {
  const first = name.split(" ")[0] || "friend";
  switch (role) {
    case "Vendor":
    case "Shopkeeper":
      return {
        greeting: "Welcome to my stall! Looking for something special?",
        lines: [
          { prompt: "What are you selling?", reply: "Fresh fruit, toys and the best crates in town!", gesture: "point" },
          { prompt: "Any news?", reply: "Busy day! The fair starts at noon.", gesture: "shrug" },
          { prompt: "Can you dance?", reply: "Watch this!", gesture: "dance-groove" },
          { prompt: "Goodbye", reply: "Come back soon!", gesture: "wave", end: true },
        ],
      };
    case "Guard":
      return {
        greeting: "Halt! State your business.",
        lines: [
          { prompt: "Just passing through.", reply: "Keep out of trouble, then.", gesture: "nod" },
          { prompt: "Is it safe here?", reply: "Mostly. Keep an eye on the market.", gesture: "think" },
          { prompt: "Goodbye", reply: "Move along.", gesture: "wave", end: true },
        ],
      };
    case "Kid":
      return {
        greeting: "Hi! Wanna play?",
        lines: [
          { prompt: "Sure!", reply: "Yay! Let's dance!", gesture: "dance-groove" },
          { prompt: "What's your name?", reply: `My name is ${first}.`, gesture: "wave" },
          { prompt: "Tell me a joke", reply: "Why did the cube break up with the sphere? It had no edges!", gesture: "laugh" },
          { prompt: "Bye", reply: "See you later!", gesture: "wave", end: true },
        ],
      };
    default:
      return {
        greeting: "Hello there! Nice day, isn't it?",
        lines: [
          { prompt: "What's your name?", reply: `I'm ${first}. Nice to meet you!`, gesture: "wave" },
          { prompt: "Where can I go?", reply: "Follow the road to the market.", gesture: "point" },
          { prompt: "Tell me a joke", reply: "I'd tell you a joke about the ground, but it's a bit of a drag.", gesture: "laugh" },
          { prompt: "Goodbye", reply: "Take care!", gesture: "wave", end: true },
        ],
      };
  }
}
