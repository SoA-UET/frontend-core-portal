from .ConversationService import ConversationService
from ..collections import conversations_collection

conversation_service = ConversationService(
    collection=conversations_collection,
)
