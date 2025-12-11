from flask_restx import reqparse

DEFAULT_PAGE_SIZE = 100

class Pageable:
    def __init__(self, page, size):
        # type: (Pageable, int, int) -> None
        """
        page number starts at 0.
        """
        self.page = page or 0
        self.size = size or DEFAULT_PAGE_SIZE

    def get_skip(self):
        return self.page * self.size
    
    def get_limit(self):
        return self.size
    
    def get_kwargs(self):
        return {
            "skip": self.get_skip(),
            "limit": self.get_limit(),
        }
    
    def increment(self):
        self.page += 1
    
    @staticmethod
    def pageable_query_params(parser=None):
        # type: (reqparse.RequestParser | None) -> reqparse.RequestParser
        if not parser:
            parser = reqparse.RequestParser()
            _REAL_PARSE_ARGS = parser.parse_args
            parser.parse_args = lambda *args, **kwargs: _REAL_PARSE_ARGS(*args, **{
                **kwargs,
                "strict": True,
            })
        
        parser.add_argument('pageNumber', type=int, required=False, default=0, help='Page number')
        parser.add_argument('pageSize', type=int, required=False, default=DEFAULT_PAGE_SIZE, help='Page size')
        return parser
    
    @classmethod
    def from_query_params(cls, parser_args):
        page = parser_args.get("pageNumber")
        size = parser_args.get("pageSize")
        return cls(page, size)
