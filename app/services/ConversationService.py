# Example service. Change as appropriate.

from pymongo.collection import Collection
from .common.BaseCRUDService import BaseCRUDService
from typing import override

class ConversationService(BaseCRUDService):
    def __init__(self, collection: Collection):
        super().__init__(collection=collection, enable_timing=True)

    @override
    def post_item(self, item_doc):
        item_doc["status"] = "AI_AGENT_TEXTING"
        return super().post_item(item_doc)
