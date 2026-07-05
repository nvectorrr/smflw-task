export type Conversation = {
  id: string;
  title: string;
  created_at: string;
};

export type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
};
