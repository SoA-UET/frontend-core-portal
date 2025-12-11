from flask import request, url_for
from flask_restx import Namespace, Resource, fields
from ...utils.pageable import Pageable
from ...utils.hateoas import HATEOAS
from ..common.models import timing_enabled

#######################################
## STEP 1. DECLARE THE API NAMESPACE ##
#######################################

api = Namespace('conversations', 'Biểu diễn một cuộc hội thoại của khách hàng với hệ thống tư vấn Telcenter.')

####################################
## STEP 2. DEFINE THE MODELS/DTOs ##
####################################

conversation_create_dto = api.model("ConversationCreate", {
    "customer_id": fields.String(required=True, description="ID của khách hàng"),
})

conversation_update_dto = api.model("ConversationUpdate", {
    "status": fields.String(
        required=False,
        description="Trạng thái mới của conversation: AI_AGENT_TEXTING, AI_AGENT_CALLING, FORWARDING, HUMAN_AGENT_TEXTING, HUMAN_AGENT_CALLING",
        enum=["AI_AGENT_TEXTING", "AI_AGENT_CALLING", "FORWARDING", "HUMAN_AGENT_TEXTING", "HUMAN_AGENT_CALLING"],
    ),

    "customer_satisfaction": fields.Integer(
        required=False,
        description="Mức độ hài lòng của khách hàng về cuộc hội thoại này, từ 1 đến 5",
        min=1,
        max=5,
    ),
})

conversation_dto = api.clone("Conversation", conversation_create_dto, {
    "id": fields.String(readonly=True, description="ID của cuộc hội thoại"),
    
    "status": fields.String(
        required=True,
        description="Trạng thái mới của conversation: AI_TEXTING, AI_CALLING, FORWARDING, PERSON_TEXTING, PERSON_CALLING",
        enum=["AI_TEXTING", "AI_CALLING", "FORWARDING", "PERSON_TEXTING", "PERSON_CALLING"],
    ),

    "customer_satisfaction": fields.Integer(
        required=True,
        description="Mức độ hài lòng của khách hàng về cuộc hội thoại này, từ 1 đến 5",
        min=1,
        max=5,
    ),

    **timing_enabled,
})

##################################
## STEP 3. CONNECT THE SERVICES ##
##################################

from ...services import conversation_service as conversation_service

###################################
## STEP 4. DEFINE THE CONTROLLER ##
## using the namespace, DTOs and ##
## services we have just defined ##
###################################

h = HATEOAS(api)

@api.route("/")
class Collection(Resource):
    service = conversation_service

    get_collection_qp = (
        Pageable
            .pageable_query_params()
    )



    @api.doc(description="Lấy danh sách tất cả các conversations, có pagination.")
    @h.expect(get_collection_qp)
    @h.returns(
        conversation_dto,
        as_list=True,
        self_links=lambda content: [],
        collection_links=lambda content: [url_for("v1.conversations_collection")],
    )
    def get(self):
        args = self.get_collection_qp.parse_args()
        pageable = Pageable.from_query_params(args)

        return self.service.get_collection(pageable)
    


    @api.doc(description="Thêm conversation mới.")
    @h.expect(conversation_create_dto)
    @h.returns(
        conversation_dto,
        self_links=lambda content: [url_for("v1.conversations_item", id=content["id"])],
        collection_links=lambda content: [url_for("v1.conversations_collection")],
    )
    def post(self):
        data = request.get_json()
        return self.service.post_item(data)




@api.route("/<string:id>")
class Item(Resource):
    service = conversation_service


    @api.doc(description="Lấy conversation theo ID")
    @h.returns(
        conversation_dto,
        self_links=lambda content: [url_for("v1.conversations_item", id=content["id"])],
        collection_links=lambda content: [url_for("v1.conversations_collection")],
    )
    def get(self, id):
        return self.service.get_item_by_id(id)

    


    @api.doc(description="Sửa một phần conversation, theo ID")
    @api.expect(conversation_update_dto)
    @h.returns(
        conversation_dto,
        self_links=lambda content: [url_for("v1.conversations_item", id=content["id"])],
        collection_links=lambda content: [url_for("v1.conversations_collection")],
    )
    def patch(self, id):
        data = request.get_json()
        return self.service.patch_item_by_id(id, data)





    @api.doc(description="Xóa conversation, theo ID")
    @h.returns(
        api.model("empty", {}),
        self_links=lambda content: [],
        collection_links=lambda content: [url_for("v1.conversations_collection")],
    )
    def delete(self, id):
        self.service.delete_item_by_id(id)
        return {}
