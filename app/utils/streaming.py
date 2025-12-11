from flask_socketio import SocketIO
from typing import Callable

class StreamingMessage:
    def __init__(self, event: str, data: dict, room: str | None = None):
        self.event = event
        self.data = data
        self.room = room

class Streaming:
    def __init__(self, namespace: str, socketio: SocketIO | None = None):
        self.namespace = namespace
        self.events: dict[str, Callable] = {}
        self.socketio = socketio

    def on(self, event_name: str):
        def decorator(func):
            def safe_wrapper(*args, **kwargs):
                try:
                    msg = func(self, *args, **kwargs)
                except Exception as e:
                    print(f"Error handling event '{event_name}': {e}")
                    msg = StreamingMessage('error', {'message': str(e)})
                
                if msg is not None and isinstance(msg, StreamingMessage):
                    self.emit(msg)
                else:
                    raise RuntimeError("Event handler must return a StreamingMessage instance.")
            self.events[event_name] = safe_wrapper
            return safe_wrapper
        return decorator

    def emit(self, message: StreamingMessage):
        if not self.socketio:
            raise RuntimeError("Streaming instance is not registered with a SocketIO instance.")
        
        self.socketio.emit(
            message.event,
            message.data,
            room=message.room if message.room else None, # type: ignore
            namespace=self.namespace
        )

    def register(self, socketio: SocketIO):
        if self.socketio:
            raise RuntimeError("Streaming instance is already registered with a SocketIO instance.")
        self.socketio = socketio
        for event_name, handler in self.events.items():
            socketio.on_event(event_name, handler, namespace=self.namespace)
