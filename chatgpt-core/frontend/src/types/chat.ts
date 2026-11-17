export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  dateGroup: 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Previous 30 Days';
  messages: Message[];
  updatedAt: string;
}

export interface PromptSuggestion {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category?: string;
}
