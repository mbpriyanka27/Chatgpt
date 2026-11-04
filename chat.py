from typing import List, Dict, Any, Tuple, Optional
from model import stream_chat_response, generate_response
from memory import ConversationMemory
from rag import RAGPipeline

class ChatEngine:
    """
    Coordinates chat flow between ConversationMemory, RAGPipeline, and Qwen LLM.
    Handles context assembly, multi-turn history, regeneration, and user message editing.
    """
    def __init__(self, model, tokenizer, rag_pipeline: Optional[RAGPipeline] = None):
        self.model = model
        self.tokenizer = tokenizer
        self.rag = rag_pipeline or RAGPipeline()

    def prepare_turn(
        self,
        memory: ConversationMemory,
        user_message: str,
        system_prompt: str = "You are a helpful AI assistant. Explain concepts clearly with examples.",
        use_rag_if_available: bool = True,
        top_k_rag: int = 3
    ) -> Tuple[List[Dict[str, str]], List[Dict[str, Any]]]:
        """
        Prepares the context messages for the LLM:
        1. Queries RAG pipeline if files are loaded and enabled.
        2. Injects system instructions.
        3. Appends conversation history.
        4. Injects document context into user turn if RAG matches are found.
        """
        retrieved_sources = []
        effective_user_turn = user_message

        if use_rag_if_available and self.rag.vector_store.count() > 0:
            chunks = self.rag.retrieve(user_message, top_k=top_k_rag)
            if chunks:
                effective_user_turn = self.rag.build_rag_prompt(user_message, chunks)
                retrieved_sources = self.rag.extract_source_references(chunks)

        # Assemble messages from memory
        context_messages = []
        if system_prompt:
            context_messages.append({"role": "system", "content": system_prompt})

        # Add prior conversation turns (excluding the current one not yet answered)
        prior_messages = memory.get_context_messages(system_prompt=None)
        for msg in prior_messages:
            context_messages.append({"role": msg["role"], "content": msg["content"]})

        # Add current user prompt (augmented if RAG triggered)
        context_messages.append({"role": "user", "content": effective_user_turn})

        return context_messages, retrieved_sources

    def stream_turn(
        self,
        context_messages: List[Dict[str, str]],
        max_new_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 0.9,
        top_k: int = 50
    ):
        """
        Launches streaming text generation for the assembled context messages.
        """
        return stream_chat_response(
            self.model,
            self.tokenizer,
            context_messages,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k
        )

    def prepare_regeneration(
        self,
        memory: ConversationMemory,
        system_prompt: str = "You are a helpful AI assistant. Explain concepts clearly with examples.",
        use_rag_if_available: bool = True
    ) -> Optional[Tuple[List[Dict[str, str]], List[Dict[str, Any]]]]:
        """
        Prepares context to regenerate the last assistant response:
        Removes the last assistant message and rebuilds prompt for the preceding user message.
        """
        # Remove last assistant message
        memory.remove_last_assistant_message()
        messages = memory.get_messages()
        if not messages or messages[-1]["role"] != "user":
            return None

        last_user_query = messages[-1]["content"]
        # Remove last user message temporarily to rebuild turn cleanly
        memory.messages.pop()
        
        ctx, sources = self.prepare_turn(
            memory,
            last_user_query,
            system_prompt=system_prompt,
            use_rag_if_available=use_rag_if_available
        )
        
        # Restore user message to memory
        memory.add_message("user", last_user_query)
        return ctx, sources

