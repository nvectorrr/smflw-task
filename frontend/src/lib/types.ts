export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  source?: string;
};

export type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
};
