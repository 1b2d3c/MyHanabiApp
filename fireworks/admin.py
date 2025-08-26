# fireworks/admin.py
from django.contrib import admin
from .models import FireworkProgram, Post

# モデルを管理画面に登録します
admin.site.register(FireworkProgram)
admin.site.register(Post)
