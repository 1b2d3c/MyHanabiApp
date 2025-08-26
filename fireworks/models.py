# fireworks/models.py
from django.db import models
from django.contrib.auth.models import User

class FireworkProgram(models.Model):
    """
    作成された花火プログラムを保存するモデル
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    program_data = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class Post(models.Model):
    """
    ユーザーの投稿を管理するモデル
    写真、イラスト、動画、花火プログラムなど、複数の投稿タイプをサポートする
    """
    POST_TYPES = (
        ('program', 'プログラム'),
        ('image', '写真'),
        ('video', '動画'),
        ('illustration', 'イラスト'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # 投稿タイプを区別するためのフィールド
    post_type = models.CharField(max_length=20, choices=POST_TYPES, default='program')

    # ファイルアップロード用のフィールド (画像、動画など)
    file = models.FileField(upload_to='post_files/', blank=True, null=True)

    # FireworkProgramとのリレーション
    firework_program = models.OneToOneField(
        FireworkProgram, 
        on_delete=models.CASCADE, 
        blank=True, 
        null=True
    )

    def __str__(self):
        return f'{self.title} ({self.get_post_type_display()})'
