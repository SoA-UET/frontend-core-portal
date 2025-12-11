from ...utils.db import str_to_objectid
from ...utils.pageable import Pageable
from typing import Any
from pymongo import ASCENDING, DESCENDING
from pymongo.collection import Collection
from flask_restx import abort
from datetime import datetime

class BaseCRUDService:
    def __init__(self, collection: Collection, enable_timing: bool = False):
        self.collection = collection
        self.enable_timing = enable_timing

    def get_collection(self, pageable: Pageable, filters: dict[str, Any] | None = None):
        """
        Trả về danh sách tất cả bản ghi, theo pagination.
        """
        filters = filters or {}
        
        if not self.enable_timing:
            sort_config = [('_id', ASCENDING)]
        else:
            sort_config = [('updated_at', DESCENDING)]
        
        return [
            *self.collection.find(
                filters,
                sort=sort_config,
                **pageable.get_kwargs(),
            )
        ]
    
    def post_item(self, item_doc: dict):
        """
        Tạo bản ghi mới. Trả về nội dung bản ghi vừa tạo, trong đó có ID.
        """
        if self.enable_timing:
            now = datetime.now()
            item_doc = {
                **item_doc,
                "created_at": now,
                "updated_at": now,
            }

        result = self.collection.insert_one(item_doc)
        return {
            "_id": result.inserted_id,
            **item_doc
        }
    
    def get_item_by_id(self, id):
        """
        Tìm và trả về bản ghi theo ID. Nếu không có, throw 404.
        """
        object_id = str_to_objectid(id)
        if not object_id:
            abort(404, "Invalid ID") # type: ignore
        result = self.collection.find_one({ "_id": object_id })
        if not result or result is None:
            abort(404, "Item not found") # type: ignore
            raise RuntimeError
        return result
    
    def put_item_by_id(self, id, item_doc: dict):
        """
        Sửa toàn bộ bản ghi theo ID. Nếu không có, throw 404.
        Trả về bản ghi đã sửa.
        """
        object_id = str_to_objectid(id)
        if not object_id:
            abort(404, "Invalid ID") # type: ignore
        item_doc = {
            **item_doc,
            "_id": object_id,
        }

        if self.enable_timing:
            try:
                created_at = self.get_item_by_id(id).get("created_at", datetime.now())
            except:
                created_at = datetime.now()
            item_doc = {
                **item_doc,
                "created_at": created_at,
                "updated_at": datetime.now(),
            }

        result = self.collection.find_one_and_replace(
            { "_id": object_id },
            item_doc,
            return_document=True
        )

        if not result:
            abort(404, "Item not found") # type: ignore
        
        return result
    
    def patch_item_by_id(self, id, item_patch_doc: dict):
        """
        Sửa một phần bản ghi theo ID. Nếu không có, throw 404.
        Trả về bản ghi đã sửa.
        """
        object_id = str_to_objectid(id)
        if not object_id:
            abort(404, "Invalid ID") # type: ignore
        
        if self.enable_timing:
            item_patch_doc = {
                **item_patch_doc,
                "updated_at": datetime.now(),
            }

        result = self.collection.find_one_and_update(
            { "_id": object_id },
            { '$set': item_patch_doc },
            return_document=True
        )

        if not result:
            abort(404, "Item not found") # type: ignore
        
        return result
    
    def delete_item_by_id(self, id):
        """
        Xóa bản ghi theo ID. Nếu không có, throw 404.
        Trả về None.
        """
        object_id = str_to_objectid(id)
        if not object_id:
            abort(404, "Invalid ID") # type: ignore
        
        result = self.collection.delete_one({
            "_id": object_id,
        })

        if result.deleted_count == 0:
            abort(404, "Item not found") # type: ignore
