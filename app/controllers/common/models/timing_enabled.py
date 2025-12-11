from flask_restx import fields

timing_enabled = {
    "created_at": fields.DateTime(required=True, description="Thời điểm tạo"),
    "updated_at": fields.DateTime(required=True, description="Thời điểm cập nhật lần cuối"),
}
